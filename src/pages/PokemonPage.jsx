/**
 * Pokemon Page
 * Dedicated page for Pokemon TCG search and browsing
 * Cleaner, more focused implementation using game-specific service
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronRight, Globe, MapPin, Plus, Check } from 'lucide-react';
import pokemonGameService from '../services/games/pokemonGameService';
import Pagination from '../components/ui/Pagination';
import { GAMES } from '../config/gamesConfig';
import SafeImage from '../components/SafeImage';
import CardPreviewModal from '../components/CardPreviewModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import CartBottomMenu from '../components/CartBottomMenu';
import { createBulkOrders } from '../utils/orderNumbering';
import { useModal } from '../contexts/ModalContext';
import { useCart } from '../contexts/CartContext';
import { useGlobalHeader } from '../contexts/GlobalHeaderContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';

const PokemonPage = () => {
  const navigate = useNavigate();
  const { expansionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal, closeModal } = useModal();
  const { isCartMenuOpen, isMultiSelectMode: contextMultiSelectMode, openCartMenu, closeCartMenu: contextCloseCartMenu, enterMultiSelectMode, exitMultiSelectMode: contextExitMultiSelectMode } = useCart();
  const { setOnSearch } = useGlobalHeader();
  const queryClient = useQueryClient();

  // State
  const [view, setView] = useState('expansions'); // 'expansions', 'search', 'expansion-detail'
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState([]);
  const [expansions, setExpansions] = useState([]);
  const [selectedExpansion, setSelectedExpansion] = useState(null);
  const [expansionCards, setExpansionCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpansions, setTotalExpansions] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [languageFilter, setLanguageFilter] = useState('english'); // 'english', 'japanese'
  const [productTypeFilter, setProductTypeFilter] = useState('singles'); // 'singles', 'sealed'
  
  // Stable flag to prevent header from disappearing during loading
  const [showExpansionHeader, setShowExpansionHeader] = useState(false);
  const [headerTimeoutId, setHeaderTimeoutId] = useState(null);
  
  // Modal state
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false);
  const [selectedCardForCollection, setSelectedCardForCollection] = useState(null);
  
  // Cart state for multi-item orders
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [holdTimeout, setHoldTimeout] = useState(null);
  const [justCompletedHoldSelect, setJustCompletedHoldSelect] = useState(false);
  
  // Success popup states for multi-order creation
  const [showMultiOrderProcessing, setShowMultiOrderProcessing] = useState(false);
  const [showMultiOrderSuccess, setShowMultiOrderSuccess] = useState(false);
  const [multiOrderSuccessData, setMultiOrderSuccessData] = useState(null);

  // Get game config
  const gameConfig = GAMES.POKEMON;

  // Load expansions on mount and when page or language filter changes
  useEffect(() => {
    loadExpansions();
  }, [languageFilter]);

  // Load expansions on mount if we have an expansionId but no expansions loaded yet
  useEffect(() => {
    if (expansionId && expansions.length === 0) {
      loadExpansions();
    }
  }, [expansionId]);

  // Reset to page 1 when language filter changes
  useEffect(() => {
    setPage(1);
  }, [languageFilter]);

  // Reset to page 1 when product type filter changes and reload expansion cards
  useEffect(() => {
    if (view === 'expansion-detail' && selectedExpansion) {
      setPage(1);
      loadExpansionCards(selectedExpansion.id, 1);
    }
  }, [productTypeFilter]);

  // Handle page changes
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadExpansions(newPage);
    }
  };

  // Handle expansion cards page change
  const handleExpansionPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadExpansionCards(expansionId, newPage);
    }
  };

  // Handle search page change
  const handleSearchPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      handleSearch(searchQuery, newPage);
    }
  };

  // Expansions are now filtered on the backend, so we use them directly
  const filteredExpansions = expansions;

  // Handle expansion from URL - only after expansions are loaded
  useEffect(() => {
    // Clear any existing timeout
    if (headerTimeoutId) {
      clearTimeout(headerTimeoutId);
      setHeaderTimeoutId(null);
    }

    if (expansionId && expansions.length > 0) {
      // Check if the expansion exists in our loaded expansions
      const expansion = expansions.find(e => e.id === expansionId);
      if (expansion) {
        setView('expansion-detail');
        setShowExpansionHeader(true);
        setSelectedExpansion(expansion);
        loadExpansionCards(expansionId);
      } else {
        // Expansion not found, redirect to pokemon page
        console.warn(`Expansion ${expansionId} not found, redirecting to pokemon page`);
        navigate('/pokemon');
      }
    } else if (searchQuery) {
      setView('search');
      // Delay hiding header to prevent flickering
      const timeoutId = setTimeout(() => setShowExpansionHeader(false), 100);
      setHeaderTimeoutId(timeoutId);
      handleSearch();
    } else {
      setView('expansions');
      // Delay hiding header to prevent flickering
      const timeoutId = setTimeout(() => setShowExpansionHeader(false), 100);
      setHeaderTimeoutId(timeoutId);
    }
  }, [expansionId, searchQuery, expansions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (headerTimeoutId) {
        clearTimeout(headerTimeoutId);
      }
    };
  }, [headerTimeoutId]);

  /**
   * Load expansions with pagination
   */
  const loadExpansions = async (pageNum = page) => {
    setLoading(true);
    try {
      const result = await pokemonGameService.getExpansions({ 
        page: pageNum,
        pageSize: 30,
        sortBy: 'release_date',
        sortOrder: 'desc',
        languageFilter: languageFilter
      });
      setExpansions(result.data || []);
      setTotalExpansions(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / 30));
    } catch (error) {
      console.error('Error loading expansions:', error);
      setExpansions([]);
      setTotalExpansions(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load cards for a specific expansion
   */
  const loadExpansionCards = async (expId, pageNum = 1) => {
    setLoading(true);
    // Don't reset totalCards immediately to keep the header stable
    try {
      let result;
      
      if (productTypeFilter === 'sealed') {
        // Load sealed products
        result = await pokemonGameService.getSealedProductsByExpansion(expId, {
          page: pageNum,
          pageSize: 30,
          sortBy: 'name',
          sortOrder: 'asc'
        });
      } else {
        // Load single cards
        result = await pokemonGameService.getCardsByExpansion(expId, {
          page: pageNum,
          pageSize: 30,
          sortBy: 'number',
          sortOrder: 'asc'
        });
      }
      
      setExpansionCards(result.data || []);
      setPage(pageNum);
      setTotalPages(result.totalPages || 1);
      setTotalCards(result.total || 0);
    } catch (error) {
      console.error('Error loading expansion cards:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle search - searches both cards and sealed products
   */
  const handleSearch = async (query = searchQuery, pageNum = 1) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    try {
      // Search both cards and sealed products in parallel
      const [cardsResult, sealedResult] = await Promise.all([
        pokemonGameService.searchCards(query.trim(), {
          page: pageNum,
          pageSize: 15 // Half the page size for cards
        }),
        pokemonGameService.searchSealedProducts(query.trim(), {
          page: pageNum,
          pageSize: 15 // Half the page size for sealed products
        })
      ]);

      // Combine results from both searches
      const combinedResults = [
        ...(cardsResult.data || []),
        ...(sealedResult.data || [])
      ];

      // Calculate combined totals
      const combinedTotal = (cardsResult.total || 0) + (sealedResult.total || 0);
      const combinedTotalPages = Math.ceil(combinedTotal / 30);

      setSearchResults(combinedResults);
      setPage(pageNum);
      setTotalPages(combinedTotalPages);
      setTotalCards(combinedTotal);
      setSearchParams({ q: query });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle expansion click
   */
  const handleExpansionClick = (expansion) => {
    navigate(`/pokemon/expansions/${expansion.id}`);
  };

  /**
   * Handle card click - directly open Add to Collection modal
   */
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
      // Normal card click - open Add to Collection modal
      setSelectedCardForCollection(card);
      setIsAddToCollectionModalOpen(true);
      openModal();
    }
  };


  // Handle search from global header
  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    setSearchParams({ q: query });
    setView('search');
    handleSearch(query);
  };

  // Cart management functions
  const addToCart = (card) => {
    const cardData = {
      id: card.id,
      name: card.name,
      set: card.set_name || card.expansion_name,
      marketValue: parseFloat(card.marketValue || 0),
      price: null, // User will enter their own price in the cart
      imageUrl: card.image_url,
      source: 'pokemon',
      itemType: card.itemType || (card.supertype === 'Sealed Product' ? 'Sealed' : 'Single'),
      cardCondition: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : 'Raw',
      gradingCompany: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
      gradingGrade: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
      api_id: card.id
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
    if (quantity === '') {
      setCartItems(prev => 
        prev.map(item => 
          item.id === cardId 
            ? { ...item, quantity: '' }
            : item
        )
      );
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.id === cardId 
            ? { ...item, quantity: parseInt(quantity) || 1 }
            : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedItems(new Set());
    contextExitMultiSelectMode();
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
          // Add new item to cart
          const cardData = {
            id: card.id,
            name: card.name,
            set: card.set_name || card.expansion_name,
            marketValue: parseFloat(card.marketValue || 0),
            price: null, // User will enter their own price in the cart
            imageUrl: card.image_url,
            source: 'pokemon',
            itemType: card.itemType || (card.supertype === 'Sealed Product' ? 'Sealed' : 'Single'),
            cardCondition: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : 'Raw',
            gradingCompany: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
            gradingGrade: card.itemType === 'Sealed' || card.supertype === 'Sealed Product' ? null : null,
            api_id: card.id
          };
          newCart = [...prev, { ...cardData, quantity: 1 }];
        }
        
        return newCart;
      });
      
      // Open cart menu
      openCartMenu();
      
      // Reset the flag after a short delay to allow normal clicking
      setTimeout(() => {
        setJustCompletedHoldSelect(false);
      }, 200);
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

  // Exit multi-select mode
  const exitMultiSelectMode = () => {
    // Create order directly when Done is clicked
    if (cartItems.length > 0) {
      const orderData = {
        orderDate: new Date().toISOString().split('T')[0],
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

  // Create order directly
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
        const itemPrice = item.price || item.marketValue || 0;
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

        // Skip items without proper pokemon_card_id (they shouldn't be in the cart)
        if (!item.api_id) {
          console.error('Skipping order creation for item without api_id:', item.name);
          return null;
        }

        return {
          // User identification
          user_id: user.id,
          // Link directly to pokemon_cards table
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
          order_group_id: orderData.orderGroupId,
          
          // Item classification fields
          item_type: itemType,
          card_condition: cardCondition,
          grading_company: gradingCompany,
          grading_grade: gradingGrade
        };
      });

      // Get the order data and filter out null results
      const ordersData = (await Promise.all(orderPromises)).filter(order => order !== null);

      // Generate a single order group ID for all items in this multi-order
      const orderGroupId = crypto.randomUUID();

      // Update orders with the group ID
      const ordersWithGroupId = ordersData.map(order => ({
        ...order,
        order_group_id: orderGroupId
      }));

      // Use the bulk orders utility to get proper order numbers
      const ordersWithNumbers = await createBulkOrders(supabase, ordersWithGroupId);

      // Create individual orders for each item
      const orderCreationPromises = ordersWithNumbers.map(async (orderData) => {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;
        return order;
      });

      const orders = await Promise.all(orderCreationPromises);

      // Show success popup
      setShowMultiOrderProcessing(false);
      setShowMultiOrderSuccess(true);

      // Clear cart after success
      setTimeout(() => {
        setCartItems([]);
        setSelectedItems(new Set());
        contextExitMultiSelectMode();
        contextCloseCartMenu();
        setShowMultiOrderSuccess(false);
        setMultiOrderSuccessData(null);
      }, 3000);

    } catch (error) {
      console.error('Error creating order:', error);
      setShowMultiOrderProcessing(false);
      // Handle error - could show error message
    }
  };

  // Set up global header when component mounts
  useEffect(() => {
    setOnSearch(() => handleGlobalSearch);
  }, [setOnSearch]);

  // Handle cart state changes
  useEffect(() => {
    if (contextMultiSelectMode && cartItems.length === 0) {
      contextExitMultiSelectMode();
      setSelectedItems(new Set());
      contextCloseCartMenu();
    }
  }, [cartItems.length, contextMultiSelectMode, contextExitMultiSelectMode, contextCloseCartMenu]);

  // Generate breadcrumbs based on current view
  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      { name: 'Categories', path: '/categories' }
    ];

    if (view === 'expansion-detail' && selectedExpansion) {
      breadcrumbs.push(
        { name: 'Pokémon', path: '/pokemon' },
        { name: selectedExpansion.name, path: null, isCurrent: true }
      );
    } else if (view === 'search') {
      breadcrumbs.push(
        { name: 'Pokémon', path: '/pokemon' },
        { name: 'Search Results', path: null, isCurrent: true }
      );
    } else {
      breadcrumbs.push(
        { name: 'Pokémon', path: null, isCurrent: true }
      );
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Simple Page Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-1 text-xs mb-4">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={index} className="flex items-center space-x-1">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500" />}
                {breadcrumb.path && !breadcrumb.isCurrent ? (
                  <button
                    onClick={() => navigate(breadcrumb.path)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {breadcrumb.name}
                  </button>
                ) : (
                  <span className={`font-medium ${breadcrumb.isCurrent ? 'text-indigo-400' : 'text-gray-300'}`}>
                    {breadcrumb.name}
                  </span>
                )}
              </div>
            ))}
          </nav>

          {/* Logo and Expansions Header - Only show when in expansions view */}
          {view === 'expansions' && (
            <div className="flex items-end justify-between mb-1">
              {/* Title and Count - Bottom aligned with toggle */}
              <div className="flex flex-col">
                <h2 className="font-semibold text-white leading-tight" style={{ fontSize: '14px' }}>
                  {languageFilter === 'english' ? 'English Expansions' : 'Japanese Expansions'}
                </h2>
                <span className="text-xs text-gray-400 leading-tight mt-0.5">
                  {totalExpansions} expansion{totalExpansions !== 1 ? 's' : ''} found
                </span>
              </div>

              {/* Logo and Toggle Container */}
              <div className="flex flex-col items-center space-y-1">
                {/* Pokémon Logo - Centered above toggle */}
                <img 
                  src={gameConfig.logo}
                  alt={gameConfig.name}
                  className="h-8 w-36 object-contain"
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
          )}

          {/* Logo - Only show game logo when not in expansion detail and not in expansions view */}
          {view !== 'expansion-detail' && view !== 'expansions' && (
            <div className="flex items-center mb-4">
              {gameConfig.logo && (
                <img
                  src={gameConfig.logo}
                  alt={gameConfig.name}
                  className="h-8 w-auto"
                />
              )}
            </div>
          )}

          {/* Expansion Detail Header - Only show when in expansion detail view */}
          {showExpansionHeader && (
            <div className="flex items-end justify-between">
              {/* Expansion Title and Count - Bottom aligned with toggle */}
              <div className="flex flex-col">
                <h2 className="font-semibold text-white leading-tight" style={{ fontSize: '14px' }}>
                  {selectedExpansion?.name || 'Expansion'}
                </h2>
                <span className="text-xs text-gray-400 leading-tight mt-0.5">
                  {loading ? 'Loading...' : `${totalCards} ${productTypeFilter === 'singles' ? 'cards' : 'products'} found`}
                </span>
              </div>

              {/* Logo and Toggle Container */}
              <div className="flex flex-col items-end space-y-2">
                {/* Expansion Logo - Same width as toggle */}
                {selectedExpansion?.logo && (
                  <img
                    src={selectedExpansion.logo}
                    alt={selectedExpansion.name}
                    className="h-8 w-36 object-contain"
                  />
                )}
                
                {/* Product Type Toggle */}
                <div className="relative inline-flex rounded-lg bg-gray-800 p-1">
                  <button
                    onClick={() => setProductTypeFilter('singles')}
                    disabled={loading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      productTypeFilter === 'singles' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-transparent text-white hover:bg-gray-700'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Singles
                  </button>
                  <button
                    onClick={() => setProductTypeFilter('sealed')}
                    disabled={loading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      productTypeFilter === 'sealed' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-transparent text-white hover:bg-gray-700'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Sealed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {(loading && view === 'expansions') || (expansionId && expansions.length === 0) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Expansions View */}
            {view === 'expansions' && (
              <div>

                {/* Expansions Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredExpansions.map((expansion) => (
                    <button
                      key={expansion.id}
                      onClick={() => handleExpansionClick(expansion)}
                      className="group bg-transparent rounded-lg border border-gray-700 hover:border-gray-600 transition-all p-4 text-left"
                    >
                      {expansion.logo && (
                        <img
                          src={expansion.logo}
                          alt={expansion.name}
                          className="w-full h-32 object-contain mb-3 bg-transparent"
                        />
                      )}
                      <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-400">
                        {expansion.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {expansion.total_cards || 0} cards
                      </p>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  pageSize={30}
                  totalItems={totalExpansions}
                  className="mt-8"
                  hasBottomMenu={contextMultiSelectMode || isCartMenuOpen}
                  bottomMenuHeight={133}
                />
              </div>
            )}

            {/* Expansion Detail View */}
            {showExpansionHeader && (
              <div>
                {/* Content Area */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {expansionCards.map((item) => {
                        const isInCart = cartItems.some(cartItem => cartItem.id === item.id);
                        const isSelected = selectedItems.has(item.id);
                        const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
                        
                        return (
                          <div
                            key={item.id}
                            className={`group bg-transparent rounded-lg border transition-all p-3 flex flex-col h-full ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-500/10' 
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                            onClick={(e) => {
                              // Only handle clicks in multi-select mode
                              if (contextMultiSelectMode) {
                                handleCardClick(item);
                              }
                            }}
                            onMouseDown={(e) => {
                              handleCardPressStart(item);
                            }}
                            onMouseUp={handleCardPressEnd}
                            onMouseLeave={handleCardPressEnd}
                            onTouchStart={(e) => {
                              handleCardPressStart(item);
                            }}
                            onTouchEnd={handleCardPressEnd}
                          >
                      {/* Image Section - Top 2/3 */}
                      <div className="flex-1 mb-3">
                        <SafeImage
                          src={item.image_url}
                          alt={item.name}
                          className={`w-full object-contain bg-transparent rounded ${
                            productTypeFilter === 'singles' ? 'aspect-[5/7]' : 'aspect-[4/3]'
                          }`}
                        />
                      </div>
                      
                      {/* Text Details Section - Bottom 1/3 */}
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Name */}
                        <h3 className="font-semibold text-white truncate mb-1" style={{ fontSize: '12px' }}>
                          {item.name}
                        </h3>
                        
                        {/* Set */}
                        <p className="text-gray-300 truncate mb-1" style={{ fontSize: '12px' }}>
                          {productTypeFilter === 'singles' 
                            ? (item.set_name || item.expansion_name || 'Unknown Set')
                            : (item.expansion_name || 'Unknown Set')
                          }
                        </p>
                        
                        {/* Card # • Type */}
                        <div className="text-blue-400 mb-3" style={{ fontSize: '12px' }}>
                          {productTypeFilter === 'singles' && item.number && (
                            <span>#{item.number}</span>
                          )}
                          {productTypeFilter === 'singles' && item.number && (
                            <span className="mx-1">•</span>
                          )}
                          <span>
                            {productTypeFilter === 'singles' 
                              ? (item.rarity || 'Common')
                              : 'Sealed'
                            }
                          </span>
                        </div>
                        
                        {/* Bottom section with Market Value and Action Button */}
                        <div className="flex justify-between items-center">
                          {/* Market Value */}
                          {item.marketValue > 0 && (
                            <div className="font-semibold text-white" style={{ fontSize: '12px' }}>
                              ${item.marketValue.toFixed(2)}
                            </div>
                          )}
                          
                          {/* Action Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(item);
                            }}
                            className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {contextMultiSelectMode ? (
                              isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-indigo-400"></div>
                              )
                            ) : (
                              <Plus className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Cart Quantity Indicator */}
                      {isInCart && cartItem && (
                        <div className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
                    </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={handleExpansionPageChange}
                      pageSize={30}
                      totalItems={totalCards}
                      className="mt-6"
                      hasBottomMenu={contextMultiSelectMode || isCartMenuOpen}
                      bottomMenuHeight={133}
                    />
                  </>
                )}
              </div>
            )}

            {/* Search Results View */}
            {view === 'search' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">
                  {searchResults.length} results
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {searchResults.map((card) => {
                    const isInCart = cartItems.some(cartItem => cartItem.id === card.id);
                    const isSelected = selectedItems.has(card.id);
                    const cartItem = cartItems.find(cartItem => cartItem.id === card.id);
                    
                    return (
                      <div
                        key={card.id}
                        className={`group bg-transparent rounded-lg border transition-all p-3 flex flex-col h-full ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-500/10' 
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={(e) => {
                          // Only handle clicks in multi-select mode
                          if (contextMultiSelectMode) {
                            handleCardClick(card);
                          }
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
                      {/* Image Section - Top 2/3 */}
                      <div className="flex-1 mb-3">
                        <SafeImage
                          src={card.image_url}
                          alt={card.name}
                          className="w-full object-contain bg-transparent rounded aspect-[5/7]"
                        />
                      </div>
                      
                      {/* Text Details Section - Bottom 1/3 */}
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Name */}
                        <h3 className="font-semibold text-white truncate mb-1" style={{ fontSize: '12px' }}>
                          {card.name}
                        </h3>
                        
                        {/* Set */}
                        <p className="text-gray-300 truncate mb-1" style={{ fontSize: '12px' }}>
                          {card.set_name || 'Unknown Set'}
                        </p>
                        
                        {/* Card # • Type */}
                        <div className="text-blue-400 mb-3" style={{ fontSize: '12px' }}>
                          {card.number && (
                            <span>#{card.number}</span>
                          )}
                          {card.number && (
                            <span className="mx-1">•</span>
                          )}
                          <span>
                            {card.rarity || 'Common'}
                          </span>
                        </div>
                        
                        {/* Bottom section with Market Value and Action Button */}
                        <div className="flex justify-between items-center">
                          {/* Market Value */}
                          {card.marketValue > 0 && (
                            <div className="font-semibold text-white" style={{ fontSize: '12px' }}>
                              ${card.marketValue.toFixed(2)}
                            </div>
                          )}
                          
                          {/* Action Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(card);
                            }}
                            className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {contextMultiSelectMode ? (
                              isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-indigo-400"></div>
                              )
                            ) : (
                              <Plus className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Cart Quantity Indicator */}
                      {isInCart && cartItem && (
                        <div className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handleSearchPageChange}
                  pageSize={30}
                  totalItems={totalCards}
                  className="mt-6"
                  hasBottomMenu={contextMultiSelectMode || isCartMenuOpen}
                  bottomMenuHeight={133}
                />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Add to Collection Modal */}
      {isAddToCollectionModalOpen && selectedCardForCollection && (
        <AddToCollectionModal
          product={{
            name: selectedCardForCollection.name,
            set: selectedCardForCollection.set_name || selectedCardForCollection.expansion_name,
            marketValue: parseFloat(selectedCardForCollection.marketValue || selectedCardForCollection.market_value || 0),
            imageUrl: selectedCardForCollection.image_url,
            source: 'api',
            api_id: selectedCardForCollection.id,
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
          }}
          hasCartMenuActive={contextMultiSelectMode || isCartMenuOpen}
          cartMenuHeight={133}
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
        hasOtherModalsActive={isAddToCollectionModalOpen}
      />
    </div>
  );
};

export default PokemonPage;

