import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, BookOpen, ChevronUp, ChevronDown, Trash2, Calendar, Search } from 'lucide-react';

const CartBottomMenu = ({ 
  cartItems, 
  isOpen, 
  onClose, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onCreateOrder,
  onCancel,
  onDone,
  isMultiSelectMode = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [swipeData, setSwipeData] = useState({});
  const swipeRefs = useRef({});
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [retailerSearch, setRetailerSearch] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [itemPrices, setItemPrices] = useState({});
  const [activePriceField, setActivePriceField] = useState({});

  // Retailer data (same as AddToCollectionModal)
  const retailers = [
    'Amazon', 'eBay', 'Target', 'Walmart', 'Best Buy', 'GameStop',
    'TCGPlayer', 'Card Kingdom', 'CoolStuffInc', 'Miniature Market',
    'Local Game Store', 'Facebook Marketplace', 'Craigslist', 'Other'
  ];

  const filteredRetailers = retailers.filter(retailer =>
    retailer.toLowerCase().includes(retailerSearch.toLowerCase()) &&
    retailer !== purchaseLocation
  );

  // Handle retailer selection
  const handleRetailerSelect = (retailer) => {
    setPurchaseLocation(retailer);
    setRetailerSearch('');
    setIsRetailerFocused(false);
  };

  // Calculate total value including custom prices
  const calculateTotalValue = () => {
    return cartItems.reduce((sum, item) => {
      const customPrice = itemPrices[item.id];
      const price = customPrice !== undefined ? customPrice : item.marketValue;
      return sum + (price * item.quantity);
    }, 0);
  };

  // Ensure menu is ready before rendering
  useEffect(() => {
    if (isOpen) {
      // Set collapsed state and mark as ready
      setIsExpanded(false);
      // Use a small delay to ensure state is set before rendering
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  // Calculate totals
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = calculateTotalValue();

  const handleToggleExpanded = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const handleCreateOrder = () => {
    const orderData = {
      orderDate,
      purchaseLocation,
      itemPrices
    };
    onCreateOrder(orderData);
    onClose();
  };

  // Close any open swipes
  const closeAllSwipes = () => {
    const resetSwipeData = {};
    cartItems.forEach(item => {
      resetSwipeData[item.id] = { startX: 0, currentX: 0, isDragging: false, deltaX: 0 };
    });
    setSwipeData(resetSwipeData);
  };

  // Handle price updates
  const handlePriceChange = (itemId, price) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: parseFloat(price) || 0
    }));
  };

  // Handle price field focus
  const handlePriceFocus = (itemId, field) => {
    setActivePriceField(prev => ({
      ...prev,
      [itemId]: field
    }));
  };

  // Calculate total price for an item
  const calculateItemTotal = (item) => {
    const customPrice = itemPrices[item.id];
    const price = customPrice !== undefined ? customPrice : item.marketValue;
    return price * item.quantity;
  };

  // Swipe-to-remove handlers
  const handleSwipeStart = (itemId, e) => {
    const touch = e.touches[0];
    
    // Close any other open swipes first
    const resetSwipeData = {};
    cartItems.forEach(item => {
      if (item.id !== itemId) {
        resetSwipeData[item.id] = { startX: 0, currentX: 0, isDragging: false, deltaX: 0 };
      }
    });
    
    setSwipeData({
      ...resetSwipeData,
      [itemId]: {
        startX: touch.clientX,
        currentX: touch.clientX,
        isDragging: true
      }
    });
  };

  const handleSwipeMove = (itemId, e) => {
    if (!swipeData[itemId]?.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeData[itemId].startX;
    
    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setSwipeData({
        ...swipeData,
        [itemId]: {
          ...swipeData[itemId],
          currentX: touch.clientX,
          deltaX: Math.max(deltaX, -60) // Limit swipe distance
        }
      });
    }
  };

  const handleSwipeEnd = (itemId) => {
    if (!swipeData[itemId]?.isDragging) return;
    
    const deltaX = swipeData[itemId].deltaX || 0;
    
    // Snap to either closed or open position
    let finalDeltaX = 0;
    if (deltaX < -30) {
      // Snap to open position (show delete button)
      finalDeltaX = -60;
    } else {
      // Snap back to closed position
      finalDeltaX = 0;
    }
    
    setSwipeData({
      ...swipeData,
      [itemId]: {
        ...swipeData[itemId],
        isDragging: false,
        deltaX: finalDeltaX
      }
    });
  };

  if (!isOpen || cartItems.length === 0 || !isReady) return null;

  // Add blur overlay when expanded
  const blurOverlay = isExpanded ? (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
      onClick={() => setIsExpanded(false)}
    />
  ) : null;

  return (
    <>
      {/* Dark theme date picker styles */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(0.5) sepia(1) saturate(5) hue-rotate(200deg);
        }
        
        input[type="date"]::-webkit-datetime-edit {
          color: white;
        }
        
        input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          background-color: transparent;
        }
        
        input[type="date"]::-webkit-datetime-edit-text {
          color: white;
        }
        
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: white;
        }
      `}</style>
      
      {blurOverlay}
      <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Cart Menu */}
      <div 
        className={`relative bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl flex flex-col ${
          isReady ? 'transition-all duration-300' : ''
        }`}
        style={{ 
          animation: 'slideUp 0.3s ease-out',
          maxHeight: isExpanded ? '85vh' : '110px',
          height: isExpanded ? '85vh' : '110px'
        }}
      >
        {/* Drag Handle - Clickable to toggle */}
        <div 
          className={`flex justify-center cursor-pointer flex-shrink-0 ${isExpanded ? 'pt-4 pb-3' : 'pt-2 pb-2'}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-1 bg-gray-600 hover:bg-indigo-600 rounded-full transition-colors"></div>
        </div>

        {/* Header - Only show when expanded */}
        {isExpanded && (
          <div className="px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
            <div className="flex items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Adding New Order</h3>
                <p className="text-sm text-gray-400">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} • ${totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed Preview - Show when not expanded */}
        {!isExpanded && (
          <div className="px-6 pt-1 pb-3 flex-shrink-0">
            {/* Card previews row */}
            <div className="flex items-center justify-between w-full">
              {/* Card images - takes up available space */}
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                {cartItems.slice(0, 8).map((item, index) => (
                  <div key={item.id} className="flex-shrink-0">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-8 h-10 object-contain rounded p-0.5"
                    />
                  </div>
                ))}
              </div>
              
              {/* +more indicator - always at the right edge */}
              {cartItems.length > 8 && (
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-10 bg-gray-700 rounded text-xs text-gray-300 font-medium ml-2">
                  +{cartItems.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cart Items - Only show when expanded */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto min-h-0 border-t border-gray-700/50">
            {/* Order Details Section */}
            <div className="px-6 py-4 border-b border-gray-700/50 space-y-4">
              {/* Order Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors cursor-pointer"
                  style={{ 
                    backgroundColor: '#111827',
                    colorScheme: 'dark',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                  onClick={(e) => { e.target.showPicker && e.target.showPicker(); }}
                />
              </div>
              
              {/* Purchase Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Purchase Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={purchaseLocation || "Type to search retailers..."}
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    onFocus={() => setIsRetailerFocused(true)}
                    onBlur={() => setTimeout(() => setIsRetailerFocused(false), 150)}
                    className="w-full px-4 py-3 bg-transparent border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  
                  {/* Retailer Dropdown */}
                  {(isRetailerFocused || retailerSearch !== '') && !purchaseLocation && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-900/95 backdrop-blur-sm border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50">
                      {filteredRetailers.map((retailer, index) => (
                        <button
                          key={index}
                          onClick={() => handleRetailerSelect(retailer)}
                          className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {retailer}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-3" onClick={closeAllSwipes}>
              {cartItems.map((item) => {
                const currentSwipe = swipeData[item.id] || {};
                const translateX = currentSwipe.deltaX || 0;
                
                return (
                  <div key={item.id} className="relative overflow-hidden rounded-lg border border-gray-700/50">
                    {/* Delete action - small circle */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                          closeAllSwipes();
                        }}
                        className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    {/* Main item container */}
                    <div 
                      ref={el => swipeRefs.current[item.id] = el}
                      className="bg-gray-900 rounded-lg p-3 relative transition-transform duration-300 ease-out"
                      style={{ 
                        transform: `translateX(${translateX}px)`
                      }}
                      onTouchStart={(e) => handleSwipeStart(item.id, e)}
                      onTouchMove={(e) => handleSwipeMove(item.id, e)}
                      onTouchEnd={() => handleSwipeEnd(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Item Info Row */}
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-16 h-20 object-contain rounded-lg flex-shrink-0 bg-gray-800/50 p-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            {item.set}
                          </div>
                          <div className="text-sm text-indigo-400">
                            ${item.marketValue.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                      
                      {/* Quantity and Price Controls Row */}
                      <div className="flex items-center justify-center gap-6 w-full max-w-md mx-auto">
                        {/* Quantity Input - 15% */}
                        <div className="flex flex-col gap-1 w-[15%]">
                          <label className="text-xs text-gray-400">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                            disabled={currentSwipe.isDragging}
                          />
                        </div>
                        
                        {/* Price per Item - 35% */}
                        <div className="flex flex-col gap-1 w-[35%]">
                          <label className={`text-xs ${activePriceField[item.id] === 'perItem' ? 'text-white' : 'text-gray-400'}`}>
                            Price (per item)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={itemPrices[item.id] !== undefined ? itemPrices[item.id] : ''}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            onFocus={() => handlePriceFocus(item.id, 'perItem')}
                            className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                              activePriceField[item.id] === 'perItem' 
                                ? 'bg-gray-800 border-gray-700/50 text-white' 
                                : 'bg-gray-900 border-gray-700/50 text-gray-400'
                            }`}
                            disabled={currentSwipe.isDragging}
                          />
                        </div>
                        
                        {/* Total Price - 35% */}
                        <div className="flex flex-col gap-1 w-[35%]">
                          <label className={`text-xs ${activePriceField[item.id] === 'total' ? 'text-white' : 'text-gray-400'}`}>
                            Total Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={activePriceField[item.id] === 'total' ? calculateItemTotal(item) : calculateItemTotal(item)}
                            onChange={(e) => {
                              const totalPrice = parseFloat(e.target.value) || 0;
                              const newPricePerItem = totalPrice / item.quantity;
                              handlePriceChange(item.id, newPricePerItem);
                            }}
                            onFocus={() => handlePriceFocus(item.id, 'total')}
                            className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                              activePriceField[item.id] === 'total' 
                                ? 'bg-gray-800 border-gray-700/50 text-white' 
                                : 'bg-gray-900 border-gray-700/50 text-gray-400'
                            }`}
                            disabled={currentSwipe.isDragging}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-700/50 bg-gray-900/95 backdrop-blur-xl">
          {/* Action Buttons */}
          <div className="p-4 pt-2">
            {/* Total Summary */}
            <div className="px-2 pb-3">
              <div className="text-left">
                <span className="text-xs text-gray-400">
                  Total: <span className="font-semibold text-white">${totalValue.toFixed(2)}</span> 
                  <span className="text-gray-400"> ({totalItems} items)</span>
                </span>
              </div>
            </div>
            {isMultiSelectMode ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={onDone}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Order
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateOrder}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors text-base"
              >
                Create Order ({cartItems.length} items)
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default CartBottomMenu;
