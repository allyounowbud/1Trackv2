import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
// Marketplace retailer service removed - using Scrydex API only
import { getCleanItemName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
// Notification service removed - using Scrydex API only
import DesktopSideMenu from './DesktopSideMenu';

const AddToCollectionModal = ({ product, isOpen, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModal();
  const [formData, setFormData] = useState({
    // Purchase details
    buyDate: new Date().toISOString().split('T')[0], // Today's date
    buyPrice: '',
    pricePerItem: '',
    quantity: 1,
    buyLocation: '',
    buyNotes: '',
    // Sale details
    isSold: false,
    sellDate: '',
    sellPrice: '',
    sellMarketplace: '',
    fees: 0,
    shipping: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [marketplaces, setMarketplaces] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [sellMarketplaceSearchQuery, setSellMarketplaceSearchQuery] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [isSellMarketplaceFocused, setIsSellMarketplaceFocused] = useState(false);
  const [showCustomFeeInput, setShowCustomFeeInput] = useState(false);
  const [customFeePercentage, setCustomFeePercentage] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load marketplaces and retailers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMarketplacesAndRetailers();
    }
  }, [isOpen]);

  const loadMarketplacesAndRetailers = async () => {
    try {
      const [marketplacesData, retailersData] = await Promise.all([
        marketplaceRetailerService.getMarketplaces(),
        marketplaceRetailerService.getRetailers()
      ]);
      
      setMarketplaces(marketplacesData);
      setRetailers(retailersData);
    } catch (error) {
      console.error('Error loading marketplaces and retailers:', error);
    }
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-calculate total when price per item or quantity changes
      if (name === 'pricePerItem' || name === 'quantity') {
        const pricePerItem = name === 'pricePerItem' ? parseFloat(value) || 0 : parseFloat(prev.pricePerItem) || 0;
        const quantity = name === 'quantity' ? parseInt(value) || 1 : parseInt(prev.quantity) || 1;
        const total = pricePerItem * quantity;
        newData.buyPrice = total > 0 ? total.toFixed(2) : '';
      }
      
      // Auto-calculate price per item when total changes
      if (name === 'buyPrice') {
        const total = parseFloat(value) || 0;
        const quantity = parseInt(prev.quantity) || 1;
        const pricePerItem = quantity > 0 ? total / quantity : 0;
        newData.pricePerItem = pricePerItem > 0 ? pricePerItem.toFixed(2) : '';
      }
      
      return newData;
    });
  };

  const handleSoldToggle = (e) => {
    const isSold = e.target.checked;
    setFormData(prev => ({
      ...prev,
      isSold,
      // Reset sale data when toggling off
      ...(isSold ? {} : {
        sellDate: '',
        sellPrice: '',
        sellMarketplace: '',
        fees: 0,
        shipping: 0
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate that at least one price field is filled
    if (!formData.buyPrice && !formData.pricePerItem) {
      setError('Please enter either the total buy price or price per item.');
      setIsSubmitting(false);
      return;
    }

    try {
      // First, check if item already exists in the items table
      let itemId;
      const { data: existingItem, error: itemError } = await supabase
        .from('items')
        .select('id')
        .eq('name', product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set))
        .single();

      if (itemError && itemError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw itemError;
      }

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Debug: Log what we're about to insert
        const itemData = {
          name: product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set),
          set_name: product.set || null,
          item_type: product.type || 'Card',
          source: product.source || 'api',
          api_id: product.productId?.toString() || null,
          api_source: product.source === 'manual' ? null : 'cardmarket',
          market_value_cents: product.marketValue ? Math.round(product.marketValue * 100) : null,
          image_url: product.imageUrl || null,
          card_number: product.details?.cardNumber || null,
          description: product.description || null
        };

        // Create new item in items table
        const { data: newItem, error: createItemError } = await supabase
          .from('items')
          .insert(itemData)
          .select('id')
          .single();

        if (createItemError) throw createItemError;
        itemId = newItem.id;
      }

      // Get or create marketplace (using retailer field)
      // Get marketplace (only existing ones, don't create new ones)
      let marketplaceId = null;
      if (formData.buyLocation) {
        const marketplace = await marketplaceRetailerService.getMarketplace(formData.buyLocation);
        marketplaceId = marketplace?.id || null;
      }

      // Get or create retailer (using retailer field)
      const retailer = await marketplaceRetailerService.getOrCreateRetailer(
        formData.buyLocation || 'Unknown'
      );
      const retailerId = retailer.id;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create order in orders table
      const orderData = {
        item_id: itemId,
        user_id: user.id,
        order_type: 'buy',
        buy_date: formData.buyDate,
        buy_price_cents: Math.round((parseFloat(formData.buyPrice) / parseInt(formData.quantity)) * 100),
        buy_quantity: parseInt(formData.quantity),
        buy_location: formData.buyLocation || null,
        buy_marketplace_id: marketplaceId,
        buy_retailer_id: retailerId,
        buy_notes: formData.buyNotes || null
      };

      // Add sale data if sold
      if (formData.isSold && formData.sellPrice) {
        // Handle sell marketplace - only use existing ones, don't create new ones
        let sellMarketplaceId = null;
        if (formData.sellMarketplace && formData.sellMarketplace !== 'Other') {
          const sellMarketplace = await marketplaceRetailerService.getMarketplace(formData.sellMarketplace);
          sellMarketplaceId = sellMarketplace?.id || null;
        }

        // Get or create sell retailer
        const sellRetailer = await marketplaceRetailerService.getOrCreateRetailer(
          formData.sellMarketplace || 'Unknown'
        );
        const sellRetailerId = sellRetailer.id;

        orderData.sell_date = formData.sellDate || null;
        orderData.sell_price_cents = Math.round((parseFloat(formData.sellPrice) / parseInt(formData.quantity)) * 100);
        orderData.sell_quantity = parseInt(formData.quantity);
        orderData.sell_marketplace_id = sellMarketplaceId;
        orderData.sell_retailer_id = sellRetailerId;
        orderData.sell_fees_cents = Math.round((parseFloat(formData.sellPrice) * parseFloat(formData.fees || 0) / 100) * 100);
        orderData.sell_shipping_cents = Math.round(parseFloat(formData.shipping || 0) * 100);
      }

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      // Success! Show processing animation
      const successInfo = {
        item: product.source === 'manual' ? product.name : product.name,
        quantity: formData.quantity,
        price: formData.buyPrice,
        set: product.set
      };
      
      setSuccessData(successInfo);
      setShowProcessing(true);
      
      // Wait for processing animation, then trigger navigation
      setTimeout(() => {
        // Notification service removed - using Scrydex API only
        
        // Call onSuccess to trigger collection refresh and navigation
        onSuccess?.(successInfo);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          closeModal();
        }, 200);
      }, 2000); // 2 second processing animation
    } catch (err) {
      console.error('Error adding to collection:', err);
      setError(err.message || 'Failed to add item to collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        // Purchase details
        buyDate: new Date().toISOString().split('T')[0],
        buyPrice: '',
        pricePerItem: '',
        quantity: 1,
        buyLocation: '',
        buyNotes: '',
        // Sale details
        isSold: false,
        sellDate: '',
        sellPrice: '',
        sellMarketplace: '',
        fees: 0,
        shipping: 0
      });
      setError('');
      setShowCustomFeeInput(false);
      setCustomFeePercentage('');
      setShowSuccess(false);
      setSuccessData(null);
      setShowProcessing(false);
      onClose();
      closeModal();
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setSuccessData(null);
    onClose();
    closeModal();
  };

  if (!isOpen || !product) return null;

  // Check if we're on desktop
  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    return (
      <DesktopSideMenu isOpen={isOpen} onClose={onClose} title="Add to Collection">
        <div className="p-6 space-y-6">

      {/* Product Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div>
            <h3 className="text-white font-medium text-sm">{product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}</h3>
            {product.set && (
              <p className="text-gray-400 text-xs">{product.set}</p>
            )}
            {product.marketValue && (
              <p className="text-emerald-400 text-xs">
                Market Value: ${product.marketValue.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Purchase Details Section */}
          <div className="space-y-4">
            {/* Buy Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                name="buyDate"
                value={formData.buyDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ 
                  backgroundColor: '#1f2937',
                  minWidth: '0',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Item Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Item
              </label>
              <input
                type="text"
                value={product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm opacity-75"
              />
            </div>

            {/* Retailer */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Retailer
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
                    // Show dropdown immediately on focus
                    setRetailerSearchQuery(formData.buyLocation || '');
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on dropdown items
                    setTimeout(() => setIsRetailerFocused(false), 150);
                  }}
                  placeholder="Type to search retailers..."
                  className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ backgroundColor: '#1f2937', color: 'white' }}
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
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}>
                    {(() => {
                      const filteredRetailers = retailers.filter(retailer => 
                        retailerSearchQuery === '' || retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase())
                      );
                      const exactMatch = filteredRetailers.find(retailer => 
                        retailer.display_name.toLowerCase() === retailerSearchQuery.toLowerCase()
                      );
                      
                      return (
                        <>
                          {filteredRetailers.slice(0, 5).map(retailer => (
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
                              {retailer.location && (
                                <span className="text-gray-400 text-xs ml-2">({retailer.location})</span>
                              )}
                            </button>
                          ))}
                          {!exactMatch && formData.buyLocation && (
                            <button
                              type="button"
                              onClick={() => {
                                // Keep the current input as new retailer
                                setRetailerSearchQuery('');
                                setIsRetailerFocused(false);
                              }}
                              className="w-full px-3 py-2 text-left text-indigo-400 hover:bg-gray-700 text-sm border-t border-gray-700"
                            >
                              + Add "{formData.buyLocation}" as new retailer
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                required
                placeholder="e.g. 3"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
              />
            </div>

            {/* Price Per Item */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Price Per Item
              </label>
              <input
                type="number"
                name="pricePerItem"
                value={formData.pricePerItem}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="e.g. 38.00"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
              />
              <p className="text-xs text-gray-400 mt-1">Enter the price you paid for each individual item.</p>
            </div>

            {/* Total Buy Price */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Total Buy Price
              </label>
              <input
                type="number"
                name="buyPrice"
                value={formData.buyPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="e.g. 380.00"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
              />
              <p className="text-xs text-gray-400 mt-1">Total amount paid for all items (auto-calculated from price per item).</p>
            </div>
          </div>

          {/* Sale Details Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Sale details</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">If an order has already sold</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isSold"
                    checked={formData.isSold}
                    onChange={handleSoldToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {formData.isSold && (
              <div className="space-y-4">
                {/* Sale Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Sale Date
                  </label>
                  <input
                    type="date"
                    name="sellDate"
                    value={formData.sellDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    style={{ 
                      backgroundColor: '#1f2937',
                      minWidth: '0',
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Sell Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Total Sell Price
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    value={formData.sellPrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">If qty &gt; 1 we'll split this total across rows.</p>
                </div>

                {/* Marketplace */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Marketplace
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="sellMarketplace"
                      value={formData.sellMarketplace}
                      onChange={(e) => {
                        handleInputChange(e);
                        setSellMarketplaceSearchQuery(e.target.value);
                      }}
                      onFocus={() => {
                        setIsSellMarketplaceFocused(true);
                        // Show dropdown immediately on focus
                        setSellMarketplaceSearchQuery(formData.sellMarketplace || '');
                      }}
                      onBlur={() => {
                        // Delay hiding to allow clicking on dropdown items
                        setTimeout(() => setIsSellMarketplaceFocused(false), 150);
                      }}
                      placeholder="Type to search marketplaces..."
                      className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ backgroundColor: '#1f2937', color: 'white' }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    {formData.sellMarketplace && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, sellMarketplace: '', fees: 0 }));
                          setSellMarketplaceSearchQuery('');
                          setIsSellMarketplaceFocused(false);
                          setShowCustomFeeInput(false);
                          setCustomFeePercentage('');
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {(isSellMarketplaceFocused || sellMarketplaceSearchQuery !== '') && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}>
                        {(() => {
                          const filteredMarketplaces = marketplaces.filter(marketplace => 
                            sellMarketplaceSearchQuery === '' || marketplace.display_name.toLowerCase().includes(sellMarketplaceSearchQuery.toLowerCase())
                          );
                          const exactMatch = filteredMarketplaces.find(marketplace => 
                            marketplace.display_name.toLowerCase() === sellMarketplaceSearchQuery.toLowerCase()
                          );
                          
                          return (
                            <>
                              {filteredMarketplaces.slice(0, 4).map(marketplace => (
                                <button
                                  key={marketplace.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      sellMarketplace: marketplace.display_name,
                                      fees: marketplace.fee_percentage || 0
                                    }));
                                    setSellMarketplaceSearchQuery('');
                                    setIsSellMarketplaceFocused(false);
                                    setShowCustomFeeInput(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm"
                                >
                                  {marketplace.display_name}
                                  {marketplace.fee_percentage > 0 && (
                                    <span className="text-gray-400 text-xs ml-2">({marketplace.fee_percentage}% fee)</span>
                                  )}
                                </button>
                              ))}
                              {/* Always show "Other" option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    sellMarketplace: 'Other',
                                    fees: 0
                                  }));
                                  setSellMarketplaceSearchQuery('');
                                  setIsSellMarketplaceFocused(false);
                                  setShowCustomFeeInput(true);
                                  setCustomFeePercentage('');
                                }}
                                className="w-full px-3 py-2 text-left text-indigo-400 hover:bg-gray-700 text-sm border-t border-gray-700"
                              >
                                Other (Custom Fee)
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fees */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fees (%)
                  </label>
                  {showCustomFeeInput ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={customFeePercentage}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCustomFeePercentage(value);
                          setFormData(prev => ({ 
                            ...prev, 
                            fees: parseFloat(value) || 0
                          }));
                        }}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Enter fee percentage"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
                      />
                      <p className="text-xs text-indigo-400">Custom fee for "Other" marketplace</p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        name="fees"
                        value={formData.fees}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
                        readOnly
                      />
                      <p className="text-xs text-gray-400 mt-1">Auto filled once a marketplace is selected.</p>
                    </div>
                  )}
                </div>

                {/* Shipping */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Shipping (total)
                  </label>
                  <input
                    type="number"
                    name="shipping"
                    value={formData.shipping}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundColor: '#1f2937' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">If qty &gt; 1 we'll split shipping across rows.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button - Updated to indigo */}
        <div className="p-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#4f46e5' }}
          >
            {isSubmitting ? 'Adding...' : 'Add Order'}
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

  // Mobile version (original modal)
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden modal-overlay">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Add Order</h2>
          <p className="text-sm text-gray-400">Add new orders and sales quickly</p>
        </div>
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="text-gray-400 text-lg">📦</div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm">{product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}</h3>
            <p className="text-gray-400 text-xs">{product.set}</p>
            {product.marketValue && (
              <p className="text-blue-400 text-xs">
                Market Value: ${product.marketValue.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Purchase Details Section */}
          <div className="space-y-4">
            <h3 className="text-white font-medium text-sm">Purchase Details</h3>
            
            {/* Buy Date */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Buy Date</label>
              <input
                type="date"
                value={formData.buyDate}
                onChange={(e) => setFormData({...formData, buyDate: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                  colorScheme: 'dark',
                  backgroundColor: '#1f2937',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Item Name (read-only) */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Item Name</label>
              <input
                type="text"
                value={product.source === 'manual' ? product.name : getCleanItemName(product.name, product.set)}
                readOnly
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm opacity-75"
              />
            </div>

            {/* Retailer */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Retailer</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.buyLocation}
                  onChange={(e) => {
                    setFormData({...formData, buyLocation: e.target.value});
                    setRetailerSearchQuery(e.target.value);
                  }}
                  onFocus={() => setIsRetailerFocused(true)}
                  onBlur={() => setTimeout(() => setIsRetailerFocused(false), 200)}
                  placeholder="Search retailers..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ backgroundColor: '#1f2937' }}
                />
                {isRetailerFocused && retailers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {retailers
                      .filter(retailer => 
                        retailer.name.toLowerCase().includes(retailerSearchQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((retailer) => (
                        <button
                          key={retailer.id}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, buyLocation: retailer.name});
                            setRetailerSearchQuery(retailer.name);
                            setIsRetailerFocused(false);
                          }}
                          className="w-full px-3 py-2 text-left text-white text-sm hover:bg-gray-700 transition-colors"
                        >
                          {retailer.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => {
                  const qty = parseInt(e.target.value) || 1;
                  setFormData({
                    ...formData, 
                    quantity: qty,
                    buyPrice: formData.pricePerItem ? (parseFloat(formData.pricePerItem) * qty).toFixed(2) : ''
                  });
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
              />
            </div>

            {/* Price Per Item */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Price Per Item</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.pricePerItem}
                onChange={(e) => {
                  const price = e.target.value;
                  setFormData({
                    ...formData, 
                    pricePerItem: price,
                    buyPrice: price ? (parseFloat(price) * formData.quantity).toFixed(2) : ''
                  });
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
              />
              <p className="text-xs text-gray-400 mt-1">Enter the price you paid for each individual item.</p>
            </div>

            {/* Total Buy Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Total Buy Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.buyPrice}
                onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
              />
              <p className="text-xs text-gray-400 mt-1">Total amount paid for all items (auto-calculated from price per item).</p>
            </div>
          </div>

          {/* Sale Details Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm">Sale Details</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Mark as sold</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isSold}
                    onChange={(e) => setFormData({...formData, isSold: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>

            {formData.isSold && (
              <div className="space-y-4">
                {/* Sell Date */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sell Date</label>
                  <input
                    type="date"
                    value={formData.sellDate}
                    onChange={(e) => setFormData({...formData, sellDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{
                      colorScheme: 'dark',
                      backgroundColor: '#1f2937',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Sell Price */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sell Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">If qty &gt; 1 we'll split this total across rows.</p>
                </div>

                {/* Marketplace */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Marketplace</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sellMarketplace}
                      onChange={(e) => {
                        setFormData({...formData, sellMarketplace: e.target.value});
                        setSellMarketplaceSearchQuery(e.target.value);
                      }}
                      onFocus={() => setIsSellMarketplaceFocused(true)}
                      onBlur={() => setTimeout(() => setIsSellMarketplaceFocused(false), 200)}
                      placeholder="Search marketplaces..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ backgroundColor: '#1f2937' }}
                    />
                    {isSellMarketplaceFocused && marketplaces.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                        {marketplaces
                          .filter(marketplace => 
                            marketplace.name.toLowerCase().includes(sellMarketplaceSearchQuery.toLowerCase())
                          )
                          .slice(0, 5)
                          .map((marketplace) => (
                            <button
                              key={marketplace.id}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, sellMarketplace: marketplace.name});
                                setSellMarketplaceSearchQuery(marketplace.name);
                                setIsSellMarketplaceFocused(false);
                                
                                // Auto-fill fees based on marketplace
                                if (marketplace.fee_percentage) {
                                  setFormData(prev => ({
                                    ...prev,
                                    fees: (parseFloat(prev.sellPrice || 0) * marketplace.fee_percentage / 100).toFixed(2)
                                  }));
                                }
                              }}
                              className="w-full px-3 py-2 text-left text-white text-sm hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span>{marketplace.name}</span>
                                {marketplace.fee_percentage && (
                                  <span className="text-xs text-gray-400">
                                    {marketplace.fee_percentage}% fee
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fees */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fees</label>
                  {formData.sellMarketplace === 'Other' ? (
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customFeePercentage}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          setCustomFeePercentage(e.target.value);
                          setFormData({
                            ...formData,
                            fees: (parseFloat(formData.sellPrice || 0) * percentage / 100).toFixed(2)
                          });
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
                      />
                      <p className="text-xs text-blue-300">Custom fee for "Other" marketplace</p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.fees}
                        onChange={(e) => setFormData({...formData, fees: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        style={{ backgroundColor: '#1f2937' }}
                        readOnly
                      />
                      <p className="text-xs text-gray-400 mt-1">Auto filled once a marketplace is selected.</p>
                    </div>
                  )}
                </div>

                {/* Shipping */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Shipping</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping}
                    onChange={(e) => setFormData({...formData, shipping: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#1f2937' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">If qty &gt; 1 we'll split shipping across rows.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button - Updated to blue */}
        <div className="p-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Order'}
          </button>
        </div>
      </form>

      {/* Processing Animation Modal */}
      {showProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-sm w-full mx-4">
            {/* Spinning Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                {/* Outer ring */}
                <div className="absolute inset-0 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                {/* Inner pulsing dot */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Processing Message */}
            <div className="text-center">
              <div className="text-white font-medium mb-2">
                <p><span className="font-medium">{successData.quantity}x</span> {successData.item}</p>
                {successData.set && <p className="text-gray-400">{successData.set}</p>}
                <p className="text-blue-400 font-medium">${parseFloat(successData.price).toFixed(2)}</p>
              </div>
              <p className="text-xs text-gray-400">Updating your collection...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToCollectionModal;
