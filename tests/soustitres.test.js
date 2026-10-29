// Sous-titres (v1.8.1) : masqués par défaut, réglage gardé, classe html.subs-on, CSS sans espace laissé.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { subsSettings, applySubs, SUBS_KEY } from '../soustitres.js';

test('par défaut : sous-titres coupés', () => {
  assert.equal(subsSettings.on, false);
  assert.equal(SUBS_KEY, 'pat-cognefoudre:soustitres');
});
test('applySubs pose ou retire la classe subs-on', () => {
  const cls = new Set();
  const root = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) } };
  applySubs(root); assert.equal(cls.has('subs-on'), false);
  subsSettings.on = true; applySubs(root); assert.equal(cls.has('subs-on'), true);
  subsSettings.on = false; applySubs(root); assert.equal(cls.has('subs-on'), false);
});
test('CSS : bulle et sous-titre de l’intro en display:none sans subs-on ; fichier en cache SW', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /html:not\(\.subs-on\) \.bubble, html:not\(\.subs-on\) \.intro-line \{ display: none; \}/);
  assert.match(fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /'soustitres\.js'/);
});
