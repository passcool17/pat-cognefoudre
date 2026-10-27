import {
  COLORS, TACTIQUES, SEASON_LABEL, SEASON_ARTICLE, STORM_CARDS, QUEST_PILE, LEVEL_BONUS, PAT_TOKENS, WORKER_GAIN,
} from './data.js';
import {
  camp, setupEntryCard, renderCampaignScreen, campaignBanner, scoreCampaignRows, mistNote, rulesSection, bindCampaign,
} from './campagne-ui.js';
import { humanFinal, gameOptions } from './campagne.js';
import {
  newGame, startTurn, answer, adjust, setHumanPrepared, score, winner, workersLeft, patTokensFree,
  nextSeason, locKind, baliseOf, PLAN_BY_ID, COMPLOT_BY_ID,
} from './logic.js';
import { MOODS, TIMING, TEST_LINE, computeMood, happiness, newPet, pickLine } from './pet.js';
import {
  voiceSettings, saveVoice, speak, stopSpeaking, unlockOnFirstGesture, currentVoice, speechSupported, recordedCount,
} from './voice.js';
import { initFullscreen } from './fullscreen.js';
import { mountAvatar, setAvatarMood, avatarTalk } from './avatar.js';

export const VERSION = '1.5.0';
const KEY = 'pat-cognefoudre:state';
const HKEY = 'pat-cognefoudre:history';
const SKEY = 'pat-cognefoudre:score';
const MAX_HISTORY = 200;

let S = load(KEY);
let history = load(HKEY) || [];
let scoreInputs = load(SKEY) || { cardPoints: 0, mostSnow: false, human: 0, questPoints: null };
let tab = 'tour';
let setupDraft = { level: 2, startWorkers: 2, loop: false };
let showChecklist = false;

function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    localStorage.setItem(HKEY, JSON.stringify(history));
    localStorage.setItem(SKEY, JSON.stringify(scoreInputs));
  } catch (e) { console.warn('Sauvegarde impossible', e); }
}
function act(fn) {
  history.push(JSON.stringify(S));
  if (history.length > MAX_HISTORY) history.shift();
  fn(S);
  save();
  render();
}
function undo() {
  if (!history.length) return;
  S = JSON.parse(history.pop());
  save();
  toast('Dernière étape annulée');
  render();
}

// ---------- utilitaires d'affichage ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}
export function scrollIcon(kind) {
  const c = kind === 'montagne' ? 'var(--violet-q)' : 'var(--green-q)';
  const label = kind === 'montagne' ? 'Quête en montagne (parchemin violet)' : 'Quête en plaine (parchemin vert)';
  return `<svg class="scroll-ico" viewBox="0 0 24 24" role="img" aria-label="${label}"><title>${label}</title>
    <rect x="5" y="4" width="14" height="16" rx="2" fill="#f3e3bd" stroke="#8a6d3b"/>
    <rect x="3" y="3" width="18" height="4" rx="2" fill="#e8d3a3" stroke="#8a6d3b"/>
    <rect x="3" y="17" width="18" height="4" rx="2" fill="#e8d3a3" stroke="#8a6d3b"/>
    <path d="M10 9 h4 v9 l-2 -2 l-2 2 z" fill="${c}"/></svg>`;
}
function chipsFor(colors) {
  return `<div class="chips">${colors.map((c, i) => `<span class="chip" style="background:${COLORS[c].hex}"><span class="n">${i + 1}</span>${COLORS[c].short}</span>`).join('')}</div>`;
}
const RES = {
  bouleau3: 'le lieu de base « 3 Bouleaux »',
  mousse2: 'le lieu de base « 2 Mousses »',
  cuivre1: 'le lieu de base « 1 Cuivre + 1 carte »',
  gland2: 'le lieu de base « 2 Glands + 1 carte »',
};
export function locLabel(loc) {
  if (RES[loc]) return RES[loc];
  if (loc === 'forge') return 'la Forge — lieu exclusif';
  if (loc === 'guilde') return 'la Guilde — un lieu exclusif';
  if (loc === 'voyHaut') return 'le Voyage — lieu exclusif de plus haute valeur disponible';
  if (loc === 'voyBas') return 'le Voyage — lieu exclusif de plus basse valeur disponible';
  if (loc === 'voy2') return 'le Voyage — lieu partagé (2 points)';
  if (loc === 'voyAny') return 'le Voyage — un lieu Voyage disponible';
  const b = baliseOf(loc);
  if (b) return `la Balise de valeur ${b.value ?? '?'} (icône à ${b.side === 'g' ? 'gauche' : 'droite'} du sommet)`;
  return loc;
}
function aLieu(label) { return label.startsWith('le ') ? 'au ' + label.slice(3) : 'à ' + label; }
function tactLabel(t) {
  return {
    forge: 'Forge', bouleau3: '3 Bouleaux', mousse2: '2 Mousses', cuivre1: '1 Cuivre + 1 carte', gland2: '2 Glands + 1 carte',
    guilde: 'Guilde', balD: 'Balise ? (icône à droite)', voyage: 'Voyage (printemps uniquement)', balG: 'Balise ? (icône à gauche)',
  }[t];
}
function quarterLabel(q) {
  const short = {
    bouleau3: '3 Bouleaux', mousse2: '2 Mousses', cuivre1: '1 Cuivre + carte', gland2: '2 Glands + carte', forge: 'Forge +🔥', guilde: 'Guilde',
    voyHaut: 'Voyage ↑ exclusif', voyBas: 'Voyage ↓ exclusif', voy2: 'Voyage partagé (2)',
  }[q.loc] || (() => { const b = baliseOf(q.loc); return `Balise ${b.value} (${b.side === 'g' ? 'g.' : 'd.'})`; })();
  return `🐾 ${short}<br>ou 🃏 ${q.src === 'pile' ? 'PILE' : 'VALLÉE'}`;
}
function stepper(name, value = 0, min = 0, max = 99) {
  return `<span class="stepper" data-stepper="${name}" data-min="${min}" data-max="${max}">
    <button type="button" data-d="-1" aria-label="moins">−</button>
    <input type="number" inputmode="numeric" name="${name}" value="${value}" min="${min}" max="${max}" aria-label="${name}">
    <button type="button" data-d="1" aria-label="plus">+</button></span>`;
}
function val(name) { const el = $(`[name="${name}"]`); return el ? Math.max(0, Number(el.value) || 0) : 0; }
function checked(name) { const el = $(`[name="${name}"]`); return !!el?.checked; }

// ---------- rendu ----------
let rendering = false;
function render() {
  // Un champ qui perd le focus pendant le remplacement du DOM déclenche « change » :
  // on le fait perdre avant, et on ignore les rendus imbriqués.
  if (rendering) return;
  rendering = true;
  try { document.activeElement?.blur?.(); renderNow(); } finally { rendering = false; }
  const fig = $('#pet');
  if (fig) mountAvatar(fig.querySelector('.pet-body'), fig.dataset.mood);
  petSync();
  petFinalReact();
}
// Fin de partie : Pat réagit (une fois) au verdict saisi dans l'onglet Score.
function petFinalReact() {
  if (!S?.ended || tab !== 'score' || !$('#pet-bubble')) return;
  const f = finalScores();
  const key = f.humanTotal > 0 ? (f.patTotal >= f.humanTotal ? 'pat' : 'you') : 'none';
  const pet = ensurePet();
  if (pet.finalKey === key) return;
  pet.finalKey = key;
  petSay();
}
function renderNow() {
  const app = $('#app');
  const tabs = $('#tabs');
  if (!S || showChecklist) {
    tabs.hidden = !S;
    app.innerHTML = S ? renderChecklist() : camp.view ? renderCampaignScreen() : renderSetup();
    $('#subtitle').textContent = 'Roi des Bandits · Everdell : Silverfrost';
    bind();
    return;
  }
  tabs.hidden = false;
  tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#subtitle').textContent = `${S.campaign ? `Campagne An ${S.campaign.year} · ` : ''}Niveau ${S.level} · ${SEASON_LABEL[S.season]} · tour ${S.turn}`;
  $('#opt-loop').checked = !!S.opts.loopTactiques;
  const banner = tab === 'tour' || tab === 'score' ? campaignBanner(S, tab === 'tour') : '';
  app.innerHTML = banner + { tour: renderTour, suivi: renderSuivi, score: renderScore, regles: renderRegles }[tab]();
  bind();
}

function renderSetup() {
  const lv = [1, 2, 3, 4].map((n) => {
    const q = QUEST_PILE[n]; const b = LEVEL_BONUS[n];
    return `<button class="level" data-level="${n}" aria-pressed="${setupDraft.level === n}">
      <b>Niveau ${n}</b>
      <small>${q.plaine}${scrollIcon('plaine')} + ${q.montagne}${scrollIcon('montagne')}</small>
      <small>Bonus : ${b.violet}/violette${b.feu ? `, ${b.feu}/feu, ${b.cachee}/cachée` : ''}</small>
    </button>`;
  }).join('');
  return `
  <section class="card">
    <img src="img/lynx.jpg" alt="" style="float:right;width:96px;border-radius:12px;margin:0 0 8px 10px;border:3px solid var(--cream-2)">
    <div class="kicker">Nouvelle partie</div>
    <h2>Affronte le Roi des Bandits</h2>
    <p>Cette app remplace les cartes Plan, Complot et Tactiques de Pat. Elle te dit quoi faire pour lui à chaque tour, compte ses jetons et calcule son score.</p>
  </section>
  <section class="card">
    <h2>Niveau de difficulté</h2>
    <div class="levels">${lv}</div>
    <h3>Réglages</h3>
    <div class="field"><span class="lbl">Ouvriers normaux de Pat en été<br><span class="hint">Comme pour toi à 2 joueurs (mise en place p.6, non numérisée). Valeur par défaut : 2, à vérifier.</span></span>${stepper('startWorkers', setupDraft.startWorkers, 1, 6)}</div>
    <label class="check"><input type="checkbox" name="loop" ${setupDraft.loop ? 'checked' : ''}> Carte Tactiques : reboucler en bout de liste <span class="flag">option</span></label>
    <button class="btn huge red" id="btn-start">Mélanger les cartes de Pat</button>
  </section>
  ${setupEntryCard()}`;
}

function renderChecklist() {
  const q = QUEST_PILE[S.level];
  const pile = `${Array(q.plaine).fill(scrollIcon('plaine')).join('')}${Array(q.montagne).fill(scrollIcon('montagne')).join('')}`;
  return `
  <section class="card">
    <div class="kicker">Mise en place · niveau ${S.level}</div>
    <h2>Prépare la table</h2>
    <ul class="steps">
      <li>Installe une partie <b>à 2 joueurs</b>. Donne à Pat les ouvriers et le garde forestier d’une couleur (il préfère le rouge).</li>
      <li>Pour la neige, utilise la récompense de fin de partie <b>« Averses de neige »</b>.</li>
      <li>Révèle les Quêtes en montagne ${scrollIcon('montagne')} comme pour 2 joueurs : Pat compte comme un joueur. Pat ne prend <b>pas</b> de Quêtes en plaine ${scrollIcon('plaine')}.</li>
      <li>Pose les <b>10 jetons Pat</b> près de toi (l’app les compte aussi).</li>
      <li>Pat joue en premier et ne pioche aucune carte. <b>Toi, pioche 6 cartes.</b></li>
      <li>Laisse les cartes Plan, Complot et Tactiques dans la boîte : l’app les a mélangées et tire pour toi (Plan ${S.plan.id} révélé).</li>
    </ul>
    <h3>Pile Quête de Pat</h3>
    <table class="score">
      <tr><td>${scrollIcon('plaine')} Quêtes en plaine (vertes)</td><td class="n">${q.plaine}</td></tr>
      <tr><td>${scrollIcon('montagne')} Quêtes en montagne (violettes)</td><td class="n">${q.montagne}</td></tr>
      <tr class="total"><td>Mélange-les face cachée</td><td class="n">${q.plaine + q.montagne}</td></tr>
    </table>
    <div class="qpile" aria-hidden="true">${pile}</div>
    ${S.level === 4 ? '<p class="hint">Niveau 4 : 3 + 1 comme sur la carte Aide (le livret indique 2 remplacements).</p>' : ''}
    <button class="btn huge red" id="btn-ready">C’est prêt : au tour de Pat !</button>
  </section>`;
}

function planView() {
  const p = PLAN_BY_ID[S.plan.id];
  const current = S.pending && S.cur ? S.cur.corner : null;
  const nextC = S.plan.count < 4 ? S.plan.next : null;
  const corners = p.corners.map((t, i) => {
    const f = S.plan.filled[i];
    const cls = ['corner', f === 'skip' ? 'skip' : f ? 'filled' : '', i === current ? 'current' : ''].join(' ');
    return `<div class="${cls}" data-c="${i}" ${f && f !== 'skip' ? `data-id="${f}"` : ''} title="${t === 'O' ? 'Placer un ouvrier' : 'Jouer une carte'}">
      ${i === p.cave ? '<span class="cave" title="Caverne : premier Complot">⛰</span>' : ''}${t === 'O' ? '🐾' : '🃏'}</div>`;
  }).join('');
  let cplt = '';
  if (S.cur) {
    const c = COMPLOT_BY_ID[S.cur.complot];
    const order = [0, 1, 3, 2]; // affichage HG HD / BG BD
    cplt = `<div class="complot"><div class="kicker">Complot ${c.id}</div>
      <div class="q">${order.map((i) => `<div class="${i === S.cur.corner ? 'on' : ''}">${quarterLabel(c.quarters[i])}</div>`).join('')}</div>
      ${chipsFor(c.colors)}</div>`;
  } else {
    cplt = `<div><p class="hint">Prochain coin : ${nextC === null ? 'nouvelle carte Plan' : p.corners[nextC] === 'O' ? '🐾 ouvrier' : '🃏 carte'}.</p></div>`;
  }
  return `<div class="plan-wrap">
    <div class="plan" aria-label="Carte Plan ${p.id}">${corners}
      <div class="mid"><div><span class="arrow">${p.arrow === 'bas' ? '⬇' : '⬆'}</span>Tactiques</div></div>
      <div class="pid">${p.id}</div></div>
    ${cplt}</div>`;
}

function workerName(w) { return w === 'ranger' ? 'son garde forestier' : 'un ouvrier'; }

function renderPending() {
  const p = S.pending;
  const next = p.season;
  switch (p.kind) {
    case 'askHuman':
      return `<section class="card instr" data-step="askHuman"><div class="kicker">Préparation</div>
        <div class="big">As-tu déjà préparé pour ${SEASON_ARTICLE[next]} ?</div>
        <p>Pat a placé tous ses ouvriers. Il se prépare seulement après toi.</p>
        <div class="row"><button class="btn red" data-a="yes">Oui</button><button class="btn" data-a="no">Non, pas encore</button></div>
        <p class="hint">Si non, Pat continue : ses cases ouvrier deviennent « jouer une carte » + 1 neige.</p></section>`;
    case 'prepare':
      return `<section class="card instr" data-step="prepare"><div class="kicker">Pat se prépare pour ${SEASON_ARTICLE[next]}</div>
        <div class="big">Fais la préparation de Pat :</div>
        <ul class="steps">
          <li>Prends toutes les cartes de la Vallée avec un jeton Pat (${S.patTokensVallee} en jeu). Place-les <b>face cachée</b> chez Pat, avec la neige qui était dessus. Remets ces jetons Pat dans la réserve.</li>
          <li>Rends à Pat ses ouvriers et donne-lui ${WORKER_GAIN[next] === 2 ? '2 nouveaux ouvriers' : '1 nouvel ouvrier'}.</li>
          <li>Retourne ${STORM_CARDS[next]} carte${STORM_CARDS[next] > 1 ? 's' : ''} Tempête de neige et ajoute la neige sur le plateau. <b>Rien dans la ville de Pat.</b></li>
          ${next === 'automne' ? '<li>Pose un jeton Pat sur le <b>lieu partagé de la Forge</b>. Désormais, quand tu le visites, donne ton feu à Pat.</li>' : ''}
          ${next === 'hiver' ? '<li>Pose un jeton Pat sur le <b>lieu partagé de la Guilde</b>. Désormais, quand tu le visites, donne ton feu à Pat.</li>' : ''}
          <li>Défausse le Plan et les Complots en jeu : l’app révèle un nouveau Plan.</li>
        </ul>
        ${next === 'hiver' ? '<p class="hint"><span class="flag">ambigu</span> Les règles solo ne disent pas si Pat déclenche la Fureur de l’hiver. À toi de décider.</p>' : ''}
        <div class="field"><span class="lbl">Cartes prises face cachée</span>${stepper('cardsTaken', Math.min(S.patTokensVallee, 10))}</div>
        <div class="field"><span class="lbl">Neige gagnée sur ces cartes</span>${stepper('snowTaken', 0)}</div>
        <button class="btn huge red" data-a="ok" data-form="prepare">Préparation faite</button></section>`;
    case 'place': {
      const k = locKind(p.loc);
      let detail = '';
      if (k === 'ressource') detail = 'Pat bloque ce lieu. Il ne gagne aucune ressource.';
      if (k === 'forge') detail = 'Pat n’utilise que le lieu exclusif de la Forge. Il gagne 1 feu.';
      if (k === 'guilde') detail = 'Choisis un lieu exclusif de la Guilde, si possible inoccupé et avec de la neige. Pat ignore la limite de 2 ouvriers. Ensuite, sa quête.';
      if (k === 'balise') detail = 'Pat défausse la Grosse Créature de cette balise et gagne ses jetons Point. Réapprovisionne ensuite.';
      if (k === 'voyage') detail = S.level === 1 ? 'Niveau 1 : Pat prend toujours le lieu partagé (2 points).' : 'Pat part en Voyage (printemps).';
      const ranger = p.worker === 'ranger';
      return `<section class="card instr" data-step="place"><div class="kicker">Pat place ${workerName(p.worker)}${p.via !== null && p.via !== undefined ? ` · Tactiques ligne ${p.via + 1}` : ''}</div>
        ${p.reason ? `<p class="hint">${esc(p.reason)}</p>` : ''}
        <div class="big">Pat va ${aLieu(locLabel(p.loc))}.</div>
        <p>${detail}</p>
        ${ranger ? '<p><b>Garde forestier :</b> il peut aller sur un lieu où se trouve ton ouvrier. Il gagne 1 feu s’il ne partage pas le lieu.</p>' : ''}
        <label class="check"><input type="checkbox" name="snow"> Il y avait de la neige : Pat la déblaie gratuitement (+1 neige)</label>
        <div class="stack">
          <button class="btn red block" data-a="ok" data-form="place">${ranger ? 'Lieu libre : posé (+1 feu)' : 'C’est fait : ouvrier posé'}</button>
          ${ranger ? '<button class="btn block" data-a="sharedHuman" data-form="place">Posé à côté de ton ouvrier (pas de feu)</button>' : ''}
          <button class="btn ghost block" data-a="blocked">Lieu indisponible → carte Tactiques</button>
        </div></section>`;
    }
    case 'balise': {
      return `<section class="card instr" data-step="balise"><div class="kicker">Balise</div>
        <div class="big">Défausse la Grosse Créature de la balise ${p.value ?? '?'} et réapprovisionne.</div>
        ${p.mist ? mistNote('balise') : ''}
        <p>Pat ignore le texte de la carte. Combien de jetons Point gagne-t-il ?</p>
        <div class="field"><span class="lbl">Jetons Point</span>${stepper('points', p.value ?? 0)}</div>
        <button class="btn huge red" data-a="ok" data-form="points">Valider</button></section>`;
    }
    case 'voyageValue':
      return `<section class="card instr" data-step="voyageValue"><div class="kicker">Voyage</div>
        <div class="big">Quelle est la valeur du lieu Voyage où Pat s’est posé ?</div>
        <div class="field"><span class="lbl">Points de Voyage</span>${stepper('points', 2)}</div>
        <button class="btn huge red" data-a="ok" data-form="points">Valider</button></section>`;
    case 'guildQuest':
      return `<section class="card instr" data-step="guildQuest"><div class="kicker">Guilde · quête</div>
        <div class="big">Pat remplit-il les exigences d’une Quête en montagne ${scrollIcon('montagne')} face visible ?</div>
        ${p.mist ? mistNote('guildQuest') : ''}
        <ul class="steps"><li>Prends la plus élevée possible.</li><li>Chaque feu de Pat (${S.fire}) compte comme 1 ressource au choix.</li>
        <li>Ses cartes face cachée (${S.faceDown}) comptent comme des cartes en main.</li><li>Ville de Pat : ${S.city} cartes, dont ${S.violet} violette${S.violet > 1 ? 's' : ''}.</li></ul>
        <div class="field"><span class="lbl">Valeur de la quête en montagne</span>${stepper('points', 8)}</div>
        <div class="stack"><button class="btn red block" data-a="mountain" data-form="points">Oui : Pat la réalise ${scrollIcon('montagne')}</button>
        <button class="btn block" data-a="none">Non → quête du haut de sa pile (${S.questPile} restante${S.questPile > 1 ? 's' : ''})</button></div></section>`;
    case 'pileQuest':
      return `<section class="card instr" data-step="pileQuest"><div class="kicker">Guilde · pile Quête de Pat</div>
        <div class="big">Retourne la quête du haut de la pile de Pat (${p.remaining} restante${p.remaining > 1 ? 's' : ''}). Pat la réalise automatiquement.</div>
        <p>Elle peut être ${scrollIcon('plaine')} en plaine ou ${scrollIcon('montagne')} en montagne.</p>
        <div class="field"><span class="lbl">Valeur de la quête</span>${stepper('points', 5)}</div>
        <button class="btn huge red" data-a="ok" data-form="points">Valider</button></section>`;
    case 'patToken': {
      const none = p.available <= 0;
      return `<section class="card instr" data-step="patToken"><div class="kicker">Carte Tactiques utilisée</div>
        <div class="big">${none ? 'Plus aucun jeton Pat disponible : on n’en pose pas.' : 'Pose un jeton Pat sur une carte de la Vallée.'}</div>
        ${none ? '' : `<p>Ordre des couleurs du Complot :</p>${chipsFor(p.colors)}
        <ul class="steps"><li>Puis la valeur la plus élevée, puis la carte avec de la neige.</li><li>Puis de gauche à droite et de haut en bas.</li><li>Ignore les cartes qui ont déjà un jeton Pat.</li></ul>
        <p class="hint">Jetons Pat libres : ${p.available} / ${PAT_TOKENS}</p>${p.mist ? mistNote('patToken') : ''}`}
        <div class="stack">${none ? '<button class="btn red block" data-a="none">Continuer</button>' : '<button class="btn red block" data-a="ok">Jeton posé</button><button class="btn ghost block" data-a="none">Aucune carte possible</button>'}</div></section>`;
    }
    case 'card': {
      const why = { noWorkers: 'Pat n’a plus d’ouvriers et tu ne t’es pas encore préparé.', tactiquesEnd: 'Aucun lieu trouvé sur la carte Tactiques : Pat joue une carte à la place.', springNoCity: '' }[p.why] || (p.replaced ? 'Pat remplace son placement d’ouvrier.' : '');
      const head = p.src === 'pile'
        ? '<div class="big">Retourne la carte du dessus de la <b>pile principale</b> et place-la face visible dans la ville de Pat.</div>'
        : `<div class="big">Pat joue une carte de la <b>Vallée</b>.</div><p>Couleur prioritaire, de gauche à droite :</p>${chipsFor(p.colors)}
           <ul class="steps"><li>Plusieurs cartes de cette couleur : prends la valeur la plus élevée.</li><li>Égalité : la carte avec de la neige (déblayée gratuitement).</li><li>Encore égalité : de gauche à droite, puis de haut en bas.</li></ul>
           ${p.mist ? mistNote('card') : ''}`;
      return `<section class="card instr" data-step="card"><div class="kicker">Pat joue une carte${p.replaced ? ' · +1 neige' : ''}</div>
        ${why ? `<p class="hint">${why}${p.replaced ? ' Il gagne 1 neige.' : ''}</p>` : ''}
        ${head}
        <p>Pat la joue gratuitement et ignore son texte.</p>
        ${p.src === 'vallee' ? `<label class="check"><input type="checkbox" name="snow"> La carte avait de la neige (+1 neige pour Pat)</label>
        ${S.patTokensVallee > 0 ? '<label class="check"><input type="checkbox" name="patToken"> Elle portait un jeton Pat (il revient dans la réserve)</label>' : ''}` : ''}
        <p><b>Quelle couleur a-t-il jouée ?</b></p>
        <div class="color-grid">${Object.entries(COLORS).map(([k, c]) => `<button class="btn" style="background:${c.hex}" data-a="ok" data-color="${k}">${c.short}</button>`).join('')}</div></section>`;
    }
    case 'done': {
      const lines = S.log.filter((l) => l.turn === S.turn).map((l) => `<li>${esc(l.msg)}</li>`).join('');
      return `<section class="card instr" data-step="done"><div class="kicker">${p.prepared ? `Pat est passé à ${SEASON_ARTICLE[p.prepared]}` : 'Fin du tour de Pat'}</div>
        <ul class="steps">${lines}</ul>
        <button class="btn huge red" data-a="ok">À toi de jouer !</button></section>`;
    }
    case 'passed':
      return `<section class="card instr" data-step="passed"><div class="kicker">Printemps</div>
        <div class="big">Pat passe : tous ses ouvriers sont placés et sa ville a ${S.city} cartes.</div>
        <p>Termine ta partie. Quand tu as aussi passé, va au décompte.</p>
        <div class="stack"><button class="btn red block" data-a="humanPassed">J’ai passé aussi → fin de partie</button>
        <button class="btn ghost block" data-a="later">Je continue à jouer</button></div></section>`;
    case 'endCollect':
      return `<section class="card instr" data-step="endCollect"><div class="kicker">Fin de partie</div>
        <div class="big">Pat prend toutes les cartes de la Vallée avec un jeton Pat (${S.patTokensVallee}), face cachée, avec leur neige.</div>
        <div class="field"><span class="lbl">Cartes prises face cachée</span>${stepper('cardsTaken', S.patTokensVallee)}</div>
        <div class="field"><span class="lbl">Neige sur ces cartes</span>${stepper('snowTaken', 0)}</div>
        <button class="btn huge red" data-a="ok" data-form="prepare">Aller au décompte</button></section>`;
    case 'over':
      return `<section class="card instr" data-step="over"><div class="kicker">Partie terminée</div>
        <div class="big">Compte les points de Pat dans l’onglet Score.</div>
        <button class="btn huge red" data-goto="score">🏆 Décompte</button></section>`;
    default: return '';
  }
}

function renderTour() {
  const nx = nextSeason(S.season);
  let main;
  if (S.pending) main = renderPending();
  else if (isPlayerTurn()) main = renderPlayerTurn(nx);
  else {
    main = `<section class="card" data-step="idle">
      <p>${S.turn === 0 ? 'Pat joue le premier.' : 'Joue ton tour. Quand tu as fini, appuie sur le bouton.'}</p>
      <button class="btn huge red" id="btn-turn">🐾 Tour de Pat</button>
      ${nx && !S.humanPrepared[nx] ? `<button class="btn ghost block" style="margin-top:10px" id="btn-human-prep">Je viens de me préparer pour ${SEASON_ARTICLE[nx]}</button>` : ''}
      ${S.passed && !S.ended ? '<button class="btn block" style="margin-top:10px" data-a2="endgame">J’ai passé aussi → fin de partie</button>' : ''}
    </section>`;
  }
  return `<div class="grid-2"><div>${main}
    <div class="row"><button class="btn ghost" id="btn-undo" ${history.length ? '' : 'disabled'}>↶ Annuler</button></div></div>
    <div><section class="card"><div class="kicker">Carte Plan · ${SEASON_LABEL[S.season]}</div>${planView()}</section>
    ${miniTracker()}</div></div>`;
}

// ---------- Pat compagnon (tour du joueur) ----------
function isPlayerTurn() { return !!S && !S.pending && S.turn > 0 && !S.ended; }
function ensurePet() { if (S && !S.pet) S.pet = newPet(); return S?.pet; }
function finalScores() {
  if (!S?.ended) return null;
  return { patTotal: score(S, scoreInputs).total, humanTotal: humanFinal(S, scoreInputs.human) };
}
function currentMood() {
  const elapsedMs = petCtl.key && isPlayerTurn() ? Date.now() - petCtl.startedAt : 0;
  return computeMood(S, { elapsedMs, final: finalScores() });
}
function petFigure(mood, small = false) {
  const flakes = Array.from({ length: 7 }, (_, i) => `<i style="--x:${8 + i * 13}%;--d:${4 + (i % 3) * 1.3}s;--l:-${(i * 0.9) % 4.5}s">❄</i>`).join('');
  return `<button type="button" class="pet ${small ? 'small' : ''}" id="pet" data-mood="${mood}" aria-label="Toucher Pat pour qu’il parle">
      <span class="pet-body" role="img" aria-label="Pat Cognefoudre, le lynx Roi des Bandits"></span>
      <span class="pet-flakes" aria-hidden="true">${flakes}</span>
    </button>`;
}
function petPanel(mood) {
  const pet = ensurePet();
  const m = MOODS[mood];
  const h = S.ended ? (mood === 'triomphant' ? 100 : 10) : happiness(S);
  return `<div class="pet-stage">
      ${petFigure(mood)}
      <div class="bubble" id="pet-bubble" aria-live="polite">${esc(pet.text || '…')}</div>
    </div>
    <div class="mood" id="pet-mood" data-mood="${mood}">
      <span class="mood-emoji">${m.emoji}</span><span class="mood-label">${m.label}</span>
      <span class="moodbar" role="meter" aria-label="Humeur de Pat" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${h}"><span style="width:${h}%"></span></span>
    </div>
    <div class="row pet-actions">
      <button type="button" class="btn ghost" id="btn-talk">🗣️ Parler</button>
      <button type="button" class="btn ghost" id="btn-mute" aria-pressed="${!voiceSettings.on}">${voiceSettings.on ? '🔊 Voix' : '🔇 Muet'}</button>
    </div>`;
}
function renderPlayerTurn(nx) {
  return `<section class="card player-turn" data-step="idle" data-player="1">
      <div class="kicker">Tour du joueur · ${SEASON_LABEL[S.season]}</div>
      ${petPanel(currentMood())}
      <p class="hint center">${S.passed ? 'Pat a passé : continue tes tours jusqu’à ce que tu passes aussi.' : 'Joue ton tour. Touche Pat s’il te manque de compagnie.'}</p>
      <button class="btn huge red" id="btn-turn">J’ai fini mon tour → Tour de Pat</button>
      ${nx && !S.humanPrepared[nx] ? `<button class="btn ghost block" style="margin-top:10px" id="btn-human-prep">Je viens de me préparer pour ${SEASON_ARTICLE[nx]}</button>` : ''}
      ${S.passed && !S.ended ? '<button class="btn block" style="margin-top:10px" data-a2="endgame">J’ai passé aussi → fin de partie</button>' : ''}
    </section>`;
}

const petCtl = { key: null, startedAt: 0, timers: [], talkTimer: null };
function clearPetTimers() { petCtl.timers.forEach(clearTimeout); petCtl.timers = []; }
function later(ms, fn) { petCtl.timers.push(setTimeout(fn, ms)); }
// Appelé après chaque rendu : démarre ou arrête les répliques du tour du joueur.
function petSync() {
  if (!isPlayerTurn()) { clearPetTimers(); petCtl.key = null; stopTalking(); return; }
  const key = `${S.turn}`;
  if (petCtl.key === key) return;
  clearPetTimers();
  petCtl.key = key;
  petCtl.startedAt = Date.now();
  const pet = ensurePet();
  if (pet.greetedTurn !== S.turn) { pet.greetedTurn = S.turn; petSay(); }
  later(TIMING.chatterMin + Math.random() * (TIMING.chatterMax - TIMING.chatterMin), () => { if (Math.random() < 0.75) petSay(); });
  const nag = () => { petSay(); later(TIMING.nagEvery, nag); };
  later(TIMING.slowAfter, nag);
}
function petSay() {
  if (!S) return;
  const mood = currentMood();
  const pet = ensurePet();
  const line = pickLine(pet, mood, S);
  pet.text = line.text; pet.mood = mood;
  save(); // réplique cosmétique : pas d'entrée dans l'historique d'annulation
  const bubble = $('#pet-bubble');
  if (!bubble) return;
  bubble.textContent = line.text;
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  const m = MOODS[mood];
  const md = $('#pet-mood');
  if (md) {
    md.dataset.mood = mood;
    md.querySelector('.mood-emoji').textContent = m.emoji;
    md.querySelector('.mood-label').textContent = m.label;
  }
  const fig = $('#pet');
  if (fig) { fig.dataset.mood = mood; fig.classList.add('talking'); setAvatarMood(mood); avatarTalk(true); }
  clearTimeout(petCtl.talkTimer);
  const minMs = Math.max(1800, line.text.length * 55);
  const t0 = Date.now();
  const spoke = speak(line.text, () => {
    clearTimeout(petCtl.talkTimer);
    petCtl.talkTimer = setTimeout(stopTalking, Math.max(0, minMs - (Date.now() - t0)));
  }, line.audio);
  window.__petSpoken = (window.__petSpoken || 0) + (spoke ? 1 : 0);
  if (!spoke) { clearTimeout(petCtl.talkTimer); petCtl.talkTimer = setTimeout(stopTalking, minMs); }
}
function stopTalking() { $('#pet')?.classList.remove('talking'); avatarTalk(false); }
function syncVoiceUI() {
  $('#opt-voice').checked = !!voiceSettings.on;
  $('#opt-volume').value = String(voiceSettings.volume);
  $('#opt-volume').disabled = !voiceSettings.on;
  const v = currentVoice();
  const backup = !speechSupported() ? 'aucune' : v ? `${v.name} (${v.lang})` : 'voix par défaut de l’appareil';
  $('#voice-status').textContent = recordedCount() > 0
    ? `Voix enregistrée de Pat (${recordedCount()} répliques, fonctionne hors ligne). Secours : ${backup}.`
    : !speechSupported()
      ? 'Cet appareil ne propose pas de synthèse vocale : Pat parlera seulement dans sa bulle.'
      : v ? `Voix utilisée : ${v.name} (${v.lang}), grave et un peu lente.` : 'Aucune voix française trouvée pour l’instant : Pat parlera dans sa bulle (et avec la voix par défaut si elle existe).';
  const mb = $('#btn-mute');
  if (mb) { mb.textContent = voiceSettings.on ? '🔊 Voix' : '🔇 Muet'; mb.setAttribute('aria-pressed', String(!voiceSettings.on)); }
}
function setVoiceOn(on) { voiceSettings.on = on; if (!on) stopSpeaking(); saveVoice(); syncVoiceUI(); }

function miniTracker() {
  return `<section class="card"><div class="stats">
    <div class="stat"><div class="v">${workersLeft(S)}</div><div class="k">ouvriers à placer</div></div>
    <div class="stat"><div class="v">${S.city}</div><div class="k">cartes en ville</div></div>
    <div class="stat"><div class="v">${patTokensFree(S)}</div><div class="k">jetons Pat libres</div></div>
    <div class="stat"><div class="v">${S.fire} 🔥</div><div class="k">feu</div></div>
    <div class="stat"><div class="v">${S.snow} ❄</div><div class="k">neige</div></div>
    <div class="stat"><div class="v">${S.points}</div><div class="k">jetons Point</div></div>
  </div></section>`;
}

function statAdj(field, v, k) {
  return `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div>
    <div class="adj"><button data-adj="${field}" data-d="-1" aria-label="${k} moins un">−</button><button data-adj="${field}" data-d="1" aria-label="${k} plus un">+</button></div></div>`;
}

function renderSuivi() {
  const w = S.workers;
  const dots = Array.from({ length: w.normal }, (_, i) => `<span class="dot ${i < w.normalPlaced ? 'used' : ''}">🐾</span>`).join('')
    + `<span class="dot ranger ${w.rangerPlaced ? 'used' : ''}" title="Garde forestier">🌲</span>`;
  const tok = Array.from({ length: PAT_TOKENS }, (_, i) => {
    if (i < S.patTokensFixed) return '<span class="dot tok-f" title="Sur un lieu partagé">P</span>';
    if (i < S.patTokensFixed + S.patTokensVallee) return '<span class="dot tok-v" title="Dans la Vallée">P</span>';
    return '<span class="dot" title="Libre">P</span>';
  }).join('');
  const q = QUEST_PILE[S.level];
  const seasons = ['ete', 'automne', 'hiver', 'printemps'].map((s) => `<span class="season-badge" style="${s === S.season ? '' : 'opacity:.35'}">${SEASON_LABEL[s]}</span>`).join(' ');
  return `<div class="grid-2"><div>
    <section class="card"><div class="kicker">Saison</div><div class="row" style="gap:6px">${seasons}</div>
      <h3>Ouvriers de Pat (${w.normal} + garde forestier)</h3><div class="dots">${dots}</div>
      <p class="hint">Gains par saison : automne +1, hiver +1, printemps +2. Garde forestier toujours en dernier.</p>
      <p class="hint">Tu t’es préparé pour : ${['automne', 'hiver', 'printemps'].filter((s) => S.humanPrepared[s]).map((s) => SEASON_LABEL[s]).join(', ') || 'rien encore'}.</p>
    </section>
    <section class="card"><div class="kicker">Jetons Pat</div><div class="dots">${tok}</div>
      <p class="hint">Gris : posé sur un lieu partagé (Forge, Guilde). Rouge : dans la Vallée. Blanc : libre.</p>
      ${S.forgeToken ? '<button class="btn block" data-ev="forge">J’ai visité la Forge partagée → +1 feu à Pat</button>' : ''}
      ${S.guildToken ? '<button class="btn block" style="margin-top:8px" data-ev="guild">J’ai visité la Guilde partagée → +1 feu à Pat</button>' : ''}
      <button class="btn block" style="margin-top:8px" data-ev="token">J’ai joué une carte avec un jeton Pat → jeton rendu</button>
      <button class="btn block" style="margin-top:8px" data-ev="community">J’ai visité un lieu communautaire d’une carte de Pat → +1 jeton Point</button>
      <button class="btn block" style="margin-top:8px" data-ev="give">J’ai donné une carte à Pat / il pioche → +1 carte face cachée</button>
    </section>
    <section class="card"><div class="kicker">Carte Tactiques · flèche ${PLAN_BY_ID[S.plan.id].arrow === 'bas' ? '⬇' : '⬆'}</div>
      <ol class="tact">${TACTIQUES.map((t, i) => `<li class="${S.tactiquesPos === i ? 'on' : ''}">${tactLabel(t)}</li>`).join('')}</ol>
      <p class="hint">${S.opts.loopTactiques ? 'Rebouclage activé.' : 'Sans rebouclage : au bout de la liste, Pat joue une carte (+1 neige).'}</p></section>
  </div><div>
    <section class="card"><div class="kicker">Ressources de Pat</div><div class="stats">
      ${statAdj('city', S.city, 'cartes en ville')}
      ${statAdj('violet', S.violet, 'dont violettes')}
      ${statAdj('faceDown', S.faceDown, 'cartes face cachée')}
      ${statAdj('fire', S.fire, 'feu 🔥')}
      ${statAdj('snow', S.snow, 'neige ❄')}
      ${statAdj('points', S.points, 'jetons Point')}
      ${statAdj('voyagePoints', S.voyagePoints, 'points de Voyage')}
      ${statAdj('patTokensVallee', S.patTokensVallee, 'jetons Pat en Vallée')}
    </div>
    <h3>Quêtes</h3>
    <p>${S.quests.count} réalisée${S.quests.count > 1 ? 's' : ''} · ${S.quests.points} points</p>
    <p>Pile de Pat : ${S.questPile} / ${q.plaine + q.montagne} restantes (au départ ${q.plaine}${scrollIcon('plaine')} + ${q.montagne}${scrollIcon('montagne')})</p>
    </section>
    <section class="card"><div class="kicker">Journal</div><div class="log">${S.log.slice().reverse().map((l) => `<div>T${l.turn} · ${SEASON_LABEL[l.season]} — ${esc(l.msg)}</div>`).join('')}</div></section>
  </div></div>`;
}

function renderScore() {
  const sc = score(S, scoreInputs);
  const b = LEVEL_BONUS[S.level];
  const hf = humanFinal(S, scoreInputs.human);
  const w = winner(sc.total, hf);
  return `<div class="grid-2"><section class="card" data-step="score"><div class="kicker">Décompte de Pat · niveau ${S.level}</div>
    <div class="field"><span class="lbl">Valeur imprimée des cartes de sa ville (${S.city} cartes)</span>${stepper('cardPoints', scoreInputs.cardPoints, 0, 300)}</div>
    <div class="field"><span class="lbl">Quêtes réalisées ${scrollIcon('plaine')}${scrollIcon('montagne')} (${S.quests.count})</span>${stepper('questPoints', scoreInputs.questPoints ?? S.quests.points, 0, 200)}</div>
    <label class="check"><input type="checkbox" name="mostSnow" ${scoreInputs.mostSnow ? 'checked' : ''}> Pat a le plus de neige (+5)</label>
    <table class="score">
      <tr><td>Cartes en ville</td><td class="n">${sc.cartes}</td></tr>
      <tr><td>Quêtes</td><td class="n">${sc.quetes}</td></tr>
      <tr><td>Jetons Point</td><td class="n">${sc.jetons}</td></tr>
      <tr><td>Voyages${S.level === 1 ? ' (toujours 2 au niveau 1)' : ''}</td><td class="n">${sc.voyages}</td></tr>
      <tr><td>Averses de neige : ${S.snow} neige${scoreInputs.mostSnow ? ' + 5' : ''}</td><td class="n">${sc.neige}</td></tr>
      <tr><td>Bonus ${S.violet} violette${S.violet > 1 ? 's' : ''} × ${b.violet}</td><td class="n">${sc.bonusViolet}</td></tr>
      <tr><td>Bonus ${S.fire} feu × ${b.feu}</td><td class="n">${sc.bonusFeu}</td></tr>
      <tr><td>Bonus ${S.faceDown} carte${S.faceDown > 1 ? 's' : ''} face cachée × ${b.cachee}</td><td class="n">${sc.bonusCachees}</td></tr>
      <tr class="total"><td><b>Total de Pat</b></td><td class="n" id="pat-total">${sc.total}</td></tr>
    </table>
    <p class="hint">Pat ignore le texte des cartes, donc aussi les bonus imprimés sur les violettes.</p>
  </section>
  <section class="card"><div class="kicker">Ton score</div>
    <div class="field"><span class="lbl">Ton total</span>${stepper('human', scoreInputs.human, 0, 400)}</div>
    ${scoreCampaignRows(S, scoreInputs.human, hf)}
    <div class="verdict ${w === 'pat' ? 'pat' : 'you'}" id="verdict">${w === 'pat'
      ? `Pat l’emporte (${sc.total} contre ${hf})${sc.total === hf ? ' : en cas d’égalité, Pat gagne' : ''}. Le Roi des Bandits règne sur Silverfrost !`
      : `Victoire ! ${hf} contre ${sc.total}. Pat part en exil.`}</div>
    ${S.ended ? `<div class="pet-final">${petPanel(currentMood())}</div>` : ''}
    <button class="btn ghost block" style="margin-top:12px" id="btn-new2">Nouvelle partie</button>
  </section></div>`;
}

function renderRegles() {
  return `<section class="card rules"><div class="kicker">Aide-mémoire</div><h2>Comment joue Pat</h2>
  <h3>À chaque tour</h3><ul>
    <li>Une seule action : placer un ouvrier, jouer une carte, ou se préparer pour la saison.</li>
    <li>L’app révèle un Complot et le pose sur le prochain coin du Plan : la caverne d’abord, puis dans le sens horaire. 🐾 = ouvrier, 🃏 = carte.</li>
    <li>On lit le quart du Complot qui recouvre ce coin <span class="flag">interprétation</span>.</li></ul>
  <h3>Ouvriers</h3><ul>
    <li>Ouvriers normaux d’abord, garde forestier en dernier. Le garde forestier gagne 1 feu, sauf s’il partage un lieu avec ton ouvrier.</li>
    <li>Pat ne gagne ni ne paie de ressources. Il déblaie la neige gratuitement et la garde.</li>
    <li>Forge : lieu exclusif, +1 feu. Guilde : lieu exclusif, puis une Quête en montagne ${scrollIcon('montagne')} si possible, sinon la quête du haut de sa pile. Balise : il défausse la Grosse Créature et gagne ses points. Voyage : au printemps seulement (au niveau 1, toujours le lieu partagé à 2).</li>
    <li>Lieu indisponible : suis la carte Tactiques dans le sens de la flèche du Plan, puis pose un jeton Pat dans la Vallée.</li>
    <li>Plus d’ouvriers alors que tu ne t’es pas préparé : il joue la carte de ce coin et gagne 1 neige.</li></ul>
  <h3>Cartes</h3><ul>
    <li>PILE : la carte du dessus de la pile principale, face visible dans sa ville.</li>
    <li>VALLÉE : la couleur du Complot de gauche à droite, puis la valeur la plus haute, puis la neige, puis de gauche à droite et de haut en bas.</li>
    <li>Toujours gratuit, texte ignoré. Un jeton Pat sur la carte revient simplement dans la réserve.</li></ul>
  <h3>Saisons</h3><ul>
    <li>Été → automne (+1 ouvrier) → hiver (+1) → printemps (+2). Il se prépare quand tous ses ouvriers sont posés <b>et</b> que tu t’es préparé.</li>
    <li>En se préparant, il prend face cachée les cartes de la Vallée qui portent un jeton Pat. Tu ajoutes la neige des Tempêtes (pas dans sa ville). Il pose un jeton Pat sur la Forge partagée (automne) et sur la Guilde partagée (hiver) : tu lui donnes ton feu quand tu y vas.</li>
    <li>Printemps : il passe quand tous ses ouvriers sont posés et que sa ville a au moins 15 cartes. À 17 cartes, il ignore les cases 🃏.</li></ul>
  <h3>Score</h3><ul>
    <li>Cartes, quêtes ${scrollIcon('plaine')}${scrollIcon('montagne')}, jetons Point, Voyages, 1 par neige (+5 s’il en a le plus), et les bonus du niveau. En cas d’égalité, Pat gagne.</li></ul>
  <h3>Choix de l’app <span class="flag">à confirmer</span></h3><ul>
    <li>Niveau 4 : pile de 3 ${scrollIcon('plaine')} + 1 ${scrollIcon('montagne')}, comme sur la carte Aide.</li>
    <li>Tactiques : pas de rebouclage par défaut (option dans les réglages). Au bout de la liste, Pat joue la carte du coin (+1 neige).</li>
    <li>« Balise ? » de la carte Tactiques : on prend la valeur de balise du Complot en cours.</li>
    <li>Guilde sans quête possible (pile vide, aucune ${scrollIcon('montagne')}) : l’ouvrier se déplace avec la carte Tactiques.</li>
    <li>Printemps, tous les ouvriers posés et moins de 15 cartes : les cases 🐾 deviennent des cartes (+1 neige).</li>
    <li>Ouvriers de départ en été : réglable (2 par défaut, la p.6 n’a pas été numérisée).</li>
    <li>Fureur de l’hiver déclenchée par Pat : non traitée par les règles, à toi de décider.</li></ul>
  </section>
  ${rulesSection()}`;
}

// ---------- événements ----------
function bind() {
  document.querySelectorAll('[data-stepper]').forEach((st) => {
    const input = st.querySelector('input');
    st.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const v = Math.min(Number(st.dataset.max), Math.max(Number(st.dataset.min), (Number(input.value) || 0) + Number(b.dataset.d)));
      input.value = v;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }));
  });
  bindCampaign(campCtx);
  if (!S) {
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { setupDraft.level = Number(b.dataset.level); readSetup(); render(); }));
    $('[name="loop"]')?.addEventListener('change', readSetup);
    $('[name="startWorkers"]')?.addEventListener('change', readSetup);
    $('#btn-start')?.addEventListener('click', () => {
      readSetup();
      S = newGame({ level: setupDraft.level, loopTactiques: setupDraft.loop, startWorkers: setupDraft.startWorkers });
      history = [];
      scoreInputs = { cardPoints: 0, mostSnow: false, human: 0, questPoints: null };
      showChecklist = true; tab = 'tour'; save(); render();
    });
    return;
  }
  $('#btn-ready')?.addEventListener('click', () => { showChecklist = false; render(); window.scrollTo(0, 0); });
  $('#btn-turn')?.addEventListener('click', () => act((s) => startTurn(s)));
  $('#pet')?.addEventListener('click', petSay);
  $('#btn-talk')?.addEventListener('click', petSay);
  $('#btn-mute')?.addEventListener('click', () => setVoiceOn(!voiceSettings.on));
  $('#btn-undo')?.addEventListener('click', undo);
  $('#btn-human-prep')?.addEventListener('click', () => act((s) => setHumanPrepared(s, nextSeason(s.season))));
  $('#btn-new2')?.addEventListener('click', confirmNew);
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.goto; render(); }));
  document.querySelectorAll('[data-a2="endgame"]').forEach((b) => b.addEventListener('click', () => act((s) => { s.pending = { kind: 'passed' }; answer(s, 'humanPassed'); })));
  document.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.a;
    const kind = S.pending?.kind;
    let data = {};
    if (b.dataset.form === 'prepare') data = { cardsTaken: val('cardsTaken'), snowTaken: val('snowTaken') };
    if (b.dataset.form === 'points') data = { points: val('points') };
    if (b.dataset.form === 'place') data = { snow: checked('snow') };
    if (kind === 'card') data = { color: b.dataset.color, snow: checked('snow'), patToken: checked('patToken') };
    act((s) => answer(s, a, data));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  document.querySelectorAll('[data-adj]').forEach((b) => b.addEventListener('click', () => act((s) => adjust(s, b.dataset.adj, Number(b.dataset.d)))));
  document.querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', () => {
    const ev = b.dataset.ev;
    act((s) => {
      if (ev === 'forge' || ev === 'guild') adjust(s, 'fire', 1);
      if (ev === 'community') adjust(s, 'points', 1);
      if (ev === 'token') adjust(s, 'patTokensVallee', -1);
      if (ev === 'give') adjust(s, 'faceDown', 1);
    });
    toast('Noté pour Pat');
  }));
  if (tab === 'score') {
    const upd = () => {
      scoreInputs = { cardPoints: val('cardPoints'), questPoints: val('questPoints'), human: val('human'), mostSnow: checked('mostSnow') };
      save(); render();
    };
    document.querySelectorAll('[data-step="score"] input, .card input[name="human"]').forEach((i) => i.addEventListener('change', upd));
  }
}
function readSetup() {
  setupDraft.loop = checked('loop');
  setupDraft.startWorkers = Math.max(1, val('startWorkers') || 2);
}
const campCtx = {
  S: () => S,
  act,
  render,
  toast,
  finalScores,
  startGame(gc) {
    S = newGame(gameOptions(camp.c, { loopTactiques: setupDraft.loop, startWorkers: setupDraft.startWorkers }));
    S.campaign = gc;
    history = [];
    scoreInputs = { cardPoints: 0, mostSnow: false, human: 0, questPoints: null };
    showChecklist = true; tab = 'tour'; save(); render();
  },
  endGame() { clearGame(); render(); },
};
function clearGame() {
  S = null; history = []; showChecklist = false; tab = 'tour';
  localStorage.removeItem(KEY); localStorage.removeItem(HKEY); localStorage.removeItem(SKEY);
}
function confirmNew() {
  if (S && !confirm('Commencer une nouvelle partie ? La partie en cours sera effacée de cet appareil.')) return;
  camp.view = null;
  S = null; history = []; showChecklist = false; tab = 'tour';
  localStorage.removeItem(KEY); localStorage.removeItem(HKEY); localStorage.removeItem(SKEY);
  $('#settings').close?.();
  render();
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});
initFullscreen($('#btn-fullscreen'));
$('#btn-settings').addEventListener('click', () => { $('#app-version').textContent = `Version ${VERSION}`; syncVoiceUI(); $('#settings').showModal(); });
$('#opt-voice').addEventListener('change', (e) => setVoiceOn(e.target.checked));
$('#opt-volume').addEventListener('input', (e) => { voiceSettings.volume = Number(e.target.value); saveVoice(); });
$('#btn-voice-test').addEventListener('click', () => {
  if (!voiceSettings.on) setVoiceOn(true);
  speak(TEST_LINE, () => {}, 'test');
});
unlockOnFirstGesture();
if (speechSupported()) window.speechSynthesis.addEventListener?.('voiceschanged', () => { if ($('#settings').open) syncVoiceUI(); });
$('#opt-loop').addEventListener('change', (e) => { if (S) act((s) => { s.opts.loopTactiques = e.target.checked; }); });
$('#btn-new').addEventListener('click', confirmNew);

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((r) => { window.__swRegistered = !!r; }).catch((e) => console.warn('SW', e));
  });
}
// Accès pour les tests automatisés
window.__pat = { get state() { return S; } };
