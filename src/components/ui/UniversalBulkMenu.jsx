import React, { useState, useEffect, useRef } from 'react';

/**
 * Universal Bulk Menu Component
 * 
 * A standardized bulk actions menu that can be used across all pages
 * for handling multiple item selections and bulk operations.
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the menu is visible
 * @param {number} props.selectedCount - Number of selected items
 * @param {Array} props.selectedItems - Array of selected item objects
 * @param {string} props.variant - Menu variant: 'collection', 'pokemon', 'search'
 * @param {Function} props.onAddToCart - Add selected items to cart
 * @param {Function} props.onViewOrderBook - View order book for selected items
 * @param {Function} props.onOverridePrice - Override market prices
 * @param {Function} props.onDelete - Delete selected items
 * @param {Function} props.onExport - Export selected items
 * @param {Function} props.onCancel - Cancel selection
 * @param {Object} props.customActions - Custom action buttons
 * @param {boolean} props.showAddToCart - Show add to cart button
 * @param {boolean} props.showOrderBook - Show order book button
 * @param {boolean} props.showPriceOverride - Show price override button
 * @param {boolean} props.showDelete - Show delete button
 * @param {boolean} props.showExport - Show export button
 * @param {number} props.totalItems - Total number of available items to select from
 */
const UniversalBulkMenu = ({
  isVisible = false,
  selectedCount = 0,
  selectedItems = [],
  totalItems = 0,
  variant = 'collection', // 'collection' or 'search'
  onAddToCart,
  onViewOrderBook,
  onOverridePrice,
  onDelete,
  onExport,
  onCancel,
  onItemUnselect,
  onSelectAll,
  onDeselectAll,
  onActionsMenuToggle,
  customActions = [],
  showAddToCart = true,
  showOrderBook = true,
  showPriceOverride = true,
  showDelete = true,
  showExport = false,
  preOpenActions = false, // New prop to pre-open actions dropdown
  preOpenOrderBook = false, // New prop to pre-open order book dropdown
  orders = [], // Orders data for order book
  item = null, // Item data for order book
  onEdit = null, // Order edit handler
  onMarkAsSold = null, // Order mark as sold handler
  onOrderDelete = null, // Order delete handler
  showEditActions = true,
  showDeleteActions = true,
  showMarkAsSoldActions = true,
  onOrderBookOpen = null, // Callback when order book should open
  ...props
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showOrderBookDropdown, setShowOrderBookDropdown] = useState(false);
  const [isActionsMenuFullyOpen, setIsActionsMenuFullyOpen] = useState(false);
  const [isOrderBookMenuFullyOpen, setIsOrderBookMenuFullyOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const actionsMenuRef = useRef(null);
  
  // Notify parent when actions menu state changes
  React.useEffect(() => {
    if (onActionsMenuToggle) {
      onActionsMenuToggle(isActionsMenuFullyOpen);
    }
  }, [isActionsMenuFullyOpen, onActionsMenuToggle]);

  // Handle blur timing - blur starts immediately with animation
  React.useEffect(() => {
    if (showActionsDropdown) {
      // Menu is opening - blur starts immediately
      setIsActionsMenuFullyOpen(true);
    } else {
      // Menu is closing - blur off immediately
      setIsActionsMenuFullyOpen(false);
      // Reset translateY when menu closes
      setTranslateY(0);
    }
  }, [showActionsDropdown]);

  // Handle blur timing for order book menu
  React.useEffect(() => {
    if (showOrderBookDropdown) {
      // Menu is opening - blur starts immediately
      setIsOrderBookMenuFullyOpen(true);
    } else {
      // Menu is closing - blur off immediately
      setIsOrderBookMenuFullyOpen(false);
      // Reset translateY when menu closes
      setTranslateY(0);
    }
  }, [showOrderBookDropdown]);

  // Auto-open actions dropdown when preOpenActions is true
  React.useEffect(() => {
    if (isVisible && preOpenActions) {
      setShowActionsDropdown(true);
      setShowOrderBookDropdown(false); // Close order book if actions opens
    }
  }, [isVisible, preOpenActions]);

  // Auto-open order book dropdown when preOpenOrderBook is true
  React.useEffect(() => {
    if (isVisible && preOpenOrderBook) {
      setShowOrderBookDropdown(true);
      setShowActionsDropdown(false); // Close actions if order book opens
    }
  }, [isVisible, preOpenOrderBook]);

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - startY;
    
    // Only allow downward swipes
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If swiped down more than 100px, close the actions dropdown but stay in bulk mode
    if (translateY > 100) {
      setShowActionsDropdown(false);
    } else {
      // Snap back to original position
      setTranslateY(0);
    }
  };

  // Handle clicks outside the actions menu to close it
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the entire bulk menu (not just the actions section)
      const bulkMenuElement = document.querySelector('[data-bulk-menu]');
      if (showActionsDropdown && bulkMenuElement && !bulkMenuElement.contains(event.target)) {
        setShowActionsDropdown(false);
      }
    };

    if (showActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActionsDropdown]);
  
  if (!isVisible || selectedCount === 0) return null;

  // Get menu styling based on variant
  const getMenuStyles = () => {
    switch (variant) {
      case 'collection':
        return 'bg-menu border-t border-menu';
      case 'pokemon':
        return 'bg-gray-800 border-t border-gray-700';
      case 'search':
        return 'bg-blue-900 border-t border-blue-700';
      default:
        return 'bg-gray-800 border-t border-gray-700';
    }
  };

  // Get button styling based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'collection':
        return {
          primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'search':
        return {
          primary: 'bg-green-600 hover:bg-green-700 text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
      default:
        return {
          primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
    }
  };

  // Get available actions based on variant
  const getAvailableActions = () => {
    if (variant === 'search') {
      // Search page only shows "Add to Collection"
      return {
        showAddToCart: true,
        showOrderBook: false,
        showPriceOverride: false,
        showDelete: false,
        showExport: false
      };
    } else {
      // Collection page shows all actions
      return {
        showAddToCart: showAddToCart,
        showOrderBook: showOrderBook,
        showPriceOverride: showPriceOverride,
        showDelete: showDelete,
        showExport: showExport
      };
    }
  };

  const menuStyles = getMenuStyles();
  const buttonStyles = getButtonStyles();
  const availableActions = getAvailableActions();

  return (
    <>
      {/* Blur Overlay */}
      {(isActionsMenuFullyOpen || isOrderBookMenuFullyOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] pointer-events-none" />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 z-[60]" data-bulk-menu style={{ bottom: isVisible ? '0px' : '0px' }}>
        {/* Actions Section - can be swiped */}
          {variant === 'collection' && (
            <div 
              ref={actionsMenuRef}
          className={`overflow-hidden transition-all duration-300 ease-in-out z-[59] ${
                showActionsDropdown ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          } ${
            isDragging ? '' : 'transition-all duration-300 ease-out'
          }`}
          style={{
            transform: showActionsDropdown ? `translateY(${translateY}px)` : 'translateY(0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
            >
              <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid rgba(75, 85, 99, 0.4)' }}>
                {/* iPhone-style swipe indicator */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
                </div>
                <div className="space-y-3">
              {availableActions.showOrderBook && onViewOrderBook && (
                <button
                  onClick={() => {
                    onViewOrderBook();
                    setShowActionsDropdown(false);
                    // Open order book menu
                    setShowOrderBookDropdown(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>View Order Book</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>View and manage all orders for selected items</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
              
              {availableActions.showPriceOverride && onOverridePrice && (
                <button
                  onClick={() => {
                    onOverridePrice();
                    setShowActionsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>Override Market Price</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>Set custom market values for your view</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
              
              {availableActions.showDelete && onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowActionsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 7a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>Delete Items</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>Remove from collection</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Book Section - can be swiped */}
      {variant === 'collection' && (
        <div 
          className={`fixed left-0 right-0 transition-all duration-300 ease-in-out z-[59] ${
            showOrderBookDropdown ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          } ${
            isDragging ? '' : 'transition-all duration-300 ease-out'
          }`}
          style={{
            bottom: isVisible ? '122px' : '0px', // Position above preview menu (preview menu height is ~122px)
            transform: showOrderBookDropdown ? `translateY(${translateY}px)` : 'translateY(0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid rgba(75, 85, 99, 0.4)' }}>
            {/* iPhone-style swipe indicator */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
            </div>
            
                  {/* Order Book Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Viewing On Hand Orders
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Edit, mark as sold or delete orders all together
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Debug: Item: {item ? item.name : 'null'}, Orders: {orders ? orders.length : 'undefined'}
                      </p>
                    </div>
              <button
                onClick={() => setShowOrderBookDropdown(false)}
                className="bg-white hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                style={{ width: '24px', height: '24px' }}
              >
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>

            {/* Orders List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {!orders || orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg mb-2">No orders found</div>
                  <div className="text-gray-500 text-sm">Orders count: {orders ? orders.length : 'undefined'}</div>
                </div>
              ) : (
                orders.map((order) => {
                  const remainingCount = order.quantity - (order.quantity_sold || 0);
                  const soldCount = order.quantity_sold || 0;
                  
                  return (
                    <div key={order.id} className="bg-white rounded-lg p-4 shadow-lg">
                      {/* Item Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item?.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-contain rounded-lg"
                            />
                          ) : (
                            <div className="text-gray-400 text-xs">📦</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {item?.name || 'Unknown Item'}
                          </h4>
                          <div className="text-xs text-gray-500">
                            {item?.set || item?.set_name || 'Unknown Set'}
                          </div>
                        </div>
                        
                        {/* Action Buttons and Status */}
                        <div className="flex flex-col items-center gap-2">
                          {/* Action Buttons - Small circular icons */}
                          <div className="flex items-center gap-1">
                            {showEditActions && (
                              <button
                                onClick={() => onEdit && onEdit(order.id)}
                                className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Edit Order"
                              >
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                </svg>
                              </button>
                            )}
                            {showMarkAsSoldActions && remainingCount > 0 && (
                              <button
                                onClick={() => onMarkAsSold && onMarkAsSold(order.id)}
                                className="w-5 h-5 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Mark as Sold"
                              >
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              </button>
                            )}
                            {showDeleteActions && (
                              <button
                                onClick={() => onOrderDelete && onOrderDelete(order.id)}
                                className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Delete Order"
                              >
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 7a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd"/>
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          {/* Status Pill */}
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            remainingCount === 0 ? 'bg-green-100 text-green-800' :
                            soldCount > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {remainingCount === 0 ? 'Sold' : soldCount > 0 ? 'Partially Sold' : 'Available'}
                          </div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="space-y-3">
                        {/* First Row: Order #, Date, Location */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Order #</div>
                            <div className="font-medium text-gray-900">{order.order_number || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Date</div>
                            <div className="font-medium text-gray-900">
                              {new Date(order.purchase_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Location</div>
                            <div className="font-medium text-gray-900">{order.retailer_name || 'N/A'}</div>
                          </div>
                        </div>
                        
                        {/* Second Row: Quantity, Price (per item), Total Cost */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Quantity</div>
                            <div className="font-medium text-gray-900">{remainingCount}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Price (per item)</div>
                            <div className="font-medium text-gray-900">
                              ${(order.price_per_item_cents / 100).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                            <div className="font-medium text-gray-900">
                              ${((order.price_per_item_cents * remainingCount) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 flex justify-between items-center border-t mt-4" style={{ borderTopColor: 'rgba(75, 85, 99, 0.4)' }}>
              <div className="text-sm text-gray-400">
                {orders.length} Order{orders.length !== 1 ? 's' : ''} Total
              </div>
              <button
                onClick={() => setShowOrderBookDropdown(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section - Always visible and fixed at bottom */}
      {variant === 'collection' && (
        <div className={`${menuStyles} ${(showActionsDropdown || showOrderBookDropdown) ? '' : 'rounded-t-3xl'} relative z-[61]`}>
          {/* Header with selection count and action buttons */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="font-normal" style={{ fontSize: '12px', color: '#9ca3af' }}>
              {selectedCount} Item{selectedCount !== 1 ? 's' : ''} Selected
          </div>
            
          {/* Action Buttons */}
            <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedCount === totalItems) {
                    if (onDeselectAll) onDeselectAll();
                    } else {
                    if (onSelectAll) onSelectAll();
                    }
                  }}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-white rounded flex items-center justify-center transition-colors"
                style={{ fontSize: '12px', height: '24px' }}
                >
                  {selectedCount === totalItems ? 'Deselect All' : 'Select All'}
                </button>
              
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                style={{ height: '24px', fontSize: '12px' }}
                >
                Actions
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
            
            <button
              onClick={onCancel}
              className="bg-white hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
              style={{ width: '24px', height: '24px' }}
            >
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
          
          {/* Subtle separator line */}
          <div className="mx-6" style={{ borderTop: '1px solid rgba(107, 114, 128, 0.45)' }}></div>

          {/* Selected Items Preview */}
          <div className="px-6 py-3">
        <div className="flex gap-2 items-end justify-start w-full">
          {(() => {
            // Calculate how many items can fit
            // Container is 354px, but we have px-6 (24px) padding on each side = 48px total
            // So available width is 354 - 48 = 306px
            // Each item is ~37px (35px width + 2px gap), overflow indicator is ~37px
            const containerWidth = 354; // px
            const padding = 48; // px (24px on each side from px-6)
            const availableWidth = containerWidth - padding; // 306px
            const itemWidth = 37; // px
            const overflowWidth = 37; // px
            const maxItems = Math.floor((availableWidth - overflowWidth) / itemWidth);
            
            // Determine how many items to show and if we need overflow
            const needsOverflow = selectedCount > maxItems;
            const itemsToShow = needsOverflow ? maxItems : selectedCount;
            
            return (
              <>
                {/* Show items that fit */}
                {Array.from({ length: itemsToShow }).map((_, index) => {
                  const item = selectedItems.length > 0 ? selectedItems[index] : null;
                  return (
                    <div key={item ? item.id : index} className="flex-shrink-0 relative group">
                      {item && (item.image || item.imageUrl) ? (
                        <>
                          <img 
                            src={item.image || item.imageUrl} 
                            alt={item.name}
                            className="w-9 h-12 object-contain rounded"
                            onError={(e) => {
                              console.log('Image failed to load for item:', item.name, 'URL:', item.image || item.imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-9 h-12 rounded flex items-center justify-center" style={{ display: 'none' }}>
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-9 h-12 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                      
                      {/* Hover overlay with X button */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item && onItemUnselect) {
                              onItemUnselect(item.id);
                            }
                          }}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* Quantity indicator - only show if quantity > 1 */}
                      {item && item.quantity && item.quantity > 1 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {item.quantity}
                          </span>
                      </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Show overflow indicator if needed */}
                {needsOverflow && (
                  <div className="flex-shrink-0 flex items-center">
                    <div className="h-12 w-9 px-2 bg-gray-700 rounded flex items-center justify-center border border-gray-400">
                      <span className="text-gray-300 font-medium text-sm">+{selectedCount - maxItems}</span>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
      )}
      </div>
    </>
  );
};

export default UniversalBulkMenu;
