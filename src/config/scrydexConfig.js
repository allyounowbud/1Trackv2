// Scrydex API Configuration
// NOTE: All API credentials are now handled securely by the backend
// This configuration is for reference only and contains no sensitive data
export const SCRYDEX_CONFIG = {
  // API Settings - Backend handles all authentication
  baseUrl: '/scrydex-api', // Our secure backend proxy
  
  // Cache Settings (client-side only)
  cache: {
    defaultTimeout: 24 * 60 * 60 * 1000, // 24 hours
    cardTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days for individual cards
    expansionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days for expansions
    searchTimeout: 2 * 60 * 60 * 1000 // 2 hours for search results
  },
  
  // Default Search Settings
  search: {
    defaultLanguage: 'en',
    defaultPageSize: 20,
    maxPageSize: 100
  },
  
  // Supported Games
  games: {
    pokemon: {
      name: 'Pokemon',
      supportedLanguages: ['en', 'ja']
    },
    magic: {
      name: 'Magic: The Gathering',
      supportedLanguages: ['en']
    },
    lorcana: {
      name: 'Lorcana',
      supportedLanguages: ['en']
    },
    gundam: {
      name: 'Gundam',
      supportedLanguages: ['en']
    }
  }
};

// Helper function to get API key from environment
export function getScrydexApiKey() {
  // SECURITY: API keys are now handled securely by the backend
  // Frontend should never have direct access to API keys
  console.warn('⚠️ API key access blocked - handled by secure backend service');
  return null;
}

// Helper function to get supported games
export function getSupportedGames() {
  return Object.keys(SCRYDEX_CONFIG.games);
}

// Helper function to get game config
export function getGameConfig(game) {
  return SCRYDEX_CONFIG.games[game] || null;
}
