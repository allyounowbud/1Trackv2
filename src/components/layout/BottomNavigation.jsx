import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBadge from '../NotificationBadge';

const BottomNavigation = ({ currentPath }) => {
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
              {item.id === 'settings' && (
                <NotificationBadge 
                  className="absolute -top-1 -right-1" 
                  size="xs"
                />
              )}
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