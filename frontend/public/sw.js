// This service worker unregisters itself and clears all caches.
// It exists solely to evict any stale SW that was previously cached
// and was intercepting video/asset requests with 503 Offline errors.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
  );
});
