// Musique de fond « Snowbound Pass » (passcool17, faite avec Suno), en boucle pendant la partie.
// - Démarre au premier toucher (règles de lecture automatique), volume modeste (28 %).
// - Baisse à 10 % pendant que Pat parle (événement pat:voix de voice.js, chaînes numérotées comprises),
//   rampes de 300 ms, puis remonte.
// - Coupée quand l'onglet/l'app est cachée, reprise au retour.
// - Web Audio : boucle sans blanc (AudioBufferSourceNode) et volume par GainNode (iPhone : le volume d'un
//   élément <audio> n'y est pas réglable). Sans Web Audio : élément <audio loop> et son volume.
// Réglages (marche/arrêt, volume) gardés dans localStorage, indépendants de la voix.
export const MUSIC_URL = 'music/musique-fond.mp3';
export const MUSIC_KEY = 'pat-cognefoudre:musique';
export const DUCK_LEVEL = 0.1;
export const RAMP_S = 0.3;
const load = () => { try { return JSON.parse(localStorage.getItem(MUSIC_KEY)) || {}; } catch { return {}; } };
export const musicSettings = Object.assign({ on: true, volume: 0.28 }, load());
export function saveMusic() { try { localStorage.setItem(MUSIC_KEY, JSON.stringify({ on: musicSettings.on, volume: musicSettings.volume })); } catch { /* stockage plein */ } }

// Volume voulu maintenant (0 si coupée ; plafonné à DUCK_LEVEL pendant que Pat parle).
export function musicTarget({ on, volume }, ducked) {
  if (!on) return 0;
  const v = Math.max(0, Math.min(1, Number(volume) || 0));
  return ducked ? Math.min(v, DUCK_LEVEL) : v;
}
// Bornes de boucle : on saute les échantillons muets ajoutés par l'encodeur mp3 au début et à la fin.
export function loopBounds(data, sampleRate, eps = 1e-4) {
  let a = 0; let b = data.length - 1;
  while (a < b && Math.abs(data[a]) < eps) a++;
  while (b > a && Math.abs(data[b]) < eps) b--;
  return { start: a / sampleRate, end: (b + 1) / sampleRate };
}

const st = { unlocked: false, ducked: false, ctx: null, gain: null, buffer: null, loading: null, src: null, el: null, mode: null, suspendTimer: null };
const AC = () => (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
const hidden = () => typeof document !== 'undefined' && document.hidden;
const wanted = () => musicSettings.on && st.unlocked && !hidden();

function decode(ctx, buf) {
  return new Promise((res, rej) => { const p = ctx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
}
async function loadBuffer() {
  if (st.buffer) return st.buffer;
  if (!st.loading) {
    st.loading = fetch(MUSIC_URL).then((r) => { if (!r.ok) throw new Error(`musique ${r.status}`); return r.arrayBuffer(); })
      .then((b) => decode(st.ctx, b)).then((buf) => { st.buffer = buf; return buf; })
      .catch((e) => { st.loading = null; throw e; });
  }
  return st.loading;
}

// Applique le volume voulu, en rampe douce.
function apply(ramp = RAMP_S) {
  const t = wanted() ? musicTarget(musicSettings, st.ducked) : 0;
  if (st.gain) {
    const g = st.gain.gain; const now = st.ctx.currentTime;
    try { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(t, now + ramp); } catch { g.value = t; }
  } else if (st.el) {
    fadeEl(t, ramp);
  }
}
let fadeTimer = null;
function fadeEl(t, ramp) {
  clearInterval(fadeTimer);
  const el = st.el; const from = el.volume; const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (ramp * 1000));
    try { el.volume = from + (t - from) * k; } catch { /* volume en lecture seule (iPhone) */ }
    if (k >= 1) clearInterval(fadeTimer);
  }, 30);
}

async function startWebAudio() {
  if (!st.ctx) {
    st.ctx = new (AC())();
    st.gain = st.ctx.createGain();
    st.gain.gain.value = 0;
    st.gain.connect(st.ctx.destination);
  }
  clearTimeout(st.suspendTimer);
  st.ctx.resume?.().catch(() => {});
  if (st.src) { apply(); return; }
  const buf = await loadBuffer();
  if (st.src || !wanted()) return;
  const src = st.ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const { start, end } = loopBounds(buf.getChannelData(0), buf.sampleRate);
  src.loopStart = start; src.loopEnd = end;
  src.connect(st.gain);
  src.start(0, start);
  st.src = src;
  apply(0.8); // entrée en douceur
}
function startElement() {
  if (!st.el) {
    st.el = new Audio(MUSIC_URL);
    st.el.loop = true; st.el.preload = 'auto';
    try { st.el.volume = 0; } catch { /* */ }
  }
  const p = st.el.play();
  if (p && p.catch) p.catch(() => {});
  apply(0.8);
}
function start() {
  if (!wanted()) return;
  if (st.mode === null) st.mode = AC() ? 'webaudio' : 'element';
  if (st.mode === 'webaudio') {
    startWebAudio().catch(() => { st.mode = 'element'; st.gain = null; startElement(); });
  } else startElement();
}
// Coupe : rampe vers 0, puis met en pause (le flux reste prêt pour reprendre au même endroit).
function pause() {
  apply();
  clearTimeout(st.suspendTimer);
  st.suspendTimer = setTimeout(() => {
    if (wanted()) return;
    if (st.ctx) st.ctx.suspend?.().catch(() => {});
    if (st.el) st.el.pause();
  }, RAMP_S * 1000 + 60);
}
function refresh() { if (wanted()) start(); else pause(); }

export function setMusicOn(on) { musicSettings.on = !!on; saveMusic(); refresh(); }
export function setMusicVolume(v) { musicSettings.volume = Math.max(0, Math.min(1, Number(v) || 0)); saveMusic(); apply(0.1); }

let inited = false;
export function initMusic() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  const unlock = () => {
    if (st.unlocked) return;
    st.unlocked = true;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    refresh();
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', refresh);
  // iPhone : une reprise hors geste peut être refusée ; le toucher suivant relance.
  window.addEventListener('pointerdown', () => { if (st.unlocked && wanted() && st.ctx && st.ctx.state !== 'running') start(); }, true);
  window.addEventListener('pat:voix', (e) => { st.ducked = !!e.detail?.on; apply(); });
  window.__patMusic = {
    get mode() { return st.mode; }, get ducked() { return st.ducked; }, get unlocked() { return st.unlocked; },
    get gain() { return st.gain ? st.gain.gain.value : st.el ? st.el.volume : 0; },
    get playing() { return st.mode === 'webaudio' ? !!st.src && st.ctx?.state === 'running' : !!st.el && !st.el.paused; },
    get state() { return st.ctx?.state || null; },
  };
}
