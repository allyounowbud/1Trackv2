import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavigation = ({ currentPath, customButtons }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'collection',
      label: 'Collection',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      path: '/'
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      path: '/search'
    },
    {
      id: 'shipments',
      label: 'Shipments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
      path: '/shipments'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

  // If custom buttons are provided, render those instead
  if (customButtons) {
    return (
      <div className="bottom-nav-fixed bg-gray-900 border-t border-gray-700 safe-bottom">
        <div className="flex items-center w-full py-2 px-4">
          {customButtons}
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-nav-fixed bg-gray-950 border-t border-gray-800 safe-bottom">
      <div className="flex items-center w-full py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors relative ${
              isActive(item.path)
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className={`relative ${isActive(item.path) ? 'text-blue-400' : 'text-gray-400'}`}>
              {item.icon}
              {/* Notification badge removed - using Scrydex API only */}
            </div>
            <span className="text-xs">{item.label}</span>
            {isActive(item.path) && (
              <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;