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

  const openModal = useCallback((buttons = null) => {
    setIsModalOpen(true);
    setCustomBottomButtons(buttons);
    
    // Single strategy: Use CSS class only to avoid conflicts
    document.body.classList.add('modal-open');
  }, []);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCustomBottomButtons(null);
    
    // Clean up modal state
    document.body.classList.remove('modal-open');
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
