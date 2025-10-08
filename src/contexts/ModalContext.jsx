// Cache bust v2.2.5 - Enhanced Mobile Safari modal fixes
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  const [customBottomButtons, setCustomBottomButtons] = useState(null);
  const isTransitioningRef = React.useRef(false);

  const openModal = useCallback((buttons = null) => {
    if (isTransitioningRef.current) return; // Prevent multiple rapid calls
    
    console.log('ModalContext openModal called with buttons:', buttons);
    isTransitioningRef.current = true;
    setIsModalOpen(true);
    setCustomBottomButtons(buttons);
    
    // Single strategy: Use CSS class only to avoid conflicts
    document.body.classList.add('modal-open');
    
    // Reset transition flag after a brief delay
    setTimeout(() => { isTransitioningRef.current = false; }, 100);
  }, []);
  
  const closeModal = useCallback(() => {
    if (isTransitioningRef.current) return; // Prevent multiple rapid calls
    
    console.log('ModalContext closeModal called');
    isTransitioningRef.current = true;
    setIsModalOpen(false);
    setCustomBottomButtons(null);
    
    // Clean up modal state
    document.body.classList.remove('modal-open');
    
    // Reset transition flag after a brief delay
    setTimeout(() => { isTransitioningRef.current = false; }, 100);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <ModalContext.Provider value={{ 
      isModalOpen, 
      openModal, 
      closeModal, 
      customBottomButtons,
      setCustomBottomButtons 
    }}>
      {children}
    </ModalContext.Provider>
  );
};
