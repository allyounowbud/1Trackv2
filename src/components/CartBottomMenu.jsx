import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, BookOpen, ChevronUp, ChevronDown, Calendar, ChevronDownIcon } from 'lucide-react';

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
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [retailerSearch, setRetailerSearch] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [itemPrices, setItemPrices] = useState({});
  const [activePriceField, setActivePriceField] = useState({});
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      setIsClosing(false);
      // Use a small delay to ensure state is set before rendering
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Calculate totals
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = calculateTotalValue();

  const handleClose = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsClosing(true);
    
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
      setIsClosing(false);
    }, 300);
  };

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


  // Custom Calendar Component
  const CustomCalendar = () => {
    const [currentDate, setCurrentDate] = useState(selectedDate);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    };
    
    const handleDateSelect = (date) => {
      if (date) {
        setSelectedDate(date);
        setOrderDate(formatDate(date));
        setShowCustomCalendar(false);
      }
    };
    
    const goToPreviousMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };
    
    const goToNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };
    
    const isToday = (date) => {
      const today = new Date();
      return date && date.toDateString() === today.toDateString();
    };
    
    const isSelected = (date) => {
      return date && date.toDateString() === selectedDate.toDateString();
    };
    
    const days = getDaysInMonth(currentDate);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-indigo-400/50 rounded-lg shadow-lg z-50 p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-gray-400 rotate-90" />
          </button>
          <h3 className="text-white font-medium text-base">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-gray-400 -rotate-90" />
          </button>
        </div>
        
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {days.map((date, index) => (
            <button
              key={index}
              onClick={() => handleDateSelect(date)}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-lg transition-colors
                ${date ? 'hover:bg-gray-800 cursor-pointer' : 'cursor-default'}
                ${isToday(date) ? 'bg-indigo-600 text-white' : ''}
                ${isSelected(date) ? 'bg-indigo-500 text-white' : ''}
                ${date && !isToday(date) && !isSelected(date) ? 'text-gray-300' : ''}
              `}
            >
              {date ? date.getDate() : ''}
            </button>
          ))}
        </div>
        
        {/* Calendar Footer */}
        <div className="flex justify-between pt-3 border-t border-gray-700">
          <button
            onClick={() => {
              const today = new Date();
              handleDateSelect(today);
            }}
            className="px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setShowCustomCalendar(false)}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen || cartItems.length === 0 || !isReady) return null;

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
        
        /* Calendar picker positioning */
        .date-picker-container {
          position: relative;
          overflow: visible;
        }
        
        /* Force calendar to render within menu bounds */
        input[type="date"]:focus {
          position: relative;
          z-index: 1000;
        }
        
        /* Ensure calendar doesn't get cut off */
        input[type="date"]::-webkit-calendar-picker-indicator {
          position: relative;
          z-index: 1001;
        }
        
        /* Override browser default calendar positioning */
        input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          position: relative;
        }
        
        /* Calendar icon styling - smaller size */
        .date-picker-container input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(0.5) sepia(1) saturate(5) hue-rotate(200deg);
          width: 16px;
          height: 16px;
          opacity: 1;
        }
        
        /* Force calendar to render in center of screen to avoid cutoff */
        .date-picker-container {
          position: relative;
          overflow: visible;
          z-index: 10;
        }
        
        /* Override calendar positioning to center it */
        input[type="date"]:focus {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          z-index: 9999 !important;
          width: 300px !important;
          height: 40px !important;
        }
        
        /* Hide the actual input when focused and show calendar centered */
        .date-picker-container input[type="date"]:focus {
          opacity: 0;
        }
        
        /* Create a visual placeholder when input is focused */
        .date-picker-container input[type="date"]:focus::before {
          content: attr(value);
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          display: flex;
          align-items: center;
          opacity: 1;
          z-index: 1;
        }
      `}</style>
      
      {/* Backdrop - Only when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Main Container - Always full height, moves up/down */}
      <div 
        ref={menuRef}
        className="fixed left-0 right-0 z-50 bg-gray-950 border-t border-gray-800"
        style={{ 
          height: '85vh',
          bottom: isExpanded ? '0px' : 'calc(-85vh + 120px)',
          transition: 'bottom 0.3s ease-out',
          overflow: 'visible',
          minHeight: '85vh'
        }}
      >
        {/* Unified Menu Content */}
        <div className="flex flex-col h-full overflow-visible">
          {/* Header Section - Changes based on expanded state */}
          <div 
            className="flex flex-col px-6 py-3 border-b border-gray-700/50 flex-shrink-0 cursor-pointer hover:bg-gray-800/30 transition-colors active:bg-gray-800/30 bg-gray-950"
            onClick={handleToggleExpanded}
          >
            {/* Drag Handle - Always visible and centered */}
            <div className="flex justify-center mb-2">
              <div className="w-8 h-1 rounded-full bg-gray-600 transition-colors group-hover:bg-gray-500"></div>
            </div>
            
            {isExpanded ? (
              /* Expanded Header */
              <>
                <h2 className="text-lg font-semibold text-white mb-0">Add to Collection</h2>
                <p className="text-sm text-gray-400 leading-relaxed -mt-1">
                  Add multiple items to your collection all at once.
                </p>
              </>
            ) : (
              /* Collapsed Preview Header - Show image previews */
              <>
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-300">Value:</span>
                    <span className="text-xs font-medium text-white">${totalValue.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">({cartItems.length} items)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Tap to expand</span>
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Image previews - Main content area */}
                <div className="flex items-center gap-3 overflow-x-auto">
                  {cartItems.slice(0, 8).map((item) => (
                    <div 
                      key={item.id}
                      className="relative group cursor-pointer flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-10 h-12 object-contain rounded transition-opacity group-hover:opacity-50"
                        style={{ imageRendering: 'crisp-edges' }}
                      />
                      {/* Hover overlay with delete button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {cartItems.length > 8 && (
                    <div className="w-10 h-12 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-300 flex-shrink-0">
                      +{cartItems.length - 8}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Expanded Content - Always rendered, visible when menu is positioned correctly - Page content color */}
          <div className="flex flex-col flex-1 min-h-0 overflow-visible" style={{ backgroundColor: '#111827' }}>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto min-h-0 overflow-x-visible">
            {/* Order Details Section */}
            <div className="px-6 py-4 space-y-4 overflow-visible">
              {/* Order Date and Location Row */}
              <div className="flex gap-4 relative">
                {/* Order Date - 40% */}
                <div className="w-[40%]">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={new Date(orderDate).toLocaleDateString()}
                      readOnly
                      onClick={() => setShowCustomCalendar(!showCustomCalendar)}
                      className={`w-full px-4 py-3 border rounded-lg text-white text-sm focus:outline-none transition-colors cursor-pointer ${
                        showCustomCalendar 
                          ? 'border-indigo-400/50' 
                          : 'border-gray-700 focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50'
                      }`}
                      style={{ backgroundColor: '#111827' }}
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Location - 60% */}
                <div className="w-[60%]">
                  <label className="block text-sm font-medium text-white mb-2">Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={purchaseLocation || "Purchase location..."}
                      value={retailerSearch}
                      onChange={(e) => setRetailerSearch(e.target.value)}
                      onFocus={() => setIsRetailerFocused(true)}
                      onBlur={() => setTimeout(() => setIsRetailerFocused(false), 150)}
                      className="w-full px-4 py-3 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                      style={{ backgroundColor: '#111827' }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsRetailerFocused(!isRetailerFocused)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${isRetailerFocused ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Retailer Dropdown */}
                    {isRetailerFocused && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-950/95 backdrop-blur-sm border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50">
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
                
                {/* Calendar positioned relative to the entire row */}
                {showCustomCalendar && <CustomCalendar />}
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-3">
              {cartItems.map((item) => {
                return (
                  <div key={item.id} className="relative rounded-lg border border-gray-700" style={{ backgroundColor: '#111827' }}>
                    {/* Main item container */}
                    <div className="rounded-lg p-3">
                      {/* Item Info Row */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {item.set}
                          </div>
                          <div className="text-xs text-indigo-400">
                            ${item.marketValue.toFixed(2)} each
                          </div>
                        </div>
                        <div 
                          className="relative group cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.id);
                          }}
                        >
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-12 h-16 object-contain rounded-lg flex-shrink-0 p-1 transition-opacity group-hover:opacity-50"
                            style={{ backgroundColor: '#111827' }}
                          />
                          {/* Hover overlay with delete button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <X className="w-4 h-4 text-white" />
                            </div>
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
                            className="w-full px-2 py-1 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                          style={{ backgroundColor: '#111827' }}
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
                            className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors border-gray-700 ${
                              activePriceField[item.id] === 'perItem' 
                                ? 'text-white' 
                                : 'text-gray-400'
                            }`}
                            style={{ backgroundColor: '#111827' }}
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
                            className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors border-gray-700 ${
                              activePriceField[item.id] === 'total' 
                                ? 'text-white' 
                                : 'text-gray-400'
                            }`}
                            style={{ backgroundColor: '#111827' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            {/* Footer - Bottom bar color */}
            <div className="flex-shrink-0 border-t border-gray-800/50 bg-gray-950/95 backdrop-blur-xl">
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
      </div>
    </>
  );
};

export default CartBottomMenu;
