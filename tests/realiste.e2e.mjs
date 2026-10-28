// E2E du Pat peint (boucles de Créa) : par humeur, boucle « repos » au calme et « parle » pendant la voix,
// fondu ~200 ms entre les deux et entre humeurs ; réplique numérotée = 3 segments enchaînés (a + nombre + b)
// avec « parle » tout du long ; mouvement réduit = affiche fixe ; vidéo en panne = affiche. Aucune erreur console.
// Téléphone + tablette. Captures realiste-*.png et voixanim-{telephone,tablette}-{repos,parle}.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const MOODS = ['content', 'grognon', 'impatient', 'endormi', 'triomphant', 'boudeur'];
const CHAIN = ['seg-content-6-a', 'nombre-12', 'seg-content-6-b'];

const speechStub = () => {
  const fake = {
    speaking: false, getVoices: () => [{ name: 'Amélie', lang: 'fr-CA', localService: true }],
    speak(u) { setTimeout(() => u.onend?.(), 1500); }, cancel() {}, addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
};
// Journal des segments audio réellement joués (début/fin) et de la boucle affichée à ce moment-là.
const audioLog = () => {
  window.__segs = [];
  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play() {
    if (this instanceof HTMLAudioElement && !this.__logged) {
      this.__logged = true;
      this.addEventListener('playing', () => window.__segs.push({ ev: 'start', src: this.currentSrc.split('/').pop(), t: performance.now(), clip: window.__patAvatar?.clip }));
      this.addEventListener('ended', () => window.__segs.push({ ev: 'end', src: this.currentSrc.split('/').pop(), t: performance.now(), clip: window.__patAvatar?.clip }));
    }
    return realPlay.call(this);
  };
};

function assert(c, msg) { if (!c) throw new Error(msg); }
// Voix de Pat marche/arrêt : réglage ⚙️ (v1.8.0 : plus de bouton « Voix » sous Pat).
async function setVoice(page, on) {
  await page.click('#btn-settings');
  await page.setChecked('#opt-voice', on);
  await page.click('#settings button:not([type])');
}
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];

async function newPage(vp, { reduced = false, noVideo = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA', reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.addInitScript(speechStub);
  await ctx.addInitScript(audioLog);
  await ctx.addInitScript(() => { let a = 7; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  // Les segments de la réplique numérotée doivent exister même si l'import ElevenLabs est incomplet.
  await ctx.route('**/audio/liste.js', async (route) => {
    const r = await route.fetch(); let body = await r.text();
    body = body.replace(/\[([^\]]*)\]/, (m, ids) => `[${ids},${CHAIN.map((c) => JSON.stringify(c)).join(',')}]`);
    route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.route(/\/audio\/(seg-|nombre-).*\.mp3$/, async (route) => {
    const r = await route.fetch();
    if (r.ok()) return route.fulfill({ response: r });
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync('tests/fixtures/segment.mp3') });
  });
  if (noVideo) await ctx.route(/\/video\/.*\.(webm|mp4)$/, (route) => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !(noVideo && /Failed to load resource/.test(m.text()))) errors.push(m.text()); });
  await page.goto(BASE);
  // Pas de bavardage spontané de Pat pendant les mesures (il couperait la chaîne testée).
  await page.evaluate(async () => { const { TIMING } = await import('./pet.js'); for (const k of ['chatterMin', 'chatterMax', 'slowAfter', 'nagEvery']) TIMING[k] = 1e9; });
  await page.click('[data-level="2"]'); await page.click('#btn-start'); await page.click('#btn-ready');
  for (let i = 0; i < 40 && !(await page.$('[data-player] #pet')); i++) {
    const k = await page.getAttribute('[data-step]', 'data-step');
    const sel = { idle: '#btn-turn', card: '[data-color]', askHuman: '[data-a="no"]', guildQuest: '[data-a="mountain"]', patToken: '[data-a]' }[k] || '[data-a="ok"]';
    await page.click(sel);
  }
  await page.waitForSelector('[data-player] #pet .pat-av video.pat-v');
  return { ctx, page, errors };
}
// La boucle affichée (couche « on » de devant) est `clip`, chargée et en lecture.
const showing = (page, clip, timeout = 8000) => page.waitForFunction((clip) => {
  const A = window.__patAvatar; if (A.shown !== clip) return false;
  const v = [...document.querySelectorAll('.pat-v.on.top')][0];
  return v && v.dataset.clip === clip && v.readyState >= 3 && !v.paused && v.currentTime > 0.1;
}, clip, { timeout });
const waitIdle = (page) => page.waitForFunction(() => !window.__patAvatar.talking && window.__patAvatar.shown?.endsWith('-repos'), null, { timeout: 15000 });

for (const vp of [{ name: 'telephone', width: 390, height: 844 }, { name: 'tablette', width: 820, height: 1180 }]) {
  const { ctx, page, errors } = await newPage({ width: vp.width, height: vp.height });
  try {
    // 1. Au calme : boucle « repos » de l'humeur de #pet, muette, en boucle, inline ; plus de bouche dessinée
    const appMood = await page.getAttribute('#pet', 'data-mood');
    await waitIdle(page);
    await showing(page, `${appMood}-repos`);
    const v0 = await page.$eval('.pat-v.on.top', (v) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, src: v.currentSrc }));
    assert(v0.muted && v0.loop && v0.inline && /video\/pat-\w+-repos\.(webm|mp4)$/.test(v0.src), `attributs vidéo ${JSON.stringify(v0)}`);
    assert(!(await page.$('#pet canvas')), 'ancienne bouche (canvas) encore présente');
    assert(await page.$eval('.pat-poster', (i) => i.src.endsWith(`video/pat-${document.querySelector('.pat-av').dataset.mood}.jpg`)), 'affiche absente');
    assert((await page.$$('.pat-v')).length === 2, 'il faut exactement deux couches vidéo');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/voixanim-${vp.name}-repos.png` });

    // 2. Changement d'humeur → boucle repos de la nouvelle humeur, fondu (les deux couches visibles un instant)
    const av = await page.evaluateHandle(() => import('./avatar.js'));
    for (const m of (vp.name === 'telephone' ? MOODS : ['grognon', 'content'])) {
      await av.evaluate((mod, m) => mod.setAvatarMood(m), m);
      await showing(page, `${m}-repos`);
      if (vp.name === 'telephone') { await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/realiste-${m}.png` }); }
    }
    await av.evaluate((mod) => mod.setAvatarMood('content'));
    await showing(page, 'content-repos');

    // 3. Vraie réplique mp3 (toucher Pat) : « parle » pendant l'audio, retour à « repos » après
    await page.evaluate(() => { window.__segs.length = 0; });
    const t0 = await page.evaluate(() => performance.now());
    await page.click('#pet');
    const mood = await page.getAttribute('#pet', 'data-mood');
    await page.waitForFunction(() => window.__segs.some((s) => s.ev === 'start'), null, { timeout: 5000 });
    await showing(page, `${mood}-parle`, 3000);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/voixanim-${vp.name}-parle.png` });
    if (vp.name === 'telephone') await page.screenshot({ path: `${SHOTS}/realiste-parle.png` });
    await page.waitForFunction(() => window.__segs.some((s) => s.ev === 'end'), null, { timeout: 15000 });
    await waitIdle(page);
    const sw = (await page.evaluate(() => window.__patAvatar.switches)).filter((s) => s.t >= t0).map((s) => s.clip);
    assert(sw.includes(`${mood}-parle`) && sw.at(-1) === `${mood}-repos`, `bascules repos/parle pendant l'audio : ${sw.join(' → ')}`);
    const segs = await page.evaluate(() => window.__segs);
    assert(segs.filter((s) => s.ev === 'start').every((s) => s.clip?.endsWith('-parle')), `« parle » pas actif au début de l'audio ${JSON.stringify(segs)}`);

    // 4. Réplique numérotée (content-6-12) : 3 segments enchaînés, petits blancs, « parle » tout du long
    await page.evaluate(() => { window.__segs.length = 0; });
    const vo = await page.evaluateHandle(() => import('./voice.js'));
    assert(JSON.stringify(await vo.evaluate((m) => m.audioChain('content-6-12'))) === JSON.stringify(CHAIN), 'audioChain(content-6-12) incorrect');
    const chainSwitches = await page.evaluate(() => window.__patAvatar.switches.length);
    await vo.evaluate((m) => new Promise((res) => { m.speak('Il te reste 12 cartes.', (ok) => { window.__chainOk = ok; res(); }, 'content-6-12'); setTimeout(res, 15000); }));
    const cs = await page.evaluate(() => window.__segs);
    const starts = cs.filter((s) => s.ev === 'start').map((s) => s.src);
    assert(JSON.stringify(starts) === JSON.stringify(CHAIN.map((c) => `${c}.mp3`)), `segments joués : ${starts.join(', ')}`);
    assert(await page.evaluate(() => window.__chainOk === true), `la chaîne ne se termine pas avec succès (${await page.evaluate(() => window.__chainOk)}) ${JSON.stringify(cs)}`);
    const gaps = [];
    for (let i = 1; i < cs.length; i++) if (cs[i].ev === 'start' && cs[i - 1].ev === 'end') gaps.push(Math.round(cs[i].t - cs[i - 1].t));
    assert(gaps.length === 2 && gaps.every((g) => g >= 60 && g < 400), `blancs entre segments : ${gaps.join(', ')} ms`);
    assert(cs.filter((s) => s.ev !== 'end' || s !== cs.at(-1)).every((s) => s.clip?.endsWith('-parle')), `« parle » interrompu pendant la chaîne ${JSON.stringify(cs.map((s) => s.clip))}`);
    const mid = (await page.evaluate(() => window.__patAvatar.switches)).slice(chainSwitches).map((s) => s.clip);
    assert(mid.filter((c) => c.endsWith('-repos')).length <= 1, `retour à « repos » au milieu de la chaîne : ${mid.join(' → ')}`);
    await waitIdle(page);

    // 5. En muet : parole minutée (synthèse coupée) → « parle » puis « repos »
    await setVoice(page, false);
    await page.click('#pet');
    const m2 = await page.getAttribute('#pet', 'data-mood');
    await showing(page, `${m2}-parle`, 3000);
    await waitIdle(page);
    await setVoice(page, true);

    assert(errors.length === 0, `erreurs console : ${errors.join(' | ')}`);
    results.push(`✓ ${vp.name} : repos au calme, humeurs, réplique mp3 (${sw.join(' → ')}), chaîne numérotée 3 segments (blancs ${gaps.join('/')} ms), muet`);
  } catch (e) { failed++; results.push(`✗ ${vp.name} : ${e.message}`); await page.screenshot({ path: `${SHOTS}/realiste-echec-${vp.name}.png` }).catch(() => {}); }
  await ctx.close();
}

// 6. Mouvement réduit : affiche fixe (aucune vidéo en lecture), la parole marche quand même
{
  const { ctx, page, errors } = await newPage({ width: 390, height: 844 }, { reduced: true });
  try {
    await page.waitForTimeout(800);
    const v = await page.$$eval('.pat-v', (vs) => vs.map((v) => ({ paused: v.paused, on: v.classList.contains('on') })));
    assert(v.every((x) => x.paused && !x.on), `mouvement réduit : ${JSON.stringify(v)}`);
    assert(await page.$eval('.pat-poster', (i) => i.complete && i.naturalWidth > 0), 'affiche non chargée');
    await page.click('#pet');
    assert(await page.evaluate(() => window.__patAvatar.talking), 'mouvement réduit : parole non signalée');
    assert(errors.length === 0, `erreurs console : ${errors.join(' | ')}`);
    await page.screenshot({ path: `${SHOTS}/realiste-mouvement-reduit.png` });
    results.push('✓ mouvement réduit : affiche fixe');
  } catch (e) { failed++; results.push(`✗ mouvement réduit : ${e.message}`); }
  await ctx.close();
}

// 7. Vidéos injoignables : l'affiche de l'humeur reste visible, l'appli continue
{
  const { ctx, page, errors } = await newPage({ width: 390, height: 844 }, { noVideo: true });
  try {
    await page.waitForTimeout(1500);
    const p = await page.$eval('.pat-poster', (i) => ({ ok: i.complete && i.naturalWidth > 0, vis: getComputedStyle(i).visibility, src: i.src }));
    assert(p.ok && p.vis === 'visible', `affiche de secours : ${JSON.stringify(p)}`);
    const vis = await page.$$eval('.pat-v', (vs) => vs.map((v) => v.readyState));
    assert(vis.every((r) => r === 0), 'une vidéo a chargé malgré le blocage');
    await page.click('#pet');
    assert(errors.length === 0, `erreurs console : ${errors.join(' | ')}`);
    await page.screenshot({ path: `${SHOTS}/realiste-sans-video.png` });
    results.push('✓ sans vidéo : affiche de secours');
  } catch (e) { failed++; results.push(`✗ sans vidéo : ${e.message}`); }
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
if (failed) { console.error(`${failed} échec(s)`); process.exit(1); }
console.log('Tous les tests du Pat peint passent.');
