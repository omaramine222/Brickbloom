// v6 service worker: instant repeat loads (stale-while-revalidate for assets), network-first for the page.
const C = 'bb-v6', SHELL = ['/', '/style.css?v=6', '/game.js?v=6', '/art.js?v=6', '/sfx.js?v=6', '/logo.svg', '/manifest.json', '/icon.svg', '/icon-192.png', '/fonts/fredoka-600.ttf', '/fonts/fredoka-700.ttf', '/fonts/fredoka-500.ttf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/health')) return;
  const page = e.request.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html');
  if (page) { e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put('/', cp)); return r; }).catch(() => caches.match('/'))); return; }
  e.respondWith(caches.open(C).then(c => c.match(e.request).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit); return hit || net; })));
});
