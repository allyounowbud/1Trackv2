import React, { useState, useEffect, useRef } from 'react';
import { 
  UniversalCard, 
  UniversalBulkMenu, 
  UniversalOrderBook, 
  UniversalSearchBar, 
  UniversalGrid, 
  UniversalBottomNavigation,
  UniversalTopSearchBar
} from '../components/ui';
import UniversalOrderBookMenu from '../components/ui/UniversalOrderBookMenu';
import AddToCollectionModal from '../components/AddToCollectionModal';
import MultiItemOrderModal from '../components/MultiItemOrderModal';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingModal from '../components/LoadingModal';
import { supabase } from '../lib/supabaseClient';

/**
 * Universal Components Test Page
 * 
 * A comprehensive test page showcasing all universal components
 * with different variants, states, and interactions.
 */
const UniversalComponentsTest = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(false);
  const [selectedItemForOrderBook, setSelectedItemForOrderBook] = useState(null);
  const [activeVariant, setActiveVariant] = useState('collection');
  const [realPokemonCards, setRealPokemonCards] = useState([]);
  const [isLoadingRealCards, setIsLoadingRealCards] = useState(false);
  
  // Page simulation states
  const [isCollectionSelectionMode, setIsCollectionSelectionMode] = useState(false);
  const [collectionSelectedItems, setCollectionSelectedItems] = useState(new Set());
  const [isSearchSelectionMode, setIsSearchSelectionMode] = useState(false);
  const [searchSelectedItems, setSearchSelectedItems] = useState(new Set());
  const [isCollectionActionsMenuOpen, setIsCollectionActionsMenuOpen] = useState(false);
  const [isSearchActionsMenuOpen, setIsSearchActionsMenuOpen] = useState(false);
  const [shouldPreOpenActions, setShouldPreOpenActions] = useState(false);

  // Prevent body scroll when any actions menu is open
  React.useEffect(() => {
    const isAnyMenuOpen = isCollectionActionsMenuOpen || isSearchActionsMenuOpen;
    
    if (isAnyMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isCollectionActionsMenuOpen, isSearchActionsMenuOpen]);

  // Ensure blur overlay is cleared when bulk menu closes
  React.useEffect(() => {
    if (!isCollectionSelectionMode && collectionSelectedItems.size === 0) {
      setIsCollectionActionsMenuOpen(false);
    }
  }, [isCollectionSelectionMode, collectionSelectedItems.size]);
  
  // Modal states
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [showMultiItemOrderModal, setShowMultiItemOrderModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [selectedItemForCollection, setSelectedItemForCollection] = useState(null);
  const [confirmationConfig, setConfirmationConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Mock data for different variants
  const mockCollectionItems = [
    {
      id: 1,
      name: 'Charizard ex',
      set: 'Obsidian Flames',
      cardNumber: '025',
      condition: 'Near Mint',
      image: 'https://images.pokemontcg.io/sv4pt5/025_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4pt5/025_hires.png',
      value: 89.99,
      totalPaid: 75.00,
      quantity: 1,
      item: {
        id: 1,
        name: 'Charizard ex',
        set_name: 'Obsidian Flames',
        image_url: 'https://images.pokemontcg.io/sv4pt5/025_hires.png'
      }
    },
    {
      id: 2,
      name: 'Mew ex',
      set: '151',
      cardNumber: '151',
      condition: 'Lightly Played',
      image: 'https://images.pokemontcg.io/sv4/151_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4/151_hires.png',
      value: 45.00,
      totalPaid: 35.00,
      quantity: 2,
      item: {
        id: 2,
        name: 'Mew ex',
        set_name: '151',
        image_url: 'https://images.pokemontcg.io/sv4/151_hires.png'
      }
    },
    {
      id: 3,
      name: 'Pikachu ex',
      set: '151',
      cardNumber: '173',
      condition: 'Sealed',
      image: 'https://images.pokemontcg.io/sv4/173_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4/173_hires.png',
      value: 125.00,
      totalPaid: 100.00,
      quantity: 1,
      item: {
        id: 3,
        name: 'Pikachu ex',
        set_name: '151',
        image_url: 'https://images.pokemontcg.io/sv4/173_hires.png'
      }
    },
    {
      id: 7,
      name: 'Charizard ex',
      set: '151',
      image: 'https://images.pokemontcg.io/sv4/183_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4/183_hires.png',
      value: 95.00,
      totalPaid: 80.00,
      quantity: 1,
      item: {
        id: 7,
        name: 'Charizard ex',
        set_name: '151',
        image_url: 'https://images.pokemontcg.io/sv4/183_hires.png'
      }
    },
    {
      id: 8,
      name: 'Mewtwo ex',
      set: '151',
      image: 'https://images.pokemontcg.io/sv4/205_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4/205_hires.png',
      value: 65.00,
      totalPaid: 55.00,
      quantity: 1,
      item: {
        id: 8,
        name: 'Mewtwo ex',
        set_name: '151',
        image_url: 'https://images.pokemontcg.io/sv4/205_hires.png'
      }
    },
    {
      id: 9,
      name: 'Alakazam ex',
      set: '151',
      image: 'https://images.pokemontcg.io/sv4/188_hires.png',
      imageUrl: 'https://images.pokemontcg.io/sv4/188_hires.png',
      value: 35.00,
      totalPaid: 28.00,
      quantity: 2,
      item: {
        id: 9,
        name: 'Alakazam ex',
        set_name: '151',
        image_url: 'https://images.pokemontcg.io/sv4/188_hires.png'
      }
    },
    {
      id: 10,
      name: 'Binder',
      set: 'Evolving Skies',
      image: null,
      imageUrl: null,
      value: 45.00,
      totalPaid: 40.00,
      quantity: 2,
      item: {
        id: 10,
        name: 'Binder',
        set_name: 'Evolving Skies',
        image_url: null
      }
    },
    {
      id: 11,
      name: 'Card Case',
      set: 'Fusion Strike',
      image: null,
      imageUrl: null,
      value: 15.00,
      totalPaid: 12.00,
      quantity: 4,
      item: {
        id: 11,
        name: 'Card Case',
        set_name: 'Fusion Strike',
        image_url: null
      }
    },
    {
      id: 12,
      name: 'Storage Box',
      set: 'Brilliant Stars',
      image: null,
      imageUrl: null,
      value: 20.00,
      totalPaid: 18.00,
      quantity: 2,
      item: {
        id: 12,
        name: 'Storage Box',
        set_name: 'Brilliant Stars',
        image_url: null
      }
    }
  ];

  const mockPokemonItems = [
    {
      id: 4,
      name: 'Charizard',
      set: 'Base Set',
      image: null,
      imageUrl: null,
      cardNumber: '4',
      price: 299.99,
      item: {
        id: 4,
        name: 'Charizard',
        set_name: 'Base Set',
        image_url: null
      }
    },
    {
      id: 5,
      name: 'Blastoise',
      set: 'Base Set',
      image: null,
      imageUrl: null,
      cardNumber: '2',
      price: 199.99,
      item: {
        id: 5,
        name: 'Blastoise',
        set_name: 'Base Set',
        image_url: null
      }
    },
    {
      id: 6,
      name: 'Venusaur',
      set: 'Base Set',
      image: null,
      imageUrl: null,
      cardNumber: '15',
      price: 149.99,
      item: {
        id: 6,
        name: 'Venusaur',
        set_name: 'Base Set',
        image_url: null
      }
    }
  ];

  const mockSearchItems = [
    {
      id: 7,
      name: 'Pikachu',
      set: 'Base Set',
      image: null,
      imageUrl: null,
      price: 89.99,
      item: {
        id: 7,
        name: 'Pikachu',
        set_name: 'Base Set',
        image_url: null
      }
    },
    {
      id: 8,
      name: 'Mewtwo',
      set: 'Base Set',
      image: null,
      imageUrl: null,
      price: 179.99,
      item: {
        id: 8,
        name: 'Mewtwo',
        set_name: 'Base Set',
        image_url: null
      }
    }
  ];

  const mockOrders = [
    {
      id: 1,
      order_number: 'ORD-001',
      purchase_date: '2024-01-15',
      retailer_name: 'Amazon',
      quantity: 3,
      quantity_sold: 1,
      price_per_item_cents: 4000,
      item_id: 1 // Charizard ex
    },
    {
      id: 2,
      order_number: 'ORD-002',
      purchase_date: '2024-01-20',
      retailer_name: 'eBay',
      quantity: 5,
      quantity_sold: 0,
      price_per_item_cents: 500,
      item_id: 1 // Charizard ex
    },
    {
      id: 3,
      order_number: 'ORD-003',
      purchase_date: '2024-02-03',
      retailer_name: 'GameStop',
      quantity: 2,
      quantity_sold: 2,
      price_per_item_cents: 2500,
      item_id: 2 // Pikachu
    },
    {
      id: 4,
      order_number: 'ORD-004',
      purchase_date: '2024-02-10',
      retailer_name: 'Target',
      quantity: 4,
      quantity_sold: 1,
      price_per_item_cents: 1800,
      item_id: 3 // Blastoise
    },
    {
      id: 5,
      order_number: 'ORD-005',
      purchase_date: '2024-02-18',
      retailer_name: 'Walmart',
      quantity: 1,
      quantity_sold: 0,
      price_per_item_cents: 7500,
      item_id: 1 // Charizard ex
    }
  ];

  // Fetch real pokemon cards from database
  const fetchRealPokemonCards = async () => {
    setIsLoadingRealCards(true);
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select(`
          id,
          name,
          number,
          rarity,
          expansion_name,
          image_url,
          market_price,
          low_price,
          mid_price,
          high_price,
          types,
          supertype
        `)
        .not('image_url', 'is', null)
        .limit(12)
        .order('market_price', { ascending: false, nullsLast: true });

      if (error) {
        console.error('Error fetching pokemon cards:', error);
        return;
      }

      // Format the cards to match our component structure
      const formattedCards = data.map((card, index) => ({
        id: `real-${card.id}`,
        name: card.name,
        set: card.expansion_name || 'Unknown Set',
        image: card.image_url,
        imageUrl: card.image_url,
        cardNumber: card.number,
        price: card.market_price || 0,
        value: card.market_price || 0,
        totalPaid: (card.market_price || 0) * 0.8, // Mock paid price
        quantity: Math.floor(Math.random() * 5) + 1, // Random quantity 1-5
        rarity: card.rarity,
        types: card.types || [],
        supertype: card.supertype,
        item: {
          id: `real-${card.id}`,
          name: card.name,
          set_name: card.expansion_name || 'Unknown Set',
          image_url: card.image_url
        }
      }));

      setRealPokemonCards(formattedCards);
    } catch (error) {
      console.error('Error fetching pokemon cards:', error);
    } finally {
      setIsLoadingRealCards(false);
    }
  };

  // Get current items based on variant
  const getCurrentItems = () => {
    switch (activeVariant) {
      case 'collection':
        return mockCollectionItems;
      case 'pokemon':
        return realPokemonCards.length > 0 ? realPokemonCards : mockPokemonItems;
      case 'search':
        return mockSearchItems;
      default:
        return mockCollectionItems;
    }
  };

  // Set default item for Order Book
  React.useEffect(() => {
    if (!selectedItemForOrderBook && mockCollectionItems.length > 0) {
      setSelectedItemForOrderBook(mockCollectionItems[0]);
    }
  }, [selectedItemForOrderBook]);

  // Event handlers
  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
  };

  const handleLongPress = (itemId) => {
    setIsBulkSelectionMode(true);
    setSelectedItems(new Set([itemId]));
    setShowBulkMenu(true);
  };

  const handleSelectionToggle = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
    setShowBulkMenu(newSelection.size > 0);
  };

  const handleBulkMenuAction = (action) => {
    console.log(`${action} action triggered for ${selectedItems.size} items`);
    // Handle bulk actions
  };

  const handleOrderBookOpen = (item) => {
    setSelectedItemForOrderBook(item);
    setShowOrderBook(true);
  };

  const handleOrderBookClose = () => {
    setShowOrderBook(false);
    setSelectedItemForOrderBook(null);
  };

  const handleOrderEdit = (orderId, editData) => {
    console.log('Edit order:', orderId, editData);
  };

  const handleOrderDelete = (orderId) => {
    console.log('Delete order:', orderId);
  };

  const handleMarkAsSold = (orderId) => {
    console.log('Mark as sold:', orderId);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  const handleBulkMenuCancel = () => {
    setSelectedItems(new Set());
    setShowBulkMenu(false);
    setIsBulkSelectionMode(false);
  };

  // Load real pokemon cards when component mounts
  useEffect(() => {
    if (activeVariant === 'pokemon' && realPokemonCards.length === 0) {
      fetchRealPokemonCards();
    }
  }, [activeVariant]);

  // Modal handlers
  const handleShowConfirmation = (title, message, onConfirm) => {
    setConfirmationConfig({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setShowConfirmationModal(false);
      },
      onCancel: () => setShowConfirmationModal(false)
    });
    setShowConfirmationModal(true);
  };

  const handleAddToCollection = () => {
    console.log('Add to collection action');
    setShowAddToCollectionModal(true);
  };

  const handleMultiItemOrder = () => {
    console.log('Multi-item order action');
    setShowMultiItemOrderModal(true);
  };

  const handleLoadingTest = () => {
    setShowLoadingModal(true);
    // Simulate loading for 3 seconds
    setTimeout(() => {
      setShowLoadingModal(false);
    }, 3000);
  };

  const currentItems = getCurrentItems();

  return (
    <div 
      className={`min-h-screen bg-gray-50 ${(isCollectionActionsMenuOpen || isSearchActionsMenuOpen) ? 'pointer-events-none' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Universal Components Test Page
          </h1>
          
          
          <p className="text-gray-600 mb-6">
            Test and preview all universal components with different variants and states.
          </p>
          
          {/* Variant Selector */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Variant:</span>
              <select
                value={activeVariant}
                onChange={(e) => setActiveVariant(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="collection">Collection (All Actions)</option>
                <option value="pokemon">Pokemon (Real Cards)</option>
                <option value="search">Search (Add to Collection Only)</option>
              </select>
              <div className="text-sm text-gray-600 ml-4">
                {activeVariant === 'collection' && 'Shows: View Order Book, Override Price, Delete'}
                {activeVariant === 'pokemon' && 'Uses real Pokemon cards from database'}
                {activeVariant === 'search' && 'Shows only: Add to Collection'}
              </div>
            </div>

            {/* Load Real Pokemon Cards Button */}
            {activeVariant === 'pokemon' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRealPokemonCards}
                  disabled={isLoadingRealCards}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm transition-colors"
                >
                  {isLoadingRealCards ? 'Loading...' : 'Load Real Cards'}
                </button>
                <span className="text-xs text-gray-500">
                  {realPokemonCards.length > 0 ? `${realPokemonCards.length} real cards loaded` : 'Using mock data'}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Selection Mode:</span>
              <button
                onClick={() => {
                  setIsBulkSelectionMode(!isBulkSelectionMode);
                  if (isBulkSelectionMode) {
                    setSelectedItems(new Set());
                    setShowBulkMenu(false);
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  isBulkSelectionMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isBulkSelectionMode ? 'Exit Selection' : 'Enter Selection'}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Bar</h3>
            <UniversalSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${activeVariant} items...`}
              variant={activeVariant}
              showResultsCount={true}
              resultsCount={currentItems.length}
              onClear={handleSearchClear}
            />
          </div>
        </div>
      </div>

      {/* Page-like Sections for Testing */}
      <div className="py-6 space-y-8" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
        
        {/* Collection Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Collection Page Simulation</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items in your collection</span>
                <button
                  onClick={() => {
                    setIsCollectionSelectionMode(!isCollectionSelectionMode);
                    if (isCollectionSelectionMode) {
                      setCollectionSelectedItems(new Set());
                    }
                  }}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    isCollectionSelectionMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isCollectionSelectionMode ? 'Exit Selection' : 'Enter Selection'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Selection Hint */}
          {!isCollectionSelectionMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-blue-700">
                  Press and hold any item to start selecting multiple items
                </span>
              </div>
            </div>
          )}

          {/* Collection Items Grid - Exact Collection page structure */}
          <div className={`${isCollectionSelectionMode && collectionSelectedItems.size > 0 ? 'pb-24' : 'pb-4'}`}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4" style={{ gap: '10px' }}>
               {mockCollectionItems.slice(0, 12).map((item) => (
                 <UniversalCard
                   key={item.id}
                   item={item}
                   variant="collection"
                   isSelected={collectionSelectedItems.has(item.id)}
                   showSelection={isCollectionSelectionMode}
                  onClick={() => {
                    if (isCollectionSelectionMode) {
                      const newSelected = new Set(collectionSelectedItems);
                      if (newSelected.has(item.id)) {
                        newSelected.delete(item.id);
                        // Exit selection mode if no items are selected
                        if (newSelected.size === 0) {
                          setIsCollectionSelectionMode(false);
                          setIsCollectionActionsMenuOpen(false);
                        }
                      } else {
                        newSelected.add(item.id);
                        // Don't open actions menu on card click - only on menu button click
                      }
                      setCollectionSelectedItems(newSelected);
                    }
                  }}
                  onLongPress={() => {
                    if (!isCollectionSelectionMode) {
                      setIsCollectionSelectionMode(true);
                      setCollectionSelectedItems(new Set([item.id]));
                      // Don't open actions menu on long press - just show preview
                    }
                  }}
                  onSelectionChange={() => {
                    const newSelected = new Set(collectionSelectedItems);
                    if (newSelected.has(item.id)) {
                      newSelected.delete(item.id);
                      // Exit selection mode if no items are selected
                      if (newSelected.size === 0) {
                        setIsCollectionSelectionMode(false);
                        setIsCollectionActionsMenuOpen(false);
                      }
                    } else {
                      newSelected.add(item.id);
                      // Enter selection mode but don't open actions menu yet
                      setIsCollectionSelectionMode(true);
                    }
                    setCollectionSelectedItems(newSelected);
                  }}
                  onMenuClick={() => {
                    // Menu button clicked - pre-open actions menu and set item for order book
                    setShouldPreOpenActions(true);
                    setSelectedItemForOrderBook(item);
                  }}
                  onViewOrderBook={(item) => {
                    setSelectedItemForOrderBook(item);
                    // This will be handled by the UniversalBulkMenu when View Order Book is clicked
                  }}
                  onOverridePrice={(item) => {
                    console.log('Override Price for item:', item.name);
                    // Add your price override logic here
                  }}
                  onDelete={(item) => {
                    console.log('Delete item:', item.name);
                    // Add your delete logic here
                  }}
                />
               ))}
             </div>
           </div>
          
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Search Page Simulation</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items from database</span>
              <button
                onClick={() => {
                  setIsSearchSelectionMode(!isSearchSelectionMode);
                  if (isSearchSelectionMode) {
                    setSearchSelectedItems(new Set());
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  isSearchSelectionMode
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isSearchSelectionMode ? 'Exit Selection' : 'Enter Selection'}
              </button>
            </div>
          </div>
          
          {/* Search Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            {(realPokemonCards.length > 0 ? realPokemonCards : mockPokemonItems).slice(0, 12).map((item) => {
              const isSelected = searchSelectedItems.has(item.id);
              const longPressTimeoutRef = useRef(null);
              const longPressTriggeredRef = useRef(false);

              const handleLongPress = () => {
                longPressTriggeredRef.current = true;
                if (!isSearchSelectionMode) {
                  setIsSearchSelectionMode(true);
                  setSearchSelectedItems(new Set([item.id]));
                }
              };

              const handleTouchStart = () => {
                longPressTriggeredRef.current = false;
                longPressTimeoutRef.current = setTimeout(handleLongPress, 500);
              };

              const handleTouchEnd = () => {
                if (longPressTimeoutRef.current) {
                  clearTimeout(longPressTimeoutRef.current);
                }
              };

              const handleMouseDown = () => {
                longPressTriggeredRef.current = false;
                longPressTimeoutRef.current = setTimeout(handleLongPress, 500);
              };

              const handleMouseUp = () => {
                if (longPressTimeoutRef.current) {
                  clearTimeout(longPressTimeoutRef.current);
                }
              };

              const handleMouseLeave = () => {
                if (longPressTimeoutRef.current) {
                  clearTimeout(longPressTimeoutRef.current);
                }
                longPressTriggeredRef.current = false;
              };

              const handleClick = () => {
                // Prevent click if long press was triggered
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return;
                }
                
                if (isSearchSelectionMode) {
                  const newSelected = new Set(searchSelectedItems);
                  if (newSelected.has(item.id)) {
                    newSelected.delete(item.id);
                    // Exit selection mode if no items are selected
                    if (newSelected.size === 0) {
                      setIsSearchSelectionMode(false);
                    }
                  } else {
                    newSelected.add(item.id);
                  }
                  setSearchSelectedItems(newSelected);
                }
              };

              return (
                <div
                  key={item.id}
                  className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                    isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  onClick={handleClick}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Card Image */}
                  <div className="aspect-[1/1] flex items-center justify-center p-4 relative">
                    {item.image || item.imageUrl ? (
                      <img
                        src={item.image || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <div className="text-2xl mb-1">🎴</div>
                          <div className="text-gray-400 text-xs">No Image</div>
                        </div>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-3 space-y-1">
                    <h3 className="text-gray-700 leading-tight line-clamp-2 font-bold text-[11px] md:text-xs">
                      {item.name}
                      {item.cardNumber && (
                        <span className="text-blue-400"> #{item.cardNumber}</span>
                      )}
                    </h3>
                    <div className="text-[11px] md:text-xs text-gray-500 truncate">
                      {item.set}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-600">Market:</span>
                      <span className="text-[10px] font-medium text-blue-600">
                        ${item.price?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      </div>

      {/* Component Showcase */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Individual Component Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Card Variants */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Variants</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Collection Variant</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={mockCollectionItems[0]}
                    variant="collection"
                    isSelected={false}
                    showSelection={false}
                    onClick={() => {}}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pokemon Variant</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={mockPokemonItems[0]}
                    variant="pokemon"
                    isSelected={false}
                    showSelection={false}
                    onClick={() => {}}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Search Variant</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={mockSearchItems[0]}
                    variant="search"
                    isSelected={false}
                    showSelection={false}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selection States */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selection States</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Unselected</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={currentItems[0]}
                    variant="collection"
                    isSelected={false}
                    showSelection={true}
                    onClick={() => {}}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={currentItems[0]}
                    variant="collection"
                    isSelected={true}
                    showSelection={true}
                    onClick={() => {}}
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">In Cart</h4>
                <div className="max-w-xs">
                  <UniversalCard
                    item={currentItems[0]}
                    variant="collection"
                    isInCart={true}
                    cartQuantity={3}
                    showCartIndicator={true}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Menu Test */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Menu</h3>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowBulkMenu(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Show Bulk Menu
              </button>
              <button
                onClick={() => {
                  const currentItems = getCurrentItems();
                  if (currentItems.length > 0) {
                    setSelectedItems(new Set([currentItems[0].id]));
                    setIsBulkSelectionMode(true);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Select 1 Item
              </button>
              <button
                onClick={() => {
                  const currentItems = getCurrentItems();
                  if (currentItems.length >= 3) {
                    setSelectedItems(new Set([currentItems[0].id, currentItems[1].id, currentItems[2].id]));
                    setIsBulkSelectionMode(true);
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Select 3 Items
              </button>
              <button
                onClick={() => {
                  // Select up to 12 items from current items to test overflow behavior
                  const currentItems = getCurrentItems();
                  const idsToSelect = currentItems.slice(0, Math.min(12, currentItems.length)).map(item => item.id);
                  setSelectedItems(new Set(idsToSelect));
                  setIsBulkSelectionMode(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Select {Math.min(12, getCurrentItems().length)} Items
              </button>
              <button
                onClick={() => {
                  setSelectedItems(new Set());
                  setIsBulkSelectionMode(false);
                  setShowBulkMenu(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• Click "Show Bulk Menu" to test the bulk menu component</p>
              <p>• Or enter selection mode and select items to see it in action</p>
              <p>• Try different variants to see how styling changes</p>
              <p>• Use "Select 12 Items" to test overflow behavior with many items</p>
            </div>
          </div>
        </div>

        {/* Order Book Test */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Book</h3>
          <div className="space-y-4">
            <button
              onClick={() => {
                console.log('Show Order Book button clicked!', { currentItems: currentItems.length });
                setSelectedItemForOrderBook(currentItems[0]);
                setShowOrderBook(true);
                console.log('Order Book state should be true now');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Show Order Book
            </button>
            
            <div className="text-sm text-gray-600">
              <p>• Click "Show Order Book" to test the order book component</p>
              <p>• Try editing orders, marking as sold, and deleting</p>
              <p>• Test quantity locking for partially sold orders</p>
            </div>
          </div>
        </div>

        {/* Modal Components Test */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Modal Components</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowAddToCollectionModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Add to Collection Modal
              </button>
              
              <button
                onClick={() => setShowMultiItemOrderModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Multi-Item Order Modal
              </button>
              
              <button
                onClick={() => handleShowConfirmation(
                  'Delete Items',
                  'Are you sure you want to delete these items? This action cannot be undone.',
                  () => console.log('Confirmed delete')
                )}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirmation Modal
              </button>
              
              <button
                onClick={handleLoadingTest}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Loading Modal (3s)
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• Test all modal components used throughout the app</p>
              <p>• Add to Collection: Form for adding items to collection</p>
              <p>• Multi-Item Order: Bulk order creation interface</p>
              <p>• Confirmation: Confirm destructive actions</p>
              <p>• Loading: Show loading states during operations</p>
            </div>
          </div>
        </div>

        {/* Universal Navigation Test */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Universal Navigation</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Bottom Navigation Behavior:</h4>
              <p className="text-sm text-blue-700">
                The bottom navigation automatically hides when bulk selection is active. 
                Try selecting items above to see the bottom nav disappear and the bulk menu replace it.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Top Search Bar:</h4>
              <p className="text-sm text-green-700">
                The top search bar is now a universal component that appears consistently 
                across all pages with game selection and search functionality.
              </p>
            </div>
          </div>
        </div>

        {/* Component Info */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Available Variants:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>collection</strong> - For collection items with profit/loss</li>
                <li>• <strong>pokemon</strong> - For Pokemon cards with 3:4 aspect ratio</li>
                <li>• <strong>search</strong> - For search results with standard layout</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Responsive design for all screen sizes</li>
                <li>• Consistent styling across variants</li>
                <li>• Built-in selection and cart management</li>
                <li>• Universal navigation components</li>
                <li>• Accessibility features included</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Menu */}
      <UniversalBulkMenu
        isVisible={showBulkMenu || selectedItems.size > 0}
        selectedCount={selectedItems.size}
        selectedItems={Array.from(selectedItems).map(id => currentItems.find(item => item.id === id)).filter(Boolean)}
        variant={activeVariant}
        onAddToCart={() => handleBulkMenuAction('addToCart')}
        onViewOrderBook={() => handleBulkMenuAction('viewOrderBook')}
        onOverridePrice={() => handleBulkMenuAction('overridePrice')}
        onDelete={() => handleBulkMenuAction('delete')}
        onCancel={handleBulkMenuCancel}
        showAddToCart={true}
        showOrderBook={true}
        showPriceOverride={true}
        showDelete={true}
        showExport={false}
      />


      {/* Modal Components */}
      <AddToCollectionModal
        product={selectedItemForCollection ? {
          name: selectedItemForCollection.name,
          set: selectedItemForCollection.set,
          imageUrl: selectedItemForCollection.image || selectedItemForCollection.imageUrl,
          api_id: selectedItemForCollection.id,
          itemType: selectedItemForCollection.condition || 'Single'
        } : null}
        isOpen={showAddToCollectionModal}
        onClose={() => {
          setShowAddToCollectionModal(false);
          setSelectedItemForCollection(null);
        }}
        onSuccess={() => {
          console.log('Add to collection success');
          setShowAddToCollectionModal(false);
          setSelectedItemForCollection(null);
        }}
      />

      <MultiItemOrderModal
        isOpen={showMultiItemOrderModal}
        onClose={() => setShowMultiItemOrderModal(false)}
        selectedItems={selectedItems.size > 0 
          ? Array.from(selectedItems).map(id => currentItems.find(item => item.id === id)).filter(Boolean)
          : [currentItems[0]] // Fallback to first item if none selected
        }
        onSuccess={() => {
          console.log('Multi-item order success');
          setShowMultiItemOrderModal(false);
        }}
      />

      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={confirmationConfig.onCancel}
        onConfirm={confirmationConfig.onConfirm}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
      />

      {/* Backdrop Blur Overlay */}
      {(isCollectionActionsMenuOpen || isSearchActionsMenuOpen) && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 pointer-events-auto" 
          onClick={() => {
            // Close actions menu but keep bulk menu open
            setIsCollectionActionsMenuOpen(false);
            setIsSearchActionsMenuOpen(false);
          }}
        />
      )}

      {/* Bulk Menus - Fixed at bottom, outside blurred content */}
      <div className="pointer-events-auto">
        <UniversalBulkMenu
        isVisible={isCollectionSelectionMode && collectionSelectedItems.size > 0}
        selectedCount={collectionSelectedItems.size}
        selectedItems={Array.from(collectionSelectedItems).map(id => 
          mockCollectionItems.find(item => item.id === id)
        ).filter(Boolean)}
        totalItems={mockCollectionItems.length}
        variant="collection"
        onAddToCart={() => console.log('Collection: Add to cart')}
        onViewOrderBook={() => {
          // This will be called when View Order Book button is clicked in actions menu
          // The UniversalBulkMenu will handle opening the order book internally
        }}
        onOverridePrice={() => console.log('Collection: Override price')}
        onDelete={() => console.log('Collection: Delete items')}
        onCancel={() => {
          setCollectionSelectedItems(new Set());
          setIsCollectionSelectionMode(false);
          setIsCollectionActionsMenuOpen(false);
          setShouldPreOpenActions(false);
        }}
        onItemUnselect={(itemId) => {
          setCollectionSelectedItems(prev => {
            const newSelected = new Set(prev);
            newSelected.delete(itemId);
            // Exit selection mode if no items are selected
            if (newSelected.size === 0) {
              setIsCollectionSelectionMode(false);
              setIsCollectionActionsMenuOpen(false);
              setShouldPreOpenActions(false);
            }
            return newSelected;
          });
        }}
        onSelectAll={() => {
          setCollectionSelectedItems(new Set(mockCollectionItems.map(item => item.id)));
        }}
        onDeselectAll={() => {
          setCollectionSelectedItems(new Set());
          setIsCollectionSelectionMode(false);
          setIsCollectionActionsMenuOpen(false);
          setShouldPreOpenActions(false);
        }}
        onActionsMenuToggle={(isOpen) => {
          setIsCollectionActionsMenuOpen(isOpen);
          // Reset preOpenActions when actions menu closes
          if (!isOpen) {
            setShouldPreOpenActions(false);
          }
        }}
        preOpenActions={shouldPreOpenActions}
        preOpenOrderBook={false}
        orders={mockOrders}
        item={selectedItemForOrderBook}
        onEdit={handleOrderEdit}
        onMarkAsSold={handleMarkAsSold}
        onOrderDelete={handleOrderDelete}
      />

      <UniversalBulkMenu
        isVisible={isSearchSelectionMode && searchSelectedItems.size > 0}
        selectedCount={searchSelectedItems.size}
        selectedItems={Array.from(searchSelectedItems).map(id => 
          (realPokemonCards.length > 0 ? realPokemonCards : mockPokemonItems).find(item => item.id === id)
        ).filter(Boolean)}
        totalItems={(realPokemonCards.length > 0 ? realPokemonCards : mockPokemonItems).length}
        variant="search"
        onAddToCart={() => console.log('Search: Add to collection')}
        onCancel={() => {
          setSearchSelectedItems(new Set());
          setIsSearchSelectionMode(false);
        }}
        onItemUnselect={(itemId) => {
          setSearchSelectedItems(prev => {
            const newSelected = new Set(prev);
            newSelected.delete(itemId);
            // Exit selection mode if no items are selected
            if (newSelected.size === 0) {
              setIsSearchSelectionMode(false);
            }
            return newSelected;
          });
        }}
        onSelectAll={() => {
          const items = realPokemonCards.length > 0 ? realPokemonCards : mockPokemonItems;
          setSearchSelectedItems(new Set(items.map(item => item.id)));
        }}
        onDeselectAll={() => {
          setSearchSelectedItems(new Set());
          setIsSearchSelectionMode(false);
        }}
        onActionsMenuToggle={(isOpen) => setIsSearchActionsMenuOpen(isOpen)}
      />
      </div>

      <LoadingModal
        isOpen={showLoadingModal}
        message="Testing loading state..."
      />

      {/* Standalone Order Book Test */}
      <UniversalOrderBookMenu
        isVisible={showOrderBook}
        orders={mockOrders}
        item={selectedItemForOrderBook}
        onClose={handleOrderBookClose}
        onEdit={handleOrderEdit}
        onDelete={handleOrderDelete}
        onMarkAsSold={handleMarkAsSold}
        variant={activeVariant}
        showEditActions={true}
        showDeleteActions={true}
        showMarkAsSoldActions={true}
      />
    </div>
  );
};

export default UniversalComponentsTest;
