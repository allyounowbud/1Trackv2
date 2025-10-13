/**
 * Game Service Factory
 * Returns the appropriate game service based on game ID
 */

import pokemonGameService from './pokemonGameService';
import { GAMES } from '../../config/gamesConfig';

// Import other game services as they're implemented
// import magicGameService from './magicGameService';
// import lorcanaGameService from './lorcanaGameService';

/**
 * Get game service for a specific TCG
 * @param {string} gameId - Game ID from gamesConfig
 * @returns {BaseGameService} Game-specific service instance
 */
export function getGameService(gameId) {
  switch (gameId) {
    case GAMES.POKEMON.id:
      return pokemonGameService;
    
    // Add other games as they're implemented
    // case GAMES.MAGIC.id:
    //   return magicGameService;
    
    // case GAMES.LORCANA.id:
    //   return lorcanaGameService;
    
    default:
      console.warn(`⚠️ No service found for game: ${gameId}, using Pokemon as fallback`);
      return pokemonGameService;
  }
}

/**
 * Check if game service is available
 * @param {string} gameId - Game ID
 * @returns {boolean} True if service exists
 */
export function hasGameService(gameId) {
  return gameId === GAMES.POKEMON.id;
  // Add more as implemented:
  // return [GAMES.POKEMON.id, GAMES.MAGIC.id, GAMES.LORCANA.id].includes(gameId);
}

export default {
  getGameService,
  hasGameService
};

