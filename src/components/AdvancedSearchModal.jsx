import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AdvancedSearchModal = ({ isOpen, onClose, onSearch }) => {
  const { preferredLanguage } = useLanguage();
  const [searchCriteria, setSearchCriteria] = useState({
    name: '',
    types: [],
    subtypes: [],
    supertype: '',
    hp: { min: '', max: '' },
    rarity: '',
    expansion: '',
    artist: '',
    national_pokedex_numbers: { min: '', max: '' },
    abilities: '',
    attacks: '',
    weaknesses: '',
    resistances: ''
  });

  const [customQuery, setCustomQuery] = useState('');
  const [useCustomQuery, setUseCustomQuery] = useState(false);

  const pokemonTypes = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless'];
  const commonSubtypes = ['Basic', 'Stage 1', 'Stage 2', 'MEGA', 'GX', 'V', 'VMAX', 'VSTAR', 'EX', 'BREAK', 'Prime', 'LEGEND', 'Level-Up'];
  const supertypes = ['Pokémon', 'Trainer', 'Energy'];
  const commonRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Ultra', 'Rare Secret', 'Promo'];

  const handleInputChange = (field, value) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field, value, checked) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const buildQuery = () => {
    if (useCustomQuery) {
      return customQuery;
    }

    const queryParts = [];
    
    Object.entries(searchCriteria).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          // Handle array values (types, subtypes)
          const arrayQuery = value.map(v => `${field}:${v}`).join(' OR ');
          queryParts.push(`(${arrayQuery})`);
        } else if (typeof value === 'object' && (value.min !== '' || value.max !== '')) {
          // Handle range values (hp, national_pokedex_numbers)
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
      types: [],
      subtypes: [],
      supertype: '',
      hp: { min: '', max: '' },
      rarity: '',
      expansion: '',
      artist: '',
      national_pokedex_numbers: { min: '', max: '' },
      abilities: '',
      attacks: '',
      weaknesses: '',
      resistances: ''
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
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Advanced Search
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  placeholder="Example: name:charizard AND subtypes:mega OR hp:[150 TO *]"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={4}
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p className="font-medium">Query Syntax Examples:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Keyword: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:charizard</code></li>
                    <li>Phrase: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:"venusaur v"</code></li>
                    <li>Boolean: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:charizard AND subtypes:mega</code></li>
                    <li>Wildcard: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">name:char*</code></li>
                    <li>Range: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">hp:[150 TO *]</code></li>
                    <li>Nested: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">expansion.id:sm1</code></li>
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
                    placeholder="Card name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supertype
                  </label>
                  <select
                    value={searchCriteria.supertype}
                    onChange={(e) => handleInputChange('supertype', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Any</option>
                    {supertypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rarity
                  </label>
                  <select
                    value={searchCriteria.rarity}
                    onChange={(e) => handleInputChange('rarity', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Any</option>
                    {commonRarities.map(rarity => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.artist}
                    onChange={(e) => handleInputChange('artist', e.target.value)}
                    placeholder="Artist name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Types
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {pokemonTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchCriteria.types.includes(type)}
                        onChange={(e) => handleArrayChange('types', type, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subtypes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtypes
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {commonSubtypes.map(subtype => (
                    <label key={subtype} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchCriteria.subtypes.includes(subtype)}
                        onChange={(e) => handleArrayChange('subtypes', subtype, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{subtype}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* HP Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HP Range
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    value={searchCriteria.hp.min}
                    onChange={(e) => handleInputChange('hp', { ...searchCriteria.hp, min: e.target.value })}
                    placeholder="Min"
                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={searchCriteria.hp.max}
                    onChange={(e) => handleInputChange('hp', { ...searchCriteria.hp, max: e.target.value })}
                    placeholder="Max"
                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Pokédex Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pokédex Number Range
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    value={searchCriteria.national_pokedex_numbers.min}
                    onChange={(e) => handleInputChange('national_pokedex_numbers', { ...searchCriteria.national_pokedex_numbers, min: e.target.value })}
                    placeholder="Min"
                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={searchCriteria.national_pokedex_numbers.max}
                    onChange={(e) => handleInputChange('national_pokedex_numbers', { ...searchCriteria.national_pokedex_numbers, max: e.target.value })}
                    placeholder="Max"
                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expansion
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.expansion}
                    onChange={(e) => handleInputChange('expansion', e.target.value)}
                    placeholder="Expansion name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ability Name
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.abilities}
                    onChange={(e) => handleInputChange('abilities', e.target.value)}
                    placeholder="Ability name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attack Name
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.attacks}
                    onChange={(e) => handleInputChange('attacks', e.target.value)}
                    placeholder="Attack name"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weakness Type
                  </label>
                  <input
                    type="text"
                    value={searchCriteria.weaknesses}
                    onChange={(e) => handleInputChange('weaknesses', e.target.value)}
                    placeholder="Weakness type"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
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

export default AdvancedSearchModal;

