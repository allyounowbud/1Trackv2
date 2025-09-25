import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import smartSearchService from '../services/smartSearchService';
import tcgGoApiService from '../services/tcgGoApiService';
import ProductPreviewModal from '../components/ProductPreviewModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import { getCleanItemName, getCardDisplayName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

const Search = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('all'); // 'all', 'cards', 'products'
  const [totalResults, setTotalResults] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterBy, setFilterBy] = useState('all');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [allResults, setAllResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expansionInfo, setExpansionInfo] = useState(null);
  const [totalAvailableResults, setTotalAvailableResults] = useState(0);
  const loadMoreTimeoutRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const resultsPerPage = 30;
  const maxResults = 500; // Increased max results to show all expansion items

  // Sort results based on sortBy option
  const sortResults = useCallback((results, sortOption) => {
    if (!results || results.length === 0) return results;

    const sortedResults = [...results];

    switch (sortOption) {
      case 'price-high':
        return sortedResults.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
      case 'price-low':
        return sortedResults.sort((a, b) => (a.marketValue || 0) - (b.marketValue || 0));
      case 'alphabetical':
        return sortedResults.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'recent':
        // For now, just return as-is since we don't have date data
        return sortedResults;
      case 'relevance':
      default:
        // Smart default sorting: singles by card number (highest first), sealed by price (lowest first)
        return sortedResults.sort((a, b) => {
          // If both are singles (cards), sort by card number (highest first)
          if (a.type !== 'product' && b.type !== 'product') {
            const aCardNumber = parseInt(a.details?.cardNumber) || 0;
            const bCardNumber = parseInt(b.details?.cardNumber) || 0;
            return bCardNumber - aCardNumber; // Highest card number first
          }
          
          // If both are sealed products, sort by price (lowest first)
          if (a.type === 'product' && b.type === 'product') {
            return (a.marketValue || 0) - (b.marketValue || 0); // Lowest price first
          }
          
          // Mixed types: singles first, then sealed
          if (a.type !== 'product' && b.type === 'product') return -1;
          if (a.type === 'product' && b.type !== 'product') return 1;
          
          return 0;
        });
    }
  }, []);

  // Fetch all expansion results using SmartSearchService
  const fetchAllExpansionResults = useCallback(async (expansionId, sort, filter) => {
    try {
      console.log(`🔍 Loading expansion data for ${expansionId}...`);
      
      const expansionData = await smartSearchService.getExpansionData(expansionId, {
        sort,
        filter,
        maxCards: 1000,
        maxProducts: 500,
        includeImages: false, // Disabled due to 503 errors from Supabase
        includePricing: true
      });

      return expansionData.allItems;
    } catch (error) {
      console.error('❌ Error fetching expansion results:', error);
      return [];
    }
  }, []);

  // Load popular expansions using SmartSearchService
  const loadPopularExpansions = async () => {
    setIsLoadingTrending(true);
    try {
      console.log('🔍 Loading popular expansions...');
      
      const allExpansions = await smartSearchService.getAllExpansions();
      
      // Get top 10 most popular expansions
      const popularExpansions = allExpansions.slice(0, 10);
      
      setTrendingProducts(popularExpansions);
      console.log(`✅ Loaded ${popularExpansions.length} popular expansions`);
    } catch (error) {
      console.error('❌ Error loading popular expansions:', error);
      // Fallback to regular API
      await loadAllExpansions();
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Browse expansion cards using expansion ID
  const browseExpansionCards = async (expansion) => {
    
    // Manual ID mapping for known expansions
    const expansionIdMap = {
      'Evolving Skies': 15,
      'Crown Zenith': 21,
      'Prismatic Evolutions': 25,
      'Scarlet & Violet 151': 24,
      'Silver Tempest': 20,
      'Lost Origin': 19,
      'Astral Radiance': 18,
      'Brilliant Stars': 17,
      'Fusion Strike': 16,
      'Chilling Reign': 14,
      'Battle Styles': 13,
      'Vivid Voltage': 12,
      'Darkness Ablaze': 11,
      'Rebel Clash': 10,
      'Sword & Shield': 9
    };

    // Use expansion ID from object or fallback to manual mapping
    const expansionId = expansion.id || expansionIdMap[expansion.name];
    
    if (!expansionId) {
      console.error('No expansion ID available for:', expansion.name);
      console.error('Full expansion object:', expansion);
      console.error('Available properties:', Object.keys(expansion));
      
      // Try to find ID in different possible locations
      console.log('  - expansion.id:', expansion.id);
      console.log('  - expansion.ID:', expansion.ID);
      console.log('  - expansion.episode_id:', expansion.episode_id);
      console.log('  - expansion.episodeId:', expansion.episodeId);
      
      // Fallback to regular search
      setSearchQuery(expansion.name);
      handleSearch(expansion.name);
      return;
    }


    setIsLoading(true);
    setSearchQuery(expansion.name);
    
    try {
      // Store expansion info for pagination
      setExpansionInfo({
        id: expansionId,
        name: expansion.name,
        sort: sortBy,
        filter: filterBy
      });
      
      // Fetch ALL cards and products from the expansion (no limits for complete results)
      const cardsPromise = tcgGoApiService.getExpansionCards(expansionId, sortBy, 1000).catch(() => []);
      const productsPromise = tcgGoApiService.getExpansionProducts(expansionId, sortBy, 1000).catch(() => []);
      
      // Show cards first (usually faster)
      const cards = await cardsPromise;
      if (cards && cards.length > 0) {
        setAllResults(cards);
        setCurrentPage(1);
        setHasMoreResults(false);
      }
      
      // Then add products
      const products = await productsPromise;
      if (products && products.length > 0) {
        const combinedResults = [...(cards || []), ...products];
        
        // Apply filtering
        let filteredResults = combinedResults;
        if (filterBy !== 'all') {
          filteredResults = combinedResults.filter(item => {
            if (filterBy === 'sealed') return item.type === 'sealed';
            if (filterBy === 'singles') return item.type === 'singles';
            return true;
          });
        }
        
        // Apply sorting
        const sortedResults = sortResults(filteredResults, sortBy);
        
        setAllResults(sortedResults);
        setTotalAvailableResults(sortedResults.length);
        
        // Show first page of results
        const firstPageResults = sortedResults.slice(0, resultsPerPage);
        setDisplayedResults(firstPageResults);
        setSearchResults(firstPageResults);
        setTotalResults(sortedResults.length);
        
        // Set pagination state
        setCurrentPage(1);
        setHasMoreResults(sortedResults.length > resultsPerPage);
        
      } else {
        setSearchResults([]);
        setAllResults([]);
        setDisplayedResults([]);
        setTotalResults(0);
        setTotalAvailableResults(0);
        setHasMoreResults(false);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('❌ Error browsing expansion items:', error);
      // Fallback to regular search
      handleSearch(expansion.name);
    } finally {
      setIsLoading(false);
    }
  };


  // Load all expansions function
  const loadAllExpansions = async () => {
    setIsLoadingTrending(true);
    try {
      console.log('🔍 Loading all expansions...');
      const expansions = await smartSearchService.getAllExpansions();
      
      if (expansions && Array.isArray(expansions)) {
        setTrendingProducts(expansions);
        console.log(`✅ Loaded ${expansions.length} expansions`);
      } else {
        console.error('❌ Failed to load expansions - invalid response:', expansions);
        setTrendingProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading expansions:', error);
      
      // Fallback: Show some popular expansions if API fails
      const fallbackExpansions = [
        { 
          id: 25, // Prismatic Evolutions ID
          name: 'Prismatic Evolutions', 
          releaseDate: '2024-01-01', 
          cardCount: 200, 
          code: 'PE',
          symbol: 'PE',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/prismatic-evolutions-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/prismatic-evolutions-logo.png',
          series: 'Scarlet & Violet',
          game: 'Pokémon'
        },
        { 
          id: 24, // Scarlet & Violet 151 ID
          name: 'Scarlet & Violet 151', 
          releaseDate: '2023-06-01', 
          cardCount: 165, 
          code: 'SV151',
          symbol: 'SV151',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/sv151-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/sv151-logo.png',
          series: 'Scarlet & Violet',
          game: 'Pokémon'
        },
        { 
          id: 21, // Crown Zenith ID (from your API example)
          name: 'Crown Zenith', 
          releaseDate: '2023-01-01', 
          cardCount: 230, 
          code: 'CZ',
          symbol: 'CZ',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/crown-zenith-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/crown-zenith-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        },
        { 
          id: 20, // Silver Tempest ID
          name: 'Silver Tempest', 
          releaseDate: '2022-11-01', 
          cardCount: 195, 
          code: 'ST',
          symbol: 'ST',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/silver-tempest-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/silver-tempest-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        },
        { 
          id: 19, // Lost Origin ID
          name: 'Lost Origin', 
          releaseDate: '2022-09-01', 
          cardCount: 196, 
          code: 'LO',
          symbol: 'LO',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/lost-origin-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/lost-origin-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        },
        { 
          id: 18, // Astral Radiance ID
          name: 'Astral Radiance', 
          releaseDate: '2022-05-01', 
          cardCount: 189, 
          code: 'AR',
          symbol: 'AR',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/astral-radiance-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/astral-radiance-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        },
        { 
          id: 17, // Brilliant Stars ID
          name: 'Brilliant Stars', 
          releaseDate: '2022-02-01', 
          cardCount: 172, 
          code: 'BS',
          symbol: 'BS',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/brilliant-stars-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/brilliant-stars-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        },
        { 
          id: 16, // Fusion Strike ID
          name: 'Fusion Strike', 
          releaseDate: '2021-11-01', 
          cardCount: 264, 
          code: 'FS',
          symbol: 'FS',
          imageUrl: 'https://images.tcggo.com/tcggo/storage/23035/fusion-strike-logo.png',
          logo: 'https://images.tcggo.com/tcggo/storage/23035/fusion-strike-logo.png',
          series: 'Sword & Shield',
          game: 'Pokémon'
        }
      ];
      
      setTrendingProducts(fallbackExpansions);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Live search with debouncing and pagination
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty or too short, show trending products
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setAllResults([]);
      setDisplayedResults([]);
      setTotalResults(0);
      setTotalAvailableResults(0);
      setCurrentPage(1);
      setHasMoreResults(false);
      setExpansionInfo(null); // Clear expansion info for regular search
      return;
    }

    // Set loading state
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    // Debounce the search - wait 800ms after user stops typing (increased for fewer API calls)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        
        let result;
        
        // Check if this looks like an expansion search (contains common expansion keywords)
        const isExpansionSearch = searchQuery.toLowerCase().includes('evolutions') || 
                                 searchQuery.toLowerCase().includes('base') ||
                                 searchQuery.toLowerCase().includes('jungle') ||
                                 searchQuery.toLowerCase().includes('fossil') ||
                                 searchQuery.toLowerCase().includes('team rocket') ||
                                 searchQuery.toLowerCase().includes('gym') ||
                                 searchQuery.toLowerCase().includes('neo') ||
                                 searchQuery.toLowerCase().includes('ex') ||
                                 searchQuery.toLowerCase().includes('diamond') ||
                                 searchQuery.toLowerCase().includes('pearl') ||
                                 searchQuery.toLowerCase().includes('platinum') ||
                                 searchQuery.toLowerCase().includes('heartgold') ||
                                 searchQuery.toLowerCase().includes('soulsilver') ||
                                 searchQuery.toLowerCase().includes('black') ||
                                 searchQuery.toLowerCase().includes('white') ||
                                 searchQuery.toLowerCase().includes('xy') ||
                                 searchQuery.toLowerCase().includes('sun') ||
                                 searchQuery.toLowerCase().includes('moon') ||
                                 searchQuery.toLowerCase().includes('sword') ||
                                 searchQuery.toLowerCase().includes('shield') ||
                                 searchQuery.toLowerCase().includes('brilliant') ||
                                 searchQuery.toLowerCase().includes('astral') ||
                                 searchQuery.toLowerCase().includes('lost') ||
                                 searchQuery.toLowerCase().includes('paldea') ||
                                 searchQuery.toLowerCase().includes('obsidian') ||
                                 searchQuery.toLowerCase().includes('151') ||
                                 searchQuery.toLowerCase().includes('crown') ||
                                 searchQuery.toLowerCase().includes('rebel') ||
                                 searchQuery.toLowerCase().includes('temporal') ||
                                 searchQuery.toLowerCase().includes('prismatic');
        
        if (isExpansionSearch) {
          console.log(`🎯 Detected expansion search for: "${searchQuery}"`);
          
          // Try to find the expansion first
          try {
            const expansions = await smartSearchService.getAllExpansions();
            const matchingExpansion = expansions.find(exp => 
              exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              searchQuery.toLowerCase().includes(exp.name.toLowerCase())
            );
            
            if (matchingExpansion) {
              console.log(`📦 Found expansion: ${matchingExpansion.name} (ID: ${matchingExpansion.id})`);
              
              // Get complete expansion data using SmartSearchService
              const expansionData = await smartSearchService.getExpansionData(matchingExpansion.id, {
                sort: sortBy,
                filter: filterBy,
                maxCards: 1000,
                maxProducts: 500,
                includeImages: false, // Disabled due to 503 errors from Supabase
                includePricing: true
              });
              
              result = expansionData.allItems;
              console.log(`✅ Found ${result.length} items from expansion`);
            } else {
              // Fall back to regular search if no expansion found
              const searchResult = await smartSearchService.searchAll(searchQuery, {
                sort: sortBy,
                maxResults: 100,
                includeImages: false, // Disabled due to 503 errors from Supabase
                includePricing: true
              });
              result = [...searchResult.cards, ...searchResult.products];
            }
          } catch (expansionError) {
            console.log('⚠️ Expansion search failed, falling back to regular search:', expansionError);
            const searchResult = await smartSearchService.searchAll(searchQuery, {
              sort: sortBy,
              maxResults: 100,
              includeImages: false, // Disabled due to 503 errors from Supabase
              includePricing: true
            });
            result = [...searchResult.cards, ...searchResult.products];
          }
        } else {
          // Use SmartSearchService for comprehensive search
          const searchResult = await smartSearchService.searchAll(searchQuery, {
            sort: sortBy,
            maxResults: 100,
            includeImages: false, // Disabled due to 503 errors from Supabase
            includePricing: true
          });
          result = [...searchResult.cards, ...searchResult.products];
        }
        
        if (result && Array.isArray(result)) {
          // Apply filtering based on filterBy
          let filteredResults = result;
          if (filterBy !== 'all') {
            filteredResults = filteredResults.filter(card => {
              if (filterBy === 'sealed') return card.type === 'sealed';
              if (filterBy === 'singles') return card.type === 'singles';
              return true;
            });
          }

          // Apply sorting based on sortBy
          filteredResults = sortResults(filteredResults, sortBy);

          // Store all results
          setAllResults(filteredResults);
          setTotalAvailableResults(filteredResults.length);
          
          // Show first page of results
          const firstPageResults = filteredResults.slice(0, resultsPerPage);
          setDisplayedResults(firstPageResults);
          setSearchResults(firstPageResults);
          setTotalResults(filteredResults.length);
          
          // Check if there are more results to load
          setHasMoreResults(filteredResults.length > resultsPerPage);
          
          console.log(`✅ Live search complete: ${filteredResults.length} total results, showing ${firstPageResults.length}`);
        } else {
          setSearchResults([]);
          setAllResults([]);
          setDisplayedResults([]);
          setTotalResults(0);
          setTotalAvailableResults(0);
          setHasMoreResults(false);
        }
      } catch (error) {
        console.error('❌ Live search error:', error);
        setError('Search failed. Please try again.');
        setSearchResults([]);
        setAllResults([]);
        setDisplayedResults([]);
        setTotalResults(0);
        setTotalAvailableResults(0);
        setHasMoreResults(false);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchType, filterBy, sortBy]);

  // Load trending products on component mount
  useEffect(() => {
    loadPopularExpansions();
  }, []);

  const handleSearch = async () => {
    // This function is now mainly for manual search triggers
    // The live search useEffect handles most of the functionality
    if (!searchQuery.trim()) return;
    
    // Clear any existing timeout and trigger immediate search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // The useEffect will handle the actual search
  };

  // Load more results function
  const loadMoreResults = useCallback(() => {
    if (isLoadingMore || !hasMoreResults) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * resultsPerPage;
      const endIndex = startIndex + resultsPerPage;
      
      
      // Get next batch of results from allResults
      const nextBatch = allResults.slice(startIndex, endIndex);
      
      if (nextBatch && nextBatch.length > 0) {
        // Add to displayed results
        setDisplayedResults(prev => {
          const newDisplayed = [...prev, ...nextBatch];
          return newDisplayed;
        });
        setSearchResults(prev => {
          const newSearch = [...prev, ...nextBatch];
          return newSearch;
        });
        setCurrentPage(nextPage);
        
        // Total results count stays the same (it's the total available)
        // setTotalResults remains unchanged
        
        // Check if there are more results
        const hasMore = endIndex < allResults.length;
        setHasMoreResults(hasMore);
      } else {
        // No more results
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
      setHasMoreResults(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreResults, currentPage, allResults, displayedResults, resultsPerPage, totalAvailableResults]);

  // Debounced load more results function
  const debouncedLoadMore = useCallback(() => {
    // Clear any existing timeout
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }
    
    // Set a new timeout
    loadMoreTimeoutRef.current = setTimeout(() => {
      loadMoreResults();
    }, 100); // 100ms debounce
  }, [loadMoreResults]);

  // Infinite scroll handler
  useEffect(() => {

    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.offsetHeight;
      const scrollThreshold = documentHeight - 200;
      
      const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
      
      
      // More aggressive scroll detection - trigger when within 200px of bottom
      if (scrollTop + windowHeight >= scrollThreshold) {
        debouncedLoadMore();
      }
      
      // Alternative detection - trigger when scrolled to 80% of content
      if (scrollPercentage >= 0.8) {
        debouncedLoadMore();
      }
    };

    // Try multiple scroll targets
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('scroll', handleScroll);
    document.documentElement.addEventListener('scroll', handleScroll);
    document.body.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.documentElement.removeEventListener('scroll', handleScroll);
      document.body.removeEventListener('scroll', handleScroll);
      
      // Clear any pending timeout
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, [debouncedLoadMore, hasMoreResults, isLoadingMore, allResults, displayedResults]);

  // Alternative approach: IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMoreResults || isLoadingMore) return;

    // Create a sentinel element at the bottom of the results
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.width = '100%';
    sentinel.id = 'infinite-scroll-sentinel';
    
    // Add it to the end of the results container
    const resultsContainer = document.querySelector('.search-results') || document.body;
    resultsContainer.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debouncedLoadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      const existingSentinel = document.getElementById('infinite-scroll-sentinel');
      if (existingSentinel) {
        existingSentinel.remove();
      }
    };
  }, [hasMoreResults, isLoadingMore, debouncedLoadMore]);


  const formatPrice = (value) => {
    if (!value) return 'Unavailable';
    // API returns values in dollars, so just format as currency
    return `$${value.toFixed(2)}`;
  };



  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedProduct(null);
  };

  const handleAddToCollection = (product) => {
    setProductToAdd(product);
    setIsAddModalOpen(true);
    setIsPreviewOpen(false); // Close preview modal
    openModal();
  };

  const handleAddSuccess = (result) => {
    // Aggressive cache invalidation for PWA
    queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.collectionData });
    
    // Force refetch all collection data
    queryClient.refetchQueries({ queryKey: queryKeys.orders });
    queryClient.refetchQueries({ queryKey: queryKeys.collectionSummary });
    queryClient.refetchQueries({ queryKey: queryKeys.collectionData });
    
    // Clear all caches to ensure fresh data
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('onetrack')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Navigate to collection page with success data as URL parameters
    const params = new URLSearchParams({
      successItem: result.item,
      successQuantity: result.quantity,
      successPrice: result.price,
      ...(result.set && { successSet: result.set })
    });
    navigate(`/?${params.toString()}`);
    
    setIsAddModalOpen(false);
    closeModal();
    setProductToAdd(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setProductToAdd(null);
    closeModal();
  };

  return (
    <div className="text-white">
      {/* Search Interface */}
      <div className="px-3 py-2">
        <div className="p-3">
          {/* Search Bar */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search your items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>


          {/* Filter Buttons */}
          <div className="flex gap-2 mb-3">
            {/* Sort By Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button 
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-700 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Sort By {sortBy === 'relevance' ? 'Relevance' : sortBy === 'price-high' ? 'Highest Price' : sortBy === 'price-low' ? 'Lowest Price' : sortBy === 'alphabetical' ? 'A-Z' : 'Recent'}
                <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Sort Dropdown */}
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
                  <div className="py-1">
                    {[
                      { value: 'relevance', label: 'Relevance' },
                      { value: 'price-high', label: 'Highest Price' },
                      { value: 'price-low', label: 'Lowest Price' },
                      { value: 'alphabetical', label: 'A-Z' },
                      { value: 'recent', label: 'Most Recent' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          sortBy === option.value
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-white hover:bg-gray-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter By Dropdown */}
            <div className="relative" ref={filterDropdownRef}>
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-700 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {filterBy === 'all' ? 'All Items' : filterBy === 'sealed' ? 'Sealed' : filterBy === 'singles' ? 'Singles' : 'All Items'}
                <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
                  <div className="py-1">
                    {[
                      { value: 'all', label: 'All Items' },
                      { value: 'sealed', label: 'Sealed' },
                      { value: 'singles', label: 'Singles' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterBy(option.value);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          filterBy === option.value
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-white hover:bg-gray-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="text-red-300">{error}</div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery.trim() && searchResults.length > 0 && (
        <div className="px-4">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">All Cards & Products</h2>
              <p className="text-xs text-gray-400">{totalResults.toLocaleString()} Total Results</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">
                Showing {displayedResults.length} of {totalResults.toLocaleString()}
              </div>
              {hasMoreResults && (
                <div className="text-xs text-indigo-400 mt-1">
                  Scroll down for more
                </div>
              )}
            </div>
          </div>
          
          {/* Card Grid - 2 columns matching collection page styling */}
          <div className="grid grid-cols-2 gap-3 pb-20">
            {searchResults
              .filter(card => card && typeof card === 'object') // Filter out null/undefined results
              .map((card, index) => {
                return (
                  <div 
                    key={index} 
                    className="relative border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-all duration-200 cursor-pointer"
                    onClick={() => handleProductClick(card)}
                  >
                    {/* Add Button - Top Right */}
                    <button 
                      className="absolute top-2 right-2 w-5 h-5 bg-indigo-500/20 rounded-full flex items-center justify-center hover:bg-indigo-500/30 transition-colors z-10 border border-indigo-400/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCollection({ ...card, quantity: 1 });
                      }}
                    >
                      <svg className="w-2.5 h-2.5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    {/* Card Image */}
                    <div className="aspect-[4/3] flex items-center justify-center py-2 relative">
                      {card?.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card?.name || 'Card'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${card?.imageUrl ? 'hidden' : 'flex'}`}>
                        <div className="text-center">
                          <div className="text-2xl mb-1">📦</div>
                          <div className="text-gray-400 text-xs">No Image</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Details */}
                    <div className="p-3 space-y-2">
                      {/* Header Section */}
                      <div className="space-y-1">
                        <h3 className="text-white font-semibold leading-tight" style={{fontSize: '11px'}}>
                          {(() => {
                            const displayName = getCardDisplayName(card) || 'Unknown Card';
                            const cleanName = getCleanItemName(card?.name, card?.set) || 'Unknown Card';
                            
                            // Check if it's a single card with a number
                            if (card?.type !== 'product' && card?.details?.cardNumber) {
                              return (
                                <>
                                  {cleanName} <span className="text-indigo-400">#{card.details.cardNumber}</span>
                                </>
                              );
                            }
                            
                            // For sealed products or cards without numbers
                            return displayName;
                          })()}
                        </h3>
                        <p className="text-gray-400" style={{fontSize: '9px'}}>
                          {card?.set || 'Unknown Set'}
                        </p>
                      </div>
                      
                        <div className="flex justify-start mb-1">
                          <span className="bg-indigo-600/70 text-white px-0.5 py-0.5 rounded text-xs font-medium" style={{fontSize: '9px'}}>
                            {card?.type === 'product' ? 'Sealed' : (card?.rarity || 'Card')}
                          </span>
                        </div>
                      
                      {/* Financial Section - Simplified */}
                      <div className="space-y-1">
                        {/* Market Value */}
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold" style={{fontSize: '12px'}}>
                              {card?.marketValue ? formatPrice(card.marketValue) : 'N/A'} Value
                              {card?.prices?.source === 'pricecharting' && card?.prices?.priceCharting?.loose > 0 && (
                                <span className="ml-1 text-indigo-400" style={{fontSize: '8px'}}>(L)</span>
                              )}
                            </span>
                        </div>
                        
                        {/* Trend Data */}
                        <div className="text-gray-400" style={{fontSize: '9px'}}>
                          {(() => {
                            // Show trend data if we have valid trend or dollar change values
                            if (card.trend !== undefined && card.trend !== null && card.dollarChange !== undefined && card.dollarChange !== null) {
                              return (
                                <span className={card.trend > 0 ? 'text-green-400' : card.trend < 0 ? 'text-red-400' : 'text-gray-400'}>
                                  {card.dollarChange > 0 ? '+' : ''}${card.dollarChange.toFixed(2)} ({card.trend > 0 ? '+' : ''}{card.trend}%)
                                </span>
                              );
                            } else {
                              return <span className="text-gray-500">No trend data</span>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Load More Indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-6">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 border border-transparent border-t-indigo-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                </div>
                <span className="text-sm">Loading more results...</span>
              </div>
            </div>
          )}

          {/* End of Results Indicator */}
          {!hasMoreResults && displayedResults.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-xs text-gray-500">
                All {totalResults.toLocaleString()} results loaded
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative">
            {/* iPhone-style spinner */}
            <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
            {/* Inner ring for extra visual appeal */}
            <div className="absolute top-1 left-1 w-10 h-10 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-white font-medium mb-1">Searching...</div>
            <div className="text-gray-400 text-sm">Finding the best results for you</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && searchResults.length === 0 && !error && searchQuery && (
        <div className="px-4 py-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">No results found</div>
            <div className="text-sm text-gray-500">Try different search terms</div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!searchQuery && (
        <div className="px-4 py-8">
          {/* Loading State */}
          {isLoadingTrending && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative">
                {/* iPhone-style spinner */}
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                {/* Inner ring for extra visual appeal */}
                <div className="absolute top-0.5 left-0.5 w-9 h-9 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-white font-medium mb-1">Loading Expansions...</div>
                <div className="text-gray-400 text-sm">Getting the latest sets</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoadingTrending && trendingProducts.length === 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Expansions</h2>
                <div className="text-xs text-gray-400">Failed to load</div>
              </div>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">Unable to load expansions</div>
                <button 
                  onClick={loadPopularExpansions}
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Expansions Section */}
          {!isLoadingTrending && trendingProducts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Expansions</h2>
                <div className="text-xs text-gray-400">Browse by set</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pb-20">
                {trendingProducts.map((expansion, index) => {
                  return (
                    <div 
                      key={`expansion-${index}`} 
                      className="relative border border-gray-700 rounded-lg overflow-hidden hover:border-indigo-500 hover:bg-indigo-900/10 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        browseExpansionCards(expansion);
                      }}
                    >
                      {/* Expansion Logo/Image */}
                      <div className="aspect-[4/3] flex items-center justify-center p-4 relative">
                        {(expansion?.imageUrl || expansion?.image || expansion?.logo) ? (
                          <img
                            src={expansion.imageUrl || expansion.image || expansion.logo}
                            alt={expansion?.name || 'Expansion'}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${(expansion?.imageUrl || expansion?.image || expansion?.logo) ? 'hidden' : 'flex'}`}>
                          <div className="text-center">
                            <div className="text-3xl mb-1">📚</div>
                            <div className="text-gray-400 text-xs">Expansion</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expansion Details */}
                      <div className="p-2 space-y-1">
                        {/* Expansion Name */}
                        <div>
                          <h3 className="text-white leading-tight line-clamp-2 font-bold" style={{fontSize: '12px'}}>
                            {expansion?.name || 'Unknown Expansion'}
                          </h3>
                        </div>
                        
                        {/* Series/Release Date */}
                        <div className="text-xs text-gray-400 truncate" style={{fontSize: '12px'}}>
                          {expansion?.series ? expansion.series : (expansion?.releaseDate ? new Date(expansion.releaseDate).getFullYear() : 'Unknown Year')}
                        </div>
                        
                        {/* Set Code Pill and Card Count */}
                        <div className="flex items-center gap-2">
                          {expansion?.code && (
                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full font-medium">
                              {expansion.code}
                            </span>
                          )}
                          <div className="text-xs text-gray-400" style={{fontSize: '12px'}}>
                            {expansion?.cardCount ? `(${expansion.cardCount})` : 'Expansion'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State for Trending */}
          {isLoadingTrending && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">🔥 Trending Now</h2>
                <div className="text-xs text-gray-400">Loading...</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border border-gray-700 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-800"></div>
                    <div className="p-2 space-y-1">
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                      <div className="h-2 bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Product Preview Modal */}
      <ProductPreviewModal
        product={selectedProduct}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onAddToCollection={handleAddToCollection}
      />

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        product={productToAdd}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

export default Search;
