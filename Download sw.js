// Fermata's service worker: what lets the site be installed as an app and open without internet.
// Only Fermata's own files are kept (the page, its scripts, icons). YouTube, sign-in and anything else from other
// sites always go straight to the network and are never stored here.
// Network first: when online you always get the newest version; the stored copy is only used offline. Files are
// stored under their address without "?v=…" (publish.sh adds that to scripts), so each file is kept once.
const CACHE = 'fermata-20261120-live-v1-4';
const SHELL = ['index.html', 'privacy.html', 'terms.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'config.js', 'sounds.js', 'logic.js', 'chess.js', 'party.js', 'scores.js', 'scenery.js', 'viz.js', 'app.js', 'focus.js', 'sleep.js', 'schedule.js', 'coins.js', 'break.js',
  'daylog.js', 'day.js', 'scene.js', 'account.js', 'library.js', 'recs.js', 'record.js', 'tour.js', 'glass.js', 'pwa.js'];

self.addEventListener('install', (e) => {
  // Each file on its own, so one that's missing doesn't stop the rest from being stored.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fermata-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// The address a file is stored under: no "?…" or "#…", and a folder means its index.html.
const key = (url) => { const u = new URL(url); u.search = ''; u.hash = ''; if (u.pathname.endsWith('/')) u.pathname += 'index.html'; return u.href; };
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.searchParams.has('lab')) return;   // the hidden experiment page is never stored
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(new Request(req, { cache: 'no-store' }));
      if (res.ok && res.type === 'basic') cache.put(key(req.url), res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(key(req.url)) || (req.mode === 'navigate' && await cache.match(key(self.registration.scope)));
      if (hit) return hit;
      throw err;
    }
  })());
});
