// Pat peint (boucles de Créa) : par humeur, une boucle « repos » et une boucle « parle » (bouche animée, même cadrage).
// Deux vidéos superposées : fondu d'environ 200 ms entre repos ↔ parle et entre humeurs.
// API : mountAvatar(hôte, humeur), setAvatarMood(humeur), avatarTalk(true|false).
// La voix annonce aussi le début et la fin d'une réplique audio (y compris une chaîne de segments) :
// window.dispatchEvent(new CustomEvent('pat:voix', { detail: { on: true|false } })).
export const MOOD_LIST = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
export const FADE_MS = 200;
const reduceMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => reduceMQ.matches;
export const clipName = (mood, talking) => `${mood}-${talking ? 'parle' : 'repos'}`;
export const videoUrl = (clip, ext) => `video/pat-${clip}.${ext}`;
export const posterUrl = (mood) => `video/pat-${mood}.jpg`;
const FORMATS = [['webm', 'video/webm; codecs="vp9"'], ['mp4', 'video/mp4; codecs="avc1.4D401F"']];

const st = {
  root: null, frame: null, poster: null, layers: [], front: 0,
  mood: null, talkFlag: false, voiceOn: false, clip: null, ext: null, gen: 0, switches: [], failed: false,
};
const talking = () => st.talkFlag || st.voiceOn;

function makeLayer() {
  const v = document.createElement('video');
  v.className = 'pat-v';
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.preload = 'auto';
  v.addEventListener('error', () => {}, true);
  return v;
}
// Charge une boucle dans une couche (sans rien faire si elle y est déjà).
function load(v, clip) {
  if (v.dataset.clip === clip) return;
  v.dataset.clip = clip;
  v.replaceChildren(...FORMATS.map(([ext, type]) => {
    const s = document.createElement('source'); s.src = videoUrl(clip, ext); s.type = type; return s;
  }));
  v.load();
  v.addEventListener('loadeddata', () => rememberFormat(v), { once: true });
}
// Hors ligne : le service worker garde chaque boucle lue. On lui demande aussi celles de l'humeur de départ.
function rememberFormat(v) {
  const ext = /\.webm(\?|$)/.test(v.currentSrc) ? 'webm' : 'mp4';
  if (st.ext === ext) return;
  st.ext = ext;
  const urls = [clipName('content', false), clipName('content', true)].map((c) => videoUrl(c, ext));
  navigator.serviceWorker?.ready?.then((reg) => reg.active?.postMessage({ type: 'precache', urls })).catch(() => {});
}
function playSafe(v) { if (reduced()) return Promise.resolve(false); const p = v.play?.(); return p?.then ? p.then(() => true, () => false) : Promise.resolve(true); }

function build() {
  const root = document.createElement('span');
  root.className = 'pat-av';
  root.innerHTML = '<span class="pat-av-frame"><img class="pat-poster" alt="" aria-hidden="true"></span>';
  st.root = root;
  st.frame = root.firstChild;
  st.poster = root.querySelector('img');
  st.layers = [makeLayer(), makeLayer()];
  st.frame.append(...st.layers);
  window.__patAvatar = {
    get mood() { return st.mood; }, get clip() { return st.clip; }, get talking() { return talking(); },
    get shown() { const l = st.layers[st.front]; return l.classList.contains('on') ? l.dataset.clip : null; },
    get switches() { return st.switches.slice(); }, get failed() { return st.failed; },
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) playSafe(st.layers[st.front]); });
}

export function mountAvatar(host, mood = 'content') {
  if (!host) return;
  if (!st.root) build();
  if (st.root.parentNode !== host) host.appendChild(st.root);
  setAvatarMood(mood);
  playSafe(st.layers[st.front]); // déplacé dans le DOM : on relance la lecture
}

export function setAvatarMood(mood) {
  if (!st.root) return;
  if (!MOOD_LIST.includes(mood)) mood = 'content';
  st.root.dataset.mood = mood;
  if (mood !== st.mood) { st.mood = mood; st.poster.src = posterUrl(mood); }
  update();
}
export function avatarTalk(on) { st.talkFlag = !!on; update(); }
if (typeof window !== 'undefined') {
  window.addEventListener('pat:voix', (e) => { st.voiceOn = !!e.detail?.on; update(); });
}

// Affiche la boucle voulue (humeur × parle/repos) avec un fondu entre les deux couches.
function update() {
  if (!st.root || !st.mood) return;
  st.root.classList.toggle('talking', talking());
  const clip = clipName(st.mood, talking());
  if (clip === st.clip) return;
  const prev = st.clip;
  st.clip = clip;
  if (reduced()) return; // mouvement réduit : affiche fixe de l'humeur
  const my = ++st.gen;
  const cur = st.layers[st.front];
  const nextIdx = cur.dataset.clip === clip ? st.front : 1 - st.front;
  const next = st.layers[nextIdx];
  if (next === cur && cur.classList.contains('on')) return;
  load(next, clip);
  // Même humeur (repos ↔ parle, même cadrage) : on reprend au même instant de la boucle.
  const sameMood = prev && prev.split('-')[0] === clip.split('-')[0];
  const sync = () => { if (sameMood && cur !== next && cur.duration && next.duration) { try { next.currentTime = cur.currentTime % next.duration; } catch { /* */ } } };
  let done = false;
  const show = () => {
    if (done || my !== st.gen) return; done = true;
    // La nouvelle boucle apparaît par-dessus ; l'ancienne reste opaque dessous puis disparaît.
    next.classList.add('on', 'top');
    if (cur !== next) {
      cur.classList.remove('top');
      setTimeout(() => { if (st.layers[st.front] !== cur) cur.classList.remove('on'); }, FADE_MS + 20);
    }
    st.front = nextIdx;
    st.switches.push({ clip, t: Math.round(performance.now()) });
    if (st.switches.length > 50) st.switches.shift();
    // Prépare l'autre boucle de la même humeur dans la couche cachée : bascule immédiate au prochain coup.
    if (cur !== next) setTimeout(() => { if (my === st.gen && st.layers[st.front] !== cur) { cur.pause(); load(cur, clipName(st.mood, !talking())); } }, FADE_MS + 50);
  };
  if (next.readyState >= 2) sync(); else next.addEventListener('loadeddata', sync, { once: true });
  next.addEventListener('playing', show, { once: true });
  playSafe(next).then((ok) => { if (ok && !next.paused) show(); else if (!ok) { st.failed = true; } });
  setTimeout(show, 900); // réseau lent : on bascule quand même (l'affiche reste dessous)
}
