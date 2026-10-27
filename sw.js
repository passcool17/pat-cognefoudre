const CACHE = 'pat-cognefoudre-v3';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'logic.js', 'data.js', 'pet.js', 'voice.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'img/lynx.jpg',
];
// Campagne « L'année du Lapin » (ligne séparée : le fichier sw.js modifié suffit à réinstaller le cache).
ASSETS.push('campagne.js', 'campagne-ui.js', 'campagne.css');
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Stale-while-revalidate : réponse immédiate depuis le cache (hors ligne OK), mise à jour en arrière-plan.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await cache.match('index.html')) || Response.error();
  }));
});
