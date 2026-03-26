const APP_CACHE = 'aldr-app-v1';
const RUNTIME_CACHE = 'aldr-runtime-v1';

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/main.js',
  '/converter.js',
  '/manifest.webmanifest',
  '/logo.png',
  '/assets/defaultThumbnail.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png',
  '/assets/icons/icon-512-maskable.png',
  '/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== APP_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

function isSheetCsvRequest(requestUrl) {
  const isDocsSheet = requestUrl.hostname === 'docs.google.com' && requestUrl.pathname.includes('/spreadsheets/');
  const isCsvOutput = requestUrl.searchParams.get('output') === 'csv';
  return isDocsSheet && isCsvOutput;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isSheetCsvRequest(url)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, APP_CACHE));
  }
});
