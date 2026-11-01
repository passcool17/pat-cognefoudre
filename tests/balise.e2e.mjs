// E2E v1.8.3 : écran Balise = 2 indications du Complot (balise de l'ouvrier + emplacement à N jetons Point), points crédités.
// Captures balise/*.png. BASE_URL=… pour le site en ligne.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots/balise';
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
await page.goto(`${BASE}?intro=0`);

// Partie simulée jusqu'à une Balise (côté gauche, 3 points si possible, comme la photo de Pascal), puis rechargement.
const found = await page.evaluate(async () => {
  const L = await import('./logic.js'); const { respond, makeRng } = await import('./tests/sim.js');
  let best = null;
  for (let seed = 1; seed < 400; seed++) {
    const s = L.newGame({ level: 2, seed }); const r = makeRng(seed);
    for (let i = 0; i < 3000 && !s.ended; i++) {
      if (!s.pending) L.startTurn(s);
      if (s.pending.kind === 'balise') break;
      respond(s, r);
    }
    if (s.pending?.kind !== 'balise') continue;
    if (!best) best = s;
    if (s.pending.side === 'g' && s.pending.value === 3) { best = s; break; }
  }
  localStorage.setItem('pat-cognefoudre:state', JSON.stringify(best));
  localStorage.setItem('pat-cognefoudre:history', '[]');
  return { side: best.pending.side, value: best.pending.value, points: best.points };
});
await page.goto(`${BASE}?intro=0`);
await page.evaluate(async () => {
  const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9;
});

await step('version 1.8.3', async () => {
  const v = await page.evaluate(async () => (await import('./app.js')).VERSION);
  assert(v === '1.8.3', v);
});
await step('écran Balise : la balise ET l’emplacement à N points, séparés', async () => {
  await page.waitForSelector('[data-step="balise"]');
  const b = (await page.textContent('[data-bal="balise"]')).replace(/\s+/g, ' ');
  const pt = (await page.textContent('[data-bal="points"]')).replace(/\s+/g, ' ');
  const side = found.side === 'g' ? 'gauche' : 'droite';
  assert(b.includes(`balise de ${side}`), b);
  assert(pt.includes(`${found.value} jeton`) && pt.includes(`Pat gagne ${found.value} point`), pt);
  const all = await page.textContent('[data-step="balise"]');
  assert(!/de la balise \d/.test(all), 'ancien texte « de la balise N »');
  const val = await page.inputValue('[data-step="balise"] input[name="points"]');
  assert(Number(val) === found.value, `stepper ${val}`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/balise-ecran.png` });
  await (await page.$('[data-step="balise"]')).screenshot({ path: `${SHOTS}/balise-carte.png` });
  return `balise de ${side}, ${found.value} points`;
});
await step('Valider → points crédités à Pat', async () => {
  await page.click('[data-step="balise"] [data-a="ok"]');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:state')));
  assert(st.points === found.points + found.value, `points ${st.points}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/apres-balise.png` });
});
await step('Règles : 2 indications de la Balise', async () => {
  await page.click('[data-tab="regles"]');
  const t = (await page.textContent('body')).replace(/\s+/g, ' ');
  assert(t.includes('le Complot donne 2 choses') && t.includes('« Balise ? »'), 'règle absente');
});
await browser.close();
console.log(results.join('\n'));
if (errors.length) { console.log('Erreurs :', errors); failed++; }
console.log(failed ? `${failed} échec(s)` : 'OK');
process.exit(failed ? 1 : 0);
