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

// Start background price service
// startBackgroundPriceService();

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
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PWALoadingWrapper />);
