import type { Handler } from '@netlify/functions';

const API_BASE = 'https://api.scrydex.com';

export const handler: Handler = async (event) => {
  const apiKey = process.env.SCRYDEX_API_KEY!;
  const teamId = process.env.SCRYDEX_TEAM_ID!;
  
  if (!apiKey || !teamId) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: 'Missing Scrydex credentials. Please set SCRYDEX_API_KEY and SCRYDEX_TEAM_ID environment variables.' 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Example: /.netlify/functions/scrydex?path=/pokemon/v1/en/cards&q=name:charizard&select=id,name,images
  const { path = '/pokemon/v1/cards', ...rest } = event.queryStringParameters || {};
  const url = new URL(API_BASE + path);

  // Forward all query params except path
  Object.entries(rest).forEach(([k, v]) => {
    if (v != null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });

  console.log(`🔍 Scrydex API call: ${url.toString()}`);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': apiKey,
        'X-Team-ID': teamId,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    
    console.log(`📊 Scrydex API response: ${res.status} ${res.statusText}`);
    
    return {
      statusCode: res.status,
      headers: { 
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: text,
    };
  } catch (error) {
    console.error('❌ Scrydex API error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to call Scrydex API', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};





