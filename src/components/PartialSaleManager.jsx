import React, { useState } from 'react';
import { getSoldCount, getRemainingCount, getSaleStatus } from '../utils/orderStatus';
import { getSaleHistory, getSaleStatistics } from '../utils/saleHistoryManager';

/**
 * Partial Sale Manager Component
 * 
 * Shows sold portions as manageable sub-items within the same order record
 * Allows deletion of specific sold quantities and updates the main record
 * Storage-efficient approach - no duplicate records
 */

const PartialSaleManager = ({ 
  transaction, 
  onUpdateTransaction, 
  onDeleteSoldPortion,
  showDeleteActions = true,
  showEditActions = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({});

  const soldCount = getSoldCount(transaction);
  const remainingCount = getRemainingCount(transaction);
  const totalQuantity = transaction.quantity || 0;
  const saleStatus = getSaleStatus(transaction);

  // Don't show component if no items are sold
  if (soldCount === 0) {
    return null;
  }

  const handleDeleteSoldPortion = async (saleId) => {
    if (onDeleteSoldPortion) {
      await onDeleteSoldPortion(transaction.id, saleId);
    }
  };

  const handleEditSale = (saleId, saleData) => {
    setEditingSale(saleId);
    setEditForm({
      quantity: saleData.quantity,
      saleDate: saleData.saleDate,
      salePrice: saleData.salePrice,
      saleLocation: saleData.saleLocation,
      saleNotes: saleData.saleNotes
    });
  };

  const handleSaveEdit = async () => {
    if (onUpdateTransaction) {
      await onUpdateTransaction(transaction.id, {
        ...transaction,
        ...editForm
      });
    }
    setEditingSale(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingSale(null);
    setEditForm({});
  };

  // Get detailed sale history
  const saleHistory = getSaleHistory(transaction);
  const saleStats = getSaleStatistics(transaction);
  
  // If no sale history exists but quantity_sold > 0, create a legacy sale record
  const soldPortions = saleHistory.length > 0 ? saleHistory : (soldCount > 0 ? [{
    id: `${transaction.id}-legacy-sale`,
    quantity: soldCount,
    saleDate: transaction.sell_date || transaction.updated_at,
    salePrice: transaction.sell_price_cents || 0,
    saleLocation: transaction.sell_location || 'N/A',
    saleNotes: transaction.sell_notes || '',
    isLegacy: true
  }] : []);

  return (
    <div className="mt-3 border-t border-gray-600 pt-3">
      {/* Sold Portions Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {saleStats.totalQuantitySold} of {totalQuantity} sold
          </span>
          {saleStats.totalSales > 1 && (
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
              {saleStats.totalSales} sales
            </span>
          )}
          {saleStatus === 'partially_sold' && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
              Partial Sale
            </span>
          )}
          {saleStatus === 'fully_sold' && (
            <span className="text-xs text-white px-2 py-1 rounded" style={{ backgroundColor: '#4ADE80' }}>
              Fully Sold
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {remainingCount} remaining
          </span>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Sold Portions Details */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {soldPortions.map((sale) => (
            <div key={sale.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Quantity Sold:</span>
                      <div className="font-medium text-white">{sale.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Sale Date:</span>
                      <div className="font-medium text-white">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Sale Price:</span>
                      <div className="font-medium text-white">
                        ${(sale.salePrice / 100).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Location:</span>
                      <div className="font-medium text-white">{sale.saleLocation}</div>
                    </div>
                  </div>
                  {sale.saleNotes && (
                    <div className="mt-2">
                      <span className="text-gray-400 text-xs">Notes:</span>
                      <div className="text-white text-xs mt-1">{sale.saleNotes}</div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-3">
                  {showEditActions && (
                    <button
                      onClick={() => handleEditSale(sale.id, sale)}
                      className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
                      title="Edit Sale Details"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    </button>
                  )}
                  {showDeleteActions && (
                    <button
                      onClick={() => handleDeleteSoldPortion(sale.id)}
                      className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors"
                      title="Delete Sale (Return to Inventory)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Form */}
              {editingSale === sale.id && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={editForm.quantity || sale.quantity}
                        onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value)})}
                        min="1"
                        max={totalQuantity}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Sale Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(editForm.salePrice || sale.salePrice) / 100}
                        onChange={(e) => setEditForm({...editForm, salePrice: Math.round(parseFloat(e.target.value) * 100)})}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Sale Date</label>
                      <input
                        type="date"
                        value={editForm.saleDate ? new Date(editForm.saleDate).toISOString().split('T')[0] : new Date(sale.saleDate).toISOString().split('T')[0]}
                        onChange={(e) => setEditForm({...editForm, saleDate: e.target.value})}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={editForm.saleLocation || sale.saleLocation}
                        onChange={(e) => setEditForm({...editForm, saleLocation: e.target.value})}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={editForm.saleNotes || sale.saleNotes}
                      onChange={(e) => setEditForm({...editForm, saleNotes: e.target.value})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      rows="2"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 text-white rounded text-xs transition-colors"
                      style={{ backgroundColor: '#4ADE80' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#22C55E'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#4ADE80'}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartialSaleManager;
