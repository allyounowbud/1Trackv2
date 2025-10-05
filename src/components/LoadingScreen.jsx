import React, { useEffect, useState } from 'react';

const LoadingScreen = ({ message = "Loading your collection..." }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle smooth exit transition
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        // This would be called when loading is complete
        // The parent component should handle the actual navigation
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isExiting]);

  return (
    <div className={`fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Status Bar Simulation */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-3 text-white text-sm">
        <div className="flex items-center gap-1">
          <span>12:10</span>
          <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-sm"></div>
            <div className="w-1 h-3 bg-white rounded-sm"></div>
            <div className="w-1 h-3 bg-white rounded-sm"></div>
            <div className="w-1 h-2 bg-white/50 rounded-sm"></div>
          </div>
          <div className="w-4 h-2 border border-white rounded-sm">
            <div className="w-full h-full bg-white rounded-sm" style={{width: '93%'}}></div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered with proper spacing for iPhone */}
      <div className={`flex flex-col items-center justify-center transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* SVG Icon */}
        <div className="mb-8">
          <svg width="80" height="80" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
            <rect width="512" height="512" fill="#6366f1" rx="20"/>
            <text x="256" y="320" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="240" fontWeight="bold" fill="white">1T</text>
          </svg>
        </div>

        {/* App Title */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white tracking-tight">OneTrack</h1>
        </div>

        {/* Single Loading Spinner */}
        <div className="mb-12">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>

        {/* Loading Message */}
        <div className="text-center">
          <p className="text-gray-300 text-lg font-medium">{message}</p>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full"></div>
    </div>
  );
};

export default LoadingScreen;
