// E2E du compagnon : écran « Tour du joueur », toucher pour parler, répliques minutées
// (horloge simulée), muet, réglages voix, sauvegarde et annulation. Téléphone + tablette.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { LINES } from '../pet.js';

const BASE = process.env.BASE_URL || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || '../pat-cognefoudre-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const viewports = [
  { name: 'telephone', prefix: 'pet-', width: 390, height: 844 },
  { name: 'tablette', prefix: 'pet-tablette-', width: 820, height: 1180 },
];

// Synthèse vocale simulée : enregistre chaque énoncé et propose des voix fr-FR et fr-CA.
const speechStub = () => {
  const voices = [
    { name: 'Thomas', lang: 'fr-FR', localService: true }, { name: 'Amélie', lang: 'fr-CA', localService: true },
    { name: 'Samantha', lang: 'en-US', localService: true },
  ];
  window.__utterances = [];
  const fake = {
    speaking: false,
    getVoices: () => voices,
    speak(u) { window.__utterances.push({ text: u.text, pitch: u.pitch, rate: u.rate, volume: u.volume, lang: u.lang, voice: u.voice?.name }); setTimeout(() => u.onend?.(), 30); },
    cancel() {}, addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  // Les fausses voix ne sont pas des SpeechSynthesisVoice : énoncé simulé lui aussi.
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.pitch = 1; this.rate = 1; this.volume = 1; this.lang = ''; this.voice = null; } };
};

function assert(c, msg) { if (!c) throw new Error(msg); }
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const results = []; let failed = 0;

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-CA' });
  await ctx.addInitScript(speechStub);
  // Hasard reproductible : la partie de test est toujours la même (Pat non bloqué au tour 1).
  await ctx.addInitScript((seed) => {
    let a = seed >>> 0;
    Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, Number(process.env.PET_SEED ?? 7));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const bubble = () => page.textContent('#pet-bubble');
  const mood = () => page.getAttribute('#pet-mood', 'data-mood');
  const spoken = () => page.evaluate(() => window.__utterances.filter((u) => u.text.trim()).length);
  const shot = async (n) => { await page.waitForTimeout(120); await page.screenshot({ path: `${SHOTS}/${vp.prefix}${n}.png` }); };

  // Joue le tour de Pat ; si block, refuse le premier lieu proposé. Renvoie true s'il a été bloqué.
  async function patTurn(block = false) {
    let blocked = false;
    for (let i = 0; i < 40; i++) {
      const kind = await page.getAttribute('[data-step]', 'data-step');
      if (kind === 'idle') {
        if (await page.$('[data-player]') && i > 0) return blocked;
        await page.click('#btn-turn'); continue;
      }
      if (kind === 'place' && block && !blocked) { blocked = true; await page.click('[data-a="blocked"]'); continue; }
      if (kind === 'card') { await page.click('[data-color]'); continue; }
      if (kind === 'askHuman') { await page.click('[data-a="no"]'); continue; }
      if (kind === 'guildQuest') { await page.click('[data-a="mountain"]'); continue; }
      if (kind === 'patToken') { await page.click('[data-a]'); continue; }
      await page.click('[data-a="ok"]');
    }
    throw new Error('Tour de Pat interminable');
  }

  try {
    await page.clock.install();
    await page.goto(BASE);
    await page.click('[data-level="2"]');
    await page.click('#btn-start');
    await page.click('#btn-ready');
    await patTurn(false);

    // 1. Écran du joueur, réplique d'accueil, voix grave fr-CA
    await page.waitForSelector('[data-player] #pet');
    const t1 = await bubble();
    assert(t1 && t1 !== '…', 'pas de réplique d’accueil');
    assert(await page.textContent('#btn-turn') === 'J’ai fini mon tour → Tour de Pat', 'bouton de fin de tour');
    const u = await page.evaluate(() => window.__utterances.at(-1));
    assert(u && u.voice === 'Amélie' && u.pitch === 0.7 && u.rate < 1, `voix inattendue ${JSON.stringify(u)}`);
    assert((await mood()) === 'content', `humeur de départ ${await mood()}`);
    await shot('contenu');

    // 2. Toucher Pat : nouvelle réplique, dite à voix haute, animation de parole
    const n0 = await spoken();
    await page.click('#pet');
    const t2 = await bubble();
    assert(t2 !== t1, 'toucher Pat ne change pas la réplique');
    assert((await spoken()) === n0 + 1, 'toucher Pat ne parle pas');
    assert(await page.$('#pet.talking'), 'pas d’animation de parole');
    await page.screenshot({ path: `${SHOTS}/${vp.prefix}bulle.png` });
    await page.clock.runFor(3000);

    // 3. Joueur lent : après ~50 s Pat s'impatiente, puis relance toutes les 75 s, pas avant
    let n1 = await spoken();
    await page.clock.runFor(19000); // 22 s depuis le début : au plus une réplique « de temps en temps »
    const chatter = (await spoken()) - n1;
    assert(chatter <= 1, `trop de répliques avant 22 s (${chatter})`);
    await page.clock.runFor(30000); // ~52 s
    assert((await mood()) === 'impatient', `humeur après 50 s : ${await mood()}`);
    const t3 = await bubble();
    assert(LINES.impatient.includes(t3), `réplique hors liste impatient : ${t3}`);
    n1 = await spoken();
    await page.clock.runFor(60000);
    assert((await spoken()) === n1, 'relance trop rapide (< 75 s)');
    await page.clock.runFor(16000);
    assert((await spoken()) === n1 + 1, 'pas de relance après 75 s');
    assert((await bubble()) !== t3, 'relance identique');

    // 4. Muet : la bulle change toujours, la voix se tait
    await page.click('#btn-mute');
    assert((await page.textContent('#btn-mute')).includes('Muet'), 'bouton muet');
    const n2 = await spoken(); const t4 = await bubble();
    await page.click('#btn-talk');
    assert((await bubble()) !== t4 && (await spoken()) === n2, 'muet : bulle ou voix incorrecte');
    await page.click('#btn-settings');
    assert(!(await page.isChecked('#opt-voice')), 'réglage voix non synchronisé');
    assert((await page.textContent('#voice-status')).includes('Amélie'), 'statut voix');
    await page.check('#opt-voice');
    await page.fill('#opt-volume', '0.5');
    await page.dispatchEvent('#opt-volume', 'input');
    await shot('reglages-voix');
    await page.click('#settings button:not([type])');
    await page.click('#pet');
    assert((await page.evaluate(() => window.__utterances.at(-1).volume)) === 0.5, 'volume non appliqué');

    // 5. Sauvegarde (rechargement) et annulation
    const t5 = await bubble();
    await page.reload();
    await page.waitForSelector('[data-player] #pet');
    assert((await bubble()) === t5, 'réplique non conservée au rechargement');
    assert(await page.evaluate(() => JSON.parse(localStorage.getItem('pat-cognefoudre:voice')).volume) === 0.5, 'réglage voix non sauvegardé');
    await page.click('#btn-undo');
    assert((await page.getAttribute('[data-step]', 'data-step')) !== 'idle', 'annuler ne revient pas au tour de Pat');
    await page.click('[data-a="ok"]');
    await page.waitForSelector('[data-player] #pet');

    // 6. Retour au tour de Pat, puis Pat bloqué → grognon
    let grumpy = false;
    for (let k = 0; k < 8 && !grumpy; k++) {
      const wasBlocked = await patTurn(true);
      if (wasBlocked) { grumpy = (await mood()) === 'grognon'; }
    }
    assert(grumpy, 'Pat n’est jamais devenu grognon après un blocage');
    const tg = await bubble();
    assert(LINES.grognon.some((l) => tg.startsWith(l.split('{')[0])), `réplique hors liste grognon : ${tg}`);
    await page.clock.runFor(2500); // laisse disparaître le message « annulée »
    await shot('grognon');

    assert(!errors.length, 'Erreurs console : ' + errors.join(' | '));
    results.push(`✔ ${vp.name} : accueil, toucher, minuterie (≤1 réplique avant 22 s, impatient à 50 s, relance à 75 s), muet, réglages, sauvegarde, annuler, grognon`);
  } catch (e) {
    failed++; results.push(`✘ ${vp.name} : ${e.message}`);
    await page.screenshot({ path: `/tmp/pet-erreur-${vp.name}.png` }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} échec(s)` : 'Tous les tests e2e du compagnon passent');
process.exit(failed ? 1 : 0);
