import { supabase } from '../lib/supabaseClient';

/**
 * Database Pricing Service
 * Fetches pricing data directly from Supabase cached tables
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
        .from('cached_cards')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Database pricing service initialization failed:', error);
        throw error;
      }
      
      this.isInitialized = true;
      console.log('✅ Database pricing service initialized');
    } catch (error) {
      console.error('❌ Database pricing service initialization error:', error);
      throw error;
    }
  }

  /**
   * Get pricing data for a card from the database
   * @param {string} apiId - The API ID of the card
   * @returns {Object|null} Pricing data or null if not found
   */
  async getCardPricing(apiId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { data, error } = await supabase
        .from('cached_cards')
        .select(`
          api_id,
          raw_market_price,
          raw_low_price,
          raw_mid_price,
          raw_high_price,
          raw_condition,
          raw_currency,
          raw_trend_7d,
          raw_trend_30d,
          raw_trend_90d,
          raw_trend_1y,
          raw_is_perfect,
          raw_is_signed,
          raw_is_error,
          graded_market_price,
          graded_low_price,
          graded_mid_price,
          graded_high_price,
          graded_condition,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d,
          graded_trend_30d,
          graded_trend_90d,
          graded_trend_1y,
          market_price,
          low_price,
          mid_price,
          high_price,
          loose_price,
          cib_price,
          new_price,
          retail_new_buy,
          retail_new_sell,
          retail_cib_buy,
          retail_cib_sell,
          retail_loose_buy,
          retail_loose_sell,
          gamestop_price,
          gamestop_trade_price,
          raw_pricing_data
        `)
        .eq('api_id', apiId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching card pricing:', error);
        return null;
      }

      if (!data) {
        console.log('📦 No pricing data found for card:', apiId);
        return null;
      }

      // Format the pricing data to match expected structure
      const pricingData = {
        raw: {
          market: data.raw_market_price,
          low: data.raw_low_price,
          mid: data.raw_mid_price,
          high: data.raw_high_price,
          condition: data.raw_condition,
          currency: data.raw_currency,
          trends: {
            days_7: { percent_change: data.raw_trend_7d },
            days_30: { percent_change: data.raw_trend_30d },
            days_90: { percent_change: data.raw_trend_90d },
            days_365: { percent_change: data.raw_trend_1y }
          },
          is_perfect: data.raw_is_perfect,
          is_signed: data.raw_is_signed,
          is_error: data.raw_is_error
        },
        graded: {
          market: data.graded_market_price,
          low: data.graded_low_price,
          mid: data.graded_mid_price,
          high: data.graded_high_price,
          condition: data.graded_condition,
          grade: data.graded_grade,
          company: data.graded_company,
          currency: data.graded_currency,
          trends: {
            days_7: { percent_change: data.graded_trend_7d },
            days_30: { percent_change: data.graded_trend_30d },
            days_90: { percent_change: data.graded_trend_90d },
            days_365: { percent_change: data.graded_trend_1y }
          }
        },
        pricecharting: {
          market: data.market_price,
          low: data.low_price,
          mid: data.mid_price,
          high: data.high_price,
          loose: data.loose_price,
          cib: data.cib_price,
          new: data.new_price,
          retail_new_buy: data.retail_new_buy,
          retail_new_sell: data.retail_new_sell,
          retail_cib_buy: data.retail_cib_buy,
          retail_cib_sell: data.retail_cib_sell,
          retail_loose_buy: data.retail_loose_buy,
          retail_loose_sell: data.retail_loose_sell,
          gamestop_price: data.gamestop_price,
          gamestop_trade_price: data.gamestop_trade_price
        },
        raw_pricing_data: data.raw_pricing_data,
        source: 'database'
      };

      console.log('📦 Retrieved pricing data from database for card:', apiId);
      return pricingData;
    } catch (error) {
      console.error('❌ Error in getCardPricing:', error);
      return null;
    }
  }

  /**
   * Get pricing data for a sealed product from the database
   * @param {string} apiId - The API ID of the sealed product
   * @returns {Object|null} Pricing data or null if not found
   */
  async getSealedProductPricing(apiId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { data, error } = await supabase
        .from('cached_sealed_products')
        .select(`
          api_id,
          loose_price,
          cib_price,
          new_price,
          retail_new_buy,
          retail_new_sell,
          retail_cib_buy,
          retail_cib_sell,
          retail_loose_buy,
          retail_loose_sell,
          gamestop_price,
          gamestop_trade_price,
          market_price,
          low_price,
          mid_price,
          high_price,
          raw_market_price,
          raw_low_price,
          raw_mid_price,
          raw_high_price,
          raw_condition,
          raw_currency,
          raw_trend_7d,
          raw_trend_30d,
          raw_trend_90d,
          raw_trend_1y,
          graded_market_price,
          graded_low_price,
          graded_mid_price,
          graded_high_price,
          graded_condition,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d,
          graded_trend_30d,
          graded_trend_90d,
          graded_trend_1y,
          raw_pricing_data
        `)
        .eq('api_id', apiId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching sealed product pricing:', error);
        return null;
      }

      if (!data) {
        console.log('📦 No pricing data found for sealed product:', apiId);
        return null;
      }

      // Format the pricing data to match expected structure
      const pricingData = {
        pricecharting: {
          loose: data.loose_price,
          cib: data.cib_price,
          new: data.new_price,
          retail_new_buy: data.retail_new_buy,
          retail_new_sell: data.retail_new_sell,
          retail_cib_buy: data.retail_cib_buy,
          retail_cib_sell: data.retail_cib_sell,
          retail_loose_buy: data.retail_loose_buy,
          retail_loose_sell: data.retail_loose_sell,
          gamestop_price: data.gamestop_price,
          gamestop_trade_price: data.gamestop_trade_price,
          market: data.market_price,
          low: data.low_price,
          mid: data.mid_price,
          high: data.high_price
        },
        raw: {
          market: data.raw_market_price,
          low: data.raw_low_price,
          mid: data.raw_mid_price,
          high: data.raw_high_price,
          condition: data.raw_condition,
          currency: data.raw_currency,
          trends: {
            days_7: { percent_change: data.raw_trend_7d },
            days_30: { percent_change: data.raw_trend_30d },
            days_90: { percent_change: data.raw_trend_90d },
            days_365: { percent_change: data.raw_trend_1y }
          }
        },
        graded: {
          market: data.graded_market_price,
          low: data.graded_low_price,
          mid: data.graded_mid_price,
          high: data.graded_high_price,
          condition: data.graded_condition,
          grade: data.graded_grade,
          company: data.graded_company,
          currency: data.graded_currency,
          trends: {
            days_7: { percent_change: data.graded_trend_7d },
            days_30: { percent_change: data.graded_trend_30d },
            days_90: { percent_change: data.graded_trend_90d },
            days_365: { percent_change: data.graded_trend_1y }
          }
        },
        raw_pricing_data: data.raw_pricing_data,
        source: 'database'
      };

      console.log('📦 Retrieved pricing data from database for sealed product:', apiId);
      return pricingData;
    } catch (error) {
      console.error('❌ Error in getSealedProductPricing:', error);
      return null;
    }
  }

  /**
   * Get pricing data for multiple cards from the database
   * @param {Array<string>} apiIds - Array of API IDs
   * @returns {Object} Object with apiId as key and pricing data as value
   */
  async getMultipleCardPricing(apiIds) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!apiIds || apiIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('cached_cards')
        .select(`
          api_id,
          raw_market_price,
          raw_low_price,
          raw_mid_price,
          raw_high_price,
          raw_condition,
          raw_currency,
          raw_trend_7d,
          raw_trend_30d,
          raw_trend_90d,
          raw_trend_1y,
          raw_is_perfect,
          raw_is_signed,
          raw_is_error,
          graded_market_price,
          graded_low_price,
          graded_mid_price,
          graded_high_price,
          graded_condition,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d,
          graded_trend_30d,
          graded_trend_90d,
          graded_trend_1y,
          market_price,
          low_price,
          mid_price,
          high_price,
          loose_price,
          cib_price,
          new_price,
          retail_new_buy,
          retail_new_sell,
          retail_cib_buy,
          retail_cib_sell,
          retail_loose_buy,
          retail_loose_sell,
          gamestop_price,
          gamestop_trade_price,
          raw_pricing_data
        `)
        .in('api_id', apiIds);

      if (error) {
        console.error('❌ Error fetching multiple card pricing:', error);
        return {};
      }

      const pricingMap = {};
      data.forEach(card => {
        pricingMap[card.api_id] = {
          raw: {
            market: card.raw_market_price,
            low: card.raw_low_price,
            mid: card.raw_mid_price,
            high: card.raw_high_price,
            condition: card.raw_condition,
            currency: card.raw_currency,
            trends: {
              days_7: { percent_change: card.raw_trend_7d },
              days_30: { percent_change: card.raw_trend_30d },
              days_90: { percent_change: card.raw_trend_90d },
              days_365: { percent_change: card.raw_trend_1y }
            },
            is_perfect: card.raw_is_perfect,
            is_signed: card.raw_is_signed,
            is_error: card.raw_is_error
          },
          graded: {
            market: card.graded_market_price,
            low: card.graded_low_price,
            mid: card.graded_mid_price,
            high: card.graded_high_price,
            condition: card.graded_condition,
            grade: card.graded_grade,
            company: card.graded_company,
            currency: card.graded_currency,
            trends: {
              days_7: { percent_change: card.graded_trend_7d },
              days_30: { percent_change: card.graded_trend_30d },
              days_90: { percent_change: card.graded_trend_90d },
              days_365: { percent_change: card.graded_trend_1y }
            }
          },
          pricecharting: {
            market: card.market_price,
            low: card.low_price,
            mid: card.mid_price,
            high: card.high_price,
            loose: card.loose_price,
            cib: card.cib_price,
            new: card.new_price,
            retail_new_buy: card.retail_new_buy,
            retail_new_sell: card.retail_new_sell,
            retail_cib_buy: card.retail_cib_buy,
            retail_cib_sell: card.retail_cib_sell,
            retail_loose_buy: card.retail_loose_buy,
            retail_loose_sell: card.retail_loose_sell,
            gamestop_price: card.gamestop_price,
            gamestop_trade_price: card.gamestop_trade_price
          },
          raw_pricing_data: card.raw_pricing_data,
          source: 'database'
        };
      });

      console.log(`📦 Retrieved pricing data for ${Object.keys(pricingMap).length} cards from database`);
      return pricingMap;
    } catch (error) {
      console.error('❌ Error in getMultipleCardPricing:', error);
      return {};
    }
  }

  /**
   * Get pricing data for multiple sealed products from the database
   * @param {Array<string>} apiIds - Array of API IDs
   * @returns {Object} Object with apiId as key and pricing data as value
   */
  async getMultipleSealedProductPricing(apiIds) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!apiIds || apiIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('cached_sealed_products')
        .select(`
          api_id,
          loose_price,
          cib_price,
          new_price,
          retail_new_buy,
          retail_new_sell,
          retail_cib_buy,
          retail_cib_sell,
          retail_loose_buy,
          retail_loose_sell,
          gamestop_price,
          gamestop_trade_price,
          market_price,
          low_price,
          mid_price,
          high_price,
          raw_market_price,
          raw_low_price,
          raw_mid_price,
          raw_high_price,
          raw_condition,
          raw_currency,
          raw_trend_7d,
          raw_trend_30d,
          raw_trend_90d,
          raw_trend_1y,
          graded_market_price,
          graded_low_price,
          graded_mid_price,
          graded_high_price,
          graded_condition,
          graded_grade,
          graded_company,
          graded_currency,
          graded_trend_7d,
          graded_trend_30d,
          graded_trend_90d,
          graded_trend_1y,
          raw_pricing_data
        `)
        .in('api_id', apiIds);

      if (error) {
        console.error('❌ Error fetching multiple sealed product pricing:', error);
        return {};
      }

      const pricingMap = {};
      data.forEach(product => {
        pricingMap[product.api_id] = {
          pricecharting: {
            loose: product.loose_price,
            cib: product.cib_price,
            new: product.new_price,
            retail_new_buy: product.retail_new_buy,
            retail_new_sell: product.retail_new_sell,
            retail_cib_buy: product.retail_cib_buy,
            retail_cib_sell: product.retail_cib_sell,
            retail_loose_buy: product.retail_loose_buy,
            retail_loose_sell: product.retail_loose_sell,
            gamestop_price: product.gamestop_price,
            gamestop_trade_price: product.gamestop_trade_price,
            market: product.market_price,
            low: product.low_price,
            mid: product.mid_price,
            high: product.high_price
          },
          raw: {
            market: product.raw_market_price,
            low: product.raw_low_price,
            mid: product.raw_mid_price,
            high: product.raw_high_price,
            condition: product.raw_condition,
            currency: product.raw_currency,
            trends: {
              days_7: { percent_change: product.raw_trend_7d },
              days_30: { percent_change: product.raw_trend_30d },
              days_90: { percent_change: product.raw_trend_90d },
              days_365: { percent_change: product.raw_trend_1y }
            }
          },
          graded: {
            market: product.graded_market_price,
            low: product.graded_low_price,
            mid: product.graded_mid_price,
            high: product.graded_high_price,
            condition: product.graded_condition,
            grade: product.graded_grade,
            company: product.graded_company,
            currency: product.graded_currency,
            trends: {
              days_7: { percent_change: product.graded_trend_7d },
              days_30: { percent_change: product.graded_trend_30d },
              days_90: { percent_change: product.graded_trend_90d },
              days_365: { percent_change: product.graded_trend_1y }
            }
          },
          raw_pricing_data: product.raw_pricing_data,
          source: 'database'
        };
      });

      console.log(`📦 Retrieved pricing data for ${Object.keys(pricingMap).length} sealed products from database`);
      return pricingMap;
    } catch (error) {
      console.error('❌ Error in getMultipleSealedProductPricing:', error);
      return {};
    }
  }
}

// Create and export a singleton instance
const databasePricingService = new DatabasePricingService();
export default databasePricingService;

