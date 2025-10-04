/**
 * PriceCharting API Configuration
 * Configuration for PriceCharting API integration
 */

export const priceChartingConfig = {
  // API Configuration (handled by backend)
  // API key is stored securely on the server
  baseUrl: 'https://www.pricecharting.com/api',
  
  // Supported Games for Sealed Products
  supportedGames: [
    'pokemon',
    'magic',
    'yugioh',
    'digimon',
    'dragonball',
    'one-piece'
  ],
  
  // Sealed Product Types
  sealedProductTypes: [
    'booster box',
    'booster pack',
    'collection box',
    'elite trainer box',
    'bundle',
    'tin',
    'deck box',
    'starter deck',
    'theme deck',
    'premium collection'
  ],
  
  // API Endpoints
  endpoints: {
    search: '/products',
    productDetails: '/product',
    pricing: '/product/{id}/price',
    categories: '/categories'
  },
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000
  },
  
  // Default Search Parameters
  defaultSearchParams: {
    limit: 50,
    sealedOnly: true
  }
}

export default priceChartingConfig
