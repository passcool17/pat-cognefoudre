import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newCampaign, chooseAlly, startYear, activateCritter, guildGoalDone, refugeeJoinsPat, humanPenalty, humanFinal,
  refugeesToFeed, nextReminder, dismissReminder, recordResult, gameOptions, yearStatus, needsAlly, setLevel,
  YEARS, ALLIES, CRITTERS, PRECISIONS, DECISIONS, CREDITS, banditPlaceNote,
} from '../campagne.js';
import { newGame, startTurn, answer, workersLeft, setHumanPrepared } from '../logic.js';
import { makeRng, playGame, respond } from './sim.js';

test('données : 4 années complètes, alliés et créatures connus', () => {
  assert.equal(YEARS.length, 4);
  YEARS.forEach((y, i) => {
    assert.equal(y.n, i + 1);
    assert.ok(y.title && y.story.length && y.setup.length && y.rules.length, `année ${y.n}`);
  });
  assert.equal(YEARS[2].patRules.length, 3);
  for (const a of Object.values(ALLIES)) { assert.ok(CRITTERS[a.critter]); assert.ok(CRITTERS[a.other]); }
  assert.ok(PRECISIONS.length >= 8);
  assert.equal(DECISIONS.length, 1);
  assert.match(DECISIONS[0], /brume/);
  assert.match(DECISIONS[0], /décision de Pascal/);
  assert.ok(PRECISIONS.some((t) => /exactly like snow/.test(t)));
  for (const t of [...PRECISIONS, ...DECISIONS]) assert.ok(!/à confirmer/.test(t), t);
  assert.match(CREDITS.author, /Otto Gregor/);
  assert.match(CREDITS.url, /^https:\/\/boardgamegeek\.com\//);
});

test('nouvelle campagne : année 1, équipe de départ', () => {
  const c = newCampaign({ level: 3 });
  assert.equal(c.year, 1);
  assert.deepEqual(c.roster, ['bravehorn', 'whisper', 'truffle']);
  assert.equal(c.level, 3);
  assert.equal(yearStatus(c, 1), 'en-cours');
  assert.equal(yearStatus(c, 2), 'a-venir');
  assert.throws(() => startYear(c, 'puddle'), /absente/);
  setLevel(c, 1); assert.equal(c.level, 1);
  assert.throws(() => setLevel(c, 7));
});

test('victoire avec créature utilisée : elle quitte l’équipe, année suivante', () => {
  const c = newCampaign();
  const gc = startYear(c, 'truffle');
  activateCritter(gc);
  assert.throws(() => activateCritter(gc), /déjà/);
  const r = recordResult(c, gc, { pat: 60, human: 61 });
  assert.equal(r.win, true);
  assert.equal(r.critterOut, true);
  assert.equal(c.year, 2);
  assert.deepEqual(c.roster, ['bravehorn', 'whisper']);
  assert.deepEqual(c.discard, ['truffle']);
  assert.equal(yearStatus(c, 1), 'gagnee');
});

test('égalité = défaite : on rejoue la même année, la créature reste', () => {
  const c = newCampaign();
  const gc = startYear(c, 'whisper');
  activateCritter(gc);
  const r = recordResult(c, gc, { pat: 70, human: 70 });
  assert.equal(r.win, false);
  assert.equal(c.year, 1);
  assert.ok(c.roster.includes('whisper'));
  assert.equal(c.games.length, 1);
});

test('victoire sans utiliser la créature : elle reste dans l’équipe', () => {
  const c = newCampaign();
  const r = recordResult(c, startYear(c, 'bravehorn'), { pat: 50, human: 80 });
  assert.equal(r.critterOut, false);
  assert.ok(c.roster.includes('bravehorn'));
});

test('année 1 : une quête de la Guilde retourne la créature face visible ; pas les autres années', () => {
  const c = newCampaign();
  const gc = activateCritter(startYear(c, 'truffle'));
  guildGoalDone(gc);
  assert.equal(gc.faceUp, true);
  // réutilisée puis gagnée face visible : elle reste
  const r = recordResult(c, gc, { pat: 1, human: 2 });
  assert.equal(r.critterOut, false);
  c.year = 3; c.ally = 'faucons';
  const g3 = activateCritter(startYear(c, 'truffle'));
  guildGoalDone(g3);
  assert.equal(g3.faceUp, false);
});

test('année 2 : choix de l’allié obligatoire, ajoute sa créature et retire l’autre', () => {
  const c = newCampaign();
  recordResult(c, startYear(c, 'truffle'), { pat: 1, human: 2 });
  assert.equal(needsAlly(c), true);
  assert.throws(() => startYear(c, 'whisper'), /allié/);
  chooseAlly(c, 'pingouins');
  assert.ok(c.roster.includes('puddle'));
  assert.deepEqual(c.removed, ['windlore']);
  chooseAlly(c, 'faucons'); // changement d'avis avant de jouer
  assert.ok(c.roster.includes('windlore') && !c.roster.includes('puddle'));
  assert.deepEqual(c.removed, ['puddle']);
  assert.throws(() => chooseAlly(c, 'loutres'));
  const gc = startYear(c, 'windlore');
  assert.equal(gc.year, 2);
});

test('année 2 : un réfugié chez les bandits = +1 ouvrier pour Pat et −5 PV pour toi', () => {
  const s = newGame({ level: 2, seed: 4 });
  s.campaign = { year: 2, critter: 'puddle', faceUp: true, activations: 0, refugeesLost: 0, reminders: [] };
  const before = s.workers.normal;
  const left = workersLeft(s);
  refugeeJoinsPat(s); refugeeJoinsPat(s);
  assert.equal(s.workers.normal, before + 2);
  assert.equal(workersLeft(s), left + 2);
  assert.equal(humanPenalty(s), 10);
  assert.equal(humanFinal(s, 74), 64);
  // fin de partie : seulement la pénalité
  s.ended = true;
  refugeeJoinsPat(s);
  assert.equal(s.workers.normal, before + 2);
  assert.equal(humanPenalty(s), 15);
  // hors année 2 : refusé, et pas de pénalité
  const s1 = newGame({ seed: 1 }); s1.campaign = { year: 1, refugeesLost: 0, reminders: [] };
  assert.throws(() => refugeeJoinsPat(s1));
  assert.equal(humanFinal(s1, 40), 40);
  assert.equal(humanFinal(newGame({ seed: 1 }), 40), 40);
});

test('année 2 : le réfugié gagné reste chez Pat aux saisons suivantes', () => {
  const s = newGame({ level: 2, seed: 9 });
  s.campaign = { year: 2, refugeesLost: 0, reminders: [] };
  refugeeJoinsPat(s);
  const r = makeRng(3);
  while (s.season === 'ete') { if (!s.pending) startTurn(s); respond(s, r); }
  assert.equal(s.workers.normal, 1 + 1 + 1); // 1 au départ (p.6) + réfugié + automne
});

test('année 2 : réfugiés à nourrir 2 / 3 / 5 / 5', () => {
  assert.deepEqual(['automne', 'hiver', 'printemps', 'fin'].map((k) => refugeesToFeed(k)), [2, 3, 5, 5]);
  assert.equal(refugeesToFeed('hiver', 1), 2);
});

test('rappels de saison : année 2 après ta préparation et en fin de partie, une seule fois', () => {
  const s = newGame({ seed: 2 });
  s.campaign = { year: 2, refugeesLost: 0, reminders: [] };
  assert.equal(nextReminder(s), null);
  setHumanPrepared(s, 'automne');
  const r = nextReminder(s);
  assert.equal(r.key, 'automne');
  assert.match(r.items.join(' '), /Loge 1 réfugié/);
  assert.match(r.items.join(' '), /Nourris 2 réfugiés/);
  dismissReminder(s, 'automne');
  assert.equal(nextReminder(s), null);
  s.ended = true;
  assert.equal(nextReminder(s).key, 'fin');
  assert.doesNotMatch(nextReminder(s).items.join(' '), /Loge/);
});

test('rappels de saison : année 4, bandits et interlude au printemps ; rien en années 1 et 3', () => {
  const s = newGame({ seed: 2 });
  s.campaign = { year: 4, refugeesLost: 0, reminders: [] };
  setHumanPrepared(s, 'printemps');
  const r = nextReminder(s);
  assert.equal(r.interlude, true);
  assert.match(r.items.join(' '), /bandits/);
  s.campaign.year = 3;
  assert.equal(nextReminder(s), null);
  s.campaign.year = 1;
  assert.equal(nextReminder(s), null);
});

test('année 4 gagnée : campagne terminée', () => {
  const c = newCampaign();
  c.year = 4; c.ally = 'pingouins'; c.roster = ['puddle'];
  const r = recordResult(c, startYear(c, 'puddle'), { pat: 90, human: 91 });
  assert.equal(r.finished, true);
  assert.equal(c.finished, true);
  assert.equal(c.year, 4);
  assert.throws(() => startYear(c, 'puddle'), /terminée/);
});

test('année 3 : options de partie en mode brume', () => {
  const c = newCampaign({ level: 2 });
  assert.deepEqual(gameOptions(c), { level: 2, mist: false });
  c.year = 3;
  assert.deepEqual(gameOptions(c, { seed: 5 }), { seed: 5, level: 2, mist: true });
});

test('année 3 (moteur) : Vallée, Balise, Guilde et jeton Pat marqués « brume », pas la PILE', () => {
  const seen = { card: 0, cardPile: 0, balise: 0, guildQuest: 0, patToken: 0 };
  for (let seed = 1; seed <= 12; seed++) {
    const s = newGame({ level: 3, seed, mist: true });
    playGame(s, makeRng(seed), (st) => {
      const p = st.pending;
      if (!p) return;
      if (p.kind === 'card' && p.src === 'pile') { seen.cardPile++; assert.equal(p.mist, undefined); }
      else if (['card', 'balise', 'guildQuest', 'patToken'].includes(p.kind)) { seen[p.kind]++; assert.equal(p.mist, true, p.kind); }
    });
    assert.equal(s.ended, true);
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `étape ${k} jamais vue`);
});

test('hors année 3 : aucune étape marquée « brume », et même déroulé qu’avant', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const a = newGame({ level: 2, seed });
    const b = newGame({ level: 2, seed, mist: true });
    playGame(a, makeRng(seed), (st) => assert.equal(st.pending?.mist, undefined));
    playGame(b, makeRng(seed));
    assert.equal(a.turn, b.turn);
    assert.equal(a.city, b.city);
    assert.deepEqual(a.log.map((l) => l.msg), b.log.map((l) => l.msg));
  }
});

test('année 4 : bandit sur le lieu de Pat traité comme la neige (chassé gratuitement, sans butin)', () => {
  const s = newGame({ level: 2, seed: 4 });
  assert.equal(banditPlaceNote(s), '');
  s.campaign = { year: 3, refugeesLost: 0, reminders: [] };
  assert.equal(banditPlaceNote(s), '');
  s.campaign.year = 4;
  const t = banditPlaceNote(s);
  assert.match(t, /gratuitement/);
  assert.match(t, /réserve de bandits/);
  assert.match(t, /Pas de butin/);
});
