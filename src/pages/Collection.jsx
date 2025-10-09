import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { getItemDisplayName, getItemSetName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { queryKeys } from '../lib/queryClient';
import SafeImage from '../components/SafeImage';
import AddToCollectionModal from '../components/AddToCollectionModal';


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
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
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
  const [showOrderBookModal, setShowOrderBookModal] = useState(false);
  const [orderBookData, setOrderBookData] = useState(null);
  const [selectedOrderBookIds, setSelectedOrderBookIds] = useState(new Set());
  const [isOrderBookSelectionMode, setIsOrderBookSelectionMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

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

  // Debug: Monitor override modal state changes
  useEffect(() => {
    console.log('🔍 Modal state changed:', {
      showOverridePriceModal,
      overridePriceData: overridePriceData !== null ? 'object exists' : 'null',
      shouldRender: showOverridePriceModal && overridePriceData !== null
    });
  }, [showOverridePriceModal, overridePriceData]);

  // Create a stable reference for overrides to prevent infinite re-renders
  const overridesString = JSON.stringify(marketValueOverrides);

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
    }
  };

  const handleLongPress = (itemId) => {
    const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
    
    // If there's only 1 item, show the normal menu instead of entering selection mode
    if (totalItems === 1) {
      setSelectedItemId(itemId);
      setShowItemMenu(true);
      openModal();
      return;
    }
    
    // For multiple items, enter selection mode
    setIsSelectionMode(true);
    handleItemSelect(itemId);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const selectAll = () => {
    const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
    
    // Only allow select all if there are multiple items
    if (totalItems > 1) {
      const allItemIds = new Set((collectionData.items || []).map(item => item.id));
      setSelectedItems(allItemIds);
      setIsSelectionMode(true);
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


  // Fetch data with cache-busting for PWA
  const { data: orders = [], isLoading: ordersLoading, isFetching: ordersFetching, refetch: refetchOrders } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache data
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const { data: collectionSummary = [], isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: queryKeys.collectionSummary,
    queryFn: getCollectionSummary,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache data
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // State for prefilled add item form
  const [prefilledCardData, setPrefilledCardData] = useState(null);
  const [currentMarketValue, setCurrentMarketValue] = useState(null);
  const [isRawPrice, setIsRawPrice] = useState(false);

  // Update modal context when prefilled data changes
  useEffect(() => {
    console.log('🔍 Prefilled data changed:', {
      hasPrefilledData: !!prefilledCardData,
      prefilledCardData: prefilledCardData,
      isModalOpen
    });
    if (prefilledCardData) {
      console.log('🚀 Opening modal for prefilled data...');
      openModal();
    } else {
      console.log('🔒 Closing modal (no prefilled data)');
      closeModal();
    }
  }, [prefilledCardData, openModal, closeModal, isModalOpen]);

  // Check for prefilled card data from search page
  useEffect(() => {
    console.log('📍 Navigation state:', location.state);
    // Check for navigation state first (instant)
    if (location.state?.showAddModal && location.state?.prefilledData) {
      console.log('✅ Found prefilled data in navigation state:', location.state.prefilledData);
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

  // Delete order - SIMPLE!
  const deleteOrder = async (orderId) => {
    try {
      const { error } = await supabase.rpc('delete_order_clean', {
        p_order_id: orderId
      });
      if (error) throw error;
      
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
      for (const orderId of orderIds) {
        const { error } = await supabase.rpc('delete_order_clean', {
          p_order_id: orderId
        });
        if (error) throw error;
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

  // Calculate collection statistics
  const collectionData = useMemo(() => {
    const totalValueCents = orders.reduce((sum, order) => {
      if (!order.is_sold) {
        // Check if there's a custom override for this item
        const overrideKey = `${order.item_id}`;
        const overrideValue = marketValueOverrides[overrideKey];
        const marketValue = overrideValue ? overrideValue * 100 : (order.market_value_cents || 0);
        return sum + (marketValue * order.buy_quantity);
      }
      return sum;
    }, 0);

    const totalPaidCents = orders.reduce((sum, order) => {
      return sum + (order.total_cost_cents || 0);
    }, 0);

    const totalProfitCents = orders.reduce((sum, order) => {
      if (order.is_sold) {
        // For sold items, use the actual net profit
        return sum + (order.net_profit_cents || 0);
      } else {
        // For unsold items, calculate unrealized profit (market value - cost)
        const overrideKey = `${order.item_id}`;
        const overrideValue = marketValueOverrides[overrideKey];
        const marketValueCents = overrideValue ? overrideValue * 100 : (order.market_value_cents || 0);
        const marketValue = marketValueCents * order.buy_quantity;
        const cost = order.total_cost_cents || 0;
        return sum + (marketValue - cost);
      }
    }, 0);

    // Convert cents to dollars
    const totalValue = totalValueCents / 100;
    const totalPaid = totalPaidCents / 100;
    const totalProfit = totalProfitCents / 100;
    const profitPercentage = totalPaid > 0 ? (totalProfit / totalPaid) * 100 : 0;


    
    // Debug: Log filtered orders for each category
    const ungradedOrders = orders.filter(order => 
      !order.is_sold && 
      order.item_type !== 'Sealed Product' && 
      !order.item_type?.toLowerCase().includes('graded') &&
      !order.item_name?.toLowerCase().includes('box') &&
      !order.item_name?.toLowerCase().includes('bundle') &&
      !order.item_name?.toLowerCase().includes('collection') &&
      !order.item_name?.toLowerCase().includes('tin')
    );
    const sealedOrders = orders.filter(order => 
      !order.is_sold && (
        order.item_type === 'Sealed Product' ||
        order.item_name?.toLowerCase().includes('box') ||
        order.item_name?.toLowerCase().includes('bundle') ||
        order.item_name?.toLowerCase().includes('collection') ||
        order.item_name?.toLowerCase().includes('tin')
      )
    );
    

    // Count items by type - sum quantities for top cards
    const ungradedCount = orders
      .filter(order => 
        !order.is_sold && 
        (order.card_type === 'raw' || !order.card_type) && // Raw cards or legacy orders without card_type
        order.item_type !== 'Sealed Product' && 
        !order.item_name?.toLowerCase().includes('box') &&
        !order.item_name?.toLowerCase().includes('bundle') &&
        !order.item_name?.toLowerCase().includes('collection') &&
        !order.item_name?.toLowerCase().includes('tin')
      )
      .reduce((sum, order) => sum + (order.buy_quantity || 1), 0);

    const gradedCount = orders
      .filter(order => 
        !order.is_sold && order.card_type === 'graded'
      )
      .reduce((sum, order) => sum + (order.buy_quantity || 1), 0);

    const sealedCount = orders
      .filter(order => 
        !order.is_sold && (
          order.item_type === 'Sealed Product' ||
          order.item_name?.toLowerCase().includes('box') ||
          order.item_name?.toLowerCase().includes('bundle') ||
          order.item_name?.toLowerCase().includes('collection') ||
          order.item_name?.toLowerCase().includes('tin')
        )
      )
      .reduce((sum, order) => sum + (order.buy_quantity || 1), 0);

    const customCount = orders
      .filter(order => 
        !order.is_sold && order.source === 'manual'
      )
      .reduce((sum, order) => sum + (order.buy_quantity || 1), 0);

    // Debug: Log the filtered results (removed to prevent infinite re-renders)

    // Group orders by item name for display
    const itemGroups = {};
    orders.forEach(order => {
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
      
      if (!order.is_sold) {
        itemGroups[itemName].quantity += order.buy_quantity || 1;
        itemGroups[itemName].totalPaid += (order.total_cost_cents || 0);
      }
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
      
      // Determine status based on card type and grading information
      let status = "Ungraded";
      if (group.source === 'manual') {
        status = "Custom";
      } else {
        // Check if any order for this item is sealed
        const sealedOrder = group.orders.find(order => order.card_type === 'sealed');
        if (sealedOrder) {
          status = "Sealed";
        } else {
          // Check if any order for this item is graded
          const gradedOrder = group.orders.find(order => 
            order.card_type === 'graded' && order.graded_company && order.graded_grade
          );
          
          if (gradedOrder) {
            status = `${gradedOrder.graded_company} ${gradedOrder.graded_grade}`;
          } else {
            // Check if it's a raw card (explicitly set as raw)
            const rawOrder = group.orders.find(order => order.card_type === 'raw');
            if (rawOrder) {
              status = "Ungraded";
            } else {
              // Fallback to old logic for backward compatibility
              status = "Ungraded";
            }
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
        value: perItemValue / 100, // Convert cents to dollars (per-item value)
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
          !order.is_sold && 
          (order.card_type === 'raw' || !order.card_type) &&
          order.item_type !== 'Sealed Product' && 
          !order.item_name?.toLowerCase().includes('box') &&
          !order.item_name?.toLowerCase().includes('bundle') &&
          !order.item_name?.toLowerCase().includes('collection') &&
          !order.item_name?.toLowerCase().includes('tin')
        );
      } else if (filter === 'Graded') {
        filteredOrders = orders.filter(order => 
          !order.is_sold && order.card_type === 'graded'
        );
      } else if (filter === 'Sealed') {
        filteredOrders = orders.filter(order => 
          !order.is_sold && (
            order.card_type === 'sealed' ||
            order.item_type === 'Sealed Product' ||
            order.item_name?.toLowerCase().includes('box') ||
            order.item_name?.toLowerCase().includes('bundle') ||
            order.item_name?.toLowerCase().includes('collection') ||
            order.item_name?.toLowerCase().includes('tin')
          )
        );
      } else if (filter === 'Custom') {
        filteredOrders = orders.filter(order => 
          !order.is_sold && order.source === 'manual'
        );
      }

      const filteredValueCents = filteredOrders.reduce((sum, order) => {
        return sum + ((order.market_value_cents || 0) * order.buy_quantity);
      }, 0);

      const filteredPaidCents = filteredOrders.reduce((sum, order) => {
        return sum + (order.total_cost_cents || 0);
      }, 0);

      const filteredProfitCents = filteredOrders.reduce((sum, order) => {
        if (order.is_sold) {
          return sum + (order.net_profit_cents || 0);
        } else {
          const marketValue = (order.market_value_cents || 0) * order.buy_quantity;
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
      ungradedCount,
      gradedCount,
      sealedCount,
      customCount,
      items,
      // Filtered data for display
      filteredValue: selectedFilter === 'All' ? totalValue : filteredData.value,
      filteredPaid: selectedFilter === 'All' ? totalPaid : filteredData.paid,
      filteredProfit: selectedFilter === 'All' ? totalProfit : filteredData.profit,
      filteredProfitPercentage: selectedFilter === 'All' ? profitPercentage : filteredData.profitPercentage
    };
  }, [orders, selectedFilter, overridesString]);

  // Exit selection mode if there's only 1 item
  useEffect(() => {
    const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
    if (totalItems <= 1 && isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedItems(new Set());
    }
  }, [collectionData.items, selectedFilter, isSelectionMode]);

  // Generate real chart data based on actual order history
  const generateChartData = () => {
    const days = timeRange === '7D' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365;
    const data = [];
    const today = new Date();
    
    // Filter orders based on selectedFilter
    let filteredOrders = orders;
    if (selectedFilter === 'Ungraded') {
      filteredOrders = orders.filter(order => 
        !order.is_sold && 
        (order.card_type === 'raw' || !order.card_type) &&
        order.item_type !== 'Sealed Product' && 
        !order.item_name?.toLowerCase().includes('box') &&
        !order.item_name?.toLowerCase().includes('bundle') &&
        !order.item_name?.toLowerCase().includes('collection') &&
        !order.item_name?.toLowerCase().includes('tin')
      );
    } else if (selectedFilter === 'Graded') {
      filteredOrders = orders.filter(order => 
        !order.is_sold && order.card_type === 'graded'
      );
    } else if (selectedFilter === 'Sealed') {
      filteredOrders = orders.filter(order => 
        !order.is_sold && (
          order.card_type === 'sealed' ||
          order.item_type === 'Sealed Product' ||
          order.item_name?.toLowerCase().includes('box') ||
          order.item_name?.toLowerCase().includes('bundle') ||
          order.item_name?.toLowerCase().includes('collection') ||
          order.item_name?.toLowerCase().includes('tin')
        )
      );
    } else if (selectedFilter === 'Custom') {
      filteredOrders = orders.filter(order => 
        !order.is_sold && order.source === 'manual'
      );
    }
    
    // Group filtered orders by date to calculate cumulative value
    const ordersByDate = {};
    filteredOrders.forEach(order => {
      if (!order.is_sold) {
        const orderDate = new Date(order.buy_date).toISOString().split('T')[0];
        if (!ordersByDate[orderDate]) {
          ordersByDate[orderDate] = [];
        }
        ordersByDate[orderDate].push(order);
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
          cumulativeValue += marketValue * order.buy_quantity;
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
  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  
  // Debug logging (removed to prevent infinite re-renders)
  
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading collection...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Header with OneTrack Logo */}
      <div className="md:hidden px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">OneTrack</h1>
          </div>
        </div>
      </div>

      {/* Collection Value Section */}
      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="text-center mb-3 pt-2 md:mb-6 md:pt-4">
          <div className="text-sm text-gray-300 mb-1 md:mb-2">
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
          <div className="text-sm text-gray-300">You Paid • {formatPrice(collectionData.filteredPaid)} <span className={collectionData.filteredProfitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}>({collectionData.filteredProfitPercentage >= 0 ? '+' : ''}{collectionData.filteredProfitPercentage.toFixed(1)}%)</span></div>
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
            className="text-center bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-400/50"
          >
            <div className="text-xs text-gray-400 mb-1 md:mb-2">Ungraded</div>
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
            className="text-center bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-400/50"
          >
            <div className="text-xs text-gray-400 mb-1 md:mb-2">Graded</div>
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
            className="text-center bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-400/50"
          >
            <div className="text-xs text-gray-400 mb-1 md:mb-2">Sealed</div>
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
            className="text-center bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-400/50"
          >
            <div className="text-xs text-gray-400 mb-1 md:mb-2">Custom</div>
            <div className="text-sm font-bold text-blue-400">
              {collectionData.customCount}
            </div>
          </button>
        </div>
      </div>

      {/* Collection History */}
      <div className="px-3 md:px-6 lg:px-8 pb-4 md:pb-8" style={{ paddingTop: '9px' }}>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-10 lg:p-12">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div>
              <div className="text-base md:text-2xl lg:text-3xl font-semibold text-white">My Portfolio</div>
              {/* Summary Text */}
              <div className="text-sm text-gray-400 mt-1">
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
              if (chartData.length === 0) return null;
              
              const width = 300;
              const height = 100;
              const padding = 10;
              
              // Calculate scale factors
              const valueRange = maxValue - minValue;
              const scaleY = valueRange > 0 ? (height - 2 * padding) / valueRange : 1;
              const scaleX = (width - 2 * padding) / (chartData.length - 1);
              
              // Generate path data
              const points = chartData.map((point, index) => {
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
            <div className="text-center text-sm text-gray-500/40 leading-tight px-6">
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
                  : (collectionData.items?.filter(item => {
                      if (selectedFilter === 'Graded') {
                        return item.status.includes('PSA') || item.status.includes('BGS') || 
                               item.status.includes('CGC') || item.status.includes('SGC');
                      }
                      return item.status === selectedFilter;
                    }).length || 0)
                } Results
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">Total Value • <span className="text-blue-400">
                {formatPrice(
                  selectedFilter === 'All' 
                    ? collectionData.totalValue 
                    : (collectionData.items || [])
                        .filter(item => {
                          if (selectedFilter === 'Graded') {
                            return item.status.includes('PSA') || item.status.includes('BGS') || 
                                   item.status.includes('CGC') || item.status.includes('SGC');
                          }
                          return item.status === selectedFilter;
                        })
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
              className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm md:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Items Grid */}
        <div className={`px-3 md:px-6 lg:px-8 ${isSelectionMode ? 'pb-20' : 'pb-4'}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {(collectionData.items || [])
            .filter(item => {
              if (selectedFilter === 'All') return true;
              if (selectedFilter === 'Graded') {
                // Show all graded cards (PSA, BGS, CGC, SGC)
                return item.status.includes('PSA') || item.status.includes('BGS') || 
                       item.status.includes('CGC') || item.status.includes('SGC');
              }
              return item.status === selectedFilter;
            })
            .map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
                   <div 
                     key={item.id} 
                     className={`relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-200 ${
                       isSelected && isSelectionMode && (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length > 1
                         ? 'border-indigo-400 bg-indigo-900/20 shadow-indigo-400/25' 
                         : 'hover:bg-indigo-900/30 hover:border-indigo-400 hover:shadow-indigo-400/25'
                     }`}
                     onTouchStart={(e) => {
                       const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
                       if (totalItems > 1) {
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
                       const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
                       if (e.button === 0 && totalItems > 1) { // Left click and multiple items
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
                       const totalItems = (collectionData.items || []).filter(item => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Graded') {
        return item.status.includes('PSA') || item.status.includes('BGS') || 
               item.status.includes('CGC') || item.status.includes('SGC');
      }
      return item.status === selectedFilter;
    }).length;
                       if (isSelectionMode && totalItems > 1) {
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
                <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${item.image ? 'hidden' : 'flex'}`}>
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
                  <h3 className="text-white leading-tight line-clamp-2 font-bold text-[11px] md:text-xs">
                    {item.name}
                    {item.cardNumber && (
                      <span className="text-blue-400"> #{item.cardNumber}</span>
                    )}
                  </h3>
                </div>
                
                {/* Set Name - Ghost Text */}
                <div className="text-[11px] md:text-xs text-gray-400 truncate">
                  {item.set}
                </div>
                  
                  {/* Status Text */}
                  <div className="text-[11px] md:text-xs text-blue-400 font-medium">
                    {item.status}
                  </div>
                
                {/* Spacing */}
                <div className="h-1"></div>
                
                {/* Financial Details */}
                <div className="space-y-1">
                  <div className="text-[11px] md:text-xs text-white">
                    {item.value > 0 ? formatPrice(item.value * item.quantity) : 'No Market Data'} Value • Qty {item.quantity}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] md:text-xs text-white">
                      {formatPrice(item.paid)} Paid 
                        {item.value > 0 ? (
                      <span className={`ml-1 ${item.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({item.profit > 0 ? '+' : ''}{item.profitPercent.toFixed(1)}%)
                      </span>
                        ) : (
                          <span className="ml-1 text-gray-400">(No market data)</span>
                        )}
                    </div>
                    
                    {/* Menu Button / Check Icon - Bottom Right */}
                    {isSelected && isSelectionMode && (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length > 1 ? (
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
                        }}
                        className="text-gray-400 hover:text-white"
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
              {!orders.find(o => o.id === selectedOrderId)?.is_sold && (
                <button
                  onClick={() => {
                    setShowOrderMenu(false);
                    setShowMarkAsSoldModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-green-400 hover:bg-gray-700 rounded-md transition-colors"
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

      {/* Bulk Actions Bar - Fixed at bottom - Only show if more than 1 item */}
      {isSelectionMode && (collectionData.items || []).filter(item => {
        if (selectedFilter === 'All') return true;
        if (selectedFilter === 'Graded') {
          return item.status.includes('PSA') || item.status.includes('BGS') || 
                 item.status.includes('CGC') || item.status.includes('SGC');
        }
        return item.status === selectedFilter;
      }).length > 1 && (
        <div className="fixed bottom-16 left-0 right-0 modal-overlay" style={{ zIndex: 10002 }}>
          <div className="bg-blue-500 border-t border-blue-400 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white font-medium">
                  {selectedItems.size}/{(collectionData.items || []).filter(item => {
                    if (selectedFilter === 'All') return true;
                    if (selectedFilter === 'Graded') {
                      return item.status.includes('PSA') || item.status.includes('BGS') || 
                             item.status.includes('CGC') || item.status.includes('SGC');
                    }
                    return item.status === selectedFilter;
                  }).length} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 bg-blue-400 hover:bg-blue-300 rounded-md text-xs text-white transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={() => {
                    setShowBulkActionsMenu(true);
                    openModal();
                  }}
                  className="px-3 py-1 bg-blue-400 hover:bg-blue-300 rounded-md text-xs text-white transition-colors flex items-center gap-1"
                >
                  Bulk Actions
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={clearSelection}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Menu Overlay */}
      {showBulkActionsMenu && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
          onClick={() => {
            setShowBulkActionsMenu(false);
            closeModal();
          }}
        >
          <div 
            className="w-full bg-gray-900 border border-blue-400/50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">
                Change {selectedItems.size} Selection{selectedItems.size !== 1 ? 's' : ''}
              </h2>
            </div>

            {/* Action Options */}
            <div className="pb-6">
              {/* Edit Price Paid */}
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs font-medium text-white">Edit Price Paid</div>
                    <div className="text-xs text-gray-400">Change the price you paid for these selections.</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Delete All Selected */}
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-red-400 font-medium">Delete All Selected</div>
                    <div className="text-xs text-gray-400">Remove these selections from your collection.</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Menu Overlay - Hide when bulk actions bar is showing */}
      {showItemMenu && !isSelectionMode && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end modal-overlay transition-opacity duration-200"
          onClick={() => {
            setShowItemMenu(false);
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
                  setShowItemMenu(false);
                }}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white pr-12">
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
                  
                  // Get all orders for this item
                  const itemOrders = orders.filter(order => order.item_id === selectedItemId);
                  const item = collectionData.items?.find(item => item.id === selectedItemId);
                  
                  // Debug logging
                  console.log('🔍 Order Book Debug:', {
                    selectedItemId,
                    totalOrders: orders.length,
                    filteredOrders: itemOrders.length,
                    itemFound: !!item,
                    itemName: item?.name,
                    firstFewOrders: orders.slice(0, 3).map(o => ({ id: o.id, item_id: o.item_id, item_name: o.item_name }))
                  });
                  
                  setOrderBookData({
                    itemId: selectedItemId,
                    itemName: item?.name || 'Unknown Item',
                    orders: itemOrders
                  });
                  setShowOrderBookModal(true);
                  setShowItemMenu(false);
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
                    <div className="text-sm font-semibold text-white">View Order Book</div>
                    <div className="text-xs text-gray-400 mt-0.5">View and manage all orders for this item</div>
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
                  console.log('🎯 Override Market Price clicked!');
                  // Add haptic feedback simulation
                  if (navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  // Find the item data for overriding market price
                  const item = collectionData.items?.find(item => item.id === selectedItemId);
                  console.log('🎯 Found item:', item, 'selectedItemId:', selectedItemId);
                  if (item) {
                    const overrideKey = selectedItemId;
                    const currentOverride = marketValueOverrides[overrideKey];
                    const originalValue = item.value || 0;
                    
                    const overrideData = {
                      itemId: selectedItemId,
                      itemName: item.name,
                      currentMarketValue: currentOverride ? currentOverride.toFixed(2) : originalValue.toFixed(2),
                      originalMarketValue: originalValue.toFixed(2)
                    };
                    
                    console.log('🎯 Setting override data:', overrideData);
                    setOverridePriceData(overrideData);
                    console.log('🎯 Setting showOverridePriceModal to true');
                    setShowOverridePriceModal(true);
                    
                    // Delay closing the item menu to avoid conflicts
                    setTimeout(() => {
                      console.log('🎯 Setting showItemMenu to false (delayed)');
                      setShowItemMenu(false);
                    }, 50);
                    
                    // Debug check after state updates
                    setTimeout(() => {
                      console.log('🎯 After state update - should render modal now');
                    }, 100);
                  } else {
                    console.log('🎯 ERROR: No item found for selectedItemId:', selectedItemId);
                  }
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
                    <div className="text-xs text-gray-400 mt-0.5">Set a custom market value for your view</div>
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
                        {new Date(order.buy_date).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    {/* Compact Details Row */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400">Qty: <span className="text-white font-medium">{order.buy_quantity}</span></span>
                        <span className="text-gray-400">Price: <span className="text-white font-medium">{formatPrice((order.buy_price_cents || 0) / 100)}</span></span>
                        {order.buy_location && (
                          <span className="text-gray-400">Location: <span className="text-white font-medium">{order.buy_location}</span></span>
                        )}
                      </div>
                      {order.buy_notes && (
                        <div className="text-gray-400 truncate max-w-[200px]" title={order.buy_notes}>
                          {order.buy_notes}
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
                      {new Date(order.buy_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Qty: {order.buy_quantity} • Price: {formatPrice((order.buy_price_cents || 0) / 100)}
                      {order.buy_location && ` • Location: ${order.buy_location}`}
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
        console.log('🎬 Modal render check:', { isModalOpen, hasPrefilledData: !!prefilledCardData, shouldRender });
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

      {/* Override Market Price Modal */}
      {showOverridePriceModal === true && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end transition-opacity duration-200 z-[9999]"
          onClick={() => {
            setShowOverridePriceModal(false);
            setOverridePriceData(null);
          }}
        >
          <div 
            className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header with close button */}
            <div className="px-6 py-4 border-b border-gray-700/50 relative">
              <button
                onClick={() => {
                  setShowOverridePriceModal(false);
                  setOverridePriceData(null);
                }}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-white pr-12">
                Override Market Price
              </h2>
              <p className="text-sm text-gray-400 mt-1 pr-12">
                {overridePriceData?.itemName}
              </p>
            </div>

            {/* Form content */}
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Custom Market Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={overridePriceData?.currentMarketValue}
                      className="w-full pl-8 pr-4 py-4 bg-gray-800/50 border border-gray-600 rounded-2xl text-white text-lg focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="0.00"
                      id="overridePriceInput"
                    />
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-blue-400 mb-1">Personal Override</div>
                      <div className="text-xs text-gray-300">
                        This only affects your personal view. The original market value (${overridePriceData?.originalMarketValue}) remains unchanged for other users.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-8 space-y-3">
              <button
                onClick={() => {
                  const newMarketValue = parseFloat(document.getElementById('overridePriceInput').value) || 0;
                  
                  // Save the override to state (which will trigger localStorage save)
                  setMarketValueOverrides(prev => ({
                    ...prev,
                    [overridePriceData.itemId]: newMarketValue
                  }));
                  
                  // Add haptic feedback
                  if (navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  
                  setShowOverridePriceModal(false);
                  setOverridePriceData(null);
                  
                  // Show success notification
        setSuccessData({
          title: 'Market Value Updated!',
          message: `$${overridePriceData.originalMarketValue} → $${newMarketValue.toFixed(2)}`
        });
                  setShowSuccessNotification(true);
                  
                  // Auto-dismiss after 4 seconds
                  setTimeout(() => {
                    setShowSuccessNotification(false);
                  }, 4000);
                }}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-2xl text-white font-semibold transition-all duration-150 touch-manipulation"
              >
                Set Custom Value
              </button>
              
              <button
                onClick={() => {
                  // Remove the override (reset to original value)
                  setMarketValueOverrides(prev => {
                    const newOverrides = { ...prev };
                    delete newOverrides[overridePriceData.itemId];
                    return newOverrides;
                  });
                  
                  // Add haptic feedback
                  if (navigator.vibrate) {
                    navigator.vibrate([10, 20, 10]);
                  }
                  
                  setShowOverridePriceModal(false);
                  setOverridePriceData(null);
                  
                  // Show success notification
        setSuccessData({
          title: 'Market Value Reset!',
          message: `$${overridePriceData.currentMarketValue} → $${overridePriceData.originalMarketValue}`
        });
                  setShowSuccessNotification(true);
                  
                  // Auto-dismiss after 4 seconds
                  setTimeout(() => {
                    setShowSuccessNotification(false);
                  }, 4000);
                }}
                className="w-full py-4 bg-orange-600/20 hover:bg-orange-600/30 active:bg-orange-600/40 rounded-2xl text-orange-400 font-medium transition-all duration-150 touch-manipulation border border-orange-500/20"
              >
                Reset to Original
              </button>
              
              <button
                onClick={() => {
                  setShowOverridePriceModal(false);
                  setOverridePriceData(null);
                }}
                className="w-full py-4 bg-gray-700/50 hover:bg-gray-600/70 active:bg-gray-500/70 rounded-2xl text-white font-medium transition-all duration-150 touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Book Modal */}
      {showOrderBookModal && orderBookData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end transition-opacity duration-200 z-[9999]"
          onClick={() => {
            setShowOrderBookModal(false);
            setOrderBookData(null);
            setSelectedOrderBookIds(new Set());
            setIsOrderBookSelectionMode(false);
          }}
        >
          <div 
            className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header with close button and selection mode toggle */}
            <div className="px-6 py-4 border-b border-gray-700/50 relative">
              <button
                onClick={() => {
                  setShowOrderBookModal(false);
                  setOrderBookData(null);
                  setSelectedOrderBookIds(new Set());
                  setIsOrderBookSelectionMode(false);
                }}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex items-center justify-between pr-12">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Order Book
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {orderBookData.itemName} • {orderBookData.orders.length} orders
                  </p>
                </div>
                
                {orderBookData.orders.length > 0 && (
                  <button
                    onClick={() => {
                      setIsOrderBookSelectionMode(!isOrderBookSelectionMode);
                      if (isOrderBookSelectionMode) {
                        setSelectedOrderBookIds(new Set());
                      }
                      if (navigator.vibrate) {
                        navigator.vibrate(10);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-xl text-blue-400 text-sm font-medium transition-colors"
                  >
                    {isOrderBookSelectionMode ? 'Cancel' : 'Select'}
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {isOrderBookSelectionMode && selectedOrderBookIds.size > 0 && (
              <div className="px-6 py-3 bg-blue-600/10 border-b border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 text-sm font-medium">
                    {selectedOrderBookIds.size} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // TODO: Implement bulk edit
                        if (navigator.vibrate) {
                          navigator.vibrate(10);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement bulk delete
                        if (navigator.vibrate) {
                          navigator.vibrate([10, 20, 10]);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="px-6 py-4">
              {orderBookData.orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No Orders Found</h3>
                  <p className="text-gray-500 text-sm">This item doesn't have any order history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderBookData.orders.map((order, index) => (
                    <div
                      key={order.id || index}
                      className={`p-4 rounded-2xl transition-all duration-150 ${
                        selectedOrderBookIds.has(order.id) 
                          ? 'bg-blue-600/20 border border-blue-500/30' 
                          : 'bg-gray-800/50 hover:bg-gray-700/70'
                      } ${isOrderBookSelectionMode ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isOrderBookSelectionMode) {
                          const newSelected = new Set(selectedOrderBookIds);
                          if (newSelected.has(order.id)) {
                            newSelected.delete(order.id);
                          } else {
                            newSelected.add(order.id);
                          }
                          setSelectedOrderBookIds(newSelected);
                          if (navigator.vibrate) {
                            navigator.vibrate(10);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOrderBookSelectionMode && (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedOrderBookIds.has(order.id) 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-gray-500'
                            }`}>
                              {selectedOrderBookIds.has(order.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">
                                ${order.buy_price_cents ? (order.buy_price_cents / 100).toFixed(2) : '0.00'}
                              </span>
                              <span className="text-gray-400 text-sm">
                                × {order.buy_quantity || 1}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              {order.buy_date ? new Date(order.buy_date).toLocaleDateString() : 'No date'}
                              {order.buy_location && ` • ${order.buy_location}`}
                            </div>
                          </div>
                        </div>
                        
                        {!isOrderBookSelectionMode && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement edit individual order
                                if (navigator.vibrate) {
                                  navigator.vibrate(10);
                                }
                              }}
                              className="p-2 hover:bg-gray-600/50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement delete individual order
                                if (navigator.vibrate) {
                                  navigator.vibrate([10, 20, 10]);
                                }
                              }}
                              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {!isOrderBookSelectionMode && orderBookData.orders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-700/50">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowOrderBookModal(false);
                      setOrderBookData(null);
                    }}
                    className="flex-1 py-3 bg-gray-700/50 hover:bg-gray-600/70 rounded-2xl text-white font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Mark as Sold Modal Component
const MarkAsSoldModal = ({ order, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    sellPrice: '',
    quantity: order?.buy_quantity || 1,
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
            <label className="block text-gray-300 text-sm mb-1">Quantity Sold</label>
            <input
              type="number"
              min="1"
              max={order?.buy_quantity || 1}
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
                  console.log('Update price for item:', editPriceData.itemId, 'to:', newPriceCents, 'cents');
                  
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
        order_type: 'buy',
        buy_date: formData.buyDate,
        buy_price_cents: Math.round((parseFloat(formData.buyPrice) / parseInt(formData.quantity)) * 100),
        buy_quantity: parseInt(formData.quantity),
        buy_location: formData.buyLocation || null,
        card_type: formData.cardType,
        graded_company: formData.cardType === 'graded' ? formData.gradedCompany : null,
        graded_grade: formData.cardType === 'graded' ? formData.gradedGrade : null,
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