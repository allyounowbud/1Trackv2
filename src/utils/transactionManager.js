import { supabase } from '../lib/supabaseClient';

/**
 * Transaction Manager Utilities
 * 
 * Handles database operations for transaction updates and partial sale management
 * Storage-efficient approach - no duplicate records, uses quantity_sold field
 */

/**
 * Update a transaction with new data
 * @param {string} transactionId - The transaction ID to update
 * @param {Object} updatedData - The updated transaction data
 * @returns {Promise<Object>} - Updated transaction data
 */
export const updateTransaction = async (transactionId, updatedData) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateTransaction:', error);
    throw error;
  }
};

/**
 * Delete a sold portion by reducing quantity_sold
 * This effectively "returns" sold items back to inventory
 * @param {string} transactionId - The transaction ID
 * @param {string} saleId - The sale ID (for future use with multiple sales)
 * @param {number} quantityToReturn - Number of items to return to inventory
 * @returns {Promise<Object>} - Updated transaction data
 */
export const deleteSoldPortion = async (transactionId, saleId, quantityToReturn = null) => {
  try {
    // First, get the current transaction data
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    // Calculate new quantity_sold
    const currentSold = currentTransaction.quantity_sold || 0;
    const quantityToReturnValue = quantityToReturn || currentSold; // If no quantity specified, return all sold items
    
    const newQuantitySold = Math.max(0, currentSold - quantityToReturnValue);
    
    // Update the transaction
    const { data, error } = await supabase
      .from('orders')
      .update({
        quantity_sold: newQuantitySold,
        // If all sold items are returned, clear sale-related fields
        ...(newQuantitySold === 0 && {
          sell_date: null,
          sell_price_cents: null,
          sell_location: null,
          sell_notes: null,
          is_sold: false
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction after deleting sold portion:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in deleteSoldPortion:', error);
    throw error;
  }
};

/**
 * Add a partial sale to a transaction
 * @param {string} transactionId - The transaction ID
 * @param {Object} saleData - Sale data including quantity, price, date, etc.
 * @returns {Promise<Object>} - Updated transaction data
 */
export const addPartialSale = async (transactionId, saleData) => {
  try {
    // First, get the current transaction data
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    // Calculate new quantity_sold
    const currentSold = currentTransaction.quantity_sold || 0;
    const saleQuantity = saleData.quantity || 1;
    const totalQuantity = currentTransaction.quantity || 0;
    
    const newQuantitySold = Math.min(totalQuantity, currentSold + saleQuantity);
    
    // Update the transaction
    const { data, error } = await supabase
      .from('orders')
      .update({
        quantity_sold: newQuantitySold,
        sell_date: saleData.saleDate || new Date().toISOString(),
        sell_price_cents: saleData.salePrice || currentTransaction.sell_price_cents,
        sell_location: saleData.saleLocation || currentTransaction.sell_location,
        sell_notes: saleData.saleNotes || currentTransaction.sell_notes,
        is_sold: newQuantitySold >= totalQuantity, // Mark as fully sold if all items are sold
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction after adding partial sale:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addPartialSale:', error);
    throw error;
  }
};

/**
 * Get transaction status information
 * @param {Object} transaction - The transaction object
 * @returns {Object} - Status information
 */
export const getTransactionStatus = (transaction) => {
  const sold = transaction.quantity_sold || 0;
  const total = transaction.quantity || 0;
  const remaining = Math.max(0, total - sold);
  
  return {
    sold,
    total,
    remaining,
    isFullySold: sold >= total,
    isPartiallySold: sold > 0 && sold < total,
    isOnHand: sold === 0
  };
};

/**
 * Validate sale data before processing
 * @param {Object} saleData - Sale data to validate
 * @param {Object} transaction - Current transaction data
 * @returns {Object} - Validation result
 */
export const validateSaleData = (saleData, transaction) => {
  const errors = [];
  const warnings = [];
  
  const totalQuantity = transaction.quantity || 0;
  const currentSold = transaction.quantity_sold || 0;
  const availableQuantity = totalQuantity - currentSold;
  
  if (!saleData.quantity || saleData.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (saleData.quantity > availableQuantity) {
    errors.push(`Cannot sell ${saleData.quantity} items. Only ${availableQuantity} available.`);
  }
  
  if (saleData.salePrice && saleData.salePrice < 0) {
    errors.push('Sale price cannot be negative');
  }
  
  if (!saleData.saleDate) {
    warnings.push('Sale date is recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
