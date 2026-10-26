import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINES, MOODS, TIMING, computeMood, happiness, newPet, pickLine, fill } from '../pet.js';
import { newGame, startTurn, answer } from '../logic.js';
import { makeRng, playGame } from './sim.js';

const base = (over = {}) => Object.assign(newGame({ level: 2, seed: 7 }), { turn: 5, season: 'ete', city: 4, fire: 2, snow: 1 }, over);

test('répliques : au moins 15 par humeur, 80+ au total, sans doublon', () => {
  let total = 0;
  for (const mood of Object.keys(MOODS)) {
    assert.ok(LINES[mood].length >= 15, mood);
    total += LINES[mood].length;
  }
  assert.ok(total >= 80);
  const all = Object.values(LINES).flat();
  assert.equal(new Set(all).size, all.length);
});

test('humeur : content quand tout va bien', () => {
  assert.equal(computeMood(base({ city: 8 })), 'content');
});

test('humeur : grognon s’il a été bloqué pendant son dernier tour', () => {
  const s = base({ city: 8 });
  s.stats = { tactiques: 1, lastBlockedTurn: 5, lastTurnBlocks: 1 };
  assert.equal(computeMood(s), 'grognon');
  s.turn = 6; // bloqué il y a un tour : c'est oublié
  assert.equal(computeMood(s), 'content');
});

test('humeur : grognon quand sa partie va mal (jauge basse)', () => {
  const s = base({ turn: 30, city: 2, fire: 0, snow: 0 });
  assert.ok(happiness(s) < 35);
  assert.equal(computeMood(s), 'grognon');
});

test('humeur : endormi en hiver, impatient quand le joueur traîne', () => {
  const s = base({ season: 'hiver', city: 6 });
  assert.equal(computeMood(s), 'endormi');
  assert.equal(computeMood(s, { elapsedMs: TIMING.impatientAfter - 1 }), 'endormi');
  assert.equal(computeMood(s, { elapsedMs: TIMING.impatientAfter }), 'impatient');
});

test('humeur : triomphant ou boudeur au score final (égalité = Pat gagne)', () => {
  const s = base({ ended: true });
  assert.equal(computeMood(s, { final: { patTotal: 90, humanTotal: 80 } }), 'triomphant');
  assert.equal(computeMood(s, { final: { patTotal: 80, humanTotal: 80 } }), 'triomphant');
  assert.equal(computeMood(s, { final: { patTotal: 70, humanTotal: 80 } }), 'boudeur');
  assert.equal(computeMood(s, { final: { patTotal: 70, humanTotal: 0 } }), 'triomphant');
});

test('jauge d’humeur bornée entre 0 et 100', () => {
  assert.equal(happiness(base({ city: 40, fire: 20 })), 100);
  assert.equal(happiness(base({ turn: 80, city: 0, fire: 0, snow: 0 })), 0);
});

test('répliques : aucune répétition avant d’avoir épuisé la liste', () => {
  const pet = newPet();
  const rnd = makeRng(3);
  for (const mood of Object.keys(MOODS)) {
    const n = LINES[mood].length;
    const seen = new Set();
    for (let k = 0; k < n; k++) seen.add(pickLine(pet, mood, base(), rnd).i);
    assert.equal(seen.size, n, mood);
    // La liste repart, sans redire tout de suite la dernière réplique.
    const last = pet.last.i;
    const next = pickLine(pet, mood, base(), rnd);
    assert.notEqual(next.i, last);
  }
});

test('répliques : survit à une sauvegarde JSON (localStorage / annuler)', () => {
  let pet = newPet();
  const rnd = makeRng(9);
  const first = [];
  for (let k = 0; k < 5; k++) first.push(pickLine(pet, 'grognon', base(), rnd).i);
  pet = JSON.parse(JSON.stringify(pet));
  for (let k = 0; k < LINES.grognon.length - 5; k++) assert.ok(!first.includes(pickLine(pet, 'grognon', base(), rnd).i));
});

test('répliques : variables remplacées', () => {
  const t = fill('{city} cartes, {snow} neige, {tokens} jetons', base({ city: 7, snow: 3, patTokensVallee: 2, patTokensFixed: 1 }));
  assert.equal(t, '7 cartes, 3 neige, 3 jetons');
  for (const l of Object.values(LINES).flat()) assert.ok(!/\{/.test(fill(l, base())), l);
});

test('les compteurs de l’humeur n’altèrent pas les règles (parties simulées)', () => {
  for (let level = 1; level <= 4; level++) {
    for (let g = 0; g < 15; g++) {
      const s = newGame({ level, seed: 100 + g });
      playGame(s, makeRng(g + 1));
      assert.ok(s.ended);
      assert.ok(s.stats.tactiques >= 0);
      assert.ok(['triomphant', 'boudeur'].includes(computeMood(s, { final: { patTotal: 50, humanTotal: 60 } })));
    }
  }
});

test('Tactiques : marque le tour comme « bloqué »', () => {
  const s = newGame({ level: 2, seed: 1 });
  startTurn(s);
  let guard = 0;
  while (s.pending && s.pending.kind !== 'place' && guard++ < 20) answer(s, 'ok', { color: 'rouge' });
  if (s.pending?.kind === 'place') {
    answer(s, 'blocked');
    assert.equal(s.stats.lastBlockedTurn, s.turn);
    assert.ok(s.stats.tactiques >= 1);
  }
});
