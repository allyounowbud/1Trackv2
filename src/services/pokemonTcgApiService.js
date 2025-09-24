/**
 * Pokémon TCG API Service
 * Based on https://docs.pokemontcg.io/
 * Provides accurate single card values and data
 */

class PokemonTcgApiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_POKEMON_TCG_API_KEY || '96734358-0300-4fdd-a895-140a21f95a50';
    // Use proxy in development, direct API in production
    this.baseUrl = import.meta.env.DEV ? '/api/pokemon-tcg' : 'https://api.pokemontcg.io/v2';
    this.cache = new Map();
    this.cacheTimeout = 6 * 60 * 60 * 1000; // 6 hours cache
    this.loadPersistentCache();
  }

  /**
   * Make API request with proper headers
   * Uses proxy in development to avoid CORS issues
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Only add API key header if not using proxy (production)
      if (!import.meta.env.DEV) {
        headers['X-Api-Key'] = this.apiKey;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        ...options
      });

      if (!response.ok) {
        throw new Error(`Pokémon TCG API error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Handle CORS and other network errors gracefully
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('Pokémon TCG API is not accessible due to CORS restrictions. This is expected in browser environments.');
      }
      throw error;
    }
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.saveToPersistentCache(key, data);
  }

  loadPersistentCache() {
    try {
      const stored = localStorage.getItem('pokemonTcgApiCache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        
        Object.entries(cacheData).forEach(([key, value]) => {
          if (now - value.timestamp < this.cacheTimeout) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  saveToPersistentCache(key, data) {
    try {
      const stored = localStorage.getItem('pokemonTcgApiCache') || '{}';
      const cacheData = JSON.parse(stored);
      cacheData[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('pokemonTcgApiCache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to persistent cache:', error);
    }
  }

  /**
   * Search for cards by name
   */
  async searchCards(cardName, options = {}) {
    const cacheKey = `search_${cardName}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        q: `name:"${cardName}"`,
        pageSize: options.pageSize || 20,
        page: options.page || 1,
        ...options
      });

      const response = await this.makeRequest(`/cards?${queryParams}`);
      
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error searching cards:', error);
      throw error;
    }
  }

  /**
   * Get a specific card by ID
   */
  async getCardById(cardId) {
    const cacheKey = `card_${cardId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/cards/${cardId}`);
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching card by ID:', error);
      throw error;
    }
  }

  /**
   * Get card market prices (if available)
   */
  async getCardPrices(cardId) {
    const cacheKey = `prices_${cardId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/cards/${cardId}`);
      const card = response.data;
      
      // Extract price information from the card data
      const prices = this.extractPrices(card);
      
      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching card prices:', error);
      throw error;
    }
  }

  /**
   * Extract price information from card data
   */
  extractPrices(card) {
    const prices = {
      source: 'pokemon-tcg-api',
      lastUpdated: new Date().toISOString(),
      cardId: card.id,
      name: card.name,
      set: card.set?.name || 'Unknown Set',
      rarity: card.rarity || 'Unknown',
      imageUrl: card.images?.large || card.images?.small,
      marketValue: null,
      low: null,
      mid: null,
      high: null,
      directLow: null
    };

    // Pokémon TCG API doesn't provide direct pricing, but we can use the card data
    // for identification and then cross-reference with other price sources
    if (card.tcgplayer?.prices) {
      const tcgPrices = card.tcgplayer.prices;
      
      // Extract different price types
      if (tcgPrices.normal?.market) {
        prices.marketValue = tcgPrices.normal.market;
        prices.low = tcgPrices.normal.low;
        prices.mid = tcgPrices.normal.mid;
        prices.high = tcgPrices.normal.high;
        prices.directLow = tcgPrices.normal.directLow;
      } else if (tcgPrices.holofoil?.market) {
        prices.marketValue = tcgPrices.holofoil.market;
        prices.low = tcgPrices.holofoil.low;
        prices.mid = tcgPrices.holofoil.mid;
        prices.high = tcgPrices.holofoil.high;
        prices.directLow = tcgPrices.holofoil.directLow;
      } else if (tcgPrices.reverseHolofoil?.market) {
        prices.marketValue = tcgPrices.reverseHolofoil.market;
        prices.low = tcgPrices.reverseHolofoil.low;
        prices.mid = tcgPrices.reverseHolofoil.mid;
        prices.high = tcgPrices.reverseHolofoil.high;
        prices.directLow = tcgPrices.reverseHolofoil.directLow;
      }
    }

    return prices;
  }

  /**
   * Format card data for use in the app
   */
  formatCard(card) {
    if (!card) return null;

    const prices = this.extractPrices(card);
    
    return {
      id: card.id,
      name: card.name,
      set: card.set?.name || 'Unknown Set',
      setCode: card.set?.id || '',
      rarity: card.rarity || 'Unknown',
      imageUrl: card.images?.large || card.images?.small,
      marketValue: prices.marketValue,
      prices: {
        source: 'pokemon-tcg-api',
        market: prices.marketValue,
        low: prices.low,
        mid: prices.mid,
        high: prices.high,
        directLow: prices.directLow,
        lastUpdated: prices.lastUpdated
      },
      // Additional card details
      types: card.types || [],
      subtypes: card.subtypes || [],
      supertype: card.supertype || 'Pokémon',
      hp: card.hp,
      attacks: card.attacks || [],
      weaknesses: card.weaknesses || [],
      resistances: card.resistances || [],
      retreatCost: card.retreatCost || [],
      convertedRetreatCost: card.convertedRetreatCost || 0,
      nationalPokedexNumbers: card.nationalPokedexNumbers || [],
      legalities: card.legalities || {},
      regulationMark: card.regulationMark
    };
  }

  /**
   * Search for cards and return formatted results
   */
  async searchCardsFormatted(cardName, options = {}) {
    try {
      const response = await this.searchCards(cardName, options);
      const cards = response.data || [];
      
      return cards.map(card => this.formatCard(card)).filter(card => card !== null);
    } catch (error) {
      console.error('Error searching formatted cards:', error);
      return [];
    }
  }

  /**
   * Get all sets
   */
  async getAllSets() {
    const cacheKey = 'all_sets';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest('/sets');
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching sets:', error);
      throw error;
    }
  }

  /**
   * Get cards from a specific set
   */
  async getCardsFromSet(setId, options = {}) {
    const cacheKey = `set_cards_${setId}_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        q: `set.id:"${setId}"`,
        pageSize: options.pageSize || 20,
        page: options.page || 1,
        ...options
      });

      const response = await this.makeRequest(`/cards?${queryParams}`);
      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching cards from set:', error);
      throw error;
    }
  }

  /**
   * Get API status and rate limit info
   */
  async getApiStatus() {
    try {
      const response = await this.makeRequest('/cards?pageSize=1');
      return {
        status: 'active',
        rateLimit: response.headers?.['x-ratelimit-remaining'] || 'unknown',
        totalCards: response.totalCount || 'unknown'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const pokemonTcgApiService = new PokemonTcgApiService();

export default pokemonTcgApiService;
