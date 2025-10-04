import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the PriceCharting API key from environment variables
    const priceChartingApiKey = Deno.env.get('PRICECHARTING_API_KEY')
    
    if (!priceChartingApiKey) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': 'PriceCharting API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request URL to get the endpoint and parameters
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const query = url.searchParams.get('q')
    const productId = url.searchParams.get('id')

    if (!endpoint) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': 'Endpoint parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build the PriceCharting API URL
    let priceChartingUrl = `https://www.pricecharting.com/api/${endpoint}?t=${priceChartingApiKey}`
    
    if (query) {
      priceChartingUrl += `&q=${encodeURIComponent(query)}`
    }
    
    if (productId) {
      priceChartingUrl += `&id=${productId}`
    }

    console.log(`Making request to PriceCharting API: ${priceChartingUrl}`)

    // Make the request to PriceCharting API
    const response = await fetch(priceChartingUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`PriceCharting API error: ${response.status}`, errorText)
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': `PriceCharting API error: ${response.status}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    // Check if PriceCharting returned an error
    if (data.status === 'error') {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': data['error-message'] || 'PriceCharting API error' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('PriceCharting API request successful')
    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in PriceCharting API function:', error)
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        'error-message': 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
