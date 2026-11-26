// Offline support: the app opens and works with no signal at the gym.
// Page loads try the network first (so updates show up), falling back to the cached copy.
// Build assets have hashed filenames, so they're served cache-first.
const CACHE = 'repquest-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/apple-touch-icon.png', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Leave sign-in (/__/auth), Firebase, and other sites alone.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      withTimeout(fetch(req), 4000)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
