// Règles vérifiées d'après le livret officiel Everdell: Silverfrost (2025), le résumé et le livret Everdell (v1.7.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startTurn, answer, giveToPat, cityColors, RANGER_OCCUPIED } from '../logic.js';

function toRanger(seed = 3) {
  const s = newGame({ level: 2, seed, startWorkers: 0 });
  for (let i = 0; i < 60; i++) {
    startTurn(s);
    if (s.pending.kind === 'place' && s.pending.loc !== 'forge') return s;
    s.pending = null;
  }
  throw new Error('pas de placement du garde forestier');
}

test('Garde forestier de Pat : ton ouvrier sur le lieu → posé sans feu (livret p.19)', () => {
  const s = toRanger();
  assert.equal(s.pending.worker, 'ranger');
  answer(s, 'occupied');
  assert.equal(s.fire, 0);
  assert.equal(s.workers.rangerPlaced, true);
});

test('Garde forestier : ancien nom « sharedHuman » toujours accepté', () => {
  assert.deepEqual(RANGER_OCCUPIED, ['occupied', 'sharedHuman']);
  const s = toRanger();
  answer(s, 'sharedHuman');
  assert.equal(s.fire, 0);
});

test('Garde forestier : lieu libre → +1 feu', () => {
  const s = toRanger();
  answer(s, 'ok');
  assert.equal(s.fire, 1);
});

function toCard(s) {
  for (let i = 0; i < 60; i++) {
    startTurn(s);
    if (s.pending.kind === 'card') return s;
    s.pending = null;
  }
  throw new Error('pas de carte');
}

test('Carte rouge : couleur comptée et rappel du lieu exclusif dans le journal', () => {
  const s = toCard(newGame({ level: 2, seed: 7 }));
  answer(s, 'ok', { color: 'rouge' });
  assert.equal(cityColors(s).rouge, 1);
  assert.equal(s.city, 1);
  assert.ok(s.log.some((l) => /Carte rouge : son lieu principal est réservé à Pat.*lieu Communauté/.test(l.msg)));
});

test('Couleurs de la ville : anciennes sauvegardes sans cityColors', () => {
  const s = newGame({ level: 2, seed: 7 });
  delete s.cityColors;
  assert.deepEqual(cityColors(s), { violet: 0, bleu: 0, rouge: 0, beige: 0, vert: 0 });
  toCard(s);
  answer(s, 'ok', { color: 'vert' });
  assert.equal(s.cityColors.vert, 1);
});

test('Quête en montagne de Pat : le journal dit qu’elle n’est plus pour toi', () => {
  const s = newGame({ level: 2, seed: 1 });
  s.pending = { kind: 'guildQuest', via: null };
  s.cur = { usedTactiques: false, tokenDone: false };
  answer(s, 'mountain', { points: 6 });
  assert.equal(s.quests.points, 6);
  assert.ok(s.log.some((l) => /n’est plus disponible pour toi/.test(l.msg)));
});

test('Joueur à ta gauche = Pat : dons de feu, de carte et de ressource', () => {
  const s = newGame({ level: 2, seed: 1 });
  giveToPat(s, 'feu');
  giveToPat(s, 'carte', 2);
  giveToPat(s, 'ressource', 3);
  assert.equal(s.fire, 1);
  assert.equal(s.faceDown, 2);
  assert.ok(s.log.some((l) => /retour à la réserve/.test(l.msg)));
  assert.throws(() => giveToPat(s, 'baies'));
});

test('Rien ne se donne à Pat après qu’il a passé (livret p.17 « End of game »)', () => {
  const s = newGame({ level: 2, seed: 1 });
  s.passed = true;
  giveToPat(s, 'feu'); giveToPat(s, 'carte');
  assert.equal(s.fire, 0);
  assert.equal(s.faceDown, 0);
  assert.ok(s.log.some((l) => /Pat a passé/.test(l.msg)));
});

test('Pat n’a pas de main : carte donnée face cachée, sans limite de 8', () => {
  const s = newGame({ level: 2, seed: 1 });
  s.faceDown = 7;
  giveToPat(s, 'carte', 2);
  assert.equal(s.faceDown, 9);
});
