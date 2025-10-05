/**
 * TCGGo Image Service
 * Handles image fetching from CardMarket API via RapidAPI for TCG cards
 * Only used for images, not pricing or other data
 */

class TcgGoImageService {
  constructor() {
    this.baseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co/functions/v1/tcggo-images'
    this.isInitialized = false
    this.imageCache = new Map() // Cache to prevent duplicate requests
  }

  // Initialize the service
  async initialize() {
    try {
      // Test connection to TCGGo API
      console.log('🖼️ Initializing TCGGo Image Service...')
      this.isInitialized = true
      console.log('✅ TCGGo Image Service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize TCGGo Image Service:', error)
      throw error
    }
  }

  // Get authentication headers for Supabase
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    }
  }

  // Search for images by card name
  async searchCardImages(cardName, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('TCGGo Image Service not initialized')
    }

    try {
      console.log(`🔍 Searching CardMarket for images: ${cardName}`)
      
      // Use our backend proxy to search CardMarket
      const response = await fetch(`${this.baseUrl}?cardName=${encodeURIComponent(cardName)}&game=${game}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`CardMarket image search failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('🖼️ CardMarket image search results:', data)

      return data.results || []
    } catch (error) {
      console.error('❌ Error searching CardMarket for images:', error)
      throw error
    }
  }

  // Get specific card image by ID
  async getCardImage(cardId, game = 'pokemon') {
    if (!this.isInitialized) {
      throw new Error('TCGGo Image Service not initialized')
    }

    try {
      console.log(`🖼️ Fetching TCGGo image for card ID: ${cardId}`)
      
      const response = await fetch(`${this.baseUrl}/cards/${cardId}/images?game=${game}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`TCGGo image fetch failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('🖼️ TCGGo card image:', data)

      return data
    } catch (error) {
      console.error('❌ Error fetching TCGGo card image:', error)
      throw error
    }
  }

  // Find best image for a card from CardMarket
  async findBestImage(cardName, game = 'pokemon', setName = null) {
    try {
      // Create search query with both card name and set name for better matching
      let searchQuery = cardName
      if (setName && setName !== 'Unknown Set') {
        searchQuery = `${cardName} ${setName}`
      }
      
      // Check cache first
      const cacheKey = `${searchQuery}-${game}`
      if (this.imageCache.has(cacheKey)) {
        console.log(`🔄 Using cached TCGGo result for: ${searchQuery}`)
        return this.imageCache.get(cacheKey)
      }
      
      console.log(`🔍 Searching TCGGo for: "${searchQuery}" (card: "${cardName}", set: "${setName}")`)
      
      const results = await this.searchCardImages(searchQuery, game)
      
      if (results.length === 0) {
        console.log(`No CardMarket images found for: ${searchQuery}`)
        return null
      }

      // Find the best match using both name and set
      let bestMatch = null
      let bestScore = 0

      results.forEach(card => {
        let score = 0
        const cardNameLower = card.name.toLowerCase()
        const searchNameLower = cardName.toLowerCase()
        
        // Exact name match gets highest score
        if (cardNameLower === searchNameLower) {
          score += 100
        }
        // Partial name match
        else if (cardNameLower.includes(searchNameLower) || searchNameLower.includes(cardNameLower)) {
          score += 50
        }
        
        // Check if set name matches (if provided)
        if (setName && setName !== 'Unknown Set') {
          const setNameLower = setName.toLowerCase()
          if (cardNameLower.includes(setNameLower)) {
            score += 25
          }
        }
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = card
        }
      })

      let result = null
      
      if (bestMatch && bestMatch.image_url) {
        console.log(`✅ Found CardMarket match for ${cardName} (score: ${bestScore}): ${bestMatch.image_url}`)
        result = {
          id: bestMatch.id,
          name: bestMatch.name,
          image_url: bestMatch.image_url,
          image_url_large: bestMatch.image_url_large,
          source: 'cardmarket'
        }
      } else if (bestMatch && bestMatch.image_url && bestScore > 25) {
        console.log(`⚠️ Using fallback CardMarket result for ${cardName} (score: ${bestScore}): ${bestMatch.image_url}`)
        result = {
          id: bestMatch.id,
          name: bestMatch.name,
          image_url: bestMatch.image_url,
          image_url_large: bestMatch.image_url_large,
          source: 'cardmarket'
        }
      }

      // Cache the result (even if null) to prevent duplicate requests
      this.imageCache.set(cacheKey, result)
      
      return result
    } catch (error) {
      console.error('❌ Error finding best image from CardMarket:', error)
      return null
    }
  }

  // Test connection to CardMarket API via our backend
  async testConnection() {
    try {
      console.log('🔍 Testing CardMarket API connection via backend...')
      
      const response = await fetch(`${this.baseUrl}?cardName=charizard&game=pokemon`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`CardMarket API test failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ CardMarket API connection successful:', data)
      return true
    } catch (error) {
      console.error('❌ CardMarket API connection test failed:', error)
      throw error
    }
  }
}

// Create and export a singleton instance
const tcggoImageService = new TcgGoImageService()
export default tcggoImageService
