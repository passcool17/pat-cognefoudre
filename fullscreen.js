// Mode plein écran : bouton dans l'en-tête (API Fullscreen, préfixe webkit en secours),
// masqué si l'API manque ou si l'app tourne déjà installée (display-mode standalone/fullscreen).
// iPhone (Safari) : pas d'API pour la page → astuce unique « Sur l'écran d'accueil ».
const PREF = 'pat-cognefoudre:plein-ecran';
const HINT = 'pat-cognefoudre:astuce-ios-vue';

const ICON_ENTER = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICON_EXIT = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

const root = () => document.documentElement;
export const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export function fsSupported() {
  const el = root();
  const can = typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
  const enabled = document.fullscreenEnabled ?? document.webkitFullscreenEnabled;
  return can && enabled !== false;
}
export function isInstalled() {
  const mm = (q) => window.matchMedia?.(q).matches;
  return !!(mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || navigator.standalone);
}
function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
const pref = () => { try { return localStorage.getItem(PREF); } catch { return null; } };
const setPref = (v) => { try { localStorage.setItem(PREF, v); } catch { /* stockage indisponible */ } };

async function enter() {
  const el = root();
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else el.webkitRequestFullscreen?.();
  } catch (e) { console.warn('Plein écran refusé', e); }
}
async function exit() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else document.webkitExitFullscreen?.();
  } catch (e) { console.warn('Sortie du plein écran', e); }
}
export const toggleFullscreen = () => (fsElement() ? exit() : enter());

function banner(id, html, onAction) {
  document.getElementById(id)?.remove();
  const b = document.createElement('div');
  b.id = id; b.className = 'fs-hint'; b.setAttribute('role', 'status');
  b.innerHTML = html;
  b.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    onAction(btn.dataset.act); b.remove();
  });
  document.body.append(b);
  return b;
}

export function initFullscreen(btn) {
  const sync = () => {
    const on = !!fsElement();
    btn.innerHTML = on ? ICON_EXIT : ICON_ENTER;
    const label = on ? 'Quitter le plein écran' : 'Plein écran';
    btn.setAttribute('aria-label', label); btn.title = label;
    btn.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('is-fullscreen', on);
  };
  btn.hidden = !fsSupported() || isInstalled();
  if (btn.hidden) {
    // iPhone/iPad dans Safari : seul l'ajout à l'écran d'accueil enlève les barres.
    let seen = null; try { seen = localStorage.getItem(HINT); } catch { /* */ }
    if (isIOS() && !isInstalled() && !seen) {
      banner('fs-hint-ios', '<span>📱 Pour le plein écran sur iPhone : <b>Partager → Sur l’écran d’accueil</b></span><button type="button" data-act="ok" aria-label="Fermer l’astuce">✕</button>',
        () => { try { localStorage.setItem(HINT, '1'); } catch { /* */ } });
    }
    return;
  }
  sync();
  btn.addEventListener('click', toggleFullscreen);
  const onChange = () => { sync(); setPref(fsElement() ? '1' : '0'); document.getElementById('fs-hint-retour')?.remove(); };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  // Le navigateur exige un geste : on propose de revenir en plein écran, sans l'imposer.
  if (pref() === '1' && !fsElement()) {
    banner('fs-hint-retour', '<button type="button" class="fs-go" data-act="go">⛶ Revenir en plein écran</button><button type="button" data-act="non" aria-label="Non merci">✕</button>',
      (act) => { if (act === 'go') enter(); else setPref('0'); });
  }
}
