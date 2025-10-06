import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, ExternalLink, DollarSign, Package, Hash, X, TrendingUp, TrendingDown } from 'lucide-react';
import SafeImage from './SafeImage';
import databasePricingService from '../services/databasePricingService';

const CardPreviewModal = ({ card, isOpen, onClose, onAddToCollection }) => {
  const [quantity, setQuantity] = useState(1);
  const [pricingData, setPricingData] = useState(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

  // Helper function to validate URLs
  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    try {
      new URL(url);
      return true;
    } catch {
      return false;
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

  // Load pricing data from database when modal opens
  useEffect(() => {
    if (isOpen && card && card.api_id) {
      loadPricingData();
    }
  }, [isOpen, card]);

  const loadPricingData = async () => {
    if (!card?.api_id) return;
    
    setIsLoadingPricing(true);
    try {
      const pricing = await databasePricingService.getCardPricing(card.api_id);
      setPricingData(pricing);
    } catch (error) {
      console.error('Error loading pricing data:', error);
      setPricingData(null);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  if (!isOpen || !card) return null;

  const formatPrice = (value) => {
    if (!value || value === 0) return 'N/A';
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const formatTrend = (trend) => {
    if (!trend || trend === 0) return '0%';
    const isPositive = trend > 0;
    return (
      <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(trend).toFixed(1)}%
      </span>
    );
  };

  // Get trend color for card display
  const getTrendColor = (trend) => {
    if (!trend || trend === 0) return 'text-white';
    return trend > 0 ? 'text-green-400' : 'text-red-400';
  };

  const handleAddToCollection = () => {
    if (onAddToCollection) {
      onAddToCollection({
        ...card,
        quantity: quantity
      });
    }
  };

  // Use pricing data from database if available, otherwise fall back to card data
  const rawPrice = pricingData?.raw || card.raw_pricing || (card.raw_price ? {
    market: card.raw_price,
    low: card.raw_low,
    condition: card.raw_condition || 'NM'
  } : null);
  
  const gradedPrice = pricingData?.graded || card.graded_pricing || (card.graded_price ? {
    market: card.graded_price,
    low: card.graded_low,
    mid: card.graded_mid,
    high: card.graded_high,
    grade: card.graded_grade,
    company: card.graded_company
  } : null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header - Scrydex Style */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-white">
            {card.name} #{card.number}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Card Image - Large Display */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="aspect-[488/680] max-w-sm mx-auto bg-gray-700 rounded-lg overflow-hidden">
                {(card.image_url_large && isValidUrl(card.image_url_large)) || (card.image_url && isValidUrl(card.image_url)) ? (
                  <SafeImage
                    src={card.image_url_large || card.image_url}
                    alt={card.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="text-4xl mb-2">🃏</div>
                      <p>Image not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Card Details Below Image */}
              <div className="mt-4 text-center">
                <h2 className="text-xl font-bold text-white mb-2">{card.name}</h2>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300 flex-wrap">
                  {card.types?.[0] && (
                    <span className={`px-2 py-1 rounded text-white ${
                      card.types[0].toLowerCase() === 'fire' ? 'bg-red-500' :
                      card.types[0].toLowerCase() === 'water' ? 'bg-blue-500' :
                      card.types[0].toLowerCase() === 'grass' ? 'bg-green-500' :
                      card.types[0].toLowerCase() === 'lightning' ? 'bg-yellow-500' :
                      card.types[0].toLowerCase() === 'psychic' ? 'bg-purple-500' :
                      card.types[0].toLowerCase() === 'fighting' ? 'bg-orange-600' :
                      card.types[0].toLowerCase() === 'darkness' ? 'bg-gray-800' :
                      card.types[0].toLowerCase() === 'metal' ? 'bg-gray-500' :
                      card.types[0].toLowerCase() === 'fairy' ? 'bg-pink-400' :
                      card.types[0].toLowerCase() === 'dragon' ? 'bg-indigo-600' :
                      'bg-gray-400'
                    }`}>
                      {card.types[0]}
                    </span>
                  )}
                  {card.rarity && (
                    <span className="bg-yellow-600 px-2 py-1 rounded text-white">{card.rarity}</span>
                  )}
                  {card.hp && (
                    <span className="bg-red-600 px-2 py-1 rounded text-white">HP {card.hp}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Details Section */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4"># Card Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Number:</span>
                  <span className="text-white ml-2">{card.number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rarity:</span>
                  <span className="text-yellow-400 ml-2">{card.rarity || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-blue-400 ml-2">{card.types?.[0] || card.supertype || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">HP:</span>
                  <span className="text-red-400 ml-2">{card.hp || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Expansion:</span>
                  <span className="text-white ml-2">{card.expansion_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Artist:</span>
                  <span className="text-white ml-2">{card.artist || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Market Value Section */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">$ Market Value</h3>
              {isLoadingPricing ? (
                <div className="text-center py-4">
                  <div className="text-gray-400">Loading pricing data...</div>
                </div>
              ) : (rawPrice || gradedPrice) ? (
                <>
                  {rawPrice && (
                    <div className="mb-4">
                      <div className="text-green-400 text-sm mb-2">Raw Card</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Market Price:</span>
                          <span className="text-green-400 ml-2">{formatPrice(rawPrice.market)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Low Price:</span>
                          <span className="text-green-400 ml-2">{formatPrice(rawPrice.low)}</span>
                        </div>
                        {rawPrice.trends?.days_7?.percent_change && (
                          <div>
                            <span className="text-gray-400">7d Trend:</span>
                            <span className={`ml-2 ${rawPrice.trends.days_7.percent_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {rawPrice.trends.days_7.percent_change > 0 ? '+' : ''}{rawPrice.trends.days_7.percent_change.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Condition:</span>
                          <span className="text-white ml-2">{rawPrice.condition || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {gradedPrice && (
                    <div>
                      <div className="text-blue-400 text-sm mb-2">Graded Card</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Market Price:</span>
                          <span className="text-blue-400 ml-2">{formatPrice(gradedPrice.market)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Grade:</span>
                          <span className="text-blue-400 ml-2">{gradedPrice.company} {gradedPrice.grade}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Low Price:</span>
                          <span className="text-blue-400 ml-2">{formatPrice(gradedPrice.low)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">High Price:</span>
                          <span className="text-blue-400 ml-2">{formatPrice(gradedPrice.high)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-400">No pricing data available</div>
                </div>
              )}
            </div>

            {/* Add to Collection Section */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">Add to Collection</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleAddToCollection}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Add to Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default CardPreviewModal;