import { useEffect, useState } from 'react';

const LoadingScreen = ({ message = "Loading your collection..." }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
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

      {/* Main Content */}
      <div className={`flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {/* App Title with Icon */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-4xl font-bold text-white">OneTrack</h1>
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">1T</span>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="relative mb-6">
          {/* Outer ring */}
          <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
          {/* Inner ring */}
          <div className="absolute top-1 left-1 w-14 h-14 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" 
               style={{animationDirection: 'reverse', animationDuration: '1.2s'}}></div>
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full"></div>
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
