import { supabase } from '../lib/supabaseClient';

/**
 * Sale History Manager
 * 
 * Manages individual sale records within a single transaction
 * Uses JSON field to store multiple sales without duplicating records
 * Storage-efficient approach for tracking detailed sale history
 */

/**
 * Get sale history from a transaction
 * @param {Object} transaction - The transaction object
 * @returns {Array} - Array of individual sale records
 */
export const getSaleHistory = (transaction) => {
  try {
    // If sale_history field exists and has data, parse it
    if (transaction.sale_history && typeof transaction.sale_history === 'string') {
      return JSON.parse(transaction.sale_history);
    } else if (transaction.sale_history && Array.isArray(transaction.sale_history)) {
      return transaction.sale_history;
    }
    
    // If no sale_history but quantity_sold > 0, create a legacy sale record
    const soldCount = transaction.quantity_sold || 0;
    if (soldCount > 0) {
      return [{
        id: `${transaction.id}-legacy-sale`,
        quantity: soldCount,
        saleDate: transaction.sell_date || transaction.updated_at,
        salePrice: transaction.sell_price_cents || 0,
        saleLocation: transaction.sell_location || 'N/A',
        saleNotes: transaction.sell_notes || '',
        isLegacy: true // Mark as legacy for migration purposes
      }];
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing sale history:', error);
    return [];
  }
};

/**
 * Add a new sale record to transaction's sale history
 * @param {string} transactionId - The transaction ID
 * @param {Object} saleData - Sale data
 * @returns {Promise<Object>} - Updated transaction data
 */
export const addSaleRecord = async (transactionId, saleData) => {
  try {
    // Get current transaction data
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    // Get existing sale history
    const existingSales = getSaleHistory(currentTransaction);
    
    // Create new sale record
    const newSale = {
      id: `${transactionId}-sale-${Date.now()}`,
      quantity: saleData.quantity || 1,
      saleDate: saleData.saleDate || new Date().toISOString(),
      salePrice: saleData.salePrice || 0,
      saleLocation: saleData.saleLocation || '',
      saleNotes: saleData.saleNotes || '',
      createdAt: new Date().toISOString()
    };
    
    // Add to existing sales
    const updatedSales = [...existingSales, newSale];
    
    // Calculate total quantity sold
    const totalQuantitySold = updatedSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const totalQuantity = currentTransaction.quantity || 0;
    
    // Update transaction
    const { data, error } = await supabase
      .from('orders')
      .update({
        sale_history: JSON.stringify(updatedSales),
        quantity_sold: totalQuantitySold,
        // Update legacy fields for backward compatibility
        sell_date: newSale.saleDate,
        sell_price_cents: newSale.salePrice,
        sell_location: newSale.saleLocation,
        sell_notes: newSale.saleNotes,
        is_sold: totalQuantitySold >= totalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction with new sale:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addSaleRecord:', error);
    throw error;
  }
};

/**
 * Update an existing sale record
 * @param {string} transactionId - The transaction ID
 * @param {string} saleId - The sale record ID
 * @param {Object} updatedSaleData - Updated sale data
 * @returns {Promise<Object>} - Updated transaction data
 */
export const updateSaleRecord = async (transactionId, saleId, updatedSaleData) => {
  try {
    // Get current transaction data
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    // Get existing sale history
    const existingSales = getSaleHistory(currentTransaction);
    
    // Update the specific sale record
    const updatedSales = existingSales.map(sale => 
      sale.id === saleId 
        ? { ...sale, ...updatedSaleData, updatedAt: new Date().toISOString() }
        : sale
    );
    
    // Calculate total quantity sold
    const totalQuantitySold = updatedSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const totalQuantity = currentTransaction.quantity || 0;
    
    // Update transaction
    const { data, error } = await supabase
      .from('orders')
      .update({
        sale_history: JSON.stringify(updatedSales),
        quantity_sold: totalQuantitySold,
        // Update legacy fields with the most recent sale
        sell_date: updatedSales[updatedSales.length - 1]?.saleDate,
        sell_price_cents: updatedSales[updatedSales.length - 1]?.salePrice,
        sell_location: updatedSales[updatedSales.length - 1]?.saleLocation,
        sell_notes: updatedSales[updatedSales.length - 1]?.saleNotes,
        is_sold: totalQuantitySold >= totalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction with updated sale:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSaleRecord:', error);
    throw error;
  }
};

/**
 * Delete a sale record from transaction's sale history
 * @param {string} transactionId - The transaction ID
 * @param {string} saleId - The sale record ID
 * @returns {Promise<Object>} - Updated transaction data
 */
export const deleteSaleRecord = async (transactionId, saleId) => {
  try {
    // Get current transaction data
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    // Get existing sale history
    const existingSales = getSaleHistory(currentTransaction);
    
    // Remove the specific sale record
    const updatedSales = existingSales.filter(sale => sale.id !== saleId);
    
    // Calculate total quantity sold
    const totalQuantitySold = updatedSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const totalQuantity = currentTransaction.quantity || 0;
    
    // Update transaction
    const { data, error } = await supabase
      .from('orders')
      .update({
        sale_history: updatedSales.length > 0 ? JSON.stringify(updatedSales) : null,
        quantity_sold: totalQuantitySold,
        // Update legacy fields with the most recent sale (if any)
        sell_date: updatedSales.length > 0 ? updatedSales[updatedSales.length - 1].saleDate : null,
        sell_price_cents: updatedSales.length > 0 ? updatedSales[updatedSales.length - 1].salePrice : null,
        sell_location: updatedSales.length > 0 ? updatedSales[updatedSales.length - 1].saleLocation : null,
        sell_notes: updatedSales.length > 0 ? updatedSales[updatedSales.length - 1].saleNotes : null,
        is_sold: totalQuantitySold >= totalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction after deleting sale:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in deleteSaleRecord:', error);
    throw error;
  }
};

/**
 * Get sale statistics for a transaction
 * @param {Object} transaction - The transaction object
 * @returns {Object} - Sale statistics
 */
export const getSaleStatistics = (transaction) => {
  const sales = getSaleHistory(transaction);
  const totalQuantity = transaction.quantity || 0;
  
  if (sales.length === 0) {
    return {
      totalSales: 0,
      totalQuantitySold: 0,
      totalRevenue: 0,
      averageSalePrice: 0,
      remainingQuantity: totalQuantity,
      saleDates: [],
      isFullySold: false,
      isPartiallySold: false
    };
  }
  
  const totalQuantitySold = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.salePrice || 0) * (sale.quantity || 0)), 0);
  const averageSalePrice = totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0;
  const remainingQuantity = Math.max(0, totalQuantity - totalQuantitySold);
  const saleDates = sales.map(sale => sale.saleDate).sort();
  
  return {
    totalSales: sales.length,
    totalQuantitySold,
    totalRevenue,
    averageSalePrice,
    remainingQuantity,
    saleDates,
    isFullySold: totalQuantitySold >= totalQuantity,
    isPartiallySold: totalQuantitySold > 0 && totalQuantitySold < totalQuantity
  };
};
