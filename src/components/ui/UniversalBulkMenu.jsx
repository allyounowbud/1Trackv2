import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PartialSaleManager from '../PartialSaleManager';

/**
 * Universal Bulk Menu Component
 * 
 * A standardized bulk actions menu that can be used across all pages
 * for handling multiple item selections and bulk operations.
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the menu is visible
 * @param {number} props.selectedCount - Number of selected items
 * @param {Array} props.selectedItems - Array of selected item objects
 * @param {string} props.variant - Menu variant: 'collection', 'pokemon', 'search'
 * @param {Function} props.onAddToCart - Add selected items to cart
 * @param {Function} props.onViewTransactionHistory - View transaction history for selected items
 * @param {Function} props.onOverridePrice - Override market prices
 * @param {Function} props.onDelete - Delete selected items
 * @param {Function} props.onExport - Export selected items
 * @param {Function} props.onCancel - Cancel selection
 * @param {Object} props.customActions - Custom action buttons
 * @param {boolean} props.showAddToCart - Show add to cart button
 * @param {boolean} props.showTransactionHistory - Show transaction history button
 * @param {boolean} props.showPriceOverride - Show price override button
 * @param {boolean} props.showDelete - Show delete button
 * @param {boolean} props.showExport - Show export button
 * @param {number} props.totalItems - Total number of available items to select from
 */
const UniversalBulkMenu = ({
  isVisible = false,
  selectedCount = 0,
  selectedItems = [],
  totalItems = 0,
  variant = 'collection', // 'collection' or 'search'
  onAddToCart,
  onViewTransactionHistory,
  onOverridePrice,
  onDelete,
  onExport,
  onCancel,
  onItemUnselect,
  onSelectAll,
  onDeselectAll,
  onActionsMenuToggle,
  customActions = [],
  showAddToCart = true,
  showTransactionHistory = true,
  showPriceOverride = true,
  showDelete = true,
  showExport = false,
  preOpenActions = false, // New prop to pre-open actions dropdown
  preOpenTransactionHistory = false, // New prop to pre-open transaction history dropdown
  transactions = [], // Transactions data for transaction history
  item = null, // Item data for transaction history
  onEdit = null, // Transaction edit handler
  onMarkAsSold = null, // Transaction mark as sold handler
  onTransactionDelete = null, // Transaction delete handler
  onBulkDelete = null, // Bulk delete handler
  showEditActions = true,
  showDeleteActions = true,
  showMarkAsSoldActions = true,
  onTransactionHistoryOpen = null, // Callback when transaction history should open
  onTransactionUpdate = null, // Transaction update handler for PartialSaleManager
  onDeleteSoldPortion = null, // Delete sold portion handler for PartialSaleManager
  ...props
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showTransactionHistoryDropdown, setShowTransactionHistoryDropdown] = useState(false);
  const [isActionsMenuFullyOpen, setIsActionsMenuFullyOpen] = useState(false);
  const [isTransactionHistoryMenuFullyOpen, setIsTransactionHistoryMenuFullyOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [markingAsSoldTransactionId, setMarkingAsSoldTransactionId] = useState(null);
  const [markAsSoldFormData, setMarkAsSoldFormData] = useState({});
  const [markAsSoldOriginalValues, setMarkAsSoldOriginalValues] = useState({});
  const [transactionFilter, setTransactionFilter] = useState('available'); // 'available', 'sold'
  const [retailers, setRetailers] = useState([]);
  const [marketplaces, setMarketplaces] = useState([]);
  const [bulkMarkAsSold, setBulkMarkAsSold] = useState({ quantity: 0, showForm: false });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const actionsMenuRef = useRef(null);
  
  // Notify parent when actions menu state changes
  React.useEffect(() => {
    if (onActionsMenuToggle) {
      onActionsMenuToggle(isActionsMenuFullyOpen);
    }
  }, [isActionsMenuFullyOpen, onActionsMenuToggle]);

  // Handle blur timing - blur starts immediately with animation
  React.useEffect(() => {
    if (showActionsDropdown) {
      // Menu is opening - blur starts immediately
      setIsActionsMenuFullyOpen(true);
    } else {
      // Menu is closing - blur off immediately
      setIsActionsMenuFullyOpen(false);
      // Reset translateY when menu closes
      setTranslateY(0);
    }
  }, [showActionsDropdown]);

  // Handle blur timing for transaction history menu
  React.useEffect(() => {
    if (showTransactionHistoryDropdown) {
      // Menu is opening - blur starts immediately
      setIsTransactionHistoryMenuFullyOpen(true);
    } else {
      // Menu is closing - blur off immediately
      setIsTransactionHistoryMenuFullyOpen(false);
      // Reset translateY when menu closes
      setTranslateY(0);
    }
  }, [showTransactionHistoryDropdown]);

  // Auto-open actions dropdown when preOpenActions is true
  React.useEffect(() => {
    if (isVisible && preOpenActions) {
      setShowActionsDropdown(true);
      setShowTransactionHistoryDropdown(false); // Close transaction history if actions opens
    }
  }, [isVisible, preOpenActions]);

  // Auto-open transaction history dropdown when preOpenTransactionHistory is true
  React.useEffect(() => {
    if (isVisible && preOpenTransactionHistory) {
      setShowTransactionHistoryDropdown(true);
      setShowActionsDropdown(false); // Close actions if transaction history opens
    }
  }, [isVisible, preOpenTransactionHistory]);

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - startY;
    
    // Only allow downward swipes
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If swiped down more than 100px, close the actions dropdown but stay in bulk mode
    if (translateY > 100) {
      setShowActionsDropdown(false);
    } else {
      // Snap back to original position
      setTranslateY(0);
    }
  };

  // Load retailers and marketplaces on component mount
  React.useEffect(() => {
    // Mock retailers data - in real app, this would come from API
    setRetailers([
      { id: 1, name: 'Amazon' },
      { id: 2, name: 'eBay' },
      { id: 3, name: 'GameStop' },
      { id: 4, name: 'Target' },
      { id: 5, name: 'Walmart' },
      { id: 6, name: 'Best Buy' },
      { id: 7, name: 'Local Store' }
    ]);

    // Mock marketplaces data with fees
    setMarketplaces([
      { id: 1, name: 'eBay', fee_percentage: 12.9 },
      { id: 2, name: 'Facebook Marketplace', fee_percentage: 0 },
      { id: 3, name: 'Mercari', fee_percentage: 10 },
      { id: 4, name: 'Poshmark', fee_percentage: 20 },
      { id: 5, name: 'Local Sale', fee_percentage: 0 },
      { id: 6, name: 'Tcgplayer', fee_percentage: 8.5 },
      { id: 7, name: 'TCGPlayer Direct', fee_percentage: 8.5 }
    ]);
  }, []);

  // Edit handlers
  const handleEditStart = (transactionId, transactionData) => {
    setEditingTransactionId(transactionId);
    const quantity = transactionData.quantity || 0;
    const pricePerItemCents = transactionData.price_per_item_cents || 0;
    const totalCost = (pricePerItemCents * quantity) / 100;
    
    const formData = {
      retailer_name: transactionData.retailer_name || '',
      purchase_date: transactionData.purchase_date || '',
      quantity: quantity,
      price_per_item_cents: (pricePerItemCents / 100).toFixed(2), // Store as dollar amount for display
      total_cost: totalCost.toFixed(2) // Store as dollar amount for display
    };
    
    setEditFormData(formData);
    setOriginalValues(formData);
  };

  const handleEditSave = async (transactionId) => {
    if (onEdit) {
      try {
        await onEdit(transactionId, editFormData);
        // The cache invalidation in the parent component will refresh the data
        // Close the edit mode after successful save
        setEditingTransactionId(null);
        setEditFormData({});
      } catch (error) {
        console.error('Error saving transaction:', error);
        // Don't close the edit mode if there was an error
        return;
      }
    } else {
      setEditingTransactionId(null);
      setEditFormData({});
    }
  };

  const handleEditCancel = () => {
    setEditingTransactionId(null);
    setEditFormData({});
    setOriginalValues({});
  };

  // Mark as Sold handlers
  const handleMarkAsSoldStart = (transactionId, transactionData) => {
    setMarkingAsSoldTransactionId(transactionId);
    const soldQuantity = transactionData.quantity_sold || 0;
    const totalQuantity = transactionData.quantity || 0;
    const remainingQuantity = totalQuantity - soldQuantity;
    
    const formData = {
      quantity_sold: 1, // Default to 1 item
      sale_price_cents: transactionData.sale_price_cents || 0,
      sale_date: new Date().toISOString().split('T')[0], // Today's date
      sale_location: transactionData.sale_location || '',
      fee_percentage: 0,
      shipping_cost_cents: transactionData.shipping_cost_cents || 0,
      remaining_quantity: remainingQuantity,
      max_quantity: remainingQuantity
    };
    
    setMarkAsSoldFormData(formData);
    setMarkAsSoldOriginalValues(formData);
    
    // Debug logging
    console.log('Mark as Sold Debug:', {
      transactionId,
      totalQuantity,
      soldQuantity,
      remainingQuantity,
      formData
    });
  };

  const handleMarkAsSoldSave = (transactionId) => {
    if (onMarkAsSold) {
      onMarkAsSold(transactionId, markAsSoldFormData);
    }
    setMarkingAsSoldTransactionId(null);
    setMarkAsSoldFormData({});
    setMarkAsSoldOriginalValues({});
  };

  const handleMarkAsSoldCancel = () => {
    setMarkingAsSoldTransactionId(null);
    setMarkAsSoldFormData({});
    setMarkAsSoldOriginalValues({});
  };

  const handleMarkAsSoldFieldChange = (field, value) => {
    setMarkAsSoldFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If quantity sold changes, update remaining quantity
      if (field === 'quantity_sold') {
        const totalQuantity = markAsSoldFormData.remaining_quantity + (markAsSoldFormData.quantity_sold || 0);
        newData.remaining_quantity = totalQuantity - (parseInt(value) || 0);
      }
      
      return newData;
    });
  };

  const handleMarketplaceChange = (marketplaceName) => {
    const marketplace = marketplaces.find(m => m.name === marketplaceName);
    setMarkAsSoldFormData(prev => ({
      ...prev,
      sale_location: marketplaceName,
      fee_percentage: marketplace ? marketplace.fee_percentage : 0
    }));
  };

  // Bulk mark as sold handlers
  const handleBulkMarkAsSoldStart = () => {
    const totalAvailable = getFilteredTransactions().reduce((sum, transaction) => {
      const soldCount = transaction.quantity_sold || 0;
      const totalQuantity = transaction.quantity || 0;
      const remainingCount = totalQuantity - soldCount;
      return sum + remainingCount;
    }, 0);
    
    setBulkMarkAsSold({
      quantity: 0,
      showForm: true,
      maxQuantity: totalAvailable
    });
  };

  const handleBulkMarkAsSoldSave = () => {
    if (bulkMarkAsSold.quantity > 0 && onBulkMarkAsSold) {
      const transactionsToMark = getFilteredTransactions()
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date)) // Oldest first
        .reduce((acc, transaction) => {
          const soldCount = transaction.quantity_sold || 0;
          const totalQuantity = transaction.quantity || 0;
          const remainingCount = totalQuantity - soldCount;
          
          if (remainingCount > 0 && acc.remainingToMark > 0) {
            const toMark = Math.min(remainingCount, acc.remainingToMark);
            acc.transactions.push({
              transactionId: transaction.id,
              quantityToMark: toMark
            });
            acc.remainingToMark -= toMark;
          }
          
          return acc;
        }, { transactions: [], remainingToMark: bulkMarkAsSold.quantity });
      
      onBulkMarkAsSold(transactionsToMark.transactions);
    }
    
    setBulkMarkAsSold({ quantity: 0, showForm: false });
  };

  const handleBulkMarkAsSoldCancel = () => {
    setBulkMarkAsSold({ quantity: 0, showForm: false });
  };

  // Bulk delete handlers
  const handleBulkDeleteStart = () => {
    setSelectMode(true);
    setSelectedTransactions([]);
  };

  const handleBulkDeleteCancel = () => {
    setSelectMode(false);
    setSelectedTransactions([]);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedTransactions.length > 0 && onBulkDelete) {
      onBulkDelete(selectedTransactions);
    }
    setSelectMode(false);
    setSelectedTransactions([]);
  };

  const handleTransactionSelect = (transactionId) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    const filteredTransactions = getFilteredTransactions();
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(transaction => transaction.id));
    }
  };

  const handleMarkAsSoldFieldBlur = (field, originalValue) => {
    setMarkAsSoldFormData(prev => {
      if (prev[field] === '' || prev[field] === null || prev[field] === undefined) {
        const revertedData = { ...prev, [field]: originalValue };
        
        // Recalculate remaining quantity if needed
        if (field === 'quantity_sold') {
          const totalQuantity = markAsSoldFormData.remaining_quantity + (markAsSoldFormData.quantity_sold || 0);
          revertedData.remaining_quantity = totalQuantity - (originalValue || 0);
        }
        
        return revertedData;
      }
      
      return prev;
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditFormData(prev => {
      const newData = { ...prev, [field]: value };
      return newData;
    });
  };

  const handleEditFieldBlur = (field, originalValue) => {
    setEditFormData(prev => {
      // If field is empty or invalid, revert to original value
      if (prev[field] === '' || prev[field] === null || prev[field] === undefined) {
        const revertedData = { ...prev, [field]: originalValue };
        
        // Recalculate dependent fields if needed
        if (field === 'price_per_item_cents') {
          const totalCost = (originalValue * revertedData.quantity) / 100;
          revertedData.total_cost = totalCost;
        }
        
        if (field === 'quantity') {
          const totalCost = (revertedData.price_per_item_cents * originalValue) / 100;
          revertedData.total_cost = totalCost;
        }
        
        return revertedData;
      }
      
      return prev;
    });
  };

  // Partial Sale Manager handlers
  const handleTransactionUpdate = async (transactionId, updatedData) => {
    if (onTransactionUpdate) {
      await onTransactionUpdate(transactionId, updatedData);
    }
  };

  const handleDeleteSoldPortion = async (transactionId, saleId) => {
    if (onDeleteSoldPortion) {
      await onDeleteSoldPortion(transactionId, saleId);
    }
  };

  // Filter transactions based on selected filter and selected items
  const getFilteredTransactions = () => {
    if (!transactions || transactions.length === 0) return [];
    
    console.log('getFilteredTransactions - Input transactions:', transactions);
    console.log('getFilteredTransactions - Selected items:', selectedItems);
    console.log('getFilteredTransactions - Selected item IDs:', selectedItems?.map(item => item.id) || []);
    
    // First filter by selected items (if any are selected)
    let filteredByItems = transactions;
    if (selectedItems && selectedItems.length > 0) {
      const selectedItemIds = selectedItems.map(item => item.id);
      filteredByItems = transactions.filter(transaction => {
        // Check if this transaction is for any of the selected items
        return selectedItemIds.includes(transaction.item_id);
      });
      console.log('getFilteredTransactions - After item filtering:', filteredByItems);
    }
    
    // Then filter by status
    const finalFiltered = filteredByItems.filter(transaction => {
      const soldCount = transaction.quantity_sold || 0;
      const totalQuantity = transaction.quantity || 0;
      const remainingCount = totalQuantity - soldCount;
      
      // Debug logging
      const shouldShow = (() => {
        switch (transactionFilter) {
          case 'available': return remainingCount > 0 && soldCount === 0;
          case 'sold': return remainingCount === 0 && soldCount > 0;
          default: return remainingCount > 0 && soldCount === 0; // Default to available/on hand
        }
      })();
      
      console.log('Transaction filter debug:', {
        transactionId: transaction.id,
        transactionNumber: transaction.order_number,
        itemId: transaction.item_id,
        selectedItemIds: selectedItems?.map(item => item.id) || [],
        totalQuantity,
        soldCount,
        remainingCount,
        filter: transactionFilter,
        isAvailable: remainingCount > 0 && soldCount === 0,
        isSold: remainingCount === 0 && soldCount > 0,
        shouldShow,
        willPassFilter: shouldShow
      });
      
      switch (transactionFilter) {
        case 'available':
          return remainingCount > 0 && soldCount === 0;
        case 'sold':
          return remainingCount === 0 && soldCount > 0; // Fully sold: no remaining AND some sold
        default:
          return remainingCount > 0 && soldCount === 0; // Default to available/on hand
      }
    });
    
    console.log('getFilteredTransactions - Final result:', finalFiltered);
    return finalFiltered;
  };

  // Handle clicks outside the actions menu to close it
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the entire bulk menu (not just the actions section)
      const bulkMenuElement = document.querySelector('[data-bulk-menu]');
      if (showActionsDropdown && bulkMenuElement && !bulkMenuElement.contains(event.target)) {
        setShowActionsDropdown(false);
      }
    };

    if (showActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActionsDropdown]);
  
  if (!isVisible || selectedCount === 0) return null;

  // Get menu styling based on variant
  const getMenuStyles = () => {
    switch (variant) {
      case 'collection':
        return 'bg-menu border-t border-menu';
      case 'pokemon':
        return 'bg-gray-800 border-t border-gray-700';
      case 'search':
        return 'bg-blue-900 border-t border-blue-700';
      default:
        return 'bg-gray-800 border-t border-gray-700';
    }
  };

  // Get button styling based on variant
  const getButtonStyles = () => {
    switch (variant) {
      case 'collection':
        return {
          primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'search':
        return {
          primary: 'text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
      default:
        return {
          primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
          danger: 'bg-red-600 hover:bg-red-700 text-white'
        };
    }
  };

  // Get available actions based on variant
  const getAvailableActions = () => {
    if (variant === 'search') {
      // Search page only shows "Add to Collection"
      return {
        showAddToCart: true,
        showTransactionHistory: false,
        showPriceOverride: false,
        showDelete: false,
        showExport: false
      };
    } else {
      // Collection page shows all actions
      return {
        showAddToCart: showAddToCart,
        showTransactionHistory: showTransactionHistory,
        showPriceOverride: showPriceOverride,
        showDelete: showDelete,
        showExport: showExport
      };
    }
  };

  const menuStyles = getMenuStyles();
  const buttonStyles = getButtonStyles();
  const availableActions = getAvailableActions();

  return (
    <>
      {/* Blur Overlay */}
      {(isActionsMenuFullyOpen || isTransactionHistoryMenuFullyOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] pointer-events-none" />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 z-[60]" data-bulk-menu style={{ bottom: isVisible ? '0px' : '0px' }}>
        {/* Actions Section - can be swiped */}
          {variant === 'collection' && (
            <div 
              ref={actionsMenuRef}
          className={`overflow-hidden transition-all duration-300 ease-in-out z-[59] ${
                showActionsDropdown ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          } ${
            isDragging ? '' : 'transition-all duration-300 ease-out'
          }`}
          style={{
            transform: showActionsDropdown ? `translateY(${translateY}px)` : 'translateY(0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
            >
              <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid rgba(75, 85, 99, 0.4)' }}>
                {/* iPhone-style swipe indicator */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
                </div>
                <div className="space-y-3">
              {availableActions.showTransactionHistory && onViewTransactionHistory && (
                <button
                  onClick={() => {
                    onViewTransactionHistory();
                    setShowActionsDropdown(false);
                    // Open transaction history menu
                    setShowTransactionHistoryDropdown(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>View Transaction History</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>View and manage all transactions for selected items</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
              
              {availableActions.showPriceOverride && onOverridePrice && (
                <button
                  onClick={() => {
                    onOverridePrice();
                    setShowActionsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>Override Market Price</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>Set custom market values for your view</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
              
              {availableActions.showDelete && onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowActionsDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-white rounded-xl transition-colors duration-200 hover:bg-gray-700"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(75, 85, 99, 0.4)' }}
                >
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 7a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-normal text-[13px]" style={{ color: 'white' }}>Delete Items</div>
                    <div className="text-[11px]" style={{ color: '#9ca3af' }}>Remove from collection</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Section - can be swiped */}
      {variant === 'collection' && (
        <div 
          className={`fixed left-0 right-0 transition-all duration-300 ease-in-out z-[59] ${
            showTransactionHistoryDropdown ? 'opacity-100' : 'max-h-0 opacity-0'
          } ${
            isDragging ? '' : 'transition-all duration-300 ease-out'
          }`}
          style={{
            bottom: '120px', // Position 120px from bottom to show all content
            transform: showTransactionHistoryDropdown ? `translateY(${translateY}px)` : 'translateY(100%)', // Slide up when open, hide below when closed
            maxHeight: 'calc(100vh - 120px)' // Don't extend beyond screen height minus 120px
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="px-6 py-3 rounded-t-3xl" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid rgba(75, 85, 99, 0.4)' }}>
            {/* iPhone-style swipe indicator */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
            </div>
            
                  {/* Transaction History Header */}
                  <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Transaction History
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        View purchase and sales history for selected items
                      </p>
                    </div>

                  {/* Filter Buttons and Bulk Mark as Sold */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setTransactionFilter('available')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          transactionFilter === 'available'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        On Hand
                      </button>
                      <button
                        onClick={() => setTransactionFilter('sold')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          transactionFilter === 'sold'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Sold
                      </button>
                    </div>
                    
                    {/* Bulk Action Buttons - Only show when there are orders AND more than 1 item selected */}
                    {getFilteredTransactions().length > 0 && selectedCount > 1 && (
                      <div className="flex items-center gap-2">
                        {/* Bulk Mark as Sold Button - Only show for available and partially-sold orders */}
                        {transactionFilter !== 'sold' && (
                          <button
                            onClick={handleBulkMarkAsSoldStart}
                            className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                            title="Start Bulk Mark as Sold"
                          >
                            <svg className="w-3 h-3 style={{ color: '#4ADE80' }}" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                            </svg>
                          </button>
                        )}
                        
                        {/* Bulk Delete Button */}
                        <button
                          onClick={handleBulkDeleteStart}
                          className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                          title="Bulk Delete Orders"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Select Mode Controls */}
                  {selectMode && (
                    <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.length === getFilteredTransactions().length && getFilteredTransactions().length > 0}
                              onChange={handleSelectAll}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <span className="text-gray-300" style={{ fontSize: '10px' }}>
                            {selectedTransactions.length} of {getFilteredTransactions().length} selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleBulkDeleteCancel}
                            className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                            title="Cancel"
                          >
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
                          <button
                            onClick={handleBulkDeleteConfirm}
                            disabled={selectedOrders.length === 0}
                            className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 disabled:bg-opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
                            title={`Delete ${selectedOrders.length} Orders`}
                          >
                            <svg className="w-3 h-3 text-red-400 disabled:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
                      </div>
                    </div>
                  )}

            {/* Orders List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const filteredTransactions = getFilteredTransactions();
                return !filteredTransactions || filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">No {transactionFilter === 'all' ? '' : transactionFilter + ' '}transactions found</div>
                    <div className="text-gray-500 text-sm">Showing {filteredTransactions?.length || 0} of {transactions?.length || 0} transactions</div>
                </div>
              ) : (
                  filteredTransactions.map((transaction) => {
                  const remainingCount = transaction.quantity - (transaction.quantity_sold || 0);
                  const soldCount = transaction.quantity_sold || 0;
                  
                  const isEditing = editingTransactionId === transaction.id;
                  const isMarkingAsSold = markingAsSoldTransactionId === transaction.id;
                  const isOtherBeingEdited = editingTransactionId && editingTransactionId !== transaction.id;
                  const isOtherBeingMarkedAsSold = markingAsSoldTransactionId && markingAsSoldTransactionId !== transaction.id;
                  
                  return (
                    <div 
                      key={transaction.id} 
                      className={`bg-white rounded-lg p-4 shadow-lg transition-all duration-300 ${
                        isOtherBeingEdited || isOtherBeingMarkedAsSold 
                          ? 'blur-sm opacity-50 pointer-events-none' 
                          : ''
                      }`}
                    >
                      {/* Item Header */}
                      <div className="flex items-center gap-4 mb-4">
                        {/* Checkbox for select mode */}
                        {selectMode && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={() => handleTransactionSelect(transaction.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        )}
                        
                        <div className="w-12 h-12 flex items-center justify-center">
                          {transaction.image_url ? (
                            <img
                              src={transaction.image_url}
                              alt={transaction.item_name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-gray-400 text-xs">📦</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm">
                            {transaction.item_name || 'Unknown Item'}
                          </h4>
                          <div className="text-xs text-gray-300">
                            {transaction.set_name || 'Unknown Set'}
                          </div>
                        </div>
                        
                        {/* Action Buttons - Hide in select mode */}
                        {!selectMode && (
                          <div className="flex items-center gap-2">
                          {/* Action Buttons - Small circular icons */}
                          <div className="flex items-center gap-1">
                            {!markingAsSoldTransactionId && !editingTransactionId && (
                              /* View Mode - Normal action buttons */
                              <>
                            {showEditActions && (
                              <button
                                    onClick={() => handleEditStart(transaction.id, transaction)}
                                    className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                                title="Edit Order"
                              >
                                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                </svg>
                              </button>
                            )}
                            {showMarkAsSoldActions && remainingCount > 0 && (
                              <button
                                    onClick={() => handleMarkAsSoldStart(transaction.id, transaction)}
                                    className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                                title="Mark as Sold"
                              >
                                    <svg className="w-3 h-3 style={{ color: '#4ADE80' }}" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                                </svg>
                              </button>
                            )}
                            {showDeleteActions && (
                              <button
                                onClick={() => onTransactionDelete && onTransactionDelete(transaction.id)}
                                    className="w-6 h-6 bg-gray-300 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-colors"
                                title="Delete Order"
                              >
                                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                              </button>
                                )}
                              </>
                            )}
                          </div>
                          </div>
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="space-y-3">
                        {markingAsSoldTransactionId === transaction.id ? (
                          /* Mark as Sold Mode */
                          <>
                            {/* Sales Information */}
                            {/* Line 1: Sale Date and Quantity */}
                            <div className="grid grid-cols-2 gap-4" style={{ fontSize: '12px' }}>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Sale Date</div>
                                <input
                                  type="date"
                                  value={markAsSoldFormData.sale_date || ''}
                                  onChange={(e) => handleMarkAsSoldFieldChange('sale_date', e.target.value)}
                                  onBlur={() => {
                                    if (markAsSoldFormData.sale_date === '' || markAsSoldFormData.sale_date === null || markAsSoldFormData.sale_date === undefined) {
                                      handleMarkAsSoldFieldChange('sale_date', markAsSoldOriginalValues.sale_date);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px' }}
                                />
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>
                                  Quantity to Sell ({markAsSoldFormData.quantity_sold || 1} of {markAsSoldFormData.max_quantity || 1})
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={markAsSoldFormData.quantity_sold || 1}
                                    onChange={(e) => handleMarkAsSoldFieldChange('quantity_sold', e.target.value)}
                                    onBlur={() => {
                                      const value = parseInt(markAsSoldFormData.quantity_sold);
                                      if (!value || value < 1) {
                                        handleMarkAsSoldFieldChange('quantity_sold', 1);
                                      } else if (value > (markAsSoldFormData.max_quantity || 1)) {
                                        handleMarkAsSoldFieldChange('quantity_sold', markAsSoldFormData.max_quantity || 1);
                                      }
                                    }}
                                    className="w-full px-2 py-1 pr-8 bg-gray-800 text-white rounded text-xs border border-gray-300 text-center"
                                    style={{ fontSize: '12px' }}
                                    min="1"
                                    max={markAsSoldFormData.max_quantity || 1}
                                  />
                                  <div className="absolute right-1 top-0 h-full flex flex-col justify-center">
                                    <button
                                      onClick={() => {
                                        const current = parseInt(markAsSoldFormData.quantity_sold) || 1;
                                        const max = markAsSoldFormData.max_quantity || 1;
                                        if (current < max) {
                                          handleMarkAsSoldFieldChange('quantity_sold', current + 1);
                                        }
                                      }}
                                      className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                      disabled={(parseInt(markAsSoldFormData.quantity_sold) || 1) >= (markAsSoldFormData.max_quantity || 1)}
                                    >
                                      <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const current = parseInt(markAsSoldFormData.quantity_sold) || 1;
                                        if (current > 1) {
                                          handleMarkAsSoldFieldChange('quantity_sold', current - 1);
                                        }
                                      }}
                                      className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                      disabled={(parseInt(markAsSoldFormData.quantity_sold) || 1) <= 1}
                                    >
                                      <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Line 2: Sale Location and Sale Price */}
                            <div className="grid grid-cols-2 gap-4" style={{ fontSize: '12px' }}>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Sale Location</div>
                                <select
                                  value={markAsSoldFormData.sale_location || ''}
                                  onChange={(e) => handleMarketplaceChange(e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px' }}
                                >
                                  <option value="" className="bg-gray-800 text-white">Select marketplace</option>
                                  {marketplaces.map(marketplace => (
                                    <option key={marketplace.id} value={marketplace.name} className="bg-gray-800 text-white">
                                      {marketplace.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Sale Price</div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={markAsSoldFormData.sale_price_cents || ''}
                                  onChange={(e) => handleMarkAsSoldFieldChange('sale_price_cents', e.target.value)}
                                  onBlur={() => {
                                    if (markAsSoldFormData.sale_price_cents === '' || markAsSoldFormData.sale_price_cents === null || markAsSoldFormData.sale_price_cents === undefined) {
                                      handleMarkAsSoldFieldChange('sale_price_cents', markAsSoldOriginalValues.sale_price_cents);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px' }}
                                  min="0"
                                />
                              </div>
                            </div>
                            
                            {/* Line 3: Fee % and Shipping Cost */}
                            <div className="grid grid-cols-2 gap-4" style={{ fontSize: '12px' }}>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Fee (%)</div>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={markAsSoldFormData.fee_percentage || ''}
                                  onChange={(e) => handleMarkAsSoldFieldChange('fee_percentage', e.target.value)}
                                  onBlur={() => {
                                    if (markAsSoldFormData.fee_percentage === '' || markAsSoldFormData.fee_percentage === null || markAsSoldFormData.fee_percentage === undefined) {
                                      handleMarkAsSoldFieldChange('fee_percentage', markAsSoldOriginalValues.fee_percentage);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px' }}
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Shipping Cost</div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={markAsSoldFormData.shipping_cost_cents || ''}
                                  onChange={(e) => handleMarkAsSoldFieldChange('shipping_cost_cents', e.target.value)}
                                  onBlur={() => {
                                    if (markAsSoldFormData.shipping_cost_cents === '' || markAsSoldFormData.shipping_cost_cents === null || markAsSoldFormData.shipping_cost_cents === undefined) {
                                      handleMarkAsSoldFieldChange('shipping_cost_cents', markAsSoldOriginalValues.shipping_cost_cents);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px' }}
                                  min="0"
                                />
                              </div>
                            </div>
                          </>
                        ) : editingTransactionId === transaction.id ? (
                          /* Edit Mode */
                          <>
                        {/* First Row: Order #, Date, Location */}
                            <div className="grid grid-cols-3 gap-4" style={{ fontSize: '12px' }}>
                          <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Order #</div>
                                <input
                                  type="text"
                                  value={transaction.order_number ? String(transaction.order_number).replace('ORD-', '') : 'N/A'}
                                  disabled
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300 cursor-not-allowed"
                                  style={{ fontSize: '12px', height: '28px' }}
                                />
                          </div>
                          <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Date</div>
                                <DatePicker
                                  selected={editFormData.purchase_date ? new Date(editFormData.purchase_date) : null}
                                  onChange={(date) => {
                                    const isoDate = date ? date.toISOString().split('T')[0] : '';
                                    handleEditFieldChange('purchase_date', isoDate);
                                  }}
                                  onBlur={() => handleEditFieldBlur('purchase_date', originalValues.purchase_date)}
                                  dateFormat="MM/dd/yy"
                                  placeholderText="MM/DD/YY"
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px', height: '28px' }}
                                  showPopperArrow={false}
                                  popperClassName="react-datepicker-dark"
                                  calendarClassName="react-datepicker-dark"
                                />
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Location</div>
                                <select
                                  value={editFormData.retailer_name || ''}
                                  onChange={(e) => handleEditFieldChange('retailer_name', e.target.value)}
                                  onBlur={() => handleEditFieldBlur('retailer_name', originalValues.retailer_name)}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px', height: '28px' }}
                                >
                                  <option value="" className="bg-gray-800 text-white">Select retailer</option>
                                  {retailers.map(retailer => (
                                    <option key={retailer.id} value={retailer.name} className="bg-gray-800 text-white">
                                      {retailer.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* Second Row: Quantity, Price (per item), Total Cost */}
                            <div className="grid grid-cols-3 gap-4" style={{ fontSize: '12px' }}>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Quantity</div>
                                <input
                                  type="number"
                                  value={editFormData.quantity || ''}
                                  onChange={(e) => {
                                    const quantity = parseInt(e.target.value) || 1;
                                    const pricePerItem = parseFloat(editFormData.price_per_item_cents) || 0;
                                    const totalCost = pricePerItem * quantity;
                                    
                                    handleEditFieldChange('quantity', e.target.value);
                                    handleEditFieldChange('total_cost', totalCost.toFixed(2));
                                  }}
                                  onBlur={() => {
                                    if (editFormData.quantity === '' || editFormData.quantity === null || editFormData.quantity === undefined) {
                                      handleEditFieldChange('quantity', originalValues.quantity);
                                    }
                                  }}
                                  disabled={soldCount > 0} // Disable if partially sold
                                  className={`w-full px-2 py-1 rounded text-xs border ${
                                    soldCount > 0 
                                      ? 'bg-gray-800 text-gray-400 border-gray-300 cursor-not-allowed' 
                                      : 'bg-gray-800 text-white border-gray-300'
                                  }`}
                                  style={{ fontSize: '12px', height: '28px' }}
                                  min="1"
                                />
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Price (per item)</div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editFormData.price_per_item_cents || ''}
                                  onChange={(e) => {
                                    const pricePerItem = parseFloat(e.target.value) || 0;
                                    const quantity = parseInt(editFormData.quantity) || 1;
                                    const totalCost = pricePerItem * quantity;
                                    
                                    handleEditFieldChange('price_per_item_cents', e.target.value);
                                    handleEditFieldChange('total_cost', totalCost.toFixed(2));
                                  }}
                                  onBlur={() => {
                                    if (editFormData.price_per_item_cents === '' || editFormData.price_per_item_cents === null || editFormData.price_per_item_cents === undefined) {
                                      handleEditFieldChange('price_per_item_cents', originalValues.price_per_item_cents);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px', height: '28px' }}
                                />
                              </div>
                              <div>
                                <div className="text-white mb-1" style={{ fontSize: '12px' }}>Total Cost</div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editFormData.total_cost || ''}
                                  onChange={(e) => {
                                    const totalCost = parseFloat(e.target.value) || 0;
                                    const quantity = parseInt(editFormData.quantity) || 1;
                                    const pricePerItem = quantity > 0 ? totalCost / quantity : 0;
                                    
                                    handleEditFieldChange('total_cost', e.target.value);
                                    handleEditFieldChange('price_per_item_cents', pricePerItem.toFixed(2));
                                  }}
                                  onBlur={() => {
                                    if (editFormData.total_cost === '' || editFormData.total_cost === null || editFormData.total_cost === undefined) {
                                      handleEditFieldChange('total_cost', originalValues.total_cost);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-300"
                                  style={{ fontSize: '12px', height: '28px' }}
                                  min="0"
                                />
                              </div>
                            </div>

                          </>
                        ) : (
                          /* View Mode */
                          <>
                            {/* First Row: Order #, Date, Location */}
                            <div className="grid grid-cols-3 gap-4" style={{ fontSize: '12px' }}>
                              <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Order #</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>{transaction.order_number ? String(transaction.order_number).replace('ORD-', '') : 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Date</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>
                              {new Date(transaction.purchase_date).toLocaleDateString('en-US', {
                                    year: '2-digit',
                                    month: '2-digit',
                                    day: '2-digit'
                              })}
                            </div>
                          </div>
                          <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Location</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>{transaction.retailer_name || 'N/A'}</div>
                          </div>
                        </div>
                        
                        {/* Second Row: Quantity, Price (per item), Total Cost */}
                            <div className="grid grid-cols-3 gap-4" style={{ fontSize: '12px' }}>
                          <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Quantity</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>{remainingCount}</div>
                          </div>
                          <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Price (per item)</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>
                              ${(transaction.price_per_item_cents / 100).toFixed(2)}
                            </div>
                          </div>
                          <div>
                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Total Cost</div>
                                <div className="font-medium text-white" style={{ fontSize: '12px' }}>
                              ${((transaction.price_per_item_cents * remainingCount) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                          </>
                        )}
                      </div>

                      {/* Partial Sale Manager */}
                      <PartialSaleManager
                        transaction={transaction}
                        onUpdateTransaction={handleTransactionUpdate}
                        onDeleteSoldPortion={handleDeleteSoldPortion}
                        showDeleteActions={showDeleteActions}
                        showEditActions={showEditActions}
                      />

                    </div>
                  );
                })
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Preview Section - Always visible and fixed at bottom */}
      {variant === 'collection' && (
        <div className={`${menuStyles} ${(showActionsDropdown || showTransactionHistoryDropdown) ? '' : 'rounded-t-3xl'} relative z-[61]`}>
          {/* Header with selection count and action buttons */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="font-normal" style={{ fontSize: '12px', color: '#9ca3af' }}>
              {selectedCount} Item{selectedCount !== 1 ? 's' : ''} Selected
          </div>
            
          {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {showTransactionHistoryDropdown ? (
                // When Transaction History is active, check if in edit mode
                (editingTransactionId || markingAsSoldTransactionId) ? (
                  // In edit mode - show Save and Cancel buttons
                  <>
                    <button
                      onClick={() => {
                        if (editingTransactionId) {
                          handleEditCancel();
                        } else if (markingAsSoldTransactionId) {
                          handleMarkAsSoldCancel();
                        }
                      }}
                      className="px-4 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                      style={{ height: '24px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (editingTransactionId) {
                          handleEditSave(editingTransactionId);
                        } else if (markingAsSoldTransactionId) {
                          handleMarkAsSoldSave(markingAsSoldTransactionId);
                        }
                      }}
                      className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                      style={{ height: '24px', fontSize: '12px' }}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  // Not in edit mode - show Close button
                  <button
                    onClick={() => setShowTransactionHistoryDropdown(false)}
                    className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                    style={{ height: '24px', fontSize: '12px' }}
                  >
                    Close
                  </button>
                )
              ) : (editingTransactionId && editFormData && Object.keys(editFormData).length > 0) || (markingAsSoldTransactionId && markAsSoldFormData && Object.keys(markAsSoldFormData).length > 0) ? (
                // When editing or marking as sold outside of transaction history, show Save and Cancel buttons
                <>
                  <button
                    onClick={() => {
                      if (editingTransactionId) {
                        handleEditCancel();
                      } else if (markingAsSoldTransactionId) {
                        handleMarkAsSoldCancel();
                      }
                    }}
                    className="px-4 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                    style={{ height: '24px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingTransactionId) {
                        handleEditSave(editingTransactionId);
                      } else if (markingAsSoldTransactionId) {
                        handleMarkAsSoldSave(markingAsSoldTransactionId);
                      }
                    }}
                    className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                    style={{ height: '24px', fontSize: '12px' }}
                  >
                    Save
                  </button>
                </>
              ) : (
                // Normal preview menu buttons
                <>
                <button
                  onClick={() => {
                    if (selectedCount === totalItems) {
                    if (onDeselectAll) onDeselectAll();
                    } else {
                    if (onSelectAll) onSelectAll();
                    }
                  }}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-white rounded flex items-center justify-center transition-colors"
                style={{ fontSize: '12px', height: '24px' }}
                >
                  {selectedCount === totalItems ? 'Deselect All' : 'Select All'}
                </button>
              
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors flex items-center gap-1"
                style={{ height: '24px', fontSize: '12px' }}
                >
                Actions
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
            
            <button
              onClick={onCancel}
              className="bg-white hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
              style={{ width: '24px', height: '24px' }}
            >
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
                </>
              )}
          </div>
        </div>
          
          {/* Subtle separator line */}
          <div className="mx-6" style={{ borderTop: '1px solid rgba(107, 114, 128, 0.45)' }}></div>

          {/* Selected Items Preview */}
          <div className="px-6 py-3">
        <div className="flex gap-2 items-end justify-start w-full">
          {(() => {
            // Calculate how many items can fit
            // Container is 354px, but we have px-6 (24px) padding on each side = 48px total
            // So available width is 354 - 48 = 306px
            // Each item is ~37px (35px width + 2px gap), overflow indicator is ~37px
            const containerWidth = 354; // px
            const padding = 48; // px (24px on each side from px-6)
            const availableWidth = containerWidth - padding; // 306px
            const itemWidth = 37; // px
            const overflowWidth = 37; // px
            const maxItems = Math.floor((availableWidth - overflowWidth) / itemWidth);
            
            // Determine how many items to show and if we need overflow
            const needsOverflow = selectedCount > maxItems;
            const itemsToShow = needsOverflow ? maxItems : selectedCount;
            
            return (
              <>
                {/* Show items that fit */}
                {Array.from({ length: itemsToShow }).map((_, index) => {
                  const item = selectedItems.length > 0 ? selectedItems[index] : null;
                  return (
                    <div key={item ? item.id : index} className="flex-shrink-0 relative group">
                      {item && (item.image || item.imageUrl) ? (
                        <>
                          <img 
                            src={item.image || item.imageUrl} 
                            alt={item.name}
                            className="w-9 h-12 object-contain rounded"
                            onError={(e) => {
                              console.log('Image failed to load for item:', item.name, 'URL:', item.image || item.imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-9 h-12 rounded flex items-center justify-center" style={{ display: 'none' }}>
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-9 h-12 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                      
                      {/* Hover overlay with X button */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item && onItemUnselect) {
                              onItemUnselect(item.id);
                            }
                          }}
                          className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* Quantity indicator - only show if quantity > 1 */}
                      {item && item.quantity && item.quantity > 1 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {item.quantity}
                          </span>
                      </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Show overflow indicator if needed */}
                {needsOverflow && (
                  <div className="flex-shrink-0 flex items-center">
                    <div className="h-12 w-9 px-2 bg-gray-700 rounded flex items-center justify-center border border-gray-400">
                      <span className="text-gray-300 font-medium text-sm">+{selectedCount - maxItems}</span>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
      )}
      </div>
    </>
  );
};

export default UniversalBulkMenu;
