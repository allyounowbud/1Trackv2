// Utility functions for order numbering logic

/**
 * Gets the next order number for the current user
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<number>} - The next order number for the user
 */
export const getNextOrderNumber = async (supabase) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the highest order number for this user
    const { data, error } = await supabase
      .from('orders')
      .select('order_number')
      .eq('user_id', user.id)
      .order('order_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    // Return next order number (or 1 if no orders exist)
    return data && data.length > 0 ? (data[0].order_number || 0) + 1 : 1;
  } catch (error) {
    console.error('Error getting next order number:', error);
    // Fallback to 1 if there's an error
    return 1;
  }
};

/**
 * Creates order data with proper numbering for single orders
 * @param {Object} supabase - Supabase client instance
 * @param {Object} orderData - Base order data
 * @returns {Promise<Object>} - Order data with order number
 */
export const createSingleOrder = async (supabase, orderData) => {
  const orderNumber = await getNextOrderNumber(supabase);
  
  return {
    ...orderData,
    order_number: orderNumber
  };
};

/**
 * Creates multiple orders with the same order number for bulk orders
 * @param {Object} supabase - Supabase client instance
 * @param {Array} ordersData - Array of order data objects
 * @returns {Promise<Array>} - Array of order data with same order number
 */
export const createBulkOrders = async (supabase, ordersData) => {
  const orderNumber = await getNextOrderNumber(supabase);
  
  return ordersData.map(orderData => ({
    ...orderData,
    order_number: orderNumber
  }));
};

/**
 * Updates an existing order while preserving its order number
 * @param {Object} supabase - Supabase client instance
 * @param {string} orderId - Order ID to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated order data
 */
export const updateOrder = async (supabase, orderId, updateData) => {
  // Don't include order_number in updates to preserve existing numbering
  const { order_number, ...dataToUpdate } = updateData;
  
  const { data, error } = await supabase
    .from('orders')
    .update(dataToUpdate)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
