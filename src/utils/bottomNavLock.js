// FOOLPROOF BOTTOM NAVIGATION LOCK
// This script ensures the bottom navigation NEVER moves from the bottom

export const lockBottomNavigation = () => {
  const bottomNav = document.querySelector('.bottom-nav-fixed');
  if (!bottomNav) return;

  // Force the bottom navigation to stay at the bottom
  const forceBottomPosition = () => {
    if (bottomNav) {
      // Force position
      bottomNav.style.position = 'fixed';
      bottomNav.style.bottom = '0px';
      bottomNav.style.left = '0px';
      bottomNav.style.right = '0px';
      bottomNav.style.zIndex = '999999';
      bottomNav.style.height = '80px';
      bottomNav.style.width = '100vw';
      bottomNav.style.transform = 'none';
      bottomNav.style.webkitTransform = 'none';
      bottomNav.style.margin = '0px';
      bottomNav.style.padding = '0px';
      bottomNav.style.top = 'auto';
    }
  };

  // Force position immediately
  forceBottomPosition();

  // Force position on resize
  window.addEventListener('resize', forceBottomPosition, { passive: true });
  
  // Force position on orientation change
  window.addEventListener('orientationchange', forceBottomPosition, { passive: true });
  
  // Force position less frequently (every 500ms instead of 100ms)
  const interval = setInterval(forceBottomPosition, 500);

  // Cleanup function
  return () => {
    clearInterval(interval);
    window.removeEventListener('resize', forceBottomPosition);
    window.removeEventListener('orientationchange', forceBottomPosition);
  };
};

// Force body to never allow content below bottom nav
export const lockBodyHeight = () => {
  // Don't interfere with scrolling - just ensure bottom nav stays fixed
  return () => {
    // Cleanup function - no active locking needed
  };
};

// Initialize both locks
export const initializeBottomNavLock = () => {
  const cleanup1 = lockBottomNavigation();
  const cleanup2 = lockBodyHeight();
  
  return () => {
    cleanup1();
    cleanup2();
  };
};
