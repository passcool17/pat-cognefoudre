// E2E v1.10.0 : Pat Rive. Téléphone 412×915 (DPR 2.625).
// 1) Rive : la scène de l'humeur se charge (aucune requête hors du site), les vidéos se mettent en pause,
//    la bouche suit les repères Rhubarb pendant une réplique puis se ferme, les réactions du tour de Pat
//    sont jouées à son retour, changement d'humeur = nouvelle scène.
// 2) Repli : moteur WASM bloqué, puis navigateur sans WebAssembly → avatar vidéo d'avant, sans erreur.
// Captures dans SHOTS (rive-*.png, repli-*.png).
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots/rive';
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
function assert(c, msg) { if (!c) throw new Error(msg); }
const vp = { width: 412, height: 915 };
const origin = new URL(BASE).origin;

async function open(setup) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: 'fr-CA', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; const outside = []; const reqs = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { const u = r.url(); reqs.push(u); if (!u.startsWith(origin) && !/^(data|blob):/.test(u)) outside.push(u); });
  if (setup) await setup(ctx, page);
  await page.goto(`${BASE}?intro=0`);
  await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    const sel = { idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]';
    await page.click(sel);
  }
  await page.waitForSelector('[data-player] #pet');
  return { ctx, page, errors, outside, reqs };
}
const petClip = async (page) => { const b = await page.locator('#pet').boundingBox(); return { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: Math.min(vp.width, b.width + 16), height: b.height + 16 }; };

let ok = true;
try {
  // ---------- 1) Pat Rive ----------
  const A = await open();
  const { page } = A;
  await page.waitForFunction(() => window.__patRive?.state === 'on' && window.__patRive.mood, null, { timeout: 10000 });
  let st = await page.evaluate(() => ({ ...['state', 'mood', 'loads', 'fired', 'canvases'].reduce((o, k) => ({ ...o, [k]: window.__patRive[k] }), {}), suspended: window.__patAvatar.suspended, playing: [...document.querySelectorAll('.pat-av video')].filter((v) => !v.paused).length }));
  assert(st.suspended && st.playing === 0, `vidéos pas en pause : ${JSON.stringify(st)}`);
  assert(st.canvases === 1, `toiles : ${st.canvases}`);
  // Image non vide au centre de la toile
  const px = await page.evaluate(() => { const c = document.querySelector('canvas.pat-rive'); const d = c.getContext('2d').getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return { w: c.width, h: c.height, alpha: s / (d.length / 4) }; });
  assert(px.w >= 600 && px.alpha > 200, `toile vide ou trop petite : ${JSON.stringify(px)}`);
  // Réactions gardées pendant le tour de Pat, jouées à son retour
  await page.waitForFunction(() => window.__patRive.fired.length > 0, null, { timeout: 3000 });
  st.fired = await page.evaluate(() => window.__patRive.fired.map((f) => f.name));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/rive-repos.png` });
  // Bouche : réplique complète
  await page.waitForFunction(() => window.__patAudio && (window.__patAudio.el.paused || window.__patAudio.el.ended), null, { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.click('#pet');
  await page.waitForFunction(() => window.__patRive.lips && !window.__patAudio.el.paused && window.__patAudio.el.currentTime > 0.05, null, { timeout: 8000 });
  const MI = { X: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 2, H: 3 };
  const seen = new Set(); let shots = 0; let bad = 0;
  const clip = await petClip(page);
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(() => ({ shape: window.__patRive.shape, b: window.__patRive.bouche, end: window.__patAudio.el.paused || window.__patAudio.el.ended }));
    if (s.end) break;
    if (MI[s.shape] !== s.b) bad++;
    if (s.shape !== 'X' && !seen.has(s.shape) && shots < 3) { seen.add(s.shape); shots++; await page.screenshot({ path: `${SHOTS}/rive-bouche-${shots}-${s.shape}.png`, clip }); }
    seen.add(s.shape);
    await page.waitForTimeout(30);
  }
  const shapes = await page.evaluate(() => window.__patRive.shapes);
  assert(new Set(shapes.filter((x) => x !== 'X')).size >= 3, `trop peu de formes : ${shapes.join(',')}`);
  assert(bad <= 2, `bouche Rive ≠ forme ${bad} fois`);
  await page.waitForFunction(() => window.__patRive.shape === 'X' && window.__patRive.bouche === 0, null, { timeout: 4000 });
  // Réaction immédiate (Pat à l'écran) puis changement d'humeur
  await page.evaluate(() => window.__patRive.react('gagne'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/rive-gagne.png`, clip });
  const f2 = await page.evaluate(() => window.__patRive.fired.map((f) => f.name));
  assert(f2.at(-1) === 'gagne', `gagne pas joué : ${f2}`);
  for (const m of ['grognon', 'boudeur', 'endormi']) {
    await page.evaluate(async (m) => (await import('/avatar-rive.js')).setAvatarMood(m), m);
    await page.waitForFunction((m) => window.__patRive.mood === m && window.__patRive.canvases === 1, m, { timeout: 6000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/rive-${m}.png` });
  }
  const loads = await page.evaluate(() => window.__patRive.loads);
  assert(!A.errors.length, `erreurs : ${A.errors.join(' | ')}`);
  assert(!A.outside.length, `requêtes hors du site : ${A.outside.join(' ')}`);
  console.log(`ok  Rive : ${loads.map((l) => `${l.mood} ${l.ms} ms`).join(', ')} ; réactions au retour ${st.fired.join(',')} ; formes ${[...new Set(shapes)].join('')} ; aucune requête externe`);
  await A.ctx.close();

  // ---------- 2) Repli : WASM introuvable ----------
  const B = await open(async (ctx) => { await ctx.route(/\/vendor\/rive\/.*\.wasm$/, (r) => r.abort()); });
  await B.page.waitForFunction(() => window.__patRive?.state === 'failed', null, { timeout: 15000 });
  await B.page.waitForFunction(() => !window.__patAvatar.suspended && /-(repos|parle)$/.test(window.__patAvatar.shown || ''), null, { timeout: 5000 });
  const b = await B.page.evaluate(() => ({ reason: window.__patRive.reason, canvases: document.querySelectorAll('canvas.pat-rive').length, cls: document.querySelector('.pat-av').className }));
  assert(b.canvases === 0 && !/rive-on/.test(b.cls), `repli incomplet : ${JSON.stringify(b)}`);
  assert(!B.errors.length, `erreurs : ${B.errors.join(' | ')}`);
  assert(!B.outside.length, `requêtes hors du site (CDN ?) : ${B.outside.join(' ')}`);
  await B.page.screenshot({ path: `${SHOTS}/repli-wasm-bloque.png` });
  console.log(`ok  repli WASM bloqué : ${b.reason}, vidéo ${await B.page.evaluate(() => window.__patAvatar.shown)}`);
  await B.ctx.close();

  // ---------- 3) Repli : pas de WebAssembly ----------
  const C = await open(async (ctx) => { await ctx.addInitScript(() => { delete window.WebAssembly; }); });
  await C.page.waitForFunction(() => window.__patRive?.state === 'failed' && /-(repos|parle)$/.test(window.__patAvatar.shown || ''), null, { timeout: 8000 });
  const c = await C.page.evaluate(() => window.__patRive.reason);
  assert(c === 'pas de WebAssembly', c);
  assert(!C.reqs.some((u) => /\/vendor\/rive\/|\.riv$/.test(u)), 'moteur téléchargé pour rien');
  assert(!C.errors.length, `erreurs : ${C.errors.join(' | ')}`);
  console.log('ok  repli sans WebAssembly : rien de Rive téléchargé, avatar vidéo');
  await C.ctx.close();
} catch (e) { ok = false; console.log('ÉCHEC', e.message); }
await browser.close();
process.exit(ok ? 0 : 1);
