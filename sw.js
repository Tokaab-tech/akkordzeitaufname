const cacheName = "akkordzeit-v16";
const appFiles = [
  "./",
  "./index.html",
  "./monthly.html",
  "./styles.css",
  "./app.js",
  "./monthly.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appFiles)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((name) => name !== cacheName)
        .map((name) => caches.delete(name)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open(cacheName).then((cache) => (
      cache.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
    )),
  );
});
