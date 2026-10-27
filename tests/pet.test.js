import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINES, MOODS, TIMING, MIN_VALUE, computeMood, happiness, newPet, pickLine, fill, lineUsable } from '../pet.js';
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
    const rich = base({ city: 9, snow: 5, patTokensVallee: 2, patTokensFixed: 1 });
    for (let k = 0; k < n; k++) seen.add(pickLine(pet, mood, rich, rnd).i);
    assert.equal(seen.size, n, mood);
    // La liste repart, sans redire tout de suite la dernière réplique.
    const last = pet.last.i;
    const next = pickLine(pet, mood, rich, rnd);
    assert.notEqual(next.i, last);
  }
});

test('répliques : survit à une sauvegarde JSON (localStorage / annuler)', () => {
  let pet = newPet();
  const rnd = makeRng(9);
  const first = [];
  for (let k = 0; k < 5; k++) first.push(pickLine(pet, 'grognon', base({ patTokensVallee: 3 }), rnd).i);
  pet = JSON.parse(JSON.stringify(pet));
  for (let k = 0; k < LINES.grognon.length - 5; k++) assert.ok(!first.includes(pickLine(pet, 'grognon', base({ patTokensVallee: 3 }), rnd).i));
});

test('répliques : variables remplacées', () => {
  const t = fill('{city} cartes, {snow} neige, {tokens} jetons', base({ city: 7, snow: 3, patTokensVallee: 2, patTokensFixed: 1 }));
  assert.equal(t, '7 cartes, 3 neige, 3 jetons');
  assert.equal(fill('{city|carte|cartes}', base({ city: 1 })), '1 carte');
  assert.equal(fill('{city|carte|cartes}', base({ city: 0 })), '0 carte');
  assert.equal(fill('{tokens|jeton Pat|jetons Pat}', base({ patTokensVallee: 2, patTokensFixed: 1 })), '3 jetons Pat');
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

test('répliques chiffrées : jamais quand le nombre est trop petit pour se vanter', () => {
  const rnd = makeRng(5);
  const numbered = (mood) => LINES[mood].map((l, i) => (/\{/.test(l) ? i : -1)).filter((i) => i >= 0);
  assert.ok(numbered('content').length >= 2 && numbered('grognon').length >= 1);
  // Début de partie : 0 carte, 0 neige, 0 jeton → aucune réplique chiffrée, même après plusieurs tours de liste.
  for (const [city, snow, tok] of [[0, 0, 0], [2, 1, 1], [1, 0, 0]]) {
    const s = base({ city, snow, patTokensVallee: tok, patTokensFixed: 0 });
    const pet = newPet();
    for (let k = 0; k < 60; k++) {
      for (const mood of ['content', 'grognon']) {
        const r = pickLine(pet, mood, s, rnd);
        assert.ok(!numbered(mood).includes(r.i), `${mood} ${city}/${snow}/${tok} : ${r.text}`);
        assert.ok(!/(^|\D)[01] cartes|\b0 jeton/.test(r.text), r.text);
      }
    }
  }
  // Au seuil, elles redeviennent possibles et s’accordent correctement.
  const s = base({ city: MIN_VALUE.city, snow: MIN_VALUE.snow, patTokensVallee: MIN_VALUE.tokens, patTokensFixed: 0 });
  for (const l of [...LINES.content, ...LINES.grognon].filter((l) => /\{/.test(l))) {
    assert.ok(lineUsable(l, s), l);
    assert.ok(/3 cartes|: 2 !|2 jetons Pat/.test(fill(l, s)), fill(l, s));
  }
  // Toute la liste reste tirable sans boucle infinie quand certaines sont exclues.
  const pet = newPet();
  const seen = new Set();
  for (let k = 0; k < 40; k++) seen.add(pickLine(pet, 'content', base({ city: 0 }), rnd).i);
  assert.equal(seen.size, LINES.content.length - numbered('content').length);
});
