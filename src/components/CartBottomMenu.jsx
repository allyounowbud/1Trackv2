import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, BookOpen, ChevronUp, ChevronDown, ChevronDownIcon, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getItemTypeClassification, getGradeFromCardType, getCompanyFromCardType, getMarketValueForCardType, isSealedProduct } from '../utils/itemTypeUtils';

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
  isMultiSelectMode = false,
  hasOtherModalsActive = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [itemPrices, setItemPrices] = useState({});
  const [activePriceField, setActivePriceField] = useState({});
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [itemCardTypes, setItemCardTypes] = useState({});
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [selectedGradingCompany, setSelectedGradingCompany] = useState({});
  const [selectedGradingGrade, setSelectedGradingGrade] = useState({});
  const [expandedGradingSections, setExpandedGradingSections] = useState({});
  const [isModalAnimating, setIsModalAnimating] = useState(false);

  // Handle modal animation timing
  useEffect(() => {
    if (isExpanded) {
      setIsModalAnimating(true);
      const timer = setTimeout(() => {
        setIsModalAnimating(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Prevent background scrolling only when menu is expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.classList.remove('modal-open');
    };
  }, [isExpanded]);

  // Auto-close menu when all items are manually deselected
  useEffect(() => {
    if (isOpen && cartItems.length === 0) {
      onClose();
    }
  }, [cartItems.length, isOpen, onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRetailerDropdown && !event.target.closest('.retailer-dropdown-container')) {
        setShowRetailerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRetailerDropdown]);

  useEffect(() => {
    if (isOpen) {
        setIsReady(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
      setIsReady(false);
        setIsClosing(false);
        setIsExpanded(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggleExpanded = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const totalValue = cartItems.reduce((sum, item) => {
    const price = itemPrices[item.id] || item.price || item.marketValue || 0;
    return sum + (price * item.quantity);
  }, 0);

  const handleDateChange = (e) => {
    setOrderDate(e.target.value);
  };

  const handleCustomDateChange = (date) => {
    setSelectedDate(date);
    setOrderDate(date.toISOString().split('T')[0]);
    setShowCustomCalendar(false);
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const handleDayClick = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    handleCustomDateChange(newDate);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
    } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };


  const handlePriceChange = (itemId, newPrice) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: parseFloat(newPrice) || 0
    }));
  };

  const handlePriceFocus = (itemId) => {
    setActivePriceField(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const handlePriceBlur = (itemId) => {
    setActivePriceField(prev => ({
      ...prev,
      [itemId]: false
    }));
  };

  const handleCreateOrder = () => {
    const orderData = {
      date: orderDate,
      location: purchaseLocation,
      items: cartItems.map(item => ({
        ...item,
        price: itemPrices[item.id] || item.price || item.marketValue || 0
      }))
    };
    onCreateOrder(orderData);
  };

  const handleGradingCompanySelect = (itemId, company) => {
    setSelectedGradingCompany(prev => ({
      ...prev,
      [itemId]: company
    }));
    // Clear grade selection when company changes
    setSelectedGradingGrade(prev => ({
      ...prev,
      [itemId]: null
    }));
  };

  const handleGradingGradeSelect = (itemId, grade) => {
    setSelectedGradingGrade(prev => ({
      ...prev,
      [itemId]: grade
    }));
  };

  const toggleGradingSection = (itemId) => {
    setExpandedGradingSections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  if (!isReady) return null;

  return (
    <>
      {/* Backdrop - Only when expanded, blurs background content */}
      {isExpanded && (
        <div 
          className="fixed bg-black/50 backdrop-blur-sm"
          style={{ 
            pointerEvents: 'auto',
            touchAction: 'none',
            top: 0,
            left: 0,
            right: 0,
            bottom: '133px', // Stop above the preview menu (133px is the height of the preview menu)
            width: '100vw',
            position: 'fixed',
            zIndex: 45
          }}
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Expanded Modal - Only when expanded, appears above preview menu */}
      {(isExpanded || isModalAnimating) && (
      <div 
          className="fixed z-50 rounded-t-3xl"
        style={{ 
            width: '402px',
            maxHeight: 'calc(85vh - 133px)',
            height: cartItems.length <= 2 ? 'auto' : 'calc(85vh - 133px)',
            bottom: '133px', // Position above the preview menu (133px is the height of the preview menu)
            left: '50%',
            transform: isExpanded ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
            backgroundColor: '#111827',
            borderTop: '1px solid #374151',
            position: 'fixed',
            WebkitTransform: isExpanded ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: 'auto',
            touchAction: 'auto',
            isolation: 'isolate',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            WebkitTransition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          data-menu="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Drag Handle - Always visible and centered */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full bg-gray-600 transition-colors group-hover:bg-gray-500"></div>
        </div>
            <h2 className="text-lg font-semibold text-white px-6">Add to Collection</h2>
            <p className="text-sm text-gray-400 leading-relaxed px-6 mb-4">
                  Add multiple items to your collection all at once.
                </p>
              
            {/* Header border separator */}
            <div className="border-t border-gray-700/50 mx-6 mb-4"></div>
          
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto min-h-0 overflow-x-visible" style={{ pointerEvents: 'auto', touchAction: 'auto' }}>
            {/* Order Details Section */}
            <div className="px-6 py-4 space-y-4 overflow-visible">
              {/* Order Date and Location Row */}
              <div className="flex gap-4 relative">
                {/* Order Date - 45% */}
                <div className="w-[45%]">
                <label className="block text-sm font-medium text-gray-400 mb-2">Order Date</label>
                  <div className="relative">
                <input
                      type="text"
                      value={(() => {
                        // Parse the date string safely to avoid timezone issues
                        const [year, month, day] = orderDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        });
                      })()}
                      readOnly
                      className={`w-full px-3 py-2 pr-10 bg-gray-900 border rounded-lg text-white text-sm focus:outline-none cursor-pointer transition-colors ${
                        showCustomCalendar 
                          ? 'border-indigo-400 ring-1 ring-indigo-400/50' 
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    />
                    <Calendar 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" 
                      onClick={() => setShowCustomCalendar(!showCustomCalendar)}
                    />
                  </div>
              
              </div>
              
                {/* Purchase Location - 55% */}
                <div className="w-[55%]">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Purchase Location</label>
                  <div className="relative retailer-dropdown-container">
                    <div 
                      className={`w-full px-3 py-2 pr-10 bg-gray-900 border rounded-lg text-white text-sm transition-colors cursor-pointer flex items-center ${
                        showRetailerDropdown 
                          ? 'border-indigo-400 ring-1 ring-indigo-400/50' 
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      style={{ backgroundColor: '#111827', color: 'white' }}
                      onClick={() => setShowRetailerDropdown(!showRetailerDropdown)}
                    >
                      <span className={purchaseLocation ? 'text-white' : 'text-gray-400'} style={{ flex: 1 }}>
                        {purchaseLocation || 'Select retailer...'}
                      </span>
                      <div className="flex items-center gap-2 absolute right-3 top-1/2 transform -translate-y-1/2">
                        {purchaseLocation && (
                    <button
                      type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPurchaseLocation('');
                              setShowRetailerDropdown(false);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                    </button>
                        )}
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${showRetailerDropdown ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {showRetailerDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50" style={{ backgroundColor: '#111827' }}>
                        {['Amazon', 'TCGPlayer', 'eBay', 'Local Store', 'Other'].map(retailer => (
                        <button
                            key={retailer}
                            type="button"
                            onClick={() => {
                              setPurchaseLocation(retailer);
                              setShowRetailerDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              purchaseLocation === retailer 
                                ? 'bg-indigo-600/20 text-indigo-400' 
                                : 'text-white hover:bg-gray-700'
                            }`}
                        >
                          {retailer}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                </div>
                
              {/* Custom Calendar - Full Width */}
              {showCustomCalendar && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-indigo-400 ring-1 ring-indigo-400/50 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                      </button>
                      <h3 className="text-white font-medium text-lg">
                        {formatMonthYear(currentMonth)}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
              </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-2 text-center text-xs font-medium text-gray-400">
                          {day}
                        </div>
                      ))}
            </div>
            
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, index) => (
                        <div key={`empty-${index}`} className="h-8"></div>
                      ))}
                      
                      {/* Days of the month */}
                      {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                        const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const isSelected = isSameDay(dayDate, selectedDate);
                        const isToday = isSameDay(dayDate, new Date());
                        
                return (
                          <button
                            key={day}
                            onClick={() => handleDayClick(day)}
                            className={`h-8 w-full text-sm rounded transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : isToday
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
              {/* Cart Items List */}
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={`${item.cardId}-${index}`} className="rounded-lg border border-gray-600" style={{ backgroundColor: '#111827' }}>
                    {/* Item Header */}
                    <div className="flex items-start justify-between p-4">
                      {/* Left side - Item info */}
                        <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm leading-tight mb-1 truncate">
                            {item.name}
                        </h3>
                        <p className="text-xs text-gray-400 mb-1">
                          {item.setName || item.set || item.set_name || 'Unknown Set'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-xs">
                            {(() => {
                              // Check if item is a sealed product
                              if (isSealedProduct(item)) {
                                return 'Sealed';
                              }
                              // For single cards, show grading info
                              const company = selectedGradingCompany[item.id];
                              const grade = selectedGradingGrade[item.id];
                              if (!company || company === 'Raw') {
                                return 'Raw';
                              }
                              return `${company} ${grade || ''}`.trim();
                            })()}
                                </span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-white text-xs">${(itemPrices[item.id] || item.price || item.marketValue || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      
                      {/* Right side - Item image (clickable to expand grading options) */}
                      <div 
                        className={`relative w-12 h-16 flex-shrink-0 ml-4 transition-all duration-200 ${
                          isSealedProduct(item) ? 'cursor-default' : 'cursor-pointer'
                        } ${expandedGradingSections[item.id] ? 'ring-2 ring-indigo-400 rounded-lg' : ''}`}
                        onClick={() => !isSealedProduct(item) && toggleGradingSection(item.id)}
                        title={isSealedProduct(item) ? "Sealed product - no grading options" : "Click to expand/collapse grading options"}
                      >
                        <img
                          src={item.imageUrl || '/placeholder-card.png'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/placeholder-card.png';
                          }}
                        />
                        {/* Expand/collapse indicator - Only show for non-sealed products */}
                          {!isSealedProduct(item) && (
                          <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs p-1 rounded-tl">
                            {expandedGradingSections[item.id] ? '−' : '+'}
                          </div>
                          )}
                        </div>
                      </div>
                      
                    {/* Input Fields Row */}
                    <div className="grid grid-cols-3 gap-4 px-4 pb-4">
                      {/* Quantity */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                          value={item.quantity}
                          onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        
                      {/* Price per item */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Price (per item)</label>
                          <input
                            type="number"
                            step="0.01"
                          min="0"
                          value={itemPrices[item.id] || item.price || item.marketValue || ''}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="0.00"
                          />
                        </div>
                        
                      {/* Total Price */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Total Price</label>
                          <input
                            type="number"
                            step="0.01"
                          min="0"
                          value={((itemPrices[item.id] || item.price || item.marketValue || 0) * item.quantity).toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                      
                    {/* Grading Buttons - Only show when expanded AND item is not a sealed product */}
                    {expandedGradingSections[item.id] && !isSealedProduct(item) && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-4 gap-2">
                          {/* Raw Button */}
                          <button
                            onClick={() => handleGradingCompanySelect(item.id, 'Raw')}
                            className={`flex items-center justify-center rounded border transition-all p-1 ${
                              selectedGradingCompany[item.id] === 'Raw'
                                ? 'border-indigo-400'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                            style={{ backgroundColor: '#111827', height: '40px' }}
                          >
                            <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {/* PSA Button */}
                                <button
                            onClick={() => handleGradingCompanySelect(item.id, 'PSA')}
                            className={`flex items-center justify-center rounded border transition-all p-1 ${
                              selectedGradingCompany[item.id] === 'PSA'
                                ? 'border-indigo-400'
                                      : 'border-gray-700 hover:border-gray-600'
                                  }`}
                            style={{ backgroundColor: '#111827', height: '40px' }}
                                >
                                    <img 
                                      src="https://www.pngkey.com/png/full/231-2310791_psa-grading-standards-professional-sports-authenticator.png"
                              alt="PSA"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="w-full h-full text-red-500 font-bold text-xs hidden flex items-center justify-center">
                              PSA
                            </div>
                          </button>
                          
                          {/* BGS Button */}
                          <button
                            onClick={() => handleGradingCompanySelect(item.id, 'BGS')}
                            className={`flex items-center justify-center rounded border transition-all p-1 ${
                              selectedGradingCompany[item.id] === 'BGS'
                                ? 'border-indigo-400'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                            style={{ backgroundColor: '#111827', height: '40px' }}
                          >
                                    <img 
                                      src="https://www.cherrycollectables.com.au/cdn/shop/products/HH02578_Cherry_BGS_Logo.png?v=1654747644&width=500"
                              alt="BGS"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="w-full h-full text-yellow-500 font-bold text-xs hidden flex items-center justify-center">
                              B
                            </div>
                          </button>
                          
                          {/* CGC Button */}
                          <button
                            onClick={() => handleGradingCompanySelect(item.id, 'CGC')}
                            className={`flex items-center justify-center rounded border transition-all p-1 ${
                              selectedGradingCompany[item.id] === 'CGC'
                                ? 'border-indigo-400'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                            style={{ backgroundColor: '#111827', height: '40px' }}
                          >
                            <img
                              src="https://www.dustyatticcomics.com/cdn/shop/collections/CGC_LOGO.webp?v=1730621733"
                              alt="CGC"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="w-full h-full text-red-500 font-bold text-sm hidden flex items-center justify-center">
                              CGC
                                    </div>
                                </button>
                          </div>
                          
                        {/* Grade Selection Row - Only show if a graded company is selected */}
                        {selectedGradingCompany[item.id] && selectedGradingCompany[item.id] !== 'Raw' && (
                            <div className="mt-3">
                            <div className="text-xs text-gray-400 mb-2 px-1">
                              Select Grade ({selectedGradingCompany[item.id]})
                            </div>
                              <div className="grid grid-cols-10 gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                                  <button
                                    key={grade}
                                  onClick={() => handleGradingGradeSelect(item.id, grade)}
                                    className={`aspect-square flex items-center justify-center rounded border transition-all text-xs font-medium ${
                                    selectedGradingGrade[item.id] === grade
                                      ? 'border-indigo-400 bg-indigo-400/10 text-indigo-400'
                                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                                  }`}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                      )}
                    </div>
                ))}
                  </div>
            </div>
          </div>

              </div>
            </div>
      )}

      {/* Preview Menu - Always visible at bottom */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out ${isExpanded ? '' : 'rounded-t-3xl'}`}
        data-menu="true"
        style={{ 
          backgroundColor: '#030712',
          borderTop: '1px solid #374151',
          position: 'fixed',
          bottom: '-1px',
          transform: 'none',
          WebkitTransform: 'none',
          willChange: 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      >
        <div className="flex flex-col px-6 pt-3 pb-2">
          {/* Header with stats and actions */}
          <div className="flex items-end justify-between w-full mb-1 min-w-0 py-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-medium text-gray-400 truncate" style={{ fontSize: '13px' }}>
                Multi-Select Mode
                </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {!isExpanded ? (
                <button
                  onClick={handleToggleExpanded}
                  className={`px-2 py-1 rounded text-xs text-white font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700`}
                >
                  Add to Collection
                  <svg className="w-3 h-3 flex-shrink-0 transition-transform duration-300 ease-out" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : (
                <>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors flex items-center justify-center flex-shrink-0"
                >
                  Cancel
                </button>
              <button
                onClick={handleCreateOrder}
                    className="px-2 py-1 rounded text-xs text-white font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
              >
                    Add Order
              </button>
                </>
              )}
              {/* X Close Button - Only show when modal is NOT expanded AND no other modals are active */}
              {!isExpanded && !hasOtherModalsActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearCart(); // Deselect all items
                    onClose(); // Close the menu
                  }}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4" />
              </button>
            )}
              </div>
          </div>

          {/* Border line break */}
          <div className="w-full h-px bg-gray-700/50 mb-2"></div>

          {/* Image previews */}
          <div className="flex items-center gap-3 overflow-x-auto py-2 pr-4">
            {cartItems.slice(0, 6).map((item, index) => (
              <div 
                key={`${item.cardId}-${index}`} 
                className="relative group cursor-pointer flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item.id);
                }}
              >
                <img
                  src={item.imageUrl || '/placeholder-card.png'}
                  alt={item.name}
                  className="w-10 h-14 object-contain"
                  onError={(e) => {
                    e.target.src = '/placeholder-card.png';
                  }}
                />
                {item.quantity > 1 && (
                  <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center border border-gray-900">
                    {item.quantity}
                  </div>
                )}
                {/* Remove button overlay */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            ))}
            {cartItems.length > 6 && (
              <div className="w-10 h-14 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-300 flex-shrink-0">
                +{cartItems.length - 6}
          </div>
            )}
        </div>
      </div>
      </div>
    </>
  );
};

export default CartBottomMenu;