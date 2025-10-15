import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { getItemDisplayName, getItemSetName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { useCart } from '../contexts/CartContext';
import { updateOrder } from '../utils/orderNumbering';
import { queryKeys, queryClient } from '../lib/queryClient';
import SafeImage from '../components/SafeImage';
import AddToCollectionModal from '../components/AddToCollectionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
  filterOnHandOrders, 
  filterSoldOrders, 
  getRemainingCount,
  getSoldCount,
  hasItemsSold,
  getStatusDisplayText,
  getEffectiveQuantity,
  isPartiallySold
} from '../utils/orderStatus';


// Simple data fetching - just one table!
async function getOrders() {
  const { data, error } = await supabase
    .from("individual_orders_clean")
    .select("*")
    .order("item_id, order_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getCollectionSummary() {
  const { data, error } = await supabase
    .from("collection_summary_clean")
    .select("*")
    .order("item_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Cache bust: Updated modal theme colors - v2
const Collection = () => {
  const location = useLocation();
  const { isModalOpen, openModal, closeModal } = useModal();
  const { openCollectionMenu, closeCollectionMenu, enterBulkSelectionMode, exitBulkSelectionMode, isBulkSelectionMode } = useCart();
  
  const [searchQuery, setSearchQuery] = useState(
    location.state?.searchQuery || ''
  );
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'individual'
  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showMarkAsSoldModal, setShowMarkAsSoldModal] = useState(false);
  const [timeRange, setTimeRange] = useState('7D');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);
  const [isBulkMenuExpanded, setIsBulkMenuExpanded] = useState(false);
  const [isBulkMenuClosing, setIsBulkMenuClosing] = useState(false);
  const [bulkMenuDragData, setBulkMenuDragData] = useState({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isItemMenuClosing, setIsItemMenuClosing] = useState(false);
  const [itemMenuDragData, setItemMenuDragData] = useState({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);
  const [editPriceData, setEditPriceData] = useState(null);
  const [showOverridePriceModal, setShowOverridePriceModal] = useState(false);
  const [overridePriceData, setOverridePriceData] = useState(null);
  const [marketValueOverrides, setMarketValueOverrides] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Confirmation modal states
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'danger'
  });

  // Helper functions for confirmation modal
  const openConfirmationModal = (config) => {
    setConfirmationModal({
      isOpen: true,
      title: config.title || 'Confirm Action',
      message: config.message || 'Are you sure you want to proceed?',
      onConfirm: config.onConfirm,
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      confirmVariant: config.confirmVariant || 'danger'
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
    if (confirmationModal.onConfirm) {
      confirmationModal.onConfirm();
    }
    closeConfirmationModal();
  };
  
  // Bulk order book states
  const [showBulkOrderBook, setShowBulkOrderBook] = useState(false);
  const [showBulkOverridePrice, setShowBulkOverridePrice] = useState(false);
  const [editingOrderGroupId, setEditingOrderGroupId] = useState(null);
  const [inlineEditData, setInlineEditData] = useState({});
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [isLocationDropdownClicked, setIsLocationDropdownClicked] = useState(false);

  // Ensure page starts at top when component mounts
  useEffect(() => {
    const scrollToTop = () => {
      // Reset any body styles that might interfere with scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('modal-open');
      
      // Force scroll to top
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Target the actual scrollable containers
      const mainContent = document.querySelector('.main-content');
      const desktopMainContent = document.querySelector('.desktop-main-content');
      
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      
      if (desktopMainContent) {
        desktopMainContent.scrollTop = 0;
      }
    };

    // Run immediately and after a delay
    scrollToTop();
    setTimeout(scrollToTop, 0);
    setTimeout(scrollToTop, 100);
  }, []);

  // Load market value overrides from localStorage on component mount
  useEffect(() => {
    const savedOverrides = localStorage.getItem('marketValueOverrides');
    if (savedOverrides) {
      try {
        setMarketValueOverrides(JSON.parse(savedOverrides));
      } catch (error) {
        console.error('Error loading market value overrides:', error);
        setMarketValueOverrides({});
      }
    }
  }, []);
  const [ordersToConfirmDelete, setOrdersToConfirmDelete] = useState([]);
  const [isOrderSelectionMode, setIsOrderSelectionMode] = useState(false);

  // Refs for dropdowns and long press
  const filterDropdownRef = useRef(null);
  const longPressRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  // Load market value overrides from localStorage on component mount
  useEffect(() => {
    const savedOverrides = localStorage.getItem('marketValueOverrides');
    if (savedOverrides) {
      try {
        setMarketValueOverrides(JSON.parse(savedOverrides));
      } catch (error) {
        console.error('Error loading market value overrides:', error);
      }
    }
  }, []);


  // Save market value overrides to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('marketValueOverrides', JSON.stringify(marketValueOverrides));
  }, [marketValueOverrides]);


  // Create a stable reference for overrides to prevent infinite re-renders
  const overridesString = JSON.stringify(marketValueOverrides);

  // Touch gesture handlers for item menu
  const handleItemMenuClose = () => {
    setIsItemMenuClosing(true);
    closeCollectionMenu();
    setTimeout(() => {
      setShowItemMenu(false);
      setIsItemMenuClosing(false);
      setItemMenuDragData({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
    }, 300);
  };

  const handleItemMenuTouchStart = (e) => {
    const touch = e.touches[0];
    setItemMenuDragData({
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  const handleItemMenuTouchMove = (e) => {
    if (!itemMenuDragData.isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - itemMenuDragData.startY;
    
    // Only allow downward swipe (positive deltaY)
    if (deltaY > 0) {
      setItemMenuDragData({
        ...itemMenuDragData,
        currentY: touch.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleItemMenuTouchEnd = () => {
    if (!itemMenuDragData.isDragging) return;
    
    const deltaY = itemMenuDragData.deltaY || 0;
    
    // If swiped down more than 100px, close the menu
    if (deltaY > 100) {
      handleItemMenuClose();
    } else {
      // Snap back to original position
      setItemMenuDragData({
        ...itemMenuDragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  const getItemMenuTransform = () => {
    if (!itemMenuDragData.isDragging) return 'translateY(0)';
    return `translateY(${Math.max(0, itemMenuDragData.deltaY)}px)`;
  };

  // Touch gesture handlers for bulk actions menu
  const handleBulkMenuClose = () => {
    setIsBulkMenuClosing(true);
    setTimeout(() => {
      setShowBulkActionsMenu(false);
      setIsBulkMenuClosing(false);
      setBulkMenuDragData({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
      closeModal();
    }, 300);
  };

  const handleBulkMenuTouchStart = (e) => {
    const touch = e.touches[0];
    setBulkMenuDragData({
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  const handleBulkMenuTouchMove = (e) => {
    if (!bulkMenuDragData.isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - bulkMenuDragData.startY;
    
    // Only allow downward swipe (positive deltaY)
    if (deltaY > 0) {
      setBulkMenuDragData({
        ...bulkMenuDragData,
        currentY: touch.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleBulkMenuTouchEnd = () => {
    if (!bulkMenuDragData.isDragging) return;
    
    const deltaY = bulkMenuDragData.deltaY || 0;
    
    // If swiped down more than 100px, close the menu
    if (deltaY > 100) {
      handleBulkMenuClose();
    } else {
      // Snap back to original position
      setBulkMenuDragData({
        ...bulkMenuDragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  const getBulkMenuTransform = () => {
    if (!bulkMenuDragData.isDragging) return 'translateY(0)';
    return `translateY(${Math.max(0, bulkMenuDragData.deltaY)}px)`;
  };

  // Selection functions
  const handleItemSelect = (itemId) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
    
    if (newSelectedItems.size === 0) {
      setIsSelectionMode(false);
      exitBulkSelectionMode();
    }
  };

  const handleLongPress = (itemId) => {
    // If already in bulk selection mode, just toggle the item selection
    if (isBulkSelectionMode) {
      handleItemSelect(itemId);
      return;
    }
    
    const totalItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter)).length;
    
    // If there's only 1 item and not in bulk mode, show the normal menu
    if (totalItems === 1) {
      setSelectedItemId(itemId);
      setShowItemMenu(true);
      openCollectionMenu();
      openModal();
      return;
    }
    
    // For multiple items, enter selection mode
    setIsSelectionMode(true);
    enterBulkSelectionMode();
    handleItemSelect(itemId);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    exitBulkSelectionMode();
  };

  const selectAll = () => {
    const totalItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter)).length;
    
    // Only allow select all if there are multiple items
    if (totalItems > 1) {
      const allItemIds = new Set((collectionData.items || []).map(item => item.id));
      setSelectedItems(allItemIds);
      setIsSelectionMode(true);
      enterBulkSelectionMode();
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Fetch data with optimized caching
  const { data: orders = [], isLoading: ordersLoading, isFetching: ordersFetching, refetch: refetchOrders } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on network reconnect
  });

  const { data: collectionSummary = [], isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: queryKeys.collectionSummary,
    queryFn: getCollectionSummary,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on network reconnect
  });

  // State for prefilled add item form
  const [prefilledCardData, setPrefilledCardData] = useState(null);
  const [currentMarketValue, setCurrentMarketValue] = useState(null);
  const [isRawPrice, setIsRawPrice] = useState(false);

  // Update modal context when prefilled data changes
  useEffect(() => {
    if (prefilledCardData) {
      openModal();
    } else {
      closeModal();
    }
  }, [prefilledCardData, openModal, closeModal, isModalOpen]);

  // Check for prefilled card data from search page
  useEffect(() => {
    // Check for navigation state first (instant)
    if (location.state?.showAddModal && location.state?.prefilledData) {
      setPrefilledCardData(location.state.prefilledData);
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
    // Fallback to sessionStorage for backwards compatibility
    else {
      const prefilledData = sessionStorage.getItem('prefilledCardData');
      if (prefilledData) {
        try {
          const cardData = JSON.parse(prefilledData);
          sessionStorage.removeItem('prefilledCardData');
          setPrefilledCardData(cardData);
        } catch (error) {
          console.error('Error parsing prefilled card data:', error);
          sessionStorage.removeItem('prefilledCardData');
        }
      }
    }
  }, [location.state]);

  // Check for success data from navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successItem = urlParams.get('successItem');
    const successQuantity = urlParams.get('successQuantity');
    const successPrice = urlParams.get('successPrice');
    const successSet = urlParams.get('successSet');

    if (successItem && successQuantity && successPrice) {
      setSuccessData({
        item: successItem,
        quantity: successQuantity,
        price: successPrice,
        set: successSet
      });
      setShowSuccessNotification(true);
      
      // Force refresh collection data
      refetchOrders();
      refetchSummary();
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
        setSuccessData(null);
      }, 5000);
    }
  }, [refetchOrders, refetchSummary]);

  // Delete order and associated item if no other orders exist
  const deleteOrder = async (orderId) => {
    try {
      // First, get the order details to find the item_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('item_id')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Delete the order
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteOrderError) throw deleteOrderError;

      // Check if there are any other orders for this item
      const { data: remainingOrders, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('item_id', order.item_id);

      if (checkError) throw checkError;

      // If no other orders exist for this item, delete the item too
      if (remainingOrders.length === 0) {
        const { error: deleteItemError } = await supabase
          .from('items')
          .delete()
          .eq('id', order.item_id);

        if (deleteItemError) {
          console.warn('Could not delete item:', deleteItemError);
          // Don't throw here as the order was already deleted successfully
        }
      }
      
      await refetchOrders();
      await refetchSummary();
      setShowOrderMenu(false);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  // Mark order as sold - SIMPLE!
  const markOrderAsSold = async (orderId, sellData) => {
    try {
      const { error } = await supabase.rpc('mark_order_sold', {
        p_order_id: orderId,
        p_sell_date: sellData.sellDate,
        p_sell_price_cents: Math.round(parseFloat(sellData.sellPrice) * 100),
        p_sell_quantity: parseInt(sellData.quantity),
        p_sell_location: sellData.location,
        p_sell_fees_cents: Math.round(parseFloat(sellData.fees || 0) * 100),
        p_sell_notes: sellData.notes
      });
      if (error) throw error;
      
      await refetchOrders();
      await refetchSummary();
      setShowMarkAsSoldModal(false);
      setShowOrderMenu(false);
    } catch (error) {
      console.error('Error marking order as sold:', error);
    }
  };

  // Handle delete product - show orders for selection
  const handleDeleteProduct = (itemId) => {
    const itemOrders = orders.filter(order => order.item_id === itemId);
    
    setOrdersToDelete(itemOrders);
    setShowDeleteModal(true);
    setShowItemMenu(false);
    // Don't close modal here - delete modal is opening
  };

  // Delete selected orders
  const deleteSelectedOrders = async (orderIds) => {
    try {
      // Get all orders to find their item_ids
      const { data: ordersToDelete, error: ordersError } = await supabase
        .from('orders')
        .select('id, item_id')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      // Delete all orders
      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (deleteOrdersError) throw deleteOrdersError;

      // Get unique item_ids from deleted orders
      const itemIds = [...new Set(ordersToDelete.map(order => order.item_id))];

      // For each item, check if there are any remaining orders
      for (const itemId of itemIds) {
        const { data: remainingOrders, error: checkError } = await supabase
          .from('orders')
          .select('id')
          .eq('item_id', itemId);

        if (checkError) {
          console.warn('Could not check remaining orders for item:', itemId, checkError);
          continue;
        }

        // If no other orders exist for this item, delete the item too
        if (remainingOrders.length === 0) {
          const { error: deleteItemError } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId);

          if (deleteItemError) {
            console.warn('Could not delete item:', itemId, deleteItemError);
          }
        }
      }
      
      await refetchOrders();
      await refetchSummary();
      setShowDeleteModal(false);
      setShowDeleteConfirmation(false);
      setOrdersToDelete([]);
      closeModal();
      setSelectedOrderIds(new Set());
      setOrdersToConfirmDelete([]);
      setIsOrderSelectionMode(false);
    } catch (error) {
      console.error('Error deleting orders:', error);
    }
  };

  const confirmDeleteOrders = (orderIds) => {
    const ordersToConfirm = ordersToDelete.filter(order => orderIds.includes(order.id));
    setOrdersToConfirmDelete(ordersToConfirm);
    setShowDeleteConfirmation(true);
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const selectAllOrders = () => {
    const allOrderIds = new Set(ordersToDelete.map(order => order.id));
    setSelectedOrderIds(allOrderIds);
  };

  const clearOrderSelection = () => {
    setSelectedOrderIds(new Set());
    setIsOrderSelectionMode(false);
  };

  // Group orders by item for summary view
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.item_id]) {
      acc[order.item_id] = {
        item: {
          id: order.item_id,
          name: order.item_name,
          set_name: order.set_name,
          image_url: order.image_url,
          market_value_cents: order.market_value_cents,
          item_type: order.item_type,
          card_number: order.card_number
        },
        orders: []
      };
    }
    acc[order.item_id].orders.push(order);
    return acc;
  }, {});

  const formatPrice = (price) => {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to filter items based on selected filter
  const matchesFilter = (item, filter) => {
    if (filter === 'All') return true;
    if (filter === 'Graded') {
      return item.item_type === 'Single' && item.card_condition && item.card_condition !== 'Raw';
    }
    if (filter === 'Ungraded') {
      return item.item_type === 'Single' && (!item.card_condition || item.card_condition === 'Raw');
    }
    if (filter === 'Sealed') {
      return item.item_type === 'Sealed';
    }
    if (filter === 'Custom') {
      return item.source === 'manual';
    }
    return true;
  };

  // Memoize filtered orders for better performance
  // Use quantity-based filtering for partial sale support
  const filteredOrders = useMemo(() => {
    return filterOnHandOrders(orders);
  }, [orders]);

  const soldOrders = useMemo(() => {
    return filterSoldOrders(orders);
  }, [orders]);

  // Calculate collection statistics with optimized processing
  const collectionStats = useMemo(() => {
    const totalValueCents = filteredOrders.reduce((sum, order) => {
      const overrideKey = `${order.item_id}`;
      const overrideValue = marketValueOverrides[overrideKey];
      const marketValue = overrideValue ? overrideValue * 100 : (order.market_value_cents || 0);
      const remainingQty = getRemainingCount(order);
      return sum + (marketValue * remainingQty);
    }, 0);

    const totalPaidCents = orders.reduce((sum, order) => {
      const remainingQty = getRemainingCount(order);
      return sum + (order.price_per_item_cents * remainingQty);
    }, 0);

    const totalProfitCents = orders.reduce((sum, order) => {
      const soldCount = getSoldCount(order);
      if (soldCount > 0) {
        // For sold items, use actual net profit
        return sum + (order.net_profit_cents || 0);
      } else {
        // For on-hand items, calculate unrealized profit
        const overrideKey = `${order.item_id}`;
        const overrideValue = marketValueOverrides[overrideKey];
        const marketValueCents = overrideValue ? overrideValue * 100 : (order.market_value_cents || 0);
        const remainingQty = getRemainingCount(order);
        const marketValue = marketValueCents * remainingQty;
        const cost = order.total_cost_cents || 0;
        return sum + (marketValue - cost);
      }
    }, 0);

    return {
      totalValue: totalValueCents / 100,
      totalPaid: totalPaidCents / 100,
      totalProfit: totalProfitCents / 100,
      profitPercentage: totalPaidCents > 0 ? (totalProfitCents / totalPaidCents) * 100 : 0
    };
  }, [filteredOrders, orders, marketValueOverrides]);

  // Calculate collection data with optimized processing
  const collectionData = useMemo(() => {
    const { totalValue, totalPaid, totalProfit, profitPercentage } = collectionStats;


    
    // Optimized category filtering and counting
    const categoryCounts = filteredOrders.reduce((acc, order) => {
      const quantity = getRemainingCount(order);
      
      if (order.source === 'manual') {
        acc.custom += quantity;
      } else if (order.item_type === 'Sealed') {
        acc.sealed += quantity;
      } else if (order.item_type === 'Single' && order.card_condition && order.card_condition !== 'Raw') {
        // PSA 10, BGS 9, etc. are considered graded
        acc.graded += quantity;
      } else {
        // Raw cards or singles without specific condition are ungraded
        acc.ungraded += quantity;
      }
      
      return acc;
    }, { ungraded: 0, graded: 0, sealed: 0, custom: 0 });

    // Group orders by item name for display
    const itemGroups = {};
    filteredOrders.forEach(order => {
      if (!order.item_name) return;
      
      const itemName = order.item_name;
      if (!itemGroups[itemName]) {
        itemGroups[itemName] = {
          name: itemName,
          set_name: order.set_name,
          item_type: order.item_type,
          market_value_cents: order.market_value_cents,
          image_url: order.image_url,
          source: order.source,
          quantity: 0,
          totalPaid: 0,
          orders: []
        };
      }
      
      const remainingQty = getRemainingCount(order);
      itemGroups[itemName].quantity += remainingQty;
      itemGroups[itemName].totalPaid += (order.price_per_item_cents * remainingQty);
      itemGroups[itemName].orders.push(order);
    });

    // Convert to collection items format
    const items = Object.values(itemGroups).map((group, index) => {
      // Check if there's a custom override for this item
      const overrideKey = `${group.orders[0]?.item_id}`;
      const overrideValue = marketValueOverrides[overrideKey];
      const perItemValue = overrideValue ? overrideValue * 100 : (group.market_value_cents || 0);
      const totalValue = perItemValue * group.quantity;
      const profit = totalValue - group.totalPaid;
      const profitPercent = group.totalPaid > 0 ? (profit / group.totalPaid) * 100 : 0;
      
      // Determine status based on new item_type and card_condition fields
      let status = "Unknown";
      if (group.source === 'manual') {
        status = "Custom";
      } else {
        // Use the new item_type and card_condition fields
        const firstOrder = group.orders[0];
        if (firstOrder) {
          if (firstOrder.item_type === 'Sealed') {
            status = "Sealed";
          } else if (firstOrder.item_type === 'Single' && firstOrder.card_condition) {
            status = firstOrder.card_condition; // Will show "Raw", "PSA 10", etc.
          } else if (firstOrder.item_type === 'Single') {
            status = "Raw"; // Fallback for singles without condition
          } else {
            status = firstOrder.item_type || "Unknown";
          }
        }
      }

      // Use clean item name and separate card number
      const cleanName = getItemDisplayName(group);
      
      return {
        id: group.orders[0]?.item_id || `item-${index}`, // Use actual item_id from database
        name: cleanName, // Clean name without card number
        cardNumber: group.card_number, // Separate card number field
        set: group.set_name || "Unknown Set",
        status: status,
        item_type: group.item_type, // Add new field
        card_condition: group.orders[0]?.card_condition, // Add new field
        grading_company: group.orders[0]?.grading_company, // Add new field
        value: perItemValue / 100, // Convert cents to dollars (per-item value) - used for calculations
        originalValue: (group.market_value_cents || 0) / 100, // Original market value (not affected by overrides)
        paid: group.totalPaid / 100, // Convert cents to dollars (total paid)
        quantity: group.quantity,
        profit: profit / 100, // Convert cents to dollars (total profit)
        profitPercent: profitPercent,
        image: group.image_url || null
      };
    });

    // Calculate filtered values based on selectedFilter
    const getFilteredData = (filter) => {
      let filteredOrders = orders;
      
      if (filter === 'Ungraded') {
        filteredOrders = orders.filter(order => 
          getRemainingCount(order) > 0 && 
          order.item_type === 'Single' && 
          (!order.card_condition || order.card_condition === 'Raw')
        );
      } else if (filter === 'Graded') {
        filteredOrders = orders.filter(order => 
          getRemainingCount(order) > 0 && 
          order.item_type === 'Single' && 
          order.card_condition && 
          order.card_condition !== 'Raw'
        );
      } else if (filter === 'Sealed') {
        filteredOrders = orders.filter(order => 
          getRemainingCount(order) > 0 && order.item_type === 'Sealed'
        );
      } else if (filter === 'Custom') {
        filteredOrders = orders.filter(order => 
          getRemainingCount(order) > 0 && order.source === 'manual'
        );
      }

      const filteredValueCents = filteredOrders.reduce((sum, order) => {
        const remainingQty = getRemainingCount(order);
        return sum + ((order.market_value_cents || 0) * remainingQty);
      }, 0);

      const filteredPaidCents = filteredOrders.reduce((sum, order) => {
        return sum + (order.total_cost_cents || 0);
      }, 0);

      const filteredProfitCents = filteredOrders.reduce((sum, order) => {
        const soldCount = getSoldCount(order);
        if (soldCount > 0) {
          return sum + (order.net_profit_cents || 0);
        } else {
          const remainingQty = getRemainingCount(order);
          const marketValue = (order.market_value_cents || 0) * remainingQty;
          const cost = order.total_cost_cents || 0;
          return sum + (marketValue - cost);
        }
      }, 0);

      return {
        value: filteredValueCents / 100,
        paid: filteredPaidCents / 100,
        profit: filteredProfitCents / 100,
        profitPercentage: (filteredPaidCents / 100) > 0 ? ((filteredProfitCents / 100) / (filteredPaidCents / 100)) * 100 : 0
      };
    };

    const filteredData = getFilteredData(selectedFilter);

    return {
      totalValue,
      totalPaid,
      totalProfit,
      profitPercentage,
      ungradedCount: categoryCounts.ungraded,
      gradedCount: categoryCounts.graded,
      sealedCount: categoryCounts.sealed,
      customCount: categoryCounts.custom,
      items,
      // Filtered data for display
      filteredValue: selectedFilter === 'All' ? totalValue : filteredData.value,
      filteredPaid: selectedFilter === 'All' ? totalPaid : filteredData.paid,
      filteredProfit: selectedFilter === 'All' ? totalProfit : filteredData.profit,
      filteredProfitPercentage: selectedFilter === 'All' ? profitPercentage : filteredData.profitPercentage
    };
  }, [orders, selectedFilter, overridesString, filteredOrders, collectionStats]);

  // Exit selection mode only if selected items no longer exist in the database
  useEffect(() => {
    if (isBulkSelectionMode && selectedItems.size > 0) {
      // Check if any of the selected items still exist in the database
      const existingSelectedItems = Array.from(selectedItems).filter(itemId => {
        const item = collectionData.items?.find(i => i.id === itemId);
        return !!item; // Only check if item exists, not if it matches current filter
      });
      
      // Only exit if none of the selected items exist in the database anymore
      if (existingSelectedItems.length === 0) {
        setIsSelectionMode(false);
        exitBulkSelectionMode();
        setSelectedItems(new Set());
      }
    }
  }, [collectionData.items, isBulkSelectionMode, selectedItems]);

  // Generate real chart data based on actual order history
  const generateChartData = () => {
    const days = timeRange === '7D' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365;
    const data = [];
    const today = new Date();
    
    // Filter orders based on selectedFilter using the same logic as the main filtering
    let filteredOrders = orders.filter(order => getRemainingCount(order) > 0);
    
    if (selectedFilter === 'Ungraded') {
      filteredOrders = orders.filter(order => 
        getRemainingCount(order) > 0 && 
        order.item_type === 'Single' && 
        (!order.card_condition || order.card_condition === 'Raw')
      );
    } else if (selectedFilter === 'Graded') {
      filteredOrders = orders.filter(order => 
        getRemainingCount(order) > 0 && 
        order.item_type === 'Single' && 
        order.card_condition && 
        order.card_condition !== 'Raw'
      );
    } else if (selectedFilter === 'Sealed') {
      filteredOrders = orders.filter(order => 
        getRemainingCount(order) > 0 && order.item_type === 'Sealed'
      );
    } else if (selectedFilter === 'Custom') {
      filteredOrders = orders.filter(order => 
        getRemainingCount(order) > 0 && order.source === 'manual'
      );
    }
    
    // Group filtered orders by date to calculate cumulative value
    const ordersByDate = {};
    filteredOrders.forEach(order => {
      if (getRemainingCount(order) > 0 && order.purchase_date) {
        try {
          const orderDate = new Date(order.purchase_date).toISOString().split('T')[0];
          if (!ordersByDate[orderDate]) {
            ordersByDate[orderDate] = [];
          }
          ordersByDate[orderDate].push(order);
        } catch (error) {
          console.warn('Invalid date in order:', order.purchase_date, error);
        }
      }
    });
    
    let cumulativeValue = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Add value for orders placed on this date
      if (ordersByDate[dateStr]) {
        ordersByDate[dateStr].forEach(order => {
          const overrideKey = `${order.item_id}`;
          const overrideValue = marketValueOverrides[overrideKey];
          const marketValue = overrideValue ? overrideValue * 100 : (order.market_value_cents || 0);
          cumulativeValue += marketValue * order.quantity;
        });
      }
      
      data.push({
        date: dateStr,
        value: cumulativeValue / 100 // Convert cents to dollars
      });
    }
    
    return data;
  };

  const chartData = generateChartData();
  const validValues = chartData.filter(d => d && typeof d.value === 'number' && !isNaN(d.value)).map(d => d.value);
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;
  
  // Chart data ready for rendering
  
  // Calculate percentage change for the selected time range
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    if (firstValue === 0) return 0;
    return ((lastValue - firstValue) / firstValue) * 100;
  };
  
  const percentageChange = calculatePercentageChange();

  // Get date range and labels based on selected time range
  const getDateRange = () => {
    const today = new Date();
    const ranges = {
      '7D': {
        days: 7,
        label: 'Last 7 days',
        dates: [
          new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
          today
        ]
      },
      '1M': {
        days: 30,
        label: 'Last 30 days',
        dates: [
          new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
          today
        ]
      },
      '3M': {
        days: 90,
        label: 'Last 90 days',
        dates: [
          new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000),
          today
        ]
      },
      '6M': {
        days: 180,
        label: 'Last 180 days',
        dates: [
          new Date(today.getTime() - 179 * 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
          today
        ]
      },
      '1Y': {
        days: 365,
        label: 'Last 365 days',
        dates: [
          new Date(today.getTime() - 364 * 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 182 * 24 * 60 * 60 * 1000),
          today
        ]
      }
    };
    return ranges[timeRange] || ranges['7D'];
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const currentDateRange = getDateRange();

  if (ordersLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header Skeleton */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="h-4 bg-gray-700 rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-700 rounded w-12 animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Category Buttons Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-6 animate-pulse">
                  <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-gray-700 rounded w-8"></div>
                </div>
              ))}
            </div>

            {/* Items Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3 animate-pulse">
                  <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>

      {/* Collection Value Section */}
      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="text-center mb-3 pt-2 md:mb-6 md:pt-4">
          <div className="text-sm text-gray-600 mb-1 md:mb-2">
            {selectedFilter === 'All' ? 'Your collection is worth' : 
             selectedFilter === 'Ungraded' ? 'Your ungraded collection is worth' :
             selectedFilter === 'Graded' ? 'Your graded collection is worth' :
             selectedFilter === 'Sealed' ? 'Your sealed collection is worth' :
             selectedFilter === 'Custom' ? 'Your custom collection is worth' :
             'Your collection is worth'}
          </div>
          <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-blue-400 mb-1 md:mb-2 tracking-tight">
            {formatPrice(collectionData.filteredValue)}
          </div>
          <div className="text-sm text-gray-600">You Paid • {formatPrice(collectionData.filteredPaid)} <span className={collectionData.filteredProfitPercentage >= 0 ? 'text-green-600' : 'text-red-400'}>({collectionData.filteredProfitPercentage >= 0 ? '+' : ''}{collectionData.filteredProfitPercentage.toFixed(1)}%)</span></div>
        </div>
      </div>

      {/* Item Status Breakdown - Moved above Portfolio */}
      <div className="px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-4 gap-3 md:gap-6 lg:gap-8 mb-2 md:mb-4">
          <button 
            onClick={() => {
              setSelectedFilter('Ungraded');
              // Smooth scroll to results section
              setTimeout(() => {
                const resultsSection = document.querySelector('[data-section="results"]');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }
              }, 100);
            }}
            className="text-center bg-transparent border border-gray-200 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105"
          >
            <div className="text-xs text-gray-600 mb-1 md:mb-2">Ungraded</div>
            <div className="text-sm font-bold text-blue-400">
              {collectionData.ungradedCount}
            </div>
          </button>
          <button 
            onClick={() => {
              setSelectedFilter('Graded');
              // Smooth scroll to results section
              setTimeout(() => {
                const resultsSection = document.querySelector('[data-section="results"]');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }
              }, 100);
            }}
            className="text-center bg-transparent border border-gray-200 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105"
          >
            <div className="text-xs text-gray-600 mb-1 md:mb-2">Graded</div>
            <div className="text-sm font-bold text-blue-400">
              {collectionData.gradedCount}
            </div>
          </button>
          <button 
            onClick={() => {
              setSelectedFilter('Sealed');
              // Smooth scroll to results section
              setTimeout(() => {
                const resultsSection = document.querySelector('[data-section="results"]');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }, 100);
            }}
            className="text-center bg-transparent border border-gray-200 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105"
          >
            <div className="text-xs text-gray-600 mb-1 md:mb-2">Sealed</div>
            <div className="text-sm font-bold text-blue-400">
              {collectionData.sealedCount}
            </div>
          </button>
          <button 
            onClick={() => {
              setSelectedFilter('Custom');
              // Smooth scroll to results section
              setTimeout(() => {
                const resultsSection = document.querySelector('[data-section="results"]');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }
              }, 100);
            }}
            className="text-center bg-transparent border border-gray-200 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105"
          >
            <div className="text-xs text-gray-600 mb-1 md:mb-2">Custom</div>
            <div className="text-sm font-bold text-blue-400">
              {collectionData.customCount}
            </div>
          </button>
        </div>
      </div>

      {/* Collection History */}
      <div className="px-3 md:px-6 lg:px-8 pb-4 md:pb-8" style={{ paddingTop: '9px' }}>
        <div className="bg-transparent border border-gray-200 rounded-xl p-4 md:p-10 lg:p-12">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div>
              <div className="text-base md:text-2xl lg:text-3xl font-semibold text-gray-600">My Portfolio</div>
              {/* Summary Text */}
              <div className="text-sm text-gray-600 mt-1">
                {currentDateRange.label} <span className="text-blue-400">{formatPrice(collectionData.filteredValue)}</span> 
                <span className="text-blue-400 ml-1">
                  ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
                </span>
              </div>
            </div>
            {/* Share Collection */}
            <button className="flex items-center gap-1 md:gap-3 px-2 md:px-4 py-1 md:py-2 border border-gray-600/50 rounded-lg text-xs md:text-base text-white bg-gray-800/30 hover:bg-gray-700/30 transition-colors">
              <svg className="w-3 h-3 md:w-5 md:h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="hidden md:inline">Share Collection</span>
              <span className="md:hidden">Share</span>
            </button>
          </div>
          
        {/* Chart */}
        <div className="h-36 md:h-80 lg:h-96 xl:h-[28rem] mb-2 md:mb-6">
          <svg width="100%" height="100%" viewBox="0 0 300 100" className="overflow-visible">
            <defs>
              {/* Gradient for area under line */}
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
              </linearGradient>
            </defs>

            {/* Dynamic chart based on real data */}
            {(() => {
              if (chartData.length === 0 || validValues.length === 0) return null;
              
              const width = 300;
              const height = 100;
              const padding = 10;
              
              // Calculate scale factors
              const valueRange = maxValue - minValue;
              const scaleY = valueRange > 0 ? (height - 2 * padding) / valueRange : 1;
              const scaleX = (width - 2 * padding) / (chartData.length - 1);
              
              // Generate path data with safety checks
              const points = chartData
                .filter(point => point && typeof point.value === 'number' && !isNaN(point.value))
                .map((point, index) => {
                  const x = padding + (index * scaleX);
                  const y = height - padding - ((point.value - minValue) * scaleY);
                  return { x, y };
                });
              
              // Create smooth curved line using quadratic Bézier curves
              const createSmoothPath = (points) => {
                if (points.length < 2) return '';
                
                let path = `M ${points[0].x},${points[0].y}`;
                
                for (let i = 1; i < points.length; i++) {
                  const prev = points[i - 1];
                  const curr = points[i];
                  
                  // Calculate control point for smooth curve
                  const controlX = (prev.x + curr.x) / 2;
                  const controlY = prev.y;
                  
                  path += ` Q ${controlX},${controlY} ${curr.x},${curr.y}`;
                }
                
                return path;
              };
              
              // Create area path (for gradient fill) - also smooth
              const createSmoothAreaPath = (points) => {
                if (points.length < 2) return '';
                
                let path = `M ${points[0].x},${height - padding}`;
                path += ` L ${points[0].x},${points[0].y}`;
                
                for (let i = 1; i < points.length; i++) {
                  const prev = points[i - 1];
                  const curr = points[i];
                  
                  // Calculate control point for smooth curve
                  const controlX = (prev.x + curr.x) / 2;
                  const controlY = prev.y;
                  
                  path += ` Q ${controlX},${controlY} ${curr.x},${curr.y}`;
                }
                
                path += ` L ${points[points.length - 1].x},${height - padding} Z`;
                
                return path;
              };
              
              const areaPath = createSmoothAreaPath(points);
              const linePath = createSmoothPath(points);
              
              // Get last point for circle
              const lastPoint = points[points.length - 1];
              
              return (
                <>
                  {/* Area under the line */}
                  <path
                    d={areaPath}
                    fill="url(#chartGradient)"
                  />
                  {/* Line */}
                  <path
                    d={linePath}
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Data point circle */}
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="3"
                    fill="#60a5fa"
                    stroke="#1f2937"
                    strokeWidth="1"
                  />
                </>
              );
            })()}
          </svg>
        </div>
          
                 {/* Date labels below chart */}
                 <div className="flex justify-between text-sm text-gray-400 mb-6 px-2">
                   <span>{formatDate(currentDateRange.dates[0])}</span>
                   <span>{formatDate(currentDateRange.dates[1])}</span>
                   <span>{formatDate(currentDateRange.dates[2])}</span>
                 </div>
          
                 {/* Time range buttons below chart - centered */}
                 <div className="flex justify-center gap-2 md:gap-3 mb-6">
                   {['7D', '1M', '3M', '6M', '1Y'].map((range) => (
                     <button
                       key={range}
                       onClick={() => setTimeRange(range)}
                       className={`px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm font-medium transition-colors ${
                         timeRange === range
                           ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                           : 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/40 hover:text-gray-300 border border-gray-700/30'
                       }`}
                     >
                       {range}
                     </button>
                   ))}
                 </div>
          
            {/* Disclaimer text - centered and smaller */}
            <div className="text-center text-sm text-gray-400 leading-tight px-6">
              <div>Collection history tracks the total value of your items for each day since the day they're added.</div>
            </div>
        </div>
      </div>



      {/* Collected Items */}
      <div className="px-3 md:px-6 lg:px-8 py-4 md:py-8" data-section="results">
        <div className="px-3 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-sm font-medium text-white">Collection •</span>
                <div className="relative" ref={filterDropdownRef}>
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="text-sm font-medium text-blue-400 hover:text-blue-400 transition-colors"
                  >
                    {selectedFilter}
                  </button>
                  
                  {/* Filter Dropdown */}
                  {showFilterDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
                      <div className="py-1">
                        {['All', 'Ungraded', 'Graded', 'Sealed', 'Custom'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setSelectedFilter(filter);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              selectedFilter === filter
                                ? 'bg-blue-400/20 text-blue-400'
                                : 'text-white hover:bg-gray-800'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {selectedFilter === 'All' 
                  ? (collectionData.items?.length || 0)
                  : (collectionData.items?.filter(item => matchesFilter(item, selectedFilter)).length || 0)
                } Results
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">Total Value • <span className="text-blue-400">
                {formatPrice(
                  selectedFilter === 'All' 
                    ? collectionData.totalValue 
                    : (collectionData.items || [])
                        .filter(item => matchesFilter(item, selectedFilter))
                        .reduce((sum, item) => sum + (item.value * item.quantity), 0)
                )}
              </span></div>
              <div className="text-sm md:text-base text-gray-400">Press + Hold To Select</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4 md:mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 md:h-5 md:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search your items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 bg-white border border-gray-200 rounded-lg text-sm md:text-base text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Items Grid */}
        <div className={`px-3 md:px-6 lg:px-8 ${isBulkSelectionMode ? 'pb-24' : 'pb-4'}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {(collectionData.items || [])
            .filter(item => matchesFilter(item, selectedFilter))
            .map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
                   <div 
                     key={item.id} 
                     className={`relative bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 ${
                       isSelected && (isBulkSelectionMode || isSelectionMode)
                         ? 'border-indigo-300 bg-indigo-50' 
                         : 'hover:bg-gray-100 hover:border-gray-300'
                     }`}
                     onTouchStart={(e) => {
                       const totalItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter)).length;
                       if (totalItems > 1 || isBulkSelectionMode) {
                         longPressTriggeredRef.current = false;
                         longPressRef.current = setTimeout(() => {
                           handleLongPress(item.id);
                           longPressTriggeredRef.current = true;
                           longPressRef.current = null;
                         }, 500);
                       }
                     }}
                     onTouchEnd={(e) => {
                       if (longPressRef.current) {
                         clearTimeout(longPressRef.current);
                         longPressRef.current = null;
                       }
                     }}
                     onMouseDown={(e) => {
                       const totalItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter)).length;
                       if (e.button === 0 && (totalItems > 1 || isBulkSelectionMode)) { // Left click and multiple items or already in bulk mode
                         longPressTriggeredRef.current = false;
                         longPressRef.current = setTimeout(() => {
                           handleLongPress(item.id);
                           longPressTriggeredRef.current = true;
                           longPressRef.current = null;
                         }, 500);
                       }
                     }}
                     onMouseUp={(e) => {
                       if (longPressRef.current) {
                         clearTimeout(longPressRef.current);
                         longPressRef.current = null;
                       }
                     }}
                     onClick={(e) => {
                       // Prevent click if long press was triggered
                       if (longPressTriggeredRef.current) {
                         e.preventDefault();
                         e.stopPropagation();
                         longPressTriggeredRef.current = false;
                         return;
                       }
                       
                       // Only handle click if we're already in selection mode AND there are multiple items
                       const totalItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter)).length;
                       if (isSelectionMode && (totalItems > 1 || isBulkSelectionMode)) {
                         e.preventDefault();
                         handleItemSelect(item.id);
                       }
                     }}
                   >
              {/* Card Image */}
              <div className="aspect-[1/1] flex items-center justify-center p-4 relative">
                {item.image ? (
                  <SafeImage 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${item.image ? 'hidden' : 'flex'}`}>
                  <div className="text-center">
                    <div className="text-2xl mb-1">📦</div>
                    <div className="text-gray-400 text-xs">No Image</div>
                  </div>
                </div>
              </div>
              
              {/* Card Details */}
              <div className="p-3 space-y-1">
                {/* Item Name - First Line */}
                <div>
                  <h3 className="text-gray-700 leading-tight line-clamp-2 font-bold text-[11px] md:text-xs">
                    {item.name}
                    {item.cardNumber && (
                      <span className="text-blue-400"> #{item.cardNumber}</span>
                    )}
                  </h3>
                </div>
                
                {/* Set Name - Ghost Text */}
                <div className="text-[11px] md:text-xs text-gray-500 truncate">
                  {item.set}
                </div>
                  
                  {/* Status Text */}
                  <div className="text-[11px] md:text-xs text-blue-400 font-medium">
                    {item.item_type === 'Single' ? (item.card_condition || 'Raw') : (item.item_type || 'Unknown')}
                  </div>
                
                {/* Spacing */}
                <div className="h-1"></div>
                
                {/* Financial Details */}
                <div className="space-y-1">
                  <div className="text-[11px] md:text-xs text-gray-700">
                    {item.originalValue > 0 ? formatPrice(item.originalValue * item.quantity) : 'No Market Data'} Value • Qty {item.quantity}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] md:text-xs text-gray-700">
                      {formatPrice(item.paid)} Paid 
                        {item.originalValue > 0 ? (
                      <span className={`ml-1 ${item.profit > 0 ? 'text-green-600' : 'text-red-400'}`}>
                        ({item.profit > 0 ? '+' : ''}{item.profitPercent.toFixed(1)}%)
                      </span>
                        ) : (
                          <span className="ml-1 text-gray-500">(No market data)</span>
                        )}
                    </div>
                    
                    {/* Menu Button / Check Icon - Bottom Right */}
                    {isSelected && isBulkSelectionMode ? (
                      <div className="text-blue-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemId(item.id);
                          setShowItemMenu(true);
                          openCollectionMenu();
                        }}
                        className="text-gray-400 hover:text-gray-900"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
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

      {/* Order Menu Modal */}
      {showOrderMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center modal-overlay">
          <div className="bg-gray-800 rounded-lg p-6 w-80 max-w-[90vw]">
            <h3 className="text-white font-medium mb-4">Order Actions</h3>
            <div className="space-y-2">
              {getRemainingCount(orders.find(o => o.id === selectedOrderId)) > 0 && (
                <button
                  onClick={() => {
                    setShowOrderMenu(false);
                    setShowMarkAsSoldModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-green-600 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Mark as Sold
                </button>
              )}
              <button 
                onClick={() => deleteOrder(selectedOrderId)}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded-md transition-colors"
              >
                Delete Order
              </button>
              <button
                onClick={() => setShowOrderMenu(false)}
                className="w-full text-left px-3 py-2 text-gray-400 hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
      </div>
          </div>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {showMarkAsSoldModal && (
        <MarkAsSoldModal
          order={orders.find(o => o.id === selectedOrderId)}
          onClose={() => {
            setShowMarkAsSoldModal(false);
            setSelectedOrderId(null);
          }}
          onSubmit={(sellData) => markOrderAsSold(selectedOrderId, sellData)}
        />
      )}

      {/* Backdrop blur overlay when expanded actions menu is active */}
      {isBulkSelectionMode && (showBulkActionsMenu || showBulkOrderBook || showBulkOverridePrice) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}


      {/* Bulk Selection Preview Bar - Fixed at bottom with expandable actions */}
      {false && isBulkSelectionMode && !showOverridePriceModal && selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out rounded-t-3xl bg-menu border-t border-menu"
        style={{ 
          bottom: '-1px',
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
              (showBulkActionsMenu || showBulkOrderBook || showBulkOverridePrice) ? 
                (showBulkOrderBook || showBulkOverridePrice ? 'max-h-[75vh]' : 'max-h-96') + ' opacity-100' : 
                'max-h-0 opacity-0'
            }`}>
              <div className={`border-t border-menu border-b border-menu bg-menu backdrop-blur-sm rounded-t-2xl ${(showBulkOrderBook || showBulkOverridePrice) ? 'border-t-2 border-t-menu' : ''}`}>
                {showBulkOrderBook ? (
                  /* Order Book Content */
                  <div className="px-6 py-4">
                    {/* Order Book Header */}
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-menu">
                        {editingOrderGroupId ? 
                          (inlineEditData[editingOrderGroupId]?.isMarkingAsSold ? 'Marking Order as Sold' : 'Editing Order') : 
                          'Viewing On Hand Orders'
                        }
                      </h2>
                      <p className="text-sm text-menu-secondary m-0">
                        {editingOrderGroupId ? 
                          (inlineEditData[editingOrderGroupId]?.isMarkingAsSold ? 'You are marking the following items as sold.' : 'You are about to change details in the order book.') : 
                          'Edit, mark as sold or delete orders all together.'
                        }
                      </p>
                    </div>

                    {/* Order Book Content */}
                    <div className="max-h-[70vh] overflow-y-auto pb-12">
                      {(() => {
                        // Get all orders for selected items
                        const selectedItemsOrders = orders.filter(order => {
                          // For custom items (item_id exists), match by item_id
                          if (order.item_id && selectedItems.has(order.item_id)) {
                            return true;
                          }
                          // For linked products, match by product table IDs
                          if (order.pokemon_card_id && selectedItems.has(order.pokemon_card_id)) {
                            return true;
                          }
                          if (order.cached_card_id && selectedItems.has(order.cached_card_id)) {
                            return true;
                          }
                          if (order.cached_sealed_product_id && selectedItems.has(order.cached_sealed_product_id)) {
                            return true;
                          }
                          // Fallback: match by item name (for backward compatibility)
                          if (order.item_name) {
                            const matchingItem = collectionData.items?.find(item => 
                              selectedItems.has(item.id) && item.name === order.item_name
                            );
                            return !!matchingItem;
                          }
                          return false;
                        });
                        
                        // Group orders by item
                        const groupedOrders = {};
                        selectedItemsOrders.forEach(order => {
                          // Create unique key based on available product references
                          const groupKey = order.item_id || 
                                          order.pokemon_card_id || 
                                          order.cached_card_id || 
                                          order.cached_sealed_product_id || 
                                          `fallback_${order.item_name}`;
                          
                          if (!groupedOrders[groupKey]) {
                            groupedOrders[groupKey] = {
                              itemId: order.item_id || order.pokemon_card_id || order.cached_card_id || order.cached_sealed_product_id,
                              itemName: order.item_name || 'Unknown Item',
                              itemImage: order.image_url || '/icons/other.png',
                              itemType: order.item_type || 'Unknown',
                              orders: []
                            };
                          }
                          groupedOrders[groupKey].orders.push(order);
                        });

                        return Object.values(groupedOrders).map((group) => (
                          <div key={group.itemId} className="mb-4">
                            {group.orders.map((order, orderIndex) => {
                              const orderGroupId = `${group.itemId}-${orderIndex}`;
                              const isEditing = editingOrderGroupId === orderGroupId;
                              const editData = inlineEditData[orderGroupId] || {};

                              return (
                                <div
                                  key={order.id}
                                  className={`bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 hover:bg-gray-800/30 transition-all duration-300 mb-3 ${editingOrderGroupId && editingOrderGroupId !== orderGroupId ? 'blur-sm opacity-50 pointer-events-none' : ''}`}
                                >
                                  {/* Full Width Header */}
                                  <div className="mb-4">
                                    {/* Item Name and Actions */}
                                    <div className="flex items-center justify-between mb-0">
                                      <h3 className="text-sm font-semibold text-white truncate">
                                        {group.itemName}
                                      </h3>
                                      <div className="flex gap-2">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={async () => {
                                                try {
                                                  if (editData.isMarkingAsSold) {
                                                    // Mark as sold functionality
                                                    const sellData = {
                                                      sellDate: editData.sell_date,
                                                      sellPrice: (editData.sell_price_cents / 100).toFixed(2),
                                                      quantity: editData.sell_quantity,
                                                      location: editData.sell_location || '',
                                                      shipping: (editData.sell_fees_cents / 100).toFixed(2),
                                                      notes: ''
                                                    };

                                                    await markOrderAsSold(order.id, sellData);
                                                  } else {
                                                    // Regular edit functionality
                                                    const updateData = {
                                                      purchase_date: editData.purchase_date || order.purchase_date,
                                                      retailer_name: editData.retailer_name || order.retailer_name,
                                                      quantity: editData.quantity !== undefined ? editData.quantity : getRemainingCount(order),
                                                      price_per_item_cents: editData.price_per_item_cents !== undefined ? editData.price_per_item_cents : order.price_per_item_cents
                                                    };

                                                    await updateOrder(supabase, order.id, updateData);
                                                  }

                                                  await Promise.all([
                                                    queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
                                                    queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary })
                                                  ]);

                                                  setEditingOrderGroupId(null);
                                                  setInlineEditData(prev => {
                                                    const newData = { ...prev };
                                                    delete newData[orderGroupId];
                                                    return newData;
                                                  });
                                                } catch (error) {
                                                  console.error('Error updating order:', error);
                                                }
                                              }}
                                              className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingOrderGroupId(null);
                                                setInlineEditData(prev => {
                                                  const newData = { ...prev };
                                                  delete newData[orderGroupId];
                                                  return newData;
                                                });
                                              }}
                                              className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditingOrderGroupId(orderGroupId);
                                                setInlineEditData(prev => ({
                                                  ...prev,
                                                  [orderGroupId]: {
                                                    purchase_date: order.purchase_date,
                                                    retailer_name: order.retailer_name,
                                                    quantity: getRemainingCount(order),
                                                    price_per_item_cents: order.price_per_item_cents,
                                                    total_cost: ((order.price_per_item_cents * getRemainingCount(order)) / 100).toFixed(2)
                                                  }
                                                }));
                                              }}
                                              className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingOrderGroupId(orderGroupId);
                                                setInlineEditData(prev => ({
                                                  ...prev,
                                                  [orderGroupId]: {
                                                    ...prev[orderGroupId],
                                                    isMarkingAsSold: true,
                                                    sell_date: new Date().toISOString().split('T')[0],
                                                    sell_price_cents: order.price_per_item_cents,
                                                    sell_quantity: Math.min(1, getRemainingCount(order)),
                                                    sell_location: '',
                                                    sell_fees_cents: 0,
                                                    sell_fee_percentage: null
                                                  }
                                                }));
                                              }}
                                              className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => {
                                                openConfirmationModal({
                                                  title: 'Delete Order',
                                                  message: `Are you sure you want to delete this order? This action cannot be undone.`,
                                                  confirmText: 'Delete',
                                                  cancelText: 'Cancel',
                                                  confirmVariant: 'danger',
                                                  onConfirm: async () => {
                                                    try {
                                                      // First, get the order details to find the item_id
                                                      const { data: orderData, error: orderError } = await supabase
                                                        .from('orders')
                                                        .select('item_id')
                                                        .eq('id', order.id)
                                                        .single();

                                                      if (orderError) throw orderError;

                                                      // Delete the order
                                                      const { error: deleteOrderError } = await supabase
                                                        .from('orders')
                                                        .delete()
                                                        .eq('id', order.id);

                                                      if (deleteOrderError) throw deleteOrderError;

                                                      // Check if there are any other orders for this item
                                                      const { data: remainingOrders, error: checkError } = await supabase
                                                        .from('orders')
                                                        .select('id')
                                                        .eq('item_id', orderData.item_id);

                                                      if (checkError) throw checkError;

                                                      // If no other orders exist for this item, delete the item too
                                                      if (remainingOrders.length === 0) {
                                                        const { error: deleteItemError } = await supabase
                                                          .from('items')
                                                          .delete()
                                                          .eq('id', orderData.item_id);

                                                        if (deleteItemError) {
                                                          console.warn('Could not delete item:', deleteItemError);
                                                        }
                                                      }

                                                      await Promise.all([
                                                        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
                                                        queryClient.invalidateQueries({ queryKey: queryKeys.collectionSummary })
                                                      ]);
                                                    } catch (error) {
                                                      console.error('Error deleting order:', error);
                                                    }
                                                  }
                                                });
                                              }}
                                              className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Item Type */}
                                    <div className="text-xs text-indigo-400 mb-3">
                                      {group.itemType}
                                    </div>

                                    {/* Border separator */}
                                    <div className="border-b border-gray-600/50 mb-3"></div>
                                  </div>

                                  {/* Content Area with Image and Order Details */}
                                  <div className="flex items-start gap-4">
                                    {/* Item Image */}
                                    <div className="flex flex-col items-center gap-2">
                                      {group.itemImage && (
                                        <img 
                                          src={group.itemImage} 
                                          alt={group.itemName}
                                          className="w-16 h-20 object-contain rounded flex-shrink-0"
                                        />
                                      )}
                                      <div className="w-16 px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded text-xs text-indigo-400 text-center" style={{ fontSize: '10px' }}>
                                        On Hand
                                      </div>
                                    </div>

                                    {/* Order Details */}
                                    <div className="flex-1 min-w-0">
                                      {/* Order Details Grid */}
                                      <div className={isEditing ? "space-y-4" : "space-y-8"}>
                                        {editData.isMarkingAsSold ? (
                                          /* Mark as Sold Fields */
                                          <>
                                            {/* Top Row: Sell Date, Sell Location */}
                                            <div className="grid grid-cols-12 gap-3">
                                              <div className="col-span-6">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Sell Date</div>
                                                <input
                                                  type="date"
                                                  value={editData.sell_date || new Date().toISOString().split('T')[0]}
                                                  onChange={(e) => {
                                                    setInlineEditData(prev => ({
                                                      ...prev,
                                                      [orderGroupId]: { ...prev[orderGroupId], sell_date: e.target.value }
                                                    }));
                                                  }}
                                                  className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                  style={{ fontSize: '12px' }}
                                                />
                                              </div>
                                              <div className="col-span-6">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Sell Location</div>
                                                <div className="relative">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsLocationDropdownClicked(prev => !prev);
                                                      setIsLocationFocused(true);
                                                    }}
                                                    className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors text-left flex items-center justify-between"
                                                    style={{ fontSize: '12px' }}
                                                  >
                                                    <div className="flex items-center gap-2 truncate">
                                                      <span className="truncate">{editData.sell_location || 'Select Marketplace'}</span>
                                                      {editData.sell_fee_percentage !== undefined && editData.sell_fee_percentage !== null && (
                                                        <span className="text-gray-400 text-xs flex-shrink-0">
                                                          ({editData.sell_fee_percentage === 0 ? '0%' : editData.sell_fee_percentage.toFixed(2) + '%'})
                                                        </span>
                                                      )}
                                                    </div>
                                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                  </button>
                                                  
                                                  {/* Marketplaces Dropdown */}
                                                  {(isLocationFocused || isLocationDropdownClicked) && (() => {
                                                    const marketplaces = [
                                                      { id: 'ebay', name: 'eBay', fee_percentage: 12.9 },
                                                      { id: 'tcgplayer', name: 'TCGPlayer', fee_percentage: 10.25 },
                                                      { id: 'cardkingdom', name: 'Card Kingdom', fee_percentage: 0 },
                                                      { id: 'starcitygames', name: 'StarCityGames', fee_percentage: 0 },
                                                      { id: 'facebook', name: 'Facebook Marketplace', fee_percentage: 0 },
                                                      { id: 'mercari', name: 'Mercari', fee_percentage: 10 },
                                                      { id: 'whatnot', name: 'Whatnot', fee_percentage: 8 },
                                                      { id: 'local', name: 'Local Sale', fee_percentage: 0 },
                                                      { id: 'other', name: 'Other', fee_percentage: 0 }
                                                    ];
                                                    
                                                    return (
                                                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-[10000] max-h-48 overflow-y-auto">
                                                        {marketplaces.map((marketplace) => (
                                                          <button
                                                            key={marketplace.id}
                                                            type="button"
                                                            onClick={() => {
                                                              const sellPrice = editData.sell_price_cents !== undefined 
                                                                ? editData.sell_price_cents / 100 
                                                                : order.price_per_item_cents / 100;
                                                              const autoFee = marketplace.fee_percentage > 0 
                                                                ? (sellPrice * marketplace.fee_percentage / 100) 
                                                                : 0;
                                                              
                                                              setInlineEditData(prev => ({
                                                                ...prev,
                                                                [orderGroupId]: { 
                                                                  ...prev[orderGroupId], 
                                                                  sell_location: marketplace.name,
                                                                  sell_fees_cents: Math.round(autoFee * 100),
                                                                  // Store the fee percentage for display
                                                                  sell_fee_percentage: marketplace.fee_percentage
                                                                }
                                                              }));
                                                              setIsLocationFocused(false);
                                                              setIsLocationDropdownClicked(false);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                                                            style={{ fontSize: '12px' }}
                                                          >
                                                            {marketplace.name} {marketplace.fee_percentage > 0 && `(${marketplace.fee_percentage}%)`}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Bottom Row: Sell Quantity, Sell Price, Fees */}
                                            <div className="grid grid-cols-12 gap-3">
                                              <div className="col-span-3">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Qty</div>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  value={editData.sell_quantity !== undefined ? editData.sell_quantity : Math.min(1, getRemainingCount(order))}
                                                  onChange={(e) => {
                                                    setInlineEditData(prev => ({
                                                      ...prev,
                                                      [orderGroupId]: { ...prev[orderGroupId], sell_quantity: parseInt(e.target.value) || 1 }
                                                    }));
                                                  }}
                                                  className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                  style={{ fontSize: '12px' }}
                                                />
                                              </div>
                                              <div className="col-span-4">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Sell Price</div>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={editData.sell_price_cents !== undefined ? (editData.sell_price_cents / 100) : (order.price_per_item_cents / 100)}
                                                  onChange={(e) => {
                                                    setInlineEditData(prev => ({
                                                      ...prev,
                                                      [orderGroupId]: { ...prev[orderGroupId], sell_price_cents: Math.round(parseFloat(e.target.value || 0) * 100) }
                                                    }));
                                                  }}
                                                  className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                  style={{ fontSize: '12px' }}
                                                />
                                              </div>
                                              <div className="col-span-5">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Shipping</div>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={editData.sell_fees_cents !== undefined ? (editData.sell_fees_cents / 100) : 0}
                                                  onChange={(e) => {
                                                    setInlineEditData(prev => ({
                                                      ...prev,
                                                      [orderGroupId]: { 
                                                        ...prev[orderGroupId], 
                                                        sell_fees_cents: Math.round(parseFloat(e.target.value || 0) * 100),
                                                        // Clear auto percentage when manually edited
                                                        sell_fee_percentage: null
                                                      }
                                                    }));
                                                  }}
                                                  placeholder="0.00"
                                                  className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                  style={{ fontSize: '12px' }}
                                                />
                                              </div>
                                            </div>
                                          </>
                                        ) : (
                                          /* Regular Edit Fields */
                                          <>
                                            {/* Top Row: Order # (non-editing only), Date, and Location */}
                                            <div className={isEditing ? "grid grid-cols-12 gap-3" : "grid grid-cols-12 gap-6"}>
                                              {/* Order # - Only show when not editing */}
                                              {!isEditing && (
                                                <div className="col-span-3">
                                                  <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Order #</div>
                                                  <div className="text-white text-left" style={{ fontSize: '12px' }}>
                                                    {order.order_number || 'N/A'}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Date */}
                                              <div className={isEditing ? "col-span-6" : "col-span-4"}>
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Date</div>
                                                {isEditing ? (
                                                  <input
                                                    type="date"
                                                    value={editData.purchase_date || order.purchase_date}
                                                    onChange={(e) => {
                                                      setInlineEditData(prev => ({
                                                        ...prev,
                                                        [orderGroupId]: { ...prev[orderGroupId], purchase_date: e.target.value }
                                                      }));
                                                    }}
                                                    className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                    style={{ fontSize: '12px' }}
                                                  />
                                                ) : (
                                                  <div className="text-white" style={{ fontSize: '12px' }}>
                                                    {new Date(order.purchase_date).toLocaleDateString()}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Location */}
                                              <div className={isEditing ? "col-span-6" : "col-span-5"}>
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Location</div>
                                                {isEditing ? (
                                                  <div className="relative">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setIsLocationDropdownClicked(prev => !prev);
                                                        setIsLocationFocused(true);
                                                      }}
                                                      className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors text-left flex items-center justify-between"
                                                      style={{ fontSize: '12px' }}
                                                    >
                                                      <span className="truncate">{editData.retailer_name || order.retailer_name || 'Select'}</span>
                                                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                      </svg>
                                                    </button>
                                                    
                                                    {/* Retailers Dropdown */}
                                                    {(isLocationFocused || isLocationDropdownClicked) && (() => {
                                                      const retailers = [
                                                        { id: 1, display_name: 'eBay', location: null },
                                                        { id: 2, display_name: 'TCGPlayer', location: null },
                                                        { id: 3, display_name: 'Amazon', location: null },
                                                        { id: 4, display_name: 'Card Kingdom', location: null },
                                                        { id: 5, display_name: 'StarCityGames', location: null },
                                                        { id: 6, display_name: 'Local Card Shop', location: null },
                                                        { id: 7, display_name: 'Facebook Marketplace', location: null },
                                                        { id: 8, display_name: 'Mercari', location: null },
                                                        { id: 9, display_name: 'Whatnot', location: null },
                                                        { id: 10, display_name: 'Other', location: null }
                                                      ];
                                                      
                                                      const filteredRetailers = isLocationDropdownClicked 
                                                        ? retailers 
                                                        : retailers.filter(retailer => 
                                                            retailer.display_name.toLowerCase().includes((editData.retailer_name || order.retailer_name || '').toLowerCase())
                                                          );
                                                      
                                                      return filteredRetailers.length > 0 ? (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-[10000] max-h-48 overflow-y-auto">
                                                          {filteredRetailers.map((retailer) => (
                                                            <button
                                                              key={retailer.id}
                                                              type="button"
                                                              onClick={() => {
                                                                setInlineEditData(prev => ({
                                                                  ...prev,
                                                                  [orderGroupId]: { ...prev[orderGroupId], retailer_name: retailer.display_name }
                                                                }));
                                                                setIsLocationFocused(false);
                                                                setIsLocationDropdownClicked(false);
                                                              }}
                                                              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                                                              style={{ fontSize: '12px' }}
                                                            >
                                                              {retailer.display_name}
                                                            </button>
                                                          ))}
                                                        </div>
                                                      ) : null;
                                                    })()}
                                                  </div>
                                                ) : (
                                                  <div className="text-white truncate" style={{ fontSize: '12px' }}>
                                                    {order.retailer_name || 'N/A'}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Bottom Row: Quantity, Price (per item), and Total Cost */}
                                            <div className={isEditing ? "grid grid-cols-12 gap-3" : "grid grid-cols-12 gap-6"}>
                                              {/* Quantity */}
                                              <div className="col-span-3">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Qty</div>
                                                {isEditing ? (
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={editData.quantity !== undefined ? editData.quantity : getRemainingCount(order)}
                                                    disabled={isPartiallySold(order)}
                                                    onChange={(e) => {
                                                      const inputValue = e.target.value;
                                                      
                                                      // Allow empty string during editing
                                                      if (inputValue === '') {
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            quantity: '',
                                                            total_cost: '0.00'
                                                          }
                                                        }));
                                                        return;
                                                      }
                                                      
                                                      const newQty = parseInt(inputValue);
                                                      if (!isNaN(newQty) && newQty >= 1) {
                                                        const pricePerItem = editData.price_per_item_cents !== undefined 
                                                          ? editData.price_per_item_cents / 100
                                                          : order.price_per_item_cents / 100;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            quantity: newQty,
                                                            total_cost: (pricePerItem * newQty).toFixed(2)
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    onBlur={(e) => {
                                                      // Ensure minimum value of 1 when losing focus
                                                      const inputValue = e.target.value;
                                                      if (inputValue === '' || parseInt(inputValue) < 1) {
                                                        const defaultQty = getRemainingCount(order);
                                                        const pricePerItem = editData.price_per_item_cents !== undefined 
                                                          ? editData.price_per_item_cents / 100
                                                          : order.price_per_item_cents / 100;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            quantity: defaultQty,
                                                            total_cost: (pricePerItem * defaultQty).toFixed(2)
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    className={`w-full h-7 px-2 border rounded text-white focus:outline-none transition-colors ${
                                                      isPartiallySold(order) 
                                                        ? 'bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed' 
                                                        : 'bg-gray-700/50 border-gray-600 focus:border-indigo-400'
                                                    }`}
                                                    style={{ fontSize: '12px' }}
                                                  />
                                                ) : (
                                                  <div className="text-white font-medium" style={{ fontSize: '12px' }}>
                                                    {getRemainingCount(order)}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Price per item */}
                                              <div className="col-span-4">
                                                <div className="text-gray-400 mb-1 whitespace-nowrap" style={{ fontSize: '12px' }}>Price/ea</div>
                                                {isEditing ? (
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editData.price_per_item_cents !== undefined ? (editData.price_per_item_cents === '' ? '' : editData.price_per_item_cents / 100) : (order.price_per_item_cents / 100)}
                                                    onChange={(e) => {
                                                      const inputValue = e.target.value;
                                                      
                                                      // Allow empty string during editing
                                                      if (inputValue === '') {
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            price_cents: '',
                                                            total_cost: ''
                                                          }
                                                        }));
                                                        return;
                                                      }
                                                      
                                                      const newPricePerItem = parseFloat(inputValue);
                                                      if (!isNaN(newPricePerItem) && newPricePerItem >= 0) {
                                                        const qty = editData.quantity !== undefined ? editData.quantity : getRemainingCount(order);
                                                        const totalCost = newPricePerItem * qty;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            price_cents: Math.round(newPricePerItem * 100),
                                                            total_cost: totalCost.toFixed(2)
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    onBlur={(e) => {
                                                      // Ensure minimum value of 0 when losing focus
                                                      const inputValue = e.target.value;
                                                      if (inputValue === '' || parseFloat(inputValue) < 0) {
                                                        const defaultPrice = order.price_per_item_cents / 100;
                                                        const qty = editData.quantity !== undefined ? editData.quantity : getRemainingCount(order);
                                                        const totalCost = defaultPrice * qty;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            price_cents: Math.round(defaultPrice * 100),
                                                            total_cost: totalCost.toFixed(2)
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                    style={{ fontSize: '12px' }}
                                                  />
                                                ) : (
                                                  <div className="text-white font-medium" style={{ fontSize: '12px' }}>
                                                    ${(order.price_per_item_cents / 100).toFixed(2)}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Total Cost */}
                                              <div className="col-span-5">
                                                <div className="text-gray-400 mb-1" style={{ fontSize: '12px' }}>Total Cost</div>
                                                {isEditing ? (
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editData.total_cost !== undefined ? editData.total_cost : ((order.price_per_item_cents * getRemainingCount(order)) / 100)}
                                                    onChange={(e) => {
                                                      const inputValue = e.target.value;
                                                      
                                                      // Allow empty string during editing
                                                      if (inputValue === '') {
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            total_cost: '',
                                                            price_cents: ''
                                                          }
                                                        }));
                                                        return;
                                                      }
                                                      
                                                      const newTotal = parseFloat(inputValue);
                                                      if (!isNaN(newTotal) && newTotal >= 0) {
                                                        const qty = editData.quantity !== undefined ? editData.quantity : getRemainingCount(order);
                                                        const pricePerItem = qty > 0 ? newTotal / qty : 0;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            total_cost: newTotal,
                                                            price_cents: Math.round(pricePerItem * 100)
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    onBlur={(e) => {
                                                      // Ensure minimum value of 0 when losing focus
                                                      const inputValue = e.target.value;
                                                      if (inputValue === '' || parseFloat(inputValue) < 0) {
                                                        const defaultTotal = (order.total_cost_cents || 0) / 100;
                                                        setInlineEditData(prev => ({
                                                          ...prev,
                                                          [orderGroupId]: { 
                                                            ...prev[orderGroupId], 
                                                            total_cost: defaultTotal,
                                                            price_cents: order.price_per_item_cents
                                                          }
                                                        }));
                                                      }
                                                    }}
                                                    className="w-full h-7 px-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:border-indigo-400 focus:outline-none transition-colors"
                                                    style={{ fontSize: '12px' }}
                                                  />
                                                ) : (
                                                  <div className="text-white font-medium" style={{ fontSize: '12px' }}>
                                                    ${((order.price_per_item_cents * getRemainingCount(order)) / 100).toFixed(2)}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : showBulkOverridePrice ? (
                  /* Override Market Price Content */
                  <div className="px-6 py-4">
                    {/* Override Price Header */}
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-white">
                        Override Market Price
                      </h2>
                      <p className="text-sm text-gray-400 m-0">
                        Set custom market values for the following items. These values are only temporary and will be replaced when the app syncs new pricing data.
                      </p>
                    </div>

                    {/* Items List */}
                    <div className="max-h-[60vh] overflow-y-auto space-y-3">
                      {(collectionData.items || [])
                        .filter(item => selectedItems.has(item.id))
                        .map((item) => {
                          const currentOverride = marketValueOverrides[item.id];
                          const originalValue = item.value || 0;

                          return (
                            <div key={item.id} className="bg-gray-800/30 border border-gray-600/50 rounded-xl p-4">
                              <div className="flex items-stretch gap-3 h-20">
                                {/* Item image */}
                                <div className="w-16 flex-shrink-0 overflow-hidden rounded-lg">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-contain rounded-lg"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fallback = e.target.nextElementSibling;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-full h-full bg-gray-700 rounded-lg flex items-center justify-center ${item.image ? 'hidden' : 'flex'}`}>
                                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                    </svg>
                                  </div>
                                </div>
                                
                                {/* Item details and override input */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <h3 className="text-xs font-medium text-white truncate">
                                    {item.name}
                                  </h3>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Original Value */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">
                                        Original
                                      </label>
                                      <div className="w-full px-2 py-1.5 bg-gray-600/30 border border-gray-500/50 rounded text-gray-400 text-xs cursor-not-allowed">
                                        ${originalValue.toFixed(2)}
                                      </div>
                                    </div>
                                    
                                    {/* Custom Override Input */}
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">
                                        Custom Value
                                      </label>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          defaultValue={currentOverride !== undefined ? currentOverride : originalValue}
                                          className="w-full pl-5 pr-2 py-1.5 bg-gray-700/50 border border-gray-600 rounded text-white text-xs focus:border-indigo-400 focus:outline-none transition-colors"
                                          placeholder="0.00"
                                          data-item-id={item.id}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Reset button for this item */}
                                  {currentOverride !== undefined && (
                                    <button
                                      onClick={() => {
                                        setMarketValueOverrides(prev => {
                                          const newOverrides = { ...prev };
                                          delete newOverrides[item.id];
                                          return newOverrides;
                                        });
                                      }}
                                      className="mt-2 px-2 py-1 bg-orange-600/20 hover:bg-orange-600/30 rounded text-orange-400 text-xs font-medium transition-colors"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                  </div>
                ) : (
                  /* Actions Menu Content */
                  <div className="px-6 py-4 space-y-3">
                    {/* View Order Book */}
                    <button 
                      className="w-full flex items-center justify-between p-4 bg-gray-800/30 border border-gray-600/50 rounded-xl hover:bg-gray-700/50 transition-colors"
                      onClick={() => {
                        setShowBulkOverridePrice(false); // Ensure override is off
                        setShowBulkOrderBook(true);
                        setShowBulkActionsMenu(false);
                      }}
                    >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">View Order Book</div>
                        <div className="text-xs text-gray-400">View and manage all orders for selected items</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Override Market Price */}
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-gray-800/30 border border-gray-600/50 rounded-xl hover:bg-gray-700/50 transition-colors"
                    onClick={() => {
                      setShowBulkOrderBook(false); // Ensure order book is off
                      setShowBulkOverridePrice(true);
                      setShowBulkActionsMenu(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">Override Market Price</div>
                        <div className="text-xs text-gray-400">Set custom market values for your view</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsed Preview - Always visible */}
            <div className="flex flex-col px-6 pt-3 pb-1">
              {/* Header with stats and actions */}
              <div className="flex items-end justify-between w-full mb-1 min-w-0 py-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium text-menu-secondary truncate" style={{ fontSize: '13px' }}>
                    {selectedItems.size} {selectedItems.size === 1 ? 'Item' : 'Items'} Selected
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {!(showBulkOrderBook || showBulkOverridePrice) && (
                    <button
                      onClick={() => {
                        const allFilteredItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter));
                        
                        if (selectedItems.size === allFilteredItems.length) {
                          // All selected, so deselect all
                          clearSelection();
                        } else {
                          // Not all selected, so select all
                          selectAll();
                        }
                      }}
                      className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded text-xs font-medium transition-colors whitespace-nowrap"
                      style={{ color: 'black' }}
                    >
                      {(() => {
                        const allFilteredItems = (collectionData.items || []).filter(item => matchesFilter(item, selectedFilter));
                        return selectedItems.size === allFilteredItems.length ? 'Deselect All' : 'Select All';
                      })()}
                    </button>
                  )}
                {(showBulkOrderBook || showBulkOverridePrice) ? (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        setShowBulkOrderBook(false);
                        setShowBulkOverridePrice(false);
                        setEditingOrderGroupId(null);
                        setInlineEditData({});
                        // Clear selection when going back from individual item menus
                        if (selectedItems.size === 1) {
                          setSelectedItems(new Set());
                          exitBulkSelectionMode(); // Exit bulk selection mode
                        }
                      }}
                      className="px-2 py-1 rounded text-xs font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
                      style={{ color: 'black' }}
                    >
                      Go Back
                    </button>
                    {showBulkOverridePrice && (
                      <button
                        onClick={() => {
                          // Collect all custom values from inputs
                          const inputs = document.querySelectorAll('input[data-item-id]');
                          const newOverrides = { ...marketValueOverrides };
                          
                          inputs.forEach(input => {
                            const itemId = input.getAttribute('data-item-id');
                            const newValue = parseFloat(input.value) || 0;
                            newOverrides[itemId] = newValue;
                          });
                          
                          setMarketValueOverrides(newOverrides);
                          
                          // Add haptic feedback
                          if (navigator.vibrate) {
                            navigator.vibrate(10);
                          }
                          
                          setShowBulkOverridePrice(false);
                          
                          // Clear selection when saving from individual item menu
                          if (selectedItems.size === 1) {
                            setSelectedItems(new Set());
                            exitBulkSelectionMode(); // Exit bulk selection mode
                          }
                          
                          // Show success notification
                          setSuccessData({
                            title: 'Market Values Updated!',
                            message: `Updated ${selectedItems.size} item(s)`
                          });
                          setShowSuccessNotification(true);
                          
                          // Auto-dismiss after 4 seconds
                          setTimeout(() => {
                            setShowSuccessNotification(false);
                          }, 4000);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700"
                        style={{ color: 'black' }}
                      >
                        Save
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                        setShowBulkActionsMenu(!showBulkActionsMenu);
                    }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 ease-out flex items-center gap-1 whitespace-nowrap ${
                        showBulkActionsMenu ? 'bg-indigo-400' : 'bg-indigo-300 hover:bg-indigo-400'
                      }`}
                      style={{ color: 'black' }}
                  >
                      Actions
                      <svg className={`w-3 h-3 flex-shrink-0 transition-transform duration-300 ease-out ${showBulkActionsMenu ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                {/* X Close Button - Only show when order book and override price are NOT active */}
                {!(showBulkOrderBook || showBulkOverridePrice) && (
                  <button
                    onClick={clearSelection}
                      className="w-6 h-6 bg-gray-300 hover:bg-gray-400 rounded text-xs font-medium transition-colors flex items-center justify-center flex-shrink-0"
                      style={{ color: 'black' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
              
              {/* Border separator */}
              <div className="border-t border-gray-700/30 mx-4 my-1" />
              
              {/* Image previews */}
              <div className="flex items-center gap-3 overflow-x-auto py-2 pr-4">
                {(collectionData.items || [])
                  .filter(item => selectedItems.has(item.id))
                  .slice(0, 6)
                  .map((item) => (
                    <div 
                      key={item.id}
                      className="relative group cursor-pointer flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemSelect(item.id);
                      }}
                    >
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-10 h-14 object-contain rounded transition-opacity group-hover:opacity-50"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
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
                      {/* Quantity badge if > 1 */}
                      {item.quantity > 1 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-normal text-center" style={{ color: 'white' }}>{item.quantity}</span>
                        </div>
                      )}
                </div>
                  ))}
                {selectedItems.size > 6 && (
                  <div className="flex-shrink-0 w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">+{selectedItems.size - 6}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Individual Item Menu Overlay - Hide when bulk actions bar is showing */}
      {showItemMenu && !isBulkSelectionMode && (
        <div 
          className="fixed inset-0 bg-menu-overlay backdrop-blur-sm flex items-end modal-overlay transition-opacity duration-200"
          onClick={handleItemMenuClose}
        >
          <div 
            className="w-full bg-menu border-t border-menu rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: isItemMenuClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out',
              transform: getItemMenuTransform(),
              transition: itemMenuDragData.isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onTouchStart={handleItemMenuTouchStart}
            onTouchMove={handleItemMenuTouchMove}
            onTouchEnd={handleItemMenuTouchEnd}
          >
            {/* iPhone-style drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-10 h-1 rounded-full transition-colors ${
                itemMenuDragData.isDragging ? 'bg-gray-500' : 'bg-gray-600'
              }`}></div>
            </div>

            {/* Header with close button */}
            <div className="px-6 py-4 border-b border-menu relative">
              <button
                onClick={handleItemMenuClose}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <svg className="w-4 h-4 text-menu-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-menu pr-12">
                Manage Collected Product
              </h2>
            </div>

            {/* Action Options */}
            <div className="px-4 pt-4 pb-8 space-y-2">
              {/* View Order Book */}
              <button 
                className="w-full flex items-center justify-between p-5 bg-gray-800/50 hover:bg-gray-700/70 active:bg-gray-600/70 rounded-2xl transition-all duration-150 touch-manipulation"
                onClick={() => {
                  // Add haptic feedback simulation
                  if (navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  
                  // Use the new integrated order book system
                  setSelectedItems(new Set([selectedItemId]));
                  enterBulkSelectionMode(); // Enter bulk selection mode
                  setShowBulkOverridePrice(false); // Ensure override is off
                  setShowBulkOrderBook(true);
                  handleItemMenuClose();
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-menu">View Order Book</div>
                    <div className="text-xs text-menu-secondary mt-0.5">View and manage all orders for this item</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Override Market Price */}
              <button 
                className="w-full flex items-center justify-between p-5 bg-purple-500/10 hover:bg-purple-500/20 active:bg-purple-500/30 rounded-2xl transition-all duration-150 touch-manipulation border border-purple-500/20"
                onClick={() => {
                  // Add haptic feedback simulation
                  if (navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  
                  // Use the new integrated override price system
                  setSelectedItems(new Set([selectedItemId]));
                  enterBulkSelectionMode(); // Enter bulk selection mode
                  setShowBulkOrderBook(false); // Ensure order book is off
                  setShowBulkOverridePrice(true);
                  handleItemMenuClose();
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-purple-400">Override Market Price</div>
                    <div className="text-xs text-menu-secondary mt-0.5">Set a custom market value for your view</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

            </div>
          </div>
        </div>
      )}


      {/* Delete Orders Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
          onClick={() => {
            setShowDeleteModal(false);
            closeModal();
          }}
        >
          <div 
            className="w-full bg-gray-900 border border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-white">Delete Orders</h2>
              <p className="text-xs text-gray-400 mt-1">
                Select which orders to delete. This action cannot be undone.
              </p>
              
              {/* Item Preview Header */}
              {ordersToDelete.length > 0 && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
                  {ordersToDelete[0].image_url && (
                    <div className="w-12 h-12 flex-shrink-0">
                      <SafeImage 
                        src={ordersToDelete[0].image_url} 
                        alt={ordersToDelete[0].item_name}
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {ordersToDelete[0].item_name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {ordersToDelete[0].set_name || ordersToDelete[0].item_set_name || "Unknown Set"}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bulk Selection Controls - Show when multiple orders exist */}
            {ordersToDelete.length > 1 && (
              <div className="px-6 py-3 border-b border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={selectAllOrders}
                      className="text-xs text-blue-400 hover:text-blue-400 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearOrderSelection}
                      className="text-xs text-gray-400 hover:text-gray-300 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedOrderIds.size} of {ordersToDelete.length} selected
                  </div>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="px-6 pb-6 max-h-80 overflow-y-auto">
              <div className="space-y-1">
                {ordersToDelete.map((order, index) => (
                  <div 
                    key={order.id} 
                    className={`bg-gray-800 border rounded-lg p-3 transition-all duration-200 ${
                      selectedOrderIds.has(order.id) 
                        ? 'border-red-500' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={(e) => {
                      if (ordersToDelete.length > 1) {
                        e.preventDefault();
                        if (!isOrderSelectionMode) {
                          setIsOrderSelectionMode(true);
                        }
                        toggleOrderSelection(order.id);
                      }
                    }}
                  >
                    {/* Date Header */}
                    <div className="pb-1 border-b border-gray-700/30 mb-2">
                      <div className="text-sm font-semibold text-white">
                        {new Date(order.purchase_date).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    {/* Compact Details Row */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400">Qty: <span className="text-white font-medium">{getRemainingCount(order)}</span></span>
                        <span className="text-gray-400">Price: <span className="text-white font-medium">{formatPrice((order.price_per_item_cents || 0) / 100)}</span></span>
                        {order.retailer_name && (
                          <span className="text-gray-400">Location: <span className="text-white font-medium">{order.retailer_name}</span></span>
                        )}
                      </div>
                      {order.notes && (
                        <div className="text-gray-400 truncate max-w-[200px]" title={order.notes}>
                          {order.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-600">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setOrdersToDelete([]);
                    setSelectedOrderIds(new Set());
                    closeModal();
                    setIsOrderSelectionMode(false);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-600 font-medium text-sm"
                >
                  Cancel
                </button>
                {selectedOrderIds.size > 0 ? (
                  <button
                    onClick={() => confirmDeleteOrders(Array.from(selectedOrderIds))}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 border border-red-500 font-medium text-sm"
                  >
                    Delete Selected ({selectedOrderIds.size})
                  </button>
                ) : (
                  <button
                    onClick={() => confirmDeleteOrders(ordersToDelete.map(order => order.id))}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 border border-red-500 font-medium text-sm"
                  >
                    Delete All ({ordersToDelete.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
          onClick={() => setShowDeleteConfirmation(false)}
        >
          <div 
            className="w-full bg-gray-900 border border-gray-700 rounded-t-2xl max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-white">Confirm Deletion</h2>
              <p className="text-xs text-gray-400 mt-1">
                Are you sure you want to delete {ordersToConfirmDelete.length} order{ordersToConfirmDelete.length > 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>

            {/* Orders to Delete Preview */}
            <div className="px-6 pb-4">
              <div className="space-y-2">
                {ordersToConfirmDelete.map((order) => (
                  <div key={order.id} className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                    <div className="text-sm font-medium text-white">
                      {new Date(order.purchase_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Qty: {getRemainingCount(order)} • Price: {formatPrice((order.price_per_item_cents || 0) / 100)}
                      {order.retailer_name && ` • Location: ${order.retailer_name}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-600">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-600 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSelectedOrders(ordersToConfirmDelete.map(order => order.id))}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 border border-red-500 font-medium text-sm"
                >
                  Delete {ordersToConfirmDelete.length} Order{ordersToConfirmDelete.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccessNotification && successData && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-indigo-500 border border-indigo-400 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {successData.title}
                </p>
                <p className="text-sm text-indigo-100">
                  {successData.message}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSuccessNotification(false);
                  setSuccessData(null);
                }}
                className="ml-3 flex-shrink-0 text-white hover:text-green-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iPhone-style Add to Collection Modal */}
      {(() => {
        const shouldRender = isModalOpen && prefilledCardData;
        return shouldRender;
      })() && (
        <AddToCollectionModal
          product={{
            name: prefilledCardData.name,
            set: prefilledCardData.set_name,
            marketValue: parseFloat(prefilledCardData.market_value || 0),
            imageUrl: prefilledCardData.image_url,
            source: 'api'
          }}
          isOpen={isModalOpen && !!prefilledCardData}
          onClose={() => {
            setPrefilledCardData(null);
            setCurrentMarketValue(null);
            setIsRawPrice(false);
            closeModal();
          }}
          onSuccess={() => {
            setPrefilledCardData(null);
            setCurrentMarketValue(null);
            setIsRawPrice(false);
            closeModal();
            // Refresh collection data
            refetchOrders();
            refetchSummary();
          }}
        />
      )}

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
      />

      </div>
    </div>
  );
};

// Mark as Sold Modal Component
const MarkAsSoldModal = ({ order, onClose, onSubmit }) => {
  const remainingQuantity = getRemainingCount(order);
  const alreadySold = getSoldCount(order);
  
  const [formData, setFormData] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    sellPrice: '',
    quantity: Math.min(1, remainingQuantity), // Default to 1 or remaining, whichever is smaller
    location: '',
    fees: 0,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center modal-overlay">
      <div className="bg-gray-800 rounded-lg p-6 w-80 max-w-[90vw]">
        <h3 className="text-white font-medium mb-4">Mark as Sold</h3>
        {alreadySold > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm">
              🟡 Partially sold: {alreadySold} of {order?.quantity} already sold
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Remaining: {remainingQuantity} available to sell
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Sell Date</label>
            <input
              type="date"
              value={formData.sellDate}
              onChange={(e) => setFormData({...formData, sellDate: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Sell Price (per item)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellPrice}
              onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Quantity to Sell (max: {remainingQuantity})
            </label>
            <input
              type="number"
              min="1"
              max={remainingQuantity}
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Fees</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData({...formData, fees: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark as Sold
            </button>
          </div>
        </form>
      </div>

      {/* Edit Price Modal */}
      {showEditPriceModal && editPriceData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end modal-overlay transition-opacity duration-200"
          onClick={() => {
            setShowEditPriceModal(false);
            setEditPriceData(null);
          }}
        >
          <div 
            className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            {/* iPhone-style drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header with close button */}
            <div className="px-6 py-4 border-b border-gray-700/50 relative">
              <button
                onClick={() => {
                  setShowEditPriceModal(false);
                  setEditPriceData(null);
                }}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white pr-12">
                Edit Price Paid
              </h2>
              <p className="text-sm text-gray-400 mt-1 pr-12">
                {editPriceData.itemName}
              </p>
            </div>

            {/* Form Content */}
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Price Paid (Total)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editPriceData.currentPrice}
                      className="w-full pl-8 pr-4 py-4 bg-gray-800/50 border border-gray-600 rounded-2xl text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="0.00"
                      id="priceInput"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  This will update the total amount you paid for all copies of this item.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-8 space-y-3">
              <button
                onClick={() => {
                  const newPrice = parseFloat(document.getElementById('priceInput').value) || 0;
                  const newPriceCents = Math.round(newPrice * 100);
                  
                  // TODO: Implement actual price update functionality
                  
                  // Add haptic feedback
                  if (navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  
                  setShowEditPriceModal(false);
                  setEditPriceData(null);
                  
                  // Show success notification
                  setSuccessData({
                    title: 'Price Updated',
                    message: `Price updated to $${newPrice.toFixed(2)}`
                  });
                  setShowSuccessNotification(true);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl text-white font-semibold transition-all duration-150 touch-manipulation"
              >
                Save Changes
              </button>
              
              <button
                onClick={() => {
                  setShowEditPriceModal(false);
                  setEditPriceData(null);
                }}
                className="w-full py-4 bg-gray-700/50 hover:bg-gray-600/70 active:bg-gray-500/70 rounded-2xl text-white font-medium transition-all duration-150 touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Graded card types and grades
const GRADED_CARD_TYPES = {
  PSA: {
    name: 'PSA',
    grades: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']
  },
  BGS: {
    name: 'BGS',
    grades: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '9.5', '10', '10']
  },
  CGC: {
    name: 'CGC',
    grades: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']
  },
  SGC: {
    name: 'SGC',
    grades: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']
  }
};

// Add Item Form Component
const AddItemForm = ({ prefilledData, onMarketValueChange, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    buyPrice: prefilledData?.market_value || '',
    pricePerItem: prefilledData?.market_value || '',
    buyDate: new Date().toISOString().split('T')[0],
    buyLocation: '',
    cardType: (prefilledData?.itemType === 'Sealed Product' || 
               prefilledData?.name?.toLowerCase().includes('box') || 
               prefilledData?.name?.toLowerCase().includes('bundle') || 
               prefilledData?.name?.toLowerCase().includes('collection') ||
               prefilledData?.name?.toLowerCase().includes('tin') || 
               prefilledData?.name?.toLowerCase().includes('pack')) ? 'sealed' : 'raw', // 'raw', 'graded', 'sealed'
    gradedCompany: '',
    gradedGrade: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [retailers, setRetailers] = useState([]);
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [gradedPriceData, setGradedPriceData] = useState(null);
  const [isLoadingGradedPrice, setIsLoadingGradedPrice] = useState(false);
  const [showCardTypeDropdown, setShowCardTypeDropdown] = useState(false);
  const [showGradingCompanyDropdown, setShowGradingCompanyDropdown] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);

  // Load retailers on component mount
  useEffect(() => {
    loadRetailers();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowCardTypeDropdown(false);
        setShowGradingCompanyDropdown(false);
        setShowGradeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch graded price when card type, company, or grade changes
  useEffect(() => {
    if (formData.cardType === 'graded' && formData.gradedCompany && formData.gradedGrade && prefilledData?.name) {
      fetchGradedPrice(prefilledData.name, formData.gradedCompany, formData.gradedGrade)
        .then(data => {
          setGradedPriceData(data);
          if (data && data.graded_market) {
            // Update price with graded value
            const gradedPrice = data.graded_market;
            setFormData(prev => ({
              ...prev,
              buyPrice: gradedPrice.toString(),
              pricePerItem: gradedPrice.toString()
            }));
            // Update header with graded price
            onMarketValueChange(gradedPrice, false);
          } else {
            // Reset to raw price if no graded price found
            const rawPrice = prefilledData?.market_value;
            setFormData(prev => ({
              ...prev,
              buyPrice: rawPrice || '',
              pricePerItem: rawPrice || ''
            }));
            // Update header with raw price and show (raw) indicator
            onMarketValueChange(rawPrice, true);
          }
        });
    } else if (formData.cardType === 'raw') {
      // Reset to raw price when switching to raw card
      setGradedPriceData(null);
      const rawPrice = prefilledData?.market_value;
      setFormData(prev => ({
        ...prev,
        buyPrice: rawPrice || '',
        pricePerItem: rawPrice || ''
      }));
      // Update header with raw price (no (raw) indicator for raw cards)
      onMarketValueChange(rawPrice, false);
    }
  }, [formData.cardType, formData.gradedCompany, formData.gradedGrade, prefilledData?.name, prefilledData?.market_value, onMarketValueChange]);

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

  const createNewRetailer = async (retailerName) => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .insert([{ display_name: retailerName }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local retailers list
      setRetailers(prev => [...prev, data].sort((a, b) => a.display_name.localeCompare(b.display_name)));
      return data;
    } catch (error) {
      console.error('Error creating retailer:', error);
      throw error;
    }
  };

  const fetchGradedPrice = async (cardName, company, grade) => {
    if (!cardName || !company || !grade) return null;
    
    setIsLoadingGradedPrice(true);
    try {
      const { data, error } = await supabase
        .from('cached_cards')
        .select('graded_market, graded_company, graded_grade, raw_market')
        .eq('name', cardName)
        .eq('graded_company', company)
        .eq('graded_grade', grade)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching graded price:', error);
      return null;
    } finally {
      setIsLoadingGradedPrice(false);
    }
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
        .eq('name', prefilledData.name)
        .single();

      if (itemError && itemError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw itemError;
      }

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        // Create new item in items table
        const itemData = {
          name: prefilledData.name,
          set_name: prefilledData.set_name || null,
          item_type: prefilledData.item_type || 'Card',
          source: prefilledData.source || 'api',
          api_id: prefilledData.api_id || null,
          api_source: 'cardmarket',
          market_value_cents: prefilledData.market_value ? Math.round(prefilledData.market_value * 100) : null,
          image_url: prefilledData.image_url || null,
          description: prefilledData.description || null
        };

        const { data: newItem, error: createItemError } = await supabase
          .from('items')
          .insert(itemData)
          .select('id')
          .single();

        if (createItemError) throw createItemError;
        itemId = newItem.id;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create order in orders table
      const orderData = {
        item_id: itemId,
        user_id: user.id,
        purchase_date: formData.buyDate,
        price_per_item_cents: Math.round((parseFloat(formData.buyPrice) / parseInt(formData.quantity)) * 100),
        quantity: parseInt(formData.quantity),
        retailer_name: formData.buyLocation || null,
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;


      onSuccess();
      
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      setError('Failed to add item to collection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Purchase Details - Optimized Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Purchase Date</label>
            <input
              type="date"
              value={formData.buyDate}
              onChange={(e) => setFormData({...formData, buyDate: e.target.value})}
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">Purchase Location</label>
            <div className="relative">
              <input
                type="text"
                value={retailerSearchQuery}
                onChange={(e) => {
                  setRetailerSearchQuery(e.target.value);
                  setFormData({...formData, buyLocation: e.target.value});
                }}
                onFocus={() => {
                  setIsRetailerFocused(true);
                  setRetailerSearchQuery(formData.buyLocation || '');
                }}
                onBlur={() => {
                  setTimeout(() => setIsRetailerFocused(false), 150);
                }}
                placeholder="Type to search retailers..."
                className="w-full px-3 py-3 pr-8 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                autoComplete="off"
              />
              {formData.buyLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, buyLocation: ''});
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
              
              {/* Retailer Dropdown */}
              {(isRetailerFocused || retailerSearchQuery !== '') && (() => {
                const filteredRetailers = retailers.filter(retailer =>
                  retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase()) &&
                  retailer.display_name !== formData.buyLocation
                );
                const exactMatch = retailers.find(retailer =>
                  retailer.display_name.toLowerCase() === retailerSearchQuery.toLowerCase()
                );
                const hasItems = filteredRetailers.length > 0 || (!exactMatch && formData.buyLocation && formData.buyLocation !== retailerSearchQuery);
                return hasItems;
              })() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredRetailers = retailers.filter(retailer =>
                          retailer.display_name.toLowerCase().includes(retailerSearchQuery.toLowerCase()) &&
                          retailer.display_name !== formData.buyLocation
                        );
                        const exactMatch = retailers.find(retailer =>
                          retailer.display_name.toLowerCase() === retailerSearchQuery.toLowerCase()
                        );

                        return (
                          <>
                            {filteredRetailers.map((retailer) => (
                              <button
                                key={retailer.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, buyLocation: retailer.display_name});
                                  setRetailerSearchQuery(retailer.display_name);
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
                            {!exactMatch && formData.buyLocation && formData.buyLocation !== retailerSearchQuery && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const newRetailer = await createNewRetailer(formData.buyLocation);
                                    setFormData({...formData, buyLocation: newRetailer.display_name});
                                    setRetailerSearchQuery(newRetailer.display_name);
                                    setIsRetailerFocused(false);
                                  } catch (error) {
                                    console.error('Failed to create retailer:', error);
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-blue-400 hover:bg-gray-700 text-sm border-t border-gray-600"
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

          <div>
            <label className="block text-gray-300 text-sm mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => {
                const newQuantity = parseInt(e.target.value) || 1;
                const newTotalPrice = formData.pricePerItem ? (parseFloat(formData.pricePerItem) * newQuantity).toFixed(2) : formData.buyPrice;
                setFormData({...formData, quantity: newQuantity, buyPrice: newTotalPrice});
              }}
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              required
            />
          </div>

          {/* Only show Card Type for non-sealed products */}
          {prefilledData?.itemType !== 'Sealed Product' && !prefilledData?.name?.toLowerCase().includes('box') && 
           !prefilledData?.name?.toLowerCase().includes('bundle') && !prefilledData?.name?.toLowerCase().includes('collection') &&
           !prefilledData?.name?.toLowerCase().includes('tin') && !prefilledData?.name?.toLowerCase().includes('pack') && (
            <div>
              <label className="block text-gray-300 text-sm mb-2">Card Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCardTypeDropdown(!showCardTypeDropdown)}
                  className="w-full h-11 bg-transparent border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>{formData.cardType === 'raw' ? 'Raw Card' : 'Graded Card'}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showCardTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, cardType: 'raw', gradedCompany: '', gradedGrade: ''});
                        setShowCardTypeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                    >
                      Raw Card
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, cardType: 'graded'});
                        setShowCardTypeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                    >
                      Graded Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.cardType === 'graded' && (
            <>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Grading Company</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGradingCompanyDropdown(!showGradingCompanyDropdown)}
                    className="w-full h-11 bg-transparent border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer flex items-center justify-between"
                    required={formData.cardType === 'graded'}
                  >
                    <span>{formData.gradedCompany || 'Select Company'}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showGradingCompanyDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({...formData, gradedCompany: '', gradedGrade: ''});
                          setShowGradingCompanyDropdown(false);
                        }}
                        className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                      >
                        Select Company
                      </button>
                      {Object.keys(GRADED_CARD_TYPES).map(company => (
                        <button
                          key={company}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, gradedCompany: company, gradedGrade: ''});
                            setShowGradingCompanyDropdown(false);
                          }}
                          className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                        >
                          {company}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Grade</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                    className={`w-full h-11 bg-transparent border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors flex items-center justify-between ${
                      !formData.gradedCompany ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                    disabled={!formData.gradedCompany}
                    required={formData.cardType === 'graded'}
                  >
                    <span>{formData.gradedGrade || 'Select Grade'}</span>
                    <svg className={`w-4 h-4 ${!formData.gradedCompany ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showGradeDropdown && formData.gradedCompany && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({...formData, gradedGrade: ''});
                          setShowGradeDropdown(false);
                        }}
                        className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                      >
                        Select Grade
                      </button>
                      {GRADED_CARD_TYPES[formData.gradedCompany]?.grades.map(grade => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, gradedGrade: grade});
                            setShowGradeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 transition-colors"
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Price (per item)</label>
            <input
              type="number"
              step="0.01"
              value={formData.pricePerItem || (formData.buyPrice && formData.quantity ? (formData.buyPrice / formData.quantity).toFixed(2) : '')}
              onChange={(e) => {
                const pricePerItem = parseFloat(e.target.value) || 0;
                const totalPrice = pricePerItem * formData.quantity;
                setFormData({...formData, pricePerItem: e.target.value, buyPrice: totalPrice.toFixed(2)});
              }}
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              placeholder="0.00"
              required
              disabled={isLoadingGradedPrice}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">Total Price</label>
            <input
              type="number"
              step="0.01"
              value={formData.buyPrice}
              onChange={(e) => {
                const totalPrice = parseFloat(e.target.value) || 0;
                const pricePerItem = formData.quantity > 0 ? (totalPrice / formData.quantity).toFixed(2) : 0;
                setFormData({...formData, buyPrice: e.target.value, pricePerItem: pricePerItem});
              }}
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              placeholder="0.00"
              required
            />
          </div>
        </div>
        </div>


      {/* Add bottom padding to prevent content from being hidden behind fixed buttons */}
      <div className="h-20"></div>

      {/* Form Actions - Optimized Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-6 z-50">
        <div className="max-w-6xl mx-auto flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 font-medium disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding to Collection...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Collection
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default Collection;
