/**
 * Real-Time Pricing Service
 * Fallback service for fetching fresh pricing data when cache is stale
 * Integrates with existing API services for on-demand pricing updates
 */

import { supabase } from '../lib/supabaseClient';

class RealTimePricingService {
  constructor() {
    this.isInitialized = false;
    this.rateLimitDelay = 300; // 300ms between requests
    this.lastRequestTime = 0;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Test connection
      const { data, error } = await supabase
        .from('cached_cards')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Real-time pricing service initialization failed:', error);
        throw error;
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Real-time pricing service initialization error:', error);
      throw error;
    }
  }

  /**
   * Rate limiting helper
   */
  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch real-time pricing from Scrydex API
   * @param {string} apiId - Card API ID
   * @returns {Object|null} Fresh pricing data
   */
  async fetchRealTimePricing(apiId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.respectRateLimit();

    try {
      
      // Call Scrydex API through our backend
      const { data, error } = await supabase.functions.invoke('scrydex-api', {
        body: {
          endpoint: 'card-pricing',
          cardId: apiId
        }
      });

      if (error) {
        console.error(`❌ Real-time pricing API error for ${apiId}:`, error);
        return null;
      }

      if (!data || !data.prices) {
        return null;
      }

      // Format the pricing data to match expected structure
      const formattedPricing = this.formatPricingData(data.prices, apiId);
      
      // Update database with fresh pricing
      await this.updateDatabasePricing(apiId, formattedPricing);
      
      return formattedPricing;

    } catch (error) {
      console.error(`❌ Error fetching real-time pricing for ${apiId}:`, error);
      return null;
    }
  }

  /**
   * Format pricing data from API response
   * @param {Object} prices - Raw pricing data from API
   * @param {string} apiId - Card API ID
   * @returns {Object} Formatted pricing data
   */
  formatPricingData(prices, apiId) {
    const now = new Date().toISOString();
    
    return {
      raw: {
        market: prices.raw?.market,
        low: prices.raw?.low,
        mid: prices.raw?.mid,
        high: prices.raw?.high,
        condition: prices.raw?.condition,
        currency: prices.raw?.currency,
        trends: {
          days_7: { percent_change: prices.raw?.trends?.days_7?.percent_change },
          days_30: { percent_change: prices.raw?.trends?.days_30?.percent_change },
          days_90: { percent_change: prices.raw?.trends?.days_90?.percent_change },
          days_365: { percent_change: prices.raw?.trends?.days_365?.percent_change }
        },
        is_perfect: prices.raw?.is_perfect,
        is_signed: prices.raw?.is_signed,
        is_error: prices.raw?.is_error
      },
      graded: {
        market: prices.graded?.market,
        low: prices.graded?.low,
        mid: prices.graded?.mid,
        high: prices.graded?.high,
        condition: prices.graded?.condition,
        grade: prices.graded?.grade,
        company: prices.graded?.company,
        currency: prices.graded?.currency,
        trends: {
          days_7: { percent_change: prices.graded?.trends?.days_7?.percent_change },
          days_30: { percent_change: prices.graded?.trends?.days_30?.percent_change },
          days_90: { percent_change: prices.graded?.trends?.days_90?.percent_change },
          days_365: { percent_change: prices.graded?.trends?.days_365?.percent_change }
        }
      },
      pricecharting: prices.pricecharting || {},
      raw_pricing_data: prices,
      source: 'realtime',
      lastUpdated: now,
      apiId
    };
  }

  /**
   * Update database with fresh pricing data
   * @param {string} apiId - Card API ID
   * @param {Object} pricingData - Formatted pricing data
   */
  async updateDatabasePricing(apiId, pricingData) {
    try {
      const updateData = {
        // Raw pricing fields
        raw_market: pricingData.raw?.market,
        raw_low: pricingData.raw?.low,
        raw_condition: pricingData.raw?.condition,
        raw_currency: pricingData.raw?.currency,
        raw_is_perfect: pricingData.raw?.is_perfect,
        raw_is_signed: pricingData.raw?.is_signed,
        raw_is_error: pricingData.raw?.is_error,
        raw_trend_7d_percent: pricingData.raw?.trends?.days_7?.percent_change,
        raw_trend_30d_percent: pricingData.raw?.trends?.days_30?.percent_change,
        raw_trend_90d_percent: pricingData.raw?.trends?.days_90?.percent_change,
        raw_trend_180d_percent: pricingData.raw?.trends?.days_180?.percent_change,
        
        // Graded pricing fields
        graded_market: pricingData.graded?.market,
        graded_low: pricingData.graded?.low,
        graded_mid: pricingData.graded?.mid,
        graded_high: pricingData.graded?.high,
        graded_grade: pricingData.graded?.grade,
        graded_company: pricingData.graded?.company,
        graded_currency: pricingData.graded?.currency,
        graded_trend_7d_percent: pricingData.graded?.trends?.days_7?.percent_change,
        graded_trend_30d_percent: pricingData.graded?.trends?.days_30?.percent_change,
        graded_trend_90d_percent: pricingData.graded?.trends?.days_90?.percent_change,
        graded_trend_180d_percent: pricingData.graded?.trends?.days_180?.percent_change,
        
        // Store complete pricing data and update timestamp
        prices: pricingData.raw_pricing_data,
        updated_at: pricingData.lastUpdated
      };

      const { error } = await supabase
        .from('pokemon_cards')
        .update(updateData)
        .eq('id', apiId);

      if (error) {
        console.error(`❌ Failed to update database pricing for ${apiId}:`, error);
      } else {
      }
    } catch (error) {
      console.error(`❌ Error updating database pricing for ${apiId}:`, error);
    }
  }

  /**
   * Fetch real-time pricing for multiple cards
   * @param {Array<string>} apiIds - Array of card API IDs
   * @param {Object} options - Options for fetching
   * @returns {Object} Object with apiId as key and pricing data as value
   */
  async fetchMultipleRealTimePricing(apiIds, options = {}) {
    const { maxConcurrent = 3 } = options;
    const results = {};


    // Process in batches to respect rate limits
    for (let i = 0; i < apiIds.length; i += maxConcurrent) {
      const batch = apiIds.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (apiId) => {
        const pricing = await this.fetchRealTimePricing(apiId);
        return { apiId, pricing };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ apiId, pricing }) => {
        if (pricing) {
          results[apiId] = pricing;
        }
      });

      // Small delay between batches
      if (i + maxConcurrent < apiIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Check if real-time pricing is available/needed
   * @param {string} apiId - Card API ID
   * @returns {Object} Availability info
   */
  async checkPricingAvailability(apiId) {
    try {
      // Check if card exists in database
      const { data: card, error } = await supabase
        .from('pokemon_cards')
        .select('id, updated_at, raw_market, graded_market')
        .eq('id', apiId)
        .single();

      if (error || !card) {
        return {
          available: false,
          reason: 'Card not found in database',
          needsRealTime: true
        };
      }

      const lastUpdated = new Date(card.updated_at);
      const now = new Date();
      const ageHours = (now - lastUpdated) / (1000 * 60 * 60);

      return {
        available: true,
        ageHours: ageHours.toFixed(1),
        isStale: ageHours > 12,
        hasPricingData: !!(card.raw_market || card.graded_market),
        needsRealTime: ageHours > 24 || !(card.raw_market || card.graded_market)
      };
    } catch (error) {
      console.error(`❌ Error checking pricing availability for ${apiId}:`, error);
      return {
        available: false,
        reason: 'Error checking availability',
        needsRealTime: true
      };
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      rateLimitDelay: this.rateLimitDelay,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Create and export singleton instance
const realTimePricingService = new RealTimePricingService();
export default realTimePricingService;
