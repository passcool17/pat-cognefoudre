// Intro de Pat au lancement de l'app : écran plein, Pat peint (grognon) en boucle « repos », titre, bouton « Entrer ».
// Le toucher sur « Entrer » est nécessaire : les navigateurs (Brave, Chrome, Safari iPhone) bloquent le son sans geste.
// Ce même toucher débloque la musique (music.js, fondu d'entrée) et la voix (voice.js). Pat passe en « parle »,
// dit sa réplique d'accueil (voix C enregistrée : audio/test.mp3) avec sous-titre, puis l'intro s'efface en fondu.
// « Passer » ferme tout de suite. Réglage dans ⚙️ (à chaque lancement : oui/non) et bouton « Revoir l'intro ».
import { speak, stopSpeaking } from './voice.js';
import { mountAvatar, setAvatarMood, avatarTalk } from './avatar.js';
import { TEST_LINE } from './pet.js';

export const INTRO_KEY = 'pat-cognefoudre:intro';
export const INTRO_LINE = { text: TEST_LINE, audio: 'test', mood: 'grognon' };
// afterLineMs : pause après la réplique ; readMs : durée de lecture du sous-titre si Pat est muet ;
// maxMs : filet de sécurité si la fin de l'audio n'arrive jamais ; fadeMs : fondu de sortie.
export const INTRO_TIMING = { afterLineMs: 900, readMs: 3500, maxMs: 14000, fadeMs: 650 };

const safeLoad = () => { try { return JSON.parse(localStorage.getItem(INTRO_KEY)) || {}; } catch { return {}; } };
export const introSettings = Object.assign({ on: true }, typeof localStorage === 'undefined' ? {} : safeLoad());
export function saveIntro() { try { localStorage.setItem(INTRO_KEY, JSON.stringify({ on: introSettings.on })); } catch { /* stockage plein */ } }

// Faut-il montrer l'intro au lancement ? ?intro=0 / ?intro=1 forcent ; les navigateurs pilotés par les tests
// (navigator.webdriver) ne la voient pas, sauf ?intro=1, pour ne pas gêner les autres tests de bout en bout.
export function introWanted({ settings = introSettings, search = '', webdriver = false } = {}) {
  const q = new URLSearchParams(search).get('intro');
  if (q === '0') return false;
  if (q === '1') return true;
  if (webdriver) return false;
  return settings.on !== false;
}

const st = { el: null, state: 'ferme', closedBy: null, timers: [], onDone: null, spoke: null };
const later = (ms, fn) => st.timers.push(setTimeout(fn, ms));
export const introOpen = () => !!st.el;

function expose() {
  window.__patIntro = {
    get open() { return !!st.el; }, get state() { return st.state; }, get closedBy() { return st.closedBy; },
    get spoke() { return st.spoke; }, line: INTRO_LINE.text,
  };
}

export function showIntro({ onDone = () => {} } = {}) {
  if (typeof document === 'undefined' || st.el) return;
  expose();
  st.onDone = onDone; st.state = 'attente'; st.closedBy = null; st.spoke = null;
  const el = document.createElement('div');
  el.className = 'intro';
  el.id = 'intro';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Introduction : Pat Cognefoudre');
  el.innerHTML = `
    <div class="intro-inner">
      <div class="pet intro-pat" data-mood="${INTRO_LINE.mood}"><span class="pet-body"></span></div>
      <h1 class="intro-title">Pat Cognefoudre</h1>
      <p class="intro-sub">Roi des Bandits · Everdell : Silverfrost</p>
      <p class="intro-line" id="intro-line" aria-live="polite"></p>
      <button type="button" class="btn huge red intro-enter" id="intro-enter">Entrer</button>
      <button type="button" class="intro-skip" id="intro-skip">Passer ›</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('intro-on');
  st.el = el;
  mountAvatar(el.querySelector('.pet-body'), INTRO_LINE.mood);
  setAvatarMood(INTRO_LINE.mood);
  avatarTalk(false);
  el.querySelector('#intro-enter').addEventListener('click', enter);
  el.querySelector('#intro-skip').addEventListener('click', () => closeIntro('passer'));
  el.querySelector('#intro-enter').focus({ preventScroll: true });
}

// Toucher sur « Entrer » : la musique démarre (music.js écoute le même geste), Pat parle, puis on entre.
function enter() {
  if (!st.el) return;
  if (st.state !== 'attente') { closeIntro('entrer'); return; } // deuxième toucher : on entre tout de suite
  st.state = 'parle';
  st.el.classList.add('speaking');
  const line = st.el.querySelector('#intro-line');
  line.textContent = `« ${INTRO_LINE.text} »`;
  line.classList.add('show');
  st.el.querySelector('#intro-enter').textContent = 'Entrer ›';
  avatarTalk(true);
  const finish = () => {
    if (st.state !== 'parle') return;
    st.state = 'fin';
    avatarTalk(false);
    later(INTRO_TIMING.afterLineMs, () => closeIntro('fin'));
  };
  const t0 = Date.now();
  const spoke = speak(INTRO_LINE.text, (ok) => {
    if (ok) finish();
    else later(Math.max(0, INTRO_TIMING.readMs - (Date.now() - t0)), finish);
  }, INTRO_LINE.audio);
  st.spoke = spoke;
  if (!spoke) later(INTRO_TIMING.readMs, finish);
  later(INTRO_TIMING.maxMs, finish);
}

export function closeIntro(by = 'passer') {
  if (!st.el) return;
  const el = st.el;
  if (st.state === 'parle' || st.state === 'attente') stopSpeaking();
  st.timers.forEach(clearTimeout); st.timers = [];
  st.state = 'ferme'; st.closedBy = by; st.el = null;
  avatarTalk(false);
  el.classList.add('out');
  document.body.classList.remove('intro-on');
  setTimeout(() => el.remove(), INTRO_TIMING.fadeMs + 50);
  try { st.onDone?.(by); } catch (e) { console.warn('intro', e); }
}
