import React from 'react';

/**
 * Universal Search Bar Component
 * 
 * A standardized search bar that can be used across all pages
 * for consistent search functionality and styling.
 * 
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.variant - Search bar variant: 'collection', 'pokemon', 'search'
 * @param {boolean} props.showResultsCount - Whether to show results count
 * @param {number} props.resultsCount - Number of search results
 * @param {Function} props.onClear - Clear search handler
 * @param {boolean} props.disabled - Whether search is disabled
 * @param {string} props.className - Additional CSS classes
 */
const UniversalSearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  variant = 'collection',
  showResultsCount = false,
  resultsCount = 0,
  onClear,
  disabled = false,
  className = '',
  ...props
}) => {
  // Get styling based on variant
  const getStyles = () => {
    switch (variant) {
      case 'collection':
        return {
          container: 'bg-white',
          input: 'bg-white border-gray-200 text-gray-600 placeholder-gray-400 focus:ring-blue-400 focus:border-transparent',
          icon: 'text-gray-400',
          results: 'text-gray-600'
        };
      case 'pokemon':
        return {
          container: 'bg-gray-800',
          input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-transparent',
          icon: 'text-gray-400',
          results: 'text-gray-300'
        };
      case 'search':
        return {
          container: 'bg-gray-900',
          input: 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-green-400 focus:border-transparent',
          icon: 'text-gray-400',
          results: 'text-gray-300'
        };
      default:
        return {
          container: 'bg-white',
          input: 'bg-white border-gray-200 text-gray-600 placeholder-gray-400 focus:ring-blue-400 focus:border-transparent',
          icon: 'text-gray-400',
          results: 'text-gray-600'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
        <svg className={`h-4 w-4 md:h-5 md:w-5 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Search Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2 md:py-3 ${styles.input} rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...props}
      />

      {/* Clear Button */}
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center hover:bg-gray-100 rounded-r-lg transition-colors"
        >
          <svg className={`h-4 w-4 md:h-5 md:w-5 ${styles.icon} hover:text-gray-600`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </button>
      )}

      {/* Results Count */}
      {showResultsCount && (
        <div className="absolute top-full left-0 mt-1">
          <div className={`text-xs ${styles.results} bg-gray-100 px-2 py-1 rounded-md shadow-sm`}>
            {resultsCount} result{resultsCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalSearchBar;
