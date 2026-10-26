// Voix de Pat : Web Speech API (synthèse locale à l'appareil, fonctionne hors ligne
// si la voix est installée). La bulle de texte reste toujours affichée.
const VKEY = 'pat-cognefoudre:voice';
export const voiceSettings = Object.assign({ on: true, volume: 0.9 }, safeLoad());
let unlocked = false;
let cachedVoice = null;

function safeLoad() { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch { return {}; } }
export function saveVoice() { try { localStorage.setItem(VKEY, JSON.stringify(voiceSettings)); } catch { /* stockage plein */ } }

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

// iOS / Safari : la synthèse doit être lancée une première fois pendant un geste de l'utilisateur.
export function unlockOnFirstGesture() {
  const unlock = () => {
    if (unlocked || !speechSupported()) return;
    unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth().speak(u); } catch { /* ignore */ }
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

// Lit le texte d'une voix grave et un peu lente. Rappelle onEnd à la fin (ou tout de suite si muet).
export function speak(text, onEnd = () => {}) {
  if (!voiceSettings.on || voiceSettings.volume <= 0 || !speechSupported()) { onEnd(false); return false; }
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
    u.onend = () => onEnd(true);
    u.onerror = () => onEnd(false);
    s.speak(u);
    return true;
  } catch { onEnd(false); return false; }
}
export function stopSpeaking() { try { synth()?.cancel(); } catch { /* ignore */ } }
