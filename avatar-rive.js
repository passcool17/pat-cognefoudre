// v1.10.0 : Pat animé avec Rive (squelette 2D, 19 calques peints par Créa), une scène .riv par humeur.
// Même API que avatar.js (mountAvatar / setAvatarMood / avatarTalk) + avatarReact(nom) pour les réactions.
// - Moteur figé : @rive-app/canvas-lite 2.49.1 copié dans vendor/rive/ (aucun CDN, marche hors ligne).
// - Bouche : nombre « bouche » du modèle de vue Pat (0=X 1=A 2=B 3=C 4=D 5=E 6=F), suivi image par image
//   des repères Rhubarb (audio/bouche.js) pendant la voix enregistrée ; sans repères (voix de l'appareil),
//   la bouche bat au rythme de la parole.
// - Réactions (déclencheurs) : tourPat, points, fureur, gagne, perd. Pat n'est affiché que pendant ton tour :
//   ce qui arrive pendant son tour est gardé et joué dès qu'il réapparaît (la plus forte réaction gagne).
// - Repli : si WebAssembly manque, si le moteur ou le fichier ne se charge pas, ou en mouvement réduit,
//   l'avatar vidéo d'avant (avatar.js) reste tel quel.
import { MOOD_LIST, mountAvatar as mountVideo, setAvatarMood as setVideoMood, avatarTalk as videoTalk, suspendVideo } from './avatar.js';
import { cues, idFromSrc, shapeAt } from './levres.js';

export const RIVE_VERSION = '2.49.1';
export const RIVE_DIR = 'vendor/rive/';
export const riveUrl = (mood) => `rive/pat-${mood}.riv`;
export const RIVE_FILES = MOOD_LIST.map(riveUrl);
export const RIVE_RUNTIME = [`${RIVE_DIR}rive.js`, `${RIVE_DIR}rive.wasm`];
export const MOUTH_INDEX = { X: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 2, H: 3 };
export const REACTIONS = ['tourPat', 'points', 'fureur', 'gagne', 'perd'];
export const PRIO = { tourPat: 1, points: 2, fureur: 3, perd: 4, gagne: 4 };
export const FADE_MS = 220;
const LOAD_TIMEOUT_MS = 8000;
const FAKE = 'BCDBECDCBE'; // parole sans repères : une forme toutes les 110 ms

const reduceMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

// Peut-on tenter Rive ? (?rive=0 force la vidéo, pour comparer ou dépanner)
export function riveSupported(win = globalThis) {
  if (reduceMQ.matches) return 'mouvement réduit';
  if (/[?&]rive=0\b/.test(win.location?.search || '')) return 'désactivé (?rive=0)';
  if (typeof win.WebAssembly !== 'object' || typeof win.WebAssembly.instantiate !== 'function') return 'pas de WebAssembly';
  return '';
}
// Plus forte réaction en attente : gagne/perd > fureur > points > tourPat.
export const stronger = (a, b) => (!a ? b : !b ? a : (PRIO[b] >= PRIO[a] ? b : a));

const R = {
  state: 'off', reason: '', root: null, frame: null, cur: null, loading: null, gen: 0,
  pending: null, fired: [], loads: [], lips: false, voiceOn: false, talkFlag: false, audio: null,
  shape: 'X', shapes: [], raf: 0, mood: 'content',
};

let runtimeP = null;
function loadRuntime() {
  if (runtimeP) return runtimeP;
  runtimeP = new Promise((res, rej) => {
    if (window.rive?.Rive) return res(window.rive);
    const s = document.createElement('script');
    s.src = `${RIVE_DIR}rive.js`;
    s.onload = () => (window.rive?.Rive ? res(window.rive) : rej(new Error('moteur Rive absent')));
    s.onerror = () => rej(new Error('rive.js introuvable'));
    document.head.appendChild(s);
  }).then((rive) => {
    const abs = (f) => new URL(RIVE_DIR + f, document.baseURI).href;
    rive.RuntimeLoader.setWasmUrl(abs('rive.wasm'));
    rive.RuntimeLoader.setWasmFallbackUrl?.(abs('rive_fallback.wasm')); // sinon : CDN jsdelivr
    return rive;
  });
  return runtimeP;
}

function fail(reason) {
  if (R.state === 'failed') return;
  R.state = 'failed'; R.reason = String(reason?.message || reason || 'erreur');
  R.gen++;
  for (const c of R.frame?.querySelectorAll('canvas.pat-rive') || []) { try { c._rive?.cleanup(); } catch { /* */ } c.remove(); }
  R.cur = null; R.loading = null;
  R.root?.classList.remove('rive-on');
  suspendVideo(false);
  try { console.info('[Pat] Rive indisponible, avatar vidéo :', R.reason); } catch { /* */ }
}

// Charge la scène de l'humeur dans une nouvelle toile, puis fondu par-dessus l'ancienne.
function showMood(mood) {
  if (R.state === 'failed' || !R.frame) return;
  if ((R.cur?.mood === mood && !R.loading) || R.loading === mood) return;
  const my = ++R.gen; R.loading = mood;
  if (R.state === 'off') R.state = 'loading';
  const t0 = performance.now();
  loadRuntime().then((rive) => new Promise((res, rej) => {
    if (my !== R.gen) return rej(null);
    const canvas = document.createElement('canvas');
    canvas.className = 'pat-rive'; canvas.setAttribute('aria-hidden', 'true');
    R.frame.appendChild(canvas);
    const to = setTimeout(() => rej(Object.assign(new Error('délai dépassé'), { canvas })), LOAD_TIMEOUT_MS);
    try {
      canvas._rive = new rive.Rive({
        src: riveUrl(mood), canvas, stateMachines: 'Pat', autoplay: true, autoBind: true,
        layout: new rive.Layout({ fit: rive.Fit.Cover }),
        onLoad: () => { clearTimeout(to); res(canvas); },
        onLoadError: () => { clearTimeout(to); rej(Object.assign(new Error(`${riveUrl(mood)} illisible`), { canvas })); },
      });
    } catch (e) { clearTimeout(to); rej(Object.assign(e, { canvas })); }
  })).then((canvas) => {
    const r = canvas._rive;
    if (my !== R.gen) { r.cleanup(); canvas.remove(); return; }
    const vm = r.viewModelInstance;
    if (!vm?.number('bouche')) throw new Error('modèle de vue Pat absent');
    r.resizeDrawingSurfaceToCanvas();
    const old = R.cur;
    R.cur = { mood, canvas, r, vm }; R.loading = null; R.state = 'on';
    R.loads.push({ mood, ms: Math.round(performance.now() - t0) });
    setShape(R.shape, true);
    requestAnimationFrame(() => canvas.classList.add('on'));
    R.root.classList.add('rive-on');
    suspendVideo(true);
    if (old) setTimeout(() => { try { old.r.cleanup(); } catch { /* */ } old.canvas.remove(); }, FADE_MS + 40);
    if (R.pending) setTimeout(flush, 350);
    if (R.lips || R.voiceOn || R.talkFlag) startMouth();
  }).catch((e) => {
    if (e === null) return; // remplacé par un autre chargement
    if (my !== R.gen) { try { e.canvas?._rive?.cleanup(); } catch { /* */ } e.canvas?.remove(); return; }
    fail(e);
  });
}

function setShape(shape, force = false) {
  if (shape !== R.shape || force) {
    R.shape = shape;
    try { if (R.cur) R.cur.vm.number('bouche').value = MOUTH_INDEX[shape] ?? 0; } catch { /* */ }
    if (R.shapes[R.shapes.length - 1] !== shape) { R.shapes.push(shape); if (R.shapes.length > 200) R.shapes.shift(); }
  }
}
function startMouth() { if (!R.raf && R.state === 'on') R.raf = requestAnimationFrame(mouthFrame); }
function mouthFrame() {
  R.raf = 0;
  const a = R.audio;
  let shape = 'X';
  if (R.lips && a && !a.paused && !a.ended) shape = shapeAt(cues(idFromSrc(a.currentSrc || a.src)), a.currentTime) || 'X';
  else if (!R.lips && (R.voiceOn || R.talkFlag)) shape = FAKE[Math.floor(performance.now() / 110) % FAKE.length];
  setShape(shape);
  if (R.lips || R.voiceOn || R.talkFlag) startMouth(); else setShape('X');
}

function visible() { return R.state === 'on' && R.root?.isConnected && !document.hidden; }
function flush() {
  if (!R.pending || !visible()) return;
  const name = R.pending; R.pending = null;
  try { R.cur.vm.trigger(name).trigger(); R.fired.push({ name, mood: R.cur.mood, t: Math.round(performance.now()) }); } catch { /* */ }
  if (R.fired.length > 50) R.fired.shift();
}

// ---------- API (même forme que avatar.js) ----------
export function mountAvatar(host, mood = 'content') {
  if (!host) return;
  mountVideo(host, mood); // affiche + vidéos : le repli est déjà en place
  R.root = host.querySelector('.pat-av');
  R.frame = R.root?.querySelector('.pat-av-frame');
  if (!R.frame) return;
  if (R.state === 'off') { const why = riveSupported(); if (why) { R.state = 'failed'; R.reason = why; } }
  if (R.state === 'failed') return;
  if (R.state === 'on') { R.root.classList.add('rive-on'); R.cur?.r.resizeDrawingSurfaceToCanvas(); }
  setAvatarMood(mood);
  if (R.pending) setTimeout(flush, 350);
}
export function setAvatarMood(mood) {
  setVideoMood(mood);
  if (!MOOD_LIST.includes(mood)) mood = 'content';
  R.mood = mood;
  showMood(mood);
}
export function avatarTalk(on) {
  videoTalk(on);
  R.talkFlag = !!on;
  if (on) startMouth();
}
// Réaction de Pat : jouée tout de suite s'il est à l'écran, sinon gardée pour son retour.
export function avatarReact(name) {
  if (!REACTIONS.includes(name) || R.state === 'failed') return;
  R.pending = stronger(R.pending, name);
  if (visible()) flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pat:voix', (e) => {
    R.voiceOn = !!e.detail?.on;
    const ids = e.detail?.ids;
    R.lips = R.voiceOn && Array.isArray(ids) && ids.length > 0 && ids.every((id) => cues(id));
    if (R.voiceOn) startMouth();
  });
  window.addEventListener('pat:audio', (e) => { R.audio = e.detail || null; });
  window.addEventListener('resize', () => { try { R.cur?.r.resizeDrawingSurfaceToCanvas(); } catch { /* */ } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && R.pending) setTimeout(flush, 350); });
  window.__patRive = {
    get state() { return R.state; }, get reason() { return R.reason; }, get mood() { return R.cur?.mood || null; },
    get loading() { return R.loading; }, get shape() { return R.shape; }, get shapes() { return R.shapes.slice(); },
    get bouche() { try { return R.cur?.vm.number('bouche').value; } catch { return null; } },
    get fired() { return R.fired.slice(); }, get pending() { return R.pending; }, get loads() { return R.loads.slice(); },
    get lips() { return R.lips; }, get canvases() { return R.frame?.querySelectorAll('canvas.pat-rive').length || 0; },
    react: avatarReact,
  };
}
