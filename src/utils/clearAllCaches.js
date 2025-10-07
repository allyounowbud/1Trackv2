// Utility to clear all caches and force fresh API requests
import apiCacheService from '../services/apiCacheService';
import searchCacheService from '../services/searchCacheService';

export const clearAllCaches = async () => {
  try {
    console.log('🗑️ Clearing all caches...');
    
    // Clear API cache
    apiCacheService.clear();
    console.log('✅ API cache cleared');
    
    // Clear search cache
    await searchCacheService.forceClearAllCache();
    console.log('✅ Search cache cleared');
    
    // Clear local storage cache
    localStorage.removeItem('scrydex_cache');
    localStorage.removeItem('search_cache');
    console.log('✅ Local storage cache cleared');
    
    // Clear session storage
    sessionStorage.clear();
    console.log('✅ Session storage cleared');
    
    // Clear service worker cache if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ Service worker caches cleared');
    }
    
    console.log('🎉 All caches cleared successfully!');
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

