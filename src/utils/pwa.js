// PWA Service Worker Registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
  }
};

// Show update notification
const showUpdateNotification = () => {
  if (confirm('A new version of OneTrack is available. Would you like to update?')) {
    window.location.reload();
  }
};

// Install prompt handling
let deferredPrompt;

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button or notification
    showInstallButton();
  });
  
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButton();
  });
  
  // Hide install button when navigating away from login page
  const handleRouteChange = () => {
    if (window.location.pathname !== '/login') {
      hideInstallButton();
    } else if (deferredPrompt) {
      showInstallButton();
    }
  };
  
  // Listen for route changes (for single-page app navigation)
  window.addEventListener('popstate', handleRouteChange);
};

// Show install button
const showInstallButton = () => {
  // Only show the install button on the login page
  if (window.location.pathname !== '/login') {
    return;
  }
  
  // You can customize this to show an install button in your UI
  
  // Example: Show a custom install button
  const installButton = document.createElement('button');
  installButton.textContent = 'Install OneTrack';
  installButton.className = 'fixed bottom-20 left-4 right-4 bg-indigo-600 text-white py-3 px-4 rounded-lg z-50';
  installButton.id = 'install-button';
  installButton.onclick = installApp;
  
  document.body.appendChild(installButton);
};

// Hide install button
const hideInstallButton = () => {
  const installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.remove();
  }
};

// Install the app
const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallButton();
  }
};

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Get app installation status
export const getAppStatus = () => {
  return {
    isInstalled: isAppInstalled(),
    isOnline: navigator.onLine,
    hasServiceWorker: 'serviceWorker' in navigator
  };
};

// Handle online/offline status
export const setupOnlineStatus = () => {
  const updateOnlineStatus = () => {
    const status = navigator.onLine ? 'online' : 'offline';
    
    // You can show a notification or update UI based on online status
    if (status === 'offline') {
      showOfflineNotification();
    } else {
      hideOfflineNotification();
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check
  updateOnlineStatus();
};

// Show offline notification
const showOfflineNotification = () => {
  // You can customize this to show an offline indicator
};

// Hide offline notification
const hideOfflineNotification = () => {
};


// Initialize PWA features
export const initializePWA = async () => {
  try {
    // TEMPORARILY DISABLED FOR DEBUGGING - Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
      console.log('🔴 ALL SERVICE WORKERS UNREGISTERED FOR DEBUGGING');
    }
    
    // Setup install prompt
    setupInstallPrompt();
    
    // Setup online status
    setupOnlineStatus();
    
  } catch (error) {
    console.error('PWA initialization failed:', error);
  }
};

// Handle unhandled promise rejections (common with service workers)
window.addEventListener('unhandledrejection', (event) => {
  // Check if it's the common service worker message channel error
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message channel closed')) {
    // Suppress this specific error as it's usually harmless
    event.preventDefault();
    return;
  }
  
  // Log other unhandled rejections
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle service worker errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    // Handle service worker messages
  });
  
  navigator.serviceWorker.addEventListener('error', (event) => {
    // Handle service worker errors
    console.error('Service Worker error:', event.error);
  });
}
