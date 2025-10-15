import React, { useState } from 'react';
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

  if (!isVisible) return null;

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
          container: 'bg-green-900',
          header: 'bg-green-800',
          card: 'bg-white',
          text: 'text-white',
          textSecondary: 'text-green-300',
          button: 'bg-green-600 hover:bg-green-700 text-white'
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

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center modal-overlay z-50`}>
      <div className={`${styles.container} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`${styles.header} rounded-lg p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${styles.text}`}>
                Viewing On Hand Orders
              </h3>
              <p className={`text-sm ${styles.textSecondary} mt-1`}>
                Edit, mark as sold or delete orders all together
              </p>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full ${styles.button} flex items-center justify-center transition-colors`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
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
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
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
        <div className="flex justify-between items-center pt-4 border-t border-gray-600 mt-4">
          <div className={`text-sm ${styles.textSecondary}`}>
            {orders.length} Order{orders.length !== 1 ? 's' : ''} Total
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 ${styles.button} rounded-lg font-medium transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalOrderBook;
