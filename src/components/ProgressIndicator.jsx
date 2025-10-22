import React from 'react';

/**
 * Progress Indicator Component
 * 
 * Shows progress for batch operations with detailed status information
 */

const ProgressIndicator = ({
  progress = 0,
  current = 0,
  total = 0,
  status = 'Processing...',
  showDetails = true,
  className = '',
  size = 'default'
}) => {
  const percentage = Math.min(100, Math.max(0, progress));
  
  const sizeClasses = {
    small: 'h-2',
    default: 'h-3',
    large: 'h-4'
  };

  const textSizes = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Progress Text */}
      {showDetails && (
        <div className="mt-2 flex justify-between items-center">
          <span className={`text-gray-300 ${textSizes[size]}`}>
            {status}
          </span>
          <span className={`text-gray-400 ${textSizes[size]}`}>
            {current} / {total} ({percentage.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;



