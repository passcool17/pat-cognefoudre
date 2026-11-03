// v1.10.0 : Pat Rive — fichiers, moteur figé, correspondance des bouches, priorité des réactions, cache hors ligne.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOOD_LIST } from '../avatar.js';
import { RIVE_VERSION, RIVE_FILES, RIVE_RUNTIME, MOUTH_INDEX, REACTIONS, stronger, riveSupported, riveUrl } from '../avatar-rive.js';
import { BOUCHE } from '../audio/bouche.js';

test('une scène .riv par humeur, au format Rive', () => {
  assert.equal(RIVE_FILES.length, MOOD_LIST.length);
  for (const m of MOOD_LIST) {
    const b = fs.readFileSync(new URL(`../${riveUrl(m)}`, import.meta.url));
    assert.equal(b.subarray(0, 4).toString('latin1'), 'RIVE', m);
    assert.ok(b.length > 100_000 && b.length < 600_000, `${m} : ${b.length} octets`);
  }
});

test('moteur Rive figé en 2.49.1, copié localement', () => {
  assert.equal(RIVE_VERSION, '2.49.1');
  const js = fs.readFileSync(new URL('../vendor/rive/rive.js', import.meta.url), 'utf8');
  assert.match(js, /"@rive-app\/canvas-lite"/);
  assert.match(js, /2\.49\.1/);
  for (const f of [...RIVE_RUNTIME, 'vendor/rive/rive_fallback.wasm']) assert.ok(fs.statSync(new URL(`../${f}`, import.meta.url)).size > 100_000, f);
  const src = fs.readFileSync(new URL('../avatar-rive.js', import.meta.url), 'utf8');
  assert.match(src, /setWasmUrl/); assert.match(src, /setWasmFallbackUrl/); // sinon le moteur irait sur unpkg/jsdelivr
  assert.doesNotMatch(src, /https?:\/\//);
});

test('toutes les formes Rhubarb ont une bouche Rive (0..6)', () => {
  const used = new Set(Object.values(BOUCHE).join(' ').split(/\s+/).filter(Boolean).map((c) => c[0]));
  for (const s of used) assert.ok(Number.isInteger(MOUTH_INDEX[s]) && MOUTH_INDEX[s] >= 0 && MOUTH_INDEX[s] <= 6, s);
  assert.equal(MOUTH_INDEX.X, 0);
});

test('réactions : la plus forte gagne', () => {
  assert.deepEqual(REACTIONS, ['tourPat', 'points', 'fureur', 'gagne', 'perd']);
  assert.equal(stronger(null, 'tourPat'), 'tourPat');
  assert.equal(stronger('tourPat', 'points'), 'points');
  assert.equal(stronger('fureur', 'points'), 'fureur');
  assert.equal(stronger('points', 'tourPat'), 'points');
  assert.equal(stronger('fureur', 'gagne'), 'gagne');
});

test('repli vidéo sans WebAssembly ou avec ?rive=0', () => {
  assert.equal(riveSupported({ location: { search: '' } }), 'pas de WebAssembly');
  assert.match(riveSupported({ location: { search: '?rive=0' }, WebAssembly }), /désactivé/);
  assert.equal(riveSupported({ location: { search: '' }, WebAssembly }), '');
});

test('service worker v21 : moteur et scènes gardés hors ligne', () => {
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /pat-cognefoudre-v21/);
  for (const f of ['avatar-rive.js', 'vendor/rive/rive.js', 'vendor/rive/rive.wasm']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(sw, /`rive\/pat-\$\{m\}\.riv`/);
});
