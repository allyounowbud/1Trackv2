import React from 'react';

/**
 * Universal Grid Component
 * 
 * A standardized grid layout that can be used across all pages
 * for consistent item display and responsive behavior.
 * 
 * @param {Object} props
 * @param {Array} props.children - Grid items
 * @param {string} props.variant - Grid variant: 'collection', 'pokemon', 'search'
 * @param {string} props.layout - Grid layout: 'auto', 'fixed', 'responsive'
 * @param {number} props.columns - Number of columns for fixed layout
 * @param {string} props.gap - Grid gap size: 'sm', 'md', 'lg'
 * @param {boolean} props.showSelectionHint - Whether to show selection hint
 * @param {boolean} props.hasBulkMenu - Whether bulk menu is active (adds bottom padding)
 * @param {boolean} props.noContainerPadding - Whether to disable container padding
 * @param {string} props.className - Additional CSS classes
 */
const UniversalGrid = ({
  children,
  variant = 'collection',
  layout = 'responsive',
  columns = 4,
  gap = 'md',
  showSelectionHint = false,
  hasBulkMenu = false,
  noContainerPadding = false,
  className = '',
  ...props
}) => {
  // Get grid styling based on variant and layout
  const getGridStyles = () => {
    const baseStyles = "grid";
    
    // Gap styles
    const gapStyles = {
      sm: 'gap-2.5', // 10px gap on all screen sizes
      md: 'gap-2.5', // 10px gap on all screen sizes
      lg: 'gap-2.5' // 10px gap on all screen sizes
    };

    // Layout styles
    let layoutStyles = '';
    switch (layout) {
      case 'fixed':
        layoutStyles = `grid-cols-${columns}`;
        break;
      case 'responsive':
        switch (variant) {
          case 'collection':
            layoutStyles = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
            break;
          case 'pokemon':
            layoutStyles = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            break;
          case 'search':
            layoutStyles = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            break;
          default:
            layoutStyles = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
        }
        break;
      case 'auto':
        layoutStyles = 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]';
        break;
      default:
        layoutStyles = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
    }

    return `${baseStyles} ${layoutStyles} ${gapStyles[gap]}`;
  };

  // Get container padding based on bulk menu state
  const getContainerStyles = () => {
    if (noContainerPadding) {
      return ''; // No padding at all when noContainerPadding is true
    }
    const baseStyles = "px-2.5"; // 10px padding on all screen sizes
    const bottomPadding = hasBulkMenu ? 'pb-24' : 'pb-4';
    return `${baseStyles} ${bottomPadding}`;
  };

  return (
    <div 
      className={`${getContainerStyles()} ${className}`}
    >
      {/* Selection Hint */}
      {showSelectionHint && (
        <div className={`mb-4 bg-blue-50 border border-blue-200 rounded-lg ${noContainerPadding ? 'p-3 mx-4 md:mx-6 lg:mx-8' : 'p-3'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm text-blue-700">
              Press and hold any item to start selecting multiple items
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className={`${getGridStyles()} ${className}`} {...props}>
        {children}
      </div>
    </div>
  );
};

export default UniversalGrid;
