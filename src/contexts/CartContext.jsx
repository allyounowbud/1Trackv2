import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const openCartMenu = () => setIsCartMenuOpen(true);
  const closeCartMenu = () => setIsCartMenuOpen(false);
  const enterMultiSelectMode = () => setIsMultiSelectMode(true);
  const exitMultiSelectMode = () => setIsMultiSelectMode(false);

  const value = {
    isCartMenuOpen,
    isMultiSelectMode,
    openCartMenu,
    closeCartMenu,
    enterMultiSelectMode,
    exitMultiSelectMode
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
