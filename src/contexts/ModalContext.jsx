// Cache bust v2.2.5 - Enhanced Mobile Safari modal fixes
import React, { createContext, useContext, useState, useEffect } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Mobile Safari detection
const isMobileSafari = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  return isIOS && isSafari;
};

export const ModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const openModal = () => {
    if (isTransitioning) return; // Prevent multiple rapid calls
    
    setIsTransitioning(true);
    setIsModalOpen(true);
    
    // Single strategy: Use CSS class only to avoid conflicts
    document.body.classList.add('modal-open');
    
    // For mobile Safari, use a more reliable approach
    if (isMobileSafari()) {
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        // Use a single, reliable hiding method
        bottomNav.style.display = 'none';
        bottomNav.style.pointerEvents = 'none';
      }
    }
    
    // Reset transition flag after a brief delay
    setTimeout(() => setIsTransitioning(false), 100);
  };
  
  const closeModal = () => {
    if (isTransitioning) return; // Prevent multiple rapid calls
    
    setIsTransitioning(true);
    setIsModalOpen(false);
    
    // Clean up modal state
    document.body.classList.remove('modal-open');
    
    // Restore bottom navigation for mobile Safari
    if (isMobileSafari()) {
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = '';
        bottomNav.style.pointerEvents = '';
      }
    }
    
    // Reset transition flag after a brief delay
    setTimeout(() => setIsTransitioning(false), 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      if (isMobileSafari()) {
        const bottomNav = document.querySelector('.bottom-nav-fixed');
        if (bottomNav) {
          bottomNav.style.display = '';
          bottomNav.style.pointerEvents = '';
        }
      }
    };
  }, []);

  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};
