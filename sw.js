/* Offline shell for MakerCode AI.
   Bump CACHE whenever you deploy a change, so returning users get the new
   files instead of the cached ones. */
var CACHE = 'makercode-ai-v2';

var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  /* Never cache the Gemini API or the editor CDN. */
  if (url.hostname.indexOf('googleapis.com') !== -1 || url.hostname.indexOf('jsdelivr.net') !== -1) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var live = fetch(e.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached || caches.match('./index.html'); });
      return cached || live;
    })
  );
});
