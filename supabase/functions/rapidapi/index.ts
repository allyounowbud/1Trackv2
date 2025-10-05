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
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const query = url.searchParams.get('q')
    const game = url.searchParams.get('game') || 'pokemon'
    const productId = url.searchParams.get('id')

    console.log('RapidAPI request:', { endpoint, query, game, productId })

    // Get RapidAPI credentials from environment
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    const rapidApiHost = Deno.env.get('RAPIDAPI_HOST') || 'tcgplayer.p.rapidapi.com'

    if (!rapidApiKey) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': 'RapidAPI key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const headers = {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': rapidApiHost,
      'Content-Type': 'application/json'
    }

    let response

    switch (endpoint) {
      case 'test':
        // Test connection
        response = await fetch(`https://${rapidApiHost}/catalog/categories`, {
          headers
        })
        break

      case 'search':
        // Search for products
        const searchUrl = `https://${rapidApiHost}/catalog/products?getExtendedFields=true&includeProductVariations=true&productName=${encodeURIComponent(query || '')}`
        response = await fetch(searchUrl, { headers })
        break

      case 'product':
        // Get product details
        const productUrl = `https://${rapidApiHost}/catalog/products/${productId}?getExtendedFields=true&includeProductVariations=true`
        response = await fetch(productUrl, { headers })
        break

      case 'pricing':
        // Get product pricing
        const pricingUrl = `https://${rapidApiHost}/pricing/product/${productId}`
        response = await fetch(pricingUrl, { headers })
        break

      default:
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            'error-message': 'Invalid endpoint' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('RapidAPI error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          'error-message': `API request failed: ${response.status}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    // Transform the response to match our expected format
    let transformedData
    
    switch (endpoint) {
      case 'test':
        transformedData = {
          status: 'success',
          message: 'Connection successful',
          data: data
        }
        break

      case 'search':
        // Transform TCGPlayer search results
        const products = data.results || []
        transformedData = {
          status: 'success',
          products: products.map((product: any) => ({
            id: product.productId,
            name: product.name,
            set_name: product.group?.name || 'Unknown Set',
            market_price: product.marketPrice || 0,
            low_price: product.lowPrice || 0,
            mid_price: product.midPrice || 0,
            high_price: product.highPrice || 0,
            image_url: product.imageUrl,
            tcgplayer_id: product.productId,
            tcgplayer_url: product.url
          })),
          total: products.length
        }
        break

      case 'product':
        // Transform product details
        transformedData = {
          status: 'success',
          product: {
            id: data.productId,
            name: data.name,
            set_name: data.group?.name || 'Unknown Set',
            market_price: data.marketPrice || 0,
            low_price: data.lowPrice || 0,
            mid_price: data.midPrice || 0,
            high_price: data.highPrice || 0,
            image_url: data.imageUrl,
            tcgplayer_id: data.productId,
            tcgplayer_url: data.url,
            description: data.description,
            extendedData: data.extendedData
          }
        }
        break

      case 'pricing':
        // Transform pricing data
        transformedData = {
          status: 'success',
          pricing: data.results || []
        }
        break

      default:
        transformedData = data
    }

    return new Response(
      JSON.stringify(transformedData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('RapidAPI function error:', error)
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        'error-message': error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
