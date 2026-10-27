// E2E des règles de base Silverfrost (résumé) dans l'app : onglet Règles (base puis solo), garde forestier
// sur le lieu de ton ouvrier, Vallée à doubles empilés, joueur à ta gauche = Pat (Suivi). Captures regles-*.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];
const step = async (name, fn) => { try { const r = await fn(); results.push(`✔ ${name}${r ? ` : ${r}` : ''}`); } catch (e) { failed++; results.push(`✘ ${name} : ${e.message}`); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?intro=0`);
await page.evaluate(async () => {
  const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9;
  const v = await import('./voice.js'); v.voiceSettings.on = false;
});
const shotSection = async (sel, file) => { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${SHOTS}/${file}` }); };

await step('niveau 4 : pile Quête de Pat = 3 en plaine + 2 en montagne (5)', async () => {
  const small = await page.textContent('[data-level="4"]');
  assert(/3Quête en plaine.*\+ 2Quête en montagne/.test(small.replace(/\s+/g, ' ')), small);
  await page.click('[data-level="4"]'); await page.click('#btn-start');
  const cells = await page.$$eval('table.score td.n', (t) => t.map((x) => x.textContent.trim()));
  assert(cells.join() === '3,2,5', JSON.stringify(cells));
  assert(await page.$$eval('.qpile .scroll-ico', (l) => l.length) === 5, 'icônes de la pile');
  assert(!(await page.textContent('body')).includes('carte Aide'), 'ancienne note 3 + 1');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /partie|game|state/i.test(k)) || 'null')));
  if (st && 'questPile' in st) assert(st.questPile === 5, `questPile ${st.questPile}`);
  await page.evaluate(() => document.querySelector('table.score').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: `${SHOTS}/niveau4-quetes.png` });
});
await page.evaluate(() => localStorage.clear()); await page.goto(`${BASE}?intro=0`);
await page.evaluate(async () => {
  const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9;
  const v = await import('./voice.js'); v.voiceSettings.on = false;
});
await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
await step('Règles : 3 couches (Everdell, changements Silverfrost, solo Pat), 9 points du résumé', async () => {
  await page.click('[data-tab="regles"]');
  const order = await page.evaluate(() => [...document.querySelectorAll('.rules h3')].map((h) => h.id).filter(Boolean));
  assert(order.join() === 'everdell,silverfrost,solo', JSON.stringify(order));
  const n1 = await page.$$eval('ul.everdell li', (l) => l.length);
  assert(n1 === 7, `${n1} règles Everdell`);
  const n = await page.$$eval('ul.silverfrost li', (l) => l.length);
  assert(n === 9, `${n} points`);
  const txt = await page.textContent('.rules');
  for (const w of ['premier Everdell', '8 cartes', 'livret officiel', 'Pas d’Événements', 'Cheminées', 'Balises', 'doubles sont empilés', 'Cartes rouges', 'Joueur à ta gauche']) assert(txt.includes(w), w);
  await page.evaluate(() => document.querySelector('#everdell').scrollIntoView());
  await page.screenshot({ path: `${SHOTS}/regles-everdell.png` });
  await page.evaluate(() => document.querySelector('#silverfrost').scrollIntoView());
  await page.screenshot({ path: `${SHOTS}/regles-silverfrost.png` });
});

await page.click('[data-tab="tour"]');
let seenRanger = false; let seenCard = false;
await step('tour de Pat : garde forestier (ton ouvrier déjà là) et Vallée (doubles empilés)', async () => {
  for (let i = 0; i < 400 && !(seenRanger && seenCard); i++) {
    if (await page.$('[data-player] #btn-done, [data-player]')) {
      const b = await page.$('[data-player] button.btn.huge, #btn-done');
      if (b) { await b.click(); continue; }
    }
    const k = await page.getAttribute('[data-step]', 'data-step').catch(() => null);
    if (!k) { const t = await page.$('#btn-turn'); if (t) await t.click(); else break; continue; }
    if (k === 'place' && await page.$('[data-a="occupied"]') && !seenRanger) {
      const t = await page.textContent('[data-step="place"]');
      assert(/où se trouve ton ouvrier/.test(t) && /lieu exclusif/.test(t), t);
      await shotSection('[data-step="place"]', 'regles-garde.png');
      seenRanger = true;
      await page.click('[data-a="occupied"]');
      continue;
    }
    if (k === 'card' && !seenCard && /Vallée/.test(await page.textContent('[data-step="card"]'))) {
      assert(/8 cartes différentes/.test(await page.textContent('[data-step="card"]')), 'doubles empilés');
      await shotSection('[data-step="card"]', 'regles-vallee.png');
      seenCard = true;
    }
    await page.click({ idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]');
  }
  assert(seenRanger && seenCard, `garde ${seenRanger}, vallée ${seenCard}`);
});

await step('Suivi : joueur à ta gauche = Pat, dons feu/carte/ressource', async () => {
  await page.click('[data-tab="suivi"]');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:partie') || 'null'));
  await page.click('[data-ev="give-fire"]');
  await page.click('[data-ev="give"]');
  await page.click('[data-ev="give-res"]');
  const t = await page.textContent('[data-card="voisin"]');
  assert(/Joueur à ta gauche = Pat/.test(t), t);
  await shotSection('[data-card="voisin"]', 'regles-voisin.png');
  return before ? 'ok' : 'dons enregistrés';
});
await step('aucune erreur JS', async () => { assert(errors.length === 0, errors.join(' | ')); });
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} échec(s)` : '\nRègles Silverfrost : tout est vert.');
process.exit(failed ? 1 : 0);
