import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AdvancedExpansionSearchModal = ({ isOpen, onClose, onSearch }) => {
  const { preferredLanguage } = useLanguage();
  const [searchCriteria, setSearchCriteria] = useState({
    name: '',
    series: '',
    code: '',
    language: '',
    total: { min: '', max: '' },
    printed_total: { min: '', max: '' },
    release_year: { min: '', max: '' },
    is_online_only: ''
  });

  const [customQuery, setCustomQuery] = useState('');
  const [useCustomQuery, setUseCustomQuery] = useState(false);

  const commonSeries = [
    'Scarlet & Violet', 'Sword & Shield', 'Sun & Moon', 'XY', 'Black & White',
    'HeartGold & SoulSilver', 'Diamond & Pearl', 'Ruby & Sapphire', 'Base',
    'Neo', 'Gym', 'e-Card', 'EX', 'Platinum', 'Call of Legends',
    'Noble Victories', 'Emerging Powers', 'Next Destinies', 'Dark Explorers',
    'Dragons Exalted', 'Boundaries Crossed', 'Plasma Storm', 'Plasma Freeze',
    'Plasma Blast', 'Legendary Treasures', 'Flashfire', 'Furious Fists',
    'Phantom Forces', 'Primal Clash', 'Roaring Skies', 'Ancient Origins',
    'BREAKthrough', 'BREAKpoint', 'Fates Collide', 'Steam Siege',
    'Evolutions', 'Guardians Rising', 'Burning Shadows', 'Crimson Invasion',
    'Ultra Prism', 'Forbidden Light', 'Celestial Storm', 'Lost Thunder',
    'Team Up', 'Detective Pikachu', 'Unbroken Bonds', 'Unified Minds',
    'Hidden Fates', 'Cosmic Eclipse', 'Rebel Clash', 'Darkness Ablaze',
    'Vivid Voltage', 'Battle Styles', 'Chilling Reign', 'Evolving Skies',
    'Fusion Strike', 'Brilliant Stars', 'Astral Radiance', 'Lost Origin',
    'Silver Tempest', 'Crown Zenith', 'Paldea Evolved', 'Obsidian Flames',
    '151', 'Paradox Rift', 'Paldean Fates', 'Temporal Forces',
    'Twilight Masquerade', 'Shrouded Fable', 'Ancient Roar', 'Future Flash'
  ];

  const handleInputChange = (field, value) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const buildQuery = () => {
    if (useCustomQuery) {
      return customQuery;
    }

    const queryParts = [];
    
    Object.entries(searchCriteria).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object' && (value.min !== '' || value.max !== '')) {
          // Handle range values (total, printed_total, release_year)
          const min = value.min || '*';
          const max = value.max || '*';
          queryParts.push(`${field}:[${min} TO ${max}]`);
        } else if (typeof value === 'string' && value.trim() !== '') {
          // Handle simple string values
          if (value.includes(' ')) {
            // Quote phrases with spaces
            queryParts.push(`${field}:"${value.trim()}"`);
          } else {
            queryParts.push(`${field}:${value.trim()}`);
          }
        }
      }
    });

    return queryParts.join(' AND ');
  };

  const handleSearch = () => {
    const query = buildQuery();
    if (query.trim()) {
      onSearch(query);
      onClose();
    }
  };

  const handleReset = () => {
    setSearchCriteria({
      name: '',
      series: '',
      code: '',
      language: '',
      total: { min: '', max: '' },
      printed_total: { min: '', max: '' },
      release_year: { min: '', max: '' },
      is_online_only: ''
    });
    setCustomQuery('');
    setUseCustomQuery(false);
  };

  const getQueryPreview = () => {
    return buildQuery();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Advanced Expansion Search
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Search Mode Toggle */}
          <div className="mb-6">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchMode"
                  checked={!useCustomQuery}
                  onChange={() => setUseCustomQuery(false)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Guided Search
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchMode"
                  checked={useCustomQuery}
                  onChange={() => setUseCustomQuery(true)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Custom Query
                </span>
              </label>
            </div>
          </div>

          {useCustomQuery ? (
            /* Custom Query Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lucene Query Syntax
                </label>
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Example: name:mega AND series:XY OR total:[200 TO *]"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={4}
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p className="font-medium">Query Syntax Examples:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Keyword: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:mega</code></li>
                    <li>Phrase: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:"mega brave"</code></li>
                    <li>Boolean: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">series:XY AND language:japanese</code></li>
                    <li>Wildcard: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:twi*</code></li>
                    <li>Range: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">total:[200 TO *]</code></li>
                    <li>Exclude: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">series:xy -language:english</code></li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Guided Search Mode */
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Expansion name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="Expansion code (e.g., BLK)"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Series
                  </label>
                  <select
                    value={searchCriteria.series}
                    onChange={(e) => handleInputChange('series', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Any Series</option>
                    {commonSeries.map(series => (
                      <option key={series} value={series}>{series}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={searchCriteria.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Any Language</option>
                    <option value="english">English</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </div>
              </div>

              {/* Card Count Ranges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Card Count Range
                </label>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cards</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={searchCriteria.total.min}
                        onChange={(e) => handleInputChange('total', { ...searchCriteria.total, min: e.target.value })}
                        placeholder="Min"
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        value={searchCriteria.total.max}
                        onChange={(e) => handleInputChange('total', { ...searchCriteria.total, max: e.target.value })}
                        placeholder="Max"
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Printed Cards</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={searchCriteria.printed_total.min}
                        onChange={(e) => handleInputChange('printed_total', { ...searchCriteria.printed_total, min: e.target.value })}
                        placeholder="Min"
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        value={searchCriteria.printed_total.max}
                        onChange={(e) => handleInputChange('printed_total', { ...searchCriteria.printed_total, max: e.target.value })}
                        placeholder="Max"
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Release Year Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Year Range
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    value={searchCriteria.release_year.min}
                    onChange={(e) => handleInputChange('release_year', { ...searchCriteria.release_year, min: e.target.value })}
                    placeholder="Min Year"
                    className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={searchCriteria.release_year.max}
                    onChange={(e) => handleInputChange('release_year', { ...searchCriteria.release_year, max: e.target.value })}
                    placeholder="Max Year"
                    className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Availability
                </label>
                <select
                  value={searchCriteria.is_online_only}
                  onChange={(e) => handleInputChange('is_online_only', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Any Availability</option>
                  <option value="false">Physical & Online</option>
                  <option value="true">Online Only</option>
                </select>
              </div>
            </div>
          )}

          {/* Query Preview */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Generated Query
            </label>
            <code className="text-sm text-gray-900 dark:text-gray-100 break-all">
              {getQueryPreview() || 'No search criteria specified'}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              disabled={!getQueryPreview().trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedExpansionSearchModal;

