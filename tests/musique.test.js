// Musique de fond : volume voulu (coupée, baissée quand Pat parle) et bornes de boucle sans blanc.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { musicTarget, loopBounds, musicSettings, DUCK_LEVEL, RAMP_S, MUSIC_URL } from '../music.js';

test('réglages par défaut : activée, 28 %', () => {
  assert.equal(musicSettings.on, true);
  assert.equal(musicSettings.volume, 0.28);
  assert.equal(DUCK_LEVEL, 0.1);
  assert.equal(RAMP_S, 0.3);
});
test('volume voulu : coupée → 0, Pat parle → 10 % au plus', () => {
  assert.equal(musicTarget({ on: false, volume: 0.8 }, false), 0);
  assert.equal(musicTarget({ on: false, volume: 0.8 }, true), 0);
  assert.equal(musicTarget({ on: true, volume: 0.28 }, false), 0.28);
  assert.equal(musicTarget({ on: true, volume: 0.28 }, true), 0.1);
  assert.equal(musicTarget({ on: true, volume: 0.05 }, true), 0.05);
  assert.equal(musicTarget({ on: true, volume: '2' }, false), 1);
  assert.equal(musicTarget({ on: true, volume: 'x' }, false), 0);
});
test('bornes de boucle : saute le silence de l’encodeur', () => {
  const d = new Float32Array(100); for (let i = 10; i < 90; i++) d[i] = 0.2;
  assert.deepEqual(loopBounds(d, 100), { start: 0.1, end: 0.9 });
  assert.deepEqual(loopBounds(new Float32Array([0.5, 0.5]), 2), { start: 0, end: 1 });
});
test('fichier de musique présent et léger (≤ 2,5 Mo)', () => {
  const size = fs.statSync(new URL(`../${MUSIC_URL}`, import.meta.url)).size;
  assert.ok(size > 1e6 && size <= 2.5e6, `${size} octets`);
});
