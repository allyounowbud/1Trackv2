import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, ExternalLink, DollarSign, Package, Hash, X, TrendingUp, TrendingDown } from 'lucide-react';
import CachedImage from './CachedImage';

const CardPreviewModal = ({ card, isOpen, onClose, onAddToCollection }) => {
  const [quantity, setQuantity] = useState(1);

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

  // Handle pricing data from Scrydex API structure
  const rawPrice = card.raw_pricing || (card.raw_price ? {
    market: card.raw_price,
    low: card.raw_low,
    condition: card.raw_condition || 'NM'
  } : null);
  
  const gradedPrice = card.graded_pricing || (card.graded_price ? {
    market: card.graded_price,
    low: card.graded_low,
    mid: card.graded_mid,
    high: card.graded_high,
    grade: card.graded_grade,
    company: card.graded_company
  } : null);

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-white">{card.name}</h1>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content - Scrollable with bottom padding for nav bar */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-6">
          
          {/* Card Image - Large Display */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="aspect-[488/680] max-w-sm mx-auto bg-gray-700 rounded-lg overflow-hidden">
              {(card.image_url_large && isValidUrl(card.image_url_large)) || (card.image_url && isValidUrl(card.image_url)) ? (
                <CachedImage
                  src={card.image_url_large || card.image_url}
                  alt={card.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <Package size={48} className="mx-auto mb-2" />
                    <p>Image not available</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Card Details Below Image */}
            <div className="mt-4 text-center">
              <h2 className="text-xl font-bold text-white mb-2">{card.name}</h2>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-300 flex-wrap">
                <span className="bg-blue-600 px-2 py-1 rounded">{card.types?.[0] || card.supertype || 'N/A'}</span>
                <span className="bg-yellow-600 px-2 py-1 rounded">{card.rarity || 'N/A'}</span>
                {card.hp && <span className="bg-red-600 px-2 py-1 rounded">HP {card.hp}</span>}
              </div>
            </div>
          </div>

          {/* Quick Info Section */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Hash size={20} />
              Card Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Number:</span>
                <span className="text-white">{card.number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rarity:</span>
                <span className="text-yellow-400">{card.rarity || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-blue-400">{card.types?.join(', ') || card.supertype || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">HP:</span>
                <span className="text-red-400">{card.hp || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expansion:</span>
                <span className="text-white">{card.expansion_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Artist:</span>
                <span className="text-white">{card.artist || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          {(rawPrice || gradedPrice) && (
            <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 border border-green-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} />
                Market Value
              </h3>
              
              {rawPrice && (
                <div className="mb-4">
                  <h4 className="text-green-400 font-medium mb-3">Raw Card</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Market Price (7d trend):</span>
                      <div className="text-green-400 font-semibold text-lg">{formatPrice(rawPrice.market)}</div>
                      <div className="mt-1">
                        {rawPrice.trends?.days_7?.percent_change ? 
                          formatTrend(rawPrice.trends.days_7.percent_change) : 
                          <span className="text-gray-400 text-sm">0%</span>
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Low Price:</span>
                      <div className="text-green-400 font-semibold">{formatPrice(rawPrice.low)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Condition:</span>
                      <div className="text-white">{rawPrice.condition || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Price Range:</span>
                      <div className="text-gray-300">
                        {rawPrice.low && rawPrice.market ? 
                          `${formatPrice(rawPrice.low)} - ${formatPrice(rawPrice.market)}` : 
                          'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {gradedPrice && (
                <div>
                  <h4 className="text-blue-400 font-medium mb-3">Graded Card</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Market Price (7d trend):</span>
                      <div className="text-blue-400 font-semibold text-lg">{formatPrice(gradedPrice.market)}</div>
                      <div className="mt-1">
                        {gradedPrice.trends?.days_7?.percent_change ? 
                          formatTrend(gradedPrice.trends.days_7.percent_change) : 
                          <span className="text-gray-400 text-sm">0%</span>
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Grade:</span>
                      <div className="text-blue-400 font-semibold">{gradedPrice.company} {gradedPrice.grade}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Low Price:</span>
                      <div className="text-blue-400 font-semibold">{formatPrice(gradedPrice.low)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">High Price:</span>
                      <div className="text-blue-400 font-semibold">{formatPrice(gradedPrice.high)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add to Collection Section */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add to Collection</h3>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="flex-1 bg-gray-700 text-white px-3 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-center"
                placeholder="Quantity"
              />
              <button
                onClick={handleAddToCollection}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Star size={18} />
                Add to Collection
              </button>
            </div>
          </div>

          {/* Flavor Text */}
          {card.flavor_text && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Flavor Text</h3>
              <p className="text-gray-300 italic">{card.flavor_text}</p>
            </div>
          )}

          {/* Attacks */}
          {card.attacks && card.attacks.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Attacks</h3>
              <div className="space-y-3">
                {card.attacks.map((attack, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{attack.name}</h4>
                      <span className="text-yellow-400 font-bold">{attack.damage || 'N/A'}</span>
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      Cost: {attack.cost?.join(', ') || 'N/A'} 
                      {attack.converted_energy_cost && ` (${attack.converted_energy_cost} energy)`}
                    </div>
                    {attack.text && (
                      <p className="text-gray-300 text-sm">{attack.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abilities */}
          {card.abilities && card.abilities.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Abilities</h3>
              <div className="space-y-3">
                {card.abilities.map((ability, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <h4 className="font-semibold text-white mb-2">{ability.name}</h4>
                    <p className="text-gray-300 text-sm">{ability.text}</p>
                    {ability.type && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        {ability.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses & Resistances */}
          {(card.weaknesses?.length > 0 || card.resistances?.length > 0) && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Weaknesses & Resistances</h3>
              <div className="grid grid-cols-1 gap-4">
                {card.weaknesses?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-400 mb-2">Weaknesses</h4>
                    <div className="space-y-1">
                      {card.weaknesses.map((weakness, index) => (
                        <div key={index} className="text-sm text-gray-300">
                          {weakness.type}: {weakness.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {card.resistances?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-2">Resistances</h4>
                    <div className="space-y-1">
                      {card.resistances.map((resistance, index) => (
                        <div key={index} className="text-sm text-gray-300">
                          {resistance.type}: {resistance.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Retreat Cost */}
          {card.retreat_cost && card.retreat_cost.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Retreat Cost</h3>
              <div className="text-white">
                {card.retreat_cost.join(', ')} 
                {card.converted_retreat_cost && ` (${card.converted_retreat_cost} energy)`}
              </div>
            </div>
          )}

          {/* Legalities */}
          {card.legalities && card.legalities.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Legalities</h3>
              <div className="grid grid-cols-2 gap-2">
                {card.legalities.map((legality, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">{legality.format}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      legality.status === 'Legal' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {legality.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <button
              onClick={handleAddToCollection}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Star size={18} />
              Add to Collection
            </button>
            {(card.image_url_large && isValidUrl(card.image_url_large)) && (
              <button
                onClick={() => window.open(card.image_url_large, '_blank')}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ExternalLink size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPreviewModal;