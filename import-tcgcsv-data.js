import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importTCGCSVData(csvFilePath) {
  console.log('🔄 Starting TCGCSV import...');
  
  const cards = [];
  const expansions = new Map();
  
  try {
    // Read CSV file
    console.log(`📖 Reading CSV file: ${csvFilePath}`);
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Parse the row and add to cards array
          const card = {
            id: row.id || `${row.set_id}-${row.number}`,
            name: row.name,
            supertype: row.supertype || 'Pokémon',
            types: row.types ? row.types.split(',').map(t => t.trim()) : null,
            subtypes: row.subtypes ? row.subtypes.split(',').map(t => t.trim()) : null,
            hp: row.hp ? parseInt(row.hp) : null,
            number: row.number,
            rarity: row.rarity,
            expansion_id: row.set_id,
            expansion_name: row.set_name,
            image_url: row.image_url,
            abilities: row.abilities || null,
            attacks: row.attacks || null,
            weaknesses: row.weaknesses || null,
            resistances: row.resistances || null,
            retreat_cost: row.retreat_cost ? row.retreat_cost.split(',').map(t => t.trim()) : null,
            converted_retreat_cost: row.converted_retreat_cost ? parseInt(row.converted_retreat_cost) : null,
            artist: row.artist,
            flavor_text: row.flavor_text,
            regulation_mark: row.regulation_mark,
            language: row.language || 'en',
            language_code: row.language_code || 'en',
            national_pokedex_numbers: row.national_pokedex_numbers ? 
              row.national_pokedex_numbers.split(',').map(n => parseInt(n.trim())) : null,
            market_price: row.market_price ? parseFloat(row.market_price) : null,
            low_price: row.low_price ? parseFloat(row.low_price) : null,
            mid_price: row.mid_price ? parseFloat(row.mid_price) : null,
            high_price: row.high_price ? parseFloat(row.high_price) : null
          };
          
          cards.push(card);
          
          // Track unique expansions
          if (row.set_id && row.set_name) {
            expansions.set(row.set_id, {
              id: row.set_id,
              name: row.set_name,
              series: row.set_series || 'Other',
              code: row.set_id.toUpperCase(),
              total: row.set_total ? parseInt(row.set_total) : null,
              printed_total: row.set_printed_total ? parseInt(row.set_printed_total) : null,
              language: row.language || 'en',
              language_code: row.language_code || 'en',
              release_date: row.set_release_date || null,
              is_online_only: row.set_is_online_only === 'true',
              logo_url: row.set_logo_url || null,
              symbol_url: row.set_symbol_url || null
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 Found ${cards.length} cards and ${expansions.size} expansions`);
    
    // Import expansions first
    console.log('📦 Importing expansions...');
    const expansionData = Array.from(expansions.values());
    
    if (expansionData.length > 0) {
      const { error: expansionError } = await supabase
        .from('pokemon_expansions')
        .upsert(expansionData, { onConflict: 'id' });
        
      if (expansionError) {
        console.error('❌ Error importing expansions:', expansionError);
        throw expansionError;
      }
      
      console.log(`✅ Imported ${expansionData.length} expansions`);
    }
    
    // Import cards in batches
    console.log('🃏 Importing cards...');
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      const { error: cardsError } = await supabase
        .from('pokemon_cards')
        .upsert(batch, { onConflict: 'id' });
        
      if (cardsError) {
        console.error(`❌ Error importing card batch ${Math.floor(i/batchSize) + 1}:`, cardsError);
        throw cardsError;
      }
      
      importedCount += batch.length;
      console.log(`📦 Imported batch ${Math.floor(i/batchSize) + 1}: ${importedCount}/${cards.length} cards`);
    }
    
    // Update sync status
    console.log('🔄 Updating sync status...');
    const { error: syncError } = await supabase
      .from('sync_status')
      .upsert({
        id: 1,
        cards: new Date().toISOString(),
        expansions: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (syncError) {
      console.error('❌ Error updating sync status:', syncError);
      throw syncError;
    }
    
    console.log('✅ TCGCSV import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Cards imported: ${importedCount}`);
    console.log(`   - Expansions imported: ${expansionData.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Check if CSV file path is provided
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('❌ Please provide the path to your TCGCSV file');
  console.error('Usage: node import-tcgcsv-data.js <path-to-csv-file>');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

// Run the import
importTCGCSVData(csvFilePath);
