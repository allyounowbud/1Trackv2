import React, { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  confirmVariant = "danger", // "danger", "warning", "primary"
  items = null, // Array of items to show in expandable list
  showCloseButton = true // Whether to show the X button
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      // Reset expanded state when modal closes
      setIsItemsExpanded(false);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const confirmButtonStyles = {
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
    primary: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
  };

    return createPortal(
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-white">
            {title}
          </h3>
        </div>

        {/* Message */}
        <div className="mb-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Expandable Items List */}
        {items && items.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="w-full flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
            >
              <span className="text-sm text-gray-300">
                {items.length === 1 ? '1 item selected' : `${items.length} items selected`}
              </span>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isItemsExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isItemsExpanded && (
              <div className="mt-2 bg-gray-800/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-xs">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-8 h-8 object-contain rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{item.name || 'Unknown Item'}</div>
                        {item.set_name && (
                          <div className="text-gray-400 truncate">{item.set_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-sm text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${confirmButtonStyles[confirmVariant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
