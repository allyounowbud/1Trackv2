import React, { createContext, useContext, useState } from 'react';

const GlobalHeaderContext = createContext();

export const useGlobalHeader = () => {
  const context = useContext(GlobalHeaderContext);
  if (!context) {
    throw new Error('useGlobalHeader must be used within a GlobalHeaderProvider');
  }
  return context;
};

export const GlobalHeaderProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [onSearch, setOnSearch] = useState(null);

  const value = {
    searchQuery,
    setSearchQuery,
    selectedGame,
    setSelectedGame,
    onSearch,
    setOnSearch
  };

  return (
    <GlobalHeaderContext.Provider value={value}>
      {children}
    </GlobalHeaderContext.Provider>
  );
};
