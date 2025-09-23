// src/main.jsx
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "./App.jsx";
import { startBackgroundPriceService } from "./services/startBackgroundService.js";
import { initializePWA } from "./utils/pwa.js";
import { queryClient } from "./lib/queryClient.js";

// Start background price service
startBackgroundPriceService();

// Initialize PWA features
initializePWA();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
