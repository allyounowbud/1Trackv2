/**
 * Order Status Utilities
 * 
 * Provides consistent logic for determining order status based on quantity sold
 * Supports partial sales, full sales, and on-hand tracking
 */

/**
 * Get the number of items sold from an order
 * @param {Object} order - The order object
 * @returns {number} - Number of items sold (0 if none)
 */
export const getSoldCount = (order) => {
  return order?.quantity_sold || 0;
};

/**
 * Get the number of items remaining in an order
 * @param {Object} order - The order object
 * @returns {number} - Number of items remaining
 */
export const getRemainingCount = (order) => {
  const quantity = order?.quantity || 0;
  const sold = getSoldCount(order);
  return Math.max(0, quantity - sold);
};

/**
 * Get the sale status of an order
 * @param {Object} order - The order object
 * @returns {string} - One of: 'on_hand', 'partially_sold', 'fully_sold'
 */
export const getSaleStatus = (order) => {
  const sold = getSoldCount(order);
  const quantity = order?.quantity || 0;
  
  if (sold === 0) {
    return 'on_hand';
  } else if (sold >= quantity) {
    return 'fully_sold';
  } else {
    return 'partially_sold';
  }
};

/**
 * Check if an order has any items remaining (should show in collection)
 * @param {Object} order - The order object
 * @returns {boolean} - True if items remain
 */
export const hasItemsRemaining = (order) => {
  return getRemainingCount(order) > 0;
};

/**
 * Check if an order has any items sold (should show in sold items)
 * @param {Object} order - The order object
 * @returns {boolean} - True if any items are sold
 */
export const hasItemsSold = (order) => {
  return getSoldCount(order) > 0;
};

/**
 * Check if an order is partially sold
 * @param {Object} order - The order object
 * @returns {boolean} - True if some (but not all) items are sold
 */
export const isPartiallySold = (order) => {
  return getSaleStatus(order) === 'partially_sold';
};

/**
 * Check if an order is fully sold
 * @param {Object} order - The order object
 * @returns {boolean} - True if all items are sold
 */
export const isFullySold = (order) => {
  return getSaleStatus(order) === 'fully_sold';
};

/**
 * Get display-friendly status text
 * @param {Object} order - The order object
 * @returns {string} - Human-readable status
 */
export const getStatusDisplayText = (order) => {
  const status = getSaleStatus(order);
  const sold = getSoldCount(order);
  const remaining = getRemainingCount(order);
  const total = order?.quantity || 0;
  
  switch (status) {
    case 'on_hand':
      return 'On Hand';
    case 'partially_sold':
      return `Partial (${sold}/${total} sold)`;
    case 'fully_sold':
      return 'Sold';
    default:
      return 'Unknown';
  }
};

/**
 * Get status color class for Tailwind CSS
 * @param {Object} order - The order object
 * @returns {string} - Tailwind color class
 */
export const getStatusColorClass = (order) => {
  const status = getSaleStatus(order);
  
  switch (status) {
    case 'on_hand':
      return 'text-blue-500';
    case 'partially_sold':
      return 'text-yellow-500';
    case 'fully_sold':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

/**
 * Get status emoji indicator
 * @param {Object} order - The order object
 * @returns {string} - Emoji representing status
 */
export const getStatusEmoji = (order) => {
  const status = getSaleStatus(order);
  
  switch (status) {
    case 'on_hand':
      return '📦';
    case 'partially_sold':
      return '🟡';
    case 'fully_sold':
      return '✅';
    default:
      return '❓';
  }
};

/**
 * Filter orders that should appear in collection view
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Filtered orders with items remaining
 */
export const filterOnHandOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(hasItemsRemaining);
};

/**
 * Filter orders that should appear in sold items view
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Filtered orders with items sold
 */
export const filterSoldOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(hasItemsSold);
};

/**
 * Filter orders that are partially sold
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Filtered partially sold orders
 */
export const filterPartiallySoldOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(isPartiallySold);
};

/**
 * Calculate total quantity for display (adjusts for sold items)
 * @param {Object} order - The order object
 * @param {string} view - 'collection' or 'sold' view
 * @returns {number} - Quantity to display
 */
export const getDisplayQuantity = (order, view = 'collection') => {
  if (view === 'sold') {
    return getSoldCount(order);
  }
  return getRemainingCount(order);
};

/**
 * Get the effective quantity for calculations based on view
 * Used for calculating totals, market values, etc.
 * @param {Object} order - The order object
 * @param {string} view - 'collection' or 'sold' view
 * @returns {number} - Quantity to use for calculations
 */
export const getEffectiveQuantity = (order, view = 'collection') => {
  return getDisplayQuantity(order, view);
};

