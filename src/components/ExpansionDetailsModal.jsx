import React, { useState, useEffect } from 'react';
import translationUtils from '../utils/translationUtils.js';
import { useLanguage } from '../contexts/LanguageContext';
import CachedImage from './CachedImage';

// Use functions from the default export
const { processLocalizedExpansion, getExpansionLogoUrl } = translationUtils;

const ExpansionDetailsModal = ({ expansion, isOpen, onClose }) => {
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

  if (!isOpen || !expansion) return null;

  // Process the expansion with localization
  const localizedExpansion = processLocalizedExpansion(expansion, preferredLanguage);
  const logoUrl = getExpansionLogoUrl(localizedExpansion, 'logo');
  const symbolUrl = getExpansionLogoUrl(localizedExpansion, 'symbol');

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const [year, month, day] = dateString.split('/');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCardCount = (count) => {
    return count ? count.toLocaleString() : 'Unknown';
  };

  const getSeriesColor = (series) => {
    const seriesColors = {
      'Scarlet & Violet': 'from-purple-500 to-pink-500',
      'Sword & Shield': 'from-blue-600 to-blue-800',
      'Sun & Moon': 'from-yellow-500 to-orange-500',
      'XY': 'from-green-500 to-teal-500',
      'Black & White': 'from-gray-700 to-gray-900',
      'HeartGold & SoulSilver': 'from-yellow-600 to-amber-600',
      'Diamond & Pearl': 'from-cyan-500 to-blue-500',
      'Ruby & Sapphire': 'from-red-500 to-pink-500',
      'Base': 'from-gray-500 to-gray-700',
      'Neo': 'from-indigo-500 to-purple-500',
      'Gym': 'from-orange-500 to-red-500',
      'e-Card': 'from-green-600 to-emerald-600',
      'EX': 'from-blue-500 to-indigo-500',
      'Platinum': 'from-gray-400 to-gray-600',
      'Call of Legends': 'from-purple-600 to-violet-600',
      'Noble Victories': 'from-red-600 to-rose-600',
      'Emerging Powers': 'from-green-600 to-emerald-600',
      'Next Destinies': 'from-blue-600 to-cyan-600',
      'Dark Explorers': 'from-gray-800 to-black',
      'Dragons Exalted': 'from-red-700 to-orange-700',
      'Boundaries Crossed': 'from-purple-700 to-indigo-700',
      'Plasma Storm': 'from-blue-700 to-purple-700',
      'Plasma Freeze': 'from-cyan-700 to-blue-700',
      'Plasma Blast': 'from-yellow-700 to-orange-700',
      'Legendary Treasures': 'from-yellow-600 to-amber-600',
      'Flashfire': 'from-red-500 to-orange-500',
      'Furious Fists': 'from-blue-500 to-indigo-500',
      'Phantom Forces': 'from-purple-500 to-violet-500',
      'Primal Clash': 'from-green-600 to-emerald-600',
      'Roaring Skies': 'from-cyan-500 to-blue-500',
      'Ancient Origins': 'from-orange-600 to-red-600',
      'BREAKthrough': 'from-purple-600 to-indigo-600',
      'BREAKpoint': 'from-blue-600 to-cyan-600',
      'Fates Collide': 'from-gray-600 to-slate-600',
      'Steam Siege': 'from-red-600 to-rose-600',
      'Evolutions': 'from-yellow-600 to-orange-600',
      'Guardians Rising': 'from-green-600 to-emerald-600',
      'Burning Shadows': 'from-red-600 to-orange-600',
      'Crimson Invasion': 'from-red-700 to-rose-700',
      'Ultra Prism': 'from-blue-600 to-indigo-600',
      'Forbidden Light': 'from-purple-600 to-violet-600',
      'Celestial Storm': 'from-cyan-600 to-blue-600',
      'Lost Thunder': 'from-yellow-600 to-amber-600',
      'Team Up': 'from-blue-600 to-purple-600',
      'Detective Pikachu': 'from-yellow-500 to-orange-500',
      'Unbroken Bonds': 'from-red-600 to-pink-600',
      'Unified Minds': 'from-purple-600 to-indigo-600',
      'Hidden Fates': 'from-green-600 to-emerald-600',
      'Cosmic Eclipse': 'from-purple-700 to-violet-700',
      'Rebel Clash': 'from-red-600 to-orange-600',
      'Darkness Ablaze': 'from-gray-800 to-black',
      'Vivid Voltage': 'from-yellow-600 to-orange-600',
      'Battle Styles': 'from-red-700 to-orange-700',
      'Chilling Reign': 'from-blue-700 to-cyan-700',
      'Evolving Skies': 'from-green-700 to-emerald-700',
      'Fusion Strike': 'from-purple-700 to-indigo-700',
      'Brilliant Stars': 'from-yellow-700 to-orange-700',
      'Astral Radiance': 'from-blue-700 to-indigo-700',
      'Lost Origin': 'from-gray-700 to-slate-700',
      'Silver Tempest': 'from-cyan-700 to-blue-700',
      'Crown Zenith': 'from-yellow-700 to-amber-700',
      'Paldea Evolved': 'from-green-600 to-emerald-600',
      'Obsidian Flames': 'from-red-700 to-orange-700',
      '151': 'from-blue-600 to-indigo-600',
      'Paradox Rift': 'from-purple-700 to-violet-700',
      'Paldean Fates': 'from-green-700 to-emerald-700',
      'Temporal Forces': 'from-cyan-700 to-blue-700',
      'Twilight Masquerade': 'from-purple-800 to-indigo-800',
      'Shrouded Fable': 'from-gray-800 to-slate-800',
      'Ancient Roar': 'from-orange-700 to-red-700',
      'Future Flash': 'from-blue-800 to-cyan-800'
    };
    
    return seriesColors[series] || 'from-gray-500 to-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative">
          {/* Background with series color */}
          <div className={`h-32 bg-gradient-to-r ${getSeriesColor(localizedExpansion.series)}`} />
          
          {/* Content overlay */}
          <div className="absolute inset-0 p-6 flex items-end">
            <div className="flex items-end gap-4">
              {logoUrl && (
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <CachedImage
                    src={logoUrl}
                    alt={`${localizedExpansion.displayName} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">
                  {localizedExpansion.displayName}
                </h2>
                {localizedExpansion.displayNameSecondary && (
                  <p className="text-sm opacity-90 italic">
                    {localizedExpansion.displayNameSecondary}
                  </p>
                )}
                <p className="text-sm opacity-80">
                  {localizedExpansion.series}
                </p>
              </div>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 bg-black bg-opacity-50 rounded-full p-2"
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
            { id: 'details', label: 'Details' },
            { id: 'statistics', label: 'Statistics' }
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
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Series</label>
                      <p className="text-gray-900 dark:text-white font-medium">{localizedExpansion.series}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                      <p className="text-gray-900 dark:text-white font-mono">{localizedExpansion.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                      <p className="text-gray-900 dark:text-white">
                        {localizedExpansion.language} ({localizedExpansion.language_code})
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Release Date</label>
                      <p className="text-gray-900 dark:text-white">{formatDate(localizedExpansion.release_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Availability</label>
                      <p className="text-gray-900 dark:text-white">
                        {localizedExpansion.is_online_only ? 'Online Only' : 'Physical & Online'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Card Counts
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cards</label>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCardCount(localizedExpansion.cardCount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Printed Cards</label>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                        {formatCardCount(localizedExpansion.printedCardCount)}
                      </p>
                    </div>
                    {localizedExpansion.hasSecretRares && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret Rares</label>
                        <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                          {formatCardCount(localizedExpansion.cardCount - localizedExpansion.printedCardCount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Assets */}
              {(logoUrl || symbolUrl) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Visual Assets
                  </h3>
                  <div className="flex gap-4">
                    {logoUrl && (
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                          <CachedImage
                            src={logoUrl}
                            alt={`${localizedExpansion.displayName} logo`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Logo</p>
                      </div>
                    )}
                    {symbolUrl && (
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                          <CachedImage
                            src={symbolUrl}
                            alt={`${localizedExpansion.displayName} symbol`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Symbol</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Technical Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expansion ID</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">{localizedExpansion.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language Code</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">{localizedExpansion.language_code}</p>
                  </div>
                </div>
              </div>

              {/* Release Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Release Information
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Release Year</label>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {localizedExpansion.releaseYear || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Release Month</label>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {localizedExpansion.releaseMonth || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Release Day</label>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {localizedExpansion.releaseDay || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Language Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Language Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Detected Language</label>
                    <p className="text-gray-900 dark:text-white">
                      {localizedExpansion.isJapanese ? 'Japanese' : 'English'}
                      {localizedExpansion.isJapanese && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          日本語
                        </span>
                      )}
                    </p>
                  </div>
                  {localizedExpansion.displayNameSecondary && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">English Translation</label>
                      <p className="text-gray-900 dark:text-white italic">
                        {localizedExpansion.displayNameSecondary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-6">
              {/* Card Count Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Card Count Analysis
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cards</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCardCount(localizedExpansion.cardCount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Printed Cards</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(localizedExpansion.printedCardCount / localizedExpansion.cardCount) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCardCount(localizedExpansion.printedCardCount)}
                      </span>
                    </div>
                  </div>
                  
                  {localizedExpansion.hasSecretRares && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret Rares</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ 
                              width: `${((localizedExpansion.cardCount - localizedExpansion.printedCardCount) / localizedExpansion.cardCount) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {formatCardCount(localizedExpansion.cardCount - localizedExpansion.printedCardCount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expansion Size Category */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Expansion Size Category
                </h3>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${localizedExpansion.cardCount >= 200 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    localizedExpansion.cardCount >= 150 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                    localizedExpansion.cardCount >= 100 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}">
                  {localizedExpansion.cardCount >= 200 ? 'Large Expansion' :
                   localizedExpansion.cardCount >= 150 ? 'Medium-Large Expansion' :
                   localizedExpansion.cardCount >= 100 ? 'Medium Expansion' :
                   'Small Expansion'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Based on total card count of {formatCardCount(localizedExpansion.cardCount)} cards
                </p>
              </div>
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

export default ExpansionDetailsModal;

