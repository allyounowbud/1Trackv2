import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { getItemDisplayName, getItemSetName } from '../utils/nameUtils';
import { useModal } from '../contexts/ModalContext';
import { queryKeys } from '../lib/queryClient';


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
  const { openModal, closeModal } = useModal();
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
    setIsSelectionMode(true);
    handleItemSelect(itemId);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const selectAll = () => {
    const allItemIds = new Set((collectionData.items || []).map(item => item.id));
    setSelectedItems(allItemIds);
    setIsSelectionMode(true);
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

  // Fetch data
  const { data: orders = [], isLoading: ordersLoading, isFetching: ordersFetching, refetch: refetchOrders } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
  });

  const { data: collectionSummary = [], isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: queryKeys.collectionSummary,
    queryFn: getCollectionSummary,
  });

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
    

    // Count items by type - sum quantities, not order count
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

    // Debug: Log the filtered results
    console.log('🔍 Debug - Counts:', {
      ungradedCount,
      gradedCount, 
      sealedCount,
      totalOrders: orders.length
    });

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
      
      // Determine status based on item name
      let status = "Ungraded";
      if (group.name.toLowerCase().includes('graded') || group.name.toLowerCase().includes('psa') || group.name.toLowerCase().includes('bgs')) {
        status = "Graded";
      } else if (group.name.toLowerCase().includes('box') || group.name.toLowerCase().includes('bundle') || 
                 group.name.toLowerCase().includes('pack') || group.name.toLowerCase().includes('collection') ||
                 group.name.toLowerCase().includes('tin') || group.name.toLowerCase().includes('display')) {
        status = "Sealed";
      }

      // Use clean item name and add card number if available
      const cleanName = getItemDisplayName(group);
      const displayName = group.card_number ? `${cleanName} #${group.card_number}` : cleanName;
      
      return {
        id: group.orders[0]?.item_id || `item-${index}`, // Use actual item_id from database
        name: displayName, // Include card number if available
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
      items
    };
  })();

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
  
  // Debug logging
  console.log('📊 Chart Debug:', {
    chartData: chartData.slice(-3), // Last 3 data points
    maxValue,
    minValue,
    totalOrders: orders.length,
    timeRange
  });
  
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
      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">OneTrack</h1>
            {(ordersFetching || summaryFetching) && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </div>
      </div>

      {/* Collection Value Section */}
      <div className="px-4 py-3">
        <div className="text-center mb-3 pt-4">
          <div className="text-xs text-gray-300 mb-0.5">Your collection is worth</div>
          <div className="text-3xl font-bold text-indigo-500 mb-0.5">
            {formatPrice(collectionData.totalValue)}
          </div>
          <div className="text-xs text-gray-300">Total Paid • {formatPrice(collectionData.totalPaid)} <span className={collectionData.profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}>({collectionData.profitPercentage >= 0 ? '+' : ''}{collectionData.profitPercentage.toFixed(1)}%)</span></div>
        </div>

        {/* Item Status Breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-4 pt-2">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Ungraded</div>
            <div className="text-xs text-indigo-500">
              {collectionData.ungradedCount}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Graded</div>
            <div className="text-xs text-indigo-500">
              {collectionData.gradedCount}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Sealed</div>
            <div className="text-xs text-indigo-500">
              {collectionData.sealedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Collection History */}
      <div className="px-3 py-2">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-white">Collection History</div>
            {/* Share Collection */}
            <button className="flex items-center gap-1 px-2 py-1 border border-gray-600/50 rounded-lg text-xs text-white bg-gray-800/30">
              <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Share Collection</span>
            </button>
          </div>

          {/* Summary Text */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="text-gray-400">
              {currentDateRange.label} <span className="text-indigo-500">{formatPrice(collectionData.totalValue)}</span> 
              <span className="text-indigo-500 ml-1">
                ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
              </span>
            </div>
          </div>
          
                 {/* Chart */}
                 <div className="h-36 mb-2 px-3">
                   <svg width="100%" height="100%" viewBox="0 0 300 100" className="overflow-visible">
                     <defs>
                       {/* Gradient for area under line */}
                       <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                         <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
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
                             stroke="#6366f1"
                             strokeWidth="2"
                             strokeLinecap="round"
                             fill="none"
                           />
                           {/* Data point circle */}
                           <circle
                             cx={lastPoint.x}
                             cy={lastPoint.y}
                             r="3"
                             fill="#6366f1"
                             stroke="#1f2937"
                             strokeWidth="1"
                           />
                         </>
                       );
                     })()}
                   </svg>
                 </div>
          
                 {/* Date labels below chart */}
                 <div className="flex justify-between text-xs text-gray-500/60 mb-3 px-2">
                   <span>{formatDate(currentDateRange.dates[0])}</span>
                   <span>{formatDate(currentDateRange.dates[1])}</span>
                   <span>{formatDate(currentDateRange.dates[2])}</span>
                 </div>
          
                 {/* Time range buttons below chart - centered */}
                 <div className="flex justify-center gap-1 mb-3">
                   {['7D', '1M', '3M', '6M', '1Y'].map((range) => (
                     <button
                       key={range}
                       onClick={() => setTimeRange(range)}
                       className={`px-6 py-1.5 rounded-md text-xs ${
                         timeRange === range
                           ? 'bg-indigo-600 text-white'
                           : 'bg-gray-700/50 text-gray-300'
                       }`}
                     >
                       {range}
                     </button>
                   ))}
                 </div>
          
            {/* Disclaimer text - centered and smaller */}
            <div className="text-center text-xs text-gray-500/40 leading-tight px-6 py-4">
              <div>Collection history tracks the total value of your items for each day since the day they're added.</div>
            </div>
        </div>
      </div>

      {/* Collected Items */}
      <div className="px-3 py-2">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-white">Collection •</span>
                <div className="relative" ref={filterDropdownRef}>
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {selectedFilter}
                  </button>
                  
                  {/* Filter Dropdown */}
                  {showFilterDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
                      <div className="py-1">
                        {['All', 'Ungraded', 'Graded', 'Sealed'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setSelectedFilter(filter);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              selectedFilter === filter
                                ? 'bg-indigo-500/20 text-indigo-400'
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
              <div className="text-xs text-gray-400">
                {selectedFilter === 'All' 
                  ? (collectionData.items?.length || 0)
                  : (collectionData.items?.filter(item => item.status === selectedFilter).reduce((sum, item) => sum + item.quantity, 0) || 0)
                } Results
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-white">Total Value • <span className="text-indigo-500">
                {formatPrice(
                  selectedFilter === 'All' 
                    ? collectionData.totalValue 
                    : (collectionData.items || [])
                        .filter(item => item.status === selectedFilter)
                        .reduce((sum, item) => sum + (item.value * item.quantity), 0)
                )}
              </span></div>
              <div className="text-xs text-gray-400">Press + Hold To Select</div>
            </div>
          </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search your items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-3">
          <button className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-700 transition-colors">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sort By Recent
          </button>
          <button className="flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-700 transition-colors">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            All Items
          </button>
          </div>
        </div>
        </div>

        {/* Items Grid */}
      <div className="px-3 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {(collectionData.items || [])
            .filter(item => selectedFilter === 'All' || item.status === selectedFilter)
            .map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
                   <div 
                     key={item.id} 
                     className={`relative border rounded-lg overflow-hidden transition-all duration-200 ${
                       isSelected 
                         ? 'border-indigo-500 bg-indigo-900/20' 
                         : 'border-gray-700 hover:border-gray-600'
                     }`}
                     onTouchStart={(e) => {
                       longPressTriggeredRef.current = false;
                       longPressRef.current = setTimeout(() => {
                         handleLongPress(item.id);
                         longPressTriggeredRef.current = true;
                         longPressRef.current = null;
                       }, 500);
                     }}
                     onTouchEnd={(e) => {
                       if (longPressRef.current) {
                         clearTimeout(longPressRef.current);
                         longPressRef.current = null;
                       }
                     }}
                     onMouseDown={(e) => {
                       if (e.button === 0) { // Left click
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
                       
                       // Only handle click if we're already in selection mode
                       if (isSelectionMode) {
                         e.preventDefault();
                         handleItemSelect(item.id);
                       }
                     }}
                   >
              {/* Card Image */}
              <div className="aspect-[4/3] flex items-center justify-center py-2 relative">
                
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
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
              <div className="p-2 space-y-1">
                {/* Item Name - First Line */}
                <div>
                  <h3 className="text-white leading-tight line-clamp-2 font-bold" style={{fontSize: '12px'}}>
                    {item.name}
                  </h3>
                </div>
                
                {/* Set Name - Ghost Text */}
                <div className="text-xs text-gray-400 truncate" style={{fontSize: '12px'}}>
                  {item.set}
                </div>
                  
                  {/* Status Text */}
                  <div className={`text-xs italic opacity-60 ${
                    item.status === 'Ungraded' ? 'text-yellow-400' :
                    item.status === 'Graded' ? 'text-purple-400' :
                    item.status === 'Sealed' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    {item.status}
                  </div>
                
                {/* Spacing */}
                <div className="h-1"></div>
                
                {/* Financial Details */}
                <div className="space-y-0.5">
                  <div className="text-xs text-white" style={{fontSize: '12px'}}>
                      {item.value > 0 ? formatPrice(item.value * item.quantity) : 'No Market Data'} Value • Qty {item.quantity}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white" style={{fontSize: '12px'}}>
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
                          setSelectedItemId(item.id);
                          setShowItemMenu(true);
                          openModal();
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Bulk Actions Bar - Fixed at bottom */}
      {isSelectionMode && (
        <div className="fixed bottom-16 left-0 right-0 modal-overlay">
          <div className="bg-indigo-600 border-t border-indigo-500 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white font-medium">
                  {selectedItems.size}/{(collectionData.items || []).filter(item => selectedFilter === 'All' || item.status === selectedFilter).length} Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded-md text-xs text-white transition-colors"
                >
                  Select All
                </button>
                <button 
                  onClick={() => {
                    setShowBulkActionsMenu(true);
                    openModal();
                  }}
                  className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded-md text-xs text-white transition-colors flex items-center gap-1"
                >
                  Bulk Actions
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={clearSelection}
                  className="text-white hover:text-indigo-200 transition-colors"
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
            className="w-full bg-gray-950 border border-indigo-500/50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-white">
                Change {selectedItems.size} Selection{selectedItems.size !== 1 ? 's' : ''}
              </h2>
            </div>

            {/* Action Options */}
            <div className="px-3 pb-6 space-y-1">
              {/* Edit Price Paid */}
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
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
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors">
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

      {/* Individual Item Menu Overlay */}
      {showItemMenu && (
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
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-white">
                Manage Collected Product
              </h2>
            </div>

            {/* Action Options */}
            <div className="px-3 pb-6 space-y-1">
              {/* Edit Price Paid */}
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
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
                className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors">
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
                      <img 
                        src={ordersToDelete[0].image_url} 
                        alt={ordersToDelete[0].item_name}
                        className="w-full h-full object-contain rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
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
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
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
    </div>
  );
};

export default Collection;

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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Fees</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData({...formData, fees: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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