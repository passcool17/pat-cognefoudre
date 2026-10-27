import { test } from 'node:test';
import assert from 'node:assert/strict';
import { introWanted, INTRO_LINE, INTRO_KEY, INTRO_TIMING } from '../intro.js';
import { TEST_LINE } from '../pet.js';
import { existsSync } from 'node:fs';

test('intro : montrée à chaque ouverture par défaut', () => {
  assert.equal(introWanted({ settings: { on: true } }), true);
  assert.equal(introWanted({ settings: {} }), true);
});
test('intro : coupée dans ⚙️ → pas d’intro', () => {
  assert.equal(introWanted({ settings: { on: false } }), false);
});
test('intro : ?intro=1 / ?intro=0 forcent', () => {
  assert.equal(introWanted({ settings: { on: false }, search: '?intro=1' }), true);
  assert.equal(introWanted({ settings: { on: true }, search: '?intro=0' }), false);
});
test('intro : navigateur piloté par les tests → pas d’intro sauf ?intro=1', () => {
  assert.equal(introWanted({ settings: { on: true }, webdriver: true }), false);
  assert.equal(introWanted({ settings: { on: true }, webdriver: true, search: '?x=1&intro=1' }), true);
});
test('intro : réplique d’accueil grognonne avec sa voix enregistrée', () => {
  assert.equal(INTRO_LINE.text, TEST_LINE);
  assert.equal(INTRO_LINE.mood, 'grognon');
  assert.ok(existsSync(new URL(`../audio/${INTRO_LINE.audio}.mp3`, import.meta.url)));
  assert.equal(INTRO_KEY, 'pat-cognefoudre:intro');
  assert.ok(INTRO_TIMING.maxMs > 6000, 'le filet de sécurité laisse finir la réplique (5,6 s)');
});
