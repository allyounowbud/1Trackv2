import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCleanItemName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import DesktopSideMenu from './DesktopSideMenu';

// Cache bust: Updated theme colors - v2
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

  // Prevent body scroll when modal is open and update modal context
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      openModal();
    } else {
      document.body.style.overflow = 'unset';
      closeModal();
    }

    // Cleanup on unmount
    return () => {
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

  // Auto-calculate total price when quantity or price per item changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const pricePerItem = parseFloat(formData.pricePerItem) || 0;
    const totalPrice = quantity * pricePerItem;
    
    if (totalPrice > 0) {
      setFormData(prev => ({
        ...prev,
        buyPrice: totalPrice.toFixed(2)
      }));
    }
  }, [formData.quantity, formData.pricePerItem]);

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
      onClose();
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

      // Prepare order data
      const orderData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        item_name: product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set),
        item_set: product.set || '',
        item_image_url: product.imageUrl || '',
        market_value: parseFloat(product.marketValue) || 0,
        quantity: parseInt(formData.quantity),
        buy_price: parseFloat(formData.buyPrice),
        buy_date: formData.buyDate,
        buy_location: formData.buyLocation || null,
        buy_notes: formData.buyNotes || null,
        status: 'owned'
      };

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
        item: orderData.item_name,
        set: orderData.item_set,
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

  // Check if we're on desktop
  const isDesktop = window.innerWidth >= 1024;

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
            {product.marketValue && (
              <p className="text-emerald-400" style={{ fontSize: '12px' }}>
                Market Value: ${product.marketValue.toFixed(2)}
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
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
                <div className="relative">
                  <input
                    type="text"
                    name="buyLocation"
                    value={formData.buyLocation}
                    onChange={(e) => {
                      handleInputChange(e);
                      setRetailerSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      setIsRetailerFocused(true);
                      setRetailerSearchQuery(formData.buyLocation || '');
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsRetailerFocused(false), 150);
                    }}
                    placeholder="Type to search retailers..."
                    className="w-full px-4 py-3 pr-8 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    style={{ backgroundColor: '#111827', color: 'white' }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {formData.buyLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, buyLocation: '' }));
                        setRetailerSearchQuery('');
                        setIsRetailerFocused(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {(isRetailerFocused || retailerSearchQuery !== '') && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: '#111827', borderColor: '#374151' }}>
                      {(() => {
                        const filteredRetailers = retailers.filter(retailer => 
                          retailerSearchQuery === '' || retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase())
                        );
                        const exactMatch = filteredRetailers.find(retailer => 
                          retailer.display_name.toLowerCase() === retailerSearchQuery.toLowerCase()
                        );
                        
                        return (
                          <>
                            {filteredRetailers.slice(0, 4).map(retailer => (
                              <button
                                key={retailer.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, buyLocation: retailer.display_name }));
                                  setRetailerSearchQuery('');
                                  setIsRetailerFocused(false);
                                }}
                                className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm"
                              >
                                {retailer.display_name}
                              </button>
                            ))}
                            {!exactMatch && retailerSearchQuery !== '' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, buyLocation: retailerSearchQuery }));
                                  setRetailerSearchQuery('');
                                  setIsRetailerFocused(false);
                                }}
                                className="w-full px-3 py-2 text-left text-indigo-400 hover:bg-gray-700 text-sm border-t border-gray-700"
                              >
                                Add "{retailerSearchQuery}"
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Pricing Row - Quantity, Price per Item, and Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  style={{ backgroundColor: '#111827' }}
                />
              </div>

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
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  style={{ backgroundColor: '#111827' }}
                />
              </div>

              {/* Total Buy Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Price
                </label>
                <input
                  type="number"
                  name="buyPrice"
                  value={formData.buyPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end transition-opacity duration-200 z-[9999]">
      <div 
        className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[95vh] overflow-y-auto animate-slide-up"
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Add to Collection</h2>
              <p className="text-sm text-gray-400 mt-1">Add new orders quickly</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center flex-shrink-0">
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
              {product.marketValue && (
                <p className="text-blue-400 text-xs mt-1">
                  Market Value: ${product.marketValue.toFixed(2)}
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

            {/* Purchase Details Section */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Purchase Details</h3>
              
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
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Retailer */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purchase Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="buyLocation"
                    value={formData.buyLocation}
                    onChange={(e) => {
                      handleInputChange(e);
                      setRetailerSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      setIsRetailerFocused(true);
                      setRetailerSearchQuery(formData.buyLocation || '');
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsRetailerFocused(false), 150);
                    }}
                    placeholder="Type to search retailers..."
                    className="w-full px-4 py-3 pr-8 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    style={{ backgroundColor: '#111827', color: 'white' }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {formData.buyLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, buyLocation: '' }));
                        setRetailerSearchQuery('');
                        setIsRetailerFocused(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {(isRetailerFocused || retailerSearchQuery !== '') && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: '#111827', borderColor: '#374151' }}>
                      {(() => {
                        const filteredRetailers = retailers.filter(retailer => 
                          retailerSearchQuery === '' || retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase())
                        );
                        const exactMatch = filteredRetailers.find(retailer => 
                          retailer.display_name.toLowerCase() === retailerSearchQuery.toLowerCase()
                        );
                        
                        return (
                          <>
                            {filteredRetailers.slice(0, 4).map(retailer => (
                              <button
                                key={retailer.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, buyLocation: retailer.display_name }));
                                  setRetailerSearchQuery('');
                                  setIsRetailerFocused(false);
                                }}
                                className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm"
                              >
                                {retailer.display_name}
                              </button>
                            ))}
                            {!exactMatch && retailerSearchQuery !== '' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, buyLocation: retailerSearchQuery }));
                                  setRetailerSearchQuery('');
                                  setIsRetailerFocused(false);
                                }}
                                className="w-full px-3 py-2 text-left text-indigo-400 hover:bg-gray-700 text-sm border-t border-gray-700"
                              >
                                Add "{retailerSearchQuery}"
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Pricing Row - Quantity, Price per Item, and Total */}
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
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  style={{ backgroundColor: '#111827' }}
                />
              </div>

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
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  style={{ backgroundColor: '#111827' }}
                />
              </div>

              {/* Total Buy Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Price
                </label>
                <input
                  type="number"
                  name="buyPrice"
                  value={formData.buyPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
      </div>
    </div>
  );
};

export default AddToCollectionModal;