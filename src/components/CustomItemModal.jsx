import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useModal } from '../contexts/ModalContext';
// Notification service removed - using Scrydex API only
import DesktopSideMenu from './DesktopSideMenu';

const CustomItemModal = ({ isOpen, onClose, onSuccess, editingItem = null }) => {
  const { openModal, closeModal } = useModal();
  const [formData, setFormData] = useState({
    name: '',
    set_name: '',
    item_type: 'Collectible',
    market_value: '',
    image_url: '',
    background_color: 'transparent'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing an item
  React.useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        set_name: editingItem.set_name || '',
        item_type: editingItem.item_type || 'Collectible',
        market_value: editingItem.market_value_cents ? (editingItem.market_value_cents / 100).toString() : '',
        image_url: editingItem.image_url || '',
        background_color: editingItem.background_color || 'transparent'
      });
    } else {
      setFormData({
        name: '',
        set_name: '',
        item_type: 'Collectible',
        market_value: '',
        image_url: '',
        background_color: 'transparent'
      });
    }
  }, [editingItem]);

  // Create custom bottom buttons for the modal
  const createCustomButtons = () => (
    <>
      <button
        type="button"
        onClick={handleClose}
        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
      >
        {isSubmitting ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
      </button>
    </>
  );

  // Prevent body scroll when modal is open and update modal context
  React.useEffect(() => {
    if (isOpen) {
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock scroll with multiple strategies for mobile Safari
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.overflowX = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.style.webkitOverflowScrolling = 'touch';
      
      // Store scroll position for restoration
      document.body.setAttribute('data-scroll-y', scrollY.toString());
      
      openModal(createCustomButtons());
    } else {
      // Restore scroll position and styles
      const scrollY = document.body.getAttribute('data-scroll-y') || '0';
      
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.overflowX = '';
      document.body.style.touchAction = '';
      document.body.style.webkitOverflowScrolling = '';
      
      document.body.removeAttribute('data-scroll-y');
      
      // Restore scroll position
      window.scrollTo(0, parseInt(scrollY));
      
      closeModal();
    }

    return () => {
      // Cleanup on unmount
      const scrollY = document.body.getAttribute('data-scroll-y') || '0';
      
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.overflowX = '';
      document.body.style.touchAction = '';
      document.body.style.webkitOverflowScrolling = '';
      
      document.body.removeAttribute('data-scroll-y');
      
      window.scrollTo(0, parseInt(scrollY));
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
      let item, itemError;
      
      if (editingItem) {
        // Update existing item
        const { data, error } = await supabase
          .from('items')
          .update({
            name: formData.name.trim(),
            set_name: formData.set_name.trim() || null,
            item_type: formData.item_type,
            market_value_cents: Math.round(parseFloat(formData.market_value) * 100),
            image_url: formData.image_url.trim() || null,
            background_color: formData.background_color === 'transparent' ? null : formData.background_color
          })
          .eq('id', editingItem.id)
          .select()
          .single();
        
        item = data;
        itemError = error;
      } else {
        // Insert new custom item into items table
        const { data, error } = await supabase
          .from('items')
          .insert({
            name: formData.name.trim(),
            set_name: formData.set_name.trim() || null,
            item_type: formData.item_type,
            source: 'manual',
            market_value_cents: Math.round(parseFloat(formData.market_value) * 100),
            image_url: formData.image_url.trim() || null,
            background_color: formData.background_color === 'transparent' ? null : formData.background_color
          })
          .select()
          .single();
        
        item = data;
        itemError = error;
      }

      if (itemError) throw itemError;

      // Notification service removed - using Scrydex API only

      // Reset form and close modal
      setFormData({
        name: '',
        set_name: '',
        item_type: 'Collectible',
        market_value: '',
        image_url: '',
        background_color: 'transparent'
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
      background_color: 'transparent'
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
        title={editingItem ? "Edit Custom Item" : "Add Custom Item"}
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Background Color
            </label>
            <div className="relative">
              <input
                type="color"
                name="background_color"
                value={formData.background_color === 'transparent' ? '#000000' : formData.background_color}
                onChange={(e) => {
                  const color = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    background_color: color === '#000000' ? 'transparent' : color
                  }));
                }}
                className="absolute inset-0 w-full h-10 opacity-0 cursor-pointer z-10"
              />
              <input
                type="text"
                name="background_color"
                value={formData.background_color}
                onChange={handleInputChange}
                placeholder="transparent"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Choose the dominant color of your image to fill empty space</p>
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
            </button>
          </div>
        </form>
      </DesktopSideMenu>
    );
  }

  // Mobile full-screen modal
  return (
    <div className={`fixed inset-0 bg-gray-900 z-[10001] overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
      <div className="min-h-screen">
        {/* Header with Item Preview */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-3 z-10">
          <div className="flex items-center gap-4">
            {/* Item Image Preview */}
            {formData.image_url && (
              <div 
                className="h-[75px] w-[75px] rounded-lg overflow-hidden border border-gray-600 flex items-center justify-center"
                style={{ backgroundColor: formData.background_color }}
              >
                <img
                  src={formData.image_url}
                  alt={formData.name || 'Item preview'}
                  className="h-full w-full object-contain rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs" style={{ display: 'none' }}>
                  No Image
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white truncate" style={{ fontSize: '14px' }}>
                  {formData.name || (editingItem ? "Edit Custom Item" : "Add Custom Item")}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-300 hover:text-white p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-[13px] text-gray-300">
                <span>{formData.set_name || 'Custom Item'}</span>
              </div>
              <div className="text-[13px] text-gray-300">
                <span>{formData.item_type}</span>
              </div>
              {formData.market_value && (
                <div className="text-[13px] text-indigo-400 font-medium">
                  ${parseFloat(formData.market_value).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-4 py-6 pb-20">
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Background Color
              </label>
              <div className="relative">
                <input
                  type="color"
                  name="background_color"
                  value={formData.background_color === 'transparent' ? '#000000' : formData.background_color}
                  onChange={(e) => {
                    const color = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      background_color: color === '#000000' ? 'transparent' : color
                    }));
                  }}
                  className="absolute inset-0 w-full h-10 opacity-0 cursor-pointer z-10"
                />
                <input
                  type="text"
                  name="background_color"
                  value={formData.background_color}
                  onChange={handleInputChange}
                  placeholder="transparent"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Choose the dominant color of your image to fill empty space</p>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default CustomItemModal;
