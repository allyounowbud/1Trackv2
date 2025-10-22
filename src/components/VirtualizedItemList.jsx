import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Virtualized Item List Component
 * 
 * Provides efficient rendering of large item lists using virtual scrolling
 * to handle performance with thousands of items.
 */

const VirtualizedItemList = ({
  items = [],
  itemHeight = 80,
  containerHeight = 400,
  renderItem,
  onItemClick,
  onItemSelect,
  selectedItems = new Set(),
  className = '',
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightState, setContainerHeightState] = useState(containerHeight);
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeightState / itemHeight) + 1,
      items.length
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeightState, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange]);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Handle scroll
  const handleScroll = (e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
  };

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeightState(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Scroll to specific item
  const scrollToItem = (index) => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = 0;
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = totalHeight;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div
        ref={scrollElementRef}
        className="h-full overflow-auto"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
      >
        {/* Virtual spacer for total height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          <div
            style={{
              position: 'absolute',
              top: visibleRange.startIndex * itemHeight,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((item, index) => {
              const actualIndex = visibleRange.startIndex + index;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center p-3 border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${
                    isSelected ? 'bg-indigo-900/30 border-indigo-500' : ''
                  }`}
                  style={{ height: itemHeight }}
                  onClick={() => onItemClick?.(item, actualIndex)}
                >
                  {renderItem ? renderItem(item, actualIndex, isSelected) : (
                    <div className="flex items-center gap-3 w-full">
                      <img
                        src={item.imageUrl || item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = '/placeholder-card.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">
                          {item.set || item.set_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          ${item.marketValue || item.value || 0}
                        </div>
                        {isSelected && (
                          <div className="text-xs text-indigo-400">Selected</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedItemList;



