// Joueur humain simulé : répond au hasard (de façon réaliste) aux questions de l'app.
import { answer, startTurn, workersLeft } from '../logic.js';

export function makeRng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

export function respond(s, r) {
  const p = s.pending;
  const pick = (a) => a[Math.floor(r() * a.length)];
  switch (p.kind) {
    case 'askHuman': return answer(s, r() < 0.5 ? 'yes' : 'no');
    case 'prepare': return answer(s, 'ok', { cardsTaken: Math.floor(r() * 3), snowTaken: Math.floor(r() * 2) });
    case 'place': {
      const x = r();
      if (x < 0.3) return answer(s, 'blocked');
      if (p.worker === 'ranger' && x < 0.4) return answer(s, 'occupied');
      return answer(s, 'ok', { snow: r() < 0.2 });
    }
    case 'balise': case 'voyageValue': case 'pileQuest': return answer(s, 'ok', { points: Math.floor(r() * 5) });
    case 'guildQuest': return answer(s, r() < 0.3 ? 'mountain' : 'none', { points: 3 });
    case 'patToken': return answer(s, r() < 0.8 ? 'ok' : 'none');
    case 'card': return answer(s, 'ok', { color: pick(p.colors), snow: r() < 0.2, patToken: r() < 0.2 });
    case 'done': return answer(s, 'ok');
    case 'passed': return answer(s, 'humanPassed');
    case 'endCollect': return answer(s, 'ok', { cardsTaken: 2, snowTaken: 1 });
    default: throw new Error('inattendu ' + p.kind);
  }
}

export function playGame(s, r, check = () => {}) {
  let steps = 0;
  while (!s.ended) {
    if (!s.pending) startTurn(s);
    respond(s, r);
    check(s);
    if (++steps > 5000) throw new Error('Partie interminable');
  }
  return steps;
}
export { workersLeft };
