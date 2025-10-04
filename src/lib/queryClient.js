import { QueryClient } from '@tanstack/react-query';

// Create a configured QueryClient with optimized caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 10 minutes
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Cache data for 30 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus (reduces unnecessary calls)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect (reduces unnecessary calls)
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Query key factories for consistent caching
export const queryKeys = {
  // Collection queries
  orders: ['orders'],
  collectionSummary: ['collectionSummary'],
  collectionData: ['collectionData'],
  
  // Market data queries
  marketPrices: (productNames) => ['marketPrices', productNames],
  productMarketData: (productName) => ['productMarketData', productName],
  
  // Search queries
  searchResults: (query, type, sort) => ['searchResults', query, type, sort],
  expansions: ['expansions'],
  expansionCards: (expansionId, sort) => ['expansionCards', expansionId, sort],
  
  // Image queries
  productImages: (productName) => ['productImages', productName],
  
  // API status queries
  apiStatus: ['apiStatus'],
  priceUpdateStatus: ['priceUpdateStatus'],
};

// Helper function to invalidate related queries
export const invalidateRelatedQueries = (queryKey) => {
  queryClient.invalidateQueries({ queryKey });
};

// Helper function to prefetch data
export const prefetchQuery = async (queryKey, queryFn, options = {}) => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};
