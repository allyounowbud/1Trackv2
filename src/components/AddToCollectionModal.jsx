import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AddToCollectionModal = ({ product, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    buyPrice: '',
    buyDate: new Date().toISOString().split('T')[0], // Today's date
    buyLocation: '',
    buyNotes: '',
    marketplace: 'manual'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const marketplaces = [
    { value: 'manual', label: 'Manual Entry' },
    { value: 'ebay', label: 'eBay' },
    { value: 'tcgplayer', label: 'TCG Player' },
    { value: 'cardmarket', label: 'Card Market' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

      if (itemError && itemError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw itemError;
      }

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Create new item in items table
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

      // Get marketplace ID
      const { data: marketplace, error: marketplaceError } = await supabase
        .from('marketplaces')
        .select('id')
        .eq('name', formData.marketplace)
        .single();

      if (marketplaceError) throw marketplaceError;

      // Create order in orders table
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          item_id: itemId,
          order_type: 'buy',
          buy_date: formData.buyDate,
          buy_price_cents: Math.round(parseFloat(formData.buyPrice) * 100),
          buy_quantity: parseInt(formData.quantity),
          buy_location: formData.buyLocation || null,
          buy_marketplace_id: marketplace.id,
          buy_notes: formData.buyNotes || null
        });

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
        quantity: 1,
        buyPrice: '',
        buyDate: new Date().toISOString().split('T')[0],
        buyLocation: '',
        buyNotes: '',
        marketplace: 'manual'
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Add to Collection</h2>
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buy Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Buy Price (USD)
            </label>
            <input
              type="number"
              name="buyPrice"
              value={formData.buyPrice}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buy Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Buy Date
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

          {/* Marketplace */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Marketplace
            </label>
            <select
              name="marketplace"
              value={formData.marketplace}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {marketplaces.map(marketplace => (
                <option key={marketplace.value} value={marketplace.value}>
                  {marketplace.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buy Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Location (Optional)
            </label>
            <input
              type="text"
              name="buyLocation"
              value={formData.buyLocation}
              onChange={handleInputChange}
              placeholder="e.g., Local Store, Online"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              name="buyNotes"
              value={formData.buyNotes}
              onChange={handleInputChange}
              rows="2"
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Adding...' : 'Add to Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToCollectionModal;
