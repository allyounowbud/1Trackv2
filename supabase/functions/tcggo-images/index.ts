import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log('TCGGo Images Edge Function started')

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const cardName = url.searchParams.get('cardName')
    const game = url.searchParams.get('game') || 'pokemon'
    const debug = url.searchParams.get('debug') === 'true'

    if (!cardName) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Card name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve RapidAPI key from environment variables
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')

    if (!RAPIDAPI_KEY) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'RapidAPI key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Search for card images using RapidAPI CardMarket endpoint
    // Using the correct endpoint structure from the provided URL
    let rapidApiUrl;
    
    if (game === 'pokemon') {
      // Try the search endpoint for Pokemon
      rapidApiUrl = `https://cardmarket.p.rapidapi.com/products/find?query=${encodeURIComponent(cardName)}&game=pokemon`
    } else if (game === 'magic') {
      rapidApiUrl = `https://cardmarket.p.rapidapi.com/products/find?query=${encodeURIComponent(cardName)}&game=magic`
    } else {
      // Default to Pokemon search
      rapidApiUrl = `https://cardmarket.p.rapidapi.com/products/find?query=${encodeURIComponent(cardName)}&game=pokemon`
    }
    
    console.log(`Searching for card: ${cardName} in game: ${game}`)
    console.log(`RapidAPI URL: ${rapidApiUrl}`)

    let cardData = null;
    
    try {
      const rapidApiResponse = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'cardmarket.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      })

      if (!rapidApiResponse.ok) {
        const errorText = await rapidApiResponse.text()
        console.error(`RapidAPI request failed: ${rapidApiResponse.status} - ${errorText}`)
        
        // Return empty results instead of throwing error
        return new Response(
          JSON.stringify({
            status: 'success',
            results: [],
            total: 0,
            message: `CardMarket API unavailable: ${rapidApiResponse.status}`
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        )
      }

      cardData = await rapidApiResponse.json()
      console.log('CardMarket API response:', JSON.stringify(cardData, null, 2))
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message)
      
      // Return empty results instead of throwing error
      return new Response(
        JSON.stringify({
          status: 'success',
          results: [],
          total: 0,
          message: `CardMarket API error: ${fetchError.message}`
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      )
    }

    // Process the response to extract image URLs
    const processedResults = []
    
    console.log('Processing response data...')
    console.log('Response structure:', Object.keys(cardData || {}))
    
    // Handle the actual CardMarket API response structure
    let products = []
    if (cardData && cardData.data && Array.isArray(cardData.data)) {
      products = cardData.data
    } else if (cardData && cardData.products) {
      products = cardData.products
    } else if (cardData && Array.isArray(cardData)) {
      products = cardData
    }
    
    console.log(`Found ${products.length} products to process`)
    
    for (const product of products.slice(0, 5)) { // Limit to first 5 results
      console.log('Processing product:', JSON.stringify(product, null, 2))
      
      // Extract image URL from the actual CardMarket API structure
      let imageUrl = null
      if (product.image) {
        imageUrl = product.image
      } else if (product.imageUrl) {
        imageUrl = product.imageUrl
      } else if (product.image_url) {
        imageUrl = product.image_url
      } else if (product.images && product.images[0]) {
        imageUrl = product.images[0].src || product.images[0].url
      }
      
      if (imageUrl) {
        processedResults.push({
          id: product.id,
          name: product.name,
          image_url: imageUrl,
          image_url_large: imageUrl, // CardMarket typically provides good quality
          price: product.prices?.cardmarket?.lowest ? product.prices.cardmarket.lowest / 100 : null, // Convert cents to dollars
          source: 'cardmarket'
        })
      }
    }

    // If debug mode, return raw response
    if (debug) {
      return new Response(
        JSON.stringify({
          status: 'success',
          debug: true,
          rawResponse: cardData,
          processedResults: processedResults,
          total: processedResults.length
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      )
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        results: processedResults,
        total: processedResults.length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Error in TCGGo Images Edge Function:', error.message)
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error.message,
        results: []
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    )
  }
})
