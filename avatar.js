// Pat peint (boucles de Créa) : par humeur, une boucle « repos » et une boucle « parle » (bouche animée, même cadrage).
// Deux vidéos superposées : fondu d'environ 200 ms entre repos ↔ parle et entre humeurs.
// API : mountAvatar(hôte, humeur), setAvatarMood(humeur), avatarTalk(true|false).
// v1.9.0 : bouche qui suit la voix. Une 3e vidéo « bouche » (même boucle que « repos », bouche ouverte, faite par
// tools/bouche/bouche.py à partir des boucles peintes) est superposée à « repos » ; son opacité suit les repères
// Rhubarb de la réplique (levres.js). Sans repères (synthèse de l'appareil, muet), l'ancienne boucle « parle » reste.
// La voix annonce aussi le début et la fin d'une réplique audio (y compris une chaîne de segments) :
// window.dispatchEvent(new CustomEvent('pat:voix', { detail: { on: true|false } })).
export const MOOD_LIST = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
export const FADE_MS = 200;
const reduceMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => reduceMQ.matches;
export const clipName = (mood, talking) => `${mood}-${talking ? 'parle' : 'repos'}`;
export const videoUrl = (clip, ext) => `video/pat-${clip}.${ext}`;
import { cues, idFromSrc, shapeAt, OUVERTURE } from './levres.js';
export const posterUrl = (mood) => `video/pat-${mood}.jpg`;
const FORMATS = [['webm', 'video/webm; codecs="vp9"'], ['mp4', 'video/mp4; codecs="avc1.4D401F"']];

const st = {
  root: null, frame: null, poster: null, layers: [], front: 0,
  mood: null, talkFlag: false, voiceOn: false, clip: null, ext: null, gen: 0, switches: [], failed: false,
  mouth: null, lips: false, audio: null, level: 0, shape: 'X', raf: 0, shapes: [], suspended: false,
};
const talking = () => (st.talkFlag || st.voiceOn) && !st.lips;

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
  const urls = [clipName('content', false), clipName('content', true), 'content-bouche'].map((c) => videoUrl(c, ext));
  navigator.serviceWorker?.ready?.then((reg) => reg.active?.postMessage({ type: 'precache', urls })).catch(() => {});
}
function playSafe(v) { if (reduced() || st.suspended) return Promise.resolve(false); const p = v.play?.(); return p?.then ? p.then(() => true, () => false) : Promise.resolve(true); }

function build() {
  const root = document.createElement('span');
  root.className = 'pat-av';
  root.innerHTML = '<span class="pat-av-frame"><img class="pat-poster" alt="" aria-hidden="true"></span>';
  st.root = root;
  st.frame = root.firstChild;
  st.poster = root.querySelector('img');
  st.layers = [makeLayer(), makeLayer()];
  st.mouth = makeLayer();
  st.mouth.classList.add('pat-bouche');
  st.frame.append(...st.layers, st.mouth);
  window.__patAvatar = {
    get mood() { return st.mood; }, get clip() { return st.clip; }, get talking() { return talking(); },
    get shown() { const l = st.layers[st.front]; return l.classList.contains('on') ? l.dataset.clip : null; },
    get switches() { return st.switches.slice(); }, get failed() { return st.failed; },
    get lips() { return st.lips; }, get shape() { return st.shape; }, get mouth() { return st.level; },
    get shapes() { return st.shapes.slice(); }, get suspended() { return st.suspended; },
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
  load(st.mouth, `${mood}-bouche`);
  update();
}
// Attend la fin de la tâche en cours : speak() suit avatarTalk(true) et annonce s'il y a des repères de bouche.
export function avatarTalk(on) { st.talkFlag = !!on; if (on) queueMicrotask(update); else update(); }
// v1.10.0 : quand Pat Rive (avatar-rive.js) est affiché, les vidéos se mettent en pause (batterie) ;
// on les relance si Rive tombe en panne.
export function suspendVideo(on) {
  on = !!on;
  if (on === st.suspended) return;
  st.suspended = on;
  if (on) { for (const v of [...st.layers, st.mouth]) v?.pause?.(); if (st.mouth) st.mouth.style.opacity = '0'; }
  else { st.clip = null; update(); }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pat:voix', (e) => {
    st.voiceOn = !!e.detail?.on;
    const ids = e.detail?.ids;
    st.lips = st.voiceOn && !reduced() && Array.isArray(ids) && ids.length > 0 && ids.every((id) => cues(id));
    if (st.lips) startLips();
    update();
  });
  window.addEventListener('pat:audio', (e) => { st.audio = e.detail || null; });
}

// ---------- Bouche synchronisée ----------
function startLips() {
  if (st.raf || !st.mouth || st.suspended) return;
  st.mouth.play?.()?.catch?.(() => {});
  st.raf = requestAnimationFrame(lipFrame);
}
function lipFrame() {
  const a = st.audio;
  let target = 0;
  st.shape = 'X';
  if (st.lips && a && !a.paused && !a.ended) {
    st.shape = shapeAt(cues(idFromSrc(a.currentSrc || a.src)), a.currentTime);
    target = OUVERTURE[st.shape] ?? 0;
  }
  // Ouverture rapide, fermeture un peu plus douce (moins saccadé).
  st.level += (target - st.level) * (target > st.level ? 0.6 : 0.45);
  if (st.level < 0.02 && target === 0) st.level = 0;
  // Même instant de boucle que la vidéo affichée (repos) : la tête ne bouge pas, seule la bouche change.
  const base = st.layers[st.front];
  if (base && st.mouth.duration && base.duration && Math.abs(st.mouth.currentTime - base.currentTime) > 0.08) {
    try { st.mouth.currentTime = base.currentTime; } catch { /* */ }
  }
  st.mouth.style.opacity = String(Math.round(st.level * 100) / 100);
  if (st.shapes[st.shapes.length - 1] !== st.shape) { st.shapes.push(st.shape); if (st.shapes.length > 200) st.shapes.shift(); }
  if (st.lips || st.level > 0) st.raf = requestAnimationFrame(lipFrame);
  else { st.raf = 0; st.shape = 'X'; st.mouth.style.opacity = '0'; st.mouth.pause?.(); }
}

// Affiche la boucle voulue (humeur × parle/repos) avec un fondu entre les deux couches.
function update() {
  if (!st.root || !st.mood) return;
  st.root.classList.toggle('talking', talking());
  if (st.suspended) return;
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
  playSafe(next).then((ok) => { if (ok && !next.paused) show(); else if (!ok && !st.suspended) { st.failed = true; } });
  setTimeout(show, 900); // réseau lent : on bascule quand même (l'affiche reste dessous)
}
