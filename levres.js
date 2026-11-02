// Bouche qui suit la voix (v1.9.0) : repères Rhubarb Lip Sync précalculés (audio/bouche.js), rien à calculer sur le téléphone.
// Chaque forme de bouche devient une ouverture de 0 (fermée) à 1 (grande ouverte).
import { BOUCHE } from './audio/bouche.js';

export const OUVERTURE = { X: 0, A: 0.08, B: 0.45, G: 0.35, H: 0.55, F: 0.5, E: 0.7, C: 0.85, D: 1 };
const parsed = new Map();
// "X0 B12 C25" → [[0, 'X'], [0.12, 'B'], [0.25, 'C']]
export function cues(id) {
  if (!id || !BOUCHE[id]) return null;
  if (!parsed.has(id)) parsed.set(id, BOUCHE[id].split(' ').map((p) => [Number(p.slice(1)) / 100, p[0]]));
  return parsed.get(id);
}
export const hasCues = (id) => !!BOUCHE[id];
// Forme de bouche à l'instant t (secondes) ; X avant le début et après la fin.
export function shapeAt(list, t) {
  if (!list || !(t >= 0)) return 'X';
  let lo = 0, hi = list.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid][0] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans < 0 ? 'X' : list[ans][1];
}
// Identifiant de réplique depuis l'adresse du fichier audio (…/audio/<id>.mp3).
export const idFromSrc = (src) => (/(?:^|\/)audio\/([^/?#]+)\.mp3(?:[?#]|$)/.exec(src || '') || [])[1] || null;
