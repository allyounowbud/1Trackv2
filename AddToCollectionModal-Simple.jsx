import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { marketplaceRetailerService } from '../services/marketplaceRetailerService';

const AddToCollectionModalSimple = ({ product, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Purchase details
    buyDate: new Date().toISOString().split('T')[0],
    buyPrice: '',
    quantity: 1,
    buyLocation: '',
    buyNotes: '',
    // Sale details
    isSold: false,
    sellDate: '',
    sellPrice: '',
    sellQuantity: 1,
    sellLocation: '',
    fees: 0,
    sellNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSoldToggle = (e) => {
    const isSold = e.target.checked;
    setFormData(prev => ({
      ...prev,
      isSold,
      sellQuantity: isSold ? prev.quantity : 1,
      // Reset sale data when toggling off
      ...(isSold ? {} : {
        sellDate: '',
        sellPrice: '',
        sellLocation: '',
        fees: 0,
        sellNotes: ''
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // First, check if item already exists in the items table
      let itemId;
      const { data: existingItem, error: itemError } = await supabase
        .from('items')
        .select('id')
        .eq('name', product.name)
        .single();

      if (itemError && itemError.code !== 'PGRST116') {
        throw itemError;
      }

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Create new item
        const { data: newItem, error: createItemError } = await supabase
          .from('items')
          .insert({
            name: product.name,
            set_name: product.setName || null,
            item_type: product.itemType || 'Card',
            source: 'api',
            api_id: product.id?.toString() || null,
            api_source: 'cardmarket',
            market_value_cents: product.marketValue ? Math.round(product.marketValue * 100) : null,
            image_url: product.imageUrl || null
          })
          .select('id')
          .single();

        if (createItemError) throw createItemError;
        itemId = newItem.id;
      }

      // Get or create marketplace
      const marketplace = await marketplaceRetailerService.getOrCreateMarketplace('manual');
      const marketplaceId = marketplace.id;

      // Get or create retailer
      const retailer = await marketplaceRetailerService.getOrCreateRetailer(
        formData.buyLocation || 'Unknown'
      );
      const retailerId = retailer.id;

      // Prepare order data for the new simple system
      const orderData = {
        p_item_id: itemId,
        p_buy_date: formData.buyDate,
        p_buy_price_cents: Math.round(parseFloat(formData.buyPrice) * 100),
        p_quantity: parseInt(formData.quantity),
        p_buy_location: formData.buyLocation,
        p_buy_marketplace_id: marketplaceId,
        p_buy_retailer_id: retailerId,
        p_buy_notes: formData.buyNotes
      };

      // Add sell data if sold
      if (formData.isSold && formData.sellPrice) {
        const sellMarketplace = await marketplaceRetailerService.getOrCreateMarketplace('manual');
        const sellRetailer = await marketplaceRetailerService.getOrCreateRetailer(
          formData.sellLocation || 'Unknown'
        );

        Object.assign(orderData, {
          p_sell_date: formData.sellDate,
          p_sell_price_cents: Math.round(parseFloat(formData.sellPrice) * 100),
          p_sell_quantity: parseInt(formData.sellQuantity),
          p_sell_location: formData.sellLocation,
          p_sell_marketplace_id: sellMarketplace.id,
          p_sell_retailer_id: sellRetailer.id,
          p_sell_fees_cents: Math.round(parseFloat(formData.fees) * 100),
          p_sell_notes: formData.sellNotes
        });
      }

      // Create order using the new simple function
      const { data: orderId, error: orderError } = await supabase.rpc(
        'create_clean_order',
        orderData
      );

      if (orderError) throw orderError;

      // Success!
      onSuccess && onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        buyDate: new Date().toISOString().split('T')[0],
        buyPrice: '',
        quantity: 1,
        buyLocation: '',
        buyNotes: '',
        isSold: false,
        sellDate: '',
        sellPrice: '',
        sellQuantity: 1,
        sellLocation: '',
        fees: 0,
        sellNotes: ''
      });

    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-lg">Add to Collection</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Product Info */}
          <div className="flex items-center space-x-3 mt-3">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div>
              <h3 className="text-white font-medium text-sm">{product.name}</h3>
              {product.setName && (
                <p className="text-gray-400 text-xs">{product.setName}</p>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                name="buyDate"
                value={formData.buyDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Buy Price */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Total Buy Price
              </label>
              <input
                type="number"
                step="0.01"
                name="buyPrice"
                value={formData.buyPrice}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Buy Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location/Retailer
              </label>
              <input
                type="text"
                name="buyLocation"
                value={formData.buyLocation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Local Store, eBay, TCGPlayer"
              />
            </div>

            {/* Buy Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="buyNotes"
                value={formData.buyNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Additional notes about this purchase..."
              />
            </div>
          </div>

          {/* Sold Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isSold"
              name="isSold"
              checked={formData.isSold}
              onChange={handleSoldToggle}
              className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isSold" className="text-sm font-medium text-gray-300">
              This item was already sold
            </label>
          </div>

          {/* Sale Details Section */}
          {formData.isSold && (
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <h3 className="text-white font-medium text-sm">Sale Details</h3>
              
              {/* Sell Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sell Date
                </label>
                <input
                  type="date"
                  name="sellDate"
                  value={formData.sellDate}
                  onChange={handleInputChange}
                  required={formData.isSold}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sell Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Total Sell Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="sellPrice"
                  value={formData.sellPrice}
                  onChange={handleInputChange}
                  required={formData.isSold}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              {/* Sell Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Quantity Sold
                </label>
                <input
                  type="number"
                  min="1"
                  max={formData.quantity}
                  name="sellQuantity"
                  value={formData.sellQuantity}
                  onChange={handleInputChange}
                  required={formData.isSold}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sell Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sell Location
                </label>
                <input
                  type="text"
                  name="sellLocation"
                  value={formData.sellLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., TCGPlayer, eBay, Local Sale"
                />
              </div>

              {/* Fees */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Fees
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="fees"
                  value={formData.fees}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              {/* Sell Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sale Notes
                </label>
                <textarea
                  name="sellNotes"
                  value={formData.sellNotes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Additional notes about this sale..."
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add to Collection'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToCollectionModalSimple;
