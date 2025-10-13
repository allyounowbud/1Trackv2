import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getItemTypeClassification } from '../utils/itemTypeUtils';
import LoadingModal from './LoadingModal';

const CustomItemSlideUpMenu = ({ isOpen, onClose, onSuccess, editingItem = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    set_name: '',
    item_type: 'Collectible',
    market_value: '',
    image_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isItemTypeDropdownOpen, setIsItemTypeDropdownOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const itemTypeOptions = [
    'Collectible',
    'Single',
    'Sealed',
    'Other'
  ];

  const handleItemTypeSelect = (itemType) => {
    setFormData(prev => ({ ...prev, item_type: itemType }));
    setIsItemTypeDropdownOpen(false);
  };

  // Populate form when editing an item
  useEffect(() => {
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
    setLoadingMessage('');

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
      const marketValueCents = Math.round(parseFloat(formData.market_value) * 100);
      const itemTypeClassification = getItemTypeClassification(formData.item_type);

      if (editingItem) {
        // Update existing item
        setLoadingMessage('Updating custom item...');
        const { error: updateError } = await supabase
          .from('items')
          .update({
            name: formData.name.trim(),
            set_name: formData.set_name.trim(),
            item_type: formData.item_type,
            market_value_cents: marketValueCents,
            image_url: formData.image_url.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new item
        setLoadingMessage('Adding custom item to database...');
        const { error: insertError } = await supabase
          .from('items')
          .insert({
            name: formData.name.trim(),
            set_name: formData.set_name.trim(),
            item_type: formData.item_type,
            market_value_cents: marketValueCents,
            image_url: formData.image_url.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      // Success - close modal and refresh data
      setLoadingMessage('Success! Item saved.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error saving custom item:', err);
      setError(err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoadingMessage('');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError('');
    onClose();
  };

  // Hide bottom navigation when menu is open
  useEffect(() => {
    if (isOpen) {
      // Hide bottom navigation
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = 'none';
      }
    } else {
      // Show bottom navigation
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = 'flex';
      }
    }

    return () => {
      // Cleanup - ensure bottom nav is shown when component unmounts
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = 'flex';
      }
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isItemTypeDropdownOpen && !event.target.closest('.item-type-dropdown')) {
        setIsItemTypeDropdownOpen(false);
      }
    };

    if (isItemTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isItemTypeDropdownOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only blur the background, not the menu */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={handleClose}
      />
      
      {/* Menu - no blur effects on the menu itself */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-600 rounded-t-3xl max-h-[90vh] flex flex-col z-50"
        style={{
          animation: 'slideUpFromBottom 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iPhone-style drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 rounded-t-3xl">
          <h2 className="text-white font-semibold" style={{ fontSize: '16px' }}>
            {editingItem ? 'Editing a Custom Item' : 'Add Custom Item'}
          </h2>
          {editingItem && (
            <p className="text-gray-400 text-sm">
              This will update the backend database for future use.
            </p>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Preview Section */}
            {(formData.name || formData.image_url) && (
              <div className="mb-6 p-4 bg-gray-900 border border-gray-600 rounded-lg">
                <div className="flex items-start gap-4">
                  {formData.image_url && (
                    <img 
                      src={formData.image_url} 
                      alt={formData.name}
                      className="w-16 h-16 object-contain rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate" style={{ fontSize: '14px' }}>
                      {formData.name || 'Item Name'}
                    </h3>
                    <p className="text-xs text-gray-300 truncate" style={{ fontSize: '12px' }}>
                      {formData.set_name || 'Set/Collection Name'}
                    </p>
                    <p className="text-xs text-indigo-400" style={{ fontSize: '12px' }}>
                      {formData.item_type}
                    </p>
                    {formData.market_value && (
                      <p className="text-xs font-medium text-white" style={{ fontSize: '12px' }}>
                        ${parseFloat(formData.market_value).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-gray-900 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter item name"
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter set or collection name"
            />
          </div>

          {/* Item Type and Market Value Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Item Type */}
            <div className="relative item-type-dropdown">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Item Type
              </label>
              <button
                type="button"
                onClick={() => setIsItemTypeDropdownOpen(!isItemTypeDropdownOpen)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex items-center justify-between"
              >
                <span>{formData.item_type}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isItemTypeDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isItemTypeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg z-50">
                  {itemTypeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleItemTypeSelect(option)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        formData.item_type === option 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-white hover:bg-gray-800'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
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
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>

            </form>
          </div>
        </div>

        {/* Fixed Bottom Action Buttons */}
        <div className="border-t border-gray-700/50 bg-gray-900 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
            </button>
          </div>
        </div>
      </div>

      {/* Universal Loading Modal */}
      <LoadingModal
        isOpen={isSubmitting && loadingMessage}
        title={editingItem ? "Updating Custom Item" : "Adding Custom Item"}
        itemName={formData.name}
        itemDetails={formData.set_name}
        statusMessage={loadingMessage}
        itemImage={formData.image_url}
        itemPrice={formData.market_value ? `$${parseFloat(formData.market_value).toFixed(2)}` : null}
      />
    </>
  );
};

export default CustomItemSlideUpMenu;
