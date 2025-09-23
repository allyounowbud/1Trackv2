import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 mobile-bg-fix mobile-web-app">
      {/* Mobile browser background fix */}
      <div className="mobile-full-bg"></div>
      
      {/* Main Content */}
      <main className="relative z-10 content-with-bottom-nav">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation currentPath={location.pathname} />
    </div>
  );
};

export default Layout;