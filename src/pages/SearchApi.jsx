import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Filter, Loader2, Star, X, ChevronDown, Plus, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import expansionDataService from '../services/expansionDataService';
import simpleSearchService from '../services/simpleSearchService';
import searchCacheService from '../services/searchCacheService';
import { getGameService, hasGameService } from '../services/games/gameServiceFactory';
import { getGameById } from '../config/gamesConfig';
import SafeImage from '../components/SafeImage';
import CardPreviewModal from '../components/CardPreviewModal';
import CustomItemModal from '../components/CustomItemModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import CartBottomMenu from '../components/CartBottomMenu';
import { createBulkOrders } from '../utils/orderNumbering';
import { supabase } from '../lib/supabaseClient';
import { useModal } from '../contexts/ModalContext';
import { useCart } from '../contexts/CartContext';
import { useGlobalHeader } from '../contexts/GlobalHeaderContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { getItemTypeClassification, getGradeFromCardType, getCompanyFromCardType } from '../utils/itemTypeUtils';

const SearchApi = () => {
  const navigate = useNavigate();
  const { game: gameParam, expansionId: expansionParam } = useParams();
  const location = useLocation();
  const { openModal, closeModal } = useModal();
  const { isCartMenuOpen, isMultiSelectMode: contextMultiSelectMode, openCartMenu, closeCartMenu: contextCloseCartMenu, enterMultiSelectMode, exitMultiSelectMode: contextExitMultiSelectMode } = useCart();
  const { setOnSearch, setSelectedGame: setGlobalSelectedGame, setSearchQuery: setGlobalSearchQuery } = useGlobalHeader();
  const queryClient = useQueryClient();
  
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

  // Navigation state
  const [currentView, setCurrentView] = useState('games'); // 'games', 'expansions', 'search', 'manual'
  const [selectedGame, setSelectedGame] = useState(games[0]); // Default to first game (Pokémon)
  
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Modal state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false);
  const [selectedCardForCollection, setSelectedCardForCollection] = useState(null);
  
  // Cart state for multi-item orders
  const [cartItems, setCartItems] = useState([]);
  const [isCartMode, setIsCartMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [holdTimeout, setHoldTimeout] = useState(null);
  const [justCompletedHoldSelect, setJustCompletedHoldSelect] = useState(false);
  
  // Success popup states for multi-order creation
  const [showMultiOrderProcessing, setShowMultiOrderProcessing] = useState(false);
  const [showMultiOrderSuccess, setShowMultiOrderSuccess] = useState(false);
  const [multiOrderSuccessData, setMultiOrderSuccessData] = useState(null);
  
  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState([]);
  const [isLoadingCustomItems, setIsLoadingCustomItems] = useState(false);
  const [selectedCustomItem, setSelectedCustomItem] = useState(null);
  const [showCustomItemMenu, setShowCustomItemMenu] = useState(false);
  
  // Bulk selection for custom items
  const [selectedCustomItems, setSelectedCustomItems] = useState(new Set());
  const [isCustomSelectionMode, setIsCustomSelectionMode] = useState(false);
  
  // Filter sidebar state
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Price sorting state for sealed products
  const [priceSortOrder, setPriceSortOrder] = useState('asc'); // 'asc' for low to high, 'desc' for high to low
  
  // Removed filterUpdateTrigger - was causing unnecessary re-renders
  
  // Filter categories state
  const [expandedFilters, setExpandedFilters] = useState({});
  const [filterValues, setFilterValues] = useState({
    supertype: [],
    types: [],
    subtypes: [],
    rarity: [],
    artists: [],
    weaknesses: [],
    resistances: []
  });
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showCustomBulkMenu, setShowCustomBulkMenu] = useState(false);
  
  // Active filters state for pills
  const [activeFilters, setActiveFilters] = useState([]);
  
  // UI state
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  
  // Expansions state
  const [expansions, setExpansions] = useState([]);
  const [selectedExpansion, setSelectedExpansion] = useState(null);
  const [expansionViewMode, setExpansionViewMode] = useState('singles'); // 'singles' or 'sealed'

  // Language filter state
  const [languageFilter, setLanguageFilter] = useState('english'); // 'english', 'japanese'
  
  // Series filter state
  const [selectedSeries, setSelectedSeries] = useState([]); // Array of selected series
  const [seriesSearchQuery, setSeriesSearchQuery] = useState(''); // Search query for series filter
  const [isSeriesFilterOpen, setIsSeriesFilterOpen] = useState(false); // Mobile filter drawer state

  // Refs for infinite scroll and search debounce
  const loadingRef = useRef(null);
  const observerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const filterTimeoutRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  // Helper function to render game icon
  const renderGameIcon = (iconUrl, className = "w-4 h-4") => {
    // If it's a URL, render as image
    if (iconUrl && iconUrl.startsWith('http')) {
      return (
        <img 
          src={iconUrl} 
          alt="Game icon" 
          className={className}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    // Fallback for non-URL icons (legacy support)
    switch (iconUrl) {
      case 'pokeball':
        return (
          <div className={`${className} rounded-full bg-red-500 flex items-center justify-center`}>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        );
      case 'mana':
        return (
          <div className={`${className} rounded-full bg-red-500 flex items-center justify-center`}>
            <div className="w-2 h-2 bg-white rounded-sm"></div>
          </div>
        );
      case 'compass':
        return (
          <div className={`${className} rounded-full bg-yellow-500 flex items-center justify-center`}>
            <div className="w-2 h-2 bg-white transform rotate-45"></div>
          </div>
        );
      case 'robot':
        return (
          <div className={`${className} rounded-full bg-gray-500 flex items-center justify-center`}>
            <div className="w-2 h-2 bg-white rounded-sm"></div>
          </div>
        );
      default:
        return (
          <div className={`${className} rounded-full bg-gray-500 flex items-center justify-center`}>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        );
    }
  };

  // Helper function to get search placeholder based on selected game
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



  // Format cards from API response - Keep variants grouped together
  const formatCardsWithVariants = (cards) => {
    const formattedCards = [];
    
    cards.forEach(card => {
      // Get image URL from database fields
      const imageUrl = card.image_large || card.image_medium || card.image_small || null;
      
      // Use card name with card number
      let displayName = card.name;
      if (card.number) {
        displayName = `${card.name} #${card.number}`;
      }
      
      // Get pricing data from database fields
      let rawPrice = null;
      let gradedPrice = null;
      
      if (card.raw_market) {
        rawPrice = {
          type: 'raw',
          market: parseFloat(card.raw_market).toFixed(2),
          low: card.raw_low ? parseFloat(card.raw_low).toFixed(2) : null,
          condition: card.raw_condition || 'NM',
          trends: {
            days_7: { percent_change: card.raw_trend_7d_percent },
            days_30: { percent_change: card.raw_trend_30d_percent },
            days_90: { percent_change: card.raw_trend_90d_percent },
            days_180: { percent_change: card.raw_trend_180d_percent }
          }
        };
      }
      
      if (card.graded_market) {
        gradedPrice = {
          type: 'graded',
          market: parseFloat(card.graded_market).toFixed(2),
          low: card.graded_low ? parseFloat(card.graded_low).toFixed(2) : null,
          mid: card.graded_mid ? parseFloat(card.graded_mid).toFixed(2) : null,
          high: card.graded_high ? parseFloat(card.graded_high).toFixed(2) : null,
          grade: card.graded_grade || '10',
          company: card.graded_company || 'PSA',
          trends: {
            days_7: { percent_change: card.graded_trend_7d_percent },
            days_30: { percent_change: card.graded_trend_30d_percent },
            days_90: { percent_change: card.graded_trend_90d_percent },
            days_180: { percent_change: card.graded_trend_180d_percent }
          }
        };
      }
      
      // Create a single card entry with all variants grouped together
      formattedCards.push({
        id: card.id,
        name: displayName,
        supertype: card.supertype,
        types: card.types || [],
        subtypes: card.subtypes || [],
        hp: card.hp,
        number: card.number,
        rarity: card.rarity || 'No Rarity',
        expansion_id: card.expansion_id || null,
        expansion_name: card.expansion_name || null,
        image_url: imageUrl,
        image_url_large: imageUrl,
        variants: [{
          name: 'default',
          prices: [rawPrice, gradedPrice].filter(Boolean)
        }],
        // Pricing data from first variant
        raw_price: rawPrice?.market || null,
        raw_low: rawPrice?.low || null,
        raw_condition: rawPrice?.condition || null,
        graded_price: gradedPrice?.market || null,
        graded_grade: gradedPrice?.grade || null,
        graded_company: gradedPrice?.company || null,
        graded_low: gradedPrice?.low || null,
        graded_mid: gradedPrice?.mid || null,
        graded_high: gradedPrice?.high || null,
        // Store full pricing objects for detailed display
        raw_pricing: rawPrice,
        graded_pricing: gradedPrice
      });
    });
    
    return formattedCards;
  };

  // Enhance search results with TCGGo images for better image quality
  const enhanceResultsWithTcgGoImages = async (results) => {
    // Skip TCGGo image enhancement for performance - return results immediately
    return results;
    
    const enhancedResults = await Promise.all(results.map(async (card, index) => {
      
      // Only enhance PriceCharting results (sealed products) with TCGGo images
      if (card.source !== 'pricecharting') {
        return card;
      }

      // Skip if already has a good image from TCGGo
      if (card.image_url?.includes('tcggo.com')) {
        return card;
      }

      try {
        // Try to find a better image from TCGGo for PriceCharting items
        const setName = card.set_name || card.expansion_name;
        const tcgGoImage = await tcggoImageService.findBestImage(card.name, selectedGame?.id || 'pokemon', setName);
        
        if (tcgGoImage && tcgGoImage.image_url) {
          return {
            ...card,
            image_url: tcgGoImage.image_url,
            image_url_large: tcgGoImage.image_url_large,
            image_source: 'tcggo'
          };
        } else {
        }
      } catch (error) {
      }

      return card;
    }));

    return enhancedResults;
  };

  // Fetch custom items from database
  const fetchCustomItems = async () => {
    setIsLoadingCustomItems(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('source', 'manual')
        .order('created_at', { ascending: false });

      if (error) {
        return;
      }

      setCustomItems(data || []);
    } catch (error) {
      console.error('Error fetching custom items:', error);
    } finally {
      setIsLoadingCustomItems(false);
    }
  };

  // Sync URL params with app state
  useEffect(() => {
    const syncUrlWithState = async () => {
      if (!servicesInitialized) return;

      // If we have a game param, set the selected game
      if (gameParam && gameParam !== 'other') {
        const game = games.find(g => g.id === gameParam);
        if (game && game.id !== selectedGame?.id) {
          setSelectedGame(game);
          
          // If we have an expansion param, find and select it
          if (expansionParam) {
            setCurrentView('search');
            const expansion = expansions.find(e => e.id === expansionParam);
            if (expansion && expansion.id !== selectedExpansion?.id) {
              setSelectedExpansion(expansion);
              await performExpansionSearch(expansion.id, 1, false, null, true, filterValues);
            }
          } else {
            setCurrentView('expansions');
          }
        }
      } else if (!gameParam) {
        // No params - show games view
        if (currentView !== 'games' && currentView !== 'manual') {
          setCurrentView('games');
        }
      }
    };

    syncUrlWithState();
  }, [gameParam, expansionParam, servicesInitialized]);
  
  // Initialize component - initialize services and load expansions on mount
  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        // Initialize services
        await expansionDataService.initialize();
        await simpleSearchService.initialize();
        
        await loadExpansions();
        
        // Mark services as initialized
        setServicesInitialized(true);
      } catch (error) {
        console.error('❌ Service initialization error:', error);
        setError('Failed to connect to card database. Please try again later.');
      }
    };
    
    initializeAndLoad();
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);


  // Load custom items when manual view is accessed
  useEffect(() => {
    if (currentView === 'manual') {
      fetchCustomItems();
    }
  }, [currentView]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showGameDropdown && !event.target.closest('.game-dropdown')) {
        setShowGameDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGameDropdown]);

  // Load expansions when a game is selected
  useEffect(() => {
    if (currentView === 'expansions' && selectedGame) {
      loadExpansions();
    }
  }, [currentView, selectedGame]);

  // Load expansions
  const loadExpansions = async () => {
    try {
      // Fetch expansions using simplified service
      const allExpansions = await expansionDataService.getExpansions({
        sortBy: 'release_date',
        sortOrder: 'desc'
      });
      
      setExpansions(allExpansions);
    } catch (error) {
      console.error('Failed to load expansions:', error);
      setError('Failed to load expansions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique series from expansions (only those with counts > 0)
  const getUniqueSeries = () => {
    const seriesCounts = getSeriesCounts();
    return Object.keys(seriesCounts).sort();
  };

  // Get filtered expansions based on current filters
  const getFilteredExpansions = () => {
    return expansions.filter(expansion => {
      // Language filter
      if (languageFilter === 'english' && expansion.language_code !== 'EN') return false;
      if (languageFilter === 'japanese' && expansion.language_code !== 'JA') return false;
      
      // Series filter
      if (selectedSeries.length > 0 && !selectedSeries.includes(expansion.series)) return false;
      
      return true;
    });
  };

  // Get series count for each series
  const getSeriesCounts = () => {
    const counts = {};
    const filteredExpansions = expansions.filter(expansion => {
      // Apply language filter for counts
      if (languageFilter === 'english' && expansion.language_code !== 'EN') return false;
      if (languageFilter === 'japanese' && expansion.language_code !== 'JA') return false;
      return true;
    });
    
    filteredExpansions.forEach(expansion => {
      if (expansion.series) {
        counts[expansion.series] = (counts[expansion.series] || 0) + 1;
      }
    });
    
    // Remove series with 0 counts
    Object.keys(counts).forEach(series => {
      if (counts[series] === 0) {
        delete counts[series];
      }
    });
    
    return counts;
  };

  // Handle series selection
  const handleSeriesToggle = (series) => {
    setSelectedSeries(prev => {
      if (prev.includes(series)) {
        return prev.filter(s => s !== series);
      } else {
        return [...prev, series];
      }
    });
  };

  // Clear all series filters
  const clearSeriesFilters = () => {
    setSelectedSeries([]);
    setSeriesSearchQuery('');
  };

  // Check if we're on mobile
  const isMobile = window.innerWidth < 1024;

  // Perform search
  const performSearch = async (query, page = 1, append = false) => {
    // Clear any existing timeouts to prevent multiple searches
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Define current view mode at the beginning
    const currentViewMode = expansionViewMode;
    
    // Reset state for new search - only update loading states when necessary
    if (page === 1) {
      if (!append) {
        setSearchResults([]);
        setTotalResults(0);
        setHasMore(false);
        setCurrentPage(1);
      }
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Check if services are initialized
      if (!servicesInitialized) {
        setError('Search services are still initializing. Please wait a moment and try again.');
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const searchOptions = {
        page,
        pageSize: 100, // Increased to show more results
        expansionId: selectedExpansion?.id || null,
        sortBy: sortBy, // Use current sort setting
        sortOrder: sortOrder, // Use current sort order
        // Apply filter values
        supertype: filterValues.supertype.length > 0 ? filterValues.supertype : null,
        types: filterValues.types.length > 0 ? filterValues.types : null,
        subtypes: filterValues.subtypes.length > 0 ? filterValues.subtypes : null,
        rarity: filterValues.rarity.length > 0 ? filterValues.rarity : null,
        artists: filterValues.artists.length > 0 ? filterValues.artists : null,
        weaknesses: filterValues.weaknesses.length > 0 ? filterValues.weaknesses : null,
        resistances: filterValues.resistances.length > 0 ? filterValues.resistances : null
      };

      // Use simple search service - direct database queries only
      const results = await simpleSearchService.searchAll(query, {
          page,
          pageSize: 30,
          sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      // Results are already formatted by simpleSearchService
      const allResults = results.data || [];

      // Skip image enhancement for performance - use results directly
      const enhancedResults = allResults;

      // No filtering needed - simpleSearchService returns all results
      const finalResults = enhancedResults;

      if (append) {
        setSearchResults(prev => [...prev, ...finalResults]);
      } else {
        setSearchResults(finalResults);
      }

      // Set pagination info
      const totalFromResults = results.total || 0;
      const currentResultsCount = append ? searchResults.length + finalResults.length : finalResults.length;
      
      setTotalResults(totalFromResults);
      setHasMore(currentResultsCount < totalFromResults);
      setCurrentPage(page);
      

    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search cards. Please try again.');
      if (page === 1) {
        setSearchResults([]);
        setTotalResults(0);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Handle URL search parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const queryParam = urlParams.get('q');
    const gameParam = urlParams.get('game');
    
    if (queryParam) {
      setSearchQuery(queryParam);
      setCurrentView('search');
      
      // Find and set the selected game if specified
      if (gameParam) {
        const game = games.find(g => g.id === gameParam);
        if (game) {
          setSelectedGame(game);
          setGlobalSelectedGame(game);
        }
      }
      
      // Perform the search
      performSearch(queryParam);
    }
  }, [location.search]);

  // Handle search input with debouncing
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Clear any existing timeouts
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Clear expansion selection when using top search bar
    if (selectedExpansion) {
      setSelectedExpansion(null);
      setExpansionViewMode('singles');
    }
    
    // Perform search immediately for form submission
    if (searchQuery.trim()) {
      setCurrentView('search');
      performSearch(searchQuery, 1, false);
    } else {
      clearSearch();
    }
  };

  // Handle expansion selection (legacy function - now handled by handleExpansionSelect)
  const handleExpansionClick = async (expansion) => {
    handleExpansionSelect(expansion);
  };

  // Toggle price sorting for sealed products
  const togglePriceSorting = async () => {
    const newSortOrder = priceSortOrder === 'asc' ? 'desc' : 'asc';
    setPriceSortOrder(newSortOrder);
    
    // Refresh the search with new price sorting
    if (selectedExpansion) {
      await performExpansionSearch(selectedExpansion.id, 1, false, 'sealed', true, filterValues, true, 'pricing_market', newSortOrder);
    }
  };

  // Perform search for cards in a specific expansion
  const performExpansionSearch = async (expansionId, page = 1, append = false, viewMode = null, skipCacheClear = false, currentFilterValues = null, forceCacheClear = false, currentSortBy = null, currentSortOrder = null) => {
    // Define current view mode at the beginning
    const currentViewMode = viewMode || expansionViewMode;
    
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Only clear cache when explicitly requested (not on every search)
    if (forceCacheClear) {
      await searchCacheService.forceClearAllCache();
    }
    
    // Reset state for new expansion search - only update loading states when necessary
    if (page === 1) {
      if (!append) {
        setSearchResults([]);
        setTotalResults(0);
        setHasMore(false);
        setCurrentPage(1);
      }
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Use passed filter values or fall back to state
      const filtersToUse = currentFilterValues || filterValues;
      
      const searchOptions = {
        page,
        pageSize: 30, // Optimized pagination for fast loading
        expansionId: expansionId,
        // Include current filter values - convert empty arrays to null for proper handling
        sortBy: currentSortBy || sortBy,
        sortOrder: currentSortOrder || sortOrder,
        supertype: filtersToUse.supertype.length > 0 ? filtersToUse.supertype : null,
        types: filtersToUse.types.length > 0 ? filtersToUse.types : null,
        subtypes: filtersToUse.subtypes.length > 0 ? filtersToUse.subtypes : null,
        rarity: filtersToUse.rarity.length > 0 ? filtersToUse.rarity : null,
        artists: filtersToUse.artists.length > 0 ? filtersToUse.artists : null,
        weaknesses: filtersToUse.weaknesses.length > 0 ? filtersToUse.weaknesses : null,
        resistances: filtersToUse.resistances.length > 0 ? filtersToUse.resistances : null,
      };
      
      let results;
      
      if (currentViewMode === 'sealed') {
        // Get sealed products using simplified service
        const sealedResults = await expansionDataService.getExpansionSealedProducts(expansionId, {
          page,
          pageSize: 30,
          sortBy: currentSortBy === 'pricing_market' ? 'pricing_market' : 'name',
          sortOrder: currentSortOrder || priceSortOrder
        });
        
        // Format sealed products to match expected structure for UI display
        const formattedSealedProducts = sealedResults.products.map(product => ({
          id: product.tcggo_id || product.id,
          name: product.name,
          type: 'sealed',
          itemType: 'sealed',
          rarity: 'Sealed', // Always "Sealed" for sealed products
          image: product.image,
          image_url: product.image,
          expansion_name: product.episode_name || 'Unknown Set',
          set_name: product.episode_name || 'Unknown Set',
          product_name: product.name,
          
          // Pricing data - convert EUR to USD for display
          raw_price: product.pricing_market ? (product.pricing_market * 1.08).toFixed(2) : null, // Approximate EUR to USD conversion
          market_value_cents: product.pricing_market ? Math.round(product.pricing_market * 1.08 * 100) : null,
          
          // Original pricing data
          pricing: {
            low: product.pricing_low,
            mid: product.pricing_mid,
            high: product.pricing_high,
            market: product.pricing_market,
            currency: product.pricing_currency || 'EUR',
            sources: product.pricing_sources || ['cardmarket']
          },
          pricingSource: product.pricing_source || 'cardmarket',
          source: product.source || 'cardmarket',
          episode: {
            id: product.episode_id,
            name: product.episode_name
          },
          tcggoUrl: product.tcggo_url,
          cardmarketUrl: product.cardmarket_url,
          rawData: product.raw_data
        }));
        
        results = {
          singles: [],
          sealed: formattedSealedProducts,
          total: sealedResults.total || 0
        };

      } else {
        // Get singles using simplified service - no cache needed (DB IS the cache per Scrydex)
        const singleResults = await expansionDataService.getExpansionCards(expansionId, {
          page,
          pageSize: 30,
          sortBy: searchOptions.sortBy,
          sortOrder: searchOptions.sortOrder,
          filters: {
            supertype: searchOptions.supertype,
            types: searchOptions.types,
            subtypes: searchOptions.subtypes,
            rarity: searchOptions.rarity,
            artists: searchOptions.artists,
            weaknesses: searchOptions.weaknesses,
            resistances: searchOptions.resistances
          }
        });
        
        results = {
          singles: singleResults.cards || [],
          sealed: [],
          total: singleResults.total || 0
        };
      }
      
      // Process results based on view mode - ensure strict separation
      let allResults = [];
      
      if (currentViewMode === 'sealed') {
        // SEALED MODE: Only add sealed products, explicitly exclude singles
        
        if (results.sealed && results.sealed.length > 0) {
          // Format sealed products - handle both TCGGo and PriceCharting formats
          const formattedSealed = results.sealed.map(product => {
            // If product is already formatted (TCGGo format), use it as-is but ensure proper fields
            if (product.name && product.pricing && product.source === 'cardmarket') {
              return {
                ...product,
                itemType: 'sealed',
                rarity: product.rarity || 'Sealed', // Ensure rarity is always "Sealed"
                // Map TCGGo pricing to expected format
                market_value: product.pricing.market || product.pricing.low,
                lowest_price: product.pricing.low,
                set_name: product.episode?.name || product.expansion_name || 'Unknown Set',
                product_name: product.name,
                console_name: product.episode?.name || product.expansion_name || 'Unknown Set',
                image_url: product.image,
                // Ensure pricing fields are available for UI
                raw_price: product.raw_price || (product.pricing.market ? (product.pricing.market * 1.08).toFixed(2) : null),
                market_value_cents: product.market_value_cents || (product.pricing.market ? Math.round(product.pricing.market * 1.08 * 100) : null)
              };
            }
            
            // If product is already formatted (PriceCharting format), use it as-is
            if (product.name && product.set_name && product.market_value !== undefined) {
              return {
                ...product,
                source: product.source || 'pricecharting',
                itemType: 'sealed',
                rarity: product.rarity || 'Sealed' // Ensure rarity is always "Sealed"
              };
            }
            
            // Otherwise, format the raw PriceCharting data
            return {
              ...priceChartingApiService.formatProductData(product),
              source: 'pricecharting',
              itemType: 'sealed',
              rarity: 'Sealed' // Ensure rarity is always "Sealed"
            };
          });
          
          allResults.push(...formattedSealed);
        }
        
      } else {
        // SINGLES MODE: Only add singles, explicitly exclude sealed products
        
        if (results.singles && results.singles.length > 0) {
          const formattedSingles = formatCardsWithVariants(results.singles);
          
          // Filter out TCG Pocket cards
          const filteredSingles = formattedSingles.filter(card => {
            const expansionName = card.expansion_name?.toLowerCase() || '';
            const cardName = card.name?.toLowerCase() || '';
            const isTCGPocket = expansionName.includes('pocket') || 
                               expansionName.includes('tcg pocket') ||
                               cardName.includes('pocket promo') ||
                               cardName.includes('pocket');
            if (isTCGPocket) {
            }
            return !isTCGPocket;
          });
          
          allResults.push(...filteredSingles.map(card => ({
            ...card,
            source: 'scrydex',
            itemType: 'singles' // Explicitly mark as singles
          })));
        }
      }
      

      // Skip image enhancement for performance - use results directly
      const enhancedResults = allResults;

      if (append) {
        setSearchResults(prev => [...prev, ...enhancedResults]);
      } else {
        setSearchResults(enhancedResults);
      }

      // Set pagination info
      let totalFromResults;
      if (currentViewMode === 'sealed') {
        totalFromResults = results.total || results.sealed?.total || 0;
      } else {
        totalFromResults = results.total || results.singles?.total || 0;
      }
      
      setTotalResults(totalFromResults);
      const hasMoreValue = (page * 30) < totalFromResults;
      setHasMore(hasMoreValue);
      setCurrentPage(page);

    } catch (error) {
      console.error('Expansion search error:', error);
      setError('Failed to load expansion cards. Please try again.');
      if (page === 1) {
        setSearchResults([]);
        setTotalResults(0);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };


  // Infinite scroll setup with optimized loading
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    // Only create observer if we have more results to load and we're not currently loading
    if (hasMore && !isLoading && !isLoadingMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
            loadMoreResults();
          }
        },
        { 
          threshold: 0.1,
          rootMargin: '200px' // Start loading earlier for smoother experience
        }
      );

      if (loadingRef.current) {
        observerRef.current.observe(loadingRef.current);
      }
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore]);

  // Ensure page starts at top when component mounts
  useEffect(() => {
    const scrollToTop = () => {
      // Reset any body styles that might interfere with scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('modal-open');
      
      // Force scroll to top
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Target the actual scrollable containers
      const mainContent = document.querySelector('.main-content');
      const desktopMainContent = document.querySelector('.desktop-main-content');
      
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      
      if (desktopMainContent) {
        desktopMainContent.scrollTop = 0;
      }
    };

    // Run immediately and after a delay
    scrollToTop();
    setTimeout(scrollToTop, 0);
    setTimeout(scrollToTop, 100);
  }, []);

  // Back to top button scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300); // Show button after scrolling 300px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Optimized load more results
  const loadMoreResults = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingMoreRef.current || !hasMore || isLoadingMore || currentPage >= 20) {
      return;
    }
    
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    
    try {
      if (selectedExpansion) {
        // Load more cards from the expansion
        await performExpansionSearch(selectedExpansion.id, currentPage + 1, true, null, true, filterValues);
      } else if (searchQuery.trim()) {
        // Load more from search query
        await performSearch(searchQuery, currentPage + 1, true);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }; 


  // Auto-exit multi-select mode when cart becomes empty
  useEffect(() => {
    if (contextMultiSelectMode && cartItems.length === 0) {
      contextExitMultiSelectMode();
      setSelectedItems(new Set());
      contextCloseCartMenu();
    }
  }, [cartItems.length, contextMultiSelectMode, contextExitMultiSelectMode, contextCloseCartMenu]);

  // Cart management functions
  const addToCart = (card) => {
    // Prepare card data for the cart
    let marketValue = 0;
    
    if (card.raw_price) {
      marketValue = parseFloat(card.raw_price);
    } else if (card.graded_price) {
      marketValue = parseFloat(card.graded_price);
    } else if (card.market_value_cents) {
      marketValue = card.market_value_cents / 100;
    }
    
    const cardData = {
      id: card.id,
      name: card.name,
      set: card.expansion_name || card.set_name,
      marketValue: marketValue,
      price: null, // User will enter their own price in the cart
      imageUrl: card.image_url,
      rarity: card.rarity,
      source: 'api',
      api_id: card.id,
      itemType: card.itemType || (card.supertype === 'Sealed Product' ? 'Sealed' : 'Single'),
      cardCondition: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : 'Raw',
      gradingCompany: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
      gradingGrade: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null
    };
    
    // Check if item is already in cart
    const existingItem = cartItems.find(item => item.id === card.id);
    if (existingItem) {
      // Update quantity
      setCartItems(prev => 
        prev.map(item => 
          item.id === card.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add new item to cart
      setCartItems(prev => [...prev, { ...cardData, quantity: 1 }]);
    }
  };

  const removeFromCart = (cardId) => {
    setCartItems(prev => prev.filter(item => item.id !== cardId));
    // Also deselect the item from multi-select state
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(cardId);
      return newSelected;
    });
  };

  const updateCartQuantity = (cardId, quantity) => {
    // Handle empty string (when user clears the field)
    if (quantity === '') {
      setCartItems(prev => 
        prev.map(item => 
          item.id === cardId 
            ? { ...item, quantity: '' }
            : item
        )
      );
    } else if (quantity <= 0) {
      removeFromCart(cardId);
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.id === cardId 
            ? { ...item, quantity: quantity }
            : item
        )
      );
    }
  };


  const clearCart = () => {
    setCartItems([]);
    setSelectedItems(new Set());
    setIsCartMode(false);
    contextExitMultiSelectMode();
    contextCloseCartMenu();
  };


  // Direct order creation from cart menu
  const createOrderDirectly = async (orderData) => {
    if (orderData.items.length === 0) return;

    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      // Set success data for popup
      const totalValue = cartItems.reduce((sum, item) => {
        const itemPrice = item.price || 0;
        return sum + (itemPrice * item.quantity);
      }, 0);

      setMultiOrderSuccessData({
        itemCount: cartItems.length,
        totalValue: totalValue,
        items: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price || item.marketValue || 0
        }))
      });

      // Show processing popup
      setShowMultiOrderProcessing(true);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a single order group ID for all items in this multi-order
      const orderGroupId = crypto.randomUUID();

      // Create orders directly without creating items in items table
      const orderPromises = orderData.items.map(async (item) => {
        const itemPrice = item.price || 0;
        
        // For API-sourced cards, we don't create items in the items table
        // Instead, we create orders that reference the API data directly
        const buyPriceCents = Math.round(itemPrice * 100);
        const totalCostCents = Math.round(itemPrice * item.quantity * 100);

        // Use the item type and grading information from the cart item
        const itemType = item.itemType || 'Single';
        const cardCondition = item.cardCondition;
        const gradingCompany = item.gradingCompany;
        const gradingGrade = item.gradingGrade;

        return {
          // User identification
          user_id: user.id,
          // Link directly to pokemon_cards table (SearchApi only handles pokemon for now)
          pokemon_card_id: item.api_id || null,
          item_id: null, // For custom items only
          product_source: 'pokemon',
          // Order details
          purchase_date: orderData.date,
          price_per_item_cents: buyPriceCents,
          quantity: item.quantity,
          total_cost_cents: totalCostCents,
          retailer_name: orderData.location || null,
          notes: null,
          order_group_id: orderGroupId,
          
          // Item classification fields
          item_type: itemType,
          card_condition: cardCondition,
          grading_company: gradingCompany,
          grading_grade: gradingGrade
        };
      });

      // Wait for all order data to be prepared
      const ordersData = await Promise.all(orderPromises);
      
      // Create all orders with the same order number
      const ordersWithNumbers = await createBulkOrders(supabase, ordersData);
      
      // Insert all orders
      const { data: orders, error: bulkOrderError } = await supabase
        .from('orders')
        .insert(ordersWithNumbers)
        .select();
        
      if (bulkOrderError) throw bulkOrderError;

      // Show success popup
      setShowMultiOrderProcessing(false);
      setShowMultiOrderSuccess(true);

      // Clear cart and exit multi-select mode after delay
      setTimeout(() => {
        setCartItems([]);
        setSelectedItems(new Set());
        contextExitMultiSelectMode();
        contextCloseCartMenu();
        setShowMultiOrderSuccess(false);
        setMultiOrderSuccessData(null);
      }, 1500);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(queryKeys.orders);
      queryClient.invalidateQueries(queryKeys.collectionSummary);

    } catch (error) {
      console.error('❌ Error creating order:', error);
      setShowMultiOrderProcessing(false);
      setMultiOrderSuccessData(null);
      // You might want to show an error message to the user here
    }
  };

  // Hold-to-select functionality
  const handleCardPressStart = (card) => {
    if (contextMultiSelectMode) return;
    
    const timeout = setTimeout(() => {
      // Set flag to prevent click from interfering
      setJustCompletedHoldSelect(true);
      
      // Enter multi-select mode first
      enterMultiSelectMode();
      setSelectedItems(new Set([card.id]));
      
      // Add to cart and then open menu
      setCartItems(prev => {
        // Check if item is already in cart
        const existingItem = prev.find(item => item.id === card.id);
        let newCart;
        
        if (existingItem) {
          // Update quantity
          newCart = prev.map(item => 
            item.id === card.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          // Prepare card data for the cart
          let marketValue = 0;
          
          if (card.raw_price) {
            marketValue = parseFloat(card.raw_price);
          } else if (card.graded_price) {
            marketValue = parseFloat(card.graded_price);
          } else if (card.market_value_cents) {
            marketValue = card.market_value_cents / 100;
          }
          
          const cardData = {
            id: card.id,
            name: card.name,
            set: card.expansion_name || card.set_name,
            marketValue: marketValue,
            price: null, // User will enter their own price in the cart
            imageUrl: card.image_url,
            rarity: card.rarity,
            source: 'api',
            api_id: card.id,
            itemType: card.itemType || (card.supertype === 'Sealed Product' ? 'Sealed' : 'Single'),
            cardCondition: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : 'Raw',
            gradingCompany: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
            gradingGrade: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null
          };
          
          // Add new item to cart
          newCart = [...prev, { ...cardData, quantity: 1 }];
        }
        
        // Open cart menu after cart is updated
        setTimeout(() => {
          openCartMenu();
        }, 0);
        
        return newCart;
      });
    }, 500); // 500ms hold time
    
    setHoldTimeout(timeout);
  };

  const handleCardPressEnd = () => {
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      setHoldTimeout(null);
    }
    // Don't do anything else - let the hold timeout handle the selection
  };

  const handleCardClick = (card) => {
    
    // If we just completed a hold-to-select, ignore this click
    if (justCompletedHoldSelect) {
      setJustCompletedHoldSelect(false);
      return;
    }
    
    if (contextMultiSelectMode) {
      // Toggle selection
      const newSelected = new Set(selectedItems);
      if (newSelected.has(card.id)) {
        newSelected.delete(card.id);
        removeFromCart(card.id);
      } else {
        newSelected.add(card.id);
        addToCart(card);
      }
      setSelectedItems(newSelected);
    } else {
      // Normal card click - open preview
    setSelectedCard(card);
    setIsCardModalOpen(true);
    }
  };

  const exitMultiSelectMode = () => {
    // Create order directly when Done is clicked
    if (cartItems.length > 0) {
      const orderData = {
        orderDate: new Date().toISOString().split('T')[0],
        purchaseLocation: '',
        itemPrices: {}
      };
      createOrderDirectly(orderData);
    }
    contextExitMultiSelectMode();
    setSelectedItems(new Set());
    contextCloseCartMenu();
  };

  const cancelMultiSelect = () => {
    // Clear cart and exit multi-select mode
    setCartItems([]);
    setSelectedItems(new Set());
    contextExitMultiSelectMode();
    contextCloseCartMenu();
  };

  // Handle add to collection - show modal locally
  const handleAddToCollection = (card) => {
    if (isCartMode) {
      // Add to cart instead of opening single item modal
      addToCart(card);
    } else {
      // Prepare card data for the modal
      // Use the same logic as the search page display
      let marketValue = 0;
      
      if (card.raw_price) {
        marketValue = parseFloat(card.raw_price);
      } else if (card.graded_price) {
        marketValue = parseFloat(card.graded_price);
      } else if (card.market_value_cents) {
        marketValue = card.market_value_cents / 100;
      }
      
      
    const cardData = {
      name: card.name,
      set_name: card.expansion_name || card.set_name,
      item_type: 'Card',
        market_value: marketValue,
      image_url: card.image_url,
      description: `${card.rarity} card from ${card.expansion_name || card.set_name}`,
      number: card.number,
      rarity: card.rarity,
      source: 'api',
      api_id: card.id
    };
    
      // Set the selected card and open the modal
      setSelectedCardForCollection(cardData);
      setIsAddToCollectionModalOpen(true);
      openModal();
    }
  };

  // Navigation functions
  const handleGameSelect = (game) => {
    // Prevent selection of disabled games
    if (game.enabled === false) {
      setError(`${game.name} is not yet available. Currently only Pokémon and manually added items are available.`);
      return;
    }
    
    if (game.badge === 'SOON') {
      // Show coming soon message for games not yet available
      setError(`${game.name} is coming soon! Currently only Pokémon cards are available.`);
      return;
    }
    
    if (game.id === 'all') {
      // For "All", show the games selection view
      setSelectedGame(game);
      setCurrentView('games');
    } else if (game.id === 'pokemon') {
      // For Pokémon, navigate to Pokemon-specific page
      navigate(`/pokemon`);
    } else if (game.id === 'other') {
      // For Other, navigate to Other page
      navigate(`/other`);
    } else if (hasGameService(game.id)) {
      // For games with dedicated services, navigate to game-specific page
      navigate(`/${game.id}`);
    } else {
      // For games not yet implemented, show coming soon
      setError(`${game.name} is coming soon!`);
    }
  };

  const handleExpansionSelect = async (expansion) => {
    // Update URL to include expansion
    navigate(`/search/${selectedGame.id}/expansions/${expansion.id}`);
    
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Immediately clear previous results to prevent lingering content
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    
    // Reset view mode to singles for new expansion
    setExpansionViewMode('singles');
    
    setSelectedExpansion(expansion);
    setCurrentView('search');
    
    // Only clear cache if we're switching to a different expansion
    if (selectedExpansion && selectedExpansion.id !== expansion.id) {
      await searchCacheService.forceClearAllCache();
    }
      // Clear any cached data for numerical sorting
      window.allSortedCards = null;
    
    // Automatically search for cards in this expansion with current sort and filter values
    await performExpansionSearch(expansion.id, 1, false, null, true, filterValues);
  };

  const handleBackToGames = () => {
    setCurrentView('games');
    setSelectedGame(null);
    setSelectedExpansion(null);
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
    navigate('/search');
  };

  const handleBackToExpansions = () => {
    setCurrentView('expansions');
    setSelectedExpansion(null);
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
    navigate(`/search/${selectedGame.id}`);
  };

  // Clear search and filters
  const clearSearch = () => {
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
    
    // Return to appropriate view
    if (selectedExpansion) {
      setCurrentView('search');
    } else {
      setCurrentView('games');
    }
  };

  // Load more results removed - we now load all cards at once

  // Format price for display - ALWAYS show exactly 2 decimal places
  const formatPrice = (price) => {
    if (!price) return null;
    
    // Force exactly 2 decimal places for ALL prices
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return null;
    
    
    // Always format with exactly 2 decimal places
    return `$${numPrice.toFixed(2)}`;
  };

  // Sort cards based on criteria
  const sortCards = (cards, sortBy, sortOrder) => {
    return [...cards].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'Price':
          aValue = parseFloat(a.raw_price) || 0;
          bValue = parseFloat(b.raw_price) || 0;
          break;
        case 'Card Number':
          aValue = parseInt(a.number) || 0;
          bValue = parseInt(b.number) || 0;
          break;
        case 'Name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Filter categories configuration
  const filterCategories = {
    sorting: 'Sort',
    supertype: 'Supertype',
    types: 'Type', 
    subtypes: 'Subtype',
    rarity: 'Rarity',
    artists: 'Artist',
    weaknesses: 'Weakness',
    resistances: 'Resistance'
  };

  // Toggle filter category expansion
  const toggleFilterExpansion = (filterType) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  // Get filter label for display
  const getFilterLabel = (filterType, value) => {
    const options = getFilterOptions(filterType);
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Helper function to get dynamic sort button text
  const getSortButtonText = (sortBy, sortOrder) => {
    // Return the text that represents what this button will do when clicked
    switch (sortBy) {
      case 'name':
        return sortOrder === 'desc' ? 'A-Z' : 'Z-A';
      case 'raw_market':
        return sortOrder === 'desc' ? 'Low to High' : 'High to Low';
      case 'graded_market':
        return sortOrder === 'desc' ? 'Low to High' : 'High to Low';
      case 'number':
      default:
        return sortOrder === 'desc' ? '1-999' : '999-1';
    }
  };

  // Toggle filter value selection
  const toggleFilterValue = (filterType, value) => {
    setFilterValues(prev => {
      const currentValues = prev[filterType] || [];
      const isCurrentlySelected = currentValues.includes(value);
      
      const newValues = {
        ...prev,
        [filterType]: isCurrentlySelected
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value]
      };
      
      // Update active filters immediately
      const newActiveFilters = [];
      Object.entries(newValues).forEach(([type, values]) => {
        if (values.length > 0) {
          values.forEach(val => {
            newActiveFilters.push({ type, value: val, label: getFilterLabel(type, val) });
          });
        }
      });
      setActiveFilters(newActiveFilters);
      
      // Debounce filter application with current values - reduced timeout for faster response
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      filterTimeoutRef.current = setTimeout(() => applyFilters(newValues), 50);
      
      return newValues;
    });
  };

  // Remove individual filter
  const removeFilter = (filterType, value) => {
    setFilterValues(prev => {
      const newValues = {
        ...prev,
        [filterType]: prev[filterType].filter(v => v !== value)
      };
      
      // Update active filters immediately
      const newActiveFilters = [];
      Object.entries(newValues).forEach(([type, values]) => {
        if (values.length > 0) {
          values.forEach(val => {
            newActiveFilters.push({ type, value: val, label: getFilterLabel(type, val) });
          });
        }
      });
      setActiveFilters(newActiveFilters);
      
      // Debounce filter application with current values - reduced timeout for faster response
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      filterTimeoutRef.current = setTimeout(() => applyFilters(newValues), 50);
      
      return newValues;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const emptyFilters = {
      supertype: [],
      types: [],
      subtypes: [],
      rarity: [],
      artists: [],
      weaknesses: [],
      resistances: []
    };
    
    setFilterValues(emptyFilters);
    setActiveFilters([]);
    
    // Apply filters immediately with empty values
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    filterTimeoutRef.current = setTimeout(() => applyFilters(emptyFilters), 100);
  };

  // Apply filters and refresh search
  const applyFilters = async (currentFilterValues = null, currentSortBy = null, currentSortOrder = null) => {
    if (!selectedExpansion) return;
    
    try {
      // Batch state updates to prevent multiple re-renders
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      setCurrentPage(1);
      setIsLoading(true);
      
      // Clear any cached data when filters or sort change
      window.allSortedCards = null;
      
      // Use current filter values if provided, otherwise use state
      const filtersToUse = currentFilterValues || filterValues;
      const sortByToUse = currentSortBy || sortBy;
      const sortOrderToUse = currentSortOrder || sortOrder;
      
      // Don't clear cache for filter changes - let the cache work for performance
      // Perform search with new filters and sort settings - no cache clearing for performance
      await performExpansionSearch(selectedExpansion.id, 1, false, expansionViewMode, true, filtersToUse, false, sortByToUse, sortOrderToUse);
    } catch (error) {
      console.error('Error applying filters:', error);
      setError('Failed to apply filters');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all filters
  const resetAllFilters = () => {
    setFilterValues({
      supertype: [],
      types: [],
      subtypes: [],
      rarity: [],
      artists: [],
      weaknesses: [],
      resistances: []
    });
    setGlobalSearchTerm('');
    setExpandedFilters({});
    setSortBy('number');
    setSortOrder('asc');
    setActiveFilters([]);
  };

  // Calculate dynamic filter counts based on current selections - memoized for performance
  const getDynamicFilterCounts = useMemo(() => {
    const cache = new Map();
    
    return (filterType) => {
      if (!selectedExpansion) return {};
      
      // Create cache key based on filter type, search results length, and filter values
      const cacheKey = `${filterType}-${searchResults?.length || 0}-${JSON.stringify(filterValues)}`;
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      
      // Get all cards for the current expansion
      const allCards = searchResults || [];
      
      // Create a copy of current filter values, excluding the current filter type
      const otherFilters = { ...filterValues };
      delete otherFilters[filterType];
      
      // Filter cards based on other active filters
      const filteredCards = allCards.filter(card => {
        // Apply all other filters except the current one
        for (const [filterKey, filterValues] of Object.entries(otherFilters)) {
          if (filterValues && filterValues.length > 0) {
            if (filterKey === 'supertype' && !filterValues.includes(card.supertype)) return false;
            if (filterKey === 'types' && !filterValues.some(type => card.types?.includes(type))) return false;
            if (filterKey === 'subtypes' && !filterValues.some(subtype => card.subtypes?.includes(subtype))) return false;
            if (filterKey === 'rarity' && !filterValues.includes(card.rarity)) return false;
            if (filterKey === 'artists' && !filterValues.includes(card.artist)) return false;
            if (filterKey === 'weaknesses' && !filterValues.some(weakness => card.weaknesses?.some(w => w.type === weakness))) return false;
            if (filterKey === 'resistances' && !filterValues.some(resistance => card.resistances?.some(r => r.type === resistance))) return false;
          }
        }
        return true;
      });
      
      // Count occurrences for the current filter type
      const counts = {};
      filteredCards.forEach(card => {
        if (filterType === 'supertype' && card.supertype) {
          counts[card.supertype] = (counts[card.supertype] || 0) + 1;
        } else if (filterType === 'types' && card.types) {
          card.types.forEach(type => {
            counts[type] = (counts[type] || 0) + 1;
          });
        } else if (filterType === 'subtypes' && card.subtypes) {
          card.subtypes.forEach(subtype => {
            counts[subtype] = (counts[subtype] || 0) + 1;
          });
        } else if (filterType === 'rarity' && card.rarity) {
          counts[card.rarity] = (counts[card.rarity] || 0) + 1;
        } else if (filterType === 'artists' && card.artist) {
          counts[card.artist] = (counts[card.artist] || 0) + 1;
        } else if (filterType === 'weaknesses' && card.weaknesses) {
          card.weaknesses.forEach(weakness => {
            if (weakness.type) {
              counts[weakness.type] = (counts[weakness.type] || 0) + 1;
            }
          });
        } else if (filterType === 'resistances' && card.resistances) {
          card.resistances.forEach(resistance => {
            if (resistance.type) {
              counts[resistance.type] = (counts[resistance.type] || 0) + 1;
            }
          });
        }
      });
      
      // Cache the result and limit cache size
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(cacheKey, counts);
      
      return counts;
    };
  }, [selectedExpansion, searchResults, filterValues]);

  // Get filter options based on type and search term
  const getFilterOptions = (filterType, searchTerm) => {
    const dynamicCounts = getDynamicFilterCounts(filterType);
    
    // Define the base options with icons
    const baseOptions = {
      supertype: [
        { value: 'Pokémon', label: 'Pokémon' },
        { value: 'Trainer', label: 'Trainer' }
      ],
      types: [
        { value: 'Grass', label: 'Grass', icon: <img src="https://scrydex.com/assets/grass-ec3509d75db6cd146139044107045ccb5bcbb528b02c3de89d709a7be4a0bf90.png" alt="Grass" className="w-4 h-4" /> },
        { value: 'Fighting', label: 'Fighting', icon: <img src="https://scrydex.com/assets/fighting-5fcb6e1f157032efac4f6830d88759e83e66530354a297b112fff24c152e8d3c.png" alt="Fighting" className="w-4 h-4" /> },
        { value: 'Psychic', label: 'Psychic', icon: <img src="https://scrydex.com/assets/psychic-503107a3ed9d9cce58e290677918f057ea6dc4e75042f2a627a5dd8a8bf6af9e.png" alt="Psychic" className="w-4 h-4" /> },
        { value: 'Water', label: 'Water', icon: <img src="https://scrydex.com/assets/water-6b0bc3ea40b358d372e8be04aa90be9fb74e3e46ced6824f6b264cc2a7c7e32a.png" alt="Water" className="w-4 h-4" /> },
        { value: 'Colorless', label: 'Colorless', icon: '⭐' },
        { value: 'Fire', label: 'Fire', icon: <img src="https://scrydex.com/assets/fire-76e636965a1e28800904de4abbf84ade3b019bbbce7021987f379971f881c2b5.png" alt="Fire" className="w-4 h-4" /> },
        { value: 'Darkness', label: 'Darkness', icon: <img src="https://scrydex.com/assets/darkness-d766bdc83589235f104c3c3892cff4de80048e7a729f24b6e5e53a1838c7ebfa.png" alt="Darkness" className="w-4 h-4" /> },
        { value: 'Lightning', label: 'Lightning', icon: <img src="https://scrydex.com/assets/lightning-732a70ef2e2dab4cc564fbf4d85cad48b0ac9ece462be3d42166a6fea4085773.png" alt="Lightning" className="w-4 h-4" /> },
        { value: 'Metal', label: 'Metal', icon: <img src="https://scrydex.com/assets/metal-076b10c3700a68913c376f841b46a1d63c3895247385b4360bc70739289179b7.png" alt="Metal" className="w-4 h-4" /> },
        { value: 'Dragon', label: 'Dragon', icon: <img src="https://scrydex.com/assets/dragon-3445aa07cd2c2380ae8e61f4ec47c7d678b4ab4268db16f95f66a04ecdd5200f.png" alt="Dragon" className="w-4 h-4" /> }
      ],
      subtypes: [
        { value: 'Basic', label: 'Basic' },
        { value: 'Stage 1', label: 'Stage 1' },
        { value: 'MEGA', label: 'MEGA' },
        { value: 'ex', label: 'ex' },
        { value: 'Stage 2', label: 'Stage 2' },
        { value: 'Item', label: 'Item' },
        { value: 'Supporter', label: 'Supporter' },
        { value: 'Stadium', label: 'Stadium' },
        { value: 'Pokémon Tool', label: 'Pokémon Tool' }
      ],
      rarity: [
        { value: 'Common', label: 'Common' },
        { value: 'Uncommon', label: 'Uncommon' },
        { value: 'Illustration Rare', label: 'Illustration Rare' },
        { value: 'Ultra Rare', label: 'Ultra Rare' },
        { value: 'Rare', label: 'Rare' },
        { value: 'Special Illustration Rare', label: 'Special Illustration Rare' },
        { value: 'Double Rare', label: 'Double Rare' },
        { value: 'Mega Hyper Rare', label: 'Mega Hyper Rare' }
      ],
      artists: [
        { value: '5ban Graphics', label: '5ban Graphics' },
        { value: 'Studio Bora Inc.', label: 'Studio Bora Inc.' },
        { value: 'Toyste Beach', label: 'Toyste Beach' },
        { value: 'AYUMI ODASHIMA', label: 'AYUMI ODASHIMA' },
        { value: 'aky CG Works', label: 'aky CG Works' },
        { value: 'Atsushi Furusawa', label: 'Atsushi Furusawa' },
        { value: 'Saboteri', label: 'Saboteri' },
        { value: 'mashu', label: 'mashu' },
        { value: 'satoma', label: 'satoma' },
        { value: 'takuyoa', label: 'takuyoa' }
      ],
      weaknesses: [
        { value: 'Fire', label: 'Fire', icon: <img src="https://scrydex.com/assets/fire-76e636965a1e28800904de4abbf84ade3b019bbbce7021987f379971f881c2b5.png" alt="Fire" className="w-4 h-4" /> },
        { value: 'Fighting', label: 'Fighting', icon: <img src="https://scrydex.com/assets/fighting-5fcb6e1f157032efac4f6830d88759e83e66530354a297b112fff24c152e8d3c.png" alt="Fighting" className="w-4 h-4" /> },
        { value: 'Grass', label: 'Grass', icon: <img src="https://scrydex.com/assets/grass-ec3509d75db6cd146139044107045ccb5bcbb528b02c3de89d709a7be4a0bf90.png" alt="Grass" className="w-4 h-4" /> },
        { value: 'Darkness', label: 'Darkness', icon: <img src="https://scrydex.com/assets/darkness-d766bdc83589235f104c3c3892cff4de80048e7a729f24b6e5e53a1838c7ebfa.png" alt="Darkness" className="w-4 h-4" /> },
        { value: 'Lightning', label: 'Lightning', icon: <img src="https://scrydex.com/assets/lightning-732a70ef2e2dab4cc564fbf4d85cad48b0ac9ece462be3d42166a6fea4085773.png" alt="Lightning" className="w-4 h-4" /> },
        { value: 'Water', label: 'Water', icon: <img src="https://scrydex.com/assets/water-6b0bc3ea40b358d372e8be04aa90be9fb74e3e46ced6824f6b264cc2a7c7e32a.png" alt="Water" className="w-4 h-4" /> },
        { value: 'Psychic', label: 'Psychic', icon: <img src="https://scrydex.com/assets/psychic-503107a3ed9d9cce58e290677918f057ea6dc4e75042f2a627a5dd8a8bf6af9e.png" alt="Psychic" className="w-4 h-4" /> },
        { value: 'Metal', label: 'Metal', icon: <img src="https://scrydex.com/assets/metal-076b10c3700a68913c376f841b46a1d63c3895247385b4360bc70739289179b7.png" alt="Metal" className="w-4 h-4" /> }
      ],
      resistances: [
        { value: 'Fighting', label: 'Fighting', icon: <img src="https://scrydex.com/assets/fighting-5fcb6e1f157032efac4f6830d88759e83e66530354a297b112fff24c152e8d3c.png" alt="Fighting" className="w-4 h-4" /> },
        { value: 'Grass', label: 'Grass', icon: <img src="https://scrydex.com/assets/grass-ec3509d75db6cd146139044107045ccb5bcbb528b02c3de89d709a7be4a0bf90.png" alt="Grass" className="w-4 h-4" /> }
      ]
    };

    let filterOptions = baseOptions[filterType] || [];
    
    // Filter by search term
    if (searchTerm) {
      filterOptions = filterOptions.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filterOptions;
  };

  // Format trend for display on cards
  const formatTrendForCard = (trend) => {
    if (!trend || trend === 0) return null;
    const isPositive = trend > 0;
    const sign = isPositive ? '+' : '';
    return `(${sign}${trend.toFixed(1)}%)`;
  };

  // Get trend color class
  const getTrendColor = (trend) => {
    if (!trend || trend === 0) return 'text-white';
    return trend > 0 ? 'text-green-400' : 'text-red-400';
  };

  // Handle edit custom item
  const handleEditCustomItem = (item) => {
    setSelectedCustomItem(item);
    setIsCustomItemModalOpen(true);
    setShowCustomItemMenu(false);
  };

  // Control modal context when custom item menu opens/closes
  useEffect(() => {
    if (showCustomItemMenu) {
      openModal();
    } else {
      closeModal();
    }
  }, [showCustomItemMenu, openModal, closeModal]);

  // Handle delete custom item
  const handleDeleteCustomItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', item.id);

        if (error) throw error;

        // Refresh the custom items list
        fetchCustomItems();
        setShowCustomItemMenu(false);
      } catch (error) {
        console.error('Error deleting custom item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  // Bulk selection handlers for custom items
  const handleCustomItemSelect = (itemId) => {
    const newSelected = new Set(selectedCustomItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedCustomItems(newSelected);
  };

  const handleCustomLongPress = (itemId) => {
    setIsCustomSelectionMode(true);
    const newSelected = new Set(selectedCustomItems);
    newSelected.add(itemId);
    setSelectedCustomItems(newSelected);
  };

  const handleCustomBulkDelete = async () => {
    const selectedItems = customItems.filter(item => selectedCustomItems.has(item.id));
    const itemNames = selectedItems.map(item => item.name).join(', ');
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?\n\n${itemNames}`)) {
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .in('id', Array.from(selectedCustomItems));

        if (error) throw error;

        // Refresh the custom items list and reset selection
        fetchCustomItems();
        setSelectedCustomItems(new Set());
        setIsCustomSelectionMode(false);
        setShowCustomBulkMenu(false);
      } catch (error) {
        console.error('Error deleting custom items:', error);
        alert('Failed to delete items. Please try again.');
      }
    }
  };

  // Bulk selection helper functions
  const selectAllCustomItems = () => {
    const allItemIds = new Set(customItems.map(item => item.id));
    setSelectedCustomItems(allItemIds);
  };

  const clearCustomSelection = () => {
    setSelectedCustomItems(new Set());
    setIsCustomSelectionMode(false);
  };


  // Handle search from global header
  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() && servicesInitialized) {
      setCurrentView('search');
      // Clear expansion selection when using global search
      if (selectedExpansion) {
        setSelectedExpansion(null);
        setExpansionViewMode('singles');
      }
      performSearch(query, 1, false);
    } else if (!query.trim()) {
      clearSearch();
    }
  };

  // Set up global header when component mounts
  useEffect(() => {
    setOnSearch(() => handleGlobalSearch);
    setGlobalSelectedGame(selectedGame);
    setGlobalSearchQuery(searchQuery);
  }, [selectedGame, searchQuery, setOnSearch, setGlobalSelectedGame, setGlobalSearchQuery]);

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-no-cornhusk="true">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        
        {/* Game Selection View */}
        {currentView === 'games' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {games.filter(game => game.id !== 'all').map((game) => (
                <div
                  key={game.id}
                  className={`rounded-lg p-2 transition-colors border aspect-square ${
                    game.enabled === false 
                      ? 'opacity-50 cursor-not-allowed border-gray-500' 
                      : 'hover:bg-gray-800/50 cursor-pointer border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => game.enabled !== false && handleGameSelect(game)}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    {game.logo ? (
                      <SafeImage
                        src={game.logo}
                        alt={`${game.name} logo`}
                        className={`w-full h-full object-contain ${game.enabled === false ? 'grayscale' : ''}`}
                   onError={() => {}}
                   onLoad={() => {}}
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <span className={`text-xs font-medium ${game.enabled === false ? 'text-gray-500' : 'text-gray-400'}`}>
                              {game.name.charAt(0)}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className={`text-xs font-medium text-center ${game.enabled === false ? 'text-gray-500' : 'text-gray-400'}`}>
                          {game.name}
                        </span>
                      </div>
                    )}
                    {game.badge && (
                      <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[8px] px-1 py-0.5 rounded">
                        {game.badge}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expansions View */}
        {currentView === 'expansions' && (
          <div>
            {/* Mobile Header with Pokémon Logo */}
            {isMobile && (
              <div className="mb-6">
                {/* Pokémon Logo and Title Row with Toggle */}
                <div className="flex items-end justify-between mb-6">
                  {/* Title and Count - Bottom aligned with toggle */}
                  <div className="flex flex-col">
                    <h2 className="font-semibold text-white leading-tight" style={{ fontSize: '14px' }}>
                      {languageFilter === 'english' ? 'English Expansions' : 'Japanese Expansions'}
                    </h2>
                    <span className="text-xs text-gray-400 leading-tight mt-0.5">
                      {getFilteredExpansions().length} expansions found
                    </span>
                  </div>

                  {/* Logo and Toggle Container */}
                  <div className="flex flex-col items-end space-y-2">
                    {/* Pokémon Logo - Same width as toggle */}
                    <img 
                      src="https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png"
                      alt="Pokémon"
                      className="h-8 w-36 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    
                    {/* Language Toggle */}
                    <div className="relative inline-flex rounded-lg bg-gray-800 p-1">
                      <button
                        onClick={() => setLanguageFilter('english')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          languageFilter === 'english'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-transparent text-white hover:bg-gray-700'
                        }`}
                      >
                        ENG
                      </button>
                      <button
                        onClick={() => setLanguageFilter('japanese')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          languageFilter === 'japanese'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-transparent text-white hover:bg-gray-700'
                        }`}
                      >
                        JPN
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Filter Button Row - Above Grid */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Filter Button */}
                  <div className="bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setIsSeriesFilterOpen(true)}
                      className="flex items-center gap-2 px-3 py-1 text-xs text-white hover:bg-gray-600 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span>Filter</span>
                      {selectedSeries.length > 0 && (
                        <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {selectedSeries.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Active Filter Chips - Below Controls */}
                {selectedSeries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSeries.map(series => (
                      <div
                        key={series}
                        className="flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded-full text-xs"
                      >
                        <span>{series}</span>
                        <button
                          onClick={() => handleSeriesToggle(series)}
                          className="hover:bg-indigo-700 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={clearSeriesFilters}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Layout */}
            {!isMobile && (
              <div className="flex gap-6">
                {/* Series Filter Sidebar */}
                <div className="w-64 flex-shrink-0">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white">Filters</h3>
                      {selectedSeries.length > 0 && (
                        <button
                          onClick={clearSeriesFilters}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Series Filter */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-300 mb-2">Series</h4>
                      
                      {/* Series Search */}
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search series..."
                          value={seriesSearchQuery}
                          onChange={(e) => setSeriesSearchQuery(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      
                      {/* Series List */}
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {getUniqueSeries()
                          .filter(series => 
                            series.toLowerCase().includes(seriesSearchQuery.toLowerCase())
                          )
                          .map(series => {
                            const count = getSeriesCounts()[series] || 0;
                            const isSelected = selectedSeries.includes(series);
                            
                            return (
                              <div
                                key={series}
                                className="flex items-center justify-between p-1 hover:bg-gray-700 rounded cursor-pointer"
                                onClick={() => handleSeriesToggle(series)}
                              >
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSeriesToggle(series)}
                                    className="w-3 h-3 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                                  />
                                  <span className="text-xs text-gray-300 truncate">{series}</span>
                                </div>
                                <span className="text-xs text-gray-500">{count}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expansions Grid */}
                <div className="flex-1">
                  <div className="mb-6">
                    <div className="flex items-end justify-between">
                      {/* Title and Count - Bottom aligned with toggle */}
                      <div className="flex flex-col">
                        <h2 className="font-semibold text-white leading-tight" style={{ fontSize: '14px' }}>
                          {languageFilter === 'english' ? 'English Expansions' : 'Japanese Expansions'}
                        </h2>
                        <span className="text-xs text-gray-400 leading-tight mt-0.5">
                          {getFilteredExpansions().length} expansions found
                          {selectedSeries.length > 0 && (
                            <span className="text-indigo-400 ml-1">
                              (filtered by {selectedSeries.length} series)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Logo and Toggle Container */}
                      <div className="flex flex-col items-end space-y-2">
                        {/* Pokémon Logo - Same width as toggle */}
                        <img 
                          src="https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png"
                          alt="Pokémon"
                          className="h-8 w-36 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        
                        {/* Language Toggle */}
                        <div className="relative inline-flex rounded-lg bg-gray-800 p-1">
                          <button
                            onClick={() => setLanguageFilter('english')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              languageFilter === 'english'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-transparent text-white hover:bg-gray-700'
                            }`}
                          >
                            ENG
                          </button>
                          <button
                            onClick={() => setLanguageFilter('japanese')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              languageFilter === 'japanese'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-transparent text-white hover:bg-gray-700'
                            }`}
                          >
                            JPN
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {getFilteredExpansions()
                      .sort((a, b) => {
                        // Sort by release date (newest first)
                        const dateA = new Date(a.release_date);
                        const dateB = new Date(b.release_date);
                        return dateB - dateA;
                      })
                      .map((expansion, index) => (
                      <div
                        key={`${expansion.id}-${index}`}
                        className="rounded-lg pt-1 pb-6 px-1 hover:bg-gray-800/50 transition-colors cursor-pointer border border-gray-600 hover:border-gray-500"
                        onClick={() => handleExpansionSelect(expansion)}
                      >
                        <div className="aspect-[4/3] bg-transparent rounded-lg mb-0.5 overflow-hidden">
                          <SafeImage
                            src={expansion.logo}
                            alt={expansion.name}
                            className="w-full h-full object-contain scale-75"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <h3 className="font-medium text-white text-sm mb-0 text-center">{expansion.name}</h3>
                        <p className="text-xs text-gray-400 text-center">{expansion.total} cards</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Expansions Grid */}
            {isMobile && (
              <div className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin" size={48} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {getFilteredExpansions()
                      .sort((a, b) => {
                        // Sort by release date (newest first)
                        const dateA = new Date(a.release_date);
                        const dateB = new Date(b.release_date);
                        return dateB - dateA;
                      })
                      .map((expansion, index) => (
                      <div
                        key={`${expansion.id}-${index}`}
                        className="rounded-lg pt-1 pb-6 px-1 hover:bg-gray-800/50 transition-colors cursor-pointer border border-gray-600 hover:border-gray-500"
                        onClick={() => handleExpansionSelect(expansion)}
                      >
                        <div className="aspect-[4/3] bg-transparent rounded-lg mb-0.5 overflow-hidden">
                          <SafeImage
                            src={expansion.logo}
                            alt={expansion.name}
                            className="w-full h-full object-contain scale-75"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <h3 className="font-medium text-white text-sm mb-0 text-center">{expansion.name}</h3>
                        <p className="text-xs text-gray-400 text-center">{expansion.total} cards</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Series Filter Drawer */}
            {isMobile && (
              <div className={`fixed inset-0 z-50 transition-all duration-500 ease-in-out ${isSeriesFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div 
                  className={`absolute inset-0 bg-black transition-opacity duration-500 ease-in-out ${isSeriesFilterOpen ? 'bg-opacity-50' : 'bg-opacity-0'}`}
                  onClick={() => setIsSeriesFilterOpen(false)}
                />
                
                {/* Drawer */}
                <div className={`absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 flex flex-col transition-transform duration-500 ease-in-out ${isSeriesFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="text-sm font-medium text-white">Filter by Series</h3>
                    <button
                      onClick={() => setIsSeriesFilterOpen(false)}
                      className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Search */}
                  <div className="px-4 py-3 border-b border-gray-800">
                    <input
                      type="text"
                      placeholder="Search series..."
                      value={seriesSearchQuery}
                      onChange={(e) => setSeriesSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  
                  {/* Series List */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-2">
                      {getUniqueSeries()
                        .filter(series => 
                          series.toLowerCase().includes(seriesSearchQuery.toLowerCase())
                        )
                        .map(series => {
                          const count = getSeriesCounts()[series] || 0;
                          const isSelected = selectedSeries.includes(series);
                          
                          return (
                            <div
                              key={series}
                              className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                              onClick={() => handleSeriesToggle(series)}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSeriesToggle(series)}
                                  className="w-3.5 h-3.5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-xs text-white font-light">{series}</span>
                              </div>
                              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-gray-800">
                    <button
                      onClick={clearSeriesFilters}
                      className="w-full py-2 px-3 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors font-light"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search View */}
        {currentView === 'search' && (
          <>
            {/* Search Header with Logo and Results Count */}
            {!selectedExpansion && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-white mb-0" style={{ fontSize: '17px' }}>
                      Search Results
                    </h2>
                    {searchResults.length > 0 && (
                      <p className="text-gray-500" style={{ fontSize: '12px' }}>
                        {totalResults} results found
                      </p>
                    )}
                  </div>
                  <img 
                    src={selectedGame?.logo || "https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png"}
                    alt={selectedGame?.name || "Pokémon"}
                    className="h-10 w-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Breadcrumb Navigation */}
            {selectedExpansion && (
              <div className="mb-4">
                <nav className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={() => {
                      setCurrentView('expansions');
                      setSelectedExpansion(null);
                      setExpansionViewMode('singles');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Expansions
                  </button>
                  <span className="text-gray-500">/</span>
                  <span className="text-gray-400 font-medium">{selectedExpansion.name}</span>
                </nav>
              </div>
            )}

            {/* Expansion Details - Above card containers */}
            {selectedExpansion && (
              <div className="mb-4 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-white" style={{ fontSize: '17px' }}>
                      {selectedExpansion.name}
                    </h2>
                    <p className="text-gray-400" style={{ fontSize: '13px' }}>
                      {selectedExpansion.total} cards • Released {selectedExpansion.release_date}
                    </p>
                  </div>
                  <div style={{ height: '100%', maxWidth: '120px', overflow: 'hidden' }}>
                    <SafeImage
                      src={selectedExpansion.logo}
                      alt={selectedExpansion.name}
                      className="object-contain"
                      style={{ 
                        height: '100%', 
                        maxWidth: '120px',
                        width: 'auto'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            


        {/* Results Header with Toggle */}
        {(searchResults.length > 0 || (selectedExpansion && isLoading)) && (
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                {isLoading && selectedExpansion ? (
                  `Loading ${expansionViewMode === 'sealed' ? 'products' : 'cards'}...`
                ) : (
                  `${selectedExpansion ? totalResults : totalResults} ${selectedExpansion && expansionViewMode === 'sealed' ? 'products' : 'cards'} found`
                )}
              </p>
              {!isLoading && (
                <p className="text-xs text-gray-500 mt-1">
                  Scroll down to see more...
                </p>
              )}
            </div>
            
            
            {/* Singles/Sealed Toggle with Filter Button - Only show when viewing an expansion */}
            {selectedExpansion && (
              <div className="space-y-3">
                {/* Filter Controls Row */}
                <div className="flex items-center gap-1">
                  {/* Filter Button with Badge */}
                  <div className="relative">
                    {expansionViewMode === 'sealed' ? (
                      <button
                        onClick={togglePriceSorting}
                        className="h-9 w-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        title={priceSortOrder === 'asc' ? 'Sort by Price: Low to High' : 'Sort by Price: High to Low'}
                      >
                        {priceSortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsFilterSidebarOpen(true)}
                        className="h-9 w-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Filter and Sort"
                      >
                        <Filter className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {activeFilters.length > 0 && expansionViewMode !== 'sealed' && (
                      <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFilters.length}
                      </div>
                    )}
                  </div>
                  
                  {/* Singles/Sealed Toggle */}
                <div className="flex bg-gray-200 rounded-xl p-1">
                  <button
                    onClick={async () => {
                      setExpansionViewMode('singles');
                      setSearchResults([]); // Clear existing results
                      setTotalResults(0);
                      setHasMore(false);
                      setCurrentPage(1);
                      setIsLoading(true);
                      // Clear cache before performing search
                      await searchCacheService.forceClearAllCache();
                      performExpansionSearch(selectedExpansion.id, 1, false, 'singles', true, filterValues);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      expansionViewMode === 'singles'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Singles
                  </button>
                  <button
                    onClick={async () => {
                      setExpansionViewMode('sealed');
                      setSearchResults([]); // Clear existing results immediately
                      setTotalResults(0);
                      setHasMore(false);
                      setCurrentPage(1);
                      setIsLoading(true); // Show loading state
                      setPriceSortOrder('asc'); // Reset to low-to-high when switching to sealed
                      
                      performExpansionSearch(selectedExpansion.id, 1, false, 'sealed', true, filterValues);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      expansionViewMode === 'sealed'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Sealed
                  </button>
                </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <X size={20} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Active Filter Pills Row */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {activeFilters.map((filter, index) => (
              <div
                key={`${filter.type}-${filter.value}-${index}`}
                className="flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded-md text-xs"
              >
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.type, filter.value)}
                  className="hover:bg-indigo-700 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          </div>
        )}



        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {searchResults.map((card, index) => {
              const isInCart = cartItems.some(item => item.id === card.id);
              const isSelected = selectedItems.has(card.id);
              const cartItem = cartItems.find(item => item.id === card.id);
              
              return (
               <div
                 key={`${card.id}-${index}`}
                  className={`rounded-lg overflow-hidden border-gray-200 transition-colors cursor-pointer bg-white relative ${
                    contextMultiSelectMode
                      ? isSelected
                        ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300'
                        : 'border hover:bg-gray-100 hover:border-gray-300'
                      : 'border hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  onClick={(e) => {
                    handleCardClick(card);
                  }}
                  onMouseDown={(e) => {
                    handleCardPressStart(card);
                  }}
                  onMouseUp={handleCardPressEnd}
                  onMouseLeave={handleCardPressEnd}
                  onTouchStart={(e) => {
                    handleCardPressStart(card);
                  }}
                  onTouchEnd={handleCardPressEnd}
                >
                  {/* Card Content Wrapper - prevents child events from interfering */}
                  <div 
                    className="w-full h-full pointer-events-none"
                    style={{ pointerEvents: 'none' }}
               >
                 {/* Card Image - Top Section */}
                    <div className="aspect-[488/680] bg-transparent rounded-t-lg overflow-hidden p-2 pointer-events-none">
                  <SafeImage
                    src={card.image_url}
                    alt={card.name}
                        className="w-full h-full object-contain pointer-events-none"
                    onLoad={() => {}}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Card Info - Bottom Section */}
                    <div className="px-4 pb-3 pt-2 pointer-events-none">
                  {/* Card Info Group - Name, Set, Type */}
                  <div className="space-y-0.5 mb-2 pointer-events-none">
                    {/* Card Name */}
                    <h3 className="font-semibold text-white" style={{ fontSize: '12px' }}>{card.name}</h3>
                    
                    {/* Set Name */}
                    <p className="text-gray-400" style={{ fontSize: '12px' }}>{card.expansion_name || card.set_name || 'Unknown Set'}</p>
                    
                    {/* Rarity */}
                    <p className="text-blue-400" style={{ fontSize: '12px' }}>{card.rarity || card.item_type || 'No Rarity'}</p>
                  </div>
                  
                  {/* Pricing and Add Button */}
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="font-semibold text-white pointer-events-none" style={{ fontSize: '12px' }}>
                      {card.raw_price && (
                        <>
                          {formatPrice(card.raw_price)}
                          {card.raw_pricing?.trends?.days_7?.percent_change && (
                            <span className={`ml-1 ${getTrendColor(card.raw_pricing.trends.days_7.percent_change)}`}>
                              {formatTrendForCard(card.raw_pricing.trends.days_7.percent_change)}
                            </span>
                          )}
                        </>
                      )}
                      {!card.raw_price && card.graded_price && (
                        <>
                          {formatPrice(card.graded_price)}
                          {card.graded_pricing?.trends?.days_7?.percent_change && (
                            <span className={`ml-1 ${getTrendColor(card.graded_pricing.trends.days_7.percent_change)}`}>
                              {formatTrendForCard(card.graded_pricing.trends.days_7.percent_change)}
                            </span>
                          )}
                        </>
                      )}
                      {!card.raw_price && !card.graded_price && card.market_value_cents && (
                        <span className="text-white">
                          {formatPrice(card.market_value_cents / 100)}
                        </span>
                      )}
                      {!card.raw_price && !card.graded_price && !card.market_value_cents && (
                        <span className="text-gray-400">Pricing N/A</span>
                      )}
                    </div>
                    {contextMultiSelectMode ? (
                      <div className="flex items-center gap-1 pointer-events-none">
                        {isSelected ? (
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center pointer-events-none">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center pointer-events-none">
                            <span className="text-gray-400 text-xs">+</span>
                          </div>
                        )}
                      </div>
                    ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCollection(card);
                      }}
                        className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center transition-colors pointer-events-auto hover:border-gray-300 hover:bg-gray-700"
                      title="Add to Collection"
                    >
                        <span className="text-gray-400 text-xs hover:text-gray-300">+</span>
                    </button>
                    )}
                  </div>
                </div>
              </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Optimized loading indicator for infinite scroll */}
        {hasMore && (
          <div ref={loadingRef} className="flex justify-center py-4">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Scroll for more cards...</div>
            )}
          </div>
        )}

        {/* No Results Found Section */}
        {searchResults.length === 0 && !isLoading && !isLoadingMore && searchQuery.trim() && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No Results Found</h2>
              <p className="text-gray-400 mb-6">
                We couldn't find any results for "<span className="text-white font-medium">{searchQuery}</span>"
              </p>
              <div className="flex gap-3">
                <button
                  onClick={clearSearch}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Clear Search
                </button>
                <button
                  onClick={() => {
                    clearSearch();
                    setCurrentView('expansions');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Back to Expansions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Sealed Products Available Section */}
        {searchResults.length === 0 && !isLoading && selectedExpansion && expansionViewMode === 'sealed' && !searchQuery.trim() && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No Sealed Products Available</h2>
              <p className="text-gray-400 mb-6">
                There are currently no sealed products available for <span className="text-white font-medium">{selectedExpansion.name}</span>.
              </p>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setExpansionViewMode('singles');
                    setSearchResults([]);
                    setTotalResults(0);
                    setHasMore(false);
                    setCurrentPage(1);
                    setIsLoading(true);
                    performExpansionSearch(selectedExpansion.id, 1, false, 'singles', true, filterValues);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  View Singles Instead
                </button>
                <button
                  onClick={() => {
                    setCurrentView('expansions');
                    setSelectedExpansion(null);
                    setExpansionViewMode('singles');
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Back to Expansions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expansions Section (when no search results and no search query) */}
        {searchResults.length === 0 && !isLoading && !selectedExpansion && !searchQuery.trim() && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Popular Expansions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {expansions.slice(0, 12).map((expansion, index) => (
                <div
                  key={`${expansion.id}-${index}`}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer hover:border-gray-600 border border-transparent"
                  onClick={() => handleExpansionClick(expansion)}
                >
                  <div className="aspect-square bg-transparent rounded-lg mb-3 overflow-hidden">
                    <SafeImage
                      src={expansion.logo}
                      alt={expansion.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="font-medium text-white text-sm mb-1 truncate">{expansion.name}</h3>
                  <p className="text-xs text-gray-400">{expansion.total} cards</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {/* Manual Item Addition View */}
        {currentView === 'manual' && (
          <div>
            {/* Header Section - Expansion Style */}
            <div className="mb-6 p-4 bg-transparent rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SafeImage
                    src="https://i.ibb.co/vvBYXsQH/other.png"
                    alt="Other"
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <h2 className="text-lg font-bold text-white">Manually Added Items</h2>
                    <p className="text-gray-400 text-[13px]">Add your own collectibles</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentView('games');
                    setSelectedGame(games[0]); // Reset to first game
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Custom Items Display */}
            {isLoadingCustomItems ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin" size={48} />
              </div>
            ) : customItems.length > 0 ? (
              <div className="mt-8">
                {/* Results Row with Add Button */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    {customItems.length} items found
                  </p>
                  <button
                    onClick={() => setIsCustomItemModalOpen(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">+</span>
                    </div>
                    Add New Item
                  </button>
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isCustomSelectionMode ? 'pb-20' : ''}`}>
                  {customItems.map((item) => {
                    const isSelected = selectedCustomItems.has(item.id);
                    return (
                    <div
                      key={item.id}
                      className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                          : 'border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/70'
                      }`}
                      onTouchStart={(e) => {
                        if (isCustomSelectionMode) {
                          e.preventDefault();
                          handleCustomItemSelect(item.id);
                        } else {
                          // Long press to enter selection mode
                          setTimeout(() => {
                            if (!isCustomSelectionMode) {
                              handleCustomLongPress(item.id);
                            }
                          }, 500);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (isCustomSelectionMode) {
                          e.preventDefault();
                          handleCustomItemSelect(item.id);
                        } else {
                          // Long press to enter selection mode
                          setTimeout(() => {
                            if (!isCustomSelectionMode) {
                              handleCustomLongPress(item.id);
                            }
                          }, 500);
                        }
                      }}
                      onClick={(e) => {
                        if (isCustomSelectionMode) {
                          e.preventDefault();
                          handleCustomItemSelect(item.id);
                        }
                      }}
                    >
                      {/* Item Image */}
                      <div className="aspect-[488/680] bg-gray-900/50 rounded-t-xl overflow-hidden relative">
                        {item.image_url ? (
                          <SafeImage
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain p-2"
                            onLoad={() => {}}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${item.image_url ? 'hidden' : 'flex'}`}>
                          <div className="text-center">
                            <div className="text-2xl mb-1">📦</div>
                            <div className="text-gray-400 text-xs">No Image</div>
                          </div>
                        </div>
                      </div>

                      {/* Item Info - Bottom Section */}
                      <div className="p-3 space-y-1">
                        {/* Item Name - First Line */}
                        <div>
                          <h3 className="text-white leading-tight line-clamp-2 font-bold text-[11px] md:text-xs">
                            {item.name}
                          </h3>
                        </div>
                        
                        {/* Set Name - Ghost Text */}
                        <div className="text-[11px] md:text-xs text-gray-400 truncate">
                          {item.set_name || 'Custom Item'}
                        </div>
                        
                        {/* Status Text */}
                        <div className="text-[11px] md:text-xs text-blue-400 font-medium">
                          {item.item_type || 'Collectible'}
                        </div>
                        
                        {/* Market Value and Menu Button */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="font-bold text-white text-[11px] md:text-xs">
                            {item.market_value_cents ? formatPrice(item.market_value_cents / 100) : 'No Value'}
                          </div>
                          <div className="relative">
                            {isSelected ? (
                              <div className="text-indigo-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomItem(item);
                                  setShowCustomItemMenu(!showCustomItemMenu);
                                }}
                                className="bg-gray-700/50 hover:bg-gray-600/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                                title="Item Options"
                              >
                                <MoreVertical size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-8">
                {/* Results Row with Add Button */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    0 items found
                  </p>
                  <button
                    onClick={() => setIsCustomItemModalOpen(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">+</span>
                    </div>
                    Add New Item
                  </button>
                </div>
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Star size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-lg">No custom items yet</p>
                    <p className="text-sm">Add your first item using the button above</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Item Menu Dropdown */}
        {showCustomItemMenu && selectedCustomItem && (
          <div className="fixed inset-0 z-50" onClick={() => setShowCustomItemMenu(false)}>
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-xl shadow-xl">
              {/* Header */}
              <div className="px-4 py-4 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">Manage Custom Item</h2>
              </div>

              {/* Action Options */}
              <div className="pb-6">
                {/* Edit Item */}
                <button 
                  onClick={() => handleEditCustomItem(selectedCustomItem)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs font-medium text-white">Edit Item</div>
                      <div className="text-xs text-gray-400">Modify the details of this custom item.</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Delete Item */}
                <button 
                  onClick={() => handleDeleteCustomItem(selectedCustomItem)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs text-red-400 font-medium">Delete Item</div>
                      <div className="text-xs text-gray-400">Remove this item from your collection.</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Items Bulk Preview Bar - Fixed at bottom */}
        {isCustomSelectionMode && (
          <div className="fixed bottom-16 left-0 right-0 modal-overlay" style={{ zIndex: 10002 }}>
            <div className="bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 shadow-lg">
              <div className="px-4 py-2">
                {/* Top section with selection info and actions */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-400">
                      {selectedCustomItems.size} Selected
                    </span>
                    <button
                      onClick={selectAllCustomItems}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setShowCustomBulkMenu(true);
                        openModal();
                      }}
                      className={`px-2 py-1 rounded text-xs text-white font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap ${
                        showCustomBulkMenu ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      Actions
                      <svg className={`w-3 h-3 flex-shrink-0 transition-transform duration-300 ease-out ${showCustomBulkMenu ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={clearCustomSelection}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Border separator */}
                <div className="border-t border-gray-700/30 mx-0 my-1" />
                
                {/* Image previews */}
                <div className="flex items-center gap-3 overflow-x-auto py-2">
                  {customItems
                    .filter(item => selectedCustomItems.has(item.id))
                    .slice(0, 6)
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="relative group cursor-pointer flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCustomItemSelect(item.id);
                        }}
                      >
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-10 h-14 object-contain rounded transition-opacity group-hover:opacity-50"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        )}
                        {/* Hover overlay with remove button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  {selectedCustomItems.size > 6 && (
                    <div className="flex-shrink-0 w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-400">+{selectedCustomItems.size - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Items Bulk Actions Menu Overlay */}
        {showCustomBulkMenu && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
            onClick={() => {
              setShowCustomBulkMenu(false);
              closeModal();
            }}
          >
            <div 
              className="w-full bg-gray-950 border border-blue-400/50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-4 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">
                  Change {selectedCustomItems.size} Selection{selectedCustomItems.size !== 1 ? 's' : ''}
                </h2>
              </div>

              {/* Action Options */}
              <div className="pb-6">
                {/* Delete All Selected */}
                <button 
                  onClick={handleCustomBulkDelete}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs text-red-400 font-medium">Delete All Selected</div>
                      <div className="text-xs text-gray-400">Remove these items from your collection.</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state - only show one loading indicator */}
        {isLoading && searchResults.length === 0 && !isLoadingMore && (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin" size={48} />
              <p className="text-gray-400 text-sm">Searching...</p>
            </div>
          </div>
        )}

        {/* Debug: Show current view if not games */}
        {currentView !== 'games' && currentView !== 'expansions' && currentView !== 'search' && currentView !== 'manual' && (
          <div className="text-center py-12">
            <h2 className="text-xl text-white mb-4">Debug: Current View</h2>
            <p className="text-gray-400">Current view: {currentView}</p>
            <button 
              onClick={() => setCurrentView('games')}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Go to Browse by Game
            </button>
          </div>
        )}
      </div>

      {/* Card Preview Modal */}
      {isCardModalOpen && selectedCard && (
        <CardPreviewModal
          card={selectedCard}
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onAddToCollection={handleAddToCollection}
        />
      )}

      {/* Add to Collection Modal */}
      {isAddToCollectionModalOpen && selectedCardForCollection && (
        <AddToCollectionModal
          product={{
            name: selectedCardForCollection.name,
            set: selectedCardForCollection.set_name,
            marketValue: parseFloat(selectedCardForCollection.marketValue || selectedCardForCollection.market_value || 0),
            imageUrl: selectedCardForCollection.image_url,
            source: 'api',
            api_id: selectedCardForCollection.api_id,
            itemType: selectedCardForCollection.itemType || (selectedCardForCollection.supertype === 'Sealed Product' ? 'Sealed' : 'Single')
          }}
          isOpen={isAddToCollectionModalOpen}
          onClose={() => {
            setIsAddToCollectionModalOpen(false);
            setSelectedCardForCollection(null);
            closeModal();
          }}
          onSuccess={() => {
            setIsAddToCollectionModalOpen(false);
            setSelectedCardForCollection(null);
            closeModal();
            // Invalidate collection queries to refresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary });
          }}
        />
      )}


      {/* Cart Bottom Menu */}
      <CartBottomMenu
        cartItems={cartItems}
        isOpen={isCartMenuOpen}
        onClose={contextCloseCartMenu}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCreateOrder={createOrderDirectly}
        onCancel={cancelMultiSelect}
        onDone={exitMultiSelectMode}
        isMultiSelectMode={contextMultiSelectMode}
        hasOtherModalsActive={isCardModalOpen || isAddToCollectionModalOpen || isCustomItemModalOpen || showCustomItemMenu || showCustomBulkMenu}
      />

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => {
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
        }}
        onSuccess={(successInfo) => {
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
          // Refresh custom items list
          fetchCustomItems();
        }}
        editingItem={selectedCustomItem}
      />

      {/* Filter Sidebar */}
      {isFilterSidebarOpen && (
        <div className="fixed inset-0 z-[1100] overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsFilterSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="absolute right-0 top-0 h-full w-80 bg-gray-900 shadow-xl transform transition-transform">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-medium text-white">Advanced Filters</h2>
                <button
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Global Search Bar */}
                <div className="p-4">
                  <input
                    type="text"
                    placeholder="Search series..."
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                
                {/* Filter Categories */}
                <div className="px-4 pb-4">
                  {Object.entries(filterCategories).map(([filterType, filterLabel]) => (
                    <div key={filterType} className="border-b border-gray-700 last:border-b-0">
                      {filterType === 'sorting' ? (
                        /* Always visible sort controls - no expandable header */
                        <div className="px-2 py-3">
                          <h3 className="text-xs text-white font-medium mb-3">Sort By</h3>
                          
                          {/* Sort By Selection */}
                          <div className="space-y-1 mb-4">
                            <button
                              onClick={() => {
                                setSortBy('number');
                                applyFilters(null, 'number', sortOrder);
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                                sortBy === 'number'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Card Number
                            </button>
                            <button
                              onClick={() => {
                                setSortBy('name');
                                applyFilters(null, 'name', sortOrder);
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                                sortBy === 'name'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Name
                            </button>
                            <button
                              onClick={() => {
                                setSortBy('raw_market');
                                applyFilters(null, 'raw_market', sortOrder);
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                                sortBy === 'raw_market'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Raw Price
                            </button>
                            <button
                              onClick={() => {
                                setSortBy('graded_market');
                                applyFilters(null, 'graded_market', sortOrder);
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                                sortBy === 'graded_market'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Graded Price
                            </button>
                          </div>
                          
                          {/* Dynamic Sort Order Buttons */}
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => {
                                setSortOrder('desc');
                                applyFilters(null, sortBy, 'desc');
                              }}
                              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                sortOrder === 'desc'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              {getSortButtonText(sortBy, 'desc')}
                            </button>
                            <button
                              onClick={() => {
                                setSortOrder('asc');
                                applyFilters(null, sortBy, 'asc');
                              }}
                              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                sortOrder === 'asc'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              {getSortButtonText(sortBy, 'asc')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Regular expandable filter categories */
                        <>
                          {/* Category Header */}
                          <button
                            onClick={() => toggleFilterExpansion(filterType)}
                            className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-800 rounded-md transition-colors"
                          >
                            <span className="text-xs text-white font-medium">{filterLabel}</span>
                            <span className="text-xs text-white">
                              {expandedFilters[filterType] ? '-' : '+'}
                            </span>
                          </button>
                          
                            {expandedFilters[filterType] ? (
                              /* Regular filter options - only show when expanded */
                              <div className="pl-4 pb-2">
                                {getFilterOptions(filterType, globalSearchTerm).map((option) => (
                                  <div
                                    key={`${filterType}-${option.value}`}
                                    className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                                    onClick={() => toggleFilterValue(filterType, option.value)}
                                  >
                                    <div className="flex items-center">
                                      {option.icon && (
                                        <div className="w-4 h-4 mr-3 flex items-center justify-center">
                                          {option.icon}
                                        </div>
                                      )}
                                      <span className="text-xs text-white">{option.label}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full mr-3">
                                        {getDynamicFilterCounts(filterType)[option.value] || 0}
                                      </span>
                                      <input
                                        type="checkbox"
                                        checked={filterValues[filterType]?.includes(option.value) || false}
                                        onChange={() => {}} // Handled by parent onClick
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFilterValue(filterType, option.value);
                                        }} // Handle click directly and prevent bubbling
                                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 pointer-events-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </>
                        )}
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }}
          className="fixed bottom-20 right-6 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out z-50 border border-gray-600 hover:border-gray-500"
          style={{
            transform: showBackToTop ? 'scale(1)' : 'scale(0)',
            opacity: showBackToTop ? 1 : 0
          }}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}

      {/* Multi-Order Processing Popup */}
      {showMultiOrderProcessing && multiOrderSuccessData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
            {/* Spinning Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full opacity-20"></div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Creating Order</h3>
              <div className="text-sm text-gray-300 space-y-1 mb-4">
                <p><span className="font-medium">{multiOrderSuccessData.itemCount} items</span> selected</p>
                <p className="text-indigo-400 font-medium">${multiOrderSuccessData.totalValue.toFixed(2)}</p>
              </div>
              <p className="text-xs text-gray-400">Adding to your collection...</p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Order Success Popup */}
      {showMultiOrderSuccess && multiOrderSuccessData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
            {/* Success Animation */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Order Created!</h3>
              <div className="text-sm text-gray-300 space-y-1 mb-4">
                <p><span className="font-medium">{multiOrderSuccessData.itemCount} items</span> added to collection</p>
                <p className="text-indigo-400 font-medium">${multiOrderSuccessData.totalValue.toFixed(2)}</p>
              </div>
              <p className="text-xs text-gray-400">Your collection has been updated</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchApi;
