// Utility to clear all caches and force fresh API requests
import apiCacheService from '../services/apiCacheService';
import searchCacheService from '../services/searchCacheService';

export const clearAllCaches = async () => {
  try {
    
    // Clear API cache
    apiCacheService.clear();
    
    // Clear search cache
    await searchCacheService.forceClearAllCache();
    
    // Clear local storage cache
    localStorage.removeItem('scrydex_cache');
    localStorage.removeItem('search_cache');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear service worker cache if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  window.clearAllCaches = clearAllCaches;
}

