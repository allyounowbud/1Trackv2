/**
 * Games Configuration
 * Central configuration for all supported trading card games
 */

export const GAMES = {
  POKEMON: {
    id: 'pokemon',
    name: 'Pokémon',
    slug: 'pokemon',
    logo: 'https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png',
    icon: 'https://scrydex.com/assets/tcgs/icon_pokemon-386fb418d8f003048ea382cbe3f9a5c1518c3b3bad005e7891c2eb0798278d60.png',
    description: 'The world\'s most popular trading card game',
    color: 'from-yellow-500 to-blue-600',
    enabled: true,
    categoryId: 3, // TCGplayer/TCGCSV category ID
    databases: {
      cards: 'pokemon_cards',
      expansions: 'pokemon_expansions',
      sealed: 'sealed_products'
    },
    features: {
      singles: true,
      sealed: true,
      graded: true,
      pricing: true,
      trends: true,
      expansions: true
    }
  },
  
  MAGIC: {
    id: 'magic',
    name: 'Magic: The Gathering',
    slug: 'magic',
    logo: 'https://scrydex.com/assets/tcgs/logo_mtg-a99225ad3a6ecb7c7fdc9c579a187289aee78c3eeb577f92086dcc8a57f1738e.png',
    icon: 'https://scrydex.com/assets/tcgs/icon_magicthegathering-e2151698e87443ceccb0ad4b6c98dac19d1b244cce24bac76f52c506046d5833.png',
    description: 'The original trading card game',
    color: 'from-red-500 to-orange-600',
    enabled: false, // Coming soon
    categoryId: 1, // TCGplayer category ID for Magic
    databases: {
      cards: 'magic_cards',
      expansions: 'magic_sets',
      sealed: 'magic_sealed'
    },
    features: {
      singles: true,
      sealed: true,
      graded: false,
      pricing: true,
      trends: true,
      expansions: true
    }
  },
  
  LORCANA: {
    id: 'lorcana',
    name: 'Disney Lorcana',
    slug: 'lorcana',
    logo: 'https://scrydex.com/assets/tcgs/logo_lorcana-7127a308645f2a2d4eb4e9b38f1928a157960ed9ae4cab839952de98c902816e.png',
    icon: 'https://scrydex.com/assets/tcgs/icon_lorcana-f68779c6b7609ad758b3126d347ea1e2cf8bb3944edb52a2d620b73f2ee8a300.png',
    description: 'Disney\'s magical trading card game',
    color: 'from-purple-500 to-pink-600',
    enabled: false, // Coming soon
    categoryId: 26, // TCGplayer category ID for Lorcana
    databases: {
      cards: 'lorcana_cards',
      expansions: 'lorcana_sets',
      sealed: 'lorcana_sealed'
    },
    features: {
      singles: true,
      sealed: true,
      graded: false,
      pricing: true,
      trends: false,
      expansions: true
    }
  },
  
  GUNDAM: {
    id: 'gundam',
    name: 'Gundam Card Game',
    slug: 'gundam',
    logo: 'https://scrydex.com/assets/tcgs/logo_gundam-2e130fb7d7d5b295a6377c6994657d0b0041fdf13158e72709f7a21bb01e9a2a.png',
    icon: 'https://scrydex.com/assets/tcgs/icon_gundam-72d1c7c2890e7862b3c52b4d8851825dea709a8f279d70dd19c12aaea1e4462c.png',
    description: 'Mobile Suit Gundam trading cards',
    color: 'from-blue-500 to-cyan-600',
    enabled: false, // Coming soon
    categoryId: null, // TBD
    databases: {
      cards: 'gundam_cards',
      expansions: 'gundam_sets',
      sealed: 'gundam_sealed'
    },
    features: {
      singles: true,
      sealed: true,
      graded: false,
      pricing: false,
      trends: false,
      expansions: true
    }
  },

  OTHER: {
    id: 'other',
    name: 'Other',
    slug: 'other',
    logo: 'https://i.ibb.co/vvBYXsQH/other.png',
    icon: 'https://i.ibb.co/FLvRvfGM/other-icon.png',
    description: 'Manually added products',
    color: 'from-purple-400 to-purple-600',
    enabled: true,
    categoryId: null,
    databases: {
      items: 'items' // Custom items table
    },
    features: {
      singles: false,
      sealed: false,
      graded: false,
      pricing: false,
      trends: false,
      expansions: false,
      custom: true
    }
  }
};

/**
 * Get all enabled games
 */
export function getEnabledGames() {
  return Object.values(GAMES).filter(game => game.enabled);
}

/**
 * Get game by ID
 */
export function getGameById(id) {
  return Object.values(GAMES).find(game => game.id === id);
}

/**
 * Get game by slug
 */
export function getGameBySlug(slug) {
  return Object.values(GAMES).find(game => game.slug === slug);
}

/**
 * Check if game has feature
 */
export function gameHasFeature(gameId, feature) {
  const game = getGameById(gameId);
  return game?.features?.[feature] === true;
}

/**
 * Get database table names for a game
 */
export function getGameDatabases(gameId) {
  const game = getGameById(gameId);
  return game?.databases || {};
}

// Export games array for UI components
export const gamesArray = Object.values(GAMES);

// Export enabled games array
export const enabledGamesArray = getEnabledGames();

