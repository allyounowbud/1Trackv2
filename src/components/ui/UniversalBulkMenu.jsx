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
  ...props
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [isActionsMenuFullyOpen, setIsActionsMenuFullyOpen] = useState(false);
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
    }
  }, [showActionsDropdown]);

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
    <div className={`fixed bottom-0 left-0 right-0 z-[60] transition-all duration-300 ease-out rounded-t-3xl ${menuStyles}`} data-bulk-menu>
          {/* Animated Actions Section */}
          {variant === 'collection' && (
            <div 
              ref={actionsMenuRef}
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showActionsDropdown ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
              }`}
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

      {/* Header with Action Buttons */}
      <div className={`px-6 py-3 border-b border-gray-400`}>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-3">
            <div className="font-normal" style={{ fontSize: '12px', color: '#9ca3af' }}>
              {selectedCount} Item{selectedCount !== 1 ? 's' : ''} Selected
            </div>
          </div>
            
          {/* Action Buttons */}
          <div className="flex items-center gap-2 relative">
            {variant === 'search' ? (
              // Search page: Just "Add to Collection" button
              <button
                onClick={onAddToCart}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              >
                Add to Collection
              </button>
            ) : (
              // Collection page: Select All + Actions dropdown
              <>
                <button
                  onClick={() => {
                    if (selectedCount === totalItems) {
                      onDeselectAll();
                    } else {
                      onSelectAll();
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                  style={{ height: '24px' }}
                >
                  {selectedCount === totalItems ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors px-3 py-1.5"
                  style={{ width: '71px', height: '24px' }}
                >
                  <span className="text-xs">Actions</span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${showActionsDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </>
            )}
            
            {/* Close Button */}
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
      </div>

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
                            className="w-9 h-12 object-contain rounded border border-gray-400"
                            onError={(e) => {
                              console.log('Image failed to load for item:', item.name, 'URL:', item.image || item.imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-9 h-12 rounded border border-gray-400 flex items-center justify-center" style={{ display: 'none' }}>
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-9 h-12 rounded border border-gray-400 flex items-center justify-center">
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
                      
                      {/* Selection indicator */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
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
  );
};

export default UniversalBulkMenu;
