import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import DesktopSidebar from './DesktopSidebar';
import { useModal } from '../../contexts/ModalContext';

const ResponsiveLayout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktopSize = window.innerWidth >= 1024; // Back to proper breakpoint
      setIsDesktop(isDesktopSize);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isDesktop) {
    // Desktop layout with sidebar
    return (
      <div className="desktop-app-container">
        <DesktopSidebar 
          currentPath={location.pathname} 
          onExpandedChange={setSidebarExpanded}
        />
        <div className={`desktop-main-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          {children}
        </div>
      </div>
    );
  }

  // Mobile layout with bottom navigation (unchanged)
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
