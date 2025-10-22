import { createClient } from '@supabase/supabase-js';
import { JustTCG } from 'justtcg-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

class JustTCGService {
  constructor() {
    this.client = new JustTCG({
      apiKey: process.env.VITE_JUSTTCG_API_KEY
    });
    this.requestsUsed = 0;
    this.dailyRequestsUsed = 0;
    this.lastResetDate = new Date().toDateString();
  }

  async makeRequest(requestFn) {
    // Check rate limits before making request
    await this.checkRateLimits();
    
    try {
      console.log(`🌐 JustTCG API Request...`);
      const response = await requestFn();
      
      // Update request counters from response
      if (response.usage) {
        this.requestsUsed = response.usage.apiRequestsUsed;
        this.dailyRequestsUsed = response.usage.apiDailyRequestsUsed;
      }
      
      // Update sync status in database
      await this.updateSyncStatus();
      
      return response;
    } catch (error) {
      console.error(`❌ JustTCG API Error:`, error.message);
      throw error;
    }
  }

  async checkRateLimits() {
    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyRequestsUsed = 0;
      this.lastResetDate = today;
    }

    // Check daily limit (100 requests)
    if (this.dailyRequestsUsed >= 100) {
      throw new Error('Daily request limit reached. Please try again tomorrow.');
    }

    // Check monthly limit (1000 requests) - would need to fetch from database
    const syncStatus = await this.getSyncStatus();
    if (syncStatus.api_requests_used >= 1000) {
      throw new Error('Monthly request limit reached. Please upgrade your plan.');
    }
  }

  async getSyncStatus() {
    const { data, error } = await supabase
      .from('justtcg_sync_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || {
      api_requests_used: 0,
      daily_requests_used: 0,
      api_requests_remaining: 1000,
      daily_requests_remaining: 100
    };
  }

  async updateSyncStatus() {
    const { error } = await supabase
      .from('justtcg_sync_status')
      .upsert({
        id: 1,
        api_requests_used: this.requestsUsed,
        daily_requests_used: this.dailyRequestsUsed,
        api_requests_remaining: 1000 - this.requestsUsed,
        daily_requests_remaining: 100 - this.dailyRequestsUsed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error updating sync status:', error);
    }
  }

  // Get all Pokemon sets/expansions
  async getSets() {
    return await this.makeRequest(async () => {
      return await this.client.v1.sets.list({
        game: 'Pokemon'
      });
    });
  }

  // Get cards from a specific set with pagination
  async getCardsFromSet(setId, options = {}) {
    return await this.makeRequest(async () => {
      return await this.client.v1.cards.get({
        game: 'Pokemon',
        set: setId,
        limit: options.limit || 20,
        offset: options.offset || 0,
        condition: ['NM', 'LP', 'MP', 'HP', 'D'] // Exclude sealed cards
      });
    });
  }

  // Search for cards by name
  async searchCards(query, options = {}) {
    return await this.makeRequest(async () => {
      return await this.client.v1.cards.get({
        game: 'Pokemon',
        search: query,
        limit: options.limit || 20,
        offset: options.offset || 0,
        condition: ['NM', 'LP', 'MP', 'HP', 'D']
      });
    });
  }

  // Get specific card by ID
  async getCard(cardId) {
    return await this.makeRequest(async () => {
      return await this.client.v1.cards.get({
        game: 'Pokemon',
        id: cardId
      });
    });
  }

  // Get pricing for a specific card (pricing is included in card data)
  async getCardPricing(cardId) {
    return await this.getCard(cardId);
  }

  // Format card data to match our database schema
  formatCardData(cardData) {
    return {
      id: `justtcg-${cardData.id}`,
      name: cardData.name,
      set_name: cardData.set?.name,
      set_code: cardData.set?.code,
      card_number: cardData.number,
      rarity: cardData.rarity,
      language: cardData.language || 'en',
      language_code: cardData.language_code || 'en',
      supertype: cardData.supertype,
      types: cardData.types || [],
      subtypes: cardData.subtypes || [],
      hp: cardData.hp,
      stage: cardData.stage,
      image_url: cardData.imageUrl,
      image_small: cardData.imageSmall,
      image_large: cardData.imageLarge,
      justtcg_market_price: cardData.pricing?.marketPrice,
      justtcg_low_price: cardData.pricing?.lowPrice,
      justtcg_mid_price: cardData.pricing?.midPrice,
      justtcg_high_price: cardData.pricing?.highPrice,
      justtcg_foil_price: cardData.pricing?.foilPrice,
      justtcg_normal_price: cardData.pricing?.normalPrice,
      raw_api_data: cardData,
      last_synced_at: new Date().toISOString()
    };
  }

  // Batch import cards to database
  async importCards(cards) {
    const formattedCards = cards.map(card => this.formatCardData(card));
    
    const { error } = await supabase
      .from('justtcg_cards')
      .upsert(formattedCards, { onConflict: 'id' });

    if (error) {
      throw new Error(`Database import error: ${error.message}`);
    }

    return formattedCards.length;
  }

  // Get remaining API quota
  async getQuotaStatus() {
    const status = await this.getSyncStatus();
    return {
      monthly: {
        used: status.api_requests_used,
        remaining: status.api_requests_remaining,
        limit: 1000
      },
      daily: {
        used: this.dailyRequestsUsed,
        remaining: 100 - this.dailyRequestsUsed,
        limit: 100
      }
    };
  }
}

export default JustTCGService;
