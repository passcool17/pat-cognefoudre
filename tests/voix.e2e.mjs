// E2E v1.8.0 : toutes les voix ElevenLabs. Pat parle tout seul avec un vrai mp3 (élément audio non en pause),
// toucher Pat parle aussi ; plus de jauge d'humeur, de boutons Parler/Voix, de phrase d'aide ni de 🎵 dans l'en-tête ;
// musique marche/arrêt dans ⚙️. v1.8.1 : bulle (sous-titres) masquée par défaut, sans espace vide ; réglage
// « Sous-titres » dans ⚙️, gardé au rechargement. Téléphone + tablette. Captures voix-*.png et soustitres-*.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
function assert(c, msg) { if (!c) throw new Error(msg); }
const HIDDEN = ['#pet-mood', '.moodbar', '#btn-talk', '#btn-mute', '#btn-music'];
let failed = 0; const results = [];
for (const vp of [{ n: 'telephone', width: 390, height: 844 }, { n: 'tablette', width: 820, height: 1180 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, locale: 'fr-CA', serviceWorkers: 'block' });
  // Compte les appels à la synthèse vocale : il ne doit y en avoir aucun, chaque réplique a son mp3.
  await ctx.addInitScript(() => {
    window.__tts = [];
    const s = window.speechSynthesis;
    if (s) { const real = s.speak.bind(s); s.speak = (u) => { if (u.text.trim()) window.__tts.push(u.text); return real(u); }; }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(`${BASE}?intro=0`);
    await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
    for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
      const k = await page.getAttribute('[data-step]', 'data-step');
      const sel = { idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]';
      await page.click(sel);
    }
    await page.waitForSelector('[data-player] #pet');
    const playing = () => { const a = window.__patAudio?.el; return !!a && /\/audio\/(?!silence)[^/]+\.mp3$/.test(a.src) && !a.paused && a.currentTime > 0; };
    const info = () => { const a = window.__patAudio.el; return { src: a.src.replace(/^.*\/audio\//, 'audio/'), paused: a.paused, bulle: document.querySelector('#pet-bubble').textContent }; };
    // 1. Début du tour du joueur : Pat parle tout seul, vrai mp3 en lecture
    await page.waitForFunction(playing, null, { timeout: 8000 });
    const a1 = await page.evaluate(info);
    assert(!a1.paused && /^audio\/(content|grognon|impatient|endormi|triomphant|boudeur|seg-)/.test(a1.src), `audio ${JSON.stringify(a1)}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/voix-${vp.n}-pat.png` });
    await page.screenshot({ path: `${SHOTS}/voix-${vp.n}-entete.png`, clip: { x: 0, y: 0, width: vp.width, height: 90 } });
    // 2. Éléments masqués, plein écran gardé
    const still = await page.evaluate((h) => h.filter((s) => document.querySelector(s)), HIDDEN);
    assert(!still.length, `encore affichés : ${still.join(', ')}`);
    assert(!(await page.textContent('[data-player]')).includes('Touche Pat'), 'phrase « Touche Pat » encore là');
    assert(await page.$('#btn-fullscreen'), 'bouton plein écran absent');
    // 2b. v1.8.1 : bulle masquée par défaut, texte toujours tenu à jour, aucun espace vide sous Pat
    const lay = () => {
      const b = document.querySelector('#pet-bubble'), st = document.querySelector('.player-turn .pet-stage'), fig = document.querySelector('#pet');
      return { display: getComputedStyle(b).display, h: b.offsetHeight, gap: Math.round(st.getBoundingClientRect().height - fig.getBoundingClientRect().height), text: b.textContent };
    };
    const l0 = await page.evaluate(lay);
    assert(l0.display === 'none' && l0.h === 0 && l0.text.length > 1, `bulle affichée par défaut : ${JSON.stringify(l0)}`);
    assert(l0.gap <= 2, `espace vide sous Pat : ${l0.gap}px`);
    await page.screenshot({ path: `${SHOTS}/soustitres-${vp.n}-pat.png` });
    // 3. Toucher Pat : nouvelle réplique mp3
    await page.waitForFunction(() => window.__patAudio.el.paused || window.__patAudio.el.ended, null, { timeout: 15000 });
    await page.click('#pet');
    await page.waitForFunction(playing, null, { timeout: 8000 });
    const a2 = await page.evaluate(info);
    assert(a2.bulle !== a1.bulle, 'toucher Pat : même réplique');
    const tts = await page.evaluate(() => window.__tts);
    assert(!tts.length, `synthèse vocale utilisée : ${tts.join(' | ')}`);
    // 4. ⚙️ : case Musique, coupe et relance, mémorisée
    await page.click('#btn-settings');
    await page.locator('#opt-music').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/voix-${vp.n}-reglages.png` });
    assert(await page.isChecked('#opt-music'), 'musique non cochée par défaut');
    await page.uncheck('#opt-music');
    await page.waitForFunction(() => window.__patMusic && window.__patMusic.gain < 0.01, null, { timeout: 3000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:musique')));
    assert(saved.on === false, `préférence ${JSON.stringify(saved)}`);
    await page.check('#opt-music');
    await page.waitForFunction(() => window.__patMusic?.playing, null, { timeout: 8000 });
    // 5. v1.8.1 : ⚙️ → Sous-titres (coupés par défaut) ; cochés → bulle visible, gardés au rechargement
    assert(!(await page.isChecked('#opt-subs')), 'sous-titres cochés par défaut');
    await page.locator('#opt-subs').scrollIntoViewIfNeeded();
    await page.check('#opt-subs');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/soustitres-${vp.n}-reglages.png` });
    const ss = await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:soustitres')));
    assert(ss?.on === true, `préférence sous-titres ${JSON.stringify(ss)}`);
    await page.keyboard.press('Escape');
    const l1 = await page.evaluate(lay);
    assert(l1.display !== 'none' && l1.h > 20 && l1.text.length > 1, `bulle invisible avec sous-titres : ${JSON.stringify(l1)}`);
    await page.reload();
    await page.waitForSelector('[data-player] #pet');
    const l2 = await page.evaluate(lay);
    assert(l2.display !== 'none' && l2.h > 20, `sous-titres non gardés au rechargement : ${JSON.stringify(l2)}`);
    await page.click('#pet');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/soustitres-${vp.n}-bulle.png` });
    await page.click('#btn-settings');
    assert(await page.isChecked('#opt-subs'), 'case sous-titres décochée après rechargement');
    await page.uncheck('#opt-subs');
    await page.keyboard.press('Escape');
    assert((await page.evaluate(lay)).display === 'none', 'bulle encore là après avoir décoché');
    assert(!errors.length, `erreurs console : ${errors.join(' | ')}`);
    results.push(`✔ ${vp.n} : Pat parle seul (${a1.src}), toucher Pat (${a2.src}), aucun TTS, jauge/boutons/phrase/🎵 masqués, ⛶ gardé, musique dans ⚙️, bulle masquée (espace ${l0.gap}px) et sous-titres dans ⚙️`);
  } catch (e) { failed++; results.push(`✘ ${vp.n} : ${e.message}`); }
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
if (failed) { console.log(`${failed} échec(s)`); process.exit(1); }
console.log('Voix complètes : tout passe.');
