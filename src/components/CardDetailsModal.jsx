import React, { useState, useEffect } from 'react';
import translationUtils from '../utils/translationUtils.js';
const { processLocalizedCard, getLocalizedImageUrl } = translationUtils;
import { useLanguage } from '../contexts/LanguageContext';
import CachedImage from './CachedImage';
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
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {imageUrl && (
              <div className="w-16 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <CachedImage
                  src={imageUrl}
                  alt={localizedCard.displayName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {localizedCard.displayName}
              </h2>
              {localizedCard.displayNameSecondary && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {localizedCard.displayNameSecondary}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {localizedCard.displayExpansion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pricing', label: 'Pricing' },
            { id: 'attacks', label: 'Attacks & Abilities' },
            { id: 'details', label: 'Details' },
            { id: 'variants', label: 'Variants' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Supertype</label>
                  <p className="text-gray-900 dark:text-white">{localizedCard.displaySupertype}</p>
                </div>
                {localizedCard.hp && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">HP</label>
                    <p className="text-gray-900 dark:text-white">{localizedCard.hp}</p>
                  </div>
                )}
                {localizedCard.level && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                    <p className="text-gray-900 dark:text-white">{localizedCard.level}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Number</label>
                  <p className="text-gray-900 dark:text-white">{localizedCard.number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rarity</label>
                  <p className="text-gray-900 dark:text-white">{localizedCard.rarity}</p>
                </div>
                {localizedCard.artist && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Artist</label>
                    <p className="text-gray-900 dark:text-white">{localizedCard.artist}</p>
                  </div>
                )}
              </div>

              {/* Types */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Types</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {localizedCard.displayTypes?.map((type, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                        type.primary.toLowerCase() === 'fire' ? 'bg-red-500' :
                        type.primary.toLowerCase() === 'water' ? 'bg-blue-500' :
                        type.primary.toLowerCase() === 'grass' ? 'bg-green-500' :
                        type.primary.toLowerCase() === 'lightning' ? 'bg-yellow-500' :
                        type.primary.toLowerCase() === 'psychic' ? 'bg-purple-500' :
                        type.primary.toLowerCase() === 'fighting' ? 'bg-orange-600' :
                        type.primary.toLowerCase() === 'darkness' ? 'bg-gray-800' :
                        type.primary.toLowerCase() === 'metal' ? 'bg-gray-500' :
                        type.primary.toLowerCase() === 'fairy' ? 'bg-pink-400' :
                        type.primary.toLowerCase() === 'dragon' ? 'bg-indigo-600' :
                        'bg-gray-400'
                      }`}
                    >
                      {type.primary}
                      {type.secondary && (
                        <span className="text-xs opacity-75 ml-1">({type.secondary})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subtypes */}
              {localizedCard.displaySubtypes?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtypes</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {localizedCard.displaySubtypes.map((subtype, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm"
                      >
                        {subtype.primary}
                        {subtype.secondary && (
                          <span className="text-xs opacity-75 ml-1">({subtype.secondary})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {localizedCard.displayWeaknesses?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weaknesses</label>
                  <div className="space-y-2 mt-1">
                    {localizedCard.displayWeaknesses.map(weakness => 
                      renderWeaknessResistance(weakness, 'weakness')
                    )}
                  </div>
                </div>
              )}

              {/* Resistances */}
              {localizedCard.displayResistances?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Resistances</label>
                  <div className="space-y-2 mt-1">
                    {localizedCard.displayResistances.map(resistance => 
                      renderWeaknessResistance(resistance, 'resistance')
                    )}
                  </div>
                </div>
              )}

              {/* Retreat Cost */}
              {localizedCard.retreat_cost && localizedCard.retreat_cost.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Retreat Cost</label>
                  <div className="flex gap-1 mt-1">
                    {renderEnergyCost(localizedCard.retreat_cost)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Price Information
              </h3>
              
              <PriceDisplay 
                cardId={localizedCard.id}
                game="pokemon"
                currency="USD"
                showTrends={true}
                showGraded={true}
                compact={false}
              />
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Pricing Note:</strong> Prices are updated daily and reflect current market conditions. 
                  Graded prices are available for Pokémon and Lorcana cards.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attacks' && (
            <div className="space-y-6">
              {/* Abilities */}
              {localizedCard.displayAbilities?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Abilities</h3>
                  <div className="space-y-4">
                    {localizedCard.displayAbilities.map((ability, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {ability.name}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {ability.type}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {ability.text}
                        </p>
                        {ability.secondaryName && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              English: {ability.secondaryName} - {ability.secondaryText}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attacks */}
              {localizedCard.displayAttacks?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attacks</h3>
                  <div className="space-y-4">
                    {localizedCard.displayAttacks.map((attack, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {attack.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {renderEnergyCost(attack.cost)}
                            </div>
                            {attack.damage && (
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                {attack.damage}
                              </span>
                            )}
                          </div>
                        </div>
                        {attack.text && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {attack.text}
                          </p>
                        )}
                        {attack.secondaryName && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              English: {attack.secondaryName} - {attack.secondaryText}
                              {attack.secondaryDamage && ` - ${attack.secondaryDamage}`}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Expansion Details */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expansion</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <p className="text-gray-900 dark:text-white">{localizedCard.expansion?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Series: {localizedCard.expansion?.series}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Cards: {localizedCard.expansion?.total}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Release: {localizedCard.expansion?.release_date}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                  <p className="text-gray-900 dark:text-white">
                    {localizedCard.language} ({localizedCard.language_code})
                  </p>
                </div>
                {localizedCard.national_pokedex_numbers?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pokédex Number</label>
                    <p className="text-gray-900 dark:text-white">
                      #{localizedCard.national_pokedex_numbers.join(', #')}
                    </p>
                  </div>
                )}
                {localizedCard.regulation_mark && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Regulation Mark</label>
                    <p className="text-gray-900 dark:text-white">{localizedCard.regulation_mark}</p>
                  </div>
                )}
                {localizedCard.flavor_text && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Flavor Text</label>
                    <p className="text-gray-900 dark:text-white italic">
                      "{localizedCard.flavor_text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Rules */}
              {localizedCard.rules && localizedCard.rules.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rules</label>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm mt-1">
                    {localizedCard.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evolves From */}
              {localizedCard.evolves_from && localizedCard.evolves_from.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Evolves From</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {localizedCard.evolves_from.map((evolution, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm"
                      >
                        {evolution}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-4">
              {localizedCard.variants && localizedCard.variants.length > 0 ? (
                localizedCard.variants.map((variant, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {variant.name}
                    </h4>
                    {variant.prices && variant.prices.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {variant.prices.map((price, priceIndex) => (
                          <div key={priceIndex}>
                            <span className="text-gray-600 dark:text-gray-400">
                              {price.condition || 'Standard'}:
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white ml-1">
                              {formatPrice(price.market || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        No pricing data available
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No variants available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetailsModal;

