import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useModal } from '../../contexts/ModalContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();

  return (
    <div className="app-container">
      {/* Main Content Area - with proper spacing for bottom nav */}
      <div className="main-content">
        {children}
      </div>
      
      {/* Bottom Navigation - Always at bottom, never moves */}
      {!isModalOpen && <BottomNavigation currentPath={location.pathname} />}
    </div>
  );
};

export default Layout;