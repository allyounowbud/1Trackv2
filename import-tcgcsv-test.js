import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function testTCGCSVImport() {
  console.log('🧪 Testing TCGCSV import with Base Set...');
  
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
    
    if (!pricesData || !pricesData.success) {
      console.error('❌ Failed to fetch prices');
      return;
    }
    
    console.log(`📊 Found ${productsData.totalItems} products`);
    console.log(`💰 Found ${pricesData.totalItems} prices`);
    
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
      
      console.log(`🔍 Product: ${product.name} - Card Number: ${cardNumber || 'N/A'}`);
      
      if (hasCardNumber) {
        singles.push({ ...product, type: 'single', cardNumber });
      } else {
        sealedProducts.push({ ...product, type: 'sealed' });
      }
    });
    
    console.log(`\n📄 Singles: ${singles.length}`);
    console.log(`📦 Sealed: ${sealedProducts.length}`);
    
    // Show first few examples
    console.log('\n📄 First 3 singles:');
    singles.slice(0, 3).forEach((card, i) => {
      const price = priceMap.get(card.productId);
      console.log(`   ${i + 1}. ${card.name} (${card.cardNumber}) - $${price?.marketPrice || 'N/A'}`);
    });
    
    console.log('\n📦 First 3 sealed products:');
    sealedProducts.slice(0, 3).forEach((product, i) => {
      const price = priceMap.get(product.productId);
      console.log(`   ${i + 1}. ${product.name} - $${price?.marketPrice || 'N/A'}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    console.log('📝 Ready to run full import with: npm run import-tcgcsv-complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTCGCSVImport();
