import { supabase } from '../lib/supabaseClient';

/**
 * Database Pricing Service
 * Fetches pricing data directly from pokemon_cards table
 * This eliminates the need for API calls for pricing data
 */
class DatabasePricingService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Test connection
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Database pricing service initialization failed:', error);
        throw error;
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Database pricing service initialization error:', error);
      throw error;
    }
  }

  /**
   * Get pricing data for a card from the database
   * @param {string} cardId - The card ID
   * @returns {Object|null} Pricing data or null if not found
   */
  async getCardPricing(cardId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select(`
          id,
          name,
          -- Raw pricing data
          raw_market,
          raw_low,
          raw_condition,
          raw_currency,
          raw_is_perfect,
          raw_is_signed,
          raw_is_error,
          raw_trend_7d_percent,
          raw_trend_30d_percent,
          raw_trend_90d_percent,
          raw_trend_180d_percent,
          -- Graded pricing data
          graded_market,
          graded_low,
          graded_mid,
          graded_high,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d_percent,
          graded_trend_30d_percent,
          graded_trend_90d_percent,
          graded_trend_180d_percent,
          -- Basic pricing
          market_price,
          low_price,
          mid_price,
          high_price,
          -- Complete pricing data
          prices,
          updated_at
        `)
        .eq('id', cardId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching card pricing:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Format the pricing data to match expected structure
      const pricingData = {
        raw: {
          market: data.raw_market,
          low: data.raw_low,
          condition: data.raw_condition,
          currency: data.raw_currency,
          trends: {
            days_7: { percent_change: data.raw_trend_7d_percent },
            days_30: { percent_change: data.raw_trend_30d_percent },
            days_90: { percent_change: data.raw_trend_90d_percent },
            days_180: { percent_change: data.raw_trend_180d_percent }
          },
          is_perfect: data.raw_is_perfect,
          is_signed: data.raw_is_signed,
          is_error: data.raw_is_error
        },
        graded: {
          market: data.graded_market,
          low: data.graded_low,
          mid: data.graded_mid,
          high: data.graded_high,
          condition: data.graded_grade,
          grade: data.graded_grade,
          company: data.graded_company,
          currency: data.graded_currency,
          trends: {
            days_7: { percent_change: data.graded_trend_7d_percent },
            days_30: { percent_change: data.graded_trend_30d_percent },
            days_90: { percent_change: data.graded_trend_90d_percent },
            days_180: { percent_change: data.graded_trend_180d_percent }
          }
        },
        basic: {
          market: data.market_price,
          low: data.low_price,
          mid: data.mid_price,
          high: data.high_price
        },
        prices: data.prices, // Complete pricing object from API
        source: 'database',
        lastUpdated: data.updated_at,
        cardId: data.id
      };

      return pricingData;
    } catch (error) {
      console.error('❌ Error in getCardPricing:', error);
      return null;
    }
  }

  /**
   * Get pricing data for multiple cards from the database
   * @param {Array<string>} cardIds - Array of card IDs
   * @returns {Object} Object with cardId as key and pricing data as value
   */
  async getMultipleCardPricing(cardIds) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!cardIds || cardIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select(`
          id,
          name,
          -- Raw pricing data
          raw_market,
          raw_low,
          raw_condition,
          raw_currency,
          raw_is_perfect,
          raw_is_signed,
          raw_is_error,
          raw_trend_7d_percent,
          raw_trend_30d_percent,
          raw_trend_90d_percent,
          raw_trend_180d_percent,
          -- Graded pricing data
          graded_market,
          graded_low,
          graded_mid,
          graded_high,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d_percent,
          graded_trend_30d_percent,
          graded_trend_90d_percent,
          graded_trend_180d_percent,
          -- Basic pricing
          market_price,
          low_price,
          mid_price,
          high_price,
          -- Complete pricing data
          prices,
          updated_at
        `)
        .in('id', cardIds);

      if (error) {
        console.error('❌ Error fetching multiple card pricing:', error);
        return {};
      }

      const pricingMap = {};
      data.forEach(card => {
        pricingMap[card.id] = {
          raw: {
            market: card.raw_market,
            low: card.raw_low,
            condition: card.raw_condition,
            currency: card.raw_currency,
            trends: {
              days_7: { percent_change: card.raw_trend_7d_percent },
              days_30: { percent_change: card.raw_trend_30d_percent },
              days_90: { percent_change: card.raw_trend_90d_percent },
              days_180: { percent_change: card.raw_trend_180d_percent }
            },
            is_perfect: card.raw_is_perfect,
            is_signed: card.raw_is_signed,
            is_error: card.raw_is_error
          },
          graded: {
            market: card.graded_market,
            low: card.graded_low,
            mid: card.graded_mid,
            high: card.graded_high,
            condition: card.graded_grade,
            grade: card.graded_grade,
            company: card.graded_company,
            currency: card.graded_currency,
            trends: {
              days_7: { percent_change: card.graded_trend_7d_percent },
              days_30: { percent_change: card.graded_trend_30d_percent },
              days_90: { percent_change: card.graded_trend_90d_percent },
              days_180: { percent_change: card.graded_trend_180d_percent }
            }
          },
          basic: {
            market: card.market_price,
            low: card.low_price,
            mid: card.mid_price,
            high: card.high_price
          },
          prices: card.prices,
          source: 'database',
          lastUpdated: card.updated_at,
          cardId: card.id
        };
      });

      return pricingMap;
    } catch (error) {
      console.error('❌ Error in getMultipleCardPricing:', error);
      return {};
    }
  }

  /**
   * Check if pricing data is fresh (less than 12 hours old)
   * @param {string} cardId - Card ID
   * @returns {Object} Freshness information
   */
  async checkPricingFreshness(cardId) {
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('updated_at, raw_market, graded_market')
        .eq('id', cardId)
        .single();

      if (error || !data) {
        return { isFresh: false, age: null, lastUpdated: null };
      }

      const lastUpdated = new Date(data.updated_at);
      const now = new Date();
      const ageHours = (now - lastUpdated) / (1000 * 60 * 60);

      return {
        isFresh: ageHours < 12,
        age: ageHours,
        lastUpdated: lastUpdated.toISOString(),
        hasPricingData: !!(data.raw_market || data.graded_market)
      };
    } catch (error) {
      console.error('Error checking pricing freshness:', error);
      return { isFresh: false, age: null, lastUpdated: null };
    }
  }
}

// Create and export a singleton instance
const databasePricingService = new DatabasePricingService();
export default databasePricingService;