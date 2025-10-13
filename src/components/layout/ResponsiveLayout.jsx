import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import DesktopSidebar from './DesktopSidebar';
import GlobalHeader from './GlobalHeader';
import { useModal } from '../../contexts/ModalContext';
import { useCart } from '../../contexts/CartContext';

const ResponsiveLayout = ({ children }) => {
  const location = useLocation();
  const { isModalOpen, customBottomButtons } = useModal();
  const { isCartMenuOpen, isBulkSelectionMode, isCollectionMenuOpen } = useCart();
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileSafari, setIsMobileSafari] = useState(false);

  // Check if we should show the global header (exclude settings and admin pages)
  const shouldShowGlobalHeader = !location.pathname.startsWith('/settings') && !location.pathname.startsWith('/admin');

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
        {shouldShowGlobalHeader && <GlobalHeader />}
        <DesktopSidebar 
          currentPath={location.pathname} 
          onExpandedChange={setSidebarExpanded}
        />
        <div className={`desktop-main-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${shouldShowGlobalHeader ? 'pt-[50px]' : ''}`}>
          {children}
        </div>
      </div>
    );
  }

  // Mobile layout with bottom navigation
  return (
    <div className="app-container">
      {shouldShowGlobalHeader && <GlobalHeader />}
      {/* Main Content Area - with proper spacing for bottom nav and header */}
      <div className={`main-content ${shouldShowGlobalHeader ? 'pt-[50px]' : ''}`}>
        {children}
      </div>
      
      {/* Bottom Navigation - Show normal nav when all menus are closed */}
      {!isCartMenuOpen && !isBulkSelectionMode && !isCollectionMenuOpen && (
        <BottomNavigation 
          currentPath={location.pathname} 
          customButtons={null}
        />
      )}
    </div>
  );
};

export default ResponsiveLayout;
