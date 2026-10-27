// Écrans de la campagne « L'année du Lapin » : carnet, introduction d'année, bandeau en jeu,
// rappels de saison, fin d'année et épilogue. Le moteur de Pat reste celui de logic.js.
import {
  YEARS, ALLIES, CRITTERS, PROLOGUE, INTERLUDE, EPILOGUE, INTERPRETATIONS, CREDITS, PENALTY_REFUGEE,
  newCampaign, chooseAlly, startYear, activateCritter, guildGoalDone, refugeeJoinsPat, humanPenalty,
  nextReminder, dismissReminder, recordResult, yearStatus, needsAlly, setLevel,
} from './campagne.js';

export const CKEY = 'pat-cognefoudre:campagne';
export const camp = {
  c: loadC(),
  view: null, // null | 'carnet' | 'intro' | 'fin' | 'epilogue'
  draft: { critter: null },
  result: null,
  bannerOpen: false,
};

function loadC() { try { return JSON.parse(localStorage.getItem(CKEY)); } catch { return null; } }
export function saveCampaign() {
  try { if (camp.c) localStorage.setItem(CKEY, JSON.stringify(camp.c)); else localStorage.removeItem(CKEY); } catch (e) { console.warn('Sauvegarde campagne impossible', e); }
}

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const crit = (k) => `${CRITTERS[k].emoji} ${CRITTERS[k].name}`;
const critChip = (k, extra = '') => `<span class="camp-chip ${extra}" title="${esc(CRITTERS[k].who)}">${crit(k)}</span>`;
const paras = (arr) => arr.map((p) => `<p>${p}</p>`).join('');
const list = (arr) => `<ul class="steps">${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
const credits = () => `<p class="hint camp-credits">Campagne solo <b>non officielle</b> « ${CREDITS.title} » de ${CREDITS.author}, traduite et adaptée pour cette app (fan-made, sans lien avec l’éditeur). <a href="${CREDITS.url}" target="_blank" rel="noopener">Fichier original sur BoardGameGeek</a>. ${CREDITS.game}.</p>`;

// ---------- écran d'accueil ----------
export function setupEntryCard() {
  const c = camp.c;
  const sub = !c ? 'Quatre années, une Grosse Créature à tes côtés, et Pat Cognefoudre aux portes.'
    : c.finished ? 'Campagne gagnée ! Relis l’épilogue ou recommence.'
      : `En cours : Année ${c.year} — ${YEARS[c.year - 1].title}.`;
  return `<section class="card camp-entry">
    <div class="kicker">Campagne solo</div>
    <h2>🐇 L’année du Lapin</h2>
    <p>${sub}</p>
    <button class="btn huge" id="btn-camp" data-camp="carnet">${c ? '📖 Carnet de campagne' : 'Découvrir la campagne'}</button>
    <p class="hint">Campagne non officielle d’Otto Gregor (Ottto).</p>
  </section>`;
}

// ---------- écrans hors partie ----------
export function renderCampaignScreen() {
  if (camp.view === 'intro' && camp.c) return renderIntro();
  if (camp.view === 'fin' && camp.result) return renderFin();
  if (camp.view === 'epilogue') return renderEpilogue();
  return renderCarnet();
}

function levelButtons(level) {
  return `<div class="row camp-levels">${[1, 2, 3, 4].map((n) => `<button class="btn ${n === level ? 'red' : 'ghost'}" data-camp-level="${n}" aria-pressed="${n === level}">Niveau ${n}</button>`).join('')}</div>`;
}

function renderCarnet() {
  const c = camp.c;
  if (!c) {
    return `<section class="card camp" data-camp-view="carnet">
      <div class="kicker">Campagne solo non officielle</div>
      <h2>🐇 L’année du Lapin</h2>
      <p class="camp-quote">${PROLOGUE.quote}</p>
      <p>${PROLOGUE.intro}</p>
      <h3>Règles générales</h3>${list(PROLOGUE.rules)}
      <h3>Niveau de Pat</h3>${levelButtons(camp.draftLevel || 4)}
      <p class="hint">Modifiable entre deux années.</p>
      <button class="btn huge red" data-camp="create">Commencer la campagne</button>
      <button class="btn ghost block" style="margin-top:10px" data-camp="home">↩ Retour</button>
      ${credits()}
    </section>`;
  }
  const years = YEARS.map((y) => {
    const st = c.finished ? 'gagnee' : yearStatus(c, y.n);
    const tries = c.games.filter((g) => g.year === y.n).length;
    const badge = { gagnee: '✅ gagnée', 'en-cours': '▶ en cours', 'a-venir': '🔒 à venir' }[st];
    return `<li class="camp-year ${st}"><b>Année ${y.n}</b> — ${y.title} <span class="hint">${badge}${tries ? ` · ${tries} partie${tries > 1 ? 's' : ''}` : ''}</span></li>`;
  }).join('');
  const hist = c.games.length ? `<table class="score camp-hist"><tr><th>An</th><th>Créature</th><th>Niv.</th><th>Toi</th><th>Pat</th><th></th></tr>${c.games.map((g) => `<tr><td>${g.year}</td><td>${crit(g.critter)}${g.used ? ' ⤵' : ''}</td><td>${g.level}</td><td class="n">${g.human}</td><td class="n">${g.pat}</td><td>${g.win ? '✅' : '❌'}</td></tr>`).join('')}</table><p class="hint">⤵ = créature activée pendant la partie.</p>` : '<p class="hint">Aucune partie jouée pour l’instant.</p>';
  return `<div class="grid-2"><div>
    <section class="card camp" data-camp-view="carnet">
      <div class="kicker">Carnet de campagne</div>
      <h2>🐇 L’année du Lapin</h2>
      <ol class="camp-years">${years}</ol>
      ${c.finished
    ? '<p class="camp-win">🏆 Campagne remportée : le royaume est sauvé !</p><button class="btn huge red" data-camp="epilogue">Lire l’épilogue</button>'
    : `<button class="btn huge red" data-camp="intro">Jouer l’Année ${c.year}</button>`}
      <button class="btn ghost block" style="margin-top:10px" data-camp="home">↩ Accueil</button>
    </section>
    <section class="card camp"><div class="kicker">Ton équipe</div>
      <div class="chips">${c.roster.map((k) => critChip(k)).join('') || '<span class="hint">vide</span>'}</div>
      ${c.discard.length ? `<p class="hint">Défausse (déjà utilisées) : ${c.discard.map(crit).join(', ')}</p>` : ''}
      ${c.ally ? `<p>Allié : <b>${ALLIES[c.ally].emoji} ${ALLIES[c.ally].label}</b>${c.removed.length ? ` <span class="hint">(${c.removed.map(crit).join(', ')} retiré de la campagne)</span>` : ''}</p>` : '<p class="hint">Allié : choisi à l’Année 2.</p>'}
      <h3>Niveau de Pat</h3>${levelButtons(c.level)}
    </section>
  </div><div>
    <section class="card camp"><div class="kicker">Historique</div>${hist}</section>
    <section class="card camp"><details><summary><b>Règles générales de la campagne</b></summary>${list(PROLOGUE.rules)}</details>
      ${credits()}
      <button class="btn danger block" data-camp="reset">Recommencer la campagne…</button></section>
  </div></div>`;
}

function renderIntro() {
  const c = camp.c;
  const y = YEARS[c.year - 1];
  const allyLocked = c.games.some((g) => g.year >= 2);
  const allyBlock = y.ally ? `<section class="card camp"><div class="kicker">Choisis ton allié</div>
      <div class="camp-allies">${Object.entries(ALLIES).map(([k, a]) => `<button class="level" data-camp-ally="${k}" aria-pressed="${c.ally === k}" ${allyLocked && c.ally !== k ? 'disabled' : ''}><b>${a.emoji} ${a.label}</b><small>Ajoute ${crit(a.critter)} à ton équipe</small></button>`).join('')}</div>
      ${c.ally ? `<div class="camp-story">${paras(ALLIES[c.ally].story)}</div>` : '<p class="hint">Lis seulement le paragraphe de ton allié. Retiens ton choix : il compte pour toute la campagne.</p>'}
    </section>` : '';
  const can = !needsAlly(c) && camp.draft.critter && c.roster.includes(camp.draft.critter);
  return `<div class="grid-2"><div>
    <section class="card camp" data-camp-view="intro">
      <div class="kicker">Année ${y.n} · niveau ${c.level}</div>
      <h2>${y.title}</h2>
      <details class="camp-story" open><summary>Le récit de Lepus</summary>${paras(y.story)}</details>
    </section>
    ${allyBlock}
    <section class="card camp"><div class="kicker">Mise en place de l’année</div>${list(y.setup)}
      <p class="hint">Ensuite, l’app te donnera la mise en place habituelle de Pat.</p></section>
  </div><div>
    <section class="card camp"><div class="kicker">Nouvelles règles</div>${list(y.rules)}
      ${y.patRules ? `<h3>Pour Pat</h3>${list(y.patRules)}` : ''}
      ${y.scoring.length ? `<h3>Décompte</h3>${list(y.scoring)}` : ''}</section>
    <section class="card camp"><div class="kicker">Ta Grosse Créature</div>
      ${needsAlly(c) ? '<p class="hint">Choisis d’abord ton allié.</p>' : ''}
      <div class="camp-allies">${c.roster.map((k) => `<button class="level" data-camp-critter="${k}" aria-pressed="${camp.draft.critter === k}"><b>${crit(k)}</b><small>${esc(CRITTERS[k].who)}</small></button>`).join('')}</div>
      <p class="hint">Nouvelle action : « activer ta Grosse Créature ». Elle prend ton tour, ne rapporte aucun jeton Point, puis se retourne face cachée.</p>
      <button class="btn huge red" id="btn-camp-start" data-camp="start" ${can ? '' : 'disabled'}>Commencer l’Année ${y.n}</button>
      <button class="btn ghost block" style="margin-top:10px" data-camp="carnet">↩ Carnet</button>
    </section>
  </div></div>`;
}

function renderFin() {
  const r = camp.result;
  const c = camp.c;
  const y = YEARS[r.year - 1];
  const head = r.win
    ? `<div class="verdict you" id="camp-verdict">🎉 Année ${r.year} gagnée ! ${r.human} contre ${r.pat}.</div>`
    : `<div class="verdict pat" id="camp-verdict">Pat l’emporte (${r.pat} contre ${r.human})${r.pat === r.human ? ' : égalité = défaite' : ''}. Rejoue l’Année ${r.year}.</div>`;
  const roster = r.win
    ? (r.critterOut ? `<p>${crit(r.critter)} a été utilisé : il quitte ton équipe (défausse des Grosses Créatures). Tu le recroiseras peut-être dans les montagnes.</p>` : `<p>${crit(r.critter)} est resté face visible : il reste dans ton équipe.</p>`)
    : `<p>${crit(r.critter)} reste dans ton équipe. Tu peux changer de niveau avant de rejouer.</p>`;
  const next = c.finished
    ? '<button class="btn huge red" data-camp="epilogue">📜 Lire l’épilogue</button>'
    : r.win ? `<button class="btn huge red" data-camp="intro">Continuer : Année ${c.year} — ${YEARS[c.year - 1].title}</button>`
      : `<button class="btn huge red" data-camp="intro">↻ Rejouer l’Année ${r.year}</button>`;
  return `<section class="card camp" data-camp-view="fin">
    <div class="kicker">Fin de l’Année ${r.year} — ${y.title}</div>
    ${head}
    ${r.refugeesLost ? `<p class="hint">Dont −${r.refugeesLost * PENALTY_REFUGEE} PV pour ${r.refugeesLost} réfugié${r.refugeesLost > 1 ? 's' : ''} passé${r.refugeesLost > 1 ? 's' : ''} aux bandits.</p>` : ''}
    ${roster}
    <div class="chips">${c.roster.map((k) => critChip(k)).join('')}</div>
    ${r.win ? '' : `<h3>Niveau de Pat</h3>${levelButtons(c.level)}`}
    ${next}
    <button class="btn ghost block" style="margin-top:10px" data-camp="carnet">📖 Carnet de campagne</button>
  </section>`;
}

function renderEpilogue() {
  return `<section class="card camp" data-camp-view="epilogue">
    <div class="kicker">Épilogue</div>
    <h2>Ce royaume est le nôtre</h2>
    <div class="camp-story">${paras(EPILOGUE)}</div>
    <h3>Crédits</h3>
    <ul class="steps"><li>Campagne solo non officielle « The Year of the Rabbit » : écrite et conçue par ${CREDITS.author}. <a href="${CREDITS.url}" target="_blank" rel="noopener">BoardGameGeek</a></li>
    <li>${CREDITS.game}.</li><li>Traduction française et adaptation pour l’app Pat Cognefoudre.</li></ul>
    <button class="btn huge red" data-camp="carnet">📖 Carnet de campagne</button>
  </section>`;
}

// ---------- en partie ----------
export function campaignBanner(S, withReminder) {
  const gc = S?.campaign;
  if (!gc) return '';
  const y = YEARS[gc.year - 1];
  const rem = withReminder ? nextReminder(S) : null;
  const remHtml = rem ? `<section class="card camp-reminder" data-reminder="${rem.key}">
      <div class="kicker">⏰ Rappel de campagne · Année ${rem.year}</div>
      <div class="big">${rem.title}</div>${list(rem.items)}
      ${rem.interlude ? `<details class="camp-story" open><summary><b>${INTERLUDE.title}</b></summary>${paras(INTERLUDE.story)}<p><b>${INTERLUDE.rule}</b></p></details>` : ''}
      <div class="stack">${rem.year === 2 ? refugeeBtn(gc) : ''}<button class="btn red block" data-camp="dismiss" data-key="${rem.key}">C’est fait</button></div>
    </section>` : '';
  const state = gc.faceUp ? 'face visible' : 'face cachée (utilisée)';
  return `${remHtml}<section class="card camp-banner">
    <details id="camp-rules" ${camp.bannerOpen ? 'open' : ''}><summary><span class="kicker">🐇 Campagne · Année ${gc.year}</span> <b>${y.title}</b> <span class="hint">· règles</span></summary>
      ${list(y.rules)}
      ${y.patRules ? `<h3>Pour Pat (brume)</h3>${list(y.patRules)}` : ''}
      ${y.scoring.length ? `<h3>Décompte</h3>${list(y.scoring)}` : ''}
      ${gc.year === 4 ? `<details class="camp-story"><summary><b>📜 ${INTERLUDE.title}</b></summary>${paras(INTERLUDE.story)}<p><b>${INTERLUDE.rule}</b></p></details>` : ''}
    </details>
    <p class="camp-critter">${crit(gc.critter)} · <span class="${gc.faceUp ? '' : 'hint'}">${state}</span>${gc.year === 2 && gc.refugeesLost ? ` · <b>${gc.refugeesLost}</b> réfugié${gc.refugeesLost > 1 ? 's' : ''} chez les bandits (−${gc.refugeesLost * PENALTY_REFUGEE} PV)` : ''}</p>
    <div class="stack">
      ${!S.ended ? `<button class="btn block" id="btn-critter" data-camp="activate" ${gc.faceUp ? '' : 'disabled'}>J’active ma créature</button>` : ''}
      ${gc.year === 1 && !gc.faceUp && !S.ended ? '<button class="btn ghost block" data-camp="guildGoal">J’ai réalisé une quête de la Guilde → créature face visible</button>' : ''}
      ${gc.year === 2 && !rem ? refugeeBtn(gc) : ''}
    </div>
  </section>`;
}
function refugeeBtn() { return '<button class="btn block camp-refugee" data-camp="refugee">+1 ouvrier pour Pat (réfugié)</button>'; }

export function scoreCampaignRows(S, humanRaw, humanTotal) {
  const gc = S?.campaign;
  if (!gc) return '';
  const pen = humanPenalty(S);
  return `<table class="score camp-score">
      ${gc.year === 2 ? `<tr><td>Ton total saisi</td><td class="n">${Number(humanRaw) || 0}</td></tr>
      <tr><td>Réfugiés passés aux bandits : ${gc.refugeesLost} × −${PENALTY_REFUGEE}</td><td class="n" id="camp-penalty">−${pen}</td></tr>
      <tr class="total"><td><b>Ton total final</b></td><td class="n" id="human-final">${humanTotal}</td></tr>` : ''}
    </table>
    ${gc.year === 4 ? '<p class="hint">Année 4 : n’inclus pas les cartes avec un bandit ou de la neige (elles ne comptent pas).</p>' : ''}
    <p class="hint">Campagne : égalité = défaite.</p>
    ${S.ended ? `<button class="btn huge red" id="btn-camp-finish" data-camp="finish">Terminer l’Année ${gc.year}</button>` : '<p class="hint">Le bouton « Terminer l’année » apparaît à la fin de la partie.</p>'}`;
}

export function mistNote(kind) {
  const r = YEARS[2].patRules;
  const txt = { card: r[0], balise: r[1], guildQuest: r[2], patToken: `${INTERPRETATIONS[6]} <span class="flag">interprétation</span>` }[kind];
  return txt ? `<p class="camp-mist">🌫️ <b>Brume (Année 3)</b> : ${txt}</p>` : '';
}

export function rulesSection() {
  return `<section class="card rules camp"><div class="kicker">Campagne « L’année du Lapin »</div>
    <h3>Ce que fait l’app</h3><ul>
      <li>Carnet : année en cours, équipe de Grosses Créatures, allié, niveau de Pat et historique des parties, sur cet appareil.</li>
      <li>Avant chaque année : récit, mise en place, nouvelles règles, choix de la créature (et de l’allié à l’Année 2).</li>
      <li>En partie : bandeau des règles, bouton « J’active ma créature », et à l’Année 2 « +1 ouvrier pour Pat (réfugié) » (−5 PV pour toi).</li>
      <li>Rappels après chacune de tes préparations : réfugiés (Année 2), bandits et interlude (Année 4).</li>
      <li>Année 3 : les consignes de Pat pour la Vallée, la Balise et la Guilde suivent les règles de la brume.</li></ul>
    <h3>Interprétations <span class="flag">à confirmer</span></h3><ul>${INTERPRETATIONS.map((t) => `<li>${t}</li>`).join('')}</ul>
    ${credits()}
  </section>`;
}

// ---------- événements ----------
// ctx : { S(), act(fn), render(), startGame(gc), endGame(), finalScores(), toast(msg) }
export function bindCampaign(ctx) {
  const q = (sel) => document.querySelectorAll(sel);
  q('[data-camp-level]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.campLevel);
    if (camp.c) { setLevel(camp.c, n); saveCampaign(); } else camp.draftLevel = n;
    ctx.render();
  }));
  q('[data-camp-ally]').forEach((b) => b.addEventListener('click', () => {
    chooseAlly(camp.c, b.dataset.campAlly); saveCampaign(); ctx.render();
  }));
  q('[data-camp-critter]').forEach((b) => b.addEventListener('click', () => { camp.draft.critter = b.dataset.campCritter; ctx.render(); }));
  document.getElementById('camp-rules')?.addEventListener('toggle', (e) => { camp.bannerOpen = e.target.open; });
  q('[data-camp]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.camp;
    const c = camp.c;
    switch (a) {
      case 'home': camp.view = null; break;
      case 'carnet': camp.view = 'carnet'; break;
      case 'epilogue': camp.view = 'epilogue'; break;
      case 'create': camp.c = newCampaign({ level: camp.draftLevel || 4 }); saveCampaign(); camp.view = 'intro'; camp.draft.critter = null; break;
      case 'reset':
        if (!confirm('Recommencer la campagne ? Le carnet (équipe, allié, historique) sera effacé de cet appareil.')) return;
        camp.c = null; saveCampaign(); camp.view = 'carnet'; break;
      case 'intro': camp.view = 'intro'; if (!c.roster.includes(camp.draft.critter)) camp.draft.critter = null; break;
      case 'start': {
        const gc = startYear(c, camp.draft.critter);
        camp.view = null; camp.draft.critter = null;
        ctx.startGame(gc);
        window.scrollTo(0, 0);
        return;
      }
      case 'activate': ctx.act((s) => activateCritter(s.campaign)); ctx.toast('Créature activée : c’est ton tour'); return;
      case 'guildGoal': ctx.act((s) => guildGoalDone(s.campaign)); ctx.toast('Ta créature est de nouveau face visible'); return;
      case 'refugee': ctx.act((s) => refugeeJoinsPat(s)); ctx.toast('Un réfugié rejoint les bandits : +1 ouvrier pour Pat'); return;
      case 'dismiss': ctx.act((s) => dismissReminder(s, b.dataset.key)); return;
      case 'finish': {
        const S = ctx.S();
        if (!c || c.finished || c.year !== S.campaign.year) { ctx.toast('Cette partie ne correspond plus au carnet de campagne'); return; }
        const f = ctx.finalScores();
        if (!f.humanTotal && !confirm('Ton score est à 0. Terminer l’année quand même ?')) return;
        const r = recordResult(c, S.campaign, { pat: f.patTotal, human: f.humanTotal });
        camp.result = { ...r, pat: f.patTotal, human: f.humanTotal, critter: S.campaign.critter, refugeesLost: S.campaign.refugeesLost };
        saveCampaign();
        camp.view = 'fin';
        ctx.endGame();
        window.scrollTo(0, 0);
        return;
      }
      default: return;
    }
    ctx.render();
    window.scrollTo(0, 0);
  }));
}
