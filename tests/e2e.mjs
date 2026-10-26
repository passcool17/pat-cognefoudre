// Tests de bout en bout : une partie complète par niveau, sur téléphone (390×844) et tablette (820×1180).
// Usage : BASE_URL=http://localhost:8765/ node tests/e2e.mjs  (Chrome système par défaut)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(SHOTS, { recursive: true });

let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const viewports = [
  { name: 'telephone', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'tablette', width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const results = [];
let failed = 0;

async function shot(page, name) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

for (const vp of viewports) {
  for (const level of [1, 2, 3, 4]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor, locale: 'fr-CA' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', (d) => d.accept());
    const capture = vp.name === 'telephone' && level === 2;
    const tabletCapture = vp.name === 'tablette' && level === 3;
    const taken = new Set();
    const maybeShot = async (key) => {
      if (!(capture || tabletCapture) || taken.has(key)) return;
      taken.add(key);
      await shot(page, `${vp.name === 'telephone' ? '' : 'tablette-'}${key}`);
    };
    try {
      await page.goto(BASE);
      await page.click(`[data-level="${level}"]`);
      await maybeShot('01-mise-en-place-niveau');
      await page.click('#btn-start');
      await page.waitForSelector('#btn-ready');
      await maybeShot('02-mise-en-place-checklist');
      await page.click('#btn-ready');
      let steps = 0; let undos = 0; let reloaded = false;
      const seen = {};
      while (true) {
        if (++steps > 3000) throw new Error('Partie interminable');
        const stepEl = await page.$('[data-step]');
        const kind = stepEl ? await stepEl.getAttribute('data-step') : null;
        seen[kind] = (seen[kind] || 0) + 1;
        if (kind === 'over') break;
        if (kind === 'idle') {
          // Teste l'annulation et la reprise après rechargement une fois par partie.
          if (steps > 30 && !undos) { await page.click('#btn-undo'); undos++; continue; }
          if (steps > 60 && !reloaded) { await page.reload(); reloaded = true; continue; }
          await page.click('#btn-turn');
          continue;
        }
        if (kind === 'askHuman') { await maybeShot('05-preparation-question'); await page.click(rnd() < 0.6 ? '[data-a="yes"]' : '[data-a="no"]'); continue; }
        if (kind === 'prepare') { await maybeShot('06-preparation-pat'); await page.click('[data-a="ok"]'); continue; }
        if (kind === 'place') {
          await maybeShot('03-tour-ouvrier');
          if (rnd() < 0.25) await page.check('[name="snow"]');
          const r = rnd();
          if (r < 0.3) await page.click('[data-a="blocked"]');
          else if (r < 0.4 && await page.$('[data-a="sharedHuman"]')) await page.click('[data-a="sharedHuman"]');
          else await page.click('[data-a="ok"]');
          continue;
        }
        if (kind === 'card') {
          await maybeShot('04-tour-carte');
          if (await page.$('[name="snow"]') && rnd() < 0.2) await page.check('[name="snow"]');
          const colors = await page.$$('[data-color]');
          await colors[Math.floor(rnd() * colors.length)].click();
          continue;
        }
        if (kind === 'guildQuest') { await maybeShot('07-guilde'); await page.click(rnd() < 0.4 ? '[data-a="mountain"]' : '[data-a="none"]'); continue; }
        if (kind === 'patToken') { await maybeShot('08-jeton-pat'); await page.click('[data-a]'); continue; }
        if (['balise', 'voyageValue', 'pileQuest', 'done', 'endCollect'].includes(kind)) {
          if (kind === 'done') await maybeShot('09-fin-de-tour');
          await page.click('[data-a="ok"]');
          continue;
        }
        if (kind === 'passed') { await maybeShot('10-pat-passe'); await page.click('[data-a="humanPassed"]'); continue; }
        throw new Error(`Étape inconnue à l'écran : ${kind}`);
      }
      // Décompte
      await page.click('button[data-tab="score"]');
      await page.fill('[name="cardPoints"]', '42');
      await page.dispatchEvent('[name="cardPoints"]', 'change');
      await page.fill('[name="human"]', '80');
      await page.dispatchEvent('[name="human"]', 'change');
      const total = Number(await page.textContent('#pat-total'));
      const verdict = await page.textContent('#verdict');
      if (!Number.isFinite(total) || total < 42) throw new Error(`Score incohérent : ${total}`);
      await maybeShot('11-score');
      await page.click('button[data-tab="suivi"]');
      await maybeShot('12-suivi');
      await page.click('button[data-tab="regles"]');
      await maybeShot('13-regles');
      const st = await page.evaluate(() => window.__pat.state);
      if (st.season !== 'printemps' || st.city < 15) throw new Error(`Fin incohérente : ${st.season}, ${st.city} cartes`);
      if (errors.length) throw new Error('Erreurs console : ' + errors.join(' | '));
      results.push(`✔ ${vp.name} niveau ${level} : ${st.turn} tours, ville ${st.city}, score Pat ${total} (${verdict.trim().slice(0, 40)}…), étapes vues ${Object.keys(seen).length}`);
    } catch (e) {
      failed++;
      results.push(`✘ ${vp.name} niveau ${level} : ${e.message}`);
      await page.screenshot({ path: `${SHOTS}/ERREUR-${vp.name}-${level}.png` }).catch(() => {});
    }
    await ctx.close();
  }
}
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} échec(s)` : 'Tous les tests e2e passent');
process.exit(failed ? 1 : 0);
