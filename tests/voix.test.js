// Répliques numérotées : chaîne a + nombre + b ; boucles vidéo par humeur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { audioChain, SEG_GAP_MS } from '../voice.js';
import { clipName, videoUrl, posterUrl, MOOD_LIST, FADE_MS } from '../avatar.js';
import { LINES, MIN_VALUE, MAX_VALUE } from '../pet.js';

const segs = ['seg-content-6-a', 'seg-content-6-b', 'seg-content-12-a', 'seg-content-12-b', 'seg-grognon-10-a', 'seg-grognon-10-b'];
const nums = Array.from({ length: 29 }, (_, i) => `nombre-${i + 2}`);
const all = new Set([...segs, ...nums, 'content-0', 'content-6-12']);

test('réplique numérotée → 3 segments', () => {
  assert.deepEqual(audioChain('content-6-12', all), ['seg-content-6-a', 'nombre-12', 'seg-content-6-b']);
  assert.deepEqual(audioChain('content-12-25', all), ['seg-content-12-a', 'nombre-25', 'seg-content-12-b']);
  assert.deepEqual(audioChain('grognon-10-2', all), ['seg-grognon-10-a', 'nombre-2', 'seg-grognon-10-b']);
});
test('segments incomplets → ancien fichier entier, sinon rien', () => {
  const partial = new Set(['seg-content-6-a', 'nombre-12', 'content-6-12']);
  assert.deepEqual(audioChain('content-6-12', partial), ['content-6-12']);
  assert.equal(audioChain('content-6-13', partial), null);
});
test('réplique sans nombre → son fichier', () => {
  assert.deepEqual(audioChain('content-0', all), ['content-0']);
  assert.equal(audioChain('content-99', all), null);
});
test('tous les nombres possibles ont un segment', () => {
  for (const k of ['city', 'snow', 'tokens']) for (let n = MIN_VALUE[k]; n <= MAX_VALUE[k]; n++) assert.ok(all.has(`nombre-${n}`), `nombre-${n}`);
  assert.ok(SEG_GAP_MS >= 50 && SEG_GAP_MS <= 150);
});
test('boucles vidéo repos/parle par humeur', () => {
  assert.equal(MOOD_LIST.length, 6);
  for (const m of Object.keys(LINES)) assert.ok(MOOD_LIST.includes(m), m);
  assert.equal(clipName('grognon', false), 'grognon-repos');
  assert.equal(clipName('grognon', true), 'grognon-parle');
  assert.equal(videoUrl('content-parle', 'webm'), 'video/pat-content-parle.webm');
  assert.equal(posterUrl('endormi'), 'video/pat-endormi.jpg');
  assert.ok(FADE_MS >= 150 && FADE_MS <= 250);
});
