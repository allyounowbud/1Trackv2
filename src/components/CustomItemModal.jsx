import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useModal } from '../contexts/ModalContext';
import notificationService from '../services/notificationService';
import DesktopSideMenu from './DesktopSideMenu';

const CustomItemModal = ({ isOpen, onClose, onSuccess }) => {
  const { openModal, closeModal } = useModal();
  const [formData, setFormData] = useState({
    name: '',
    set_name: '',
    item_type: 'Collectible',
    market_value: '',
    image_url: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prevent body scroll when modal is open and update modal context
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      openModal();
    } else {
      document.body.style.overflow = 'unset';
      closeModal();
    }

    return () => {
      document.body.style.overflow = 'unset';
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

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

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Item name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.market_value || parseFloat(formData.market_value) <= 0) {
      setError('Valid market value is required');
      setIsSubmitting(false);
      return;
    }

    try {
      // Insert custom item into items table
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          name: formData.name.trim(),
          set_name: formData.set_name.trim() || null,
          item_type: formData.item_type,
          source: 'manual',
          market_value_cents: Math.round(parseFloat(formData.market_value) * 100),
          image_url: formData.image_url.trim() || null,
          description: formData.description.trim() || null
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Show success notification
      await notificationService.showCollectionUpdate(formData.name, 'added');

      // Reset form and close modal
      setFormData({
        name: '',
        set_name: '',
        item_type: 'Collectible',
        market_value: '',
        image_url: '',
        description: ''
      });
      
      // Create success info in the expected format
      const successInfo = {
        item: formData.name,
        quantity: '1', // Custom items are always quantity 1
        price: formData.market_value || '0',
        set: formData.set_name || ''
      };
      
      onSuccess?.(successInfo);
      onClose();

    } catch (error) {
      console.error('Error adding custom item:', error);
      setError(error.message || 'Failed to add custom item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      set_name: '',
      item_type: 'Collectible',
      market_value: '',
      image_url: '',
      description: ''
    });
    setError('');
    onClose();
  };

  // Check if we're on desktop
  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    return (
      <DesktopSideMenu
        isOpen={isOpen}
        onClose={handleClose}
        title="Add Custom Item"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Labubu Rock the Universe"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Set/Collection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Set/Collection Name
            </label>
            <input
              type="text"
              name="set_name"
              value={formData.set_name}
              onChange={handleInputChange}
              placeholder="e.g., Pop Mart, Funko Pop"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Item Type
            </label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="Collectible">Collectible</option>
              <option value="Card">Card</option>
              <option value="Sealed Product">Sealed Product</option>
              <option value="Accessory">Accessory</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Market Value */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Market Value ($) *
            </label>
            <input
              type="number"
              name="market_value"
              value={formData.market_value}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image URL
            </label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional details about this item..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </DesktopSideMenu>
    );
  }

  // Mobile modal
  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={handleClose}></div>
      <div className="relative bg-gray-900 border-t border-gray-800 rounded-t-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Custom Item</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <div className="text-red-300 text-sm">{error}</div>
              </div>
            )}

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Labubu Rock the Universe"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            {/* Set/Collection Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Set/Collection Name
              </label>
              <input
                type="text"
                name="set_name"
                value={formData.set_name}
                onChange={handleInputChange}
                placeholder="e.g., Pop Mart, Funko Pop"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Item Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Item Type
              </label>
              <select
                name="item_type"
                value={formData.item_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="Collectible">Collectible</option>
                <option value="Card">Card</option>
                <option value="Sealed Product">Sealed Product</option>
                <option value="Accessory">Accessory</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Market Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Market Value ($) *
              </label>
              <input
                type="number"
                name="market_value"
                value={formData.market_value}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about this item..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomItemModal;
