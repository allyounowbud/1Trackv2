/**
 * Scrydex API Service
 * Primary data source for TCG data (Pokemon, Magic, Lorcana, Gundam)
 * Handles authentication, rate limiting, and data caching
 */

class ScrydexService {
  constructor() {
    this.baseUrl = 'https://api.scrydex.com/v1';
    this.apiKey = null; // Will be set from environment
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours for most data
    this.rateLimitDelay = 100; // 100ms between requests to respect rate limits
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Rate limiting configuration
    this.rateLimits = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };
    
    this.requestCounts = {
      minute: [],
      hour: [],
      day: []
    };
  }

  /**
   * Initialize the service with API key
   */
  async initialize() {
    // API key should be set as environment variable on the backend
    // Frontend should never have direct access to the API key
    console.log('🔧 ScrydexService initialized');
    return true;
  }

  /**
   * Rate limiting check
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Clean old requests
    this.requestCounts.minute = this.requestCounts.minute.filter(time => now - time < 60000);
    this.requestCounts.hour = this.requestCounts.hour.filter(time => now - time < 3600000);
    this.requestCounts.day = this.requestCounts.day.filter(time => now - time < 86400000);
    
    // Check limits
    if (this.requestCounts.minute.length >= this.rateLimits.requestsPerMinute) {
      throw new Error('Rate limit exceeded: too many requests per minute');
    }
    if (this.requestCounts.hour.length >= this.rateLimits.requestsPerHour) {
      throw new Error('Rate limit exceeded: too many requests per hour');
    }
    if (this.requestCounts.day.length >= this.rateLimits.requestsPerDay) {
      throw new Error('Rate limit exceeded: too many requests per day');
    }
    
    // Record this request
    this.requestCounts.minute.push(now);
    this.requestCounts.hour.push(now);
    this.requestCounts.day.push(now);
  }

  /**
   * Make request with rate limiting and error handling
   */
  async makeRequest(endpoint, params = {}) {
    // Check rate limits
    this.checkRateLimit();
    
    // Ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    
    // Build URL with parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    
    try {
      console.log(`🔍 Scrydex API Request: ${endpoint}`, params);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OneTrack/2.2.0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scrydex API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Scrydex API Response: ${endpoint}`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ Scrydex API Error: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get cache key for request
   */
  getCacheKey(endpoint, params) {
    return `scrydex:${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Get from cache
   */
  getFromCache(cacheKey) {
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      return entry.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Set cache
   */
  setCache(cacheKey, data, ttl = this.cacheTimeout) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Search Pokemon cards
   */
  async searchPokemonCards(query, options = {}) {
    const cacheKey = this.getCacheKey('/pokemon/cards', { q: query, ...options });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/pokemon/cards', {
      q: query,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      ...options
    });
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get Pokemon card by ID
   */
  async getPokemonCard(cardId) {
    const cacheKey = this.getCacheKey(`/pokemon/cards/${cardId}`, {});
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest(`/pokemon/cards/${cardId}`);
    
    // Cache individual cards longer since they don't change often
    this.setCache(cacheKey, data, 7 * 24 * 60 * 60 * 1000); // 7 days
    return data;
  }

  /**
   * Search Pokemon expansions
   */
  async searchPokemonExpansions(query, options = {}) {
    const cacheKey = this.getCacheKey('/pokemon/expansions', { q: query, ...options });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/pokemon/expansions', {
      q: query,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      ...options
    });
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get Pokemon expansion by ID
   */
  async getPokemonExpansion(expansionId) {
    const cacheKey = this.getCacheKey(`/pokemon/expansions/${expansionId}`, {});
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest(`/pokemon/expansions/${expansionId}`);
    
    // Cache expansions longer since they don't change often
    this.setCache(cacheKey, data, 7 * 24 * 60 * 60 * 1000); // 7 days
    return data;
  }

  /**
   * Get all Pokemon expansions (for initial data load)
   */
  async getAllPokemonExpansions() {
    const cacheKey = this.getCacheKey('/pokemon/expansions', { pageSize: 1000 });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/pokemon/expansions', {
      pageSize: 1000
    });
    
    // Cache all expansions for 24 hours
    this.setCache(cacheKey, data, 24 * 60 * 60 * 1000);
    return data;
  }

  /**
   * Search Magic: The Gathering cards
   */
  async searchMagicCards(query, options = {}) {
    const cacheKey = this.getCacheKey('/magic/cards', { q: query, ...options });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/magic/cards', {
      q: query,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      ...options
    });
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Search Lorcana cards
   */
  async searchLorcanaCards(query, options = {}) {
    const cacheKey = this.getCacheKey('/lorcana/cards', { q: query, ...options });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/lorcana/cards', {
      q: query,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      ...options
    });
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Search Gundam cards
   */
  async searchGundamCards(query, options = {}) {
    const cacheKey = this.getCacheKey('/gundam/cards', { q: query, ...options });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const data = await this.makeRequest('/gundam/cards', {
      q: query,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      ...options
    });
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get API usage statistics
   */
  getUsageStats() {
    return {
      requestsThisMinute: this.requestCounts.minute.length,
      requestsThisHour: this.requestCounts.hour.length,
      requestsThisDay: this.requestCounts.day.length,
      cacheSize: this.cache.size,
      rateLimits: this.rateLimits
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Scrydex cache cleared');
  }
}

// Export singleton instance
const scrydexService = new ScrydexService();
export default scrydexService;
