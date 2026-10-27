const CACHE = 'pat-cognefoudre-v9';
const MOODS = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'logic.js', 'data.js', 'pet.js', 'voice.js', 'audio/liste.js', 'audio/liste.json', 'avatar.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'img/lynx.jpg',
  ...MOODS.map((m) => `video/pat-${m}.jpg`),
];
const isVideo = (url) => /\/video\/pat-[a-z]+-(repos|parle)\.(webm|mp4)$/.test(new URL(url).pathname);
// Campagne « L'année du Lapin » (ligne séparée : le fichier sw.js modifié suffit à réinstaller le cache).
ASSETS.push('campagne.js', 'campagne-ui.js', 'campagne.css', 'fullscreen.js');
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
// La page indique le format vidéo lu par le navigateur (webm ou mp4) : on garde hors ligne les boucles demandées (les autres sont gardées dès leur première lecture).
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
