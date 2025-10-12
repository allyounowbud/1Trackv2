import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCleanItemName } from '../utils/nameUtils';
import { getItemTypeClassification } from '../utils/itemTypeUtils';
import { useModal } from '../contexts/ModalContext';
import { createSingleOrder } from '../utils/orderNumbering';
import DesktopSideMenu from './DesktopSideMenu';

// Cache bust: Updated theme colors - v3 - Fixed JSX structure - Fixed retailer dropdown - v4
const AddToCollectionModal = ({ product, isOpen, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModal();
  
  const [formData, setFormData] = useState({
    // Purchase details
    buyDate: new Date().toISOString().split('T')[0], // Today's date
    buyPrice: '',
    pricePerItem: '',
    quantity: 1,
    buyLocation: '',
    buyNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [retailers, setRetailers] = useState([]);
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [activePriceField, setActivePriceField] = useState('perItem'); // 'perItem' or 'total'
  const [isClosing, setIsClosing] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const modalRef = useRef(null);

  // Handle modal animation timing
  useEffect(() => {
    if (isOpen) {
      setIsModalAnimating(true);
      const timer = setTimeout(() => {
        setIsModalAnimating(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open and update modal context
  useEffect(() => {
    if (isOpen) {
      // Strong scroll locking like CartBottomMenu
      document.body.classList.add('modal-open');
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      openModal();
    } else {
      // Remove scroll locking
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.overflow = 'unset';
      closeModal();
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.overflow = 'unset';
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRetailerDropdown && !event.target.closest('.retailer-dropdown-container')) {
        setShowRetailerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRetailerDropdown]);

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData(prev => ({
        ...prev,
        buyDate: new Date().toISOString().split('T')[0],
        pricePerItem: product.marketValue || '',
        buyPrice: product.marketValue || '',
        quantity: 1,
        buyLocation: '',
        buyNotes: ''
      }));
    }
  }, [product]);

  // Auto-calculate prices when quantity, price per item, or total price changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const pricePerItem = parseFloat(formData.pricePerItem) || 0;
    const totalPrice = parseFloat(formData.buyPrice) || 0;
    
    if (activePriceField === 'perItem' && quantity > 0 && pricePerItem > 0) {
      // Calculate total from price per item
      const calculatedTotal = quantity * pricePerItem;
      setFormData(prev => ({
        ...prev,
        buyPrice: calculatedTotal.toFixed(2)
      }));
    } else if (activePriceField === 'total' && quantity > 0 && totalPrice > 0) {
      // Calculate price per item from total
      const calculatedPerItem = totalPrice / quantity;
      setFormData(prev => ({
        ...prev,
        pricePerItem: calculatedPerItem.toFixed(2)
      }));
    }
  }, [formData.quantity, formData.pricePerItem, formData.buyPrice, activePriceField]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      setFormData({
        buyDate: new Date().toISOString().split('T')[0],
        buyPrice: '',
        pricePerItem: '',
        quantity: 1,
        buyLocation: '',
        buyNotes: ''
      });
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 300);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.buyDate || !formData.quantity || !formData.pricePerItem) {
        throw new Error('Please fill in all required fields');
      }

      let itemId;
      
      if (product.source === 'api' && product.api_id) {
        // For API-sourced cards, check if item already exists by name and set
        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('name', product.name)
          .eq('set_name', product.set || '')
          .single();

        if (existingItem) {
          itemId = existingItem.id;
        } else {
          // Create new item with market value from Pokemon card data
          const marketValueCents = Math.round((product.marketValue || 0) * 100);
          
          // Determine proper item type classification
          const itemType = getItemTypeClassification(product, 'raw', 'api');
          
          const { data: newItem, error: itemError } = await supabase
            .from('items')
            .insert({
              name: product.name,
              set_name: product.set || '',
              image_url: product.imageUrl || '',
              item_type: itemType, // Use proper type classification
              market_value_cents: marketValueCents
            })
            .select('id')
            .single();
          
          if (itemError) throw itemError;
          itemId = newItem.id;
        }
      } else {
        // For manual items, use the old logic
        const itemName = product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set);
        
        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('name', itemName)
          .eq('set_name', product.set || '')
          .single();

        if (existingItem) {
          itemId = existingItem.id;
        } else {
          // Determine proper item type classification for manual items
          const itemType = getItemTypeClassification(product, 'raw', 'manual');
          
          const { data: newItem, error: itemError } = await supabase
            .from('items')
            .insert({
              name: itemName,
              set_name: product.set || '',
              image_url: product.imageUrl || '',
              item_type: itemType // Use proper type classification
            })
            .select('id')
            .single();
          
          if (itemError) throw itemError;
          itemId = newItem.id;
        }
      }

      // Prepare order data
      const buyPriceCents = Math.round(parseFloat(formData.pricePerItem) * 100); // Price per item in cents
      const totalCostCents = Math.round(parseFloat(formData.buyPrice) * 100); // Total cost in cents
      
      const baseOrderData = {
        item_id: itemId,
        order_type: 'buy',
        buy_date: formData.buyDate,
        buy_price_cents: buyPriceCents, // Price per item
        buy_quantity: parseInt(formData.quantity),
        total_cost_cents: totalCostCents, // Total cost for all items
        buy_location: formData.buyLocation || null,
        buy_notes: formData.buyNotes || null,
        status: 'ordered'
      };

      // Create order with proper numbering
      const orderData = await createSingleOrder(supabase, baseOrderData);

      // Insert order
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Show success state
      setSuccessData({
        quantity: formData.quantity,
        item: product.name,
        set: product.set || '',
        price: formData.buyPrice
      });

      setShowProcessing(true);

      // Simulate processing time
      setTimeout(() => {
        setShowProcessing(false);
        setShowSuccess(true);
        
        // Call success callback after a short delay
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      }, 2000);

    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      setError('Failed to add item to collection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if we're on desktop - prefer mobile style unless very large screen
  const isDesktop = window.innerWidth >= 1536; // Only show desktop version on extra large screens (2xl)

  if (isDesktop) {
    return (
      <DesktopSideMenu isOpen={isOpen} onClose={onClose} title="Add to Collection">
        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="p-4 border-b border-gray-700 bg-gray-900">
            <div className="flex items-center space-x-3">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              <div>
                <h3 className="text-white font-medium" style={{ fontSize: '14px' }}>{product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}</h3>
                {product.set && (
                  <p className="text-gray-400" style={{ fontSize: '12px' }}>{product.set}</p>
                )}
                {product.marketValue !== undefined && product.marketValue !== null && (
                  <p className="text-emerald-400" style={{ fontSize: '12px' }}>
                    Value: ${product.marketValue.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-gray-900">
              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Purchase Details Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Purchase Details</h3>
                
                {/* Top Row - Date and Retailer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                      style={{ 
                        backgroundColor: '#111827',
                        minWidth: '0',
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Retailer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Purchase Location
                    </label>
                    <div className="relative retailer-dropdown-container">
                      <div 
                        className="w-full px-4 py-3 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus-within:ring-0.5 focus-within:ring-indigo-400/50 focus-within:border-indigo-400/50 transition-colors cursor-pointer flex items-center justify-between"
                        style={{ backgroundColor: '#111827', color: 'white' }}
                        onClick={() => setShowRetailerDropdown(!showRetailerDropdown)}
                      >
                        <span className={formData.buyLocation ? 'text-white' : 'text-gray-400'}>
                          {formData.buyLocation || 'Select retailer...'}
                        </span>
                        <div className="flex items-center gap-2">
                          {formData.buyLocation && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, buyLocation: '' }));
                                setShowRetailerDropdown(false);
                              }}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${showRetailerDropdown ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {showRetailerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50" style={{ backgroundColor: '#111827' }}>
                          {retailers.map(retailer => (
                            <button
                              key={retailer.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, buyLocation: retailer.display_name }));
                                setShowRetailerDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                formData.buyLocation === retailer.display_name 
                                  ? 'bg-indigo-600/20 text-indigo-400' 
                                  : 'text-white hover:bg-gray-700'
                              }`}
                            >
                              {retailer.display_name}
                            </button>
                          ))}
                          {retailers.length === 0 && (
                            <div className="px-3 py-2 text-gray-400 text-sm">
                              No retailers available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Quantity Row */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min="1"
                      required
                      placeholder="1"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                      style={{ backgroundColor: '#111827' }}
                    />
                  </div>
                </div>

                {/* Price Row - Side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price Per Item */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price (per item)
                    </label>
                    <input
                      type="number"
                      name="pricePerItem"
                      value={formData.pricePerItem}
                      onChange={handleInputChange}
                      onFocus={() => setActivePriceField('perItem')}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={`w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                        activePriceField === 'perItem' 
                          ? 'text-white' 
                          : 'text-gray-400'
                      }`}
                      style={{ backgroundColor: '#111827' }}
                    />
                  </div>

                  {/* Total Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Price
                    </label>
                    <input
                      type="number"
                      name="buyPrice"
                      value={formData.buyPrice}
                      onChange={handleInputChange}
                      onFocus={() => setActivePriceField('total')}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={`w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                        activePriceField === 'total' 
                          ? 'text-white' 
                          : 'text-gray-400'
                      }`}
                      style={{ backgroundColor: '#111827' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-6 border-t border-gray-700 bg-gray-900">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding to Collection...</span>
                  </div>
                ) : (
                  'Add to Collection'
                )}
              </button>
            </div>
          </form>

          {/* Processing Animation Modal */}
          {showProcessing && successData && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
                {/* Spinning Animation */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer spinning ring */}
                    <div className="w-20 h-20 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
                    {/* Inner pulsing dot */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Processing Message */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Adding to Collection</h3>
                  <div className="text-sm text-gray-300 space-y-1 mb-4">
                    <p><span className="font-medium">{successData.quantity}x</span> {successData.item}</p>
                    {successData.set && <p className="text-gray-400">{successData.set}</p>}
                    <p className="text-indigo-400 font-medium">${parseFloat(successData.price).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-gray-400">Updating your collection...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DesktopSideMenu>
    );
  }

  // Mobile version - iPhone-style design
  return (
    <>
      {/* Dark theme date picker styles */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(0.5) sepia(1) saturate(5) hue-rotate(200deg);
        }
        
        input[type="date"]::-webkit-datetime-edit {
          color: white;
        }
        
        input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          background: transparent;
        }
        
        input[type="date"]::-webkit-datetime-edit-text {
          color: white;
        }
        
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: white;
        }
      `}</style>
      {(isOpen || isModalAnimating) && (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end transition-opacity duration-200 z-[9999]"
        onClick={handleClose}
      >
      <div 
        ref={modalRef}
        className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[95vh] overflow-y-auto"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto',
          touchAction: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-600"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-lg font-semibold text-white">Add to Collection</h2>
            <p className="text-sm text-gray-400">Creates new entries in the order book</p>
          </div>
        </div>

        {/* Product Info */}
        <div className="px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="text-gray-400 text-2xl">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm">{product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}</h3>
              {product.set && (
                <p className="text-gray-400 text-xs mt-1">{product.set}</p>
              )}
              {product.marketValue !== undefined && product.marketValue !== null && (
                <p className="text-blue-400 text-xs mt-1">
                  Value: ${product.marketValue.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Order Date and Quantity Row */}
              <div className="grid grid-cols-2 gap-4">
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
                    onClick={(e) => {
                      e.target.showPicker && e.target.showPicker();
                    }}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                    placeholder="1"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors"
                    style={{ backgroundColor: '#111827' }}
                  />
                </div>
              </div>

              {/* Purchase Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purchase Location
                </label>
                <div className="relative retailer-dropdown-container">
                  <div 
                    className="w-full px-4 py-3 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus-within:ring-0.5 focus-within:ring-indigo-400/50 focus-within:border-indigo-400/50 transition-colors cursor-pointer flex items-center justify-between"
                    style={{ backgroundColor: '#111827', color: 'white' }}
                    onClick={() => setShowRetailerDropdown(!showRetailerDropdown)}
                  >
                    <span className={formData.buyLocation ? 'text-white' : 'text-gray-400'}>
                      {formData.buyLocation || 'Select retailer...'}
                    </span>
                    <div className="flex items-center gap-2">
                      {formData.buyLocation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, buyLocation: '' }));
                            setShowRetailerDropdown(false);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${showRetailerDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {showRetailerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-indigo-400/50 rounded-lg shadow-lg max-h-40 overflow-y-auto ring-0.5 ring-indigo-400/50" style={{ backgroundColor: '#111827' }}>
                      {retailers.map(retailer => (
                        <button
                          key={retailer.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, buyLocation: retailer.display_name }));
                            setShowRetailerDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            formData.buyLocation === retailer.display_name 
                              ? 'bg-indigo-600/20 text-indigo-400' 
                              : 'text-white hover:bg-gray-700'
                          }`}
                        >
                          {retailer.display_name}
                        </button>
                      ))}
                      {retailers.length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm">
                          No retailers available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>


              {/* Price Row - Side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Price Per Item */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price (per item)
                  </label>
                  <input
                    type="number"
                    name="pricePerItem"
                    value={formData.pricePerItem}
                    onChange={handleInputChange}
                    onFocus={() => setActivePriceField('perItem')}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                      activePriceField === 'perItem' 
                        ? 'text-white' 
                        : 'text-gray-400'
                    }`}
                    style={{ backgroundColor: '#111827' }}
                  />
                </div>

                {/* Total Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Price
                  </label>
                  <input
                    type="number"
                    name="buyPrice"
                    value={formData.buyPrice}
                    onChange={handleInputChange}
                    onFocus={() => setActivePriceField('total')}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-0.5 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-colors ${
                      activePriceField === 'total' 
                        ? 'text-white' 
                        : 'text-gray-400'
                    }`}
                    style={{ backgroundColor: '#111827' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-gray-700 bg-gray-900">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </div>
                ) : (
                  'Add to Collection'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Processing Animation Modal */}
        {showProcessing && successData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-sm w-full mx-4">
              {/* Spinning Animation */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Outer spinning ring */}
                  <div className="w-20 h-20 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
                  {/* Inner pulsing dot */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Processing Message */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Adding to Collection</h3>
                <div className="text-sm text-gray-300 space-y-1 mb-4">
                  <p><span className="font-medium">{successData.quantity}x</span> {successData.item}</p>
                  {successData.set && <p className="text-gray-400">{successData.set}</p>}
                  <p className="text-indigo-400 font-medium">${parseFloat(successData.price).toFixed(2)}</p>
                </div>
                <p className="text-xs text-gray-400">Updating your collection...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    )}
    </>
  );
};

export default AddToCollectionModal;