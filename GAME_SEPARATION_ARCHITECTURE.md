# Game Separation Architecture

## Overview

The application has been refactored to separate different Trading Card Games (TCGs) into their own pages, services, and code modules. This improves performance, maintainability, and allows for game-specific features and optimizations.

## Architecture Benefits

### ✅ Performance
- **Code Splitting**: Each game loads only its required code
- **Reduced Bundle Size**: Unused game logic isn't loaded
- **Faster Navigation**: Game-specific pages are lighter and faster

### ✅ Maintainability
- **Separation of Concerns**: Each TCG has its own isolated code
- **Easier Updates**: Changes to one game don't affect others
- **Clear Organization**: Game-specific logic is grouped together

### ✅ Scalability
- **Easy to Add Games**: New TCGs follow the same pattern
- **Game-Specific Features**: Each game can have unique functionality
- **Independent Development**: Teams can work on different games simultaneously

## Directory Structure

```
src/
├── config/
│   └── gamesConfig.js              # Central configuration for all TCGs
│
├── services/
│   ├── games/
│   │   ├── baseGameService.js      # Abstract base class
│   │   ├── pokemonGameService.js   # Pokemon-specific service
│   │   ├── magicGameService.js     # Magic (coming soon)
│   │   ├── lorcanaGameService.js   # Lorcana (coming soon)
│   │   └── gameServiceFactory.js   # Returns appropriate service
│   │
│   ├── simpleSearchService.js      # Cross-game search
│   ├── tcgcsvService.js            # TCGCSV integration
│   └── ...                         # Other shared services
│
├── pages/
│   ├── Games.jsx                   # Game selector landing page
│   ├── PokemonPage.jsx             # Pokemon-specific page
│   ├── MagicPage.jsx               # Magic (coming soon)
│   ├── LorcanaPage.jsx             # Lorcana (coming soon)
│   ├── SearchApi.jsx               # Legacy search (still available)
│   └── ...
│
└── components/
    └── layout/
        ├── BottomNavigation.jsx    # Mobile nav (updated)
        └── DesktopSidebar.jsx      # Desktop nav (updated)
```

## Core Components

### 1. Games Configuration (`src/config/gamesConfig.js`)

Central configuration file defining all supported TCGs.

**Features**:
- Game metadata (name, logo, icon, description)
- Database table mappings
- Feature flags (singles, sealed, graded, pricing, trends)
- TCGplayer/TCGCSV category IDs
- Enable/disable status

**Example**:
```javascript
export const GAMES = {
  POKEMON: {
    id: 'pokemon',
    name: 'Pokémon',
    slug: 'pokemon',
    logo: '...',
    icon: '...',
    enabled: true,
    categoryId: 3,
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
  }
  // ... other games
};
```

**Helper Functions**:
- `getEnabledGames()` - Get all enabled games
- `getGameById(id)` - Get game by ID
- `getGameBySlug(slug)` - Get game by URL slug
- `gameHasFeature(gameId, feature)` - Check if game supports feature
- `getGameDatabases(gameId)` - Get database tables for game

### 2. Base Game Service (`src/services/games/baseGameService.js`)

Abstract base class that all game services extend.

**Core Methods**:
- `getConfig()` - Get game configuration
- `hasFeature(feature)` - Check feature support
- `getDatabases()` - Get database table names
- `queryDatabase(tableName, options)` - Generic database query helper
- Cache management (`getCached`, `setCache`, `clearCache`)

**Abstract Methods** (must be implemented by each game):
- `searchCards(query, options)` - Search for cards
- `getCardById(id)` - Get specific card
- `getExpansions(options)` - Get all sets/expansions
- `getCardsByExpansion(expansionId, options)` - Get cards from a set
- `getPricing(cardId)` - Get pricing data
- `searchSealedProducts(query, options)` - Search sealed products (optional)

### 3. Pokemon Game Service (`src/services/games/pokemonGameService.js`)

Pokemon-specific implementation extending `BaseGameService`.

**Implemented Features**:
- ✅ Card search with filters (rarity, type, artist, etc.)
- ✅ Expansion/set browsing
- ✅ Cards by expansion with sorting
- ✅ Pricing data (raw and graded)
- ✅ Sealed products search
- ✅ Data formatting for UI
- ✅ Available rarities and types

**Special Methods**:
- `formatCard(card)` - Format Pokemon card for UI
- `formatSealedProduct(product)` - Format sealed product for UI
- `getAvailableRarities()` - Get all Pokemon rarities
- `getAvailableTypes()` - Get all Pokemon types

**Caching**:
- 5-minute in-memory cache for all queries
- LRU eviction when cache is full
- Automatic cache key generation

### 4. Game Service Factory (`src/services/games/gameServiceFactory.js`)

Returns the appropriate game service based on game ID.

**Usage**:
```javascript
import { getGameService } from '../services/games/gameServiceFactory';

const gameService = getGameService('pokemon');
const results = await gameService.searchCards('Pikachu');
```

**Methods**:
- `getGameService(gameId)` - Returns game-specific service instance
- `hasGameService(gameId)` - Check if service exists for game

### 5. Games Landing Page (`src/pages/Games.jsx`)

Beautiful landing page for selecting which TCG to browse.

**Features**:
- Grid display of all available games
- Game logos, icons, and descriptions
- Feature badges (Singles, Sealed, Graded, Pricing)
- Enabled/disabled status with "Coming Soon" for disabled games
- Smooth hover animations
- Responsive design (mobile/tablet/desktop)

**Navigation**:
- Clicking an enabled game navigates to `/{game-slug}`
- Example: Pokemon → `/pokemon`

### 6. Pokemon Page (`src/pages/PokemonPage.jsx`)

Dedicated page for Pokemon TCG.

**Views**:
1. **Expansions View** - Grid of all Pokemon sets
2. **Expansion Detail** - Cards from a specific set
3. **Search Results** - Cards matching search query

**Features**:
- Search bar in header
- Set browsing with set logos
- Card grid with images and pricing
- Pagination support
- Modal integration for card preview and adding to collection
- Back navigation
- URL state management

**Routes**:
- `/pokemon` - Expansions view
- `/pokemon/expansions/:expansionId` - Specific set
- `/pokemon?q=searchQuery` - Search results

## Routing

### New Routes

```javascript
// Landing page for game selection
<Route path="/games" element={<Games />} />

// Pokemon-specific routes
<Route path="/pokemon" element={<PokemonPage />} />
<Route path="/pokemon/expansions/:expansionId" element={<PokemonPage />} />

// Future game routes (when implemented)
<Route path="/magic" element={<MagicPage />} />
<Route path="/lorcana" element={<LorcanaPage />} />
<Route path="/gundam" element={<GundamPage />} />
```

### Legacy Routes (Still Available)

```javascript
// Legacy search page (supports all games in one page)
<Route path="/search" element={<SearchApi />} />
<Route path="/search/:game" element={<SearchApi />} />
<Route path="/search/:game/expansions/:expansionId" element={<SearchApi />} />
```

## Navigation Updates

### Bottom Navigation (Mobile)
Added "Games" menu item between "Collection" and "Search".

**Menu Order**:
1. Collection
2. **Games** (NEW)
3. Search
4. Shipments
5. Settings

### Desktop Sidebar
Added "Games" menu item after "Collection".

**Menu Order**:
1. Collection
2. **Games** (NEW)
3. Search
4. Analytics
5. Orders
6. Settings

## Adding a New Game

To add support for a new TCG, follow these steps:

### Step 1: Add to Games Config

```javascript
// src/config/gamesConfig.js
export const GAMES = {
  // ... existing games
  
  YOUR_GAME: {
    id: 'your-game',
    name: 'Your Game TCG',
    slug: 'your-game',
    logo: 'https://...',
    icon: 'https://...',
    description: 'Description of your game',
    color: 'from-color-500 to-color-600',
    enabled: true, // Set to false until ready
    categoryId: 123, // TCGplayer category ID
    databases: {
      cards: 'your_game_cards',
      expansions: 'your_game_sets',
      sealed: 'your_game_sealed'
    },
    features: {
      singles: true,
      sealed: true,
      graded: false,
      pricing: true,
      trends: false,
      expansions: true
    }
  }
};
```

### Step 2: Create Game Service

```javascript
// src/services/games/yourGameService.js
import BaseGameService from './baseGameService';
import { GAMES } from '../../config/gamesConfig';

class YourGameService extends BaseGameService {
  constructor() {
    super(GAMES.YOUR_GAME);
  }

  async searchCards(query, options = {}) {
    // Implement search logic
    const databases = this.getDatabases();
    const result = await this.queryDatabase(databases.cards, {
      search: query,
      searchFields: ['name'],
      ...options
    });
    
    result.data = result.data.map(card => this.formatCard(card));
    return result;
  }

  async getCardById(id) {
    // Implement get card logic
  }

  async getExpansions(options = {}) {
    // Implement get expansions logic
  }

  async getCardsByExpansion(expansionId, options = {}) {
    // Implement get cards by expansion logic
  }

  async getPricing(cardId) {
    // Implement get pricing logic
  }

  formatCard(card) {
    // Format card data for UI
    return {
      id: card.id,
      name: card.name,
      image_url: card.image,
      // ... other fields
      gameId: 'your-game'
    };
  }
}

const yourGameService = new YourGameService();
export default yourGameService;
```

### Step 3: Update Service Factory

```javascript
// src/services/games/gameServiceFactory.js
import yourGameService from './yourGameService';

export function getGameService(gameId) {
  switch (gameId) {
    case GAMES.POKEMON.id:
      return pokemonGameService;
    
    case GAMES.YOUR_GAME.id:
      return yourGameService;
    
    default:
      console.warn(`⚠️ No service found for game: ${gameId}`);
      return pokemonGameService;
  }
}

export function hasGameService(gameId) {
  return [GAMES.POKEMON.id, GAMES.YOUR_GAME.id].includes(gameId);
}
```

### Step 4: Create Page Component

```javascript
// src/pages/YourGamePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import yourGameService from '../services/games/yourGameService';
import { GAMES } from '../config/gamesConfig';

const YourGamePage = () => {
  const navigate = useNavigate();
  const { expansionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const gameConfig = GAMES.YOUR_GAME;

  // Implement your UI and logic
  
  return (
    <div>
      <h1>{gameConfig.name}</h1>
      {/* Your UI components */}
    </div>
  );
};

export default YourGamePage;
```

### Step 5: Add Routes

```javascript
// src/App.jsx
import YourGamePage from './pages/YourGamePage';

// In routes:
<Route path="/your-game" element={<YourGamePage />} />
<Route path="/your-game/expansions/:expansionId" element={<YourGamePage />} />
```

### Step 6: Enable in Config

Once everything is ready, enable the game:

```javascript
// src/config/gamesConfig.js
YOUR_GAME: {
  // ... config
  enabled: true, // Change from false to true
}
```

## Migration Path

The architecture supports both old and new approaches:

### Phase 1: Coexistence (Current)
- ✅ New game-specific pages are available
- ✅ Legacy `/search` page still works
- ✅ Users can use either approach
- ✅ Gradual migration possible

### Phase 2: Transition (Future)
- Encourage users to use game-specific pages
- Add redirects from `/search/:game` to `/:game`
- Update deep links and bookmarks

### Phase 3: Cleanup (Future)
- Deprecate legacy SearchApi.jsx
- Remove old routing
- Complete migration to separated architecture

## Database Considerations

Each game should have its own set of database tables:

### Pokemon (Current)
- `pokemon_cards`
- `pokemon_expansions`
- `sealed_products` (shared or Pokemon-specific)

### Magic (Future)
- `magic_cards`
- `magic_sets`
- `magic_sealed`

### Lorcana (Future)
- `lorcana_cards`
- `lorcana_sets`
- `lorcana_sealed`

### Shared Tables
- `users`
- `items` (custom items)
- `orders`
- `shipments`
- `analytics`

## Performance Optimizations

### Code Splitting
Each game page can be lazy-loaded:

```javascript
const PokemonPage = React.lazy(() => import('./pages/PokemonPage'));
const MagicPage = React.lazy(() => import('./pages/MagicPage'));

// In routes:
<Route 
  path="/pokemon" 
  element={
    <React.Suspense fallback={<LoadingScreen />}>
      <PokemonPage />
    </React.Suspense>
  } 
/>
```

### Service-Level Caching
- Each game service has its own cache
- 5-minute TTL for frequently accessed data
- LRU eviction prevents memory issues

### Database Query Optimization
- Game-specific tables reduce query complexity
- Proper indexing on frequently queried fields
- Pagination reduces data transfer

## Testing

### Testing a Game Service

```javascript
import pokemonGameService from '../services/games/pokemonGameService';

// Test search
const results = await pokemonGameService.searchCards('Pikachu', {
  page: 1,
  pageSize: 10
});
console.log(results);

// Test expansions
const expansions = await pokemonGameService.getExpansions();
console.log(expansions);

// Test specific card
const card = await pokemonGameService.getCardById('card-id-123');
console.log(card);
```

### Testing Feature Flags

```javascript
import { gameHasFeature } from '../config/gamesConfig';

if (gameHasFeature('pokemon', 'graded')) {
  // Show graded card options
}

if (gameHasFeature('magic', 'pricing')) {
  // Fetch and display pricing
}
```

## Future Enhancements

### Planned Features
1. **Game-Specific Analytics** - Track usage per game
2. **Game-Specific Settings** - Different preferences per TCG
3. **Cross-Game Search** - Search across all games simultaneously
4. **Game Comparison** - Compare cards from different games
5. **Game-Specific Themes** - Custom colors/styling per TCG

### Potential Games to Add
- ✅ **Pokemon** (Complete)
- 🔄 **Magic: The Gathering** (Planned)
- 🔄 **Disney Lorcana** (Planned)
- 🔄 **Gundam Card Game** (Planned)
- 🔄 **Yu-Gi-Oh!** (Future)
- 🔄 **Flesh and Blood** (Future)
- 🔄 **One Piece Card Game** (Future)

## Troubleshooting

### Game Not Showing in Menu
Check `enabled: true` in `src/config/gamesConfig.js`

### Service Not Found Error
Make sure service is registered in `gameServiceFactory.js`

### Database Query Failing
Verify table names in games config match actual database tables

### Routing Not Working
Check route is added in `src/App.jsx`

---

**Last Updated**: October 12, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready (Pokemon), 🔄 Other Games Coming Soon

