import React, { createContext, useContext, useState, useEffect } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
    // Add class to body for mobile Safari compatibility
    document.body.classList.add('modal-open');
    
    // Force a re-render of the bottom navigation on mobile
    const bottomNav = document.querySelector('.bottom-nav-fixed');
    if (bottomNav) {
      bottomNav.style.display = 'none';
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    // Remove class from body
    document.body.classList.remove('modal-open');
    
    // Restore bottom navigation on mobile
    const bottomNav = document.querySelector('.bottom-nav-fixed');
    if (bottomNav) {
      bottomNav.style.display = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      const bottomNav = document.querySelector('.bottom-nav-fixed');
      if (bottomNav) {
        bottomNav.style.display = '';
      }
    };
  }, []);

  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};
