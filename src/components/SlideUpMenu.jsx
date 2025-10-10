import React, { useState, useEffect, useRef } from 'react';

const SlideUpMenu = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  maxHeight = '85vh',
  showDragHandle = true,
  allowSwipeToClose = true,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragData, setDragData] = useState({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
  const menuRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset drag data when menu opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDragData({ startY: 0, currentY: 0, isDragging: false, deltaY: 0 });
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsClosing(true);
    
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
      setIsClosing(false);
    }, 300);
  };

  // Touch and mouse gesture handlers
  const handleTouchStart = (e) => {
    if (!allowSwipeToClose) return;
    
    const touch = e.touches[0];
    setDragData({
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  const handleMouseDown = (e) => {
    if (!allowSwipeToClose) return;
    
    setDragData({
      startY: e.clientY,
      currentY: e.clientY,
      isDragging: true,
      deltaY: 0
    });
  };

  const handleTouchMove = (e) => {
    if (!allowSwipeToClose || !dragData.isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragData.startY;
    
    // Only allow downward swipe (positive deltaY)
    if (deltaY > 0) {
      setDragData({
        ...dragData,
        currentY: touch.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!allowSwipeToClose || !dragData.isDragging) return;
    
    const deltaY = e.clientY - dragData.startY;
    
    // Only allow downward swipe (positive deltaY)
    if (deltaY > 0) {
      setDragData({
        ...dragData,
        currentY: e.clientY,
        deltaY: deltaY
      });
    }
  };

  const handleTouchEnd = () => {
    if (!allowSwipeToClose || !dragData.isDragging) return;
    
    const deltaY = dragData.deltaY || 0;
    
    // If swiped down more than 100px, close the menu
    if (deltaY > 100) {
      handleClose();
    } else {
      // Snap back to original position
      setDragData({
        ...dragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  const handleMouseUp = () => {
    if (!allowSwipeToClose || !dragData.isDragging) return;
    
    const deltaY = dragData.deltaY || 0;
    
    // If swiped down more than 100px, close the menu
    if (deltaY > 100) {
      handleClose();
    } else {
      // Snap back to original position
      setDragData({
        ...dragData,
        isDragging: false,
        deltaY: 0
      });
    }
  };

  // Calculate transform based on drag
  const getTransform = () => {
    if (!dragData.isDragging) return 'translateY(0)';
    return `translateY(${Math.max(0, dragData.deltaY)}px)`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end modal-overlay transition-opacity duration-200 z-40"
        onClick={handleClose}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className={`w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-600 rounded-t-3xl max-h-[${maxHeight}] overflow-y-auto z-50 ${className}`}
        style={{ 
          animation: isClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out',
          transform: getTransform(),
          transition: dragData.isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iPhone-style drag handle */}
        {showDragHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className={`w-10 h-1 rounded-full transition-colors ${
              dragData.isDragging ? 'bg-gray-500' : 'bg-gray-600'
            }`} />
          </div>
        )}

        {/* Header with close button */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-700/50 relative">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-white pr-12">
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="px-4 pt-4 pb-8">
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideUpMenu;
