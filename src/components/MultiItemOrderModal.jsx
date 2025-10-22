import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getItemTypeClassification } from '../utils/itemTypeUtils';
import { useModal } from '../contexts/ModalContext';
import { createBulkOrders } from '../utils/orderNumbering';
import { createBatchProcessor } from '../utils/batchProcessor';
import VirtualizedItemList from './VirtualizedItemList';
import ProgressIndicator from './ProgressIndicator';

const MultiItemOrderModal = ({ selectedItems, isOpen, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModal();
  
  const [formData, setFormData] = useState({
    buyDate: new Date().toISOString().split('T')[0],
    buyLocation: '',
    buyNotes: ''
  });
  
  const [itemDetails, setItemDetails] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [retailers, setRetailers] = useState([]);
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragData, setDragData] = useState({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0, percentage: 0, status: '' });
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const modalRef = useRef(null);

  // Initialize item details when selectedItems change
  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      const initialDetails = {};
      selectedItems.forEach(item => {
        initialDetails[item.id] = {
          quantity: 1,
          pricePerItem: item.marketValue || 0,
          totalPrice: item.marketValue || 0
        };
      });
      setItemDetails(initialDetails);
      
      // Enable virtual scrolling for large item sets
      setUseVirtualScrolling(selectedItems.length > 50);
    }
  }, [selectedItems]);

  // Auto-calculate total price when quantity or price per item changes
  useEffect(() => {
    const newDetails = { ...itemDetails };
    Object.keys(newDetails).forEach(itemId => {
      const detail = newDetails[itemId];
      const quantity = parseFloat(detail.quantity) || 0;
      const pricePerItem = parseFloat(detail.pricePerItem) || 0;
      const totalPrice = quantity * pricePerItem;
      
      newDetails[itemId] = {
        ...detail,
        totalPrice: totalPrice.toFixed(2)
      };
    });
    setItemDetails(newDetails);
  }, [itemDetails.quantity, itemDetails.pricePerItem]);

  // Load retailers on component mount
  useEffect(() => {
    const loadRetailers = async () => {
      try {
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .order('display_name');

        if (error) throw error;
        setRetailers(data || []);
      } catch (error) {
        console.error('Error loading retailers:', error);
      }
    };

    loadRetailers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemDetailChange = (itemId, field, value) => {
    setItemDetails(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        buyDate: new Date().toISOString().split('T')[0],
        buyLocation: '',
        buyNotes: ''
      });
      setItemDetails({});
      setError('');
      setShowSuccess(false);
      setSuccessData(null);
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragData({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
      }, 300);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setDragData({
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  // Mouse gesture handlers for desktop testing
  const handleMouseDown = (e) => {
    setDragData({
      startY: e.clientY,
      currentY: e.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!dragData.isDragging) return;
    
    const deltaY = e.clientY - dragData.startY;
    
    // Only allow downward swipe (positive deltaY) to close
    if (deltaY > 0) {
      setDragData({
        ...dragData,
        currentY: e.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleMouseUp = () => {
    if (!dragData.isDragging) return;
    
    const deltaY = dragData.deltaY || 0;
    
    // If swiped down more than 100px, close the modal
    if (deltaY > 100) {
      handleClose();
    } else {
      // Snap back to original position
      setDragData({
        ...dragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!dragData.isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragData.startY;
    
    // Only allow downward swipe (positive deltaY)
    if (deltaY > 0) {
      setDragData({
        ...dragData,
        currentY: touch.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleTouchEnd = () => {
    if (!dragData.isDragging) return;
    
    const deltaY = dragData.deltaY || 0;
    
    // If swiped down more than 100px, close the modal
    if (deltaY > 100) {
      handleClose();
    } else {
      // Snap back to original position
      setDragData({
        ...dragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  const getTransform = () => {
    if (!dragData.isDragging) return 'translateY(0)';
    return `translateY(${Math.max(0, dragData.deltaY)}px)`;
  };

  // Calculate total value and items
  const totalValue = selectedItems?.reduce((sum, item) => {
    const itemDetail = itemDetails[item.id];
    const quantity = itemDetail?.quantity || 1;
    const pricePerItem = itemDetail?.pricePerItem || 0;
    return sum + (quantity * pricePerItem);
  }, 0) || 0;

  const totalItems = selectedItems?.reduce((sum, item) => {
    const itemDetail = itemDetails[item.id];
    return sum + (itemDetail?.quantity || 1);
  }, 0) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setShowProcessing(true);

    try {
      // Create batch processor for optimized processing
      const batchProcessor = createBatchProcessor({
        batchSize: 10,
        maxConcurrency: 3,
        retryAttempts: 2,
        retryDelay: 1000,
        onProgress: (progress) => {
          setBatchProgress({
            processed: progress.processed,
            total: progress.total,
            percentage: progress.percentage,
            status: `Processing batch ${progress.batch} of ${progress.totalBatches}...`
          });
        },
        onError: (error) => {
          console.error('Batch processing error:', error);
        }
      });

      // Process items in optimized batches
      const results = await batchProcessor.processBatches(selectedItems, async (item) => {
        const itemDetail = itemDetails[item.id];
        
        // Find or create item
        let itemId;
        if (item.source === 'api' && item.api_id) {
          // For API-sourced items, check if item exists
          const { data: existingItem } = await supabase
            .from('items')
            .select('id')
            .eq('name', item.name)
            .eq('set_name', item.set || '')
            .single();

          if (existingItem) {
            itemId = existingItem.id;
          } else {
            // Create new item with market value from Pokemon card data
            const marketValueCents = Math.round((item.marketValue || 0) * 100);
            
            // Determine proper item type classification
            const itemType = getItemTypeClassification(item, 'raw', 'api');
            
            const { data: newItem, error: itemError } = await supabase
              .from('items')
              .insert({
                name: item.name,
                set_name: item.set || '',
                image_url: item.imageUrl || '',
                item_type: itemType, // Use proper type classification
                market_value_cents: marketValueCents
              })
              .select('id')
              .single();
            
            if (itemError) throw itemError;
            itemId = newItem.id;
          }
        } else {
          // For manual items, use existing logic
          const { data: existingItem } = await supabase
            .from('items')
            .select('id')
            .eq('name', item.name)
            .eq('set_name', item.set || '')
            .single();

          if (existingItem) {
            itemId = existingItem.id;
          } else {
            // Determine proper item type classification for manual items
            const itemType = getItemTypeClassification(item, 'raw', 'manual');
            
            const { data: newItem, error: itemError } = await supabase
              .from('items')
              .insert({
                name: item.name,
                set_name: item.set || '',
                image_url: item.imageUrl || '',
                item_type: itemType // Use proper type classification
              })
              .select('id')
              .single();
            
            if (itemError) throw itemError;
            itemId = newItem.id;
          }
        }

        // Create order for this item
        const buyPriceCents = Math.round(parseFloat(itemDetail.pricePerItem) * 100);
        const totalCostCents = Math.round(parseFloat(itemDetail.totalPrice) * 100);
        
        // Get current user for RLS
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const baseOrderData = {
          user_id: user.id,
          item_id: itemId,
          purchase_date: formData.buyDate,
          price_per_item_cents: buyPriceCents,
          quantity: parseInt(itemDetail.quantity),
          quantity_sold: 0, // Initialize as not sold
          total_cost_cents: totalCostCents,
          retailer_name: formData.buyLocation || null,
          notes: formData.buyNotes || null,
          
          // Item classification fields
          item_type: item.itemType || 'Single',
          card_condition: 'Raw', // Default for multi-item orders
          
          // Link to product tables
          pokemon_card_id: item.source === 'pokemon' ? item.api_id : null,
          product_source: item.source === 'pokemon' ? 'pokemon' : (itemId ? 'custom' : 'unknown')
        };

        return baseOrderData;
      });

      // Check if any items failed to process
      if (results.failed.length > 0) {
        console.warn(`${results.failed.length} items failed to process:`, results.failed);
      }

      // Get successful order data
      const orderData = results.successful.map(result => result.result);

      // Create all orders with the same order number
      const ordersWithNumbers = await createBulkOrders(supabase, orderData);
      
      // Insert all orders
      const { data: orders, error: bulkOrderError } = await supabase
        .from('orders')
        .insert(ordersWithNumbers)
        .select();
        
      if (bulkOrderError) throw bulkOrderError;

      // Show success state
      setSuccessData({
        orderCount: orders.length,
        totalItems: selectedItems.length
      });

      setShowProcessing(false);
      setShowSuccess(true);
      setBatchProgress({ processed: 0, total: 0, percentage: 0, status: '' });
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('❌ Error creating multi-item order:', error);
      setError('Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter retailers based on search query
  const filteredRetailers = retailers.filter(retailer =>
    retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end modal-overlay z-50">
      <div 
        ref={modalRef}
        className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[90vh] flex flex-col"
        style={{ 
          animation: isClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out',
          transform: getTransform(),
          transition: dragData.isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* iPhone-style drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full transition-colors cursor-pointer ${
            dragData.isDragging ? 'bg-gray-500' : 'bg-gray-600 hover:bg-indigo-600'
          }`}></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 relative flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white pr-12">
            Create Multi-Item Order
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {selectedItems?.length || 0} items selected
          </p>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto min-h-0 border-t border-gray-700/50">
          {/* Order Details */}
          <div className="space-y-4">
            {/* Order Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Order Date
              </label>
              <input
                type="date"
                name="buyDate"
                value={formData.buyDate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors cursor-pointer"
                style={{ 
                  backgroundColor: '#111827',
                  colorScheme: 'dark',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </div>

            {/* Purchase Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Purchase Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="buyLocation"
                  value={formData.buyLocation}
                  onChange={handleInputChange}
                  onFocus={() => setIsRetailerFocused(true)}
                  onBlur={() => setTimeout(() => setIsRetailerFocused(false), 200)}
                  placeholder="Type to search retailers..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                  style={{ backgroundColor: '#111827' }}
                />
                {formData.buyLocation && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, buyLocation: '' }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Retailer Dropdown */}
              {isRetailerFocused && filteredRetailers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50">
                  {filteredRetailers.map((retailer) => (
                    <button
                      key={retailer.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, buyLocation: retailer.display_name }));
                        setIsRetailerFocused(false);
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                    >
                      {retailer.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">Item Details</h3>
            
            {selectedItems?.map((item, index) => (
              <div key={item.id} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                {/* Item Info */}
                <div className="flex items-center gap-3">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">{item.name}</h4>
                    <p className="text-xs text-gray-400">{item.set}</p>
                  </div>
                </div>

                {/* Quantity and Price */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={itemDetails[item.id]?.quantity || 1}
                      onChange={(e) => handleItemDetailChange(item.id, 'quantity', e.target.value)}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50"
                      style={{ backgroundColor: '#111827' }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Price Each
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemDetails[item.id]?.pricePerItem || 0}
                      onChange={(e) => handleItemDetailChange(item.id, 'pricePerItem', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50"
                      style={{ backgroundColor: '#111827' }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Total
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                      ${itemDetails[item.id]?.totalPrice || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Bottom Footer - Same as CartBottomMenu */}
        <div className="flex-shrink-0 border-t border-gray-700/50 bg-gray-900/95 backdrop-blur-xl">
          {/* Action Buttons */}
          <div className="p-4 pt-2">
            {/* Total Summary */}
            <div className="px-2 pb-3">
              <div className="text-left">
                <span className="text-xs text-gray-400">
                  Total: <span className="font-semibold text-white">${totalValue.toFixed(2)}</span> 
                  <span className="text-gray-400"> ({totalItems} items)</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Order'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Processing Animation */}
        {showProcessing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 text-center max-w-md mx-4">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white mb-4">Creating your order...</p>
              
              {/* Progress Indicator */}
              {batchProgress.total > 0 && (
                <div className="w-full">
                  <ProgressIndicator
                    progress={batchProgress.percentage}
                    current={batchProgress.processed}
                    total={batchProgress.total}
                    status={batchProgress.status}
                    size="default"
                    className="mb-2"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 text-center max-w-sm mx-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4ADE80' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Order Created!</h3>
              <p className="text-gray-300 text-sm">
                {successData?.orderCount} items added to your collection
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiItemOrderModal;
