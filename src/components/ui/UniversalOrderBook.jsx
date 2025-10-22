import React, { useState, useEffect } from 'react';
import { 
  getRemainingCount,
  getSoldCount,
  isPartiallySold,
  getStatusDisplayText
} from '../../utils/orderStatus';

/**
 * Universal Order Book Component
 * 
 * A standardized order book that can be used across all pages
 * for displaying and managing orders for items.
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the order book is visible
 * @param {Array} props.orders - Array of order objects
 * @param {Object} props.item - The item these orders belong to
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onEdit - Edit order handler
 * @param {Function} props.onDelete - Delete order handler
 * @param {Function} props.onMarkAsSold - Mark as sold handler
 * @param {string} props.variant - Order book variant: 'collection', 'pokemon', 'search'
 * @param {boolean} props.showEditActions - Whether to show edit actions
 * @param {boolean} props.showDeleteActions - Whether to show delete actions
 * @param {boolean} props.showMarkAsSoldActions - Whether to show mark as sold actions
 */
const UniversalOrderBook = ({
  isVisible = false,
  orders = [],
  item,
  onClose,
  onEdit,
  onDelete,
  onMarkAsSold,
  variant = 'collection',
  showEditActions = true,
  showDeleteActions = true,
  showMarkAsSoldActions = true,
  ...props
}) => {
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Reset translateY when order book closes
  useEffect(() => {
    if (!isVisible) {
      setTranslateY(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Debug log to see if component is rendering
  console.log('UniversalOrderBook rendering:', { isVisible, bottom: '122px' });

  // Get styling based on variant
  const getStyles = () => {
    switch (variant) {
      case 'collection':
        return {
          container: 'bg-gray-900',
          header: 'bg-gray-800',
          card: 'bg-white',
          text: 'text-white',
          textSecondary: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
      case 'pokemon':
        return {
          container: 'bg-blue-900',
          header: 'bg-blue-800',
          card: 'bg-white',
          text: 'text-white',
          textSecondary: 'text-blue-300',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'search':
        return {
          container: '',
          header: '',
          card: 'bg-white',
          text: 'text-white',
          textSecondary: 'text-green-300',
          button: 'text-white'
        };
      default:
        return {
          container: 'bg-gray-900',
          header: 'bg-gray-800',
          card: 'bg-white',
          text: 'text-white',
          textSecondary: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
    }
  };

  const styles = getStyles();

  // Format price helper
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return price || '$0.00';
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle edit
  const handleEdit = (order) => {
    setEditingOrderId(order.id);
    setEditFormData({
      purchase_date: order.purchase_date,
      retailer_name: order.retailer_name,
      quantity: getRemainingCount(order),
      price_per_item_cents: order.price_per_item_cents,
      total_cost: ((order.price_per_item_cents * getRemainingCount(order)) / 100).toFixed(2)
    });
  };

  // Handle save
  const handleSave = () => {
    if (onEdit && editingOrderId) {
      onEdit(editingOrderId, editFormData);
      setEditingOrderId(null);
      setEditFormData({});
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditFormData({});
  };

  // Touch event handlers for swipe to close
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

    // If swiped down more than 100px, close the order book
    if (translateY > 100) {
      onClose();
    } else {
      // Snap back to original position
      setTranslateY(0);
    }
  };

  return (
    <div 
      className="fixed left-0 right-0 z-[60]" 
      data-order-book 
      style={{ 
        bottom: '122px'
      }}
    >
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out z-[59] ${isDragging ? '' : 'transition-all duration-300 ease-out'}`}
        style={{ 
          backgroundColor: '#1a1f2e',
          transform: `translateY(${translateY}px)`,
          maxHeight: 'calc(100vh - 202px)', // Account for preview menu (122px) and header space (80px)
          animation: isVisible ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: '#1a1f2e' }}>
          {/* iPhone-style swipe indicator */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Viewing On Hand Orders
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Edit, mark as sold or delete orders all together
              </p>
            </div>
            <button
              onClick={() => {
                setTranslateY(0);
                onClose();
              }}
              className="bg-white hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
              style={{ width: '24px', height: '24px' }}
            >
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="px-6 py-3 space-y-4 max-h-[60vh] overflow-y-auto">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg mb-2">No orders found</div>
              <div className="text-gray-500 text-sm">Add some orders to see them here</div>
            </div>
          ) : (
            orders.map((order) => {
              const isEditing = editingOrderId === order.id;
              const remainingCount = getRemainingCount(order);
              const soldCount = getSoldCount(order);

              return (
                <div key={order.id} className={`${styles.card} rounded-lg p-4 shadow-lg`}>
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
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      remainingCount === 0 ? 'bg-green-100 text-green-800' :
                      soldCount > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {getStatusDisplayText(order)}
                    </div>
                  </div>

                  {/* Order Details */}
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Date</label>
                          <input
                            type="date"
                            value={editFormData.purchase_date || ''}
                            onChange={(e) => setEditFormData({...editFormData, purchase_date: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Location</label>
                          <input
                            type="text"
                            value={editFormData.retailer_name || ''}
                            onChange={(e) => setEditFormData({...editFormData, retailer_name: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Amazon, eBay, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={editFormData.quantity || ''}
                            disabled={isPartiallySold(order)}
                            onChange={(e) => setEditFormData({...editFormData, quantity: parseInt(e.target.value) || 1})}
                            className={`w-full px-2 py-1 border rounded text-sm ${
                              isPartiallySold(order) 
                                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Price/ea</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFormData.price_per_item_cents ? (editFormData.price_per_item_cents / 100) : ''}
                            onChange={(e) => setEditFormData({...editFormData, price_per_item_cents: Math.round(parseFloat(e.target.value || 0) * 100)})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Total Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFormData.total_cost || ''}
                            onChange={(e) => setEditFormData({...editFormData, total_cost: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSave}
                          className="px-3 py-1 text-white rounded text-sm transition-colors"
                          style={{ backgroundColor: '#4ADE80' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#22C55E'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#4ADE80'}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Order #</div>
                        <div className="font-medium text-gray-900">{order.order_number || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date</div>
                        <div className="font-medium text-gray-900">{formatDate(order.purchase_date)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Location</div>
                        <div className="font-medium text-gray-900">{order.retailer_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Qty</div>
                        <div className="font-medium text-gray-900">{remainingCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                        <div className="font-medium text-gray-900">
                          {formatPrice((order.price_per_item_cents * remainingCount) / 100)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      {showEditActions && (
                        <button
                          onClick={() => handleEdit(order)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {showMarkAsSoldActions && remainingCount > 0 && (
                        <button
                          onClick={() => onMarkAsSold && onMarkAsSold(order.id)}
                          className="px-3 py-1 text-white rounded text-sm transition-colors"
                          style={{ backgroundColor: '#4ADE80' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#22C55E'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#4ADE80'}
                        >
                          Mark as Sold
                        </button>
                      )}
                      {showDeleteActions && (
                        <button
                          onClick={() => onDelete && onDelete(order.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex justify-between items-center border-t" style={{ borderTopColor: 'rgba(75, 85, 99, 0.4)' }}>
          <div className="text-sm text-gray-400">
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

export default UniversalOrderBook;
