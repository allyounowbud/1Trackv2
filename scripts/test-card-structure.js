import https from 'https';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SCRYDEX_API_BASE = 'https://api.scrydex.com';
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || 'onetracking';

console.log('🔍 Testing Scrydex Card Structure...');
console.log('==========================================');

async function makeApiRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${SCRYDEX_API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    console.log(`📡 Testing: ${url}`);
    
    const options = {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log(`📊 Status: ${res.statusCode}`);
          console.log(`📄 Response length: ${data.length} characters`);
          
          if (data.trim() === '') {
            console.log('⚠️ Empty response');
            resolve(null);
            return;
          }
          
          const jsonData = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Show structure of first item if it's an array
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              console.log(`📋 First item structure:`, JSON.stringify(jsonData[0], null, 2));
            } else if (jsonData.data && Array.isArray(jsonData.data) && jsonData.data.length > 0) {
              console.log(`📋 First item structure:`, JSON.stringify(jsonData.data[0], null, 2));
            } else {
              console.log(`📋 Response structure:`, JSON.stringify(jsonData, null, 2));
            }
            resolve(jsonData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (error) {
          console.log(`❌ JSON Parse Error: ${error.message}`);
          console.log(`📄 Raw response: ${data.substring(0, 500)}...`);
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testCardStructure() {
  try {
    console.log('\n1️⃣ Testing single card with all fields...');
    await makeApiRequest('/pokemon/v1/cards', { 
      limit: 1,
      select: '*'
    });
    
    console.log('\n2️⃣ Testing single card with specific fields...');
    await makeApiRequest('/pokemon/v1/cards', { 
      limit: 1,
      select: 'id,name,image_url,image_url_large,price,market_price'
    });
    
    console.log('\n3️⃣ Testing different endpoint variations...');
    await makeApiRequest('/pokemon/v1/en/cards', { limit: 1 });
    
    console.log('\n4️⃣ Testing with different select fields...');
    await makeApiRequest('/pokemon/v1/cards', { 
      limit: 1,
      select: 'id,name,images,prices,market_data'
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCardStructure();
