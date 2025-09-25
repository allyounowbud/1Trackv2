import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import DesktopSidebar from './DesktopSidebar';
import { useModal } from '../../contexts/ModalContext';

const ResponsiveLayout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktopSize = window.innerWidth >= 768; // Lower breakpoint for testing
      console.log('🖥️ Screen size check:', { width: window.innerWidth, isDesktop: isDesktopSize });
      setIsDesktop(isDesktopSize);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  console.log('🖥️ ResponsiveLayout render:', { isDesktop, width: window.innerWidth });

  if (isDesktop) {
    // Desktop layout with sidebar
    console.log('🖥️ Rendering desktop layout');
    return (
      <div className="desktop-app-container">
        <DesktopSidebar currentPath={location.pathname} />
        <div className="desktop-main-content">
          {children}
        </div>
      </div>
    );
  }

  // Mobile layout with bottom navigation (unchanged)
  console.log('📱 Rendering mobile layout');
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

export default ResponsiveLayout;
