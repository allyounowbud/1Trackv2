import https from 'https';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SCRYDEX_API_BASE = 'https://api.scrydex.com';
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || 'onetracking';

console.log('🔍 Testing Scrydex Pricing Endpoints...');
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
          console.log(`📋 Response structure:`, JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
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

async function testEndpoints() {
  try {
    console.log('\n1️⃣ Testing pricing endpoint without parameters...');
    await makeApiRequest('/pokemon/v1/en/prices');
    
    console.log('\n2️⃣ Testing pricing endpoint with limit...');
    await makeApiRequest('/pokemon/v1/en/prices', { limit: 5 });
    
    console.log('\n3️⃣ Testing pricing endpoint with select...');
    await makeApiRequest('/pokemon/v1/en/prices', { 
      select: 'card_id,market_price_usd',
      limit: 5 
    });
    
    console.log('\n4️⃣ Testing single card pricing...');
    await makeApiRequest('/pokemon/v1/en/prices', { 
      card_id: 'bw11-1',
      limit: 1 
    });
    
    console.log('\n5️⃣ Testing different pricing endpoint structure...');
    await makeApiRequest('/pokemon/v1/prices');
    
    console.log('\n6️⃣ Testing pricing with different language...');
    await makeApiRequest('/pokemon/v1/prices');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();
