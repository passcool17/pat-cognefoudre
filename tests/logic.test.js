import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startTurn, answer, workersLeft, patTokensFree, score, winner, tactiquesIndexOf, COMPLOT_BY_ID, giveToPat, winterFuryNote } from '../logic.js';
import { COMPLOTS, PLANS, TACTIQUES, QUEST_PILE, WORKER_GAIN } from '../data.js';
import { makeRng, playGame } from './sim.js';

test('données : 8 Plans, 20 Complots, 9 lignes Tactiques', () => {
  assert.equal(PLANS.length, 8);
  assert.equal(COMPLOTS.length, 20);
  assert.equal(TACTIQUES.length, 9);
  for (const p of PLANS) {
    assert.equal(p.corners.filter((c) => c === 'O').length, 2, p.id);
    assert.ok(['haut', 'bas'].includes(p.arrow));
  }
  for (const c of COMPLOTS) {
    assert.equal(c.quarters.length, 4);
    assert.equal(new Set(c.colors).size, 5, c.id);
    for (const q of c.quarters) assert.ok(tactiquesIndexOf(q.loc) >= 0, `${c.id} ${q.loc}`);
  }
});

test('pile Quête : niveau 4 = 3 plaine + 2 montagne (livret Silverfrost p.17)', () => {
  assert.deepEqual(QUEST_PILE[4], { plaine: 3, montagne: 2 });
  assert.equal(newGame({ level: 4, seed: 1 }).questPile, 5);
  for (const n of [1, 2, 3, 4]) assert.equal(QUEST_PILE[n].plaine + QUEST_PILE[n].montagne, 5, `niveau ${n}`);
  assert.equal(newGame({ level: 1, seed: 1 }).questPile, 5);
});

test('premier tour : Complot posé sur le coin de la grotte', () => {
  const s = newGame({ level: 2, seed: 42 });
  const plan = PLANS.find((p) => p.id === s.plan.id);
  startTurn(s);
  assert.ok(s.plan.filled[plan.cave]);
  assert.equal(s.cur.corner, plan.cave);
  assert.equal(s.pending.kind, plan.corners[plan.cave] === 'O' ? 'place' : 'card');
});

test('lieu bloqué → Tactiques dans le sens de la flèche + jeton Pat', () => {
  for (let seed = 1; seed < 200; seed++) {
    const s = newGame({ level: 3, seed });
    startTurn(s);
    if (s.pending.kind !== 'place' || s.pending.loc !== 'forge') { continue; }
    const arrow = s.cur.arrow;
    answer(s, 'blocked');
    if (arrow === 'bas') {
      assert.equal(s.tactiquesPos, 1);
      assert.equal(s.pending.loc, 'bouleau3');
      answer(s, 'ok');
      assert.equal(s.pending.kind, 'patToken');
      answer(s, 'ok');
      assert.equal(s.patTokensVallee, 1);
      assert.equal(s.pending.kind, 'done');
      return;
    }
    // flèche haut depuis la Forge (en haut de la liste) : bout de liste → on repart vers le bas (concepteur, BGG 2025)
    assert.equal(s.pending.kind, 'place');
    assert.equal(s.pending.loc, 'bouleau3');
    assert.equal(s.tactiquesPos, 1);
    return;
  }
  assert.fail('aucune graine ne donne la Forge');
});

test('Voyage hors printemps sauté automatiquement', () => {
  for (let seed = 1; seed < 500; seed++) {
    const s = newGame({ level: 2, seed });
    startTurn(s);
    if (s.cur.type === 'O' && s.cur.quarter.loc.startsWith('voy')) {
      assert.notEqual(s.pending.loc?.startsWith('voy'), true);
      assert.equal(s.cur.usedTactiques, true);
      return;
    }
  }
  assert.fail('pas de Voyage trouvé');
});

test('Préparation : ouvriers, jetons Forge/Guilde, nouvelle carte Plan', () => {
  const s = newGame({ level: 2, seed: 7 });
  s.workers.normalPlaced = 1; s.workers.rangerPlaced = true;
  startTurn(s);
  assert.equal(s.pending.kind, 'askHuman');
  assert.equal(s.pending.season, 'automne');
  answer(s, 'yes');
  assert.equal(s.pending.kind, 'prepare');
  answer(s, 'ok', { cardsTaken: 2, snowTaken: 1 });
  assert.equal(s.season, 'automne');
  assert.equal(s.workers.normal, 2);
  assert.equal(s.faceDown, 2);
  assert.equal(s.forgeToken, true);
  assert.equal(patTokensFree(s), 9);
  assert.equal(s.plan.count, 0);
});

test('Humain pas encore préparé : la case ouvrier devient une carte + 1 neige', () => {
  for (let seed = 1; seed < 300; seed++) {
    const s = newGame({ level: 2, seed });
    s.workers.normalPlaced = 1; s.workers.rangerPlaced = true;
    startTurn(s);
    answer(s, 'no');
    if (s.cur.type !== 'O') continue;
    assert.equal(s.pending.kind, 'card');
    assert.equal(s.pending.replaced, true);
    answer(s, 'ok', { color: 'vert' });
    assert.equal(s.snow, 1);
    assert.equal(s.city, 1);
    return;
  }
  assert.fail();
});

test('Garde forestier : +1 feu sauf si ton ouvrier est sur le lieu (livret Silverfrost p.19)', () => {
  const s = newGame({ level: 2, seed: 3, startWorkers: 0 });
  for (let i = 0; i < 50; i++) {
    startTurn(s);
    if (s.pending.kind === 'place' && s.pending.loc !== 'forge') {
      assert.equal(s.pending.worker, 'ranger');
      answer(s, 'sharedHuman');
      assert.equal(s.fire, 0);
      assert.equal(s.workers.rangerPlaced, true);
      return;
    }
    s.pending = null;
  }
  assert.fail();
});

test('Score : bonus de niveau et égalité pour Pat', () => {
  const s = newGame({ level: 4, seed: 1 });
  Object.assign(s, { violet: 2, fire: 3, faceDown: 4, snow: 2, points: 5, voyagePoints: 3 });
  s.quests.points = 6;
  const sc = score(s, { cardPoints: 20, mostSnow: true });
  assert.equal(sc.bonusViolet, 12);
  assert.equal(sc.bonusFeu, 3);
  assert.equal(sc.bonusCachees, 4);
  assert.equal(sc.neige, 7);
  assert.equal(sc.total, 20 + 6 + 5 + 3 + 7 + 12 + 3 + 4);
  assert.equal(winner(50, 50), 'pat');
  assert.equal(winner(50, 51), 'humain');
});

for (const level of [1, 2, 3, 4]) {
  {
    test(`Partie complète simulée — niveau ${level}`, () => {
      for (let g = 0; g < 60; g++) {
        const s = newGame({ level, seed: 1000 * level + g });
        const r = makeRng(77 + g * 13 + level);
        playGame(s, r, (st) => {
          assert.ok(workersLeft(st) >= 0);
          assert.ok(st.patTokensVallee + st.patTokensFixed <= 10);
          assert.ok(st.patTokensVallee >= 0);
          assert.ok(st.questPile >= 0);
          assert.ok(st.fire >= 0 && st.snow >= 0);
          if (st.pending?.kind === 'place' && st.pending.loc.startsWith('voy')) assert.equal(st.season, 'printemps');
          if (level === 1 && st.pending?.kind === 'place' && st.pending.loc.startsWith('voy')) assert.equal(st.pending.loc, 'voy2');
          assert.equal(st.planDeck.length + st.planDiscard.length + 1, 8);
        });
        assert.equal(s.season, 'printemps');
        assert.ok(s.city >= 15);
        assert.equal(workersLeft(s), 0);
        assert.equal(s.workers.normal, 1 + 1 + 1 + 2); // été : 1 + garde forestier (p.6)
        const sc = score(s, { cardPoints: 30 });
        assert.ok(Number.isFinite(sc.total));
      }
    });
  }
}

test('été : Pat a 1 ouvrier normal + le garde forestier (livret p.6), puis +1, +1, +2', () => {
  const s = newGame({ level: 2, seed: 1 });
  assert.equal(s.opts.startWorkers, 1);
  assert.equal(s.workers.normal, 1);
  assert.equal(s.workers.rangerPlaced, false);
  assert.deepEqual(WORKER_GAIN, { automne: 1, hiver: 1, printemps: 2 });
});

// Réponses du concepteur (BGG, chris @iomio, 22 juillet 2025).
function placeTurn(seed, season = 'ete') {
  for (let sd = seed; sd < seed + 400; sd++) {
    const s = newGame({ level: 2, seed: sd });
    s.season = season;
    startTurn(s);
    if (s.pending?.kind === 'askHuman') answer(s, 'no');
    if (s.pending?.kind === 'place' && !s.cur.usedTactiques) return s;
  }
  throw new Error('pas de placement');
}

test('concepteur : balise du bas bloquée, flèche ⬇ → on remonte la liste, pas de carte à la place', () => {
  const s = placeTurn(1);
  s.cur.arrow = 'bas';
  s.pending.loc = 'balG'; s.pending.via = TACTIQUES.indexOf('balG');
  answer(s, 'blocked');
  assert.equal(s.pending.kind, 'place');
  // été : le Voyage (juste au-dessus) est sauté, on arrive à la balise de droite
  assert.equal(TACTIQUES[s.tactiquesPos], 'balD');
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'guilde');
  assert.notEqual(s.pending.kind, 'card');
});

test('concepteur : au printemps, balise du bas bloquée, flèche ⬇ → Voyage', () => {
  const s = placeTurn(1, 'printemps');
  s.cur.arrow = 'bas';
  s.pending.loc = 'balG'; s.pending.via = TACTIQUES.indexOf('balG');
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'voyage');
});

test('concepteur : demi-tour depuis le lieu bloqué d’origine, sans reprendre les lieux déjà essayés', () => {
  const s = placeTurn(1);
  s.cur.arrow = 'bas';
  s.pending.loc = 'gland2'; s.pending.via = undefined;
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'guilde');
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'balD');
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'balG'); // Voyage sauté (été)
  answer(s, 'blocked');
  assert.equal(TACTIQUES[s.tactiquesPos], 'cuivre1'); // demi-tour depuis gland2
  for (const t of ['mousse2', 'bouleau3', 'forge']) { answer(s, 'blocked'); assert.equal(TACTIQUES[s.tactiquesPos], t); }
  // tout est bloqué dans les deux sens : cas théorique, Pat joue une carte (+1 neige)
  answer(s, 'blocked');
  assert.equal(s.pending.kind, 'card');
  assert.equal(s.pending.replaced, true);
});

test('concepteur : Pat ne gagne pas de feu en se préparant pour la saison', () => {
  const s = newGame({ level: 2, seed: 7 });
  s.workers.normalPlaced = 1; s.workers.rangerPlaced = true;
  s.fire = 3;
  startTurn(s);
  answer(s, 'yes');
  answer(s, 'ok', { cardsTaken: 1, snowTaken: 2 });
  assert.equal(s.season, 'automne');
  assert.equal(s.fire, 3);
});

test('concepteur : carte piochée par Pat (Leaf Ranger) → face cachée chez lui', () => {
  const s = newGame({ level: 2, seed: 3 });
  giveToPat(s, 'carte');
  assert.equal(s.faceDown, 1);
  assert.equal(s.city, 0);
});

test('Fureur de l’hiver (décision de Pascal, p.14) : rappel à la préparation de Pat pour l’hiver seulement', () => {
  for (const season of ['automne', 'printemps']) assert.equal(winterFuryNote(season), '');
  const t = winterFuryNote('hiver');
  assert.match(t, /premier à se préparer pour l’hiver/);
  assert.match(t, /2 feux/);
  assert.match(t, /Grosses Créatures/);
  assert.match(t, /p\.14/);
});
