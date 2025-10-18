import React, { useState, useEffect, useRef } from 'react';

/**
 * Universal Order Book Menu Component
 * 
 * A standardized order book menu that slides up from the preview header,
 * similar to the Actions menu but specifically for viewing orders.
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the menu is visible
 * @param {Array} props.orders - Array of order objects
 * @param {Object} props.item - The item these orders are for
 * @param {string} props.variant - Menu variant: 'collection', 'pokemon', 'search'
 * @param {Function} props.onClose - Close the order book
 * @param {Function} props.onEdit - Edit an order
 * @param {Function} props.onDelete - Delete an order
 * @param {Function} props.onMarkAsSold - Mark order as sold
 * @param {boolean} props.showEditActions - Show edit actions
 * @param {boolean} props.showDeleteActions - Show delete actions
 * @param {boolean} props.showMarkAsSoldActions - Show mark as sold actions
 */
const UniversalOrderBookMenu = ({
  isVisible = false,
  orders = [],
  item = null,
  variant = 'collection',
  onClose,
  onEdit,
  onDelete,
  onMarkAsSold,
  showEditActions = true,
  showDeleteActions = true,
  showMarkAsSoldActions = true,
}) => {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startTranslateY, setStartTranslateY] = useState(0);
  const menuRef = useRef(null);

  // Reset position when menu becomes visible
  useEffect(() => {
    if (isVisible) {
      setTranslateY(0);
    }
  }, [isVisible]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartTranslateY(translateY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    const newTranslateY = startTranslateY + deltaY;
    
    // Only allow downward swipes (positive translateY)
    if (newTranslateY >= 0) {
      setTranslateY(newTranslateY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If swiped down more than 100px, close the menu
    if (translateY > 100) {
      onClose();
    } else {
      // Snap back to original position
      setTranslateY(0);
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartTranslateY(translateY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.clientY;
    const deltaY = currentY - startY;
    const newTranslateY = startTranslateY + deltaY;
    
    if (newTranslateY >= 0) {
      setTranslateY(newTranslateY);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, translateY, startY, startTranslateY]);

  if (!isVisible) return null;

  // Debug log to see if component is rendering
  console.log('UniversalOrderBookMenu rendering:', { isVisible, orders: orders.length });

  // Get styling based on variant
  const getStyles = () => {
    switch (variant) {
      case 'collection':
        return {
          backgroundColor: '#1a1f2e',
          borderColor: 'rgba(75, 85, 99, 0.4)',
          textColor: '#ffffff',
          secondaryTextColor: '#9ca3af',
          accentColor: '#3b82f6',
          successColor: '#10b981',
          dangerColor: '#ef4444',
          warningColor: '#f59e0b'
        };
      case 'pokemon':
        return {
          backgroundColor: '#1e3a8a',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          textColor: '#ffffff',
          secondaryTextColor: '#93c5fd',
          accentColor: '#3b82f6',
          successColor: '#10b981',
          dangerColor: '#ef4444',
          warningColor: '#f59e0b'
        };
      case 'search':
        return {
          backgroundColor: '#7c2d12',
          borderColor: 'rgba(251, 146, 60, 0.4)',
          textColor: '#ffffff',
          secondaryTextColor: '#fed7aa',
          accentColor: '#fb923c',
          successColor: '#10b981',
          dangerColor: '#ef4444',
          warningColor: '#f59e0b'
        };
      default:
        return {
          backgroundColor: '#1a1f2e',
          borderColor: 'rgba(75, 85, 99, 0.4)',
          textColor: '#ffffff',
          secondaryTextColor: '#9ca3af',
          accentColor: '#3b82f6',
          successColor: '#10b981',
          dangerColor: '#ef4444',
          warningColor: '#f59e0b'
        };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className="fixed left-0 right-0 z-[60]" 
      data-order-book 
      style={{ 
        bottom: isVisible ? '80px' : '0px', // Position above the preview menu (preview menu is ~80px tall)
        maxHeight: 'calc(100vh - 80px)' // Don't extend beyond screen height minus preview menu
      }}
    >
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out z-[59] ${
          isVisible ? 'opacity-100' : 'max-h-0 opacity-0'
        } ${
          isDragging ? '' : 'transition-all duration-300 ease-out'
        }`}
        style={{
          transform: isVisible ? `translateY(${translateY}px)` : 'translateY(0px)',
          maxHeight: '60vh' // Limit height to 60% of viewport
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: styles.backgroundColor, borderBottom: `1px solid ${styles.borderColor}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: styles.textColor }}>
                Viewing On Hand Orders
              </h3>
              <p className="text-sm" style={{ color: styles.secondaryTextColor }}>
                Edit, mark as sold or delete orders all together.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" style={{ color: styles.textColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4" style={{ backgroundColor: styles.backgroundColor }}>
          {/* Debug info */}
          <div className="mb-4 text-xs" style={{ color: styles.secondaryTextColor }}>
            Debug: Item: {item ? item.name || 'Unknown' : 'null'}, Orders: {orders.length}
          </div>

          {/* Item info */}
          {item && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(75, 85, 99, 0.2)', border: `1px solid ${styles.borderColor}` }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: styles.accentColor }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: styles.textColor }}>📦</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium" style={{ color: styles.textColor }}>
                      {item.name || 'Unknown Set'}
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: styles.accentColor }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: styles.successColor }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: styles.dangerColor }}></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: styles.warningColor + '20', 
                        color: styles.warningColor 
                      }}
                    >
                      Partially Sold
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders table */}
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-4 text-xs font-medium" style={{ color: styles.secondaryTextColor }}>
              <div>Order #</div>
              <div>Date</div>
              <div>Location</div>
              <div>Quantity</div>
              <div>Price (per item)</div>
              <div>Total Cost</div>
            </div>

            {orders.length > 0 ? (
              orders.map((order, index) => (
                <div 
                  key={order.id || index}
                  className="grid grid-cols-6 gap-4 items-center p-3 rounded-lg hover:bg-gray-700 transition-colors"
                  style={{ backgroundColor: 'rgba(75, 85, 99, 0.1)' }}
                >
                  <div className="text-sm" style={{ color: styles.textColor }}>
                    #{order.id || index + 1}
                  </div>
                  <div className="text-sm" style={{ color: styles.textColor }}>
                    {order.date || 'N/A'}
                  </div>
                  <div className="text-sm" style={{ color: styles.textColor }}>
                    {order.location || 'N/A'}
                  </div>
                  <div className="text-sm" style={{ color: styles.textColor }}>
                    {order.quantity || 'N/A'}
                  </div>
                  <div className="text-sm" style={{ color: styles.textColor }}>
                    ${order.price || 'N/A'}
                  </div>
                  <div className="text-sm font-medium" style={{ color: styles.textColor }}>
                    ${order.total || 'N/A'}
                  </div>
                  <div className="col-span-6 flex items-center space-x-2 mt-2">
                    {showEditActions && (
                      <button
                        onClick={() => onEdit && onEdit(order)}
                        className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
                        style={{ backgroundColor: styles.accentColor + '20' }}
                      >
                        <svg className="w-4 h-4" style={{ color: styles.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {showMarkAsSoldActions && (
                      <button
                        onClick={() => onMarkAsSold && onMarkAsSold(order)}
                        className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
                        style={{ backgroundColor: styles.successColor + '20' }}
                      >
                        <svg className="w-4 h-4" style={{ color: styles.successColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    {showDeleteActions && (
                      <button
                        onClick={() => onDelete && onDelete(order)}
                        className="p-2 rounded-lg hover:bg-gray-600 transition-colors"
                        style={{ backgroundColor: styles.dangerColor + '20' }}
                      >
                        <svg className="w-4 h-4" style={{ color: styles.dangerColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8" style={{ color: styles.secondaryTextColor }}>
                <div className="text-4xl mb-2">📦</div>
                <p>No orders found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex justify-between items-center border-t" style={{ borderTopColor: styles.borderColor }}>
          <div className="text-sm" style={{ color: styles.secondaryTextColor }}>
            {orders.length} Order{orders.length !== 1 ? 's' : ''} Total
          </div>
          <button
            onClick={() => {
              setTranslateY(0);
              onClose();
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalOrderBookMenu;
