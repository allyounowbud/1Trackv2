import React, { useState, useEffect } from 'react';
import { getCleanItemName } from '../utils/nameUtils';
import translationUtils from '../utils/translationUtils.js';
const { processLocalizedCard, getLocalizedImageUrl } = translationUtils;
import { useLanguage } from '../contexts/LanguageContext';
import DesktopSideMenu from './DesktopSideMenu';
import CachedImage from './CachedImage';

const ProductPreviewModal = ({ product, isOpen, onClose, onAddToCollection }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'prices', 'details'
  const { preferredLanguage } = useLanguage();

  const formatPrice = (value) => {
    if (!value || value === 0) return 'Unavailable';
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

  // Process the card with localization
  const localizedProduct = processLocalizedCard(product, preferredLanguage);
  
  // Use localized display names
  const productName = localizedProduct?.displayName || localizedProduct?.name || 'Unknown Product';
  const productSet = localizedProduct?.displayExpansion || localizedProduct?.set_name || 'Unknown Set';
  const itemName = getCleanItemName(productName, productSet);
  
  // Get localized image URL
  const imageUrl = getLocalizedImageUrl(localizedProduct, 'large');

  // Extract comprehensive pricing data from product
  const prices = product.prices || {};
  const cardMarketPrices = prices.cardMarket || {};
  const tcgPlayerPrices = prices.tcgPlayer || {};
  const priceChartingPrices = prices.priceCharting || {};

  // Get market value from different possible sources
  let marketValue = product.marketValue || product.price || product.loose_price || product.new_price || 0;
  let priceSource = prices.source || 'unknown';
  
  // Handle Scrydex pricing structure if available
  if (product.priceData) {
    marketValue = product.priceData.market || product.priceData.low || product.priceData.price || marketValue;
    priceSource = 'scrydex';
  }
  
  // Handle variants pricing structure
  if (product.variants && Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
        const variantPrice = variant.prices[0];
        marketValue = variantPrice.market || variantPrice.low || variantPrice.price || marketValue;
        priceSource = 'scrydex-variants';
        break;
      }
    }
  }
  
  // Handle raw_prices and graded_prices arrays
  if (product.raw_prices && Array.isArray(product.raw_prices) && product.raw_prices.length > 0) {
    const rawPrice = product.raw_prices[0];
    marketValue = rawPrice.market || rawPrice.low || rawPrice.price || marketValue;
    priceSource = 'scrydex-raw';
  }
  
  if (product.graded_prices && Array.isArray(product.graded_prices) && product.graded_prices.length > 0) {
    const gradedPrice = product.graded_prices[0];
    marketValue = gradedPrice.market || gradedPrice.low || gradedPrice.price || marketValue;
    priceSource = 'scrydex-graded';
  }
  
  // Debug: Log what we actually have
  console.log('🔍 ProductPreviewModal - Product data:', {
    name: product.name,
    prices: product.prices,
    priceData: product.priceData,
    marketValue: marketValue,
    priceSource: priceSource
  });
  
  // Check if we have valid pricing data
  const hasPricing = marketValue > 0 || (product.raw_prices && product.raw_prices.length > 0);
  const hasDetailedPricing = product.raw_prices && product.raw_prices.length > 0;

  // Price change calculation
  const priceChange = product.trend || 0;
  const dollarChange = product.dollarChange || 0;
  const isPositive = priceChange > 0;

  // Check if we're on desktop
  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    return (
      <DesktopSideMenu isOpen={isOpen} onClose={onClose} title="Product Preview">
        <div className="p-6 space-y-6">
          {/* Product Image */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gray-800 rounded-xl flex items-center justify-center">
              {imageUrl ? (
                <CachedImage 
                  src={imageUrl} 
                  alt={itemName}
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-gray-400 text-4xl">📦</div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">{itemName}</h3>
            <p className="text-gray-400">{productSet}</p>
            <div className="flex items-center justify-center space-x-2">
              {marketValue > 0 ? (
                <>
                  <span className="text-2xl font-bold text-blue-400">${marketValue.toFixed(2)}</span>
                  {priceChange !== 0 && (
                    <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg text-gray-400">Price not available</span>
              )}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Quantity</label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                -
              </button>
              <span className="text-white font-medium w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Collection Button */}
          <button
            onClick={handleAddToCollection}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Add to Collection
          </button>
        </div>
      </DesktopSideMenu>
    );
  }

  // Mobile version (original modal)
  // setName is already declared above, using productSet directly

  // Generate realistic price history data
  const generatePriceHistory = (timeRange) => {
    const data = [];
    const basePrice = marketValue || 10;
    
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
      
      // Create realistic price trend with volatility
      const trend = Math.sin(i / (days / 4)) * 0.2;
      const volatility = (Math.random() - 0.5) * 0.3;
      const price = basePrice * (1 + trend + volatility);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(price, basePrice * 0.7)
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

  // Generate X-axis labels
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

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 bg-black border-b border-gray-800">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="h-full overflow-y-auto bg-black pb-20">
        {/* Product Image */}
        <div className="flex justify-center pt-6 pb-4">
          <div className="w-80 h-96 overflow-hidden">
            {imageUrl ? (
              <CachedImage
                src={imageUrl}
                alt={productName || 'Product'}
                className="w-full h-full object-contain"
              />
            ) : null}
            <div className="hidden w-full h-full items-center justify-center text-gray-400">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="px-6 pb-6">
          {/* Product Title */}
          <h1 className="text-xl font-bold text-white mb-2">
            {itemName}
          </h1>
          
          {/* Set Name and Type */}
          <div className="text-sm text-gray-400 mb-6">
            {productSet} • {product.type === 'product' ? 'Sealed Product' : (product.rarity || 'Card')}
          </div>

          {/* Current Market Price and Trend */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">
                Current Market Value
                {priceSource === 'pricecharting' && priceChartingPrices.market > 0 && (
                  <span className="ml-2 text-xs text-indigo-400">(Market Price)</span>
                )}
              </span>
              <span className="text-2xl font-bold text-white">
                {marketValue > 0 ? formatPrice(marketValue) : 'Price not available'}
              </span>
            </div>
            
            {priceChange !== 0 && (
              <div className={`flex items-center gap-2 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <svg className={`w-4 h-4 ${isPositive ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {isPositive ? '+' : ''}${Math.abs(dollarChange).toFixed(2)} ({isPositive ? '+' : ''}{priceChange.toFixed(2)}%)
                </span>
                <span className="text-gray-400">Last 7 days</span>
              </div>
            )}
            
            {priceSource && priceSource !== 'unknown' && (
              <div className="mt-2 text-xs text-gray-500">
                Data source: {priceSource}
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'prices' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Prices
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
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
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Market Value</div>
                  <div className="text-lg font-bold text-white">
                    {formatPrice(marketValue)}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">7-Day Trend</div>
                  <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange !== 0 ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : 'No change'}
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-white mb-3">Price Summary</h3>
                <div className="space-y-2">
                  {/* Show PriceCharting data first for sealed products - prioritize market price */}
                  {priceChartingPrices.market > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">PriceCharting Market</span>
                      <span className="text-white font-semibold">{formatPrice(priceChartingPrices.market)}</span>
                    </div>
                  )}
                  {priceChartingPrices.low > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">PriceCharting Low</span>
                      <span className="text-white">{formatPrice(priceChartingPrices.low)}</span>
                    </div>
                  )}
                  {priceChartingPrices.mid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">PriceCharting Mid</span>
                      <span className="text-white">{formatPrice(priceChartingPrices.mid)}</span>
                    </div>
                  )}
                  {priceChartingPrices.high > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">PriceCharting High</span>
                      <span className="text-white">{formatPrice(priceChartingPrices.high)}</span>
                    </div>
                  )}
                  {tcgPlayerPrices.market > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">TCGPlayer Market</span>
                      <span className="text-white">{formatPrice(tcgPlayerPrices.market)}</span>
                    </div>
                  )}
                  {cardMarketPrices.lowest > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Card Market Low</span>
                      <span className="text-white">{formatPrice(cardMarketPrices.lowest)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCollection}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add To Collection
                </button>
                
                <button className="w-full bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on eBay
                </button>
              </div>
            </div>
          )}

          {activeTab === 'prices' && (
            <div className="space-y-6">
              {/* TCGPlayer Prices */}
              {(tcgPlayerPrices.market > 0 || tcgPlayerPrices.mid > 0 || tcgPlayerPrices.low > 0 || tcgPlayerPrices.high > 0) && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">TCGPlayer (US Market)</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">USD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {tcgPlayerPrices.market > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Market Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(tcgPlayerPrices.market)}</div>
                      </div>
                    )}
                    {tcgPlayerPrices.mid > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Mid Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(tcgPlayerPrices.mid)}</div>
                      </div>
                    )}
                    {tcgPlayerPrices.low > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Low Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(tcgPlayerPrices.low)}</div>
                      </div>
                    )}
                    {tcgPlayerPrices.high > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">High Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(tcgPlayerPrices.high)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card Market Prices */}
              {(cardMarketPrices.lowest > 0 || cardMarketPrices.average7d > 0 || cardMarketPrices.average30d > 0 || cardMarketPrices.trend > 0) && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Card Market (EU Market)</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">USD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {cardMarketPrices.lowest > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Lowest Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(cardMarketPrices.lowest)}</div>
                      </div>
                    )}
                    {cardMarketPrices.average7d > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">7-Day Average</div>
                        <div className="text-lg font-bold text-white">{formatPrice(cardMarketPrices.average7d)}</div>
                      </div>
                    )}
                    {cardMarketPrices.average30d > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">30-Day Average</div>
                        <div className="text-lg font-bold text-white">{formatPrice(cardMarketPrices.average30d)}</div>
                      </div>
                    )}
                    {cardMarketPrices.trend > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Current Trend</div>
                        <div className="text-lg font-bold text-white">{formatPrice(cardMarketPrices.trend)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Prices */}
              {product.raw_prices && product.raw_prices.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Raw Prices</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">Ungraded</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {product.raw_prices.map((price, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">
                          {price.condition || 'Condition'} {price.grade ? `Grade ${price.grade}` : ''}
                        </div>
                        <div className="space-y-1">
                          {price.market > 0 && (
                            <div className="text-sm font-bold text-white">Market: {formatPrice(price.market)}</div>
                          )}
                          {price.low > 0 && (
                            <div className="text-xs text-gray-300">Low: {formatPrice(price.low)}</div>
                          )}
                          {price.high > 0 && (
                            <div className="text-xs text-gray-300">High: {formatPrice(price.high)}</div>
                          )}
                          {price.mid > 0 && (
                            <div className="text-xs text-gray-300">Mid: {formatPrice(price.mid)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Graded Prices */}
              {product.graded_prices && product.graded_prices.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Graded Prices</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">PSA/BGS/CGC</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {product.graded_prices.map((price, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">
                          {price.company || 'Grading Co'} {price.grade ? `Grade ${price.grade}` : ''}
                        </div>
                        <div className="space-y-1">
                          {price.market > 0 && (
                            <div className="text-sm font-bold text-white">Market: {formatPrice(price.market)}</div>
                          )}
                          {price.low > 0 && (
                            <div className="text-xs text-gray-300">Low: {formatPrice(price.low)}</div>
                          )}
                          {price.high > 0 && (
                            <div className="text-xs text-gray-300">High: {formatPrice(price.high)}</div>
                          )}
                          {price.mid > 0 && (
                            <div className="text-xs text-gray-300">Mid: {formatPrice(price.mid)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants Pricing */}
              {product.variants && product.variants.some(v => v.prices && v.prices.length > 0) && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Variants</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">Different Versions</span>
                  </div>
                  <div className="space-y-3">
                    {product.variants.filter(v => v.prices && v.prices.length > 0).map((variant, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-3">
                        <div className="text-sm font-medium text-white mb-2">{variant.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {variant.prices.map((price, priceIndex) => (
                            <div key={priceIndex} className="text-xs">
                              <div className="text-gray-400">
                                {price.condition || 'Condition'} {price.grade ? `Grade ${price.grade}` : ''}
                              </div>
                              <div className="text-white font-medium">
                                {price.market > 0 ? formatPrice(price.market) : 
                                 price.low > 0 ? formatPrice(price.low) : 
                                 price.high > 0 ? formatPrice(price.high) : 'No Price'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrydex Prices */}
              {product.priceData && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Scrydex Summary</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{product.priceData.currency || 'USD'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {product.priceData.market > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Market Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(product.priceData.market)}</div>
                      </div>
                    )}
                    {product.priceData.low > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Low Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(product.priceData.low)}</div>
                      </div>
                    )}
                    {product.priceData.mid > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Mid Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(product.priceData.mid)}</div>
                      </div>
                    )}
                    {product.priceData.high > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">High Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(product.priceData.high)}</div>
                      </div>
                    )}
                    {product.priceData.condition && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Condition</div>
                        <div className="text-lg font-bold text-white">{product.priceData.condition}</div>
                      </div>
                    )}
                    {product.priceData.grade && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Grade</div>
                        <div className="text-lg font-bold text-white">{product.priceData.grade}</div>
                      </div>
                    )}
                    {product.priceData.company && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Grading Company</div>
                        <div className="text-lg font-bold text-white">{product.priceData.company}</div>
                      </div>
                    )}
                    {product.priceData.type && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Type</div>
                        <div className="text-lg font-bold text-white">{product.priceData.type}</div>
                      </div>
                    )}
                  </div>
                  {product.priceData.trends && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Price Trends</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {product.priceData.trends.days_7 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">7 days:</span>
                            <span className={`${product.priceData.trends.days_7.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {product.priceData.trends.days_7.percent_change >= 0 ? '+' : ''}{product.priceData.trends.days_7.percent_change.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {product.priceData.trends.days_30 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">30 days:</span>
                            <span className={`${product.priceData.trends.days_30.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {product.priceData.trends.days_30.percent_change >= 0 ? '+' : ''}{product.priceData.trends.days_30.percent_change.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PriceCharting Prices (for sealed products) */}
              {(priceChartingPrices.market > 0 || priceChartingPrices.low > 0 || priceChartingPrices.mid > 0 || priceChartingPrices.high > 0) && (
                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">PriceCharting</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">USD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {priceChartingPrices.market > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Market Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(priceChartingPrices.market)}</div>
                      </div>
                    )}
                    {priceChartingPrices.low > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Low Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(priceChartingPrices.low)}</div>
                      </div>
                    )}
                    {priceChartingPrices.mid > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Mid Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(priceChartingPrices.mid)}</div>
                      </div>
                    )}
                    {priceChartingPrices.high > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">High Price</div>
                        <div className="text-lg font-bold text-white">{formatPrice(priceChartingPrices.high)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price History Chart */}
              <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Price History</h3>
                
                {/* Price Range and Current Price */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4 text-sm">
                    <span className="text-white">Min {formatPrice(minPrice)}</span>
                    <span className="text-white">Max {formatPrice(maxPrice)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white">{currentDate}</span>
                    <span className="text-indigo-400 ml-2 font-semibold">{formatPrice(currentPrice)}</span>
                  </div>
                </div>
                
                {/* Chart Container */}
                <div className="h-40 mb-4">
                  <svg width="100%" height="100%" viewBox="0 0 400 160" className="overflow-visible">
                    <defs>
                      <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Generate smooth curve points */}
                    {(() => {
                      const points = priceHistory.map((point, index) => {
                        const x = (index / (priceHistory.length - 1)) * 360 + 20;
                        const y = 140 - ((point.price - minPrice) / (maxPrice - minPrice)) * 120;
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
                            d={`${pathData} L ${points[points.length - 1].x} 160 L 20 160 Z`}
                            fill="url(#priceGradient)"
                          />
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#6366F1"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      );
                    })()}
                    
                    <circle
                      cx={(priceHistory.length - 1) / (priceHistory.length - 1) * 360 + 20}
                      cy={140 - ((currentPrice - minPrice) / (maxPrice - minPrice)) * 120}
                      r="4"
                      fill="#6366F1"
                    />
                  </svg>
                  
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-3 px-5">
                    {xAxisLabels.map((label, index) => (
                      <span key={index} className="text-xs text-gray-400">
                        {label.label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Time Range Selectors */}
                <div className="flex justify-center gap-2">
                  {['7D', '1M', '3M', '6M', '1Y'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedTimeRange(period)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        period === selectedTimeRange
                          ? 'bg-indigo-600 text-white'
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
            <div className="space-y-6">
              {/* Debug Information */}
              <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="text-gray-400">Raw Product Data:</div>
                  <pre className="text-gray-300 bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(product, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Product Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-400">Name</span>
                    <span className="text-sm text-white text-right flex-1 ml-4">{itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Set</span>
                    <span className="text-sm text-white">{productSet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Type</span>
                    <span className="text-sm text-white">{product.type === 'product' ? 'Sealed Product' : 'Individual Card'}</span>
                  </div>
                  {product.rarity && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Rarity</span>
                      <span className="text-sm text-white">{product.rarity}</span>
                    </div>
                  )}
                  {product.details && (
                    <>
                      {product.details.cardNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Card Number</span>
                          <span className="text-sm text-white">{product.details.cardNumber}</span>
                        </div>
                      )}
                      {product.details.hp && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">HP</span>
                          <span className="text-sm text-white">{product.details.hp}</span>
                        </div>
                      )}
                      {product.details.supertype && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Supertype</span>
                          <span className="text-sm text-white">{product.details.supertype}</span>
                        </div>
                      )}
                      {product.details.type && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Type</span>
                          <span className="text-sm text-white">{product.details.type}</span>
                        </div>
                      )}
                      {product.details.setCode && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Set Code</span>
                          <span className="text-sm text-white">{product.details.setCode}</span>
                        </div>
                      )}
                      {product.details.releaseDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Release Date</span>
                          <span className="text-sm text-white">{new Date(product.details.releaseDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Market Data Sources */}
              <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">Data Sources</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>TCGPlayer - US market pricing and trends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Card Market - EU market pricing and trends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>PriceCharting - Sealed product pricing</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Market data is updated regularly and may vary by condition and marketplace. Prices shown are in USD.
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