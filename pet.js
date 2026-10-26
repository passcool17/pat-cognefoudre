// Pat compagnon : humeur et répliques pendant le tour du joueur.
// Module pur (aucun accès au DOM) : testé par tests/pet.test.js.
import { PAT_TOKENS } from './data.js';

export const MOODS = {
  content: { emoji: '😼', label: 'Content de lui' },
  grognon: { emoji: '😾', label: 'Grognon' },
  impatient: { emoji: '⏳', label: 'Impatient' },
  endormi: { emoji: '😴', label: 'Endormi' },
  triomphant: { emoji: '👑', label: 'Triomphant' },
  boudeur: { emoji: '🙄', label: 'Boudeur' },
};

// Délais du tour du joueur (millisecondes)
export const TIMING = {
  chatterMin: 20000, chatterMax: 32000, // une réplique « de temps en temps »
  slowAfter: 50000, // le joueur prend son temps
  nagEvery: 75000, // puis rappel régulier
  impatientAfter: 45000, // l'humeur passe à « impatient »
};

export const LINES = {
  content: [
    'Ha ! Ma ville grandit plus vite que la tienne. Normal, je suis le roi.',
    'Admire ma couronne. Non, plus près. Voilà, tu es ébloui.',
    'Tout se passe selon mon plan. Mon Plan avec un grand P.',
    'Mon marteau et moi, on est très fiers de nous aujourd’hui.',
    'Joue, joue… Le Roi des Bandits t’accorde ce petit tour.',
    'Mon œil unique voit tout, et ce qu’il voit me plaît beaucoup.',
    'J’ai déjà {city} cartes dans ma ville. Tu comptes encore les tiennes ?',
    'La forêt murmure mon nom. Enfin, je crois que c’est mon nom.',
    'Je ne paie jamais rien et tout est à moi. C’est ça, la royauté.',
    'Prends ton temps. Pas trop quand même, je suis généreux, pas patient.',
    'Mes gardes forestiers m’ont dit que tu étais impressionné. Ils ont raison.',
    'Un roi, ça ne sourit pas. Sauf aujourd’hui. Un tout petit peu.',
    'J’ai {snow} neige dans mes coffres. La neige, c’est mon trésor.',
    'Si tu veux des conseils, demande à quelqu’un d’autre. Moi je gagne.',
    'Je pourrais régner sur Silverfrost les yeux fermés. Enfin, l’œil.',
    'Tu sens ce petit vent froid ? C’est le parfum de ma victoire.',
  ],
  grognon: [
    'Grrr… Qui m’a pris ma place ? C’est toi, hein ? C’est toi.',
    'Bloqué ! Encore ! Un roi ne devrait jamais faire la file.',
    'Cette carte Tactiques me fait tourner en rond comme un écureuil.',
    'Je ne boude pas. Je réfléchis très fort avec les sourcils froncés.',
    'Mon marteau a envie de taper sur quelque chose. Sur la table, rassure-toi.',
    'Même la neige me regarde de travers aujourd’hui.',
    'Les gardes forestiers ont dû se perdre dans la forêt. Encore.',
    'Hmpf. Ma couronne est de travers et c’est de ta faute.',
    'On m’a volé mon lieu. Moi ! Le Roi des Bandits ! Volé !',
    'Je compte jusqu’à dix pour me calmer. Un, deux… non, ça marche pas.',
    'J’ai déjà placé {tokens} jetons Pat. Tu vois dans quel état tu me mets ?',
    'Ma fourrure se hérisse. C’est mauvais signe. Pour toi.',
    'Même mon œil unique est fatigué de voir ça.',
    'Je note tout dans mon grand livre des rancunes. Ton nom est en haut.',
    'Grogne, grogne… c’est comme ça que les lynx disent « je suis vexé ».',
    'Le feu de la Forge, c’est rien comparé à celui de ma colère.',
  ],
  impatient: [
    'Alors ? Ça vient ? Mes moustaches gèlent.',
    'Tu joues ou tu hibernes ? On n’est pas des marmottes.',
    'Le printemps va arriver avant la fin de ton tour.',
    'Je tapote mon marteau. Tap. Tap. Tap. Tu entends ?',
    'Même un escargot de Silverfrost serait déjà rendu à la Guilde.',
    'J’ai eu le temps de cirer ma couronne deux fois.',
    'Si tu réfléchis encore, la neige va recouvrir le plateau.',
    'Allez, allez ! Un roi n’attend pas. Enfin… si, apparemment.',
    'Mon œil unique commence à se fermer d’ennui.',
    'Tu veux que j’appelle les gardes forestiers pour t’aider à choisir ?',
    'Je pourrais construire une ville entière pendant que tu hésites.',
    'Toc toc. C’est le Roi des Bandits. Il attend toujours.',
    'Le feu s’éteint, la neige tombe, et toi tu penses encore.',
    'Choisis une carte, n’importe laquelle. Bon, pas n’importe laquelle.',
    'Ça fait un moment… Tu t’es endormi derrière tes cartes ?',
    'Je suis patient comme une avalanche. Donc pas du tout.',
  ],
  endormi: [
    'Hiver… le meilleur moment pour une sieste royale. Zzz…',
    'Réveille-moi quand ce sera mon tour. Pas avant. Bâille.',
    'La neige tombe tout doucement… mes paupières aussi…',
    'Je ne dors pas. Je planifie avec l’œil fermé.',
    'Mon marteau fait un très bon oreiller, tu savais ?',
    'Zzz… mes gardes… surveillez… la Forge… zzz…',
    'Il fait si froid que même mes ronflements gèlent.',
    'Encore cinq minutes sous ma cape. Juste cinq.',
    'Je rêve d’une ville de quinze cartes. Non, vingt. Zzz…',
    'Chut. Le Roi des Bandits fait sa sieste d’hiver.',
    'Bâille… Tu as vu ma couronne ? Elle a glissé sur mon nez.',
    'L’hiver, les lynx économisent leur énergie. Pour te battre au printemps.',
    'Je compte les flocons… un… deux… zzz…',
    'Ne fais pas trop de bruit avec tes cartes, s’il te plaît.',
    'Mmh ? Quoi ? Je ne dormais pas ! Je méditais.',
    'Un petit feu, une cape bien chaude… et toi qui joues lentement. Parfait.',
  ],
  triomphant: [
    'Victoire ! Le Roi des Bandits règne sur Silverfrost !',
    'Je l’avais dit dès l’été. Personne ne m’écoute jamais.',
    'Incline-toi devant ma couronne. Plus bas. Voilà.',
    'Mon marteau et moi, on va fêter ça avec un gros feu de joie.',
    'Ta ville est jolie. La mienne est gagnante.',
    'Mes gardes forestiers vont chanter mes exploits tout l’hiver.',
    'Même la neige applaudit. Écoute bien, ça fait « flouf flouf ».',
    'Tu as bien joué. Moins bien que moi, mais bien.',
    'Je vais faire graver ce jour sur la porte de la Guilde.',
    'Mon œil unique n’a jamais vu une victoire aussi belle.',
    'Revanche ? Avec plaisir. J’adore gagner deux fois.',
    'Le roi est mort, vive le roi ! Ah non, c’est moi, et je suis bien vivant.',
    'Silverfrost est à moi. Je te laisse un petit coin pour ta tente.',
    'Je ne suis pas arrogant. Je suis juste meilleur. Nuance.',
    'Tu veux un autographe ? Je signe avec une griffe.',
    'Ce soir, je dors sur ma couronne. Façon de parler.',
  ],
  boudeur: [
    'Hmpf. J’ai perdu, mais c’est parce que je t’ai laissé gagner.',
    'Je ne joue plus. Bon, peut-être une revanche. Demain.',
    'Ma couronne est trop lourde aujourd’hui. C’est pour ça.',
    'Tu as triché. Non ? Bon… tu as eu de la chance, alors.',
    'Je vais bouder dans ma caverne. Ne me suis pas.',
    'Les gardes forestiers étaient distraits. Je vais leur parler.',
    'Bravo… je suppose. Je le dis du bout des moustaches.',
    'Exil ? Moi ? Bon. Je reviendrai avec la prochaine tempête.',
    'Je cache mon œil unique pour ne pas voir ton score.',
    'La neige m’a trahi. La neige ! Ma propre neige !',
    'Mon marteau et moi, on a besoin d’un câlin. Non. Oublie ça.',
    'C’était une victoire de débutant. Profite, ça ne durera pas.',
    'Je note ta victoire dans mon livre des rancunes. Page un.',
    'Félicitations. Voilà, je l’ai dit. Ne me demande pas de le répéter.',
    'Je repars dans la forêt préparer ma revanche. Elle sera terrible.',
    'D’accord, tu es fort. Mais moi j’ai une couronne. Donc égalité.',
  ],
};

export function tokensUsed(s) {
  // Jetons Pat actuellement posés (Vallée + lieux partagés).
  return Math.min(PAT_TOKENS, (s.patTokensVallee || 0) + (s.patTokensFixed || 0));
}

// Humeur chiffrée de 0 (furieux) à 100 (ravi), pour la jauge.
export function happiness(s) {
  const st = s.stats || {};
  const lastBlocks = st.lastBlockedTurn === s.turn ? (st.lastTurnBlocks || 1) : 0;
  const h = 45 + 3 * s.city + 2 * s.fire + s.snow + s.points + 4 * (s.quests?.count || 0)
    - 3 * s.turn / 2 - 12 * lastBlocks - 2 * tokensUsed(s);
  return Math.round(Math.max(0, Math.min(100, h)));
}

// final : { patTotal, humanTotal } quand la partie est terminée et le score saisi.
export function computeMood(s, { elapsedMs = 0, final = null } = {}) {
  if (!s) return 'content';
  if (final && (final.humanTotal || 0) > 0) return final.patTotal >= final.humanTotal ? 'triomphant' : 'boudeur';
  if (s.ended) return 'triomphant';
  if (elapsedMs >= TIMING.impatientAfter) return 'impatient';
  const h = happiness(s);
  const st = s.stats || {};
  if (st.lastBlockedTurn === s.turn || h < 35) return 'grognon';
  if (s.season === 'hiver' && h < 85) return 'endormi';
  return 'content';
}

export function newPet() { return { used: {}, last: null, greetedTurn: null }; }

// Choisit une réplique sans répétition tant que la liste de l'humeur n'est pas épuisée.
export function pickLine(pet, mood, s, rnd = Math.random) {
  const pool = LINES[mood] || LINES.content;
  let used = pet.used[mood] || [];
  if (used.length >= pool.length) used = pet.last && pet.last.mood === mood ? [pet.last.i] : [];
  const free = pool.map((_, i) => i).filter((i) => !used.includes(i));
  const i = free[Math.floor(rnd() * free.length) % free.length];
  pet.used[mood] = [...used, i];
  pet.last = { mood, i };
  return { mood, i, text: fill(pool[i], s) };
}

export function fill(text, s) {
  return text
    .replace('{city}', String(s?.city ?? 0))
    .replace('{snow}', String(s?.snow ?? 0))
    .replace('{tokens}', String(s ? tokensUsed(s) : 0));
}
