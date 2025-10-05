import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, Star, X, ChevronDown, Plus, MoreVertical } from 'lucide-react';
import scrydexApiService from '../services/scrydexApiService';
import hybridSearchService from '../services/hybridSearchService';
import priceChartingApiService from '../services/priceChartingApiService';
import tcggoImageService from '../services/tcggoImageService';
import SafeImage from '../components/SafeImage';
import CardPreviewModal from '../components/CardPreviewModal';
import CustomItemModal from '../components/CustomItemModal';
import { supabase } from '../lib/supabaseClient';
import { useModal } from '../contexts/ModalContext';

const SearchApi = () => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  
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
      color: 'from-yellow-500 to-blue-600'
    },
    {
      id: 'lorcana',
      name: 'Disney Lorcana',
      logo: 'https://scrydex.com/assets/tcgs/logo_lorcana-7127a308645f2a2d4eb4e9b38f1928a157960ed9ae4cab839952de98c902816e.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_lorcana-f68779c6b7609ad758b3126d347ea1e2cf8bb3944edb52a2d620b73f2ee8a300.png',
      description: 'Disney\'s magical trading card game',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'magic',
      name: 'Magic: The Gathering',
      logo: 'https://scrydex.com/assets/tcgs/logo_mtg-a99225ad3a6ecb7c7fdc9c579a187289aee78c3eeb577f92086dcc8a57f1738e.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_magicthegathering-e2151698e87443ceccb0ad4b6c98dac19d1b244cce24bac76f52c506046d5833.png',
      description: 'The original trading card game',
      color: 'from-red-500 to-orange-600'
    },
    {
      id: 'gundam',
      name: 'Gundam Card Game',
      logo: 'https://scrydex.com/assets/tcgs/logo_gundam-2e130fb7d7d5b295a6377c6994657d0b0041fdf13158e72709f7a21bb01e9a2a.png',
      icon: 'https://scrydex.com/assets/tcgs/icon_gundam-72d1c7c2890e7862b3c52b4d8851825dea709a8f279d70dd19c12aaea1e4462c.png',
      description: 'Mobile Suit Gundam trading cards',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'other',
      name: 'Other',
      logo: 'https://i.ibb.co/vvBYXsQH/other.png',
      icon: 'https://i.ibb.co/FLvRvfGM/other-icon.png',
      description: 'Manually added products',
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'coming-soon',
      name: 'More Coming Soon',
      logo: null,
      icon: null,
      description: 'Additional trading card games',
      color: 'from-gray-400 to-gray-500',
      badge: 'SOON'
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
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState([]);
  const [isLoadingCustomItems, setIsLoadingCustomItems] = useState(false);
  const [selectedCustomItem, setSelectedCustomItem] = useState(null);
  const [showCustomItemMenu, setShowCustomItemMenu] = useState(false);
  
  // Bulk selection for custom items
  const [selectedCustomItems, setSelectedCustomItems] = useState(new Set());
  const [isCustomSelectionMode, setIsCustomSelectionMode] = useState(false);
  const [showCustomBulkMenu, setShowCustomBulkMenu] = useState(false);
  
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
        return 'Search for anything...';
      case 'pokemon':
        return 'Search for Pokémon...';
      case 'lorcana':
        return 'Search for Lorcana...';
      case 'magic':
        return 'Search for Magic: The Gathering...';
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
      // Get image URL from the images array
      const frontImage = card.images?.find(img => img.type === 'front');
      const imageUrl = frontImage?.large || frontImage?.medium || frontImage?.small || null;
      
      // Use card name with card number
      let displayName = card.name;
      if (card.number) {
        displayName = `${card.name} #${card.number}`;
      }
      
      // Get pricing data from the first variant (usually the normal variant)
      let rawPrice = null;
      let gradedPrice = null;
      
      if (card.variants && card.variants.length > 0) {
        const firstVariant = card.variants[0];
        if (firstVariant.prices && firstVariant.prices.length > 0) {
          rawPrice = firstVariant.prices.find(p => p.type === 'raw');
          gradedPrice = firstVariant.prices.find(p => p.type === 'graded');
        }
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
        expansion_id: card.expansion?.id || null,
        expansion_name: card.expansion?.name || null,
        image_url: imageUrl,
        image_url_large: frontImage?.large || imageUrl,
        variants: card.variants || [], // Keep all variants together
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
    // Skip TCGGo image enhancement for now due to 401 errors
    // TODO: Re-enable when TCGGo service is fixed
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

  // Initialize component - initialize API services and load expansions on mount
  useEffect(() => {
    const initializeAndLoad = async () => {
             try {
               // Initialize all services
               await scrydexApiService.initialize();
               await hybridSearchService.initialize();
               await tcggoImageService.initialize();
               await loadExpansions();
               
               // Mark services as initialized
               setServicesInitialized(true);
             } catch (error) {
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
    };
  }, []);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + document.documentElement.scrollTop;
      const documentHeight = document.documentElement.offsetHeight;
      const threshold = 1000;
      
      console.log('🔄 Scroll check:', { 
        scrollPosition, 
        documentHeight, 
        threshold, 
        hasMore, 
        isLoadingMore,
        shouldLoad: scrollPosition >= documentHeight - threshold && hasMore && !isLoadingMore
      });
      
      if (scrollPosition >= documentHeight - threshold && hasMore && !isLoadingMore) {
        console.log('🔄 Scroll threshold reached, calling loadMoreResults');
        loadMoreResults();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, currentPage, searchQuery, selectedExpansion, expansionViewMode]);

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
      // Fetch both English and Japanese expansions
      const [englishResult, japaneseResult] = await Promise.all([
        scrydexApiService.getExpansions({ pageSize: 500 }), // English (default)
        scrydexApiService.getExpansions({ pageSize: 500, testJapanese: true }) // Japanese
      ]);
      
      // Merge both results
      const allExpansions = [...englishResult, ...japaneseResult];
      
      setExpansions(allExpansions);
    } catch (error) {
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
    setIsLoading(true);
    setError(null);

    try {
      // Check if services are initialized
      if (!servicesInitialized) {
        console.log('⏳ Services not ready, waiting for initialization...');
        setError('Search services are still initializing. Please wait a moment and try again.');
        setIsLoading(false);
        return;
      }

      const searchOptions = {
        page,
        pageSize: 20, // Smaller page size for smoother infinite scroll
        expansionId: selectedExpansion?.id || null
      };

      // Use hybrid search service to search both singles and sealed products
      const results = await hybridSearchService.smartSearch(query, selectedGame?.id || 'pokemon', {
        page,
        pageSize: 20
      });
      
      
      // Combine singles and sealed products
      const allResults = [];
      
      // Add singles from Scrydex
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
          source: 'scrydex'
        })));
      }
      
      // Add sealed products from PriceCharting
      if (results.sealed && results.sealed.length > 0) {
        allResults.push(...results.sealed.map(product => ({
          ...product,
          source: 'pricecharting'
        })));
      }
      

      // Enhance results with TCGGo images (only for PriceCharting items)
      const enhancedResults = await enhanceResultsWithTcgGoImages(allResults);

      if (append) {
        setSearchResults(prev => [...prev, ...enhancedResults]);
      } else {
        setSearchResults(enhancedResults);
      }

      // Set pagination info
      const totalFromResults = results.total || (results.singles?.total || 0) + (results.sealed?.total || 0);
      setTotalResults(totalFromResults);
      setHasMore(enhancedResults.length >= 20 && (page * 20) < totalFromResults);
      setCurrentPage(page);

    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search cards. Please try again.');
      if (page === 1) {
        setSearchResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input with debouncing
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to debounce the search
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      
      // Clear expansion selection when using top search bar
      if (selectedExpansion) {
        setSelectedExpansion(null);
        setExpansionViewMode('singles');
      }
      
      // Always perform general search when using top search bar
      performSearch(searchQuery, 1, false);
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
  };

  // Handle expansion selection (legacy function - now handled by handleExpansionSelect)
  const handleExpansionClick = async (expansion) => {
    handleExpansionSelect(expansion);
  };

  // Perform search for cards in a specific expansion
  const performExpansionSearch = async (expansionId, page = 1, append = false, viewMode = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchOptions = {
        page,
        pageSize: 20, // Smaller page size for smoother infinite scroll
        expansionId: expansionId,
      };

      let results;
      const currentViewMode = viewMode || expansionViewMode;
      
      if (currentViewMode === 'sealed') {
        // Get sealed products for this expansion (Scrydex first, then PriceCharting fallback)
        console.log(`🔍 Getting sealed products for expansion: ${selectedExpansion?.name} (${selectedExpansion?.code})`);
        console.log(`🔍 Full expansion object:`, selectedExpansion);
        
        const sealedResults = await hybridSearchService.getSealedProductsForExpansion(expansionId, {
          page,
          pageSize: 20
        });
        
        console.log(`📦 Sealed results source: ${sealedResults.source}, count: ${sealedResults.data?.length || 0}`);
        
        results = {
          singles: [],
          sealed: sealedResults.data || [],
          total: sealedResults.total || 0
        };
      } else {
        // Search for singles from Scrydex for this expansion
        console.log(`🔍 Searching singles for expansion: ${expansionId}`);
        const result = await scrydexApiService.searchCards('', searchOptions);
        
        // Format the results to match expected structure
        results = {
          singles: result.data || [],
          sealed: [],
          total: result.total || result.totalCount || 0
        };
      }
      
      // Process results based on view mode
      let allResults = [];
      
      if (currentViewMode === 'sealed') {
        // Add sealed products (already filtered by hybrid service)
        if (results.sealed && results.sealed.length > 0) {
          console.log('📦 Adding filtered sealed products:', results.sealed.length);
          
          // Format sealed products using PriceCharting service
          const formattedSealed = results.sealed.map(product => {
            // If product is already formatted, use it as-is
            if (product.name && product.set_name && product.market_value !== undefined) {
              return {
                ...product,
                source: product.source || 'pricecharting'
              };
            }
            
            // Otherwise, format the raw PriceCharting data
            return {
              ...priceChartingApiService.formatProductData(product),
              source: 'pricecharting'
            };
          });
          
          allResults.push(...formattedSealed);
        }
      } else {
        // Add singles from Scrydex
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
          
          console.log('🚫 Filtered out TCG Pocket cards:', formattedSingles.length - filteredSingles.length);
          console.log('✅ Final singles count:', filteredSingles.length);
          
          allResults.push(...filteredSingles.map(card => ({
            ...card,
            source: 'scrydex'
          })));
        }
      }
      

      // Enhance results with TCGGo images (only for PriceCharting items)
      const enhancedResults = await enhanceResultsWithTcgGoImages(allResults);

      if (append) {
        setSearchResults(prev => [...prev, ...enhancedResults]);
      } else {
        console.log('🔄 Setting search results:', enhancedResults.length, 'items');
        console.log('🔄 View mode:', expansionViewMode);
        console.log('🔄 Enhanced results:', enhancedResults);
        setSearchResults(enhancedResults);
      }

      // Set pagination info
      let totalFromResults;
      if (currentViewMode === 'sealed') {
        totalFromResults = results.total || results.sealed?.total || 0;
      } else {
        totalFromResults = results.total || results.singles?.total || 0;
      }
      console.log('🔄 Pagination info:', { 
        page, 
        enhancedResultsLength: enhancedResults.length, 
        totalFromResults, 
        hasMore: enhancedResults.length >= 20 && (page * 20) < totalFromResults,
        calculation: `${enhancedResults.length} >= 20 && (${page} * 20) < ${totalFromResults}`
      });
      setTotalResults(totalFromResults);
      setHasMore(enhancedResults.length >= 20 && (page * 20) < totalFromResults);
      setCurrentPage(page);

    } catch (error) {
      console.error('Expansion search error:', error);
      setError('Failed to load expansion cards. Please try again.');
      if (page === 1) {
        setSearchResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Infinite scroll setup
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMoreResults();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Start loading 100px before the element comes into view
      }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore]); 

  // Handle card click
  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };

  // Handle add to collection - navigate to add item page with pre-filled data
  const handleAddToCollection = (card) => {
    // Prepare card data for the add item page
    const cardData = {
      name: card.name,
      set_name: card.expansion_name || card.set_name,
      item_type: 'Card',
      market_value: card.raw_price || card.graded_price || 0,
      image_url: card.image_url,
      description: `${card.rarity} card from ${card.expansion_name || card.set_name}`,
      number: card.number,
      rarity: card.rarity,
      source: 'api',
      api_id: card.id
    };
    
    // Navigate to collection page and trigger the modal instantly
    navigate('/', { state: { showAddModal: true, prefilledData: cardData } });
  };

  // Navigation functions
  const handleGameSelect = (game) => {
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
      // For Pokémon, show expansions view
      setSelectedGame(game);
      setCurrentView('expansions');
      // Load Pokémon expansions and show them
      loadExpansions();
    } else if (game.id === 'other') {
      // For Other, show manual item addition view
      setSelectedGame(game);
      setCurrentView('manual');
    } else {
      // For other games, show expansions view
      setSelectedGame(game);
      setCurrentView('expansions');
    }
  };

  const handleExpansionSelect = (expansion) => {
    setSelectedExpansion(expansion);
    setCurrentView('search');
    // Automatically search for cards in this expansion
    performExpansionSearch(expansion.id, 1);
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
  };

  const handleBackToExpansions = () => {
    setCurrentView('expansions');
    setSelectedExpansion(null);
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
  };

  // Clear search and filters
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasMore(false);
    setCurrentPage(1);
  };

  // Load more results for infinite scroll
  const loadMoreResults = async () => {
    console.log('🔄 loadMoreResults called:', { hasMore, isLoadingMore, currentPage, selectedExpansion: selectedExpansion?.id });
    if (!hasMore || isLoadingMore) {
      console.log('🔄 loadMoreResults skipped:', { hasMore, isLoadingMore });
      return;
    }
    
    setIsLoadingMore(true);
    try {
      if (selectedExpansion) {
        console.log('🔄 Loading more expansion results for:', selectedExpansion.id, 'page:', currentPage + 1);
        // Load more results for expansion search
        await performExpansionSearch(selectedExpansion.id, currentPage + 1, true);
      } else if (searchQuery.trim()) {
        console.log('🔄 Loading more search results for:', searchQuery, 'page:', currentPage + 1);
        // Load more results for regular search
        await performSearch(searchQuery, currentPage + 1, true);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return null;
    return `$${parseFloat(price).toFixed(2)}`;
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


  return (
    <div className="min-h-screen bg-gray-900 text-white" data-no-cornhusk="true">
      {/* Fixed Header - Scrydex Style */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800">
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
          </div>
          
          {/* Search Bar - No border */}
          <form onSubmit={handleSearch} className="flex items-center flex-1 h-full bg-gray-950 rounded-lg mr-0">
            {/* Search Input */}
            <div className="flex-1 relative h-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Auto-search when user types (with debounce) - only if services are ready
                  if (e.target.value.trim() && servicesInitialized) {
                    setCurrentView('search');
                    // Clear expansion selection when typing in search bar
                    if (selectedExpansion) {
                      setSelectedExpansion(null);
                      setExpansionViewMode('singles');
                    }
                    clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = setTimeout(() => {
                      performSearch(e.target.value, 1, false);
                    }, 500); // 500ms debounce
                  } else if (!servicesInitialized) {
                    setError('Search services are still initializing. Please wait a moment and try again.');
                  } else {
                    clearSearch();
                  }
                }}
                placeholder={getSearchPlaceholder()}
                className="w-full h-full px-4 bg-transparent text-white placeholder-gray-400 focus:outline-none"
              />
              {/* Clear button inside search bar */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Search Icon */}
            <button
              type="submit"
              className="p-3 h-full text-gray-400 hover:text-white transition-colors rounded-r-lg"
            >
              <Search size={18} />
            </button>
          </form>
        </div>
        
        {/* Game Dropdown - Full Width with Outline Borders */}
        {showGameDropdown && (
          <div className="game-dropdown absolute top-[50px] left-0 right-0 bg-gray-950 border-b border-gray-600 shadow-lg z-50">
            <div className="px-4 py-3 text-[11px] text-gray-400 border-b border-gray-600 font-medium">TCGs</div>
            {games.filter(game => game.id !== 'coming-soon').map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    handleGameSelect(game);
                    setShowGameDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 ${
                    selectedGame?.id === game.id ? 'bg-indigo-900/30 border-l-4 border-l-indigo-400' : ''
                  }`}
                >
                  {renderGameIcon(game.icon, "w-5 h-5")}
                  <span className="text-white text-[11px] font-medium">{game.name}</span>
                </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 pt-[66px]">
        
        {/* Game Selection View */}
        {currentView === 'games' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {games.filter(game => game.id !== 'all').map((game) => (
                <div
                  key={game.id}
                  className="rounded-lg p-2 hover:bg-indigo-900/30 transition-colors cursor-pointer border border-gray-600 hover:border-indigo-400 aspect-square"
                  onClick={() => handleGameSelect(game)}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    {game.logo ? (
                      <SafeImage
                        src={game.logo}
                        alt={`${game.name} logo`}
                        className="w-full h-full object-contain"
                   onError={(e) => {
                     console.log('Game logo failed to load:', game.logo, 'Error:', e);
                   }}
                   onLoad={() => {
                     console.log('Game logo loaded successfully:', game.logo);
                   }}
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-medium">
                              {game.name.charAt(0)}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs font-medium text-center">
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
                {/* Pokémon Logo and Title Row */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-white mb-0" style={{ fontSize: '17px' }}>
                      {languageFilter === 'english' ? 'English Expansions' : 'Japanese Expansions'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getFilteredExpansions().length} expansions
                    </p>
                  </div>
                  <img 
                    src="https://scrydex.com/assets/tcgs/logo_pokemon-8a159e17ae61d5720bfe605ab12acde3a8d7e5ff986e9979c353f66396b500f2.png"
                    alt="Pokémon"
                    className="h-10 w-auto"
                    onError={(e) => {
                      console.log('Pokémon logo failed to load');
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Controls Row - Above Grid */}
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
                  
                  {/* Right Side - Language Toggle */}
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setLanguageFilter('english')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        languageFilter === 'english'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      ENG
                    </button>
                    <button
                      onClick={() => setLanguageFilter('japanese')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        languageFilter === 'japanese'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      JPN
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-white mb-0">
                          {languageFilter === 'english' ? 'English Expansions' : 'Japanese Expansions'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {getFilteredExpansions().length} expansions
                          {selectedSeries.length > 0 && (
                            <span className="text-indigo-400 ml-1">
                              (filtered by {selectedSeries.length} series)
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Language Toggle */}
                      <div className="flex items-center">
                        <div className="flex bg-gray-700 rounded-lg p-1">
                          <button
                            onClick={() => setLanguageFilter('english')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              languageFilter === 'english'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:text-white'
                            }`}
                          >
                            ENG
                          </button>
                          <button
                            onClick={() => setLanguageFilter('japanese')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              languageFilter === 'japanese'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:text-white'
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
                        className="rounded-lg pt-1 pb-6 px-1 hover:bg-indigo-900/30 transition-colors cursor-pointer border border-gray-600 hover:border-indigo-400"
                        onClick={() => handleExpansionSelect(expansion)}
                      >
                        <div className="aspect-[4/3] bg-transparent rounded-lg mb-0.5 overflow-hidden">
                          <SafeImage
                            src={expansion.logo}
                            alt={expansion.name}
                            className="w-full h-full object-contain scale-75"
                            onError={(e) => {
                              console.log('Expansion logo failed to load:', expansion.logo);
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
                        className="rounded-lg pt-1 pb-6 px-1 hover:bg-indigo-900/30 transition-colors cursor-pointer border border-gray-600 hover:border-indigo-400"
                        onClick={() => handleExpansionSelect(expansion)}
                      >
                        <div className="aspect-[4/3] bg-transparent rounded-lg mb-0.5 overflow-hidden">
                          <SafeImage
                            src={expansion.logo}
                            alt={expansion.name}
                            className="w-full h-full object-contain scale-75"
                            onError={(e) => {
                              console.log('Expansion logo failed to load:', expansion.logo);
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
                        console.log('Expansion logo failed to load:', selectedExpansion.logo);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            


        {/* Results Header with Toggle */}
        {searchResults.length > 0 && (
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                {searchResults.length}/{totalResults} {selectedExpansion && expansionViewMode === 'sealed' ? 'products' : 'cards'} found
              </p>
              {hasMore && (
                <p className="text-xs text-gray-500 mt-1">
                  Scroll down to load more...
                </p>
              )}
            </div>
            
            {/* Singles/Sealed Toggle - Only show when viewing an expansion */}
            {selectedExpansion && (
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => {
                    setExpansionViewMode('singles');
                    setSearchResults([]); // Clear existing results
                    setTotalResults(0);
                    setHasMore(false);
                    setCurrentPage(1);
                    setIsLoading(true);
                    performExpansionSearch(selectedExpansion.id, 1, false, 'singles');
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    expansionViewMode === 'singles'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Singles
                </button>
                <button
                  onClick={() => {
                    setExpansionViewMode('sealed');
                    setSearchResults([]); // Clear existing results immediately
                    setTotalResults(0);
                    setHasMore(false);
                    setCurrentPage(1);
                    setIsLoading(true); // Show loading state
                    performExpansionSearch(selectedExpansion.id, 1, false, 'sealed');
                  }}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    expansionViewMode === 'sealed'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sealed
                </button>
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

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {searchResults.map((card, index) => (
               <div
                 key={`${card.id}-${index}`}
                 className="rounded-lg overflow-hidden border border-gray-700 hover:bg-indigo-900/30 hover:border-indigo-400 transition-colors cursor-pointer bg-transparent"
                 onClick={() => handleCardClick(card)}
               >
                 {/* Card Image - Top Section */}
                 <div className="aspect-[488/680] bg-transparent rounded-t-lg overflow-hidden p-2">
                  <SafeImage
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-contain"
                    onLoad={() => {
                      console.log('Image loaded successfully:', card.image_url);
                    }}
                    onError={(e) => {
                      console.log('Image failed to load:', card.image_url);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Card Info - Bottom Section */}
                <div className="px-4 pb-3 pt-2">
                  {/* Card Info Group - Name, Set, Type */}
                  <div className="space-y-0.5 mb-2">
                    {/* Card Name */}
                    <h3 className="font-semibold text-white text-xs">{card.name}</h3>
                    
                    {/* Set Name */}
                    <p className="text-gray-400 text-xs">{card.expansion_name || card.set_name || 'Unknown Set'}</p>
                    
                    {/* Rarity */}
                    <p className="text-blue-400 text-xs">{card.rarity || card.item_type || 'No Rarity'}</p>
                  </div>
                  
                  {/* Pricing and Add Button */}
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white text-xs">
                      {formatPrice(card.raw_price) && (
                        <>
                          {formatPrice(card.raw_price)}
                          {card.raw_pricing?.trends?.days_7?.percent_change && (
                            <span className={`ml-1 ${getTrendColor(card.raw_pricing.trends.days_7.percent_change)}`}>
                              {formatTrendForCard(card.raw_pricing.trends.days_7.percent_change)}
                            </span>
                          )}
                        </>
                      )}
                      {!formatPrice(card.raw_price) && formatPrice(card.graded_price) && (
                        <>
                          {formatPrice(card.graded_price)}
                          {card.graded_pricing?.trends?.days_7?.percent_change && (
                            <span className={`ml-1 ${getTrendColor(card.graded_pricing.trends.days_7.percent_change)}`}>
                              {formatTrendForCard(card.graded_pricing.trends.days_7.percent_change)}
                            </span>
                          )}
                        </>
                      )}
                      {!formatPrice(card.raw_price) && !formatPrice(card.graded_price) && card.market_value_cents && (
                        <span className="text-white">
                          ${(card.market_value_cents / 100).toFixed(2)}
                        </span>
                      )}
                      {!formatPrice(card.raw_price) && !formatPrice(card.graded_price) && !formatPrice(card.market_value_cents / 100) && (
                        <span className="text-gray-400">Pricing N/A</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCollection(card);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                      title="Add to Collection"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator for infinite scroll */}
        {hasMore && isLoadingMore && (
          <div ref={loadingRef} className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm">Loading more cards...</span>
            </div>
          </div>
        )}

        {/* No Results Found Section */}
        {searchResults.length === 0 && !isLoading && searchQuery.trim() && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-semibold text-white mb-2">No Results Found</h2>
              <p className="text-gray-400 mb-6">
                We couldn't find any results for "<span className="text-white font-medium">{searchQuery}</span>"
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setTotalResults(0);
                    setHasMore(false);
                    setSelectedExpansion(null);
                    setExpansionViewMode('singles');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Clear Search
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setTotalResults(0);
                    setHasMore(false);
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
                  onClick={() => {
                    setExpansionViewMode('singles');
                    setSearchResults([]);
                    setTotalResults(0);
                    setHasMore(false);
                    setCurrentPage(1);
                    setIsLoading(true);
                    performExpansionSearch(selectedExpansion.id, 1, false, 'singles');
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
                  className="bg-gray-800 rounded-lg p-4 hover:bg-indigo-900/30 transition-colors cursor-pointer hover:border-indigo-400 border border-transparent"
                  onClick={() => handleExpansionClick(expansion)}
                >
                  <div className="aspect-square bg-transparent rounded-lg mb-3 overflow-hidden">
                    <SafeImage
                      src={expansion.logo}
                      alt={expansion.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.log('Expansion logo failed to load:', expansion.logo);
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
                      console.log('Other logo failed to load');
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
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Add New Item
                  </button>
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isCustomSelectionMode ? 'pb-20' : ''}`}>
                  {customItems.map((item) => {
                    const isSelected = selectedCustomItems.has(item.id);
                    return (
                    <div
                      key={item.id}
                      className={`bg-gray-800 rounded-lg border border-gray-700 transition-colors ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-900/20 shadow-indigo-400/25' 
                          : 'hover:bg-indigo-900/30 hover:border-indigo-400'
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
                      <div className="aspect-[488/680] bg-transparent rounded-t-lg overflow-hidden p-2">
                        <div 
                          className="w-full h-full flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: item.background_color || '#f3f4f6' }}
                        >
                          <SafeImage
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            onLoad={() => {
                              console.log('Custom item image loaded successfully:', item.image_url);
                            }}
                            onError={(e) => {
                              console.log('Custom item image failed to load:', item.image_url, 'Error:', e);
                              e.target.style.display = 'none';
                            }}
                            fallback={
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400 text-xs font-medium">
                                  {item.name.charAt(0)}
                                </span>
                              </div>
                            }
                          />
                        </div>
                      </div>

                      {/* Item Info - Bottom Section */}
                      <div className="px-4 pb-3 pt-2">
                        {/* Item Info Group - Name, Set, Type */}
                        <div className="space-y-0.5 mb-2">
                          {/* Item Name */}
                          <h3 className="font-semibold text-white text-xs">{item.name}</h3>
                          
                          {/* Set Name */}
                          <p className="text-gray-400 text-xs">{item.set_name || 'Unknown Set'}</p>
                          
                          {/* Type */}
                          <p className="text-blue-400 text-xs">{item.item_type || 'Item'}</p>
                        </div>
                        
                        {/* Market Value and Menu Button */}
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-xs">
                            {item.market_value_cents && `$${(item.market_value_cents / 100).toFixed(2)}`}
                          </div>
                          <div className="relative">
                            {isSelected ? (
                              <div className="text-blue-400">
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
                                className="bg-gray-600 hover:bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
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
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
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

        {/* Custom Items Bulk Actions Bar - Fixed at bottom */}
        {isCustomSelectionMode && (
          <div className="fixed bottom-16 left-0 right-0 modal-overlay">
            <div className="bg-blue-500 border-t border-blue-400 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium">
                    {selectedCustomItems.size}/{customItems.length} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllCustomItems}
                    className="px-3 py-1 bg-blue-400 hover:bg-blue-300 rounded-md text-xs text-white transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => {
                      setShowCustomBulkMenu(true);
                      openModal();
                    }}
                    className="px-3 py-1 bg-blue-400 hover:bg-blue-300 rounded-md text-xs text-white transition-colors flex items-center gap-1"
                  >
                    Bulk Actions
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={clearCustomSelection}
                    className="px-3 py-1 bg-blue-400 hover:bg-blue-300 rounded-md text-xs text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
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

        {/* Loading state */}
        {isLoading && searchResults.length === 0 && !isLoadingMore && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={48} />
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

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => {
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
        }}
        onSuccess={(successInfo) => {
          console.log('Custom item added:', successInfo);
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
          // Refresh custom items list
          fetchCustomItems();
        }}
        editingItem={selectedCustomItem}
      />
    </div>
  );
};

export default SearchApi;
