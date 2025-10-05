import { createContext, useContext, useState, useEffect } from 'react';
import translationUtils from '../utils/translationUtils.js';
const { getLanguagePreference, setLanguagePreference } = translationUtils;

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [preferredLanguage, setPreferredLanguageState] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load language preference on mount
  useEffect(() => {
    const loadLanguagePreference = () => {
      try {
        const savedLanguage = getLanguagePreference();
        setPreferredLanguageState(savedLanguage);
        console.log('🌐 Loaded language preference:', savedLanguage);
      } catch (error) {
        console.error('Failed to load language preference:', error);
        setPreferredLanguageState('en'); // Default to English
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguagePreference();
  }, []);

  // Update language preference
  const setLanguage = (language) => {
    try {
      if (language === 'en' || language === 'ja') {
        setLanguagePreference(language);
        setPreferredLanguageState(language);
        console.log('🌐 Language preference updated to:', language);
      } else {
        console.warn('Invalid language code:', language);
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  // Toggle between English and Japanese
  const toggleLanguage = () => {
    const newLanguage = preferredLanguage === 'en' ? 'ja' : 'en';
    setLanguage(newLanguage);
  };

  // Get language display name
  const getLanguageDisplayName = (language = preferredLanguage) => {
    switch (language) {
      case 'en':
        return 'English';
      case 'ja':
        return '日本語 (Japanese)';
      default:
        return 'English';
    }
  };

  // Check if current language is Japanese
  const isJapanese = preferredLanguage === 'ja';

  const value = {
    preferredLanguage,
    setLanguage,
    toggleLanguage,
    getLanguageDisplayName,
    isJapanese,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;

