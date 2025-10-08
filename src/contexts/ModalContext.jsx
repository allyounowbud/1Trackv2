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

  const openModal = () => {
    setIsModalOpen(true);
    
    // Multiple strategies for mobile Safari
    document.body.classList.add('modal-open');
    
    // Strategy 1: Hide bottom nav with CSS class
    const bottomNav = document.querySelector('.bottom-nav-fixed');
    if (bottomNav) {
      bottomNav.style.display = 'none';
      bottomNav.style.visibility = 'hidden';
      bottomNav.style.opacity = '0';
      bottomNav.style.transform = 'translateY(100%)';
      bottomNav.style.transition = 'all 0.3s ease';
    }
    
    // Strategy 2: For mobile Safari, also hide via data attribute
    if (isMobileSafari()) {
      document.body.setAttribute('data-modal-open', 'true');
      // Force a repaint
      document.body.style.transform = 'translateZ(0)';
      setTimeout(() => {
        document.body.style.transform = '';
      }, 0);
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    
    // Remove all modal-related classes and attributes
    document.body.classList.remove('modal-open');
    document.body.removeAttribute('data-modal-open');
    
    // Restore bottom navigation
    const bottomNav = document.querySelector('.bottom-nav-fixed');
    if (bottomNav) {
      bottomNav.style.display = '';
      bottomNav.style.visibility = '';
      bottomNav.style.opacity = '';
      bottomNav.style.transform = '';
      bottomNav.style.transition = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      document.body.removeAttribute('data-modal-open');
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = '';
        bottomNav.style.visibility = '';
        bottomNav.style.opacity = '';
        bottomNav.style.transform = '';
        bottomNav.style.transition = '';
      }
    };
  }, []);

  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};
