import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get environment variables
    const priceChartingApiKey = Deno.env.get('PRICECHARTING_API_KEY')
    const priceChartingBaseUrl = Deno.env.get('PRICECHARTING_BASE_URL') || 'https://www.pricecharting.com'

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

    // Parse the request URL
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const query = url.searchParams.get('q')
    const game = url.searchParams.get('game') || 'pokemon'
    const productId = url.searchParams.get('id')

    console.log('PriceCharting API request:', { endpoint, query, game, productId })

    let apiUrl = ''
    let requestBody = null

    // Route to appropriate PriceCharting API endpoint
    switch (endpoint) {
      case 'test':
        // Simple test endpoint - search for pokemon products
        apiUrl = `${priceChartingBaseUrl}/api/products?t=${priceChartingApiKey}&q=pokemon`
        break
      
          case 'search':
            if (!query) {
              return new Response(
                JSON.stringify({
                  status: 'error',
                  'error-message': 'Query parameter is required for search'
                }),
                { 
                  status: 400, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              )
            }
            // Search for products with the query using /api/products (plural)
            apiUrl = `${priceChartingBaseUrl}/api/products?t=${priceChartingApiKey}&q=${encodeURIComponent(query)}`
            break
      
      case 'product':
        if (!productId) {
          return new Response(
            JSON.stringify({
              status: 'error',
              'error-message': 'Product ID is required for product details'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
            // Get specific product details
            apiUrl = `${priceChartingBaseUrl}/api/product?t=${priceChartingApiKey}&id=${productId}`
            break
      
      case 'pricing':
        if (!productId) {
          return new Response(
            JSON.stringify({
              status: 'error',
              'error-message': 'Product ID is required for pricing'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
            // Get pricing for specific product
            apiUrl = `${priceChartingBaseUrl}/api/product?t=${priceChartingApiKey}&id=${productId}`
            break
      
      default:
        return new Response(
          JSON.stringify({
            status: 'error',
            'error-message': 'Invalid endpoint. Use: test, search, product, or pricing'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    // Make request to PriceCharting API
    console.log('🔍 Making request to PriceCharting API:', apiUrl)
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '1Track-App/1.0'
      }
    })

    if (!response.ok) {
      console.error('PriceCharting API error:', response.status, response.statusText)
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

    let data
    try {
      data = await response.json()
      console.log('🔍 Raw PriceCharting API response:', JSON.stringify(data, null, 2))
      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()))
    } catch (error) {
      console.error('❌ Error parsing PriceCharting API response:', error)
      return new Response(
        JSON.stringify({
          status: 'error',
          'error-message': 'Failed to parse PriceCharting API response'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Transform the response to match our expected format
    let transformedData = data

    if (endpoint === 'search') {
      console.log('🔍 Search endpoint - data structure:', {
        hasProducts: !!data.products,
        productsType: typeof data.products,
        productsIsArray: Array.isArray(data.products),
        productsLength: data.products?.length,
        dataKeys: Object.keys(data)
      })
      
      if (data.products && Array.isArray(data.products)) {
        // Transform array of products to expected format
        try {
          transformedData = {
            status: 'success',
            products: data.products.map(product => ({
              id: product.id,
              name: product['product-name'],
              set_name: product['console-name'],
              market_price: product['new-price'] || product['cib-price'] || product['loose-price'] || 0,
              low_price: product['retail-new-buy'] || product['retail-cib-buy'] || product['retail-loose-buy'] || 0,
              mid_price: product['new-price'] || product['cib-price'] || product['loose-price'] || 0,
              high_price: product['retail-new-sell'] || product['retail-cib-sell'] || product['retail-loose-sell'] || 0,
              image_url: null, // PriceCharting doesn't provide images in API
              pricecharting_url: `https://www.pricecharting.com/game/${product['console-name']?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}/${product['product-name']?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`
            }))
          }
        } catch (error) {
          console.error('Error transforming products:', error)
          transformedData = {
            status: 'error',
            'error-message': 'Failed to transform product data'
          }
        }
      } else {
        // No products found or unexpected data structure
        console.log('📦 No products found in PriceCharting response')
        transformedData = {
          status: 'success',
          products: [],
          message: 'No products found'
        }
      }
    } else if (endpoint === 'test') {
      // Simple test response
      transformedData = {
        status: 'success',
        message: 'PriceCharting API connection successful',
        products: data.products ? data.products.slice(0, 1) : []
      }
    } else if (endpoint === 'product' || endpoint === 'pricing') {
      // Single product response
      transformedData = {
        status: 'success',
        product: {
          id: data.id,
          name: data['product-name'],
          set_name: data['console-name'],
          market_price: data['new-price'] || data['cib-price'] || data['loose-price'] || 0,
          low_price: data['retail-new-buy'] || data['retail-cib-buy'] || data['retail-loose-buy'] || 0,
          mid_price: data['new-price'] || data['cib-price'] || data['loose-price'] || 0,
          high_price: data['retail-new-sell'] || data['retail-cib-sell'] || data['retail-loose-sell'] || 0,
          image_url: null, // PriceCharting doesn't provide images in API
          pricecharting_url: `https://www.pricecharting.com/game/${data['console-name'].toLowerCase().replace(/\s+/g, '-')}/${data['product-name'].toLowerCase().replace(/\s+/g, '-')}`
        }
      }
    }

    return new Response(
      JSON.stringify(transformedData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('PriceCharting API function error:', error)
    return new Response(
      JSON.stringify({
        status: 'error',
        'error-message': `Internal server error: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})