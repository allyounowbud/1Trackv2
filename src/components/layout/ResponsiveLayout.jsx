import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import DesktopSidebar from './DesktopSidebar';
import { useModal } from '../../contexts/ModalContext';

const ResponsiveLayout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileSafari, setIsMobileSafari] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktopSize = window.innerWidth >= 1024; // Back to proper breakpoint
      setIsDesktop(isDesktopSize);
    };

    const checkMobileSafari = () => {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
      setIsMobileSafari(isIOS && isSafari);
    };

    // Check on mount
    checkScreenSize();
    checkMobileSafari();

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
      
      {/* Bottom Navigation - Hide on mobile Safari when modal is open */}
      {!isModalOpen && !isMobileSafari && <BottomNavigation currentPath={location.pathname} />}
      {!isModalOpen && isMobileSafari && !document.body.classList.contains('modal-open') && <BottomNavigation currentPath={location.pathname} />}
    </div>
  );
};

export default ResponsiveLayout;
