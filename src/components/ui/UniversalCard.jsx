import React, { useRef } from 'react';
import SafeImage from '../SafeImage';

/**
 * Universal Card Component
 * 
 * A standardized card component used across all pages for displaying items.
 * Supports different variants, selection states, and interaction modes.
 * 
 * @param {Object} props
 * @param {Object} props.item - The item data object
 * @param {boolean} props.isSelected - Whether the item is selected
 * @param {boolean} props.isInCart - Whether the item is in cart
 * @param {number} props.cartQuantity - Quantity in cart
 * @param {string} props.variant - Card variant: 'collection', 'pokemon', 'search'
 * @param {boolean} props.showSelection - Whether to show selection indicators
 * @param {boolean} props.showCartIndicator - Whether to show cart quantity
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onLongPress - Long press handler
 * @param {Function} props.onSelectionChange - Selection change handler
 * @param {Object} props.className - Additional CSS classes
 * @param {Object} props.children - Additional content to render inside card
 */
const UniversalCard = ({
  item,
  isSelected = false,
  isInCart = false,
  cartQuantity = 0,
  variant = 'collection',
  showSelection = false,
  showCartIndicator = false,
  onClick,
  onLongPress,
  onSelectionChange,
  className = '',
  children,
  ...props
}) => {
  // Get card styling based on variant
  const getCardStyles = () => {
    const baseStyles = "relative overflow-hidden transition-all duration-200 rounded-xl";
    
    switch (variant) {
      case 'collection':
        return `${baseStyles} bg-gray-800 ${
          isSelected 
            ? 'border-indigo-400 bg-gray-700' 
            : 'hover:bg-gray-700'
        }`;
      
      case 'pokemon':
        return `${baseStyles} bg-white ${
          isSelected 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'hover:bg-gray-100'
        }`;
      
      case 'search':
        return `${baseStyles} bg-white ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'hover:bg-gray-100'
        }`;
      
      default:
        return `${baseStyles} bg-white ${
          isSelected 
            ? 'border-indigo-300 bg-indigo-50' 
            : 'hover:bg-gray-100'
        }`;
    }
  };

  // Get border style for subtle grey
  const getBorderStyle = () => {
    if (isSelected) {
      return {}; // Let Tailwind handle selected state borders
    }
    return {
      border: '1px solid rgba(75, 85, 99, 0.4)'
    };
  };

  // Get image aspect ratio based on variant
  const getImageAspectRatio = () => {
    switch (variant) {
      case 'collection':
        return 'aspect-[1/1]';
      case 'pokemon':
        return 'aspect-[3/4]';
      case 'search':
        return 'aspect-[3/4]';
      default:
        return 'aspect-[1/1]';
    }
  };

  // Get text size based on variant
  const getTextSizes = () => {
    switch (variant) {
      case 'collection':
        return {
          title: 'text-[11px] md:text-xs',
          subtitle: 'text-[11px] md:text-xs',
          price: 'text-[11px] md:text-xs'
        };
      case 'pokemon':
        return {
          title: 'text-sm',
          subtitle: 'text-xs',
          price: 'text-sm'
        };
      case 'search':
        return {
          title: 'text-sm',
          subtitle: 'text-xs',
          price: 'text-sm'
        };
      default:
        return {
          title: 'text-sm',
          subtitle: 'text-xs',
          price: 'text-sm'
        };
    }
  };

  // Format price helper
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return price || '$0.00';
  };

  // Get status display based on variant
  const getStatusDisplay = () => {
    if (variant === 'collection') {
      // Collection specific status logic
      const profit = item.value - item.totalPaid;
      const profitPercent = item.totalPaid ? ((profit / item.totalPaid) * 100) : 0;
      const isProfit = profit >= 0;
      
      return {
        show: true,
        text: 'Sealed',
        color: isProfit ? 'text-green-400' : 'text-red-400',
        icon: isProfit ? (
          <svg className="w-2.5 h-2.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    return { show: false };
  };

  const textSizes = getTextSizes();
  const statusDisplay = getStatusDisplay();
  const longPressTimeout = useRef(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (e) => {
    longPressTriggered.current = false;
    if (onLongPress) {
      longPressTimeout.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress(e);
      }, 500); // 500ms delay for long press
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    longPressTriggered.current = false;
  };

  const handleMouseDown = (e) => {
    longPressTriggered.current = false;
    if (onLongPress) {
      longPressTimeout.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress(e);
      }, 500); // 500ms delay for long press
    }
  };

  const handleMouseUp = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    longPressTriggered.current = false;
  };

  const handleClick = (e) => {
    // Prevent click if long press was triggered
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`${getCardStyles()} ${className}`}
      style={getBorderStyle()}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Selection Indicator */}
      {showSelection && (
        <div className="absolute top-2 left-2 z-10">
          {isSelected ? (
            <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white"></div>
          )}
        </div>
      )}

      {/* Cart Quantity Indicator */}
      {showCartIndicator && isInCart && cartQuantity > 0 && (
        <div className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
          {cartQuantity}
        </div>
      )}

      {/* Card Image */}
      <div className={`${getImageAspectRatio()} flex items-center justify-center p-4 relative`}>
        {item.image ? (
          <SafeImage 
            src={item.image} 
            alt={item.name}
            className="w-full h-full object-contain"
          />
        ) : item.image_url ? (
          <SafeImage 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-gray-400 text-xs">No Image</div>
          </div>
        )}
      </div>
      
      {/* Card Details */}
      <div className="p-3 space-y-1">
        {/* Item Name */}
        <div>
          <h3 className={`${textSizes.title} font-semibold text-white leading-tight line-clamp-2`}>
            {item.name || 'Unknown Item'}
            {item.cardNumber && (
              <span className="text-blue-400"> #{item.cardNumber}</span>
            )}
          </h3>
          <div className={`${textSizes.subtitle} truncate`} style={{ color: '#9ca3af' }}>
            {item.set || item.set_name || item.expansion_name || 'Unknown Set'}
          </div>
        </div>
        
        {/* Status */}
        {statusDisplay.show && (
          <div className="flex items-center gap-1">
            <span className={`${textSizes.subtitle} text-blue-400 font-medium`}>
              {statusDisplay.text}
            </span>
            {statusDisplay.icon}
          </div>
        )}
        
        {/* Financial Details - Collection variant specific */}
        {variant === 'collection' && (
          <div className="space-y-0.5">
            <div className={`${textSizes.price} text-white`}>
              {formatPrice(item.value)} Value • Qty {item.quantity || 1}
            </div>
            <div className={`${textSizes.price} text-white`}>
              {formatPrice(item.totalPaid)} Paid 
              {(() => {
                const profit = item.value - item.totalPaid;
                const profitPercent = item.totalPaid ? ((profit / item.totalPaid) * 100) : 0;
                const isProfit = profit >= 0;
                return (
                  <span className={`ml-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    ({isProfit ? '+' : ''}{profitPercent.toFixed(1)}%)
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {/* Pokemon/Search variant specific details */}
        {(variant === 'pokemon' || variant === 'search') && item.price && (
          <div className={`${textSizes.price} font-medium text-gray-700`}>
            {formatPrice(item.price)}
          </div>
        )}
        
        {/* Additional children content */}
        {children}
      </div>
    </div>
  );
};

export default UniversalCard;
