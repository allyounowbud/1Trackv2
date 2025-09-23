import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { marketplaceRetailerService } from '../services/marketplaceRetailerService';
import { getCleanItemName } from '../utils/nameUtils';

const AddToCollectionModal = ({ product, isOpen, onClose, onSuccess }) => {
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
        .eq('name', getCleanItemName(product.name, product.set))
        .single();

      if (itemError && itemError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw itemError;
      }

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Debug: Log what we're about to insert
        const itemData = {
          name: getCleanItemName(product.name, product.set),
          set_name: product.set || null,
          item_type: product.type || 'Card',
          source: 'api',
          api_id: product.productId?.toString() || null,
          api_source: 'cardmarket',
          market_value_cents: product.marketValue ? Math.round(product.marketValue * 100) : null,
          image_url: product.imageUrl || null,
          card_number: product.details?.cardNumber || null
        };
        console.log('🔍 Debug - Inserting item data:', itemData);
        console.log('🔍 Debug - Product data:', product);

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

      // Create order in orders table
      const orderData = {
        item_id: itemId,
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

      // Success!
      onSuccess?.({
        item: product.name,
        quantity: formData.quantity,
        price: formData.buyPrice
      });
      
      onClose();
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
      onClose();
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Add Order</h2>
          <p className="text-sm text-gray-400">Add new orders and sales quickly</p>
        </div>
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="text-gray-400 hover:text-white disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

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
            <h3 className="text-white font-medium text-sm">{getCleanItemName(product.name, product.set)}</h3>
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Item Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Item
              </label>
              <input
                type="text"
                value={getCleanItemName(product.name, product.set)}
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
                  className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-gray-700 text-sm border-t border-gray-700"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">We'll insert that many rows and split totals equally.</p>
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                                className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-gray-700 text-sm border-t border-gray-700"
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
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-emerald-400">Custom fee for "Other" marketplace</p>
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
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">If qty &gt; 1 we'll split shipping across rows.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddToCollectionModal;
