import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const forceScrollToTop = () => {
      // Reset any body styles that might interfere with scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('modal-open');
      
      // Force scroll to top with multiple methods
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Target the actual scrollable containers
      const mainContent = document.querySelector('.main-content');
      const desktopMainContent = document.querySelector('.desktop-main-content');
      
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      
      if (desktopMainContent) {
        desktopMainContent.scrollTop = 0;
      }
      
      // Also try any other potential scrollable containers
      const appContainer = document.querySelector('.app-container');
      const desktopAppContainer = document.querySelector('.desktop-app-container');
      
      if (appContainer) {
        appContainer.scrollTop = 0;
      }
      
      if (desktopAppContainer) {
        desktopAppContainer.scrollTop = 0;
      }
    };

    // Run immediately
    forceScrollToTop();
    
    // Run again after a short delay to override any other effects
    setTimeout(forceScrollToTop, 0);
    setTimeout(forceScrollToTop, 10);
    setTimeout(forceScrollToTop, 50);
    setTimeout(forceScrollToTop, 100);
    setTimeout(forceScrollToTop, 200);
    
    // Also run on next frame and after a longer delay
    requestAnimationFrame(forceScrollToTop);
    setTimeout(forceScrollToTop, 500);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
