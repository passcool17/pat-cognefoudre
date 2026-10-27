// Bout en bout : la campagne « L'année du Lapin » complète (années 1 à 4, une défaite à l'année 2)
// sur téléphone (390×844) et tablette (820×1180).
// Usage : BASE_URL=http://localhost:8765/ node tests/campagne.e2e.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(SHOTS, { recursive: true });

let seed = 777;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const viewports = [
  { name: 'telephone', width: 390, height: 844 },
  { name: 'tablette', width: 820, height: 1180 },
];
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const results = [];
let failed = 0;

function assert(c, msg) { if (!c) throw new Error(msg); }

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'fr-CA' });
  // Tirage déterministe : Math.random graine fixe à chaque chargement (graine des parties comprise) et
  // bavardages de Pat coupés (leurs minuteries consommeraient des tirages selon le temps écoulé).
  await ctx.addInitScript(() => {
    let a = 20261027;
    Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    import('./pet.js').then(({ TIMING }) => { for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9; }).catch(() => {});
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const pre = vp.name === 'telephone' ? 'campagne-' : 'campagne-tablette-';
  const shot = async (name, full = false) => { await page.waitForTimeout(150); await page.screenshot({ path: `${SHOTS}/${pre}${name}.png`, fullPage: full }); };
  const st = () => page.evaluate(() => window.__pat.state);
  const carnet = () => page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:campagne')));
  const seen = new Set();

  async function playToEnd(hooks = {}) {
    let steps = 0;
    while (true) {
      if (++steps > 3000) throw new Error('Partie interminable');
      const rem = await page.$('[data-reminder]');
      if (rem) {
        const key = await rem.getAttribute('data-reminder');
        if (hooks.reminder) await hooks.reminder(key);
        await page.click('[data-camp="dismiss"]');
        continue;
      }
      const el = await page.$('[data-step]');
      const kind = el ? await el.getAttribute('data-step') : null;
      if (await page.$('.camp-mist')) seen.add(`mist-${kind}`);
      if (hooks.step) await hooks.step(kind);
      if (kind === 'over') break;
      if (kind === 'idle') {
        if (await page.$('#btn-human-prep') && rnd() < 0.5) { await page.click('#btn-human-prep'); continue; }
        await page.click('#btn-turn');
        continue;
      }
      if (kind === 'askHuman') { await page.click(rnd() < 0.6 ? '[data-a="yes"]' : '[data-a="no"]'); continue; }
      if (kind === 'place') { await page.click(rnd() < 0.3 ? '[data-a="blocked"]' : '[data-a="ok"]'); continue; }
      if (kind === 'card') { const c = await page.$$('[data-color]'); await c[Math.floor(rnd() * c.length)].click(); continue; }
      if (kind === 'guildQuest') { await page.click(rnd() < 0.4 ? '[data-a="mountain"]' : '[data-a="none"]'); continue; }
      if (kind === 'patToken') { await page.click('[data-a]'); continue; }
      if (['prepare', 'balise', 'voyageValue', 'pileQuest', 'done', 'endCollect'].includes(kind)) { await page.click('[data-a="ok"]'); continue; }
      if (kind === 'passed') { await page.click('[data-a="humanPassed"]'); continue; }
      throw new Error(`Étape inconnue : ${kind}`);
    }
  }
  // Décompte : Pat 42 en cartes ; humain = Pat + delta (avant pénalité).
  async function scoreAndFinish(delta, shotName) {
    await page.click('button[data-tab="score"]');
    await page.fill('[name="cardPoints"]', '42');
    await page.dispatchEvent('[name="cardPoints"]', 'change');
    const pat = Number(await page.textContent('#pat-total'));
    await page.fill('[name="human"]', String(pat + delta));
    await page.dispatchEvent('[name="human"]', 'change');
    if (shotName) await shot(shotName, true);
    await page.click('#btn-camp-finish');
    await page.waitForSelector('[data-camp-view="fin"]');
    return pat;
  }
  async function startYear(critter, shotName) {
    await page.waitForSelector('[data-camp-view="intro"]');
    if (shotName) await shot(shotName, true);
    assert(await page.$eval('#btn-camp-start', (b) => b.disabled), 'Démarrage possible sans créature');
    await page.click(`[data-camp-critter="${critter}"]`);
    await page.click('#btn-camp-start');
    await page.waitForSelector('#btn-ready');
    await page.click('#btn-ready');
  }

  try {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await shot('00-accueil', true);
    await page.click('#btn-camp');
    await page.waitForSelector('[data-camp-view="carnet"]');
    await shot('01-prologue', true);
    await page.click('[data-camp-level="3"]');
    await page.click('[data-camp="create"]');

    // ---------- Année 1 : créature activée, retournée par une quête, réactivée, victoire ----------
    await startYear('truffle', '02-intro-annee1');
    assert((await st()).campaign.year === 1, 'Partie sans état de campagne');
    assert((await st()).level === 3, 'Niveau de campagne non appliqué');
    await page.click('#btn-turn');
    await playToEnd({
      step: async (kind) => {
        const s = await st();
        if (kind !== 'idle' || s.turn < 3) return;
        if (s.campaign.activations === 0) {
          await page.click('#btn-critter');
          assert((await st()).campaign.faceUp === false, 'Créature non retournée');
          await page.click('#camp-rules summary');
          await shot('03-bandeau-annee1', true);
          await page.click('#camp-rules summary');
        } else if (s.campaign.activations === 1 && !s.campaign.faceUp) {
          await page.click('[data-camp="guildGoal"]');
          assert((await st()).campaign.faceUp === true, 'Quête de Guilde sans effet');
          await page.click('#btn-critter');
        }
      },
    });
    await scoreAndFinish(1, '04-score-annee1');
    await shot('05-fin-annee1', true);
    assert((await page.textContent('#camp-verdict')).includes('Année 1 gagnée'), 'Verdict année 1');
    let c = await carnet();
    assert(c.year === 2 && !c.roster.includes('truffle') && c.discard.includes('truffle'), 'Équipe non mise à jour après l’année 1');

    // ---------- Année 2 : allié, réfugiés, pénalité, défaite (égalité après pénalité = défaite) ----------
    await page.click('[data-camp="intro"]');
    await page.waitForSelector('[data-camp-ally]');
    await page.click('[data-camp-ally="pingouins"]');
    await startYear('puddle', '06-intro-annee2');
    await page.click('#btn-turn');
    let refugees = 0;
    await playToEnd({
      reminder: async (key) => {
        if (key === 'automne') {
          await shot('07-rappel-refugies', true);
          const before = (await st()).workers.normal;
          await page.click('[data-reminder] [data-camp="refugee"]');
          refugees++;
          assert((await st()).workers.normal === before + 1, 'Réfugié non ajouté aux ouvriers de Pat');
        }
        if (key === 'fin') { await page.click('[data-reminder] [data-camp="refugee"]'); refugees++; }
      },
    });
    assert((await st()).campaign.refugeesLost === refugees && refugees >= 1, `Réfugiés : ${refugees}`);
    const pen = 5 * refugees;
    const pat2 = await scoreAndFinish(pen, '08-score-annee2');
    await shot('09-fin-defaite-annee2', true);
    assert((await page.textContent('#camp-verdict')).includes('égalité'), 'Égalité non traitée comme défaite');
    c = await carnet();
    assert(c.year === 2 && c.roster.includes('puddle') && c.games.at(-1).human === pat2, 'Défaite mal enregistrée');
    // Rejouer l'année 2 et gagner (on n'ajoute pas de réfugié).
    await page.click('[data-camp="intro"]');
    await startYear('puddle');
    await page.click('#btn-turn');
    await playToEnd();
    await scoreAndFinish(10);
    c = await carnet();
    assert(c.year === 3, 'Année 2 non validée');

    // ---------- Année 3 : brume ----------
    await page.click('[data-camp="intro"]');
    await startYear('bravehorn', '10-intro-annee3');
    assert((await st()).opts.mist === true, 'Mode brume absent');
    await page.click('#btn-turn');
    let mistShot = false;
    await playToEnd({
      step: async (kind) => {
        if (!mistShot && kind === 'card' && await page.$('.camp-mist')) { await shot('11-brume-vallee', true); mistShot = true; }
      },
    });
    for (const k of ['card', 'balise', 'guildQuest']) assert(seen.has(`mist-${k}`), `Consigne brume absente : ${k}`);
    await scoreAndFinish(5);

    // ---------- Année 4 : bandits, interlude, victoire, épilogue ----------
    await page.click('[data-camp="intro"]');
    await startYear('whisper', '12-intro-annee4');
    await page.click('#btn-turn');
    let interlude = false;
    await playToEnd({
      reminder: async (key) => {
        if (key === 'printemps') {
          interlude = !!(await page.$('[data-reminder] details'));
          await shot('13-rappel-interlude', true);
        }
      },
    });
    assert(interlude, 'Interlude jamais affiché');
    await page.click('button[data-tab="regles"]');
    await page.evaluate(() => document.querySelector('.rules.camp').scrollIntoView());
    await shot('14-regles-campagne');
    await scoreAndFinish(3);
    await shot('15-fin-campagne', true);
    c = await carnet();
    assert(c.finished && c.games.length === 5 && c.games.filter((g) => g.win).length === 4, `Campagne non terminée : ${JSON.stringify({ f: c.finished, n: c.games.length, y: c.year })}`);
    await page.click('[data-camp="epilogue"]');
    await shot('16-epilogue', true);
    await page.click('[data-camp="carnet"]');
    await shot('17-carnet-final', true);
    if (errors.length) throw new Error('Erreurs console : ' + errors.join(' | '));
    results.push(`✔ ${vp.name} : campagne complète (${c.games.length} parties, ${c.games.filter((g) => g.win).length} victoires), équipe finale ${c.roster.join(', ') || '—'}`);
  } catch (e) {
    failed++;
    results.push(`✘ ${vp.name} : ${e.message}`);
    await page.screenshot({ path: `${SHOTS}/ERREUR-campagne-${vp.name}.png`, fullPage: true }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} échec(s)` : 'Campagne e2e : tout passe');
process.exit(failed ? 1 : 0);
