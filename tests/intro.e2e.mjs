// E2E de l'intro de Pat au lancement : écran plein (Pat grognon « repos », titre, « Entrer »), toucher → musique
// en fondu + Pat « parle » + sous-titre + voix (audio/test.mp3), puis fondu vers l'app ; « Passer » ; réglage ⚙️
// (coupée → plus d'intro) et « Revoir l'intro » ; iPhone Safari (UA + vidéos muted/playsinline).
// Captures intro-*.png ; vidéo de démo intro-demo.mp4 (son remis par ffmpeg) si DEMO != 0.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];
const step = async (name, fn) => { try { const r = await fn(); results.push(`✔ ${name}${r ? ` : ${r}` : ''}`); } catch (e) { failed++; results.push(`✘ ${name} : ${e.message}`); } };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const BRAVE = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Un vrai utilisateur : navigator.webdriver = false, donc l'intro suit le réglage (pas besoin de ?intro=1).
const human = () => {
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
  window.__segs = [];
  const rp = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play() {
    if (this instanceof HTMLAudioElement && !this.__l) { this.__l = 1; this.addEventListener('playing', () => window.__segs.push(this.currentSrc.split('/').pop())); }
    return rp.call(this);
  };
};
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', serviceWorkers: 'block', userAgent: BRAVE, ...opts });
  await ctx.addInitScript(human);
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') page.__errors.push(m.text()); });
  return { ctx, page };
}
const I = (page) => page.evaluate(() => ({ ...(window.__patIntro ? { open: window.__patIntro.open, state: window.__patIntro.state, closedBy: window.__patIntro.closedBy } : {}), clip: window.__patAvatar?.shown, mood: window.__patAvatar?.mood, music: window.__patMusic?.playing, gain: window.__patMusic?.gain, segs: window.__segs }));

// 1. Brave Linux (Chrome) : intro complète.
{
  const { ctx, page } = await open();
  await page.goto(BASE);
  await step('intro à l’ouverture : Pat grognon au repos, titre, « Entrer », silence', async () => {
    await page.waitForSelector('#intro .intro-enter', { timeout: 5000 });
    await page.waitForFunction(() => window.__patAvatar?.shown === 'grognon-repos', null, { timeout: 8000 });
    assert((await page.textContent('.intro-title')).trim() === 'Pat Cognefoudre', 'titre');
    assert(await page.$('#intro #intro-skip'), 'bouton Passer');
    assert(await page.evaluate(() => !!document.querySelector('#intro .pat-av')), 'avatar dans l’intro');
    await page.waitForTimeout(700);
    const m = await I(page);
    assert(!m.music && m.segs.length === 0, `son avant le toucher : ${JSON.stringify(m)}`);
    await page.screenshot({ path: `${SHOTS}/intro-accueil.png` });
  });
  await step('« Entrer » → musique en fondu, Pat parle (boucle parle), sous-titre, voix test.mp3', async () => {
    await page.click('#intro-enter');
    await page.waitForFunction(() => window.__patMusic?.playing, null, { timeout: 8000 });
    await page.waitForFunction(() => window.__segs.includes('test.mp3'), null, { timeout: 5000 });
    await page.waitForFunction(() => window.__patAvatar?.shown === 'grognon-parle', null, { timeout: 5000 });
    const sub = await page.textContent('#intro-line');
    assert(/Roi des Bandits/.test(sub), `sous-titre : ${sub}`);
    // v1.8.1 : sous-titres coupés par défaut → texte prêt mais pas affiché, et aucun espace laissé
    assert(await page.evaluate(() => { const l = document.querySelector('#intro-line'); return getComputedStyle(l).display === 'none' && l.offsetHeight === 0; }), 'sous-titre affiché alors que les sous-titres sont coupés');
    await page.waitForTimeout(1200);
    const m = await I(page);
    assert(m.gain > 0.05 && m.gain < 0.2, `musique baissée sous la voix (${m.gain})`);
    await page.screenshot({ path: `${SHOTS}/intro-parle.png` });
    return `gain musique ${m.gain.toFixed(2)}`;
  });
  await step('fin de la réplique → fondu vers l’app, Pat remis au repos, musique continue', async () => {
    await page.waitForFunction(() => window.__patIntro.state === 'ferme', null, { timeout: 14000 });
    const m = await I(page);
    assert(m.closedBy === 'fin', JSON.stringify(m));
    await page.waitForFunction(() => !document.querySelector('#intro'), null, { timeout: 2000 });
    assert(await page.$('[data-level="2"]'), 'écran de l’app visible');
    assert(m.music, 'musique arrêtée');
    assert(!(await page.evaluate(() => document.body.classList.contains('intro-on'))), 'défilement rendu');
    await page.screenshot({ path: `${SHOTS}/intro-app.png` });
  });
  await step('« Revoir l’intro » dans ⚙️ (sous-titres cochés) puis « Passer » : fermeture immédiate, voix coupée', async () => {
    await page.click('#btn-settings');
    assert(await page.isChecked('#opt-intro'), 'réglage coché par défaut');
    assert(!(await page.isChecked('#opt-subs')), 'sous-titres cochés par défaut');
    await page.check('#opt-subs'); // v1.8.1 : avec les sous-titres, l'intro montre la réplique
    await page.screenshot({ path: `${SHOTS}/intro-reglages.png` });
    await page.click('#btn-intro-replay');
    await page.waitForSelector('#intro', { timeout: 3000 });
    await page.click('#intro-enter');
    await page.waitForFunction(() => window.__patAvatar?.talking, null, { timeout: 5000 });
    await page.waitForFunction(() => { const l = document.querySelector('#intro-line'); return getComputedStyle(l).display !== 'none' && l.offsetHeight > 0 && /Roi des Bandits/.test(l.textContent); }, null, { timeout: 2000 });
    await page.click('#intro-skip');
    await page.waitForFunction(() => window.__patIntro.state === 'ferme' && !document.querySelector('#intro'), null, { timeout: 2000 });
    const m = await I(page);
    assert(m.closedBy === 'passer', JSON.stringify(m));
    await page.waitForFunction(() => !window.__patAvatar.talking && (!window.__patAudio || window.__patAudio.el.paused), null, { timeout: 2000 });
    await page.click('#btn-settings'); await page.uncheck('#opt-subs'); await page.keyboard.press('Escape');
  });
  await step('réglage coupé → plus d’intro à l’ouverture (mémorisé)', async () => {
    await page.click('#btn-settings');
    await page.uncheck('#opt-intro');
    await page.click('#settings button:not([type])');
    await page.reload();
    await page.waitForSelector('[data-level="2"]');
    await page.waitForTimeout(600);
    assert(!(await page.$('#intro')), 'intro montrée malgré le réglage');
    const saved = await page.evaluate(() => localStorage.getItem('pat-cognefoudre:intro'));
    assert(saved === '{"on":false}', saved);
    await page.click('#btn-settings');
    await page.check('#opt-intro');
    await page.click('#settings button:not([type])');
    await page.reload();
    await page.waitForSelector('#intro', { timeout: 3000 });
  });
  await step('« Passer » avant tout son : app directement, sans musique ni voix', async () => {
    await page.click('#intro-skip');
    await page.waitForFunction(() => !document.querySelector('#intro'), null, { timeout: 2000 });
    const m = await I(page);
    assert(m.closedBy === 'passer' && m.segs.length === 0, JSON.stringify(m));
  });
  await step('aucune erreur JS (Brave/Chrome)', async () => { assert(page.__errors.length === 0, page.__errors.join(' | ')); });
  await ctx.close();
}

// 2. Partie en cours, tour du joueur : l'intro passe d'abord, Pat retrouve sa place ensuite.
{
  const { ctx, page } = await open();
  await page.goto(`${BASE}?intro=0`);
  await page.evaluate(async () => { const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9; });
  await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    await page.click({ idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]');
  }
  await step('partie en cours : intro par-dessus, puis Pat revient dans ton tour', async () => {
    await page.goto(BASE);
    await page.waitForSelector('#intro', { timeout: 3000 });
    assert(await page.evaluate(() => !!document.querySelector('#intro .pat-av') && !document.querySelector('#pet .pat-av')), 'Pat doit être dans l’intro');
    await page.click('#intro-skip');
    await page.waitForFunction(() => !!document.querySelector('#pet .pat-av'), null, { timeout: 3000 });
  });
  await step('aucune erreur JS (partie en cours)', async () => { assert(page.__errors.length === 0, page.__errors.join(' | ')); });
  await ctx.close();
}

// 3. iPhone Safari (UA iOS, écran tactile) : vidéos muettes en ligne, « Entrer » lance tout.
{
  const { ctx, page } = await open({ userAgent: IPHONE });
  await page.goto(BASE);
  await step('iPhone : intro, vidéos muted + playsinline, toucher → son et parole', async () => {
    await page.waitForSelector('#intro', { timeout: 5000 });
    const v = await page.evaluate(() => [...document.querySelectorAll('#intro video')].map((x) => x.muted && x.hasAttribute('playsinline')));
    assert(v.length === 2 && v.every(Boolean), JSON.stringify(v));
    await page.waitForFunction(() => window.__patAvatar?.shown === 'grognon-repos', null, { timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/intro-iphone.png` });
    await page.tap('#intro-enter');
    await page.waitForFunction(() => window.__patMusic?.playing && window.__segs.includes('test.mp3'), null, { timeout: 8000 });
    await page.waitForFunction(() => window.__patIntro.state === 'ferme', null, { timeout: 14000 });
  });
  await step('aucune erreur JS (iPhone)', async () => { assert(page.__errors.length === 0, page.__errors.join(' | ')); });
  await ctx.close();
}

// 4. Vidéo de démo (Playwright enregistre l'image ; ffmpeg y remet la musique et la voix aux bons moments).
if (process.env.DEMO !== '0') {
  await step('vidéo de démo intro-demo.mp4', async () => {
    const dir = fs.mkdtempSync('/tmp/intro-demo-');
    const t0 = Date.now();
    const { ctx, page } = await open({ recordVideo: { dir, size: { width: 390, height: 844 } }, deviceScaleFactor: 1 });
    await page.goto(BASE);
    await page.waitForFunction(() => window.__patAvatar?.shown === 'grognon-repos', null, { timeout: 8000 });
    await page.waitForTimeout(2200);
    const tap = (Date.now() - t0) / 1000;
    await page.click('#intro-enter');
    await page.waitForFunction(() => window.__segs.includes('test.mp3'), null, { timeout: 5000 });
    const voiceAt = (Date.now() - t0) / 1000;
    await page.waitForFunction(() => !document.querySelector('#intro'), null, { timeout: 15000 });
    await page.waitForTimeout(2000);
    const end = (Date.now() - t0) / 1000;
    const vid = page.video(); await ctx.close();
    const webm = await vid.path();
    const out = path.join(SHOTS, 'intro-demo.mp4');
    // Musique : fondu d'entrée 0,8 s au toucher, ~28 %, baissée à 10 % pendant la voix (5,64 s).
    const dV = 5.64;
    const filter = [
      `[1:a]volume='if(lt(t,${voiceAt - tap}),0.28*min(1,t/0.8),if(lt(t,${voiceAt - tap + dV}),0.10,0.28))':eval=frame,adelay=${Math.round(tap * 1000)}|${Math.round(tap * 1000)}[m]`,
      `[2:a]adelay=${Math.round(voiceAt * 1000)}|${Math.round(voiceAt * 1000)}[v]`,
      '[m][v]amix=inputs=2:normalize=0,apad[a]',
    ].join(';');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-i', 'music/musique-fond.mp3', '-i', 'audio/test.mp3', '-filter_complex', filter,
      '-map', '0:v', '-map', '[a]', '-t', String(end.toFixed(2)), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
    fs.rmSync(dir, { recursive: true, force: true });
    return `${out} (${end.toFixed(1)} s, toucher à ${tap.toFixed(1)} s)`;
  });
}

await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} échec(s)` : '\nIntro : tout est vert.');
process.exit(failed ? 1 : 0);
