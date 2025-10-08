const CACHE_NAME = 'onetrack-v2.2.4';
const STATIC_CACHE_NAME = 'onetrack-static-v2.2.4';
const DYNAMIC_CACHE_NAME = 'onetrack-dynamic-v2.2.4';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/search',
  '/settings',
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-96x96.svg'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/.*/,
  /\/supabase\/.*/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        // Suppress caching errors that don't affect functionality
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Only delete caches that don't match current version
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isStaticFile(request)) {
    // Static files - cache first strategy
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(request)) {
    // API requests - network first strategy
    event.respondWith(networkFirst(request));
  } else if (isNavigationRequest(request)) {
    // Navigation requests - network first with offline fallback
    event.respondWith(navigationHandler(request));
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request));
  }
});

// Cache first strategy for static files
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network first strategy for API requests
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - API not available', { status: 503 });
  }
}

// Navigation handler with offline fallback
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - App not available', { status: 503 });
  }
}

// Helper functions
function isStaticFile(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Handle any pending offline actions
    // Add your background sync logic here
  } catch (error) {
    // Suppress background sync errors
  }
}

// Push notifications
// Handle messages from main thread
self.addEventListener('message', (event) => {
  // Handle messages from the main thread
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Send response back to prevent message channel errors
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ success: true });
  }
});

// Enhanced push notification handler
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'OneTrack',
    body: 'New update available',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      type: 'general'
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      // Fallback to text data
      notificationData.body = event.data.text();
    }
  }

  // Add actions based on notification type
  if (notificationData.data.type === 'price-alert') {
    notificationData.actions = [
      {
        action: 'view-card',
        title: 'View Card',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-96x96.svg'
      }
    ];
  } else if (notificationData.data.type === 'collection-update') {
    notificationData.actions = [
      {
        action: 'view-collection',
        title: 'View Collection',
        icon: '/icons/icon-96x96.svg'
      }
    ];
  } else if (notificationData.data.type === 'app-update') {
    notificationData.actions = [
      {
        action: 'refresh',
        title: 'Refresh App',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'later',
        title: 'Later',
        icon: '/icons/icon-96x96.svg'
      }
    ];
  } else {
    // Default actions
    notificationData.actions = [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.svg'
      }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  const notificationId = notificationData.notificationId;

  // Mark notification as read when clicked
  if (notificationId) {
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ 
            type: 'MARK_NOTIFICATION_READ', 
            notificationId: notificationId 
          });
        });
      })
    );
  }

  // Handle different notification types and actions
  if (action === 'view-card' && notificationData.type === 'price-alert') {
    // Open app to specific card
    event.waitUntil(
      clients.openWindow(`/search?q=${encodeURIComponent(notificationData.cardName)}`)
    );
  } else if (action === 'view-collection' || action === 'explore') {
    // Open collection page
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (action === 'refresh' && notificationData.type === 'app-update') {
    // Refresh the app
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'REFRESH_APP' });
        });
        return clients.openWindow('/');
      })
    );
  } else if (action === 'later' || action === 'dismiss' || action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});