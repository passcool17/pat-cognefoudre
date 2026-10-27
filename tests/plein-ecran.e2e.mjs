// E2E du mode plein écran : bouton dans l'en-tête, bascule de document.fullscreenElement (Chromium),
// proposition de retour après rechargement, bouton masqué sans API ou en app installée, astuce iPhone unique.
// Usage : BASE_URL=http://localhost:8765/ node tests/plein-ecran.e2e.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const viewports = [
  { name: 'telephone', width: 390, height: 844 },
  { name: 'tablette', width: 820, height: 1180 },
];
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const noFullscreenApi = () => {
  delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen;
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false, configurable: true });
};
const standalone = () => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/display-mode: standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
};

function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const results = []; let failed = 0;
const fsEl = (page) => page.evaluate(() => (document.fullscreenElement ? document.fullscreenElement.tagName : null));
const label = (page) => page.getAttribute('#btn-fullscreen', 'aria-label');

async function run(name, opts, fn) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-CA', ...(opts.ctx || {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(BASE);
    await fn(page);
    assert(!errors.length, `erreurs JS : ${errors.join(' | ')}`);
    results.push(`✔ ${name}`);
  } catch (e) { failed++; results.push(`✘ ${name} : ${e.message}`); }
  await ctx.close();
}

for (const vp of viewports) {
  const pre = vp.name === 'telephone' ? 'plein-ecran-' : 'plein-ecran-tablette-';
  await run(`${vp.name} : bouton visible et bascule plein écran`, { viewport: { width: vp.width, height: vp.height } }, async (page) => {
    const btn = page.locator('#btn-fullscreen');
    assert(await btn.isVisible(), 'bouton plein écran invisible');
    assert(await label(page) === 'Plein écran', `étiquette ${await label(page)}`);
    await page.screenshot({ path: `${SHOTS}/${pre}bouton.png` });
    // Écran de jeu aussi (en-tête partagé par tous les écrans)
    await page.click('[data-level="2"]'); await page.click('#btn-start');
    assert(await btn.isVisible(), 'bouton absent sur l’écran de jeu');
    await btn.click();
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    assert(await fsEl(page) === 'HTML', 'document.fullscreenElement attendu sur <html>');
    assert(await label(page) === 'Quitter le plein écran', `étiquette après entrée ${await label(page)}`);
    assert(await page.getAttribute('#btn-fullscreen', 'aria-pressed') === 'true', 'aria-pressed');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOTS}/${pre}actif.png` });
    await btn.click();
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 });
    await page.waitForFunction(() => document.querySelector('#btn-fullscreen').getAttribute('aria-label') === 'Plein écran', null, { timeout: 3000 })
      .catch(() => { throw new Error('étiquette après sortie'); });
  });
}

await run('préférence : proposition de revenir en plein écran après rechargement', {}, async (page) => {
  await page.click('#btn-fullscreen');
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.reload();
  assert(!(await fsEl(page)), 'plein écran gardé au rechargement (inattendu)');
  const go = page.locator('#fs-hint-retour .fs-go');
  await go.waitFor({ timeout: 2000 });
  await page.screenshot({ path: `${SHOTS}/plein-ecran-retour.png` });
  await go.click();
  await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
  assert(!(await page.locator('#fs-hint-retour').count()), 'bandeau resté affiché');
  // Sortie volontaire → plus de proposition
  await page.click('#btn-fullscreen');
  await page.waitForFunction(() => localStorage.getItem('pat-cognefoudre:plein-ecran') === '0', null, { timeout: 3000 });
  await page.reload();
  await page.waitForTimeout(300);
  assert(!(await page.locator('#fs-hint-retour').count()), 'proposition alors que l’utilisateur est sorti');
});

await run('API absente : bouton masqué', { init: noFullscreenApi }, async (page) => {
  assert(await page.locator('#btn-fullscreen').isHidden(), 'bouton visible sans API');
  assert(!(await page.locator('#fs-hint-ios').count()), 'astuce iPhone hors iPhone');
});

await run('app installée (standalone) : bouton masqué', { init: standalone }, async (page) => {
  assert(await page.locator('#btn-fullscreen').isHidden(), 'bouton visible en standalone');
});

await run('iPhone Safari : astuce unique « Sur l’écran d’accueil »', { init: noFullscreenApi, ctx: { userAgent: IPHONE_UA, isMobile: true, hasTouch: true } }, async (page) => {
  assert(await page.locator('#btn-fullscreen').isHidden(), 'bouton visible sur iPhone');
  const hint = page.locator('#fs-hint-ios');
  await hint.waitFor({ timeout: 2000 });
  assert((await hint.textContent()).includes('Partager → Sur l’écran d’accueil'), 'texte de l’astuce');
  await page.screenshot({ path: `${SHOTS}/plein-ecran-iphone-astuce.png` });
  await hint.locator('button').click();
  assert(!(await hint.count()), 'astuce non fermée');
  await page.reload(); await page.waitForTimeout(300);
  assert(!(await page.locator('#fs-hint-ios').count()), 'astuce réaffichée après fermeture');
});

await run('manifest : display fullscreen + display_override', {}, async (page) => {
  const m = await (await page.request.get(new URL('manifest.webmanifest', BASE).href)).json();
  assert(m.display === 'fullscreen', `display ${m.display}`);
  assert(JSON.stringify(m.display_override) === '["fullscreen","standalone"]', 'display_override');
});

await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} échec(s)` : `\nTous les tests plein écran passent (${results.length}).`);
process.exit(failed ? 1 : 0);
