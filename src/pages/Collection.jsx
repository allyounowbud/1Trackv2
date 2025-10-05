import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { getItemDisplayName, getItemSetName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { queryKeys } from '../lib/queryClient';
import SafeImage from '../components/SafeImage';


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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [ordersToConfirmDelete, setOrdersToConfirmDelete] = useState([]);
  const [isOrderSelectionMode, setIsOrderSelectionMode] = useState(false);

  // Refs for dropdowns and long press
  const filterDropdownRef = useRef(null);
  const longPressRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

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
    const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
    
    // If there's only 1 item, show the normal menu instead of entering selection mode
    if (totalItems === 1) {
      console.log('📱 Single item - showing normal menu instead of selection mode');
      setSelectedItemId(itemId);
      setShowItemMenu(true);
      openModal();
      return;
    }
    
    // For multiple items, enter selection mode
    console.log('✅ Multiple items - entering selection mode');
    setIsSelectionMode(true);
    handleItemSelect(itemId);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const selectAll = () => {
    const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
    
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

  // Update modal context when prefilled data changes
  useEffect(() => {
    if (prefilledCardData) {
      openModal();
    } else {
      closeModal();
    }
  }, [prefilledCardData, openModal, closeModal]);

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
  const collectionData = (() => {
    const totalValueCents = orders.reduce((sum, order) => {
      if (!order.is_sold) {
        return sum + ((order.market_value_cents || 0) * order.buy_quantity);
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
        const marketValue = (order.market_value_cents || 0) * order.buy_quantity;
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
        order.item_type !== 'Sealed Product' && 
        !order.item_type?.toLowerCase().includes('graded') &&
        !order.item_name?.toLowerCase().includes('box') &&
        !order.item_name?.toLowerCase().includes('bundle') &&
        !order.item_name?.toLowerCase().includes('collection') &&
        !order.item_name?.toLowerCase().includes('tin')
      )
      .reduce((sum, order) => sum + (order.buy_quantity || 1), 0);

    const gradedCount = orders
      .filter(order => 
        !order.is_sold && order.item_type?.toLowerCase().includes('graded')
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
      const perItemValue = group.market_value_cents || 0;
      const totalValue = perItemValue * group.quantity;
      const profit = totalValue - group.totalPaid;
      const profitPercent = group.totalPaid > 0 ? (profit / group.totalPaid) * 100 : 0;
      
      // Determine status based on item name and source
      let status = "Ungraded";
      if (group.source === 'manual') {
        status = "Custom";
      } else if (group.name.toLowerCase().includes('graded') || group.name.toLowerCase().includes('psa') || group.name.toLowerCase().includes('bgs')) {
        status = "Graded";
      } else if (group.name.toLowerCase().includes('box') || group.name.toLowerCase().includes('bundle') || 
                 group.name.toLowerCase().includes('pack') || group.name.toLowerCase().includes('collection') ||
                 group.name.toLowerCase().includes('tin') || group.name.toLowerCase().includes('display')) {
        status = "Sealed";
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

    return {
      totalValue,
      totalPaid,
      totalProfit,
      profitPercentage,
      ungradedCount,
      gradedCount,
      sealedCount,
      customCount,
      items
    };
  })();

  // Exit selection mode if there's only 1 item
  useEffect(() => {
    const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
    if (totalItems <= 1 && isSelectionMode) {
      console.log('🚫 Exiting selection mode - only 1 item available');
      setIsSelectionMode(false);
      setSelectedItems(new Set());
    }
  }, [collectionData.items, selectedFilter, isSelectionMode]);

  // Generate real chart data based on actual order history
  const generateChartData = () => {
    const days = timeRange === '7D' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365;
    const data = [];
    const today = new Date();
    
    // Group orders by date to calculate cumulative value
    const ordersByDate = {};
    orders.forEach(order => {
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
          cumulativeValue += (order.market_value_cents || 0) * order.buy_quantity;
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
          <div className="text-sm text-gray-300 mb-1 md:mb-2">Your collection is worth</div>
          <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-blue-400 mb-1 md:mb-2 tracking-tight">
            {formatPrice(collectionData.totalValue)}
          </div>
          <div className="text-sm text-gray-300">You Paid • {formatPrice(collectionData.totalPaid)} <span className={collectionData.profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}>({collectionData.profitPercentage >= 0 ? '+' : ''}{collectionData.profitPercentage.toFixed(1)}%)</span></div>
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
                {currentDateRange.label} <span className="text-blue-400">{formatPrice(collectionData.totalValue)}</span> 
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
                  : (collectionData.items?.filter(item => item.status === selectedFilter).length || 0)
                } Results
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">Total Value • <span className="text-blue-400">
                {formatPrice(
                  selectedFilter === 'All' 
                    ? collectionData.totalValue 
                    : (collectionData.items || [])
                        .filter(item => item.status === selectedFilter)
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
            .filter(item => selectedFilter === 'All' || item.status === selectedFilter)
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
                       const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
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
                       const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
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
                       const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
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
                          openModal();
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
      {(() => {
        const totalItems = (collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length;
        const shouldShow = isSelectionMode && totalItems > 1;
        console.log('🔍 Bulk bar check:', { isSelectionMode, totalItems, shouldShow });
        return shouldShow;
      })() && (
        <div className="fixed bottom-16 left-0 right-0 modal-overlay">
          <div className="bg-blue-500 border-t border-blue-400 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white font-medium">
                  {selectedItems.size}/{(collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length} Selected
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
            className="w-full bg-gray-950 border border-blue-400/50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
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
          className="fixed inset-0 bg-black/50 flex items-end modal-overlay"
          onClick={() => {
            setShowItemMenu(false);
            closeModal();
          }}
        >
          <div 
            className="w-full bg-gray-900 border border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-white">
                Manage Collected Product
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
                    <div className="text-xs text-gray-400">Change the price you paid for this product.</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Delete Product */}
              <button 
                onClick={() => handleDeleteProduct(selectedItemId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-red-400 font-medium">Delete Product</div>
                    <div className="text-xs text-gray-400">Remove this product from your collection.</div>
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
          <div className="bg-green-500 border border-green-400 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  Order Added Successfully!
                </p>
                <p className="text-sm text-green-100">
                  {successData.quantity}x {successData.item} - ${parseFloat(successData.price).toFixed(2)}
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

      {/* Full Screen Add Item Form */}
      {isModalOpen && prefilledCardData && (
        <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto">
          <div className="min-h-screen">
        {/* Header with Card Info */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3">
          {/* Condensed Card Preview */}
          <div className="flex items-center gap-4">
            {prefilledCardData.image_url && (
              <img
                src={prefilledCardData.image_url}
                alt={prefilledCardData.name}
                className="h-[75px] object-contain rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-white truncate">{prefilledCardData.name}</h2>
                <button
                  onClick={() => {
                    setPrefilledCardData(null);
                    closeModal();
                  }}
                  className="text-gray-400 hover:text-white p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-[13px] text-gray-400">
                <span>{prefilledCardData.set_name}</span>
              </div>
              <div className="text-[13px] text-gray-400">
                <span>{prefilledCardData.rarity}</span>
              </div>
              {prefilledCardData.market_value && (
                <div className="text-[13px] text-blue-400 font-medium">
                  ${prefilledCardData.market_value.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Content */}
            <div className="px-4 py-6 max-w-2xl mx-auto">

              {/* Add Item Form */}
              <AddItemForm 
                prefilledData={prefilledCardData}
                onSuccess={() => {
                  closeModal();
                  setPrefilledCardData(null);
                  // Refresh collection data
                  refetchOrders();
                  refetchSummary();
                }}
                onCancel={() => {
                  setPrefilledCardData(null);
                  closeModal();
                }}
              />
            </div>
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
    </div>
  );
};

// Add Item Form Component
const AddItemForm = ({ prefilledData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    buyPrice: prefilledData?.market_value || '',
    pricePerItem: prefilledData?.market_value || '',
    buyDate: new Date().toISOString().split('T')[0],
    buyLocation: '',
    isSold: false,
    sellDate: '',
    sellPrice: '',
    sellPricePerItem: '',
    sellLocation: '',
    sellFees: '',
    sellShipping: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [retailers, setRetailers] = useState([]);
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [isRetailerFocused, setIsRetailerFocused] = useState(false);
  const [marketplaces, setMarketplaces] = useState([]);
  const [marketplaceSearchQuery, setMarketplaceSearchQuery] = useState('');
  const [isMarketplaceFocused, setIsMarketplaceFocused] = useState(false);

  // Load retailers and marketplaces on component mount
  useEffect(() => {
    loadRetailers();
    loadMarketplaces();
  }, []);

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

  const loadMarketplaces = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplaces')
        .select('*')
        .order('display_name');
      
      if (error) throw error;
      setMarketplaces(data || []);
    } catch (error) {
      console.error('Error loading marketplaces:', error);
    }
  };

  const createNewMarketplace = async (marketplaceName) => {
    try {
      const { data, error } = await supabase
        .from('marketplaces')
        .insert([{ display_name: marketplaceName }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local marketplaces list
      setMarketplaces(prev => [...prev, data].sort((a, b) => a.display_name.localeCompare(b.display_name)));
      return data;
    } catch (error) {
      console.error('Error creating marketplace:', error);
      throw error;
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

      // Create order in orders table
      const orderData = {
        item_id: itemId,
        order_type: 'buy',
        buy_date: formData.buyDate,
        buy_price_cents: Math.round((parseFloat(formData.buyPrice) / parseInt(formData.quantity)) * 100),
        buy_quantity: parseInt(formData.quantity),
        buy_location: formData.buyLocation || null,
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      // If sold, create sale record
      if (formData.isSold) {
        const saleData = {
          item_id: itemId,
          order_type: 'sell',
          sell_date: formData.sellDate,
          sell_price_cents: Math.round(parseFloat(formData.sellPrice) * 100),
          sell_quantity: parseInt(formData.quantity),
          sell_location: formData.sellLocation || null,
          sell_notes: formData.sellNotes || null
        };

        const { error: saleError } = await supabase
          .from('orders')
          .insert(saleData);

        if (saleError) throw saleError;
      }

      console.log('✅ Item added to collection successfully');
      onSuccess();
      
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      setError('Failed to add item to collection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Purchase Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Purchase Date</label>
          <input
            type="date"
            value={formData.buyDate}
            onChange={(e) => setFormData({...formData, buyDate: e.target.value})}
            className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Item</label>
          <input
            type="text"
            value={prefilledData.name}
            disabled
            className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Purchase Location</label>
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
            className="w-full px-3 py-2 pr-8 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-600 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto">
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
          <label className="block text-gray-300 text-sm mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value) || 1;
              const newTotalPrice = formData.pricePerItem ? (parseFloat(formData.pricePerItem) * newQuantity).toFixed(2) : formData.buyPrice;
              const newSellTotalPrice = formData.sellPricePerItem ? (parseFloat(formData.sellPricePerItem) * newQuantity).toFixed(2) : formData.sellPrice;
              setFormData({...formData, quantity: newQuantity, buyPrice: newTotalPrice, sellPrice: newSellTotalPrice});
            }}
            className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Price (per item)</label>
          <input
            type="number"
            step="0.01"
            value={formData.pricePerItem || (formData.buyPrice && formData.quantity ? (formData.buyPrice / formData.quantity).toFixed(2) : '')}
            onChange={(e) => {
              const pricePerItem = parseFloat(e.target.value) || 0;
              const totalPrice = pricePerItem * formData.quantity;
              setFormData({...formData, pricePerItem: e.target.value, buyPrice: totalPrice.toFixed(2)});
            }}
            className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Total Price</label>
          <input
            type="number"
            step="0.01"
            value={formData.buyPrice}
            onChange={(e) => {
              const totalPrice = parseFloat(e.target.value) || 0;
              const pricePerItem = formData.quantity > 0 ? (totalPrice / formData.quantity).toFixed(2) : 0;
              setFormData({...formData, buyPrice: e.target.value, pricePerItem: pricePerItem});
            }}
            className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0.00"
            required
          />
        </div>
        </div>

        {/* Sold Toggle Slider */}
      <div className="py-6">
        <div className="flex items-center justify-between">
          <label className="text-gray-300 text-sm font-medium">Mark as sold</label>
          <button
            type="button"
            onClick={() => setFormData({...formData, isSold: !formData.isSold})}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              formData.isSold ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                formData.isSold ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sale Details (conditional with animation) */}
      <div className={`transition-all duration-300 ease-in-out ${
        formData.isSold ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Sale Date</label>
            <input
              type="date"
              value={formData.sellDate}
              onChange={(e) => setFormData({...formData, sellDate: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required={formData.isSold}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Price (per item)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellPricePerItem || (formData.sellPrice && formData.quantity ? (formData.sellPrice / formData.quantity).toFixed(2) : '')}
              onChange={(e) => {
                const pricePerItem = parseFloat(e.target.value) || 0;
                const totalPrice = pricePerItem * formData.quantity;
                setFormData({...formData, sellPricePerItem: e.target.value, sellPrice: totalPrice.toFixed(2)});
              }}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
              required={formData.isSold}
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Total Price</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellPrice}
              onChange={(e) => {
                const totalPrice = parseFloat(e.target.value) || 0;
                const pricePerItem = formData.quantity > 0 ? (totalPrice / formData.quantity).toFixed(2) : 0;
                setFormData({...formData, sellPrice: e.target.value, sellPricePerItem: pricePerItem});
              }}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
              required={formData.isSold}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Sell Location</label>
            <div className="relative">
              <input
                type="text"
                value={marketplaceSearchQuery}
                onChange={(e) => {
                  setMarketplaceSearchQuery(e.target.value);
                  setFormData({...formData, sellLocation: e.target.value});
                }}
                onFocus={() => {
                  setIsMarketplaceFocused(true);
                  setMarketplaceSearchQuery(formData.sellLocation || '');
                }}
                onBlur={() => {
                  setTimeout(() => setIsMarketplaceFocused(false), 150);
                }}
                placeholder="Type to search marketplaces..."
                className="w-full px-3 py-2 pr-8 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="off"
              />
              {formData.sellLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, sellLocation: ''});
                    setMarketplaceSearchQuery('');
                    setIsMarketplaceFocused(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {/* Marketplace Dropdown */}
              {(isMarketplaceFocused || marketplaceSearchQuery !== '') && (() => {
                const filteredMarketplaces = marketplaces.filter(marketplace =>
                  marketplace.display_name.toLowerCase().includes(marketplaceSearchQuery.toLowerCase()) &&
                  marketplace.display_name !== formData.sellLocation
                );
                const exactMatch = marketplaces.find(marketplace =>
                  marketplace.display_name.toLowerCase() === marketplaceSearchQuery.toLowerCase()
                );
                const hasItems = filteredMarketplaces.length > 0 || (!exactMatch && formData.sellLocation && formData.sellLocation !== marketplaceSearchQuery);
                return hasItems;
              })() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-600 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto">
                  {(() => {
                    const filteredMarketplaces = marketplaces.filter(marketplace =>
                      marketplace.display_name.toLowerCase().includes(marketplaceSearchQuery.toLowerCase()) &&
                      marketplace.display_name !== formData.sellLocation
                    );
                    const exactMatch = marketplaces.find(marketplace =>
                      marketplace.display_name.toLowerCase() === marketplaceSearchQuery.toLowerCase()
                    );

                    return (
                      <>
                        {filteredMarketplaces.map((marketplace) => (
                          <button
                            key={marketplace.id}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, sellLocation: marketplace.display_name});
                              setMarketplaceSearchQuery(marketplace.display_name);
                              setIsMarketplaceFocused(false);
                            }}
                            className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm"
                          >
                            {marketplace.display_name}
                            {marketplace.location && (
                              <span className="text-gray-400 text-xs ml-2">({marketplace.location})</span>
                            )}
                          </button>
                        ))}
                        {!exactMatch && formData.sellLocation && formData.sellLocation !== marketplaceSearchQuery && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const newMarketplace = await createNewMarketplace(formData.sellLocation);
                                setFormData({...formData, sellLocation: newMarketplace.display_name});
                                setMarketplaceSearchQuery(newMarketplace.display_name);
                                setIsMarketplaceFocused(false);
                              } catch (error) {
                                console.error('Failed to create marketplace:', error);
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-blue-400 hover:bg-gray-700 text-sm border-t border-gray-600"
                          >
                            + Add "{formData.sellLocation}" as new marketplace
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
            <label className="block text-gray-300 text-sm mb-1">Fees</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellFees || ''}
              onChange={(e) => setFormData({...formData, sellFees: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Shipping (total)</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellShipping || ''}
              onChange={(e) => setFormData({...formData, sellShipping: e.target.value})}
              className="w-full px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0.00"
            />
          </div>

        </div>
      </div>

      {/* Add bottom padding to prevent content from being hidden behind fixed buttons */}
      <div className="h-20"></div>

      {/* Form Actions - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add to Collection'}
        </button>
        </div>
      </div>
    </form>
  );
};

export default Collection;