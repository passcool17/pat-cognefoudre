// Voix de Pat.
// 1) Répliques pré-enregistrées (audio/<id>.mp3, voix Piper hors ligne, traitée « roi bandit »),
//    mises en cache par le service worker : fonctionne hors ligne et dans tous les navigateurs.
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

export const hasRecording = (id) => !!id && RECORDED.has(id);
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

function playFile(id, my, onEnd, fallback) {
  const a = el();
  if (!a) return fallback();
  let settled = false;
  const finish = (ok) => { if (settled || my !== token) return; settled = true; onEnd(ok); };
  a.onended = () => finish(true);
  a.onerror = () => { if (!settled && my === token) { settled = true; fallback(); } };
  a.muted = false;
  a.src = `audio/${id}.mp3`;
  applyVolume();
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  const p = a.play();
  if (p && p.catch) p.catch((err) => {
    if (err && err.name === 'AbortError') return; // remplacé par une autre réplique
    if (!settled && my === token) { settled = true; fallback(); }
  });
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
  if (hasRecording(id) && audioSupported()) {
    return playFile(id, my, onEnd, () => speakTTS(text, my, onEnd));
  }
  if (!speechSupported()) { onEnd(false); return false; }
  return speakTTS(text, my, onEnd);
}
export function stopSpeaking() {
  token++;
  try { audioEl?.pause(); } catch { /* ignore */ }
  try { synth()?.cancel(); } catch { /* ignore */ }
}
export const canSpeak = () => (audioSupported() && RECORDED.size > 0) || speechSupported();
