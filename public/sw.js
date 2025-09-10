// Basic service worker for PWA functionality.

const CACHE_NAME = 'verdant-view-cache-v1';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    // Add other assets that should be cached here.
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // IMPORTANT: Clone the request. A request is a stream and
                // can only be consumed once. Since we are consuming this
                // once by cache and once by the browser for fetch, we need
                // to clone the response.
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});


// Handle notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Add logic to handle notification clicks, e.g., open the app
  event.waitUntil(
    clients.openWindow('/')
  );
});

// This is a placeholder for periodic sync to check for reminders.
// This requires more advanced setup with server-side push notifications for reliability.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    // event.waitUntil(checkRemindersAndShowNotifications());
    console.log('Periodic sync event for reminders fired.');
  }
});
