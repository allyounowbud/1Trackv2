import { useState, useEffect } from 'react';
import { getCleanItemName } from '../utils/nameUtils';

const ProductPreviewModal = ({ product, isOpen, onClose, onAddToCollection }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'prices', 'details'

  const formatPrice = (value) => {
    if (!value || value === 0) return 'Unavailable';
    // API returns values in dollars, so just format as currency
    return `$${value.toFixed(2)}`;
  };

  const formatPriceCents = (cents) => {
    if (!cents || cents === 0) return 'Unavailable';
    return `$${(cents / 100).toFixed(2)}`;
  };


  const handleAddToCollection = () => {
    if (onAddToCollection) {
      onAddToCollection({
        ...product,
        quantity: quantity
      });
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  // Get clean item name and set name
  const itemName = getCleanItemName(product.name, product.set);
  const setName = product.set;

  // Extract pricing data from product
  const prices = product.prices || {};
  const cardMarketPrices = prices.cardMarket || {};
  const tcgPlayerPrices = prices.tcgPlayer || {};

  // Generate price history data
  const generatePriceHistory = (timeRange) => {
    const data = [];
    const basePrice = product.marketValue ? (product.marketValue > 1000 ? product.marketValue / 100 : product.marketValue) : 10;
    
    let days;
    switch (timeRange) {
      case '7D': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '6M': days = 180; break;
      case '1Y': days = 365; break;
      default: days = 30;
    }
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      
      // Create a more realistic price trend with some volatility
      const trend = Math.sin(i / (days / 4)) * 0.3; // Long-term trend
      const volatility = (Math.random() - 0.5) * 0.4; // Short-term volatility
      const price = basePrice * (1 + trend + volatility);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(price, basePrice * 0.6) // Ensure price doesn't go too low
      });
    }
    
    return data;
  };

  const priceHistory = generatePriceHistory(selectedTimeRange);
  const minPrice = Math.min(...priceHistory.map(d => d.price));
  const maxPrice = Math.max(...priceHistory.map(d => d.price));
  const currentPrice = priceHistory[priceHistory.length - 1].price;
  const currentDate = new Date(priceHistory[priceHistory.length - 1].date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Generate X-axis labels based on time range
  const getXAxisLabels = () => {
    const labels = [];
    const totalPoints = priceHistory.length;
    const labelCount = Math.min(4, totalPoints);
    
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((i / (labelCount - 1)) * (totalPoints - 1));
      const date = new Date(priceHistory[index].date);
      const label = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      labels.push({ index, label });
    }
    return labels;
  };

  const xAxisLabels = getXAxisLabels();

  // Price change calculation
  const priceChange = product.trend || 0;
  const dollarChange = product.dollarChange || 0;
  const isPositive = priceChange > 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 bg-black border-b border-gray-800">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="h-full overflow-y-auto bg-black pb-20">
        {/* Product Image */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-72 h-80 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name || 'Product'}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="hidden w-full h-full items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="px-4 pb-6">
          {/* Product Title */}
          <h1 className="text-lg font-semibold text-white mb-1">
            {itemName}
          </h1>
          
          {/* Set Name and Type */}
          <div className="text-sm text-gray-400 mb-4">
            {setName} • {product.type === 'product' ? 'Sealed' : (product.rarity || 'Card')}
          </div>

          {/* Current Market Price and Trend */}
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current Market Value</span>
              <span className="text-lg font-bold text-white">
                {formatPrice(product.marketValue)}
              </span>
            </div>
            
            {priceChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <svg className={`w-4 h-4 ${isPositive ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>
                  {isPositive ? '+' : ''}${Math.abs(dollarChange).toFixed(2)} ({isPositive ? '+' : ''}{priceChange.toFixed(2)}%)
                </span>
                <span className="text-gray-400">Last 7 days</span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'prices' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Prices
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'details' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Details
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Market Value</div>
                  <div className="text-sm font-semibold text-white">
                    {formatPrice(product.marketValue)}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">7-Day Trend</div>
                  <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange !== 0 ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : 'No change'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCollection}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add To Collection
                </button>
                
                <button className="w-full bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on eBay
                </button>
              </div>
            </div>
          )}

          {activeTab === 'prices' && (
            <div className="space-y-4">
              {/* Market Sources */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Market Sources</h3>
                
                {/* TCGPlayer Prices */}
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">TCGPlayer</span>
                    <span className="text-xs text-gray-400">US Market</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Market</span>
                      <span className="text-white">{formatPriceCents(tcgPlayerPrices.market || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Low</span>
                      <span className="text-white">{formatPriceCents(tcgPlayerPrices.low || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Mid</span>
                      <span className="text-white">{formatPriceCents(tcgPlayerPrices.mid || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">High</span>
                      <span className="text-white">{formatPriceCents(tcgPlayerPrices.high || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Market Prices */}
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Card Market</span>
                    <span className="text-xs text-gray-400">EU Market</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Average</span>
                      <span className="text-white">{formatPriceCents(cardMarketPrices.average || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Low</span>
                      <span className="text-white">{formatPriceCents(cardMarketPrices.low || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Trend</span>
                      <span className="text-white">{formatPriceCents(cardMarketPrices.trend || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Sell</span>
                      <span className="text-white">{formatPriceCents(cardMarketPrices.sell || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Graded Prices */}
                {(tcgPlayerPrices.graded || cardMarketPrices.graded) && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">Graded Prices</span>
                      <span className="text-xs text-gray-400">PSA/BGS</span>
                    </div>
                    <div className="space-y-1">
                      {tcgPlayerPrices.graded && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">TCGPlayer Graded</span>
                          <span className="text-white">{formatPriceCents(tcgPlayerPrices.graded)}</span>
                        </div>
                      )}
                      {cardMarketPrices.graded && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Card Market Graded</span>
                          <span className="text-white">{formatPriceCents(cardMarketPrices.graded)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price History Chart */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Price History</h3>
                
                {/* Price Range and Current Price */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-3 text-xs">
                    <span className="text-white">Min {formatPrice(minPrice)}</span>
                    <span className="text-white">Max {formatPrice(maxPrice)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-white">{currentDate}</span>
                    <span className="text-teal-400 ml-1">{formatPrice(currentPrice)}</span>
                  </div>
                </div>
                
                {/* Chart Container */}
                <div className="h-32 mb-3">
                  <svg width="100%" height="100%" viewBox="0 0 400 128" className="overflow-visible">
                    <defs>
                      <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Generate smooth curve points */}
                    {(() => {
                      const points = priceHistory.map((point, index) => {
                        const x = (index / (priceHistory.length - 1)) * 360 + 20;
                        const y = 108 - ((point.price - minPrice) / (maxPrice - minPrice)) * 96;
                        return { x, y };
                      });
                      
                      let pathData = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 1; i < points.length; i++) {
                        const prev = points[i - 1];
                        const curr = points[i];
                        const next = points[i + 1];
                        
                        if (next) {
                          const cp1x = prev.x + (curr.x - prev.x) / 2;
                          const cp1y = prev.y;
                          const cp2x = curr.x - (next.x - curr.x) / 2;
                          const cp2y = curr.y;
                          pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                        } else {
                          pathData += ` L ${curr.x} ${curr.y}`;
                        }
                      }
                      
                      return (
                        <>
                          <path
                            d={`${pathData} L ${points[points.length - 1].x} 128 L 20 128 Z`}
                            fill="url(#priceGradient)"
                          />
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#14B8A6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      );
                    })()}
                    
                    <circle
                      cx={(priceHistory.length - 1) / (priceHistory.length - 1) * 360 + 20}
                      cy={108 - ((currentPrice - minPrice) / (maxPrice - minPrice)) * 96}
                      r="3"
                      fill="#14B8A6"
                    />
                  </svg>
                  
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-2 px-5">
                    {xAxisLabels.map((label, index) => (
                      <span key={index} className="text-xs text-gray-400">
                        {label.label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Time Range Selectors */}
                <div className="flex justify-center gap-1">
                  {['7D', '1M', '3M', '6M', '1Y'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedTimeRange(period)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        period === selectedTimeRange
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Product Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Product Information</h3>
                
                <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white text-right flex-1 ml-2">{itemName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Set</span>
                    <span className="text-white">{setName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white">{product.type === 'product' ? 'Sealed Product' : 'Individual Card'}</span>
                  </div>
                  {product.rarity && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Rarity</span>
                      <span className="text-white">{product.rarity}</span>
                    </div>
                  )}
                  {product.details && (
                    <>
                      {product.details.cardNumber && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Card Number</span>
                          <span className="text-white">{product.details.cardNumber}</span>
                        </div>
                      )}
                      {product.details.hp && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">HP</span>
                          <span className="text-white">{product.details.hp}</span>
                        </div>
                      )}
                      {product.details.supertype && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Supertype</span>
                          <span className="text-white">{product.details.supertype}</span>
                        </div>
                      )}
                      {product.details.type && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Type</span>
                          <span className="text-white">{product.details.type}</span>
                        </div>
                      )}
                      {product.details.setCode && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Set Code</span>
                          <span className="text-white">{product.details.setCode}</span>
                        </div>
                      )}
                      {product.details.releaseDate && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Release Date</span>
                          <span className="text-white">{new Date(product.details.releaseDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Market Data Sources */}
              <div className="bg-gray-900 rounded-lg p-3">
                <h4 className="text-sm font-medium text-white mb-2">Data Sources</h4>
                <div className="text-xs text-gray-400">
                  Market data provided by TCGPlayer and Card Market APIs. Prices are updated regularly and may vary by condition and marketplace.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;