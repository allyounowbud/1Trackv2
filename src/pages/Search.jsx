import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import smartSearchService from '../services/smartSearchService';
import internalApiService from '../services/internalApiService';
import ProductPreviewModal from '../components/ProductPreviewModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import CustomItemModal from '../components/CustomItemModal';
import { getCleanItemName, getCardDisplayName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';

const Search = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('categories'); // 'categories', 'search', 'expansions'
  const [totalResults, setTotalResults] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState([]);
  const [showCustomItemMenu, setShowCustomItemMenu] = useState(null);
  const [customItemToEdit, setCustomItemToEdit] = useState(null);
  const [showCustomItemDeleteModal, setShowCustomItemDeleteModal] = useState(false);
  const [customItemToDelete, setCustomItemToDelete] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [allExpansions, setAllExpansions] = useState([]);
  const [displayedExpansions, setDisplayedExpansions] = useState([]);
  const [currentExpansionPage, setCurrentExpansionPage] = useState(1);
  const [hasMoreExpansions, setHasMoreExpansions] = useState(false);
  const [isLoadingMoreExpansions, setIsLoadingMoreExpansions] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterBy, setFilterBy] = useState('all');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [allResults, setAllResults] = useState([]);
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
  const expansionsPerPage = 20; // Show 20 expansions per page

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
        includePricing: false // Disabled to reduce API spam
      });

      return expansionData.allItems;
    } catch (error) {
      console.error('❌ Error fetching expansion results:', error);
      return [];
    }
  }, []);

  // Load all expansions using SmartSearchService
  const loadAllExpansionsFromSmartSearch = async () => {
    setIsLoadingTrending(true);
    try {
      console.log('🔍 Loading all expansions...');
      
      const allExpansionsData = await smartSearchService.getAllExpansions();
      
      // Store all expansions and show first page
      setAllExpansions(allExpansionsData);
      
      // Show first page of expansions
      const firstPageExpansions = allExpansionsData.slice(0, expansionsPerPage);
      setDisplayedExpansions(firstPageExpansions);
      setTrendingProducts(firstPageExpansions);
      
      // Set pagination state
      setCurrentExpansionPage(1);
      setHasMoreExpansions(allExpansionsData.length > expansionsPerPage);
      
      console.log(`✅ Loaded ${allExpansionsData.length} expansions, showing first ${firstPageExpansions.length}`);
    } catch (error) {
      console.error('❌ Error loading popular expansions:', error);
      // Set empty arrays to prevent UI errors
      setAllExpansions([]);
      setDisplayedExpansions([]);
      setTrendingProducts([]);
      // Fallback to regular API
      try {
        await loadAllExpansions();
      } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError);
      }
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Load more expansions for pagination
  const loadMoreExpansions = useCallback(() => {
    if (isLoadingMoreExpansions || !hasMoreExpansions) {
      return;
    }

    setIsLoadingMoreExpansions(true);
    
    try {
      const nextPage = currentExpansionPage + 1;
      const startIndex = nextPage * expansionsPerPage;
      const endIndex = startIndex + expansionsPerPage;
      
      // Get next batch of expansions
      const nextBatch = allExpansions.slice(startIndex, endIndex);
      
      if (nextBatch && nextBatch.length > 0) {
        // Add to displayed expansions
        setDisplayedExpansions(prev => [...prev, ...nextBatch]);
        setTrendingProducts(prev => [...prev, ...nextBatch]);
        setCurrentExpansionPage(nextPage);
        
        // Check if there are more expansions
        const hasMore = endIndex < allExpansions.length;
        setHasMoreExpansions(hasMore);
      } else {
        // No more expansions
        setHasMoreExpansions(false);
      }
    } catch (error) {
      console.error('Error loading more expansions:', error);
      setHasMoreExpansions(false);
    } finally {
      setIsLoadingMoreExpansions(false);
    }
  }, [isLoadingMoreExpansions, hasMoreExpansions, currentExpansionPage, allExpansions, expansionsPerPage]);

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
      
      console.log(`🎯 Detected expansion search for: "${expansion.name}"`);
      
      // Use smart search service to get complete expansion data with all results
      const expansionData = await smartSearchService.getExpansionData(expansionId, {
        includePricing: false, // Disable pricing to avoid API spam
        includeImages: false, // Disable images to avoid 503 errors
        sortBy: sortBy,
        filterBy: filterBy
      });
      
      if (expansionData && (expansionData.cards?.length > 0 || expansionData.products?.length > 0)) {
        // Combine cards and products
        const combinedResults = [
          ...(expansionData.cards || []),
          ...(expansionData.products || [])
        ];
        
        console.log(`✅ Found ${combinedResults.length} items from expansion`);
        
        // Apply filtering if needed
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
        setSearchResults(firstPageResults);
        setTotalResults(sortedResults.length);
        
        // Set pagination state
        setCurrentPage(1);
        setHasMoreResults(sortedResults.length > resultsPerPage);
        
      } else {
        console.log('No expansion data found, falling back to regular search');
        setSearchResults([]);
        setAllResults([]);
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

    // If search query is empty or too short, or not in search mode, clear results
    if (!searchQuery.trim() || searchQuery.trim().length < 2 || searchType !== 'search') {
      setSearchResults([]);
      setAllResults([]);
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
                includePricing: false // Disabled to reduce API spam // Re-enabled with PriceCharting data for all items
              });
              
              result = expansionData.allItems;
              console.log(`✅ Found ${result.length} items from expansion`);
            } else {
              // Fall back to regular search if no expansion found
              const searchResult = await smartSearchService.searchAll(searchQuery, {
                sort: sortBy,
                maxResults: 100,
                includeImages: false, // Disabled due to 503 errors from Supabase
                includePricing: false // Disabled to reduce API spam // Re-enabled with PriceCharting data for all items
              });
              result = [...(searchResult.cards || []), ...(searchResult.products || [])];
            }
          } catch (expansionError) {
            console.log('⚠️ Expansion search failed, falling back to regular search:', expansionError);
            const searchResult = await smartSearchService.searchAll(searchQuery, {
              sort: sortBy,
              maxResults: 100,
              includeImages: false, // Disabled due to 503 errors from Supabase
              includePricing: false // Disabled to reduce API spam // Re-enabled with PriceCharting priority for sealed products
            });
            result = [...(searchResult.cards || []), ...(searchResult.products || [])];
          }
        } else {
          // Use Scrydex API for comprehensive search
          console.log(`🔍 Searching with Scrydex API for: "${searchQuery}"`);
          
          try {
            // Search cards using Scrydex API
            const cardsResult = await internalApiService.searchCards(searchQuery, 50, 'pokemon');
            const cards = cardsResult.success ? cardsResult.data : [];
            
            // Search products using fallback API
            const productsResult = await internalApiService.searchProducts(searchQuery, 30);
            const products = productsResult.success ? productsResult.data : [];
            
            // Combine and format results
            const formattedCards = cards.map(card => ({
              ...card,
              type: 'singles',
              marketValue: card.prices?.usd || card.marketValue || 0,
              imageUrl: card.image_uris?.normal || card.imageUrl || card.images?.small || '',
              name: card.name,
              set: card.set_name || card.set,
              rarity: card.rarity,
              cardNumber: card.collector_number || card.number
            }));
            
            const formattedProducts = products.map(product => ({
              ...product,
              type: 'sealed',
              marketValue: product.price || product.marketValue || 0,
              imageUrl: product.image_url || product.imageUrl || '',
              name: product.name,
              set: product.set_name || product.set
            }));
            
            result = [...formattedCards, ...formattedProducts];
            console.log(`✅ Scrydex search complete: ${formattedCards.length} cards, ${formattedProducts.length} products`);
          } catch (scrydexError) {
            console.warn('⚠️ Scrydex search failed, falling back to SmartSearchService:', scrydexError);
            const searchResult = await smartSearchService.searchAll(searchQuery, {
              sort: sortBy,
              maxResults: 100,
              includeImages: false,
              includePricing: false
            });
            result = [...(searchResult.cards || []), ...(searchResult.products || [])];
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

          // Store all results
          setAllResults(filteredResults);
          setTotalAvailableResults(filteredResults.length);
          
          // Show first page of results
          const firstPageResults = filteredResults.slice(0, resultsPerPage);
          setSearchResults(firstPageResults);
          setTotalResults(filteredResults.length);
          
          // Check if there are more results to load
          setHasMoreResults(filteredResults.length > resultsPerPage);
          
          console.log(`✅ Live search complete: ${filteredResults.length} total results, showing ${firstPageResults.length}`);
        } else {
          setSearchResults([]);
          setAllResults([]);
          setTotalResults(0);
          setTotalAvailableResults(0);
          setHasMoreResults(false);
        }
      } catch (error) {
        console.error('❌ Live search error:', error);
        setError('Search failed. Please try again.');
        setSearchResults([]);
        setAllResults([]);
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

  // Load all expansions and custom items on component mount
  useEffect(() => {
    loadAllExpansionsFromSmartSearch();
    loadCustomItems();
  }, []);

  // Close custom item menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomItemMenu && !event.target.closest('.custom-item-menu')) {
        setShowCustomItemMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomItemMenu]);

  // Load custom items from the database
  const loadCustomItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('source', 'manual')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomItems(data || []);
    } catch (error) {
      console.error('Error loading custom items:', error);
    }
  };

  const handleDeleteCustomItem = (item) => {
    setCustomItemToDelete(item);
    setShowCustomItemDeleteModal(true);
    setShowCustomItemMenu(null);
  };

  const confirmDeleteCustomItem = async () => {
    if (!customItemToDelete) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', customItemToDelete.id);

      if (error) throw error;
      
      // Reload custom items
      loadCustomItems();
      setShowCustomItemDeleteModal(false);
      setCustomItemToDelete(null);
    } catch (error) {
      console.error('Error deleting custom item:', error);
    }
  };

  const handleEditCustomItem = (item) => {
    setCustomItemToEdit(item);
    setShowCustomItemMenu(null);
    // Open edit modal (you can implement this)
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
        // Add to search results
        setSearchResults(prev => {
          const newSearch = [...prev, ...nextBatch];
          return newSearch;
        });
        setCurrentPage(nextPage);
        
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
  }, [isLoadingMore, hasMoreResults, currentPage, allResults, resultsPerPage]);

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
  }, [debouncedLoadMore, hasMoreResults, isLoadingMore, allResults]);

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
    
    // Refresh custom items when a new one is added
    loadCustomItems();
    
    // Navigate to collection page with success data as URL parameters
    const params = new URLSearchParams({
      successItem: result.item,
      successQuantity: result.quantity,
      successPrice: result.price,
      ...(result.set && { successSet: result.set })
    });
    navigate(`/collection?${params.toString()}`);
    
    setIsAddModalOpen(false);
    closeModal();
    setProductToAdd(null);
  };

  // Category card component
  const CategoryCard = ({ title, description, icon, onClick, count }) => (
    <div 
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 cursor-pointer hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">{title}</h3>
            <p className="text-gray-400 text-xs">{description}</p>
          </div>
        </div>
        {count !== undefined && (
          <span className="text-blue-400 text-xs font-medium">{count} items</span>
        )}
      </div>
    </div>
  );

  // Render category grid
  const renderCategoryGrid = () => {
    const categories = [
      {
        title: 'Pokemon',
        description: 'Pokemon TCG cards and products',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        ),
        onClick: () => {
          setSearchQuery('pokemon');
          setSearchType('search');
        }
      },
      {
        title: 'Magic The Gathering',
        description: 'MTG cards and products',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ),
        onClick: () => {
          setSearchQuery('magic');
          setSearchType('search');
        }
      },
      {
        title: 'Loracana',
        description: 'Disney Loracana cards',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        ),
        onClick: () => {
          setSearchQuery('loracana');
          setSearchType('search');
        }
      },
      {
        title: 'Gundam',
        description: 'Gundam model kits and products',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ),
        onClick: () => {
          setSearchQuery('gundam');
          setSearchType('search');
        }
      },
      {
        title: 'Other Items',
        description: 'Your custom collectibles',
        icon: (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        onClick: () => {
          setSearchType('custom');
        },
        count: customItems.length
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <CategoryCard
            key={index}
            title={category.title}
            description={category.description}
            icon={category.icon}
            onClick={category.onClick}
            count={category.count}
          />
        ))}
      </div>
    );
  };

  // Render custom items
  const renderCustomItems = () => {
    if (customItems.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-white font-medium text-sm mb-2">No Custom Items Yet</h3>
          <p className="text-gray-400 text-xs mb-4">Add your own collectibles to track them here</p>
          <button
            onClick={() => setIsCustomItemModalOpen(true)}
            className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            Add Custom Item
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {customItems.map((item) => (
          <div
            key={item.id}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-200 group relative"
          >
            <div className="aspect-square bg-gray-700/50 rounded-lg mb-3 overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: item.image_url ? 'none' : 'flex' }}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-medium text-[11px] md:text-xs leading-tight line-clamp-2">{item.name}</h3>
              {item.set_name && (
                <p className="text-gray-400 text-[11px] md:text-xs">{item.set_name}</p>
              )}
              {item.market_value_cents && (
                <p className="text-blue-400 text-[11px] md:text-xs font-medium">
                  ${(item.market_value_cents / 100).toFixed(2)}
                </p>
              )}
            </div>

            {/* Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomItemMenu(showCustomItemMenu === item.id ? null : item.id);
              }}
              className="custom-item-menu absolute top-2 right-2 p-1 bg-gray-900/80 hover:bg-gray-800/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Menu Dropdown */}
            {showCustomItemMenu === item.id && (
              <div className="custom-item-menu absolute top-8 right-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[120px]">
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCustomItem(item);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Price
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomItem(item);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setProductToAdd(null);
    closeModal();
  };

  return (
    <div>
      {/* Search Interface */}
      <div className="px-4 md:px-6 lg:px-8 py-3">
        <div className="p-4 md:p-10 lg:p-12">
          {/* Search Bar */}
          <div className="relative mb-4 md:mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 md:h-5 md:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for cards, products, or sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
            {/* View Mode Buttons */}
            <button
              onClick={() => setSearchType('categories')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                searchType === 'categories' 
                  ? 'bg-blue-500/20 border border-blue-400/30 text-blue-400' 
                  : 'bg-gray-800/30 border border-gray-700/30 text-gray-400 hover:bg-gray-700/40 hover:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Categories
            </button>
            
            <button
              onClick={() => setSearchType('expansions')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                searchType === 'expansions' 
                  ? 'bg-blue-500/20 border border-blue-400/30 text-blue-400' 
                  : 'bg-gray-800/30 border border-gray-700/30 text-gray-400 hover:bg-gray-700/40 hover:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Expansions
            </button>
            
            {/* Custom Item Button */}
            <button
              onClick={() => setSearchType('custom')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                searchType === 'custom' 
                  ? 'bg-blue-500/20 border border-blue-400/30 text-blue-400' 
                  : 'bg-gray-800/30 border border-gray-700/30 text-gray-400 hover:bg-gray-700/40 hover:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Custom Item
            </button>
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
                            ? 'bg-blue-500/20 text-blue-400'
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
                            ? 'bg-blue-500/20 text-blue-400'
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

      {/* Main Content Area */}
      {searchType === 'categories' && (
        <div className="px-4 md:px-6 lg:px-8">
          <div className="p-4 md:p-10 lg:p-12">
            <h2 className="text-white font-medium text-sm mb-6">Browse by Category</h2>
            {renderCategoryGrid()}
          </div>
        </div>
      )}

      {searchType === 'custom' && (
        <div className="px-4 md:px-6 lg:px-8">
          <div className="p-4 md:p-10 lg:p-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-medium text-sm">Custom Items</h2>
              <button
                onClick={() => setIsCustomItemModalOpen(true)}
                className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-lg text-xs text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Add Item
              </button>
            </div>
            {renderCustomItems()}
          </div>
        </div>
      )}

      {searchType === 'expansions' && displayedExpansions.length > 0 && (
        <div className="px-4 md:px-6 lg:px-8">
          <div className="p-4 md:p-10 lg:p-12">
            <h2 className="text-white font-medium text-sm mb-6">Browse by Expansion</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedExpansions.map((expansion, index) => (
                <div 
                  key={`expansion-${index}`} 
                  className="relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:border-gray-700 hover:shadow-gray-900/50"
                  onClick={() => {
                    browseExpansionCards(expansion);
                  }}
                >
                  {/* Expansion Logo/Image */}
                  <div className="aspect-[1/1] flex items-center justify-center p-4 relative">
                    {(expansion?.imageUrl || expansion?.image || expansion?.logo) ? (
                      <img
                        src={expansion.imageUrl || expansion.image || expansion.logo}
                        alt={expansion.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: (expansion?.imageUrl || expansion?.image || expansion?.logo) ? 'none' : 'flex' }}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Expansion Info */}
                  <div className="p-3">
                    <h3 className="text-white font-medium text-xs leading-tight line-clamp-2 mb-1">
                      {expansion.name}
                    </h3>
                    {expansion.releaseDate && (
                      <p className="text-gray-400 text-xs">
                        {new Date(expansion.releaseDate).getFullYear()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Expansions */}
            {hasMoreExpansions && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMoreExpansions}
                  disabled={isLoadingMoreExpansions}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                >
                  {isLoadingMoreExpansions ? 'Loading...' : 'Load More Expansions'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchType === 'search' && searchQuery.trim() && searchResults.length > 0 && (
        <div className="px-4">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">All Cards & Products</h2>
              <p className="text-xs text-gray-400">{totalResults.toLocaleString()} Total Results</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">
                Showing {searchResults.length} of {totalResults.toLocaleString()}
              </div>
              {hasMoreResults && (
                <div className="text-xs text-blue-400 mt-1">
                  Scroll down for more
                </div>
              )}
            </div>
          </div>
          
          {/* Card Grid - Responsive columns matching collection page styling */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 pb-4">
            {searchResults
              .filter(card => card && typeof card === 'object') // Filter out null/undefined results
              .map((card, index) => {
                return (
                  <div 
                    key={index} 
                    className="relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:border-gray-700 hover:shadow-gray-900/50"
                    onClick={() => handleProductClick(card)}
                  >
                    {/* Add Button - Top Right */}
                    <button 
                      className="absolute top-2 right-2 w-5 h-5 bg-blue-400/20 rounded-full flex items-center justify-center hover:bg-blue-400/30 transition-colors z-10 border border-blue-300/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCollection({ ...card, quantity: 1 });
                      }}
                    >
                      <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    {/* Card Image */}
                    <div className="aspect-[1/1] flex items-center justify-center p-4 relative">
                      {card?.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card?.name || 'Card'}
                          className="w-3/4 h-3/4 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${card?.imageUrl ? 'hidden' : 'flex'}`}>
                        <div className="text-center">
                          <div className="text-xl mb-1">📦</div>
                          <div className="text-gray-400 text-xs">No Image</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Details */}
                    <div className="p-3 space-y-1">
                      {/* Header Section */}
                      <div className="space-y-1">
                        <h3 className="text-white font-semibold leading-tight text-[11px] md:text-xs">
                          {(() => {
                            const displayName = getCardDisplayName(card) || 'Unknown Card';
                            const cleanName = getCleanItemName(card?.name, card?.set) || 'Unknown Card';
                            
                            // Check if it's a single card with a number
                            if (card?.type !== 'product' && card?.details?.cardNumber) {
                              return (
                                <>
                                  {cleanName} <span className="text-blue-400">#{card.details.cardNumber}</span>
                                </>
                              );
                            }
                            
                            // For sealed products or cards without numbers
                            return displayName;
                          })()}
                        </h3>
                        <p className="text-gray-400 text-[11px] md:text-xs">
                          {card?.set || 'Unknown Set'}
                        </p>
                      </div>
                        
                      <div className="flex justify-start mb-1">
                        <span className="bg-blue-500/70 text-white px-0.5 py-0.5 rounded text-[11px] md:text-xs font-medium">
                          {card?.type === 'product' ? 'Sealed' : (card?.rarity || 'Card')}
                        </span>
                      </div>
                      
                      {/* Financial Section - Simplified */}
                      <div className="space-y-1">
                        {/* Market Value */}
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold text-[11px] md:text-xs">
                            {card?.marketValue ? formatPrice(card.marketValue) : 'N/A'} Value
                            {card?.priceSource && (
                              <span className="ml-1 text-blue-400 text-[11px] md:text-xs">
                                ({card.priceSource === 'pricecharting' ? 'PC' : card.priceSource === 'tcgGo' ? 'TCG' : card.priceSource === 'marketData' ? 'CM' : card.priceSource})
                              </span>
                            )}
                          </span>
                        </div>
                        
                        {/* Additional Pricing Sources */}
                        {card?.prices?.priceCharting && (
                          <div className="text-gray-400 text-[11px] md:text-xs">
                          PC: {card.prices.priceCharting.loose > 0 ? formatPrice(card.prices.priceCharting.loose) : 'N/A'}
                          {card.prices.priceCharting.cib > 0 && ` | CIB: ${formatPrice(card.prices.priceCharting.cib)}`}
                          {card.prices.priceCharting.new > 0 && ` | New: ${formatPrice(card.prices.priceCharting.new)}`}
                          </div>
                        )}
                        
                        {/* Trend Data */}
                        <div className="text-gray-400 text-[11px] md:text-xs">
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
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-400 rounded-full animate-spin"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 border border-transparent border-t-blue-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                </div>
                <span className="text-sm">Loading more results...</span>
              </div>
            </div>
          )}

          {/* End of Results Indicator */}
          {!hasMoreResults && searchResults.length > 0 && (
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
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-400 rounded-full animate-spin"></div>
            {/* Inner ring for extra visual appeal */}
            <div className="absolute top-1 left-1 w-10 h-10 border-2 border-transparent border-t-blue-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
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

      {/* Default State - Show when no search query and not in specific modes */}
      {!searchQuery && searchType === 'categories' && (
        <div className="px-4 py-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">Select a category to browse or search for specific items</div>
            <div className="text-sm text-gray-500">Use the search bar above to find cards and products</div>
          </div>
        </div>
      )}

      {/* Help Text - Legacy expansions section (now moved to expansions mode) */}
      {!searchQuery && searchType !== 'categories' && searchType !== 'custom' && searchType !== 'expansions' && (
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
                  onClick={loadAllExpansionsFromSmartSearch}
                  className="text-blue-400 hover:text-blue-400 text-sm"
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
                <h2 className="text-lg font-semibold text-white">All Expansions</h2>
                <div className="text-xs text-gray-400">
                  Showing {trendingProducts.length} of {allExpansions.length} sets
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 pb-4">
                {trendingProducts.map((expansion, index) => {
                  return (
                    <div 
                      key={`expansion-${index}`} 
                      className="relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:border-gray-700 hover:shadow-gray-900/50"
                      onClick={() => {
                        browseExpansionCards(expansion);
                      }}
                    >
                      {/* Expansion Logo/Image */}
                      <div className="aspect-[1/1] flex items-center justify-center p-4 relative">
                        {(expansion?.imageUrl || expansion?.image || expansion?.logo) ? (
                          <img
                            src={expansion.imageUrl || expansion.image || expansion.logo}
                            alt={expansion?.name || 'Expansion'}
                            className="w-3/4 h-3/4 object-contain"
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
                      <div className="p-3 space-y-1">
                        {/* Expansion Name */}
                        <div>
                          <h3 className="text-white leading-tight line-clamp-2 font-bold text-xs">
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

              {/* Load More Expansions Button */}
              {hasMoreExpansions && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={loadMoreExpansions}
                    disabled={isLoadingMoreExpansions}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isLoadingMoreExpansions ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading more...
                      </>
                    ) : (
                      <>
                        Load More Expansions
                        <span className="text-xs opacity-75">
                          ({allExpansions.length - trendingProducts.length} remaining)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* End of Expansions Indicator */}
              {!hasMoreExpansions && allExpansions.length > expansionsPerPage && (
                <div className="flex justify-center mt-6">
                  <div className="text-xs text-gray-500">
                    All {allExpansions.length} expansions loaded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading State for Trending */}
          {isLoadingTrending && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">🔥 Trending Now</h2>
                <div className="text-xs text-gray-400">Loading...</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[1/1] bg-gray-800"></div>
                    <div className="p-3 space-y-1">
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

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Custom Item Confirmation Modal */}
      {showCustomItemDeleteModal && customItemToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
          onClick={() => {
            setShowCustomItemDeleteModal(false);
            setCustomItemToDelete(null);
          }}
        >
          <div 
            className="w-full bg-gray-900 border border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-white">Delete Custom Item</h2>
              <p className="text-xs text-gray-400 mt-1">
                This action cannot be undone. The item will be permanently removed from your collection.
              </p>
              
              {/* Item Preview */}
              <div className="flex items-center gap-3 mt-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
                {customItemToDelete.image_url && (
                  <div className="w-12 h-12 flex-shrink-0">
                    <img
                      src={customItemToDelete.image_url}
                      alt={customItemToDelete.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {customItemToDelete.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {customItemToDelete.set_name || 'Custom Item'}
                  </div>
                  {customItemToDelete.market_value_cents && (
                    <div className="text-xs text-blue-400">
                      ${(customItemToDelete.market_value_cents / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCustomItemDeleteModal(false);
                    setCustomItemToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCustomItem}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
