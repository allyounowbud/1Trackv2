import { createClient } from '@supabase/supabase-js';

// TCGCSV API configuration
const TCGCSV_BASE_URL = 'https://tcgcsv.com/tcgplayer/3';

async function makeRequest(url) {
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
    return null;
  }
}

async function debugTCGCSVAPI() {
  console.log('🔍 Debugging TCGCSV API structure...');
  
  try {
    // Test with Base Set (groupId: 604)
    const groupId = 604;
    
    // Fetch products and prices
    const [productsData, pricesData] = await Promise.all([
      makeRequest(`${TCGCSV_BASE_URL}/${groupId}/products`),
      makeRequest(`${TCGCSV_BASE_URL}/${groupId}/prices`)
    ]);
    
    if (!productsData || !productsData.success) {
      console.error('❌ Failed to fetch products');
      return;
    }
    
    console.log(`📊 Found ${productsData.totalItems} products`);
    
    // Show the structure of the first few products
    console.log('\n🔍 First 3 products structure:');
    productsData.results.slice(0, 3).forEach((product, i) => {
      console.log(`\nProduct ${i + 1}: ${product.name}`);
      console.log('All fields:');
      Object.keys(product).forEach(key => {
        console.log(`  ${key}: ${product[key]} (${typeof product[key]})`);
      });
    });
    
    // Look for any field that might contain card numbers
    console.log('\n🔍 Looking for card number patterns...');
    const sampleProducts = productsData.results.slice(0, 10);
    
    sampleProducts.forEach((product, i) => {
      const possibleNumberFields = [];
      
      Object.keys(product).forEach(key => {
        const value = product[key];
        if (typeof value === 'string' && value.includes('/')) {
          possibleNumberFields.push(`${key}: ${value}`);
        }
        if (typeof value === 'string' && /^\d+$/.test(value)) {
          possibleNumberFields.push(`${key}: ${value}`);
        }
        if (typeof value === 'string' && /^\d+\/\d+$/.test(value)) {
          possibleNumberFields.push(`${key}: ${value}`);
        }
      });
      
      if (possibleNumberFields.length > 0) {
        console.log(`\nProduct ${i + 1}: ${product.name}`);
        possibleNumberFields.forEach(field => console.log(`  ${field}`));
      }
    });
    
    if (pricesData && pricesData.success) {
      console.log(`\n💰 Found ${pricesData.totalItems} prices`);
      
      // Show price structure
      if (pricesData.results && pricesData.results.length > 0) {
        console.log('\n🔍 First price structure:');
        const firstPrice = pricesData.results[0];
        Object.keys(firstPrice).forEach(key => {
          console.log(`  ${key}: ${firstPrice[key]} (${typeof firstPrice[key]})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugTCGCSVAPI();
