import React, { useState, useEffect } from 'react';
import translationUtils from '../utils/translationUtils.js';
const { processLocalizedCard, getLocalizedImageUrl } = translationUtils;
import { useLanguage } from '../contexts/LanguageContext';
import SafeImage from './SafeImage';
import PriceDisplay from './PriceDisplay';

const CardDetailsModal = ({ card, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { preferredLanguage } = useLanguage();

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

  // Process the card with localization
  const localizedCard = processLocalizedCard(card, preferredLanguage);
  const imageUrl = getLocalizedImageUrl(localizedCard, 'large');

  const formatPrice = (value) => {
    if (!value || value === 0) return 'Unavailable';
    return `$${value.toFixed(2)}`;
  };

  const formatPriceCents = (cents) => {
    if (!cents || cents === 0) return 'Unavailable';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderEnergyCost = (cost) => {
    if (!cost || !Array.isArray(cost)) return null;
    
    return cost.map((energyType, index) => (
      <span
        key={index}
        className={`inline-block w-6 h-6 rounded-full text-xs flex items-center justify-center text-white font-bold mr-1 ${
          energyType.toLowerCase() === 'fire' ? 'bg-red-500' :
          energyType.toLowerCase() === 'water' ? 'bg-blue-500' :
          energyType.toLowerCase() === 'grass' ? 'bg-green-500' :
          energyType.toLowerCase() === 'lightning' ? 'bg-yellow-500' :
          energyType.toLowerCase() === 'psychic' ? 'bg-purple-500' :
          energyType.toLowerCase() === 'fighting' ? 'bg-orange-600' :
          energyType.toLowerCase() === 'darkness' ? 'bg-gray-800' :
          energyType.toLowerCase() === 'metal' ? 'bg-gray-500' :
          energyType.toLowerCase() === 'fairy' ? 'bg-pink-400' :
          energyType.toLowerCase() === 'dragon' ? 'bg-indigo-600' :
          'bg-gray-400'
        }`}
        title={energyType}
      >
        {energyType.charAt(0).toUpperCase()}
      </span>
    ));
  };

  const renderWeaknessResistance = (item, type) => (
    <div key={`${type}-${item.type}`} className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        type === 'weakness' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {item.type}
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {item.value}
      </span>
      {item.secondaryType && (
        <span className="text-xs text-gray-500 dark:text-gray-500 italic">
          ({item.secondaryType}: {item.secondaryValue})
        </span>
      )}
    </div>
  );

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
            {localizedCard.displayName} #{localizedCard.number}
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
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt={localizedCard.displayName}
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
                <h2 className="text-xl font-bold text-white mb-2">{localizedCard.displayName}</h2>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300 flex-wrap">
                  {localizedCard.displayTypes?.[0] && (
                    <span className={`px-2 py-1 rounded text-white ${
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'fire' ? 'bg-red-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'water' ? 'bg-blue-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'grass' ? 'bg-green-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'lightning' ? 'bg-yellow-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'psychic' ? 'bg-purple-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'fighting' ? 'bg-orange-600' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'darkness' ? 'bg-gray-800' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'metal' ? 'bg-gray-500' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'fairy' ? 'bg-pink-400' :
                      localizedCard.displayTypes[0].primary.toLowerCase() === 'dragon' ? 'bg-indigo-600' :
                      'bg-gray-400'
                    }`}>
                      {localizedCard.displayTypes[0].primary}
                    </span>
                  )}
                  {localizedCard.rarity && (
                    <span className="bg-yellow-600 px-2 py-1 rounded text-white">{localizedCard.rarity}</span>
                  )}
                  {localizedCard.hp && (
                    <span className="bg-red-600 px-2 py-1 rounded text-white">HP {localizedCard.hp}</span>
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
                  <span className="text-white ml-2">{localizedCard.number}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rarity:</span>
                  <span className="text-yellow-400 ml-2">{localizedCard.rarity}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-blue-400 ml-2">{localizedCard.displayTypes?.[0]?.primary || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">HP:</span>
                  <span className="text-red-400 ml-2">{localizedCard.hp || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Expansion:</span>
                  <span className="text-white ml-2">{localizedCard.displayExpansion}</span>
                </div>
                <div>
                  <span className="text-gray-400">Artist:</span>
                  <span className="text-white ml-2">{localizedCard.artist || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Market Value Section */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">$ Market Value</h3>
              <div className="text-green-400 text-sm mb-2">Raw Card</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Market Price (7d trend):</span>
                  <span className="text-green-400 ml-2">$2.26</span>
                </div>
                <div>
                  <span className="text-gray-400">Low Price:</span>
                  <span className="text-green-400 ml-2">$1.50</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Price Range:</span>
                  <span className="text-white ml-2">$1.50 - $2.26</span>
                </div>
              </div>
            </div>

            {/* Add to Collection Section */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">Add to Collection</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="w-16 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2">
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

export default CardDetailsModal;

