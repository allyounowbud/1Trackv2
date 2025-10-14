import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

const supabase = createClient(supabaseUrl, supabaseKey);

// TCGCSV API configuration
const TCGCSV_BASE_URL = 'https://tcgcsv.com/tcgplayer/3';
const POKEMON_CATEGORY_ID = 3; // Pokemon category ID

class TCGCSVImporter {
  constructor() {
    this.totalExpansions = 0;
    this.totalCards = 0;
    this.totalProducts = 0;
    this.processedExpansions = 0;
    this.errors = [];
  }

  async makeRequest(url) {
    try {
      console.log(`🌐 Fetching: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error.message);
      this.errors.push({ url, error: error.message });
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchAllExpansions() {
    console.log('🔄 Fetching all Pokemon expansions...');
    
    const url = `${TCGCSV_BASE_URL}/groups`;
    const data = await this.makeRequest(url);
    
    if (!data || !data.success) {
      throw new Error('Failed to fetch expansions');
    }
    
    console.log(`📦 Found ${data.totalItems} expansions`);
    this.totalExpansions = data.totalItems;
    
    // Filter out supplemental expansions for now (focus on main sets)
    const mainExpansions = data.results.filter(exp => !exp.isSupplemental);
    console.log(`📦 Processing ${mainExpansions.length} main expansions (excluding supplemental)`);
    
    return mainExpansions;
  }

  async fetchExpansionProducts(groupId) {
    const url = `${TCGCSV_BASE_URL}/${groupId}/products`;
    return await this.makeRequest(url);
  }

  async fetchExpansionPrices(groupId) {
    const url = `${TCGCSV_BASE_URL}/${groupId}/prices`;
    return await this.makeRequest(url);
  }

  async importExpansion(expansion) {
    console.log(`\n📦 Processing expansion: ${expansion.name} (${expansion.abbreviation})`);
    
    try {
      // Fetch products and prices in parallel
      const [productsData, pricesData] = await Promise.all([
        this.fetchExpansionProducts(expansion.groupId),
        this.fetchExpansionPrices(expansion.groupId)
      ]);
      
      if (!productsData || !productsData.success) {
        console.warn(`⚠️  No products data for ${expansion.name}`);
        return;
      }
      
      if (!pricesData || !pricesData.success) {
        console.warn(`⚠️  No prices data for ${expansion.name}`);
        return;
      }
      
      // Create price lookup map
      const priceMap = new Map();
      if (pricesData.results) {
        pricesData.results.forEach(price => {
          priceMap.set(price.productId, price);
        });
      }
      
      // Separate singles and sealed products
      const singles = [];
      const sealedProducts = [];
      
      productsData.results.forEach(product => {
        // Look for card number in extendedData
        let hasCardNumber = false;
        let cardNumber = null;
        
        if (product.extendedData && Array.isArray(product.extendedData)) {
          const numberData = product.extendedData.find(data => data.name === 'Number');
          if (numberData && numberData.value && numberData.value.includes('/')) {
            hasCardNumber = true;
            cardNumber = numberData.value;
          }
        }
        
        if (hasCardNumber) {
          singles.push({ ...product, type: 'single', cardNumber });
        } else {
          sealedProducts.push({ ...product, type: 'sealed' });
        }
      });
      
      console.log(`   📄 Singles: ${singles.length}`);
      console.log(`   📦 Sealed: ${sealedProducts.length}`);
      
      // Import singles to pokemon_cards table
      if (singles.length > 0) {
        await this.importSingles(expansion, singles, priceMap);
      }
      
      // Import sealed products to pokemon_cards table (we'll treat them as cards for now)
      if (sealedProducts.length > 0) {
        await this.importSealedProducts(expansion, sealedProducts, priceMap);
      }
      
      this.processedExpansions++;
      console.log(`✅ Completed ${expansion.name} (${this.processedExpansions}/${this.totalExpansions})`);
      
    } catch (error) {
      console.error(`❌ Error processing ${expansion.name}:`, error.message);
      this.errors.push({ expansion: expansion.name, error: error.message });
    }
  }

  async importSingles(expansion, singles, priceMap) {
    const cards = singles.map(product => {
      const price = priceMap.get(product.productId);
      
      // Extract data from extendedData
      let cardType = null;
      let hp = null;
      let stage = null;
      let rarity = null;
      let weaknesses = null;
      let resistances = null;
      let retreatCost = null;
      let cardText = null;
      let attacks = null;
      
      if (product.extendedData && Array.isArray(product.extendedData)) {
        product.extendedData.forEach(data => {
          switch (data.name) {
            case 'Card Type':
              cardType = data.value;
              break;
            case 'HP':
              hp = parseInt(data.value);
              break;
            case 'Stage':
              stage = data.value;
              break;
            case 'Rarity':
              rarity = data.value;
              break;
            case 'Weakness':
              weaknesses = data.value;
              break;
            case 'Resistance':
              resistances = data.value;
              break;
            case 'RetreatCost':
              retreatCost = data.value;
              break;
            case 'CardText':
              cardText = data.value;
              break;
            case 'Attack 1':
            case 'Attack 2':
              if (!attacks) attacks = [];
              attacks.push({
                name: data.displayName,
                text: data.value
              });
              break;
          }
        });
      }
      
      return {
        id: `tcgcsv-${product.productId}`,
        name: product.name,
        supertype: 'Pokémon',
        types: cardType ? [cardType] : null,
        subtypes: stage ? [stage] : null,
        hp: hp,
        number: product.cardNumber?.split('/')[0] || null,
        rarity: rarity,
        expansion_id: expansion.groupId.toString(),
        expansion_name: expansion.name,
        image_url: product.imageUrl || null,
        abilities: null,
        attacks: attacks ? JSON.stringify(attacks) : null,
        weaknesses: weaknesses ? JSON.stringify([{ type: weaknesses, value: '×2' }]) : null,
        resistances: resistances ? JSON.stringify([{ type: resistances, value: '-30' }]) : null,
        retreat_cost: retreatCost ? retreatCost.split('') : null,
        converted_retreat_cost: retreatCost ? retreatCost.length : null,
        artist: null,
        flavor_text: cardText,
        regulation_mark: null,
        language: 'en',
        language_code: 'en',
        national_pokedex_numbers: null,
        market_price: price?.marketPrice ? parseFloat(price.marketPrice) : null,
        low_price: price?.lowPrice ? parseFloat(price.lowPrice) : null,
        mid_price: price?.midPrice ? parseFloat(price.midPrice) : null,
        high_price: price?.highPrice ? parseFloat(price.highPrice) : null
      };
    });
    
    // Insert cards in batches
    const batchSize = 100;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('pokemon_cards')
        .upsert(batch, { onConflict: 'id' });
        
      if (error) {
        console.error(`❌ Error inserting singles batch:`, error);
        throw error;
      }
    }
    
    this.totalCards += cards.length;
    console.log(`   📄 Imported ${cards.length} singles`);
  }

  async importSealedProducts(expansion, sealedProducts, priceMap) {
    const products = sealedProducts.map(product => {
      const price = priceMap.get(product.productId);
      
      return {
        id: `tcgcsv-sealed-${product.productId}`,
        name: product.name,
        supertype: 'Sealed Product',
        types: null,
        subtypes: ['Sealed Product'],
        hp: null,
        number: product.number || null,
        rarity: product.rarity || 'Sealed',
        expansion_id: expansion.groupId.toString(),
        expansion_name: expansion.name,
        image_url: product.imageUrl || null,
        abilities: null,
        attacks: null,
        weaknesses: null,
        resistances: null,
        retreat_cost: null,
        converted_retreat_cost: null,
        artist: null,
        flavor_text: product.description || null,
        regulation_mark: null,
        language: 'en',
        language_code: 'en',
        national_pokedex_numbers: null,
        market_price: price?.marketPrice ? parseFloat(price.marketPrice) : null,
        low_price: price?.lowPrice ? parseFloat(price.lowPrice) : null,
        mid_price: price?.midPrice ? parseFloat(price.midPrice) : null,
        high_price: price?.highPrice ? parseFloat(price.highPrice) : null
      };
    });
    
    // Insert products in batches
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('pokemon_cards')
        .upsert(batch, { onConflict: 'id' });
        
      if (error) {
        console.error(`❌ Error inserting sealed products batch:`, error);
        throw error;
      }
    }
    
    this.totalProducts += products.length;
    console.log(`   📦 Imported ${products.length} sealed products`);
  }

  async importExpansions(expansions) {
    // Import expansions first
    console.log('📦 Importing expansions...');
    
    const expansionData = expansions.map(exp => ({
      id: exp.groupId.toString(),
      name: exp.name,
      series: this.determineSeries(exp.name),
      code: exp.abbreviation,
      total: null,
      printed_total: null,
      language: 'en',
      language_code: 'en',
      release_date: exp.publishedOn ? new Date(exp.publishedOn).toISOString().split('T')[0] : null,
      is_online_only: false,
      logo_url: null,
      symbol_url: null
    }));
    
    const { error: expansionError } = await supabase
      .from('pokemon_expansions')
      .upsert(expansionData, { onConflict: 'id' });
      
    if (expansionError) {
      console.error('❌ Error importing expansions:', expansionError);
      throw expansionError;
    }
    
    console.log(`✅ Imported ${expansionData.length} expansions`);
    
    // Process each expansion
    for (const expansion of expansions) {
      await this.importExpansion(expansion);
      
      // Rate limiting - wait between requests
      await this.sleep(1000);
    }
  }

  determineSeries(name) {
    if (name.includes('Base Set')) return 'Base';
    if (name.includes('Jungle')) return 'Base';
    if (name.includes('Fossil')) return 'Base';
    if (name.includes('Team Rocket')) return 'Base';
    if (name.includes('Gym')) return 'Gym';
    if (name.includes('Neo')) return 'Neo';
    if (name.includes('Expedition') || name.includes('Aquapolis') || name.includes('Skyridge')) return 'e-Card';
    if (name.includes('EX') || name.includes('ex')) return 'EX';
    if (name.includes('Diamond & Pearl') || name.includes('DP')) return 'Diamond & Pearl';
    if (name.includes('Platinum')) return 'Platinum';
    if (name.includes('HeartGold') || name.includes('SoulSilver')) return 'HeartGold SoulSilver';
    if (name.includes('Black & White') || name.includes('BW')) return 'Black & White';
    if (name.includes('XY')) return 'XY';
    if (name.includes('Sun & Moon') || name.includes('SM')) return 'Sun & Moon';
    if (name.includes('Sword & Shield') || name.includes('SS')) return 'Sword & Shield';
    if (name.includes('Scarlet & Violet') || name.includes('SV')) return 'Scarlet & Violet';
    if (name.includes('Mega Evolution') || name.includes('ME')) return 'Mega Evolution';
    return 'Other';
  }

  async updateSyncStatus() {
    console.log('🔄 Updating sync status...');
    
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        cards: new Date().toISOString(),
        expansions: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (error) {
      console.error('❌ Error updating sync status:', error);
      throw error;
    }
    
    console.log('✅ Sync status updated');
  }

  async run() {
    console.log('🚀 Starting TCGCSV complete import...');
    console.log('📊 This will import ALL Pokemon expansions and their products');
    console.log('⏱️  This process may take 30-60 minutes depending on data size\n');
    
    try {
      // Fetch all expansions
      const expansions = await this.fetchAllExpansions();
      
      // Import all data
      await this.importExpansions(expansions);
      
      // Update sync status
      await this.updateSyncStatus();
      
      // Print summary
      console.log('\n🎉 Import completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Expansions processed: ${this.processedExpansions}/${this.totalExpansions}`);
      console.log(`   - Cards imported: ${this.totalCards}`);
      console.log(`   - Sealed products imported: ${this.totalProducts}`);
      console.log(`   - Total items: ${this.totalCards + this.totalProducts}`);
      
      if (this.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${this.errors.length}`);
        console.log('First few errors:');
        this.errors.slice(0, 5).forEach(error => {
          console.log(`   - ${error.expansion || error.url}: ${error.error}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    }
  }
}

// Run the import
const importer = new TCGCSVImporter();
importer.run();
