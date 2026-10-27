// Voix de Pat.
// 1) Répliques pré-enregistrées (audio/<id>.mp3, voix ElevenLabs « C » faite par le bot Voix),
//    mises en cache par le service worker : fonctionne hors ligne et dans tous les navigateurs.
//    Répliques avec un nombre : chaîne « début » + « nombre-N » + « fin » (petit silence entre les segments).
// 2) Secours : synthèse vocale de l'appareil (Web Speech API) si un fichier manque.
// La bulle de texte reste toujours affichée.
import { AUDIO_IDS } from './audio/liste.js';

const VKEY = 'pat-cognefoudre:voice';
export const voiceSettings = Object.assign({ on: true, volume: 0.9 }, safeLoad());
const RECORDED = new Set(AUDIO_IDS);
let unlocked = false;
let cachedVoice = null;
let audioEl = null;
let actx = null;
let gain = null;
let token = 0; // chaque nouvelle réplique annule la précédente

function safeLoad() { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch { return {}; } }
export function saveVoice() { try { localStorage.setItem(VKEY, JSON.stringify(voiceSettings)); } catch { /* stockage plein */ } applyVolume(); }

// Réplique avec nombre → segments enregistrés ; sinon le fichier entier (anciennes prises en secours).
export const SEG_GAP_MS = 80;
const NUMBERED = /^(content-6|content-12|grognon-10)-(\d+)$/;
export function audioChain(id, have = RECORDED) {
  if (!id) return null;
  const m = NUMBERED.exec(id);
  if (m) {
    const parts = [`seg-${m[1]}-a`, `nombre-${m[2]}`, `seg-${m[1]}-b`];
    if (parts.every((p) => have.has(p))) return parts;
  }
  return have.has(id) ? [id] : null;
}
export const hasRecording = (id) => !!audioChain(id);
const voix = (on) => { try { window.dispatchEvent(new CustomEvent('pat:voix', { detail: { on } })); } catch { /* vieux navigateur */ } };
export const audioSupported = () => typeof window !== 'undefined' && typeof window.Audio === 'function';
export const recordedCount = () => RECORDED.size;

// ---------- Fichiers audio ----------
function el() {
  if (!audioEl && audioSupported()) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    window.__patAudio = { el: audioEl, gain: () => (gain ? gain.gain.value : null) }; // pour les tests
  }
  return audioEl;
}
function applyVolume() {
  if (!audioEl) return;
  if (gain) { gain.gain.value = voiceSettings.volume; audioEl.volume = 1; } else audioEl.volume = voiceSettings.volume;
}
// Web Audio : seul moyen de régler le volume sur iPhone (audio.volume y est ignoré).
function setupWebAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || actx || !el()) return;
  try {
    actx = new AC();
    gain = actx.createGain();
    actx.createMediaElementSource(audioEl).connect(gain).connect(actx.destination);
  } catch { actx = null; gain = null; }
  applyVolume();
}

// Joue une chaîne de fichiers sur le même élément audio (déjà débloqué : marche sur iPhone et dans Brave).
function playChain(ids, my, onEnd, fallback) {
  const a = el();
  if (!a) return fallback();
  let settled = false;
  let started = false;
  const finish = (ok) => { if (settled || my !== token) return; settled = true; voix(false); onEnd(ok); };
  const fail = () => {
    if (settled || my !== token) return;
    if (!started) { settled = true; voix(false); fallback(); } else finish(false);
  };
  const playAt = (i) => {
    if (settled || my !== token) return;
    a.onended = () => {
      if (i + 1 < ids.length) setTimeout(() => playAt(i + 1), SEG_GAP_MS); else finish(true);
    };
    a.onerror = fail;
    a.muted = false;
    a.src = `audio/${ids[i]}.mp3`;
    applyVolume();
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    const p = a.play();
    try { window.dispatchEvent(new CustomEvent('pat:audio', { detail: a })); } catch { /* vieux navigateur */ }
    if (p && p.then) p.then(() => { started = true; }, (err) => { if (err && err.name === 'AbortError') return; fail(); });
    else started = true;
  };
  voix(true);
  playAt(0);
  // Segments suivants : chargés à l'avance (service worker / cache HTTP) pour enchaîner sans trou.
  for (const id of ids.slice(1)) { try { fetch(`audio/${id}.mp3`).catch(() => {}); } catch { /* */ } }
  return true;
}

// ---------- Synthèse vocale de l'appareil (secours) ----------
const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
export const speechSupported = () => !!synth() && typeof window.SpeechSynthesisUtterance === 'function';

// fr-CA d'abord, puis fr-FR, puis n'importe quelle voix française.
export function chooseVoice(voices) {
  const fr = voices.filter((v) => /^fr/i.test(v.lang));
  const norm = (l) => l.replace('_', '-').toLowerCase();
  return fr.find((v) => norm(v.lang) === 'fr-ca') || fr.find((v) => norm(v.lang) === 'fr-fr') || fr[0] || null;
}
export function currentVoice() {
  if (!speechSupported()) return null;
  if (!cachedVoice) cachedVoice = chooseVoice(synth().getVoices() || []);
  return cachedVoice;
}
if (speechSupported()) synth().addEventListener?.('voiceschanged', () => { cachedVoice = null; });

function speakTTS(text, my, onEnd) {
  if (!speechSupported()) { onEnd(false); return false; }
  try {
    const s = synth();
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = currentVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'fr-CA';
    u.pitch = 0.7;
    u.rate = 0.88;
    u.volume = voiceSettings.volume;
    u.onend = () => { if (my === token) onEnd(true); };
    u.onerror = () => { if (my === token) onEnd(false); };
    s.speak(u);
    return true;
  } catch { onEnd(false); return false; }
}

// ---------- Déblocage au premier geste (iPhone, Brave, Chrome : lecture automatique bloquée sinon) ----------
export function unlockOnFirstGesture() {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    const a = el();
    if (a) {
      setupWebAudio();
      actx?.resume?.().catch(() => {});
      if (!a.src || a.paused) {
        a.muted = true;
        a.src = 'audio/silence.mp3';
        const p = a.play();
        const done = () => { if (a.src.endsWith('audio/silence.mp3')) { a.pause(); a.muted = false; } };
        if (p && p.then) p.then(done, done); else done();
      }
    }
    if (speechSupported()) {
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth().speak(u); } catch { /* ignore */ }
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

// Dit une réplique : fichier enregistré si disponible, sinon synthèse de l'appareil.
// Rappelle onEnd à la fin. Renvoie false si rien n'est dit (muet, volume 0, aucune voix).
export function speak(text, onEnd = () => {}, id = null) {
  const my = ++token;
  if (!voiceSettings.on || voiceSettings.volume <= 0) { onEnd(false); return false; }
  try { synth()?.cancel(); } catch { /* ignore */ }
  const chain = audioChain(id);
  if (chain && audioSupported()) {
    return playChain(chain, my, onEnd, () => speakTTS(text, my, onEnd));
  }
  if (!speechSupported()) { onEnd(false); return false; }
  return speakTTS(text, my, onEnd);
}
export function stopSpeaking() {
  token++;
  voix(false);
  try { audioEl?.pause(); } catch { /* ignore */ }
  try { synth()?.cancel(); } catch { /* ignore */ }
}
export const canSpeak = () => (audioSupported() && RECORDED.size > 0) || speechSupported();
