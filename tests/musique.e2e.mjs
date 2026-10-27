// E2E de la musique de fond : démarre au premier toucher (~28 %), baisse à 10 % pendant que Pat parle
// (réplique mp3 et chaîne numérotée de 3 morceaux), rampes douces, bouton 🎵 et volume ⚙️ mémorisés,
// indépendante du muet de la voix, coupée quand l'onglet est caché, gardée hors ligne. Captures musique-*.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const CHAIN = ['seg-content-6-a', 'nombre-12', 'seg-content-6-b'];
function assert(c, msg) { if (!c) throw new Error(msg); }
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];
const step = async (name, fn) => { try { const r = await fn(); results.push(`✔ ${name}${r ? ` : ${r}` : ''}`); } catch (e) { failed++; results.push(`✘ ${name} : ${e.message}`); } };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', serviceWorkers: 'block' });
await ctx.addInitScript(() => {
  window.__segs = [];
  const rp = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play() {
    if (this instanceof HTMLAudioElement && !this.__l) { this.__l = 1; this.addEventListener('playing', () => window.__segs.push(this.currentSrc.split('/').pop())); }
    return rp.call(this);
  };
  // Échantillonne le gain de la musique toutes les 20 ms.
  window.__gains = []; setInterval(() => { if (window.__patMusic) window.__gains.push([performance.now(), window.__patMusic.gain]); if (window.__gains.length > 3000) window.__gains.splice(0, 1000); }, 20);
});
await ctx.route('**/audio/liste.js', async (route) => {
  const r = await route.fetch(); const body = (await r.text()).replace(/\[([^\]]*)\]/, (m, ids) => `[${ids},${CHAIN.map((c) => JSON.stringify(c)).join(',')}]`);
  route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/javascript' } });
});
await ctx.route(/\/audio\/(seg-|nombre-).*\.mp3$/, async (route) => {
  const r = await route.fetch(); if (r.ok()) return route.fulfill({ response: r });
  route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('tests/fixtures/segment.mp3') });
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const M = () => page.evaluate(() => ({ gain: window.__patMusic.gain, playing: window.__patMusic.playing, mode: window.__patMusic.mode, ducked: window.__patMusic.ducked, state: window.__patMusic.state }));
const gainSettles = (v, timeout = 3000) => page.waitForFunction((v) => Math.abs(window.__patMusic.gain - v) < 0.01, v, { timeout });
const toTurn = async () => {
  await page.evaluate(async () => { const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9; });
  if (await page.$('[data-level="2"]')) { await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready'); }
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    await page.click({ idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]');
  }
  await page.waitForFunction(() => !window.__patAvatar?.talking, null, { timeout: 20000 });
};

await page.goto(BASE);
await step('silence avant le premier toucher', async () => {
  await page.waitForTimeout(800);
  const m = await M();
  assert(!m.playing && m.gain === 0 && m.mode === null, JSON.stringify(m));
  assert((await page.getAttribute('#btn-music', 'aria-label')) === 'Musique' && (await page.getAttribute('#btn-music', 'aria-pressed')) === 'true', 'bouton 🎵');
});
await step('premier toucher → boucle Web Audio à 28 %', async () => {
  await page.click('[data-level="2"]');
  await page.waitForFunction(() => window.__patMusic.playing, null, { timeout: 8000 });
  await gainSettles(0.28);
  const m = await M();
  assert(m.mode === 'webaudio', JSON.stringify(m));
  return `mode ${m.mode}, gain ${m.gain.toFixed(2)}`;
});
await step('réplique mp3 : musique baissée à 10 % puis remontée, rampes ~300 ms', async () => {
  await toTurn();
  await page.waitForFunction(() => !window.__patAvatar?.talking && !window.__patMusic.ducked, null, { timeout: 20000 });
  await gainSettles(0.28);
  await page.evaluate(() => { window.__segs.length = 0; window.__gains.length = 0; });
  await page.waitForTimeout(120);
  await page.click('#btn-talk');
  await page.waitForFunction(() => window.__segs.length > 0, null, { timeout: 5000 });
  await gainSettles(0.1, 1500);
  await page.waitForFunction(() => !window.__patMusic.ducked, null, { timeout: 15000 });
  await gainSettles(0.28, 1500);
  const g = await page.evaluate(() => window.__gains);
  const mids = g.filter(([, v]) => v > 0.12 && v < 0.26).length;
  assert(mids >= 4, `pas de rampe douce (${mids} points intermédiaires)`);
  // Durée de la descente : du dernier point à 0,28 au premier à 0,10
  const iLo = g.findIndex(([, v]) => v < 0.105);
  let iHi = iLo; while (iHi > 0 && g[iHi][1] < 0.275) iHi--;
  assert(iLo > 0 && g[iHi][1] >= 0.275, `descente non observée (${g.length} mesures, départ ${g[0]?.[1]})`);
  const ms = Math.round(g[iLo][0] - g[iHi][0]);
  assert(ms >= 200 && ms <= 500, `descente en ${ms} ms`);
  return `descente ≈ ${ms} ms`;
});
await step('réplique numérotée (3 morceaux) : musique baissée tout du long', async () => {
  await page.evaluate(() => { window.__segs.length = 0; });
  const r = await page.evaluate(async () => {
    const vo = await import('./voice.js');
    let t0 = 0; const samples = [];
    const iv = setInterval(() => { if (t0 && performance.now() - t0 > 350) samples.push(window.__patMusic.gain); }, 15);
    await new Promise((res) => { t0 = performance.now(); vo.speak('Il te reste 12 cartes.', () => res(), 'content-6-12'); setTimeout(res, 15000); });
    clearInterval(iv);
    return { segs: window.__segs.slice(), max: Math.max(...samples), n: samples.length };
  });
  assert(JSON.stringify(r.segs) === JSON.stringify(CHAIN.map((c) => `${c}.mp3`)), `segments ${r.segs.join(', ')}`);
  assert(r.max <= 0.105, `la musique remonte pendant la chaîne (max ${r.max.toFixed(3)})`);
  await gainSettles(0.28, 1500);
  return `${r.segs.length} morceaux, gain max ${r.max.toFixed(2)} sur ${r.n} mesures`;
});
await step('muet de la voix sans effet sur la musique', async () => {
  await page.click('#btn-mute');
  await page.waitForTimeout(400);
  const m = await M();
  await page.click('#btn-mute');
  assert(m.playing && near(m.gain, 0.28), JSON.stringify(m));
});
await step('onglet caché → musique en pause, reprise au retour', async () => {
  const setHidden = (h) => page.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await setHidden(true);
  await page.waitForFunction(() => window.__patMusic.state === 'suspended', null, { timeout: 2000 });
  await setHidden(false);
  await page.waitForFunction(() => window.__patMusic.state === 'running', null, { timeout: 2000 });
  await gainSettles(0.28);
});
await step('volume dans ⚙️ : 50 %, gardé après rechargement', async () => {
  await page.click('#btn-settings');
  await page.$eval('#opt-music-volume', (e) => { e.value = '0.5'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await gainSettles(0.5);
  await page.locator('#opt-music-volume').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/musique-reglages.png` });
  await page.click('#settings .btn:not(.ghost):not(.danger)');
  await page.reload();
  assert((await page.$eval('#opt-music-volume', (e) => e.value)) === '0.5', 'volume non mémorisé');
  await page.click('#btn-talk').catch(() => page.click('body'));
  await page.waitForFunction(() => window.__patMusic.playing, null, { timeout: 8000 });
  await page.waitForFunction(() => !window.__patMusic.ducked, null, { timeout: 15000 });
  await gainSettles(0.5);
});
await step('bouton 🎵 : coupe, gardé après rechargement, relance', async () => {
  await page.screenshot({ path: `${SHOTS}/musique-entete.png`, clip: { x: 0, y: 0, width: 390, height: 90 } });
  await page.screenshot({ path: `${SHOTS}/musique-telephone.png` });
  await page.click('#btn-music');
  assert((await page.getAttribute('#btn-music', 'aria-pressed')) === 'false', 'aria-pressed');
  await gainSettles(0);
  await page.waitForFunction(() => window.__patMusic.state === 'suspended', null, { timeout: 2000 });
  await page.screenshot({ path: `${SHOTS}/musique-entete-coupee.png`, clip: { x: 0, y: 0, width: 390, height: 90 } });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:musique')));
  assert(saved.on === false && saved.volume === 0.5, JSON.stringify(saved));
  await page.reload();
  await page.click('#subtitle');
  await page.waitForTimeout(800);
  const m = await M();
  assert(!m.playing && m.gain === 0 && (await page.getAttribute('#btn-music', 'aria-pressed')) === 'false', `coupée après rechargement ${JSON.stringify(m)}`);
  await page.click('#btn-music');
  await page.waitForFunction(() => window.__patMusic.playing, null, { timeout: 8000 });
  await gainSettles(0.5);
});
await step('aucune erreur console', async () => { assert(errors.length === 0, errors.join(' | ')); });
await ctx.close();

// Hors ligne : la musique est gardée en cache par le service worker à sa première lecture.
await step('hors ligne après la première lecture', async () => {
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c2.newPage();
  await p.goto(BASE);
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => p.reload());
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  await p.click('#subtitle');
  await p.waitForFunction(() => window.__patMusic.playing, null, { timeout: 10000 });
  const cached = await p.evaluate(async () => !!(await (await caches.open((await caches.keys()).find((k) => k.startsWith('pat-cognefoudre')))).match('music/musique-fond.mp3')));
  await c2.setOffline(true);
  await p.reload();
  await p.click('#subtitle');
  await p.waitForFunction(() => window.__patMusic.playing, null, { timeout: 10000 });
  await c2.close();
  assert(cached, 'musique absente du cache');
  return 'fichier en cache, relu hors ligne';
});

await browser.close();
console.log(results.join('\n'));
if (failed) { console.error(`${failed} échec(s)`); process.exit(1); }
console.log('Tous les tests de la musique passent.');
