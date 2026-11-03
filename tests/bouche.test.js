// v1.9.0 : bouche qui suit la voix (repères Rhubarb précalculés).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AUDIO_IDS } from '../audio/liste.js';
import { BOUCHE } from '../audio/bouche.js';
import { cues, shapeAt, idFromSrc, OUVERTURE } from '../levres.js';
import { MOOD_LIST } from '../avatar.js';

test('bouche : chaque réplique enregistrée a ses repères, qui commencent et finissent bouche fermée', () => {
  for (const id of AUDIO_IDS) {
    const c = cues(id);
    assert.ok(c && c.length >= 2, `pas de repères pour ${id}`);
    assert.equal(c[c.length - 1][1], 'X', `${id} ne finit pas fermée`);
    for (let i = 1; i < c.length; i++) assert.ok(c[i][0] >= c[i - 1][0], `${id} : repères dans le désordre`);
    for (const [, s] of c) assert.ok(s in OUVERTURE, `${id} : forme inconnue ${s}`);
  }
  assert.equal(Object.keys(BOUCHE).length, AUDIO_IDS.length);
});
test('bouche : forme à un instant donné, fermée avant et après', () => {
  const c = [[0, 'X'], [0.1, 'B'], [0.3, 'D'], [0.5, 'X']];
  assert.equal(shapeAt(c, -1), 'X');
  assert.equal(shapeAt(c, 0.05), 'X');
  assert.equal(shapeAt(c, 0.1), 'B');
  assert.equal(shapeAt(c, 0.42), 'D');
  assert.equal(shapeAt(c, 9), 'X');
  assert.equal(shapeAt(null, 0.2), 'X');
  assert.equal(OUVERTURE.X, 0); assert.equal(OUVERTURE.D, 1);
});
test('bouche : identifiant de réplique depuis l’adresse audio', () => {
  assert.equal(idFromSrc('https://x.io/pat/audio/content-3.mp3'), 'content-3');
  assert.equal(idFromSrc('audio/nombre-12.mp3?v=2'), 'nombre-12');
  assert.equal(idFromSrc('https://x.io/music/theme.mp3'), null);
});
test('bouche : une vidéo « bouche » par humeur (webm + mp4), gardée hors ligne', () => {
  for (const m of MOOD_LIST) for (const ext of ['webm', 'mp4']) assert.ok(fs.existsSync(new URL(`../video/pat-${m}-bouche.${ext}`, import.meta.url)), `${m}.${ext}`);
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /pat-cognefoudre-v2[0-9]/); // v20 à l’origine, v21 depuis Pat Rive
  assert.match(sw, /'audio\/bouche\.js'/); assert.match(sw, /'levres\.js'/);
  assert.match(sw, /repos\|parle\|bouche/);
});
