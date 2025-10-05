// src/main.jsx
import "./index.css";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "./App.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
// import { startBackgroundPriceService } from "./services/startBackgroundService.js";
import { initializePWA } from "./utils/pwa.js";
import { queryClient } from "./lib/queryClient.js";
// Initialize PWA features
initializePWA();

// PWA Loading Wrapper Component
function PWALoadingWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true ||
                      document.referrer.includes('android-app://');
    
    setIsPWA(isPWAMode);

    // Show loading screen for a minimum time for PWA
    const minLoadingTime = isPWAMode ? 2000 : 500; // 2 seconds for PWA, 0.5 for web
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading && isPWA) {
    return <LoadingScreen message="Loading your collection..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

// Export for Fast Refresh compatibility
export default PWALoadingWrapper;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PWALoadingWrapper />
  </React.StrictMode>
);
