// v1.10.0 : ce test vérifie l’avatar vidéo (repli de Pat Rive) : ?rive=0.
// E2E v1.9.0 : la bouche de Pat suit sa voix. Pendant une réplique mp3, la boucle « repos » reste affichée et la
// vidéo « bouche » (bouche ouverte) change d'opacité selon les repères Rhubarb : plusieurs formes, ouvertures
// différentes ; à la fin de l'audio, bouche fermée (X, opacité 0). Téléphone 412×915.
// Captures bouche-1..4.png (formes différentes en pleine réplique), bouche-fermee.png ; vidéo bouche-pat.webm si VIDEO=1.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots/bouche';
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
function assert(c, msg) { if (!c) throw new Error(msg); }
const vp = { width: 412, height: 915 };
const ctx = await browser.newContext({
  viewport: vp, deviceScaleFactor: 2, locale: 'fr-CA', serviceWorkers: 'block',
  ...(process.env.VIDEO ? { recordVideo: { dir: SHOTS, size: vp } } : {}),
});
const t0 = Date.now();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
let ok = true;
try {
  await page.goto(`${BASE}?intro=0&rive=0`);
  await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    const sel = { idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]';
    await page.click(sel);
  }
  await page.waitForSelector('[data-player] #pet');
  // Laisse finir la réplique d'arrivée, puis toucher Pat : nouvelle réplique suivie du début à la fin.
  await page.waitForFunction(() => window.__patAudio && (window.__patAudio.el.paused || window.__patAudio.el.ended), null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const tClick = Date.now();
  await page.click('#pet');
  await page.waitForFunction(() => window.__patAvatar.lips && !window.__patAudio.el.paused && window.__patAudio.el.currentTime > 0.05, null, { timeout: 8000 });
  const state = () => {
    const A = window.__patAvatar, a = window.__patAudio.el, m = document.querySelector('.pat-bouche');
    return { lips: A.lips, shape: A.shape, level: A.mouth, op: Number(m.style.opacity || 0), shown: A.shown, ready: m.readyState, src: a.src.replace(/^.*\/audio\//, ''), t: a.currentTime, paused: a.paused, ended: a.ended };
  };
  const box = await page.locator('#pet').boundingBox();
  const clip = { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: Math.min(vp.width, box.width + 20), height: box.height + 20 };
  const seen = new Set(); const levels = []; let n = 0; const samples = [];
  for (let i = 0; i < 400; i++) {
    const s = await page.evaluate(state);
    samples.push(s);
    if (s.paused || s.ended) break;
    assert(/-repos$/.test(s.shown || ''), `boucle affichée pendant la voix : ${s.shown}`);
    levels.push(s.op);
    // Une capture par ouverture différente (fermée / mi-ouverte / ouverte), bouche stabilisée sur sa forme.
    const bucket = s.op < 0.15 ? 'f' : s.op < 0.6 ? 'm' : 'o';
    if (n < 4 && s.shape !== 'X' && !seen.has(s.shape) && (n < 3 ? !seen.has(bucket) : true)) {
      seen.add(s.shape); seen.add(bucket); n++;
      await page.screenshot({ path: `${SHOTS}/bouche-${n}.png`, clip });
      fs.writeFileSync(`${SHOTS}/bouche-${n}.txt`, `${s.src} t=${s.t.toFixed(2)}s forme=${s.shape} ouverture=${s.op}\n`);
    }
    await page.waitForTimeout(30);
  }
  const shapes = await page.evaluate(() => window.__patAvatar.shapes);
  const distinct = new Set(shapes.filter((x) => x !== 'X'));
  assert(distinct.size >= 3, `trop peu de formes : ${shapes.join(',')}`);
  assert(Math.max(...levels) >= 0.6 && levels.some((l) => l > 0.05 && l < 0.6), `ouvertures : ${levels.join(',')}`);
  assert(samples[0].ready >= 2, `vidéo bouche pas chargée (${samples[0].ready})`);
  // Fin de réplique : bouche fermée
  await page.waitForFunction(() => window.__patAudio.el.paused || window.__patAudio.el.ended, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__patAvatar.shape === 'X' && window.__patAvatar.mouth === 0 && document.querySelector('.pat-bouche').style.opacity === '0', null, { timeout: 3000 });
  const end = await page.evaluate(state);
  assert(!end.lips && end.op === 0, `pas fermée à la fin : ${JSON.stringify(end)}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/bouche-fermee.png`, clip });
  assert(!errors.length, `erreurs : ${errors.join(' | ')}`);
  console.log(`ok  téléphone : ${samples[0].src}, formes ${[...distinct].join('')}, ouverture max ${Math.max(...levels)}, fermée à la fin`);
  fs.writeFileSync(`${SHOTS}/clip.json`, JSON.stringify({ src: samples[0].src, offset: (tClick - t0) / 1000 }));
} catch (e) { ok = false; console.log('ÉCHEC', e.message); await page.screenshot({ path: `${SHOTS}/echec.png` }).catch(() => {}); }
await ctx.close();
await browser.close();
process.exit(ok ? 0 : 1);
