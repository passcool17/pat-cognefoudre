// Pat « réaliste » : vidéo en boucle par humeur + mâchoire animée par-dessus quand il parle.
// API : mountAvatar(hôte, humeur), setAvatarMood(humeur), avatarTalk(true|false), attachAudio(<audio>).
// La voix peut aussi annoncer son élément audio : window.dispatchEvent(new CustomEvent('pat:audio', { detail: audio })).
import { TRACKS } from './avatar-tracks.js';

const MOOD_LIST = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
const W_MOUTH = 0.105; // largeur de la bouche, en fraction de la largeur de l'image (échelle 1)
const reduceMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => reduceMQ.matches;
export const videoUrl = (mood, ext) => `video/pat-${mood}.${ext}`;
export const posterUrl = (mood) => `video/pat-${mood}.jpg`;

const st = {
  root: null, frame: null, canvas: null, ctx: null, off: null, offCtx: null,
  mood: null, video: null, posters: {}, talking: false, talkT0: 0, open: 0, level: 0,
  actx: null, analyser: null, buf: null, audio: null, sources: new WeakMap(), raf: 0, frames: 0, maxOpen: 0, ext: null,
};

// Ancre bouche au temps t (interpolation linéaire, boucle).
export function anchorAt(mood, t) {
  const tr = TRACKS[mood] || TRACKS.content;
  const n = tr.pts.length;
  const f = ((t * tr.fps) % n + n) % n;
  const i = Math.floor(f); const k = f - i;
  const a = tr.pts[i]; const b = tr.pts[(i + 1) % n];
  return a.map((v, j) => v + (b[j] - v) * k);
}
// Ouverture de bouche (0..1) à partir du niveau sonore RMS (0..~0.4).
export function openFromLevel(rms) { return Math.max(0, Math.min(1, (rms - 0.015) * 7)); }
// Ouverture simulée (voix système ou bulle muette) : syllabes ~5 par seconde.
export function timedOpen(ms) {
  const t = ms / 1000;
  const syl = Math.max(0, Math.sin(t * Math.PI * 2 * 2.6) * 0.6 + Math.sin(t * Math.PI * 2 * 4.3 + 1.3) * 0.4);
  const breath = Math.sin(t * Math.PI * 0.7) > -0.85 ? 1 : 0.2; // petites pauses
  return Math.min(1, syl * 1.15 * breath);
}

function makeVideo(mood) {
  const v = document.createElement('video');
  v.className = 'pat-v';
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.poster = posterUrl(mood);
  v.preload = reduced() ? 'none' : 'auto';
  v.dataset.mood = mood;
  for (const [ext, type] of [['webm', 'video/webm; codecs="vp9"'], ['mp4', 'video/mp4; codecs="avc1.4D401F"']]) {
    const s = document.createElement('source'); s.src = videoUrl(mood, ext); s.type = type; v.appendChild(s);
  }
  v.addEventListener('loadeddata', () => precacheFormat(v), { once: true });
  v.addEventListener('error', () => {}, true);
  return v;
}
// Une fois le format choisi par le navigateur, le service worker garde les 6 vidéos hors ligne.
function precacheFormat(v) {
  const ext = /\.webm(\?|$)/.test(v.currentSrc) ? 'webm' : 'mp4';
  if (st.ext === ext) return;
  st.ext = ext;
  const urls = MOOD_LIST.map((m) => videoUrl(m, ext));
  navigator.serviceWorker?.ready?.then((reg) => reg.active?.postMessage({ type: 'precache', urls })).catch(() => {});
}
function poster(mood) {
  if (!st.posters[mood]) { const im = new Image(); im.src = posterUrl(mood); st.posters[mood] = im; }
  return st.posters[mood];
}
function playSafe(v) { if (reduced()) return; const p = v.play?.(); p?.catch?.(() => {}); }

function build() {
  const root = document.createElement('span');
  root.className = 'pat-av';
  root.innerHTML = '<span class="pat-av-frame"><canvas class="pat-mouth" aria-hidden="true"></canvas></span>';
  st.root = root;
  st.frame = root.firstChild;
  st.canvas = root.querySelector('canvas');
  st.ctx = st.canvas.getContext('2d');
  st.off = document.createElement('canvas');
  st.offCtx = st.off.getContext('2d');
  window.__patAvatar = { get mood() { return st.mood; }, get open() { return st.open; }, get maxOpen() { return st.maxOpen; }, get frames() { return st.frames; }, get source() { return st.audio && !st.audio.paused && st.sources.has(st.audio) ? 'audio' : 'timed'; }, get talking() { return st.talking; }, resetMax() { st.maxOpen = 0; } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st.video) playSafe(st.video); });
}

export function mountAvatar(host, mood = 'content') {
  if (!host) return;
  if (!st.root) build();
  if (st.root.parentNode !== host) host.appendChild(st.root);
  setAvatarMood(mood);
  if (st.video) playSafe(st.video); // déplacé dans le DOM : on relance la lecture
}

export function setAvatarMood(mood) {
  if (!st.root) return;
  if (!TRACKS[mood]) mood = 'content';
  st.root.dataset.mood = mood;
  if (mood === st.mood && st.video) return;
  st.mood = mood;
  poster(mood);
  const old = st.video;
  const v = makeVideo(mood);
  st.video = v;
  st.frame.insertBefore(v, st.canvas);
  const show = () => {
    if (st.video !== v) return;
    v.classList.add('on');
    if (old) setTimeout(() => old.remove(), 450);
  };
  if (!old || reduced()) show();
  else { v.addEventListener('playing', show, { once: true }); setTimeout(show, 900); }
  playSafe(v);
  if (reduced() && old) old.remove();
  kick();
}

// ---------- voix → bouche ----------
function ensureCtx() {
  if (st.actx) return st.actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    st.actx = new AC();
    st.analyser = st.actx.createAnalyser();
    st.analyser.fftSize = 512;
    st.analyser.smoothingTimeConstant = 0.3;
    st.buf = new Uint8Array(st.analyser.fftSize);
    st.analyser.connect(st.actx.destination);
  } catch { st.actx = null; }
  return st.actx;
}
// Le contexte audio doit être créé/relancé pendant un geste (iPhone, Chrome).
function unlockAudio() { const c = ensureCtx(); c?.resume?.().catch(() => {}); }
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  window.addEventListener('keydown', unlockAudio, true);
  window.addEventListener('pat:audio', (e) => { if (e.detail) attachAudio(e.detail); });
}

// Branche un élément audio sur l'analyseur. Sans contexte actif (aucun geste encore), on n'y touche pas :
// la voix reste audible et la bouche passe en mode minuté.
export function attachAudio(audio) {
  st.audio = audio || null;
  if (!audio) return false;
  try {
    if (!st.sources.has(audio)) {
      const g = audio.__patGraph; // graphe déjà créé par voice.js : un élément n'accepte qu'une seule source
      if (g?.ctx && g?.node) {
        const an = g.ctx.createAnalyser();
        an.fftSize = 512; an.smoothingTimeConstant = 0.3;
        g.node.connect(an);
        const mute = g.ctx.createGain(); mute.gain.value = 0; an.connect(mute); mute.connect(g.ctx.destination);
        st.sources.set(audio, { ctx: g.ctx, an, buf: new Uint8Array(an.fftSize) });
      } else {
        const c = ensureCtx();
        if (!c || c.state !== 'running') return false;
        c.createMediaElementSource(audio).connect(st.analyser);
        st.sources.set(audio, { ctx: c, an: st.analyser, buf: st.buf });
      }
    }
  } catch { return false; }
  if (!st.talking) avatarTalk(true);
  const end = () => { if (st.audio === audio) avatarTalk(false); };
  audio.addEventListener('ended', end, { once: true });
  return true;
}

export function avatarTalk(on) {
  st.talking = !!on;
  if (on) { st.talkT0 = performance.now(); st.maxOpen = 0; }
  st.root?.classList.toggle('talking', st.talking);
  kick();
}

function audioLevel() {
  const a = st.audio;
  const t = a && !a.paused ? st.sources.get(a) : null;
  if (!t || t.ctx.state !== 'running') return null;
  t.an.getByteTimeDomainData(t.buf);
  let sum = 0;
  for (let i = 0; i < t.buf.length; i++) { const x = (t.buf[i] - 128) / 128; sum += x * x; }
  return Math.sqrt(sum / t.buf.length);
}

function kick() { if (!st.raf && st.root) st.raf = requestAnimationFrame(tick); }
function tick() {
  st.raf = 0;
  if (!st.root?.isConnected) return;
  let target = 0;
  if (st.talking) {
    const lv = audioLevel();
    target = lv == null ? timedOpen(performance.now() - st.talkT0) : openFromLevel(lv);
  }
  // attaque rapide, relâchement plus doux
  st.open += (target - st.open) * (target > st.open ? 0.55 : 0.3);
  if (st.open < 0.004) st.open = 0;
  if (st.talking) st.maxOpen = Math.max(st.maxOpen, st.open);
  draw();
  if (st.talking || st.open > 0) kick();
}

function sizeCanvas() {
  const r = st.frame.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)); const h = Math.max(1, Math.round(r.height * dpr));
  if (st.canvas.width !== w || st.canvas.height !== h) { st.canvas.width = w; st.canvas.height = h; }
  return [w, h];
}

function draw() {
  const [cw, ch] = sizeCanvas();
  const c = st.ctx;
  c.clearRect(0, 0, cw, ch);
  st.frames++;
  const o = st.open;
  if (o <= 0) return;
  const v = st.video;
  const live = v && !reduced() && v.readyState >= 2 && v.videoWidth;
  const src = live ? v : poster(st.mood);
  const sw0 = live ? v.videoWidth : src.naturalWidth; const sh0 = live ? v.videoHeight : src.naturalHeight;
  if (!sw0 || !sh0) return;
  const t = live ? v.currentTime : TRACKS[st.mood].poster;
  const [ax, ay, s, conf] = anchorAt(st.mood, t);
  const alpha = Math.max(0, Math.min(1, (conf - 0.45) / 0.15)); // suivi incertain (tête tournée) : bouche discrète
  if (alpha <= 0) return;
  c.globalAlpha = alpha;
  const cx = ax * cw; const cy = ay * ch;
  const wc = W_MOUTH * s * cw; // largeur bouche à l'écran
  const ws = W_MOUTH * s * sw0; // largeur bouche dans la vidéo
  const drop = o * 0.34 * wc;
  // 1) intérieur de la gueule (fondu quand elle est presque fermée)
  c.save();
  c.globalAlpha = alpha * Math.min(1, o * 3.5);
  c.translate(cx + wc * 0.02, cy + drop * 0.42);
  const ry = drop * 0.62 + 1;
  c.scale(1, Math.max(0.04, ry / (wc * 0.44)));
  const g = c.createRadialGradient(0, 0, 0, 0, 0, wc * 0.44);
  g.addColorStop(0, 'rgba(22,4,8,1)'); g.addColorStop(0.6, 'rgba(48,12,20,.95)'); g.addColorStop(1, 'rgba(60,20,30,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, wc * 0.44, 0, Math.PI * 2); c.fill();
  // langue, seulement bouche bien ouverte
  if (o > 0.35) {
    const tg = c.createRadialGradient(wc * 0.03, wc * 0.26, 0, wc * 0.03, wc * 0.26, wc * 0.2);
    tg.addColorStop(0, `rgba(140,52,64,${0.6 * Math.min(1, (o - 0.35) * 2.5)})`); tg.addColorStop(1, 'rgba(110,40,52,0)');
    c.fillStyle = tg;
    c.beginPath(); c.arc(wc * 0.03, wc * 0.26, wc * 0.2, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  c.globalAlpha = alpha;
  // 2) mâchoire : le menton de l'image courante, abaissé, aux bords fondus
  const pw = 1.3; const ph = 0.8; const top = 0.02;
  const ow = Math.max(2, Math.round(wc * pw)); const oh = Math.max(2, Math.round(wc * ph));
  if (st.off.width !== ow || st.off.height !== oh) { st.off.width = ow; st.off.height = oh; }
  const oc = st.offCtx;
  oc.globalCompositeOperation = 'source-over';
  oc.clearRect(0, 0, ow, oh);
  oc.drawImage(src, ax * sw0 - ws * pw / 2, ay * sh0 - ws * top, ws * pw, ws * ph, 0, 0, ow, oh);
  oc.globalCompositeOperation = 'destination-in';
  oc.save();
  oc.translate(ow / 2, oh * 0.42); oc.scale(1, (oh * 0.62) / (ow / 2));
  const m = oc.createRadialGradient(0, 0, 0, 0, 0, ow / 2);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  oc.fillStyle = m; oc.fillRect(-ow, -ow, ow * 2, ow * 2);
  oc.restore();
  c.drawImage(st.off, cx - ow / 2, cy - wc * top + drop);
  c.globalAlpha = 1;
}
