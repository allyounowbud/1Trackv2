import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ChevronDown } from 'lucide-react';
import { getGameService, hasGameService } from '../../services/games/gameServiceFactory';
import { getGameById } from '../../config/gamesConfig';
import { useGlobalHeader } from '../../contexts/GlobalHeaderContext';

const GlobalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, selectedGame, setSelectedGame, onSearch } = useGlobalHeader();
  
  // Available games with icons
  const games = [
    {
      id: 'all',
      name: 'All',
      icon: 'https://scrydex.com/assets/tcgs/icon_all-aae9eef01e74aeab7fb5fef2c48004727400df0636e016ffcfa9741e012ed8ac.png',
      description: 'Browse all trading card games',
      color: 'from-gray-500 to-gray-600'
    },
    {
      id: 'pokemon',
      name: 'Pokémon',
      logo: 'https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_pokemon-386fb418d8f003048ea382cbe3f9a5c1518c3b3bad005e7891c2eb0798278d60.png',
      description: 'The world\'s most popular trading card game',
      color: 'from-yellow-500 to-blue-600',
      enabled: true
    },
    {
      id: 'lorcana',
      name: 'Disney Lorcana',
      logo: 'https://scrydex.com/assets/tcgs/logo_lorcana-7127a308645f2a2d4eb4e9b38f1928a157960ed9ae4cab839952de98c902816e.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_lorcana-f68779c6b7609ad758b3126d347ea1e2cf8bb3944edb52a2d620b73f2ee8a300.png',
      description: 'Disney\'s magical trading card game',
      color: 'from-purple-500 to-pink-600',
      enabled: false
    },
    {
      id: 'magic',
      name: 'Magic: The Gathering',
      logo: 'https://scrydex.com/assets/tcgs/logo_mtg-a99225ad3a6ecb7c7fdc9c579a187289aee78c3eeb577f92086dcc8a57f1738e.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_magicthegathering-e2151698e87443ceccb0ad4b6c98dac19d1b244cce24bac76f52c506046d5833.png',
      description: 'The original trading card game',
      color: 'from-red-500 to-orange-600',
      enabled: false
    },
    {
      id: 'gundam',
      name: 'Gundam Card Game',
      logo: 'https://scrydex.com/assets/tcgs/logo_gundam-2e130fb7d7d5b295a6377c6994657d0b0041fdf13158e72709f7a21bb01e9a2a.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_gundam-72d1c7c2890e7862b3c52b4d8851825dea709a8f279d70dd19c12aaea1e4462c.png',
      description: 'Mobile Suit Gundam trading cards',
      color: 'from-blue-500 to-cyan-600',
      enabled: false
    },
    {
      id: 'other',
      name: 'Other',
      logo: 'https://i.ibb.co/vvBYXsQH/other.png',
      icon: 'https://i.ibb.co/FLvRvfGM/other-icon.png',
      description: 'Manually added products',
      color: 'from-purple-400 to-purple-600',
      enabled: true
    },
    {
      id: 'coming-soon',
      name: 'More Coming Soon',
      logo: null,
      icon: null,
      description: 'Additional trading card games',
      color: 'from-gray-400 to-gray-500',
      badge: 'SOON',
      enabled: false
    }
  ];

  // State
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  
  // Initialize selected game if not set
  useEffect(() => {
    if (!selectedGame) {
      setSelectedGame(games[0]);
    }
  }, [selectedGame, setSelectedGame]);

  // Handle game selection
  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setShowGameDropdown(false);
    
    if (game.badge === 'SOON') {
      // Show coming soon message
      return;
    }
    
    if (game.id === 'all') {
      navigate('/search');
    } else if (game.id === 'pokemon') {
      navigate('/pokemon');
    } else if (game.id === 'other') {
      navigate('/search?game=other');
    } else if (hasGameService(game.id)) {
      navigate(`/${game.id}`);
    } else {
      // Show coming soon message
      console.log(`${game.name} is coming soon!`);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else if (searchQuery.trim()) {
      // Default behavior: navigate to search page
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Render game icon
  const renderGameIcon = (iconUrl, className = "w-4 h-4") => {
    if (!iconUrl) {
      return (
        <div className={`${className} rounded-full bg-gray-600 flex items-center justify-center`}>
          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
        </div>
      );
    }
    
    return (
      <img 
        src={iconUrl} 
        alt="Game" 
        className={`${className} object-contain`}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  };

  // Get search placeholder based on selected game
  const getSearchPlaceholder = () => {
    switch (selectedGame?.id) {
      case 'all':
        return 'Search cards, sealed products, and custom items...';
      case 'pokemon':
        return 'Search Pokémon cards, sealed products, and custom items...';
      case 'lorcana':
        return 'Search Lorcana cards, sealed products, and custom items...';
      case 'magic':
        return 'Search Magic cards, sealed products, and custom items...';
      case 'gundam':
        return 'Search for Gundam...';
      case 'other':
        return 'Search everything else...';
      case 'coming-soon':
        return 'More games coming soon...';
      default:
        return 'Search cards...';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-300">
      <div className="w-full pl-4 pr-0 h-[50px] flex items-center gap-1">
        {/* Game Selector - Outside search bar */}
        <div className="relative game-dropdown">
          <button
            type="button"
            onClick={() => setShowGameDropdown(!showGameDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-transparent rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
          >
            {renderGameIcon(selectedGame?.icon, "w-4 h-4")}
            <ChevronDown className="text-gray-400" size={14} />
          </button>
          
          {/* Game Dropdown */}
          {showGameDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-2">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameSelect(game)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      selectedGame?.id === game.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {renderGameIcon(game.icon, "w-5 h-5")}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{game.name}</div>
                      <div className="text-xs text-gray-400">{game.description}</div>
                    </div>
                    {game.badge && (
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {game.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center flex-1 h-full bg-gray-950 rounded-lg mr-0">
          <div className="flex-1 relative h-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="w-full h-full px-4 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="p-3 text-gray-400 hover:text-white transition-colors"
          >
            <Search size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GlobalHeader;
