import { supabase } from '../lib/supabaseClient.js';

/**
 * OneTrack v2 Data Service
 * Clean service for working with the new v2 database schema
 */
class V2DataService {
  constructor() {
    this.supabase = supabase;
  }

  // =============================================
  // ITEMS MANAGEMENT
  // =============================================

  /**
   * Get all items with optional filtering
   */
  async getItems(filters = {}) {
    let query = this.supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true });

    // Apply filters
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.setName) {
      query = query.eq('set_name', filters.setName);
    }
    if (filters.itemType) {
      query = query.eq('item_type', filters.itemType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get item by ID
   */
  async getItemById(itemId) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new item (manual entry)
   */
  async createItem(itemData) {
    const { data, error } = await this.supabase
      .from('items')
      .insert([{
        name: itemData.name,
        set_name: itemData.setName,
        item_type: itemData.itemType,
        rarity: itemData.rarity,
        card_number: itemData.cardNumber,
        source: 'manual',
        market_value_cents: itemData.marketValueCents,
        market_value_source: 'manual',
        market_value_updated_at: new Date().toISOString(),
        image_url: itemData.imageUrl,
        image_source: 'manual',
        description: itemData.description,
        condition_notes: itemData.conditionNotes
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create item from API search result
   */
  async createItemFromAPI(apiData, apiSource = 'cardmarket') {
    const { data, error } = await this.supabase
      .from('items')
      .insert([{
        name: apiData.name,
        set_name: apiData.set,
        item_type: apiData.type,
        rarity: apiData.rarity,
        card_number: apiData.cardNumber,
        source: 'api',
        api_id: apiData.id,
        api_source: apiSource,
        market_value_cents: apiData.marketValue,
        market_value_source: 'api',
        market_value_updated_at: new Date().toISOString(),
        image_url: apiData.imageUrl,
        image_source: 'api',
        description: apiData.description
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update item market value
   */
  async updateItemMarketValue(itemId, marketValueCents, source = 'user_override') {
    const { data, error } = await this.supabase
      .from('items')
      .update({
        market_value_cents: marketValueCents,
        market_value_source: source,
        market_value_updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update item details
   */
  async updateItem(itemId, updateData) {
    const { data, error } = await this.supabase
      .from('items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // ORDERS MANAGEMENT (Order Book)
  // =============================================

  /**
   * Get all orders with item details
   */
  async getOrders(filters = {}) {
    let query = this.supabase
      .from('orders')
      .select(`
        *,
        items (
          id,
          name,
          set_name,
          item_type,
          rarity,
          market_value_cents,
          image_url
        ),
        buy_marketplace:marketplaces!orders_buy_marketplace_id_fkey (
          id,
          name,
          display_name,
          fee_percentage,
          fixed_fee_cents
        ),
        sell_marketplace:marketplaces!orders_sell_marketplace_id_fkey (
          id,
          name,
          display_name,
          fee_percentage,
          fixed_fee_cents
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.isSold !== undefined) {
      query = query.eq('is_sold', filters.isSold);
    }
    if (filters.orderType) {
      query = query.eq('order_type', filters.orderType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get current inventory (unsold items)
   */
  async getCurrentInventory() {
    const { data, error } = await this.supabase
      .from('current_inventory')
      .select('*')
      .order('buy_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get sold items with profit/loss data
   */
  async getSoldItems() {
    const { data, error } = await this.supabase
      .from('sold_items')
      .select('*')
      .order('sell_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new order (buy)
   */
  async createOrder(orderData) {
    const { data, error } = await this.supabase
      .from('orders')
      .insert([{
        item_id: orderData.itemId,
        order_type: 'buy',
        buy_date: orderData.buyDate,
        buy_price_cents: orderData.buyPriceCents,
        buy_quantity: orderData.buyQuantity || 1,
        buy_location: orderData.buyLocation,
        buy_marketplace_id: orderData.buyMarketplaceId,
        buy_notes: orderData.buyNotes,
        status: orderData.status || 'ordered'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark order as sold
   */
  async markOrderAsSold(orderId, sellData) {
    const { data, error } = await this.supabase
      .from('orders')
      .update({
        sell_date: sellData.sellDate,
        sell_price_cents: sellData.sellPriceCents,
        sell_quantity: sellData.sellQuantity,
        sell_location: sellData.sellLocation,
        sell_marketplace_id: sellData.sellMarketplaceId,
        sell_fees_cents: sellData.sellFeesCents || 0,
        sell_notes: sellData.sellNotes,
        is_sold: true,
        status: 'sold'
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    const { data, error } = await this.supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return true;
  }

  // =============================================
  // MARKETPLACES MANAGEMENT
  // =============================================

  /**
   * Get all marketplaces
   */
  async getMarketplaces() {
    const { data, error } = await this.supabase
      .from('marketplaces')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get marketplace by ID
   */
  async getMarketplaceById(marketplaceId) {
    const { data, error } = await this.supabase
      .from('marketplaces')
      .select('*')
      .eq('id', marketplaceId)
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // COLLECTION ANALYTICS
  // =============================================

  /**
   * Get collection summary
   */
  async getCollectionSummary() {
    const { data, error } = await this.supabase
      .from('collection_summary')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats() {
    const [inventory, soldItems, summary] = await Promise.all([
      this.getCurrentInventory(),
      this.getSoldItems(),
      this.getCollectionSummary()
    ]);

    return {
      inventory: {
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.buy_quantity, 0),
        totalCost: inventory.reduce((sum, item) => sum + item.total_cost_cents, 0),
        totalMarketValue: inventory.reduce((sum, item) => sum + (item.market_value_cents * item.buy_quantity), 0)
      },
      sold: {
        totalItems: soldItems.length,
        totalRevenue: soldItems.reduce((sum, item) => sum + item.total_revenue_cents, 0),
        totalProfit: soldItems.reduce((sum, item) => sum + item.net_profit_cents, 0),
        averageProfitPercentage: soldItems.length > 0 
          ? soldItems.reduce((sum, item) => sum + (item.profit_percentage || 0), 0) / soldItems.length 
          : 0
      },
      summary
    };
  }

  // =============================================
  // USER PREFERENCES
  // =============================================

  /**
   * Get user preferences
   */
  async getUserPreferences() {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    return data;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences) {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Search items by name
   */
  async searchItems(searchTerm) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get items by set name
   */
  async getItemsBySet(setName) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('set_name', setName)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Format price from cents to dollars
   */
  formatPrice(cents) {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Convert dollars to cents
   */
  dollarsToCents(dollars) {
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars
   */
  centsToDollars(cents) {
    return cents / 100;
  }
}

// Create and export singleton instance
const v2DataService = new V2DataService();
export default v2DataService;
