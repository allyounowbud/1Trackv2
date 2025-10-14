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

async function debugExtendedData() {
  console.log('🔍 Debugging TCGCSV extendedData structure...');
  
  try {
    // Test with Base Set (groupId: 604)
    const groupId = 604;
    
    // Fetch products
    const productsData = await makeRequest(`${TCGCSV_BASE_URL}/${groupId}/products`);
    
    if (!productsData || !productsData.success) {
      console.error('❌ Failed to fetch products');
      return;
    }
    
    console.log(`📊 Found ${productsData.totalItems} products`);
    
    // Examine extendedData for first few products
    console.log('\n🔍 ExtendedData structure for first 5 products:');
    
    productsData.results.slice(0, 5).forEach((product, i) => {
      console.log(`\n${i + 1}. ${product.name}`);
      
      if (product.extendedData && Array.isArray(product.extendedData)) {
        console.log(`   ExtendedData items: ${product.extendedData.length}`);
        
        product.extendedData.forEach((data, j) => {
          console.log(`   Item ${j + 1}:`);
          Object.keys(data).forEach(key => {
            const value = data[key];
            if (typeof value === 'string' && value.length < 100) {
              console.log(`     ${key}: ${value}`);
            } else if (typeof value === 'number') {
              console.log(`     ${key}: ${value}`);
            } else {
              console.log(`     ${key}: [${typeof value}]`);
            }
          });
        });
      } else {
        console.log('   No extendedData or not an array');
      }
    });
    
    // Look specifically for card numbers in extendedData
    console.log('\n🔍 Searching for card numbers in extendedData...');
    
    const sampleProducts = productsData.results.slice(0, 20);
    let foundCardNumbers = 0;
    
    sampleProducts.forEach((product, i) => {
      if (product.extendedData && Array.isArray(product.extendedData)) {
        product.extendedData.forEach((data) => {
          Object.keys(data).forEach(key => {
            const value = data[key];
            if (typeof value === 'string') {
              // Look for patterns like "4/102", "001/132", etc.
              if (/\d+\/\d+/.test(value)) {
                console.log(`✅ Found card number: ${product.name} - ${key}: ${value}`);
                foundCardNumbers++;
              }
              // Look for just numbers
              if (/^\d+$/.test(value) && parseInt(value) > 0 && parseInt(value) < 1000) {
                console.log(`🔢 Found potential number: ${product.name} - ${key}: ${value}`);
              }
            }
          });
        });
      }
    });
    
    console.log(`\n📊 Found ${foundCardNumbers} card numbers in extendedData`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugExtendedData();
