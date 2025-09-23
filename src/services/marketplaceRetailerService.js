import { supabase } from '../lib/supabaseClient';

class MarketplaceRetailerService {
  constructor() {
    this.marketplaces = [];
    this.retailers = [];
    this.loaded = false;
  }

  // =============================================
  // MARKETPLACE MANAGEMENT
  // =============================================

  /**
   * Get all marketplaces (with caching)
   */
  async getMarketplaces() {
    if (!this.loaded) {
      await this.loadData();
    }
    return this.marketplaces;
  }

  /**
   * Get an existing marketplace (read-only, doesn't create new ones)
   */
  async getMarketplace(name) {
    try {
      const { data: existing, error: findError } = await supabase
        .from('marketplaces')
        .select('*')
        .eq('name', name.toLowerCase())
        .maybeSingle();

      if (findError) throw findError;
      return existing;
    } catch (error) {
      console.error('Error getting marketplace:', error);
      return null;
    }
  }

  /**
   * Get or create a marketplace
   */
  async getOrCreateMarketplace(name, feePercentage = 0, fixedFeeCents = 0) {
    try {
      // First try to find existing marketplace
      const { data: existing, error: findError } = await supabase
        .from('marketplaces')
        .select('*')
        .eq('name', name.toLowerCase())
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        return existing;
      }

      // Create new marketplace
      const { data: newMarketplace, error: createError } = await supabase
        .from('marketplaces')
        .insert({
          name: name.toLowerCase(),
          display_name: name,
          fee_percentage: feePercentage,
          fixed_fee_cents: fixedFeeCents
        })
        .select('*')
        .single();

      if (createError) throw createError;

      // Update local cache
      this.marketplaces.push(newMarketplace);
      return newMarketplace;

    } catch (error) {
      console.error('Error getting/creating marketplace:', error);
      throw error;
    }
  }

  /**
   * Add a custom marketplace
   */
  async addCustomMarketplace(name, feePercentage = 0, fixedFeeCents = 0) {
    try {
      const { data, error } = await supabase
        .from('marketplaces')
        .insert({
          name: name.toLowerCase(),
          display_name: name,
          fee_percentage: feePercentage,
          fixed_fee_cents: fixedFeeCents
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update local cache
      this.marketplaces.push(data);
      return data;

    } catch (error) {
      console.error('Error adding custom marketplace:', error);
      throw error;
    }
  }

  // =============================================
  // RETAILER MANAGEMENT
  // =============================================

  /**
   * Get all retailers (with caching)
   */
  async getRetailers() {
    if (!this.loaded) {
      await this.loadData();
    }
    return this.retailers;
  }

  /**
   * Get or create a retailer
   */
  async getOrCreateRetailer(name, location = null) {
    try {
      // First try to find existing retailer
      const { data: existing, error: findError } = await supabase
        .from('retailers')
        .select('*')
        .eq('name', name.toLowerCase())
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        return existing;
      }

      // Create new retailer
      const { data: newRetailer, error: createError } = await supabase
        .from('retailers')
        .insert({
          name: name.toLowerCase(),
          display_name: name,
          location: location
        })
        .select('*')
        .single();

      if (createError) throw createError;

      // Update local cache
      this.retailers.push(newRetailer);
      return newRetailer;

    } catch (error) {
      console.error('Error getting/creating retailer:', error);
      throw error;
    }
  }

  /**
   * Add a custom retailer
   */
  async addCustomRetailer(name, location = null, website = null) {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .insert({
          name: name.toLowerCase(),
          display_name: name,
          location: location,
          website: website
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update local cache
      this.retailers.push(data);
      return data;

    } catch (error) {
      console.error('Error adding custom retailer:', error);
      throw error;
    }
  }

  // =============================================
  // DATA LOADING
  // =============================================

  /**
   * Load all data from database
   */
  async loadData() {
    try {
      // Load marketplaces
      const { data: marketplaces, error: marketplaceError } = await supabase
        .from('marketplaces')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (marketplaceError) throw marketplaceError;

      // Load retailers
      const { data: retailers, error: retailerError } = await supabase
        .from('retailers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (retailerError) throw retailerError;

      this.marketplaces = marketplaces || [];
      this.retailers = retailers || [];
      this.loaded = true;

      console.log(`📦 Loaded ${this.marketplaces.length} marketplaces and ${this.retailers.length} retailers`);

    } catch (error) {
      console.error('Error loading marketplace/retailer data:', error);
      this.marketplaces = [];
      this.retailers = [];
      this.loaded = true; // Set to true to prevent infinite retries
    }
  }

  /**
   * Clear cache and reload data
   */
  async refreshData() {
    this.loaded = false;
    await this.loadData();
  }

  // =============================================
  // SEARCH AND FILTER
  // =============================================

  /**
   * Search marketplaces by name
   */
  async searchMarketplaces(query) {
    const marketplaces = await this.getMarketplaces();
    if (!query) return marketplaces;
    
    return marketplaces.filter(mp => 
      mp.display_name.toLowerCase().includes(query.toLowerCase()) ||
      mp.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Search retailers by name
   */
  async searchRetailers(query) {
    const retailers = await this.getRetailers();
    if (!query) return retailers;
    
    return retailers.filter(retailer => 
      retailer.display_name.toLowerCase().includes(query.toLowerCase()) ||
      retailer.name.toLowerCase().includes(query.toLowerCase()) ||
      (retailer.location && retailer.location.toLowerCase().includes(query.toLowerCase()))
    );
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get marketplace by ID
   */
  async getMarketplaceById(id) {
    const marketplaces = await this.getMarketplaces();
    return marketplaces.find(mp => mp.id === id);
  }

  /**
   * Get retailer by ID
   */
  async getRetailerById(id) {
    const retailers = await this.getRetailers();
    return retailers.find(retailer => retailer.id === id);
  }

  /**
   * Calculate fees for a marketplace
   */
  calculateFees(marketplace, salePrice) {
    if (!marketplace || !salePrice) return 0;
    
    const percentageFee = (salePrice * marketplace.fee_percentage) / 100;
    const fixedFee = marketplace.fixed_fee_cents / 100; // Convert cents to dollars
    
    return percentageFee + fixedFee;
  }
}

// Export singleton instance
export const marketplaceRetailerService = new MarketplaceRetailerService();
export default marketplaceRetailerService;


