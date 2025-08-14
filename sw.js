const CACHE_NAME = 'svenska-flashcards-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/data/words.ts',
  '/components/Flashcard.tsx',
  '/components/IconButton.tsx',
  '/components/icons.tsx',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500&family=Inter:wght@400;500;600;700&display=swap'
];

// Install event: open a cache and add all essential assets to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching assets');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache assets during install:', error);
      })
  );
});

// Activate event: clean up old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: handle requests.
// It uses a "stale-while-revalidate" strategy for cached assets.
// It ignores API requests to Gemini, letting the app handle them.
self.addEventListener('fetch', event => {
  // Do not cache requests to the Gemini API
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    // Let the browser handle it, which allows the app's fetch logic to work as intended.
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Fetch from the network in the background to update the cache.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, clone it, and put it in the cache.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.error('Fetch failed; returning offline page instead.', err);
            // If fetch fails (e.g., user is offline) and there's no cache match,
            // you could return a fallback offline page here if you had one.
        });

        // Return the cached response immediately if it exists, otherwise wait for the network.
        return response || fetchPromise;
      });
    })
  );
});