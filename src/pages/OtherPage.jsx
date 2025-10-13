/**
 * Other Page
 * Dedicated page for manually added custom items
 * Allows users to add and manage items not tracked in the database
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, MoreVertical, ChevronRight } from 'lucide-react';
import { GAMES } from '../config/gamesConfig';
import SafeImage from '../components/SafeImage';
import CustomItemSlideUpMenu from '../components/CustomItemSlideUpMenu';
import { useModal } from '../contexts/ModalContext';
import { supabase } from '../lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import ConfirmationModal from '../components/ConfirmationModal';

const OtherPage = () => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  // State
  const [customItems, setCustomItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [selectedCustomItem, setSelectedCustomItem] = useState(null);
  const [showCustomItemMenu, setShowCustomItemMenu] = useState(false);
  
  // Bulk selection state
  const [selectedCustomItems, setSelectedCustomItems] = useState(new Set());
  const [isCustomSelectionMode, setIsCustomSelectionMode] = useState(false);
  const [showCustomBulkMenu, setShowCustomBulkMenu] = useState(false);
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'danger'
  });

  // Get game config
  const gameConfig = GAMES.OTHER;

  // Load custom items on mount
  useEffect(() => {
    loadCustomItems();
  }, []);

  // Control modal context when custom item menu opens/closes
  useEffect(() => {
    if (showCustomItemMenu) {
      openModal();
    } else {
      closeModal();
    }
  }, [showCustomItemMenu, openModal, closeModal]);

  // Load custom items from database
  const loadCustomItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('source', 'manual')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomItems(data || []);
    } catch (error) {
      console.error('Error loading custom items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format price
  const formatPrice = (cents) => {
    if (cents === null || cents === undefined) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Handle custom item select (for multi-select)
  const handleCustomItemSelect = (itemId) => {
    const newSelected = new Set(selectedCustomItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedCustomItems(newSelected);
    
    // Auto-exit bulk selection mode if no items are selected
    if (newSelected.size === 0) {
      setIsCustomSelectionMode(false);
      setShowCustomBulkMenu(false);
      showBottomNavigation();
    }
  };

  // Prevent multi-select for single items
  const shouldAllowMultiSelect = () => {
    return customItems.length > 1;
  };

  // Handle long press to enter selection mode
  const handleCustomLongPress = (itemId) => {
    if (!isCustomSelectionMode && shouldAllowMultiSelect()) {
      setIsCustomSelectionMode(true);
      setSelectedCustomItems(new Set([itemId]));
      
      // Hide bottom navigation
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = 'none';
      }
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  // Store timeout refs for clearing long press timeouts
  const longPressTimeouts = useRef(new Map());

  // Select all custom items
  const selectAllCustomItems = () => {
    const allIds = new Set(customItems.map(item => item.id));
    setSelectedCustomItems(allIds);
  };

  // Show bottom navigation
  const showBottomNavigation = () => {
    const bottomNav = document.querySelector('.bottom-nav-fixed');
    if (bottomNav) {
      bottomNav.style.display = 'flex';
    }
  };

  // Clear custom selection
  const clearCustomSelection = () => {
    setSelectedCustomItems(new Set());
    setIsCustomSelectionMode(false);
    setShowCustomBulkMenu(false);
    showBottomNavigation(); // Show bottom navigation
    closeModal();
  };

  // Handle edit custom item
  const handleEditCustomItem = (item) => {
    setSelectedCustomItem(item);
    setIsCustomItemModalOpen(true);
    setShowCustomItemMenu(false);
    setIsCustomSelectionMode(false); // Clear bulk selection mode
    setSelectedCustomItems(new Set()); // Clear selected items
    showBottomNavigation(); // Show bottom navigation
    // Don't auto-select the item when editing
  };

  // Handle delete custom item
  const handleDeleteCustomItem = async (item) => {
    setShowCustomItemMenu(false);
    setIsCustomSelectionMode(false); // Clear bulk selection mode
    setSelectedCustomItems(new Set()); // Clear selected items
    showBottomNavigation(); // Show bottom navigation
    
    openConfirmationModal({
      title: 'Delete Item',
      message: `Are you sure you want to delete this item? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      items: [item],
      showCloseButton: false,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', item.id);

          if (error) throw error;

          // Reload custom items
          await loadCustomItems();
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: queryKeys.orders });
          queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary });
        } catch (error) {
          console.error('Error deleting custom item:', error);
        }
      }
    });
  };

  // Handle bulk delete
  const handleCustomBulkDelete = async () => {
    setShowCustomBulkMenu(false);
    
    // Get the items being deleted
    const itemsToDelete = customItems.filter(item => selectedCustomItems.has(item.id));
    
    openConfirmationModal({
      title: 'Delete Items',
      message: `Are you sure you want to delete ${selectedCustomItems.size} item(s)? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      items: itemsToDelete,
      showCloseButton: false,
      onConfirm: async () => {
        try {
          const itemIds = Array.from(selectedCustomItems);
          const { error} = await supabase
            .from('items')
            .delete()
            .in('id', itemIds);

          if (error) throw error;

          // Clear selection and reload
          clearCustomSelection();
          await loadCustomItems();
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: queryKeys.orders });
          queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary });
        } catch (error) {
          console.error('Error deleting custom items:', error);
        }
      }
    });
  };

  // Confirmation modal helpers
  const openConfirmationModal = (config) => {
    setConfirmationModal({
      isOpen: true,
      ...config
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({
      ...confirmationModal,
      isOpen: false
    });
  };

  const handleConfirmAction = () => {
    if (confirmationModal.onConfirm) {
      confirmationModal.onConfirm();
    }
    closeConfirmationModal();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Simple Page Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-1 text-xs mb-4">
            <button
              onClick={() => navigate('/categories')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Categories
            </button>
            <ChevronRight className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-indigo-400">Other</span>
          </nav>

          {/* Logo and Controls Header */}
          <div className="flex items-end justify-between mb-1">
            {/* Title and Count - Bottom aligned */}
            <div className="flex flex-col">
              <h2 className="font-semibold text-white leading-tight" style={{ fontSize: '14px' }}>
                Custom Items
              </h2>
              <span className="text-xs text-gray-400 leading-tight mt-0.5">
                {loading ? 'Loading...' : `${customItems.length} item${customItems.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {/* Logo and Add Button Container */}
            <div className="flex flex-col items-center space-y-1">
              {/* Other Logo - Centered above button */}
              {gameConfig.logo && (
                <img 
                  src={gameConfig.logo}
                  alt={gameConfig.name}
                  className="h-8 w-36 object-contain"
                />
              )}
              
              {/* Add New Button */}
              <button
                onClick={() => {
                  setSelectedCustomItem(null);
                  setIsCustomItemModalOpen(true);
                }}
                className="px-3 py-1 text-sm rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
              >
                <Plus size={14} />
                Add New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 py-6 ${isCustomSelectionMode ? 'pb-32' : 'pb-20'}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-400" size={48} />
          </div>
        ) : customItems.length > 0 ? (
          <div>
            {/* Items Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
              {customItems.map((item) => {
                const isSelected = selectedCustomItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                        : 'border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/70'
                    }`}
                    onTouchStart={(e) => {
                      if (isCustomSelectionMode) {
                        e.preventDefault();
                        handleCustomItemSelect(item.id);
                      } else {
                        // Long press to enter selection mode
                        const timeoutId = setTimeout(() => {
                          if (!isCustomSelectionMode) {
                            handleCustomLongPress(item.id);
                          }
                        }, 500);
                        longPressTimeouts.current.set(item.id, timeoutId);
                      }
                    }}
                    onTouchEnd={(e) => {
                      // Clear long press timeout when touch ends
                      const timeoutId = longPressTimeouts.current.get(item.id);
                      if (timeoutId) {
                        clearTimeout(timeoutId);
                        longPressTimeouts.current.delete(item.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (isCustomSelectionMode) {
                        e.preventDefault();
                        handleCustomItemSelect(item.id);
                      } else {
                        // Long press to enter selection mode
                        const timeoutId = setTimeout(() => {
                          if (!isCustomSelectionMode) {
                            handleCustomLongPress(item.id);
                          }
                        }, 500);
                        longPressTimeouts.current.set(item.id, timeoutId);
                      }
                    }}
                    onMouseUp={(e) => {
                      // Clear long press timeout when mouse is released
                      const timeoutId = longPressTimeouts.current.get(item.id);
                      if (timeoutId) {
                        clearTimeout(timeoutId);
                        longPressTimeouts.current.delete(item.id);
                      }
                    }}
                    onClick={(e) => {
                      // Only handle click if not in selection mode (to prevent double-toggle)
                      if (!isCustomSelectionMode) {
                        e.preventDefault();
                        // Handle normal click behavior here if needed
                      }
                    }}
                  >
                    {/* Item Image */}
                    <div className="aspect-[488/680] bg-gray-900/50 rounded-t-xl overflow-hidden relative">
                      {item.image_url ? (
                        <SafeImage
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${item.image_url ? 'hidden' : 'flex'}`}>
                        <div className="text-center">
                          <div className="text-2xl mb-1">📦</div>
                          <div className="text-gray-400 text-xs">No Image</div>
                        </div>
                      </div>
                    </div>

                    {/* Item Info - Bottom Section */}
                    <div className="p-3 space-y-1">
                      {/* Item Name - First Line */}
                      <div>
                        <h3 className="text-white leading-tight line-clamp-2 font-bold text-[11px] md:text-xs">
                          {item.name}
                        </h3>
                      </div>
                      
                      {/* Set Name - Ghost Text */}
                      <div className="text-[11px] md:text-xs text-gray-400 truncate">
                        {item.set_name || 'Custom Item'}
                      </div>
                      
                      {/* Status Text */}
                      <div className="text-[11px] md:text-xs text-blue-400 font-medium">
                        {item.item_type || 'Collectible'}
                      </div>
                      
                      {/* Market Value and Menu Button */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="font-bold text-white text-[11px] md:text-xs">
                          {item.market_value_cents ? formatPrice(item.market_value_cents) : 'No Value'}
                        </div>
                        <div className="relative">
                          {isSelected ? (
                            <div className="text-indigo-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                
                                // Clear any pending long press timeout for this item
                                const timeoutId = longPressTimeouts.current.get(item.id);
                                if (timeoutId) {
                                  clearTimeout(timeoutId);
                                  longPressTimeouts.current.delete(item.id);
                                }
                                
                                setSelectedCustomItem(item);
                                setShowCustomItemMenu(true);
                                // Don't auto-select the item when opening menu
                              }}
                              className="bg-gray-700/50 hover:bg-gray-600/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                              title="Item Options"
                            >
                              <MoreVertical size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg">No custom items yet</p>
              <p className="text-sm mt-2">Add your first item using the button above</p>
            </div>
          </div>
        )}
      </div>


      {/* Backdrop to hide bottom navigation when bulk preview menu is active */}
      {isCustomSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-gray-900 z-40" />
      )}

      {/* Custom Items Bulk Preview Bar - Replaces bottom navigation */}
      {isCustomSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out rounded-t-3xl"
        style={{ 
          bottom: '-1px',
          backgroundColor: '#030712',
          borderTop: '1px solid #374151',
          position: 'fixed',
          transform: 'none',
          WebkitTransform: 'none',
          willChange: 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}>
          <div className="flex flex-col">
            {/* Expanded Actions - Slides down from above */}
            <div className={`overflow-hidden transition-all duration-300 ease-out ${
              showCustomBulkMenu ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="border-t border-gray-600/30 border-b border-gray-700/50 bg-gray-900/50 rounded-t-2xl">
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-gray-600 rounded-full" />
                </div>
                
                {/* Action Options */}
                <div className="px-4 py-4 space-y-2">
                  {/* Delete All Selected */}
                  <button 
                    onClick={handleCustomBulkDelete}
                    className="w-full flex items-center justify-between p-4 bg-gray-800/30 border border-gray-600/50 rounded-xl hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-2 0v1a1 1 0 002 0V2zM4 4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h2a1 1 0 100-2H7z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">Delete All Selected</div>
                        <div className="text-xs text-gray-400">Remove these items from your collection</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Bar Content */}
            <div className="px-4 py-2">
              {/* Top section with selection info and actions */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400">
                    {selectedCustomItems.size} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllCustomItems}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setShowCustomBulkMenu(!showCustomBulkMenu)}
                    className={`px-2 py-1 rounded text-xs text-white font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap ${
                      showCustomBulkMenu ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Actions
                    <svg className={`w-3 h-3 flex-shrink-0 transition-transform duration-300 ease-out ${showCustomBulkMenu ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={clearCustomSelection}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-medium transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Border separator */}
              <div className="border-t border-gray-700/30 mx-0 my-1" />
              
              {/* Image previews */}
              <div className="flex items-center gap-3 overflow-x-auto py-2">
                {customItems
                  .filter(item => selectedCustomItems.has(item.id))
                  .slice(0, 6)
                  .map((item) => (
                    <div 
                      key={item.id}
                      className="relative group cursor-pointer flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomItemSelect(item.id);
                      }}
                    >
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-10 h-14 object-contain rounded transition-opacity group-hover:opacity-50"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                      {/* Hover overlay with remove button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                {selectedCustomItems.size > 6 && (
                  <div className="flex-shrink-0 w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-400">+{selectedCustomItems.size - 6}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Item Menu Overlay */}
      {showCustomItemMenu && selectedCustomItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end modal-overlay"
          style={{ zIndex: 10003 }}
          onClick={() => {
            setShowCustomItemMenu(false);
            setSelectedCustomItem(null);
            setIsCustomSelectionMode(false); // Clear bulk selection mode
            setSelectedCustomItems(new Set()); // Clear selected items
            showBottomNavigation(); // Show bottom navigation
          }}
        >
          <div 
            className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iPhone-style drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-semibold text-white">
                Item Options
              </h2>
            </div>

            {/* Action Options */}
            <div className="px-4 pt-4 pb-8 space-y-2">
              {/* Edit Item */}
              <button 
                onClick={() => handleEditCustomItem(selectedCustomItem)}
                className="w-full flex items-center justify-between p-5 bg-gray-800/50 hover:bg-gray-700/70 active:bg-gray-600/70 rounded-2xl transition-all duration-150 touch-manipulation"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Edit Item</div>
                    <div className="text-xs text-gray-400">Update item details</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Delete Item */}
              <button 
                onClick={() => handleDeleteCustomItem(selectedCustomItem)}
                className="w-full flex items-center justify-between p-5 bg-gray-800/50 hover:bg-gray-700/70 active:bg-gray-600/70 rounded-2xl transition-all duration-150 touch-manipulation"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-2 0v1a1 1 0 002 0V2zM4 4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h2a1 1 0 100-2H7z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Delete Item</div>
                    <div className="text-xs text-gray-400">Remove this item from your collection</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Close Button */}
            <div className="px-4 pb-6 pt-2">
              <button
                onClick={() => {
                  setShowCustomItemMenu(false);
                  setSelectedCustomItem(null);
                  setIsCustomSelectionMode(false); // Clear bulk selection mode
                  setSelectedCustomItems(new Set()); // Clear selected items
                  showBottomNavigation(); // Show bottom navigation
                }}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Item Slide-Up Menu */}
      <CustomItemSlideUpMenu
        isOpen={isCustomItemModalOpen}
        onClose={() => {
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
          setIsCustomSelectionMode(false); // Clear bulk selection mode
          setSelectedCustomItems(new Set()); // Clear selected items
          showBottomNavigation(); // Show bottom navigation
        }}
        onSuccess={() => {
          loadCustomItems();
          setIsCustomItemModalOpen(false);
          setSelectedCustomItem(null);
          setIsCustomSelectionMode(false); // Clear bulk selection mode
          setSelectedCustomItems(new Set()); // Clear selected items
          showBottomNavigation(); // Show bottom navigation
        }}
        editingItem={selectedCustomItem}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={handleConfirmAction}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
        confirmVariant={confirmationModal.confirmVariant}
        items={confirmationModal.items}
        showCloseButton={confirmationModal.showCloseButton}
      />

      {/* Add slide animation styles */}
      <style jsx>{`
        @keyframes slideUpFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default OtherPage;
