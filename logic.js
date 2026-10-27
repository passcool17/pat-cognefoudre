// Moteur de Pat Cognefoudre — logique pure, sans DOM (testable sous Node).
import {
  PLANS, COMPLOTS, TACTIQUES, SEASONS, WORKER_GAIN, QUEST_PILE, LEVEL_BONUS, PAT_TOKENS,
} from './data.js';

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));
export const COMPLOT_BY_ID = Object.fromEntries(COMPLOTS.map((c) => [c.id, c]));

// ---------- hasard reproductible (mulberry32, graine stockée dans l'état) ----------
function rand(s) {
  s.seed = (s.seed + 0x6d2b79f5) >>> 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- lieux ----------
export function locKind(loc) {
  if (loc.startsWith('bal')) return 'balise';
  if (loc.startsWith('voy')) return 'voyage';
  if (loc === 'forge' || loc === 'guilde') return loc;
  return 'ressource';
}
export function baliseOf(loc) {
  // 'bal2d' -> { value: 2, side: 'd' } ; 'bal?d' possible si inconnue
  const m = /^bal(\d|\?)([gd])$/.exec(loc);
  return m ? { value: m[1] === '?' ? null : Number(m[1]), side: m[2] } : null;
}
export function tactiquesIndexOf(loc) {
  const k = locKind(loc);
  if (k === 'balise') return TACTIQUES.indexOf(baliseOf(loc).side === 'd' ? 'balD' : 'balG');
  if (k === 'voyage') return TACTIQUES.indexOf('voyage');
  return TACTIQUES.indexOf(loc);
}
function complotBaliseValue(complot) {
  for (const q of complot.quarters) {
    const b = baliseOf(q.loc);
    if (b) return b.value;
  }
  return null;
}

// ---------- état ----------
export function nextSeason(season) {
  const i = SEASONS.indexOf(season);
  return i >= 0 && i < SEASONS.length - 1 ? SEASONS[i + 1] : null;
}
export function workersLeft(s) {
  return (s.workers.normal - s.workers.normalPlaced) + (s.workers.rangerPlaced ? 0 : 1);
}
export function patTokensFree(s) {
  return PAT_TOKENS - s.patTokensVallee - s.patTokensFixed;
}

// Campagne, Année 3 (« La brume de l'incertitude ») : la Vallée, les quêtes et les créatures
// de la montagne sont face cachée. Les étapes concernées portent mist: true pour que l'écran
// donne les consignes de Pat adaptées. Rien ne change dans le moteur lui-même.
function withMist(s, pending) {
  if (s.opts?.mist && (pending.kind !== 'card' || pending.src === 'vallee')) pending.mist = true;
  return pending;
}

export function newGame({ level = 2, loopTactiques = false, startWorkers = 2, seed, mist = false } = {}) {
  const s = {
    v: 1,
    level,
    opts: { loopTactiques, startWorkers, mist },
    seed: (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0,
    season: 'ete',
    humanPrepared: { automne: false, hiver: false, printemps: false },
    workers: { normal: startWorkers, normalPlaced: 0, rangerPlaced: false },
    planDeck: [], planDiscard: [], complotDeck: [], complotDiscard: [],
    plan: null,
    city: 0, violet: 0, faceDown: 0, fire: 0, snow: 0, points: 0,
    quests: { count: 0, points: 0 },
    questPile: QUEST_PILE[level].plaine + QUEST_PILE[level].montagne,
    voyagePoints: 0,
    patTokensVallee: 0, patTokensFixed: 0,
    forgeToken: false, guildToken: false,
    tactiquesPos: null,
    passed: false, ended: false,
    turn: 0,
    cur: null,
    pending: null,
    log: [],
    stats: { tactiques: 0, lastBlockedTurn: null, lastTurnBlocks: 0 },
  };
  s.planDeck = shuffle(s, PLANS.map((p) => p.id));
  s.complotDeck = shuffle(s, COMPLOTS.map((c) => c.id));
  revealPlan(s);
  return s;
}

function drawFrom(s, deckKey, discardKey) {
  if (s[deckKey].length === 0) {
    s[deckKey] = shuffle(s, s[discardKey]);
    s[discardKey] = [];
    log(s, deckKey === 'planDeck' ? 'Pile Plan remélangée.' : 'Pile Complot remélangée.');
  }
  return s[deckKey].shift();
}

function discardPlan(s) {
  if (!s.plan) return;
  s.planDiscard.push(s.plan.id);
  for (const c of s.plan.filled) if (c && c !== 'skip') s.complotDiscard.push(c);
  s.plan = null;
}

function revealPlan(s) {
  discardPlan(s);
  const id = drawFrom(s, 'planDeck', 'planDiscard');
  const p = PLAN_BY_ID[id];
  s.plan = { id, filled: [null, null, null, null], next: p.cave, count: 0 };
  log(s, `Nouvelle carte Plan révélée (${id}).`);
}

function planFull(s) {
  return !s.plan || s.plan.count >= 4;
}

// Compteurs utilisés par l'humeur de Pat (pet.js) ; sans effet sur les règles.
function bumpTactiques(s) {
  s.stats ??= { tactiques: 0, lastBlockedTurn: null, lastTurnBlocks: 0 };
  s.stats.tactiques += 1;
  s.stats.lastTurnBlocks = s.stats.lastBlockedTurn === s.turn ? s.stats.lastTurnBlocks + 1 : 1;
  s.stats.lastBlockedTurn = s.turn;
}
function log(s, msg) {
  s.log.push({ turn: s.turn, season: s.season, msg });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

// ---------- tour de Pat ----------
export function startTurn(s) {
  if (s.pending) return s;
  if (s.ended) { s.pending = { kind: 'over' }; return s; }
  if (s.passed) { s.pending = { kind: 'passed' }; return s; }
  s.turn += 1;
  s.cur = null;
  const next = nextSeason(s.season);
  if (next && workersLeft(s) === 0) {
    if (s.humanPrepared[next]) return beginPrepare(s);
    s.pending = { kind: 'askHuman', season: next };
    return s;
  }
  return proceedPlan(s);
}

function proceedPlan(s) {
  // Printemps, 17 cartes ou plus : on ignore les cases « jouer une carte » des Plans.
  const skipCards = s.season === 'printemps' && s.city >= 17 && workersLeft(s) > 0;
  for (let guard = 0; guard < 40; guard++) {
    if (planFull(s)) revealPlan(s);
    const plan = PLAN_BY_ID[s.plan.id];
    const corner = s.plan.next;
    if (skipCards && plan.corners[corner] === 'C') {
      s.plan.filled[corner] = 'skip';
      s.plan.count += 1;
      s.plan.next = (corner + 1) % 4;
      log(s, 'Case « jouer une carte » ignorée (17 cartes ou plus dans la ville de Pat).');
      continue;
    }
    const cid = drawFrom(s, 'complotDeck', 'complotDiscard');
    s.plan.filled[corner] = cid;
    s.plan.count += 1;
    s.plan.next = (corner + 1) % 4;
    const complot = COMPLOT_BY_ID[cid];
    const quarter = complot.quarters[corner];
    s.cur = { complot: cid, corner, type: plan.corners[corner], quarter, arrow: plan.arrow, usedTactiques: false, tokenDone: false, tIdx: null };
    log(s, `Complot ${cid} placé sur le coin ${['haut-gauche', 'haut-droite', 'bas-droite', 'bas-gauche'][corner]} (${plan.corners[corner] === 'O' ? 'ouvrier' : 'carte'}).`);
    if (plan.corners[corner] === 'O') {
      if (workersLeft(s) > 0) return beginPlace(s, quarter.loc, null);
      return beginCard(s, quarter.src, { replaced: true, why: 'noWorkers' });
    }
    return beginCard(s, quarter.src, {});
  }
  throw new Error('Boucle Plan anormale');
}

function currentWorker(s) {
  return s.workers.normalPlaced < s.workers.normal ? 'normal' : 'ranger';
}

function beginPlace(s, loc, via) {
  if (locKind(loc) === 'voyage') {
    if (s.season !== 'printemps') {
      log(s, 'Voyage impossible hors printemps → carte Tactiques.');
      return tactiques(s, loc, via, 'Le Voyage n’est ouvert qu’au printemps.');
    }
    if (s.level === 1) loc = 'voy2';
  }
  s.pending = { kind: 'place', loc, worker: currentWorker(s), via };
  return s;
}

// Réponses possibles à 'place' : 'ok', 'blocked', 'sharedHuman' (garde forestier sur un lieu où se trouve ton ouvrier)
function resolvePlace(s, choice, { snow = false } = {}) {
  const p = s.pending;
  if (choice === 'blocked') {
    s.pending = null;
    log(s, `Lieu indisponible (${p.loc}) → carte Tactiques.`);
    return tactiques(s, p.loc, p.via, null);
  }
  const placed = { loc: p.loc, worker: p.worker, fire: 0, snow: snow ? 1 : 0 };
  if (p.worker === 'normal') s.workers.normalPlaced += 1; else s.workers.rangerPlaced = true;
  if (p.worker === 'ranger' && choice !== 'sharedHuman') placed.fire += 1;
  if (p.loc === 'forge') placed.fire += 1;
  s.fire += placed.fire;
  s.snow += placed.snow;
  s.cur.placed = placed;
  log(s, `Pat place ${p.worker === 'ranger' ? 'son garde forestier' : 'un ouvrier'} (${p.loc})${placed.fire ? `, +${placed.fire} feu` : ''}${placed.snow ? ', +1 neige' : ''}.`);
  const k = locKind(p.loc);
  if (k === 'balise') {
    const b = baliseOf(p.loc);
    s.pending = withMist(s, { kind: 'balise', loc: p.loc, value: b.value });
    return s;
  }
  if (k === 'voyage') {
    if (p.loc === 'voy2') { s.voyagePoints += 2; log(s, 'Voyage partagé : 2 points.'); return finishAction(s); }
    s.pending = { kind: 'voyageValue', loc: p.loc };
    return s;
  }
  if (k === 'guilde') {
    s.pending = withMist(s, { kind: 'guildQuest', via: p.via });
    return s;
  }
  return finishAction(s);
}

function undoPlacement(s) {
  // Utilisé quand l'ouvrier de la Guilde doit être déplacé par la carte Tactiques.
  const pl = s.cur.placed;
  if (!pl) return;
  if (pl.worker === 'normal') s.workers.normalPlaced -= 1; else s.workers.rangerPlaced = false;
  s.fire -= pl.fire;
  s.cur.placed = null;
}

function tactiques(s, fromLoc, viaIdx, reason) {
  bumpTactiques(s);
  s.cur.usedTactiques = true;
  const dir = s.cur.arrow === 'haut' ? -1 : 1;
  let idx = viaIdx ?? tactiquesIndexOf(fromLoc);
  const n = TACTIQUES.length;
  for (let step = 0; step < n; step++) {
    idx += dir;
    if (idx < 0 || idx >= n) {
      if (!s.opts.loopTactiques) break;
      idx = (idx + n) % n;
    }
    const entry = TACTIQUES[idx];
    if (entry === 'voyage' && s.season !== 'printemps') { log(s, 'Tactiques : Voyage sauté (hors printemps).'); continue; }
    if (entry === 'guilde' && s.questPile === 0 && s.cur.guildFailed) { log(s, 'Tactiques : Guilde sautée (aucune quête possible).'); continue; }
    let loc = entry;
    if (entry === 'balD' || entry === 'balG') {
      const v = complotBaliseValue(COMPLOT_BY_ID[s.cur.complot]);
      loc = `bal${v ?? '?'}${entry === 'balD' ? 'd' : 'g'}`;
    }
    if (entry === 'voyage') loc = s.level === 1 ? 'voy2' : 'voyAny';
    s.tactiquesPos = idx;
    s.cur.tIdx = idx;
    s.pending = null;
    beginPlace(s, loc, idx);
    if (reason && s.pending) s.pending.reason = reason;
    return s;
  }
  // Bout de la liste atteint sans lieu disponible.
  log(s, 'Carte Tactiques épuisée : Pat joue une carte à la place (+1 neige).');
  s.tactiquesPos = null;
  return beginCard(s, s.cur.quarter.src, { replaced: true, why: 'tactiquesEnd' });
}

function beginCard(s, src, { replaced = false, why = null } = {}) {
  s.pending = withMist(s, { kind: 'card', src, colors: COMPLOT_BY_ID[s.cur.complot].colors, replaced, why });
  return s;
}

function resolveCard(s, { color, snow = false, patToken = false } = {}) {
  const p = s.pending;
  if (!color) throw new Error('Couleur requise');
  s.city += 1;
  if (color === 'violet') s.violet += 1;
  if (snow) s.snow += 1;
  if (p.replaced) s.snow += 1;
  if (patToken && s.patTokensVallee > 0) s.patTokensVallee -= 1;
  s.cur.played = { color, src: p.src };
  log(s, `Pat joue une carte ${color} (${p.src === 'pile' ? 'pile principale' : 'Vallée'})${p.replaced ? ', +1 neige (remplacement)' : ''}${snow ? ', +1 neige déblayée' : ''}. Ville : ${s.city}.`);
  return finishAction(s);
}

function finishAction(s) {
  if (s.cur && s.cur.usedTactiques && !s.cur.tokenDone) {
    s.pending = withMist(s, { kind: 'patToken', colors: COMPLOT_BY_ID[s.cur.complot].colors, available: patTokensFree(s) });
    return s;
  }
  if (s.season === 'printemps' && workersLeft(s) === 0 && s.city >= 15) {
    s.passed = true;
    log(s, 'Pat passe (printemps, tous ses ouvriers placés et au moins 15 cartes).');
    s.pending = { kind: 'passed', justNow: true };
    return s;
  }
  s.pending = { kind: 'done' };
  return s;
}

function beginPrepare(s) {
  const next = nextSeason(s.season);
  s.pending = { kind: 'prepare', season: next };
  return s;
}

function resolvePrepare(s, { cardsTaken = 0, snowTaken = 0 } = {}) {
  const next = s.pending.season;
  s.faceDown += cardsTaken;
  s.snow += snowTaken;
  s.patTokensVallee = 0;
  s.season = next;
  s.workers.normal += WORKER_GAIN[next];
  s.workers.normalPlaced = 0;
  s.workers.rangerPlaced = false;
  if (next === 'automne' && !s.forgeToken) { s.forgeToken = true; s.patTokensFixed += 1; }
  if (next === 'hiver' && !s.guildToken) { s.guildToken = true; s.patTokensFixed += 1; }
  s.humanPrepared[next] = true;
  revealPlan(s);
  s.tactiquesPos = null;
  log(s, `Pat se prépare pour ${next} : ${cardsTaken} carte(s) face cachée, +${snowTaken} neige, ${s.workers.normal} ouvriers + garde forestier.`);
  s.pending = { kind: 'done', prepared: next };
  return s;
}

// Point d'entrée unique pour répondre à l'étape en cours.
export function answer(s, choice, data = {}) {
  const p = s.pending;
  if (!p) throw new Error('Aucune étape en cours');
  switch (p.kind) {
    case 'askHuman':
      if (choice === 'yes') { s.humanPrepared[p.season] = true; s.pending = null; return beginPrepare(s); }
      s.pending = null;
      return proceedPlan(s);
    case 'prepare':
      return resolvePrepare(s, data);
    case 'place':
      return resolvePlace(s, choice, data);
    case 'balise':
      s.points += Number(data.points) || 0;
      log(s, `Balise : Pat défausse la Grosse Créature et gagne ${Number(data.points) || 0} point(s).`);
      return finishAction(s);
    case 'voyageValue':
      s.voyagePoints += Number(data.points) || 0;
      log(s, `Voyage : ${Number(data.points) || 0} points.`);
      return finishAction(s);
    case 'guildQuest':
      if (choice === 'mountain') {
        s.quests.count += 1; s.quests.points += Number(data.points) || 0;
        log(s, `Guilde : Pat réalise une Quête en montagne (${Number(data.points) || 0} pts).`);
        return finishAction(s);
      }
      if (s.questPile > 0) { s.pending = { kind: 'pileQuest', remaining: s.questPile }; return s; }
      // Plus de quête : l'ouvrier est déplacé grâce à la carte Tactiques.
      s.cur.guildFailed = true;
      undoPlacement(s);
      log(s, 'Guilde : aucune quête possible → carte Tactiques.');
      return tactiques(s, 'guilde', p.via, 'Aucune quête possible à la Guilde.');
    case 'pileQuest':
      s.questPile -= 1;
      s.quests.count += 1; s.quests.points += Number(data.points) || 0;
      log(s, `Guilde : Pat réalise la quête du haut de sa pile (${Number(data.points) || 0} pts).`);
      return finishAction(s);
    case 'patToken':
      s.cur.tokenDone = true;
      if (choice === 'ok' && patTokensFree(s) > 0) { s.patTokensVallee += 1; log(s, 'Jeton Pat placé dans la Vallée.'); }
      else log(s, 'Aucun jeton Pat placé.');
      return finishAction(s);
    case 'card':
      return resolveCard(s, data);
    case 'done':
      s.pending = null;
      return s;
    case 'passed':
      if (choice === 'humanPassed') { s.pending = { kind: 'endCollect' }; return s; }
      s.pending = null;
      return s;
    case 'endCollect':
      s.faceDown += Number(data.cardsTaken) || 0;
      s.snow += Number(data.snowTaken) || 0;
      s.patTokensVallee = 0;
      s.ended = true;
      log(s, 'Fin de partie : Pat récupère les cartes de la Vallée marquées d’un jeton Pat.');
      s.pending = { kind: 'over' };
      return s;
    case 'over':
      return s;
    default:
      throw new Error(`Étape inconnue : ${p.kind}`);
  }
}

// Ajustements manuels (événements causés par le joueur humain).
export const ADJUSTABLE = ['fire', 'snow', 'points', 'city', 'violet', 'faceDown', 'patTokensVallee', 'voyagePoints'];
export function adjust(s, field, delta) {
  if (!ADJUSTABLE.includes(field)) throw new Error(`Champ non ajustable : ${field}`);
  s[field] = Math.max(0, s[field] + delta);
  if (field === 'patTokensVallee') s.patTokensVallee = Math.min(s.patTokensVallee, PAT_TOKENS - s.patTokensFixed);
  log(s, `Ajustement manuel : ${field} ${delta > 0 ? '+' : ''}${delta}.`);
  return s;
}
export function setHumanPrepared(s, season) {
  s.humanPrepared[season] = true;
  log(s, `Tu t’es préparé pour ${season}.`);
  return s;
}

export function score(s, { cardPoints = 0, mostSnow = false, questPoints } = {}) {
  const b = LEVEL_BONUS[s.level];
  const parts = {
    cartes: Number(cardPoints) || 0,
    quetes: questPoints ?? s.quests.points,
    jetons: s.points,
    voyages: s.voyagePoints,
    neige: s.snow + (mostSnow ? 5 : 0),
    bonusViolet: s.violet * b.violet,
    bonusFeu: s.fire * b.feu,
    bonusCachees: s.faceDown * b.cachee,
  };
  parts.total = Object.values(parts).reduce((a, x) => a + x, 0);
  return parts;
}
export function winner(patTotal, humanTotal) {
  return humanTotal > patTotal ? 'humain' : 'pat'; // égalité : Pat gagne
}
