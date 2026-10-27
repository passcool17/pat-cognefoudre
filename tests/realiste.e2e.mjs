// E2E du Pat « réaliste » : vidéo par humeur, bouche qui bouge pendant la parole (minutée et audio),
// mouvement réduit = image fixe, aucune erreur console. Téléphone + tablette, captures realiste-*.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const MOODS = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];

// Synthèse vocale simulée : chaque énoncé dure 1,5 s (le temps de voir la bouche bouger).
const speechStub = () => {
  const fake = {
    speaking: false, getVoices: () => [{ name: 'Amélie', lang: 'fr-CA', localService: true }],
    speak(u) { setTimeout(() => u.onend?.(), 1500); }, cancel() {}, addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
};

function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];

async function newPage(vp, reduced = false) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(speechStub);
  await ctx.addInitScript(() => { let a = 7; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    const sel = { idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]';
    await page.click(sel);
  }
  await page.waitForSelector('[data-player] #pet .pat-av video.pat-v');
  return { ctx, page, errors };
}
const playing = (page) => page.waitForFunction(() => { const v = document.querySelector('.pat-v.on'); return v && v.readyState >= 3 && !v.paused && v.currentTime > 0.2; }, null, { timeout: 8000 });
const videoInfo = (page) => page.evaluate(() => { const v = document.querySelector('.pat-v.on:last-of-type') || document.querySelector('.pat-v.on'); return { mood: v?.dataset.mood, src: v?.currentSrc, n: document.querySelectorAll('.pat-v').length, paused: v?.paused }; });

for (const vp of [{ name: 'telephone', width: 390, height: 844 }, { name: 'tablette', width: 820, height: 1180 }]) {
  const { ctx, page, errors } = await newPage({ width: vp.width, height: vp.height });
  try {
    // 1. Une vidéo en boucle, muette, inline, qui joue l'humeur de #pet
    await playing(page);
    const appMood = await page.getAttribute('#pet', 'data-mood');
    const v0 = await page.$eval('.pat-v.on', (v) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, poster: v.poster, mood: v.dataset.mood }));
    assert(v0.muted && v0.loop && v0.inline && /video\/pat-\w+\.jpg$/.test(v0.poster), `attributs vidéo ${JSON.stringify(v0)}`);
    assert(v0.mood === appMood, `vidéo ${v0.mood} ≠ humeur ${appMood}`);
    assert(!(await page.$('#pet img')), 'ancienne carte encore affichée');

    // 2. Changement d'humeur → la vidéo change (fondu, l'ancienne est retirée)
    const av = await page.evaluateHandle(() => import('./avatar.js'));
    for (const m of (vp.name === 'telephone' ? MOODS : ['grognon', 'content'])) {
      await av.evaluate((mod, m) => mod.setAvatarMood(m), m);
      await page.waitForFunction((m) => { const on = [...document.querySelectorAll('.pat-v.on')]; return document.querySelectorAll('.pat-v').length === 1 && on[0]?.dataset.mood === m && on[0].readyState >= 3 && on[0].currentTime > 0.3; }, m, { timeout: 8000 });
      const info = await videoInfo(page);
      assert(info.src.includes(`pat-${m}.`) && !info.paused, `vidéo ${m} : ${JSON.stringify(info)}`);
      if (vp.name === 'telephone') { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/realiste-${m}.png` }); }
    }
    if (vp.name === 'tablette') await page.screenshot({ path: `${SHOTS}/realiste-tablette.png` });

    // 3. Vraie réplique enregistrée (mp3 joué par voice.js) : la bouche suit l'audio via le graphe de voice.js
    await page.click('#btn-talk');
    await page.waitForTimeout(700);
    const rv = await page.evaluate(() => ({ src: window.__patAvatar.source, max: window.__patAvatar.maxOpen, talking: window.__patAvatar.talking }));
    assert(rv.src === 'audio' && rv.talking && rv.max > 0.3, `réplique enregistrée : bouche non pilotée par l'audio ${JSON.stringify(rv)}`);
    assert((await page.$eval('.pat-av', (e) => e.dataset.mood)) === (await page.getAttribute('#pet', 'data-mood')), 'humeur de la vidéo ≠ humeur de la réplique');
    if (vp.name === 'telephone') await page.screenshot({ path: `${SHOTS}/realiste-parle.png` });
    await page.waitForFunction(() => !window.__patAvatar.talking && window.__patAvatar.open === 0, null, { timeout: 15000 });

    // 3b. En muet : parole minutée, la bouche s'ouvre puis se referme
    await page.click('#btn-mute');
    await page.click('#btn-talk');
    assert(await page.evaluate(() => window.__patAvatar.talking && window.__patAvatar.source === 'timed'), 'pas de parole minutée en muet');
    await page.waitForTimeout(700);
    const tm = await page.evaluate(() => window.__patAvatar.maxOpen);
    assert(tm > 0.3, `bouche peu ouverte en parole minutée (${tm.toFixed(2)})`);
    await page.waitForFunction(() => !window.__patAvatar.talking && window.__patAvatar.open === 0, null, { timeout: 6000 });
    await page.click('#btn-mute');

    // 4. Voix enregistrée (événement pat:audio) : la bouche suit l'amplitude via l'AnalyserNode
    await page.evaluate(async () => {
      const sr = 22050, n = sr * 2, data = new Int16Array(n);
      for (let i = 0; i < n; i++) { const t = i / sr; data[i] = Math.sin(2 * Math.PI * 180 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t)) * 26000; }
      const head = new DataView(new ArrayBuffer(44)); const w = (o, s) => [...s].forEach((c, i) => head.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); head.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
      head.setUint32(24, sr, true); head.setUint32(28, sr * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true); w(36, 'data'); head.setUint32(40, n * 2, true);
      window.__tone = new Audio(URL.createObjectURL(new Blob([head, data], { type: 'audio/wav' })));
    });
    await page.click('#pet-mood'); // geste : déverrouille l'AudioContext
    await page.evaluate(async () => { window.__patAvatar.resetMax(); await window.__tone.play(); window.dispatchEvent(new CustomEvent('pat:audio', { detail: window.__tone })); });
    await page.waitForTimeout(900);
    const au = await page.evaluate(() => ({ src: window.__patAvatar.source, max: window.__patAvatar.maxOpen, talking: window.__patAvatar.talking }));
    assert(au.src === 'audio' && au.talking && au.max > 0.3, `bouche non pilotée par l'audio ${JSON.stringify(au)}`);
    await page.waitForFunction(() => window.__tone.ended && !window.__patAvatar.talking, null, { timeout: 4000 });

    // 5. Aucune erreur console
    assert(errors.length === 0, `erreurs console : ${errors.join(' | ')}`);
    results.push(`✓ ${vp.name} : vidéos/humeurs, réplique mp3 (max ${rv.max.toFixed(2)}), bouche minutée (max ${tm.toFixed(2)}), bouche audio (max ${au.max.toFixed(2)})`);
  } catch (e) { failed++; results.push(`✗ ${vp.name} : ${e.message}`); await page.screenshot({ path: `${SHOTS}/realiste-echec-${vp.name}.png` }).catch(() => {}); }
  await ctx.close();
}

// 6. Mouvement réduit : image fixe (aucune vidéo en lecture), la bouche s'anime quand même
{
  const { ctx, page, errors } = await newPage({ width: 390, height: 844 }, true);
  try {
    const v = await page.$eval('.pat-v', (v) => ({ paused: v.paused, preload: v.preload, poster: v.poster }));
    assert(v.paused && v.preload === 'none' && v.poster, `mouvement réduit : ${JSON.stringify(v)}`);
    await page.click('#btn-talk'); await page.waitForTimeout(700);
    assert((await page.evaluate(() => window.__patAvatar.maxOpen)) > 0.3, 'mouvement réduit : bouche immobile');
    assert(errors.length === 0, `erreurs console : ${errors.join(' | ')}`);
    await page.screenshot({ path: `${SHOTS}/realiste-mouvement-reduit.png` });
    results.push('✓ mouvement réduit : affiche fixe, bouche animée');
  } catch (e) { failed++; results.push(`✗ mouvement réduit : ${e.message}`); }
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
if (failed) { console.error(`${failed} échec(s)`); process.exit(1); }
console.log('Tous les tests du Pat réaliste passent.');
