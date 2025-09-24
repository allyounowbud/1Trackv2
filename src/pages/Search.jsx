import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import tcgGoApiService from '../services/tcgGoApiService';
import ProductPreviewModal from '../components/ProductPreviewModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import { getCleanItemName } from '../utils/nameUtils';
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
  const sortDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const resultsPerPage = 30;
  const maxResults = 500; // Increased max results to show all expansion items

  // Load popular expansions using search API for better image data
  const loadPopularExpansions = async () => {
    setIsLoadingTrending(true);
    try {
      
      // List of popular expansions to search for
      const popularExpansionNames = [
        'Prismatic Evolutions',
        'Scarlet & Violet 151', 
        'Crown Zenith',
        'Silver Tempest',
        'Lost Origin',
        'Astral Radiance',
        'Brilliant Stars',
        'Fusion Strike',
        'Evolving Skies',
        'Chilling Reign'
      ];

      // Search for each popular expansion
      const expansionPromises = popularExpansionNames.map(async (name) => {
        try {
          const result = await tcgGoApiService.searchExpansions(name);
          if (result && result.length > 0) {
            return result[0]; // Return the first (most relevant) result
          }
          return null;
        } catch (error) {
          console.warn(`Failed to search for ${name}:`, error);
          return null;
        }
      });

      const expansions = (await Promise.all(expansionPromises)).filter(Boolean);
      console.log(`✅ Loaded ${expansions.length} popular expansions:`, expansions);
      
      
      if (expansions.length > 0) {
        setTrendingProducts(expansions);
      } else {
        // Fallback to regular API if search fails
        await loadAllExpansions();
      }
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

    console.log(`✅ Using expansion ID: ${expansionId} for ${expansion.name}`);

    setIsLoading(true);
    setSearchQuery(expansion.name);
    
    try {
      
      // Use the expansion all API (cards + products)
      const allItems = await tcgGoApiService.getExpansionAll(expansionId, 'price_highest');
      
      if (allItems && allItems.length > 0) {
        console.log(`✅ Found ${allItems.length} total items (cards + products) in ${expansion.name}`);
        setSearchResults(allItems);
        setTotalResults(allItems.length);
        setCurrentPage(1);
      } else {
        console.log(`❌ No items found for ${expansion.name}`);
        setSearchResults([]);
        setTotalResults(0);
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
      // Clear cache to ensure we get fresh data with updated images
      tcgGoApiService.clearCache();
      const expansions = await tcgGoApiService.getAllExpansions();
      
      
      // The getAllExpansions function returns the data directly, not wrapped in success/data
      if (expansions && Array.isArray(expansions)) {
        
        
        setTrendingProducts(expansions);
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
      setCurrentPage(1);
      setHasMoreResults(false);
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
            const expansions = await tcgGoApiService.searchExpansions(searchQuery);
            if (expansions && expansions.length > 0) {
              const expansion = expansions[0]; // Take the first match
              console.log(`📦 Found expansion: ${expansion.name} (ID: ${expansion.id})`);
              
              // Get both cards and products from this expansion
              const sortOption = sortBy === 'highest_price' ? 'price_highest' : 
                               sortBy === 'lowest_price' ? 'price_lowest' : 
                               sortBy === 'alphabetical' ? 'name' : 'price_highest';
              
              const [cards, products] = await Promise.all([
                tcgGoApiService.getExpansionCards(expansion.id, sortOption),
                tcgGoApiService.getExpansionProducts(expansion.id, sortOption)
              ]);
              
              // Combine results
              const combinedResults = [...cards, ...products];
              result = combinedResults; // Don't limit expansion results
              console.log(`✅ Found ${combinedResults.length} items from expansion`);
            } else {
              // Fall back to regular search if no expansion found
              result = await tcgGoApiService.searchAll(searchQuery, 'relevance');
            }
          } catch (expansionError) {
            console.log('⚠️ Expansion search failed, falling back to regular search:', expansionError);
            result = await tcgGoApiService.searchAll(searchQuery, 'relevance');
          }
        } else {
          // Use enhanced search with sorting for better results
          const sortOption = sortBy === 'highest_price' ? 'price_highest' : 
                           sortBy === 'lowest_price' ? 'price_lowest' : 
                           sortBy === 'alphabetical' ? 'name' : 'relevance';
          
          try {
            const searchResults = await tcgGoApiService.searchAll(searchQuery, sortOption);
            result = searchResults;
          } catch (searchError) {
            console.log('⚠️ Enhanced search failed, falling back to regular search:', searchError);
            // Fall back to regular search
            switch (searchType) {
              case 'cards':
                result = await tcgGoApiService.searchCards(searchQuery, sortOption);
                break;
              case 'products':
                result = await tcgGoApiService.searchProducts(searchQuery, sortOption);
                break;
              case 'all':
              default:
                result = await tcgGoApiService.searchAll(searchQuery, 'relevance');
                break;
            }
          }
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

          // Store all results and show first page
          setAllResults(filteredResults);
          setTotalResults(filteredResults.length);
          
          // Show first page of results
          const firstPageResults = filteredResults.slice(0, resultsPerPage);
          setDisplayedResults(firstPageResults);
          setSearchResults(firstPageResults);
          
          // Check if there are more results to load
          setHasMoreResults(filteredResults.length > resultsPerPage);
          
          console.log(`✅ Live search complete: ${filteredResults.length} total results, showing ${firstPageResults.length}`);
        } else {
          setSearchResults([]);
          setAllResults([]);
          setDisplayedResults([]);
          setTotalResults(0);
          setHasMoreResults(false);
        }
      } catch (error) {
        console.error('❌ Live search error:', error);
        setError('Search failed. Please try again.');
        setSearchResults([]);
        setAllResults([]);
        setDisplayedResults([]);
        setTotalResults(0);
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

  // Sort results based on sortBy option
  const sortResults = (results, sortOption) => {
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
        // Default relevance sorting (API already provides this)
        return sortedResults;
    }
  };

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
  const loadMoreResults = () => {
    if (isLoadingMore || !hasMoreResults) return;

    setIsLoadingMore(true);
    
    // Calculate next page results
    const nextPage = currentPage + 1;
    const startIndex = currentPage * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    
    // Get next batch of results
    const nextBatch = allResults.slice(startIndex, endIndex);
    
    // Add to displayed results
    setDisplayedResults(prev => [...prev, ...nextBatch]);
    setSearchResults(prev => [...prev, ...nextBatch]);
    setCurrentPage(nextPage);
    
    // Check if there are more results
    setHasMoreResults(endIndex < allResults.length);
    
    setIsLoadingMore(false);
    
    console.log(`📄 Loaded page ${nextPage}: ${nextBatch.length} more results (${displayedResults.length + nextBatch.length}/${allResults.length} total)`);
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMoreResults();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, hasMoreResults, isLoadingMore, allResults, displayedResults]);


  const formatPrice = (value) => {
    if (!value) return 'Unavailable';
    // API returns values in dollars, so just format as currency
    return `$${value.toFixed(2)}`;
  };

  const clearCache = () => {
    tcgGoApiService.clearCache();
    setSearchResults([]);
    setTotalResults(0);
    console.log('🗑️ Cache cleared, try searching again');
  };

  // Debug function to check price accuracy for a specific item
  const debugItemPricing = async (itemId, itemType = 'card') => {
    try {
      if (itemType === 'card') {
        await tcgGoApiService.debugCardData(itemId);
      } else {
        // For products, we'd need to implement debugProductData
      }
    } catch (error) {
      console.error('Error debugging item pricing:', error);
    }
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
    // Invalidate collection queries to trigger smooth refresh
    queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.collectionData });
    
    // Small delay to ensure database operation is complete before navigation
    setTimeout(() => {
      // Navigate to collection page with success data as URL parameters
      const params = new URLSearchParams({
        successItem: result.item,
        successQuantity: result.quantity,
        successPrice: result.price,
        ...(result.set && { successSet: result.set })
      });
      navigate(`/?${params.toString()}`);
    }, 500); // 500ms delay to ensure database operation completes
    
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
                          {getCleanItemName(card?.name, card?.set) || 'Unknown Card'}
                        </h3>
                        <p className="text-gray-400" style={{fontSize: '9px'}}>
                          {card?.set || 'Unknown Set'}
                        </p>
                      </div>
                      
                        <p className="text-gray-300" style={{fontSize: '8px'}}>
                          {card?.type === 'product' ? 'Sealed' : (card?.rarity || 'Card')}
                        </p>
                      
                      {/* Financial Section */}
                      <div className="space-y-1">
                        {/* Price */}
                        <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold" style={{fontSize: '12px'}}>
                              {card?.marketValue ? formatPrice(card.marketValue) : 'N/A'} Value
                            </span>
                        </div>
                        
                        {/* Trend Data */}
                        <div className="text-gray-400" style={{fontSize: '9px'}}>
                          {(() => {
                            
                            if (card.trend && card.trend !== 0 && card.dollarChange !== 0) {
                              return (
                                <span className={card.trend > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {card.dollarChange > 0 ? '+' : ''}${Math.abs(card.dollarChange).toFixed(2)} ({card.trend > 0 ? '+' : ''}{card.trend}%)
                                </span>
                              );
                            } else {
                              return <span className="text-gray-500">$0.00 (0.00%)</span>;
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
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Loading more results...</span>
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
        <div className="px-4 py-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">Searching for "{searchQuery}"...</div>
            <div className="text-sm text-gray-500">This may take a few seconds</div>
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
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Expansions</h2>
                <div className="text-xs text-gray-400">Loading...</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-20">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-800 animate-pulse"></div>
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-2 bg-gray-700 rounded animate-pulse w-2/3"></div>
                      <div className="h-2 bg-gray-700 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
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
