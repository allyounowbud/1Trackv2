import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const DesktopSidebar = ({ currentPath, onExpandedChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    {
      id: 'collection',
      label: 'Collection',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      path: '/'
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      path: '/search'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/analytics'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      path: '/orders'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/settings'
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`desktop-sidebar bg-gray-950 border-r border-gray-800 transition-all duration-300 ${
      isExpanded ? 'w-72' : 'w-16'
    }`}>
      {/* Header */}
      <div className={`border-b border-gray-800 ${isExpanded ? 'p-6' : 'p-3'}`}>
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-white">1Track</span>
                <div className="text-xs text-gray-400 font-medium">Collection Manager</div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              const newExpanded = !isExpanded;
              setIsExpanded(newExpanded);
              onExpandedChange?.(newExpanded);
            }}
            className={`rounded-lg hover:bg-gray-800 transition-colors group ${isExpanded ? 'p-2.5' : 'p-2'}`}
          >
            <svg 
              className={`text-gray-400 group-hover:text-white transition-all ${isExpanded ? 'w-5 h-5 rotate-180' : 'w-4 h-4'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isExpanded ? 'p-6' : 'p-3'}`}>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                  isExpanded 
                    ? `space-x-4 px-4 py-3.5 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-400/25'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`
                    : `justify-center p-2 ${
                        isActive(item.path)
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`transition-all duration-200 ${
                    isActive(item.path) ? 'scale-110' : 'group-hover:scale-105'
                  }`}>
                    {item.icon}
                  </div>
                  {/* Notification badge removed - using Scrydex API only */}
                </div>
                {isExpanded && (
                  <span className="font-semibold text-sm truncate">{item.label}</span>
                )}
                {isActive(item.path) && isExpanded && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-sm"></div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {isExpanded && (
        <div className="p-6 border-t border-gray-800">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="text-xs text-gray-400 text-center">
              <p className="font-semibold text-gray-300">1Track v2.0</p>
              <p className="mt-1">Card Collection Manager</p>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                <div className="bg-gradient-to-r from-blue-400 to-purple-600 h-1 rounded-full w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopSidebar;
