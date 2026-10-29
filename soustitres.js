// Sous-titres (v1.8.1) : la bulle de Pat et le sous-titre de l'intro sont masqués par défaut ; Pat parle à voix haute.
// Réglage dans ⚙️ (pour jouer sans le son), gardé dans localStorage comme la musique.
// Le texte est toujours mis à jour : seule la classe html.subs-on (style.css) affiche la bulle.
export const SUBS_KEY = 'pat-cognefoudre:soustitres';
const load = () => { try { return JSON.parse(localStorage.getItem(SUBS_KEY)) || {}; } catch { return {}; } };
export const subsSettings = Object.assign({ on: false }, typeof localStorage === 'undefined' ? {} : load());
export function saveSubs() { try { localStorage.setItem(SUBS_KEY, JSON.stringify({ on: subsSettings.on })); } catch { /* stockage plein */ } }
export function applySubs(root = globalThis.document?.documentElement) { root?.classList.toggle('subs-on', !!subsSettings.on); }
export function setSubsOn(on) { subsSettings.on = !!on; saveSubs(); applySubs(); }
