/**
 * sw.js — offline shell for MakerCode AI.
 *
 * The app shell is cached so the interface, saved projects and the offline
 * example work without a network. API calls are never cached.
 */

// Bump this string whenever you deploy a change, so returning users
// get the new files instead of the cached ones.
const CACHE = 'makercode-ai-v1';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './gemini-service.js',
  './socratic-engine.js',
  './project-store.js',
  './board-profiles.js',
  './microbit-connection.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => { /* a missing optional file must not block install */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache the Gemini API or the Monaco CDN.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('jsdelivr.net')) return;

  // Same-origin: cache first, then network, then refresh the cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetching = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || caches.match('./index.html'));
        return cached || fetching;
      })
    );
  }
});
