const CACHE = 'pat-cognefoudre-v4';
const MOODS = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'logic.js', 'data.js', 'pet.js', 'voice.js', 'avatar.js', 'avatar-tracks.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'img/lynx.jpg',
  ...MOODS.map((m) => `video/pat-${m}.jpg`),
];
const isVideo = (url) => /\/video\/pat-[a-z]+\.(webm|mp4)$/.test(new URL(url).pathname);
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// La page indique le format vidéo lu par le navigateur (webm ou mp4) : on garde ces 6 vidéos hors ligne.
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'precache' || !Array.isArray(e.data.urls)) return;
  const urls = e.data.urls.filter((u) => isVideo(new URL(u, self.registration.scope).href));
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map(async (u) => {
    if (!(await c.match(u))) { const r = await fetch(u); if (r.ok && r.status === 200) await c.put(u, r); }
  }))).catch(() => {}));
});
// Vidéo : réponse complète en cache, découpée pour les requêtes « Range » (Safari/iPhone).
async function videoResponse(req) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(req.url, { ignoreSearch: true });
  if (!full) {
    try {
      const r = await fetch(req.url);
      if (r.ok && r.status === 200) { await cache.put(req.url, r.clone()); full = r; } else return r;
    } catch { return Response.error(); }
  }
  const range = req.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? Number(m[1]) : 0;
  let end = m[2] ? Number(m[2]) : buf.byteLength - 1;
  if (!m[1] && m[2]) { start = Math.max(0, buf.byteLength - Number(m[2])); end = buf.byteLength - 1; }
  end = Math.min(end, buf.byteLength - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buf.byteLength}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': full.headers.get('Content-Type') || 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}
// Stale-while-revalidate : réponse immédiate depuis le cache (hors ligne OK), mise à jour en arrière-plan.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (isVideo(e.request.url)) { e.respondWith(videoResponse(e.request)); return; }
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((res) => {
      if (res.ok && res.status === 200) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await cache.match('index.html')) || Response.error();
  }));
});
