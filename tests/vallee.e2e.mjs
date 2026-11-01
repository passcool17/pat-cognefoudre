// E2E v1.8.2 (décision de Pascal) : pendant ton tour, le Complot en cours reste affiché pour savoir quelle carte
// Pat pioche dans la Vallée (tour du joueur + Suivi), et la règle maison est dans l'onglet Règles. Captures carte-vallee/*.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots/carte-vallee';
fs.mkdirSync(SHOTS, { recursive: true });
function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0; const results = [];
const step = async (name, fn) => { try { const r = await fn(); results.push(`✔ ${name}${r ? ` : ${r}` : ''}`); } catch (e) { failed++; results.push(`✘ ${name} : ${e.message}`); } };
const ctx = await browser.newContext({ viewport: { width: 412, height: 914 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', serviceWorkers: 'block' });
await ctx.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('dialog', (d) => d.accept());
await page.goto(`${BASE}?intro=0`);
await page.evaluate(async () => {
  const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9;
  const v = await import('./voice.js'); v.voiceSettings.on = false;
});
await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');

async function patTurn() {
  for (let i = 0; i < 40; i++) {
    const kind = await page.getAttribute('[data-step]', 'data-step');
    if (kind === 'idle') { if (await page.$('[data-player]') && i > 0) return; await page.click('#btn-turn'); continue; }
    if (kind === 'card') { await page.click('[data-color]'); continue; }
    if (kind === 'askHuman') { await page.click('[data-a="no"]'); continue; }
    if (kind === 'guildQuest') { await page.click('[data-a="mountain"]'); continue; }
    if (kind === 'patToken') { await page.click('[data-a]'); continue; }
    await page.click('[data-a="ok"]');
  }
  throw new Error('Tour de Pat interminable');
}

await step('version 1.8.2', async () => {
  const v = await page.evaluate(async () => (await import('./app.js')).VERSION);
  assert(v === '1.8.2', v);
});
await patTurn();
await step('tour du joueur : encadré « Si Pat pioche dans la Vallée » avec le Complot en cours', async () => {
  const box = await page.$('[data-player] [data-card="vallee-pick"]');
  assert(box, 'encadré absent');
  const txt = (await box.textContent()).replace(/\s+/g, ' ');
  const cid = (await page.textContent('.complot .kicker')).replace('Complot ', '').trim();
  assert(txt.includes(`Complot ${cid}`), `Complot ${cid} absent : ${txt}`);
  const planChips = await page.$$eval('.complot .chip', (l) => l.map((x) => x.textContent.trim()).join());
  const boxChips = await box.$$eval('.chip', (l) => l.map((x) => x.textContent.trim()).join());
  assert(planChips === boxChips, `${boxChips} ≠ ${planChips}`);
  assert(/valeur la plus haute.*neige.*Face cachée chez lui.*décision de Pascal/.test(txt), txt);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/tour-joueur.png` });
  await box.screenshot({ path: `${SHOTS}/encadre-vallee.png` });
  return `Complot ${cid} : ${boxChips}`;
});
await step('encadré repliable', async () => {
  await page.click('[data-player] .vallee-pick summary');
  const open = await page.$eval('[data-player] .vallee-pick', (d) => d.open);
  assert(!open, 'pas replié');
  await page.screenshot({ path: `${SHOTS}/tour-joueur-replie.png` });
});
await step('Suivi : encadré sous « Je donne une carte à Pat / il pioche »', async () => {
  await page.click('[data-tab="suivi"]');
  const box = await page.$('[data-card="voisin"] [data-card="vallee-pick"]');
  assert(box, 'absent du Suivi');
  await page.$eval('[data-card="voisin"]', (el) => el.scrollIntoView());
  const el = await page.$('[data-card="voisin"]');
  await el.screenshot({ path: `${SHOTS}/suivi-voisin.png` });
});
await step('Règles : décision de Pascal', async () => {
  await page.click('[data-tab="regles"]');
  const t = (await page.textContent('body')).replace(/\s+/g, ' ');
  assert(/pioche dans la Vallée pendant ton tour.*décision de Pascal/.test(t), 'règle maison absente');
});
await browser.close();
console.log(results.join('\n'));
if (errors.length) { console.log('Erreurs :', errors); failed++; }
console.log(failed ? `${failed} échec(s)` : 'OK');
process.exit(failed ? 1 : 0);
