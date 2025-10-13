import React from 'react';

const LoadingModal = ({ 
  isOpen, 
  title, 
  itemName, 
  itemDetails, 
  statusMessage, 
  itemImage,
  itemPrice 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-auto border border-gray-700">
          {/* Loading Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-600 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-500 rounded-full"></div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-6">
            {title}
          </h2>

          {/* Item Details */}
          <div className="space-y-3 mb-6">
            {/* Item Image and Name */}
            <div className="flex items-center gap-3">
              {itemImage && (
                <img 
                  src={itemImage} 
                  alt={itemName}
                  className="w-12 h-12 object-contain rounded"
                />
              )}
              <div className="flex-1">
                <p className="text-white font-medium">{itemName}</p>
                {itemDetails && (
                  <p className="text-gray-400 text-sm">{itemDetails}</p>
                )}
              </div>
            </div>

            {/* Item Price */}
            {itemPrice && (
              <div className="text-center">
                <span className="text-indigo-400 font-semibold text-lg">
                  {itemPrice}
                </span>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {statusMessage}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingModal;
