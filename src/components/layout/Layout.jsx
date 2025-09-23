import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useModal } from '../../contexts/ModalContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();

  return (
    <div className="min-h-screen bg-gray-900 mobile-bg-fix mobile-web-app">
      {/* Mobile browser background fix */}
      <div className="mobile-full-bg"></div>
      
      {/* Main Content */}
      <main className={`relative z-10 ${isModalOpen ? 'content-without-bottom-nav' : 'content-with-bottom-nav'}`}>
        {children}
      </main>
      
      {/* Bottom Navigation - Hidden when modal is open */}
      {!isModalOpen && <BottomNavigation currentPath={location.pathname} />}
    </div>
  );
};

export default Layout;