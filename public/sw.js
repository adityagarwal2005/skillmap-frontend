/* DoitHere service worker — makes the app installable + fast on repeat loads.
   Strategy: network-first for navigations (always try fresh HTML, fall back to
   cache when offline); cache-first for static build assets. Deliberately does
   NOT cache API calls (anything under /users, /feed, etc. on the API host is a
   different origin anyway and is left to the network).

   IMPORTANT: cache-first means a static asset, once cached, is never
   re-checked against the network — a stale icon/favicon/manifest will keep
   being served forever otherwise. Bump this version string any time you
   change the CONTENT of a file under public/ that keeps the same filename
   (icons, favicon.ico, manifest.json, robot.png, etc.) — that's what
   actually forces browsers to purge the old cached bytes and refetch. */
/* v5: og-image.png and favicon.ico were still the OLD mark (they were missed
   when the app icons were regenerated), so link previews and the browser tab
   kept showing it. Both reuse their filenames, hence the bump. */
const CACHE = 'doithere-v5';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin requests; let API/CDN traffic pass straight through.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache it).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});

/* ── Web Push ── */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'DoitHere', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'DoitHere';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { try { w.navigate(url); } catch (e) {} return w.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
