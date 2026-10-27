const CACHE = 'pat-cognefoudre-v4';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'logic.js', 'data.js', 'pet.js', 'voice.js', 'audio/liste.js', 'audio/liste.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'img/lynx.jpg',
];
self.addEventListener('install', (e) => {
  // Cœur de l'app, puis toutes les répliques audio (≈ 3 Mo) pour que Pat parle hors ligne.
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(ASSETS);
    const audio = await (await c.match('audio/liste.json')).json();
    await c.addAll(audio);
  }).then(() => self.skipWaiting()));
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
      if (res.status === 200) cache.put(e.request, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) {
      const range = e.request.headers.get('range');
      if (range) return rangeOf(hit, range); // lecture audio (Safari exige une réponse 206)
      e.waitUntil(net);
      return hit;
    }
    return (await net) || (await cache.match('index.html')) || Response.error();
  }));
});
// Sert une plage d'octets d'une réponse en cache (requêtes Range des balises audio).
async function rangeOf(res, header) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(header) || [];
  const start = m[1] ? Number(m[1]) : 0;
  const end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
    },
  });
}
