// Campagne solo non officielle « L'année du Lapin » (The Year of the Rabbit, Otto Gregor / Ottto sur BGG).
// Module pur : données traduites + règles de progression. Aucun accès au DOM ni au stockage.
import { WORKER_GAIN } from './data.js';

export const CAMPAIGN_V = 1;
export const PENALTY_REFUGEE = 5;
export const CREDITS = {
  title: 'The Year of the Rabbit',
  author: 'Otto Gregor (Ottto sur BoardGameGeek)',
  url: 'https://boardgamegeek.com/boardgame/436821/everdell-silverfrost/files',
  game: 'Everdell : Silverfrost — James A. Wilson et Clarissa A. Wilson ; solo de Chrissy et Tom Peske ; droits Tabletop Tycoon Inc.',
};

// Noms anglais des cartes de la campagne (la VF des Grosses Créatures n'a pas été vérifiée).
export const CRITTERS = {
  bravehorn: { name: 'Bravehorn', who: 'le cerf majestueux', emoji: '🦌' },
  whisper: { name: 'Whisper', who: 'le loup à l’esprit vif', emoji: '🐺' },
  truffle: { name: 'Truffle', who: 'le sanglier au grand cœur', emoji: '🐗' },
  puddle: { name: 'Puddle', who: 'le héraut des pingouins', emoji: '🐧' },
  windlore: { name: 'Windlore', who: 'le seigneur des faucons', emoji: '🦅' },
};
export const START_ROSTER = ['bravehorn', 'whisper', 'truffle'];

export const ALLIES = {
  pingouins: {
    label: 'Les pingouins', emoji: '🐧', critter: 'puddle', other: 'windlore',
    story: [
      '— Êtes-vous le chef de cette troupe, monseigneur ? demanda gentiment Truffle.',
      '— Je ne suis pas fait pour une telle responsabilité, monseigneur. Mais vous pouvez m’appeler le héraut. Puddle se distinguait parmi eux.',
      '— Si vous cherchez un chef pour vous protéger de ces plaines gelées, vous êtes au bon endroit, lança Bravehorn avec enthousiasme.',
      '— Nous nous habituons au froid. Mais trouver à manger n’est pas facile ici. Guidez-nous, et nous travaillerons dur pour le mériter. Puddle disait vrai : ils mouraient de faim.',
      '« J’ai dû mettre de côté les vieilles rancunes. Ces gens avaient besoin d’aide. Mais nous avions à peine assez pour nous-mêmes. L’hiver approchait, les bandits rôdaient à nos portes, et nous avions maintenant bien plus de bouches à nourrir. » — Lepus Longear',
    ],
  },
  faucons: {
    label: 'Les faucons', emoji: '🦅', critter: 'windlore', other: 'puddle',
    story: [
      '— Vous n’avez pas l’air bien. Vous devriez fendre le ciel, comme les faucons que vous êtes, remarqua Whisper.',
      '— C’était le cas, mon seigneur, mais le froid nous a vite saisis. Il n’est pas facile de voler les plumes gelées, frissonna Windlore.',
      '— Si vous cherchez un abri et un nouveau seigneur pour vous relever, restez donc, dit Truffle, jovial.',
      '— Ce serait un honneur, et nous serions très… atchoum… reconnaissants ! Windlore était affaibli, par le froid et par l’inquiétude pour les siens.',
      '« J’ai dû mettre de côté les vieilles rancunes. Ces gens avaient besoin d’aide, mais nous avions à peine assez pour nous-mêmes. L’hiver approchait, les bandits rôdaient aux portes, et nous devions maintenant abriter bien plus de monde. » — Lepus Longear',
    ],
  },
};

export const PROLOGUE = {
  quote: '« Ce royaume est le nôtre, et ni tempête ni roi ne nous le prendra. »',
  intro: 'Bienvenue dans la campagne solo non officielle d’Everdell : Silverfrost, « L’année du Lapin ». Tu suis Lepus Longear, un banni qui mène son clan dans les terres gelées, face aux éléments et à de féroces bandits. Quatre scénarios, chacun avec ses propres règles. Mets une musique d’ambiance et bonne aventure ! — Ottto',
  rules: [
    'Tu joues les lapins ; Pat joue les pandas roux. Pat suit ses règles habituelles, au niveau de ton choix (l’auteur conseille le plus difficile). Tu peux changer de niveau entre deux scénarios.',
    'Avant la campagne, retire du paquet les Grosses Créatures Bravehorn, Whisper, Truffle, Windlore et Puddle. Bravehorn, Whisper et Truffle forment ton <b>équipe</b>. Range Puddle et Windlore dans la boîte pour l’instant.',
    'Après la mise en place de chaque scénario, choisis <b>1</b> Grosse Créature de ton équipe et pose-la devant toi. Range les autres.',
    '<b>Nouvelle action</b> (en plus de « placer un ouvrier », « jouer une carte » et « se préparer ») : <b>activer ta Grosse Créature</b>. Ça prend ton tour, ça ne rapporte aucun jeton Point, et tu la retournes face cachée.',
    'Si tu gagnes et que ta créature est face cachée (utilisée), elle va dans la défausse des Grosses Créatures : elle quitte ton équipe. Si tu perds, ou si elle est restée face visible, elle reste dans ton équipe.',
    'Pour gagner, tu dois marquer <b>plus</b> de points que Pat (égalité = défaite). Sinon, rejoue la même année. Les années se jouent dans l’ordre.',
  ],
};

export const YEARS = [
  {
    n: 1, title: 'Un nouveau départ',
    story: [
      '« Sais-tu ce que c’est, de ne plus être le bienvenu chez soi ? Ils te donnent des noms pour t’enchaîner. Longear le traître, disent-ils… comme si des mots pouvaient enchaîner mon âme. »',
      '« Everdell vivait en harmonie jusqu’à l’arrivée des ténèbres. Rats noirs et araignées ont déferlé comme une peste. Nobletail est tombée, et on m’en a tenu responsable, moi et les miens. Alors nous avons fui dans les montagnes, tout le village, pour recommencer. La Guilde des Rangers pourrait peut-être nous aider : elle veillait jadis sur les gens des monts Spirecrest. »',
      '« On racontait que de grandes créatures parcouraient ces terres, en harmonie avec le petit peuple. Je croyais à des contes du soir. Nous avions de la neige jusqu’au cou quand nous les avons rencontrées. Un sanglier bienveillant nous a tirés de la neige, un cerf majestueux a voulu nous mettre à l’abri, un loup malicieux a suivi en ronchonnant. Ils nous ont menés dans une vallée cachée. »',
      '« — Vous savez vous débrouiller, les petits. On vous a juste donné un coup de pouce, sourit Truffle. Nous lui devions la vie. — Ne vous réjouissez pas trop vite. Il y a ici d’autres dangers que la neige, avertit Whisper. — Pat Cognefoudre, le Roi des Bandits, cherche toujours des proies faciles. Prenez vos outils et vos marteaux : bâtissez votre foyer, dit Bravehorn. Il avait raison : la meilleure défense, c’est une communauté solide. »',
      '« Pat était féroce, ses hommes de main impitoyables. Nous ne sommes pas des guerriers, nous sommes des bâtisseurs. Alors nous faisons ce que nous faisons de mieux : nous construisons ! J’ai fait prévenir la Guilde des Rangers, mais il leur faudra du temps pour arriver. » — Lepus Longear',
    ],
    setup: [
      'Révèle les 3 Quêtes en montagne comme d’habitude. Pioche 2 Quêtes en plaine, gardes-en 1 et remets l’autre. Puis <b>retire du jeu le paquet de Quêtes en plaine</b>.',
      'Commence <b>sans garde forestier</b>, avec 2 ouvriers normaux. Mets ton garde forestier dans la réserve d’ouvriers du printemps.',
      'Choisis ta Grosse Créature parmi ton équipe.',
    ],
    rules: [
      'Quand tu devrais piocher une Quête en plaine, ne le fais pas. Tu ne peux réaliser que les quêtes publiques et ta Quête en plaine de départ (4 au total).',
      'Chaque fois que tu réalises une quête de la Guilde (en plaine ou en montagne) alors que ta créature est face cachée, retourne-la face visible : tu pourras la réutiliser.',
      'Au printemps, ton garde forestier est l’un de tes 2 nouveaux ouvriers.',
    ],
    scoring: [],
  },
  {
    n: 2, title: 'Les ennemis du passé', ally: true,
    story: [
      '« Gagner la confiance de la Guilde des Rangers n’a pas été facile, mais nous y sommes arrivés. Nous avons bâti une ville animée au milieu de nulle part, et la nouvelle s’est répandue. Si loin qu’ILS sont venus… »',
      '« Ceux qui m’avaient chassé. Ceux qui m’avaient donné ces noms. La peste les avait rattrapés, et ils frappaient à ma porte. Everdell était perdue et ils demandaient refuge. Ils étaient nombreux. Si nombreux. »',
      '« — Ils sont désespérés. Donne-leur une chance, dit Truffle, toujours plein d’espoir. — Ce ne sont peut-être pas eux qui t’ont chassé, mais ce sont les leurs, le taquina Whisper. — Ils pourraient devenir de puissants alliés. Unis-les ! dit Bravehorn. Ces grandes créatures attendent de moi que j’aide les nouveaux venus, mais ils sont trop nombreux. » — Lepus Longear',
    ],
    setup: [
      'Choisis ton allié (ci-dessous). Ajoute sa Grosse Créature à ton équipe (Puddle pour les pingouins, Windlore pour les faucons) et retire l’autre de la campagne.',
      'Prends les figurines de ton allié dans la boîte.',
      'En plus de tes 2 ouvriers de départ (1 garde forestier et 1 ouvrier normal), prends une figurine alliée avec des bottes de ranger : c’est un <b>apprenti</b>, il travaille comme un ouvrier normal.',
      'Prends une construction <b>Camp</b> dans la pioche et pose-la gratuitement dans ta ville, <b>sans la résoudre</b>. Couche dessus une figurine alliée : c’est un <b>réfugié</b>, il ne bougera plus.',
      'Mets les autres figurines alliées sur le plateau des saisons, avec tes futurs ouvriers : 1 en automne, 1 en hiver, 2 au printemps. Ce sont des réfugiés.',
      'Astuce : pose un gland sur la case « AJOUTER » de chaque saison pour penser à nourrir les réfugiés.',
    ],
    rules: [
      'À chacune de tes préparations (juste avant d’ajouter la neige sur tes cartes), tu dois <b>loger</b> puis <b>nourrir</b> les réfugiés.',
      '<b>Loger</b> : autant de réfugiés que d’ouvriers gagnés. Couche chaque nouveau réfugié sur une de tes <b>constructions</b> sans neige, 1 par construction. Elle ne peut plus quitter ta ville.',
      '<b>Nourrir</b> : tous les réfugiés de ta ville, y compris ceux que tu viens de loger : 1 gland ou 3 jetons Point chacun, au choix. Donc 2 en automne, 3 en hiver, 5 au printemps et 5 en fin de partie.',
      'Un réfugié que tu ne peux pas loger ou nourrir <b>rejoint les bandits</b> : il devient un ouvrier de Pat jusqu’à la fin de la partie. Appuie sur « +1 ouvrier pour Pat (réfugié) ».',
    ],
    scoring: ['−5 PV pour chaque réfugié qui a rejoint les bandits pendant la partie (l’app les déduit de ton total).'],
  },
  {
    n: 3, title: 'La brume de l’incertitude', mist: true,
    story: [
      '« Le temps dans les monts Silvercrest était imprévisible, et chaque année pire que la précédente. Même l’été, la grêle détruisait récoltes et toitures. Mais cette année fut particulièrement rude. »',
      '« Un brouillard épais, surnaturel, recouvrit notre vallée. J’ai d’abord craint les araignées. Mais la brume servait un autre ennemi : les hommes de main de Pat frappaient sans pitié depuis ses profondeurs, pillant familles, caravanes et messagers. Ils grandissent chaque année. Tôt ou tard, ils viendront nous assiéger. »',
      '« J’ai voulu prévenir la Guilde des Rangers, mais la brume nous coupait de nos alliés et embrumait nos esprits. Il fallait trouver un autre moyen. Quand j’ai vu l’inquiétude dans les yeux toujours joyeux de Truffle, j’ai craint le pire. » — Lepus Longear',
    ],
    setup: [
      'Distribue <b>face cachée</b> les cartes de la Vallée, les quêtes de la Guilde et les créatures de la montagne.',
      'Choisis ta Grosse Créature parmi ton équipe.',
    ],
    rules: [
      'Tu ne peux pas interagir avec une carte face cachée, sauf pour la découvrir ou en déblayer la neige.',
      'Toute carte de remplacement, dans n’importe quelle rangée, arrive face cachée.',
      '<b>Éclaireur</b> : après chaque placement d’ouvrier, avant de résoudre l’action, retourne 2 cartes face cachée n’importe où sur le plateau. Si elle a de la neige, déblaie-la d’abord (en payant le feu). Elle reste face visible.',
      'Quand une action te fait piocher, tu peux toujours prendre une carte face visible de la Vallée (après avoir déblayé sa neige). Remplace-la face cachée.',
    ],
    patRules: [
      'Vallée : Pat prend d’abord les cartes face visible, dans l’ordre habituel. S’il n’y en a pas, il prend une carte face cachée : celle avec de la neige d’abord (il garde la neige), puis de gauche à droite et de haut en bas.',
      'Balise : défausse la Grosse Créature de sa carte, qu’elle soit face visible ou cachée. Il gagne ses jetons Point normalement. Fais glisser la rangée et remplis-la face cachée.',
      'Guilde : Pat ne peut réaliser qu’une Quête en montagne <b>face visible</b>. Sinon, il réalise un de ses propres objectifs (sa pile Quête).',
    ],
    scoring: [],
  },
  {
    n: 4, title: 'Les rois déchus', bandits: true,
    story: [
      '« Je sais ce que c’est, de ne plus être le bienvenu chez soi. Pat le sait aussi. Nos méthodes diffèrent, mais au fond nous cherchons tous deux à survivre. Pat s’est dressé pour son peuple, comme je me dresse pour le mien. Voilà ce qui nous a menés ici. Maintenant, ils marchent contre nous. Les hivers sont plus durs, et le désespoir les pousse. »',
      '« Cette fois, c’est différent. Je ne veux pas partir. Les grandes créatures sont avec nous. Nos alliés sont avec nous. La Guilde des Rangers est avec nous. Nous avons trouvé un nouveau foyer, et ici, nous sommes les bienvenus. Je ne l’abandonnerai pas ! »',
      '« Nous ne sommes pas des guerriers, et pourtant nous forgeons des épées. Nous n’avons jamais vu de bataille, et pourtant nous levons des boucliers. Nous bâtissions des fermes ; nous bâtissons des remparts. Nous tiendrons bon ! Ce royaume est le nôtre, et ni tempête ni roi ne nous le prendra. » — Lepus Longear',
    ],
    setup: [
      'Prends <b>toutes</b> les figurines de la boîte.',
      'En plus de tes 2 ouvriers de départ (1 garde forestier et 1 ouvrier normal), prends une figurine alliée avec des bottes de ranger : sa formation est terminée, c’est un <b>vrai garde forestier</b>.',
      'Les figurines non alliées forment une réserve de <b>bandits</b> près du plateau (les figurines alliées servent de renfort si elle s’épuise).',
      'Pose un jeton (ou une quête face cachée) sur la saison du printemps pour penser à l’interlude.',
      'Pose 2 pièces (jetons 1 Point) sur la tuile de coût de la neige pour te rappeler le coût des bandits.',
      'Choisis ta Grosse Créature parmi ton équipe.',
    ],
    rules: [
      'Quand tu te prépares et que tu gagnes de la neige <b>dans ta ville</b> (pas sur le plateau), place autant de <b>bandits</b> sur tes cartes, comme la neige (tableau du plateau), 1 bandit par carte. Le surplus va sur le plateau, comme la neige.',
      'Une carte ou un lieu peut avoir de la neige et un bandit. Un bandit bloque exactement comme la neige (pas d’interaction, ne compte pas pour les quêtes…).',
      'Chasser un bandit coûte des pièces (jetons Point) : 1 de plus que le feu pour la neige, donc 2, puis 3 quand la tuile est retournée. Comme pour la neige : une fois par tour dans ta ville, ou sur le plateau quand tu interagis avec lui. Remets le bandit dans la réserve.',
      'Ou combats-le : pose un ouvrier sur la carte attaquée (même enneigée). Retire le bandit gratuitement, récupère la neige gratuitement et gagne 1 ressource au choix (butin). Un garde forestier gagne aussi 1 feu.',
      'Quand tu te prépares pour le printemps, <b>avant tout</b>, lis l’interlude.',
    ],
    scoring: ['Une carte de ta ville avec un bandit (ou de la neige) ne rapporte rien et ne compte pas dans ta ville (tu peux la défausser avant le décompte).', 'Si tu gagnes, tu remportes la campagne : lis l’épilogue !'],
  },
];

export const INTERLUDE = {
  title: 'Interlude (au printemps)',
  story: [
    '« La guerre. Je n’aurais jamais cru y prendre part. Les combats étaient féroces : gourdins contre fourches. Comme un jeu terrible où l’on donne, puis l’on prend. Chaque guerre a ses victimes, nous l’avons appris à nos dépens. »',
    '« Les Rangers étaient les meilleurs, dans la nature comme au combat. Mais ils manquaient d’effectifs, et l’ennemi était nombreux. Ils se sont battus vaillamment, mais ils ont été submergés. La Guilde est toujours avec nous. Mais ses guerriers sont tombés. » — Lepus Longear',
  ],
  rule: 'Retire tes 2 gardes forestiers du jeu. Tu ne peux plus les utiliser.',
};

export const EPILOGUE = [
  '« Au plus fort de la bataille, au pire de la tempête, ce fut fini. D’un coup, en une seconde. Ils ont vu qu’ils ne pouvaient pas gagner, alors ils ont fui. Nous les avons vraiment chassés. »',
  '« Nous avions déjà vaincu les éléments, mais jamais un ennemi armé. Et pourtant, ce jour-là, épées grossières, fourches et gourdins se sont levés vers le ciel enneigé. Nous l’avons payé de notre sang, mais nous avons défendu notre royaume. »',
  '« Dans les derniers instants, j’ai regardé Pat : « Pars ! Tu n’es pas le bienvenu ici ! » J’ai vu la tristesse et la folie dans ses yeux. Ils sont partis, pour l’instant, mais la folie ne quittera jamais son esprit. Comme les tempêtes de neige, elle empire chaque année, jusqu’à dévorer la terre. »',
  '« Mais nous serons là pour déblayer la neige. Pour qu’ils se souviennent : ce royaume est le nôtre, pour bien des hivers encore. » — Lepus Longear',
];

// Précisions de la campagne, vérifiées dans le texte d'Otto Gregor (The Year of the Rabbit) et le livret Silverfrost.
export const PRECISIONS = [
  'Les quêtes « bleues » de la campagne sont les Quêtes en montagne (publiques, 3 à 2 joueurs), les « vertes » les Quêtes en plaine (on en pioche 2, on en garde 1) : campagne, Année 1 ; livret p.6.',
  'Année 1 : ton garde forestier est l’un de tes 2 nouveaux ouvriers du printemps (campagne, Année 1 ; livret p.6 : 2 ouvriers au printemps).',
  'Années 2 et 4 : tu commences avec 1 garde forestier, 1 ouvrier normal et l’apprenti, soit 3 figurines (campagne, Années 2 et 4).',
  'Année 2 : un réfugié qui rejoint les bandits va dans la réserve d’ouvriers de Pat : il le pose comme ouvrier normal, son garde forestier toujours en dernier. En fin de partie, il ne compte que pour le −5 (campagne, Année 2 ; livret p.19).',
  'Année 3 : « un de ses propres objectifs » = la quête du haut de la pile Quête de Pat (campagne, Année 3 ; livret p.17 et p.19).',
  'Année 3 : la neige d’une carte face cachée prise par Pat va dans sa réserve (campagne, Année 3 : « add it to his pool »).',
  'Année 4 : les bandits arrivent avec la neige de <b>ta</b> ville ; Pat n’a jamais de neige dans sa ville, donc il ne reçoit pas de bandits (campagne, Année 4 ; livret p.21).',
  'Pas de score cumulé : il faut battre Pat chaque année pour passer à la suivante, sinon on la rejoue (campagne, « How to win and progress »).',
  'Les noms des Grosses Créatures sont ceux de la campagne (en anglais).',
];

// Cas que ni la campagne ni le livret ne tranchent : l'app applique ce choix en attendant la décision de PassCool_17.
export const CAS_NON_PREVUS = [
  'Année 3 : jeton Pat dans la brume. L’app garde l’ordre habituel sur les cartes face visible et, s’il n’y en a aucune, applique l’ordre des cartes face cachée (le livret p.20 utilise le même ordre que pour jouer une carte de la Vallée).',
  'Année 4 : un bandit en trop posé sur le plateau, sur un lieu où Pat envoie un ouvrier. L’app ne donne pas de consigne particulière.',
];

// ---------- état de campagne (carnet) ----------
export function newCampaign({ level = 4 } = {}) {
  return { v: CAMPAIGN_V, year: 1, level, roster: [...START_ROSTER], discard: [], removed: [], ally: null, games: [], finished: false };
}

export function yearInfo(n) { return YEARS[n - 1]; }

export function setLevel(c, level) {
  if (![1, 2, 3, 4].includes(level)) throw new Error('niveau invalide');
  c.level = level;
  return c;
}

export function chooseAlly(c, ally) {
  const a = ALLIES[ally];
  if (!a) throw new Error('allié inconnu');
  if (c.ally === ally) return c;
  if (c.ally) {
    // Changement d'avis avant la première partie de l'année 2 : on défait le choix précédent.
    const prev = ALLIES[c.ally];
    if (c.games.some((g) => g.year >= 2)) throw new Error('allié déjà choisi');
    c.roster = c.roster.filter((k) => k !== prev.critter);
    c.removed = c.removed.filter((k) => k !== prev.other);
  }
  c.ally = ally;
  if (!c.roster.includes(a.critter) && !c.discard.includes(a.critter)) c.roster.push(a.critter);
  if (!c.removed.includes(a.other)) c.removed.push(a.other);
  return c;
}

export function needsAlly(c) { return c.year >= 2 && !c.ally; }

// Démarre l'année en cours avec la créature choisie. Renvoie l'état de campagne à ranger dans la partie.
export function startYear(c, critter) {
  if (c.finished) throw new Error('campagne terminée');
  if (needsAlly(c)) throw new Error('choisis un allié');
  if (!c.roster.includes(critter)) throw new Error('créature absente de ton équipe');
  return { year: c.year, critter, faceUp: true, activations: 0, refugeesLost: 0, reminders: [] };
}

export function activateCritter(gc) {
  if (!gc.faceUp) throw new Error('créature déjà utilisée');
  gc.faceUp = false;
  gc.activations++;
  return gc;
}

// Année 1 seulement : une quête de la Guilde réalisée retourne la créature face visible.
export function guildGoalDone(gc) {
  if (gc.year === 1 && !gc.faceUp) gc.faceUp = true;
  return gc;
}

// Année 2 : un réfugié rejoint les bandits. s = état de partie (logic.js).
export function refugeeJoinsPat(s) {
  const gc = s.campaign;
  if (!gc || gc.year !== 2) throw new Error('réservé à l’année 2');
  gc.refugeesLost++;
  if (!s.ended) s.workers.normal += 1;
  s.log.push({ turn: s.turn, season: s.season, msg: s.ended ? 'Un réfugié rejoint les bandits (−5 PV pour toi).' : 'Un réfugié rejoint les bandits : +1 ouvrier pour Pat (−5 PV pour toi).' });
  return s;
}

export function humanPenalty(s) { return s?.campaign?.year === 2 ? s.campaign.refugeesLost * PENALTY_REFUGEE : 0; }
export function humanFinal(s, humanRaw) { return Math.max(0, (Number(humanRaw) || 0) - humanPenalty(s)); }

// Réfugiés présents dans ta ville quand tu te prépares pour `season` (ou en fin de partie : 'fin').
export function refugeesToFeed(season, lost = 0) {
  const order = ['automne', 'hiver', 'printemps'];
  const upto = season === 'fin' ? order : order.slice(0, order.indexOf(season) + 1);
  return Math.max(0, 1 + upto.reduce((n, k) => n + WORKER_GAIN[k], 0) - lost);
}

// Rappel à afficher après une de tes préparations (ou en fin de partie). null s'il n'y en a pas.
export function nextReminder(s) {
  const gc = s?.campaign;
  if (!gc || (gc.year !== 2 && gc.year !== 4)) return null;
  const keys = ['automne', 'hiver', 'printemps'].filter((k) => s.humanPrepared[k]);
  if (gc.year === 2 && (s.passed || s.ended)) keys.push('fin');
  const key = keys.find((k) => !gc.reminders.includes(k));
  if (!key) return null;
  if (gc.year === 2) {
    const house = key === 'fin' ? 0 : WORKER_GAIN[key];
    const items = [];
    if (house) items.push(`<b>Loge ${house} réfugié${house > 1 ? 's' : ''}</b> sur ${house > 1 ? 'des constructions différentes' : 'une construction'} sans neige (1 par construction), avant d’ajouter la neige.`);
    items.push(`<b>Nourris ${refugeesToFeed(key)} réfugiés</b> au total (moins ceux déjà passés chez les bandits) : 1 gland ou 3 jetons Point chacun.`);
    items.push('Pour chaque réfugié non logé ou non nourri : appuie sur « +1 ouvrier pour Pat (réfugié) ».');
    return { key, year: 2, title: key === 'fin' ? 'Fin de partie : nourris tes réfugiés' : `Préparation pour ${key === 'automne' ? 'l’automne' : key === 'hiver' ? 'l’hiver' : 'le printemps'} : tes réfugiés`, items };
  }
  const items = [];
  if (key === 'printemps') items.push('<b>Avant tout : lis l’interlude</b> (ci-dessous) et retire tes 2 gardes forestiers du jeu.');
  items.push('Neige gagnée <b>dans ta ville</b> → autant de <b>bandits</b> sur tes cartes, comme la neige (1 par carte, surplus sur le plateau).');
  items.push('Chasser un bandit : 2 pièces (3 une fois la tuile retournée), ou combats-le avec un ouvrier (+1 ressource de butin).');
  return { key, year: 4, interlude: key === 'printemps', title: `Préparation pour ${key === 'automne' ? 'l’automne' : key === 'hiver' ? 'l’hiver' : 'le printemps'} : les bandits`, items };
}

export function dismissReminder(s, key) {
  if (s?.campaign && !s.campaign.reminders.includes(key)) s.campaign.reminders.push(key);
  return s;
}

// Enregistre la fin de l'année. Égalité = défaite. Met à jour l'équipe et passe à l'année suivante si victoire.
export function recordResult(c, gc, { pat, human, date = new Date().toISOString() }) {
  if (gc.year !== c.year) throw new Error('année incohérente');
  const win = Number(human) > Number(pat);
  const critterOut = win && !gc.faceUp;
  c.games.push({ year: gc.year, level: c.level, critter: gc.critter, used: gc.activations > 0, pat: Number(pat), human: Number(human), refugeesLost: gc.refugeesLost || 0, win, date });
  if (critterOut) {
    c.roster = c.roster.filter((k) => k !== gc.critter);
    c.discard.push(gc.critter);
  }
  if (win) {
    if (c.year === 4) c.finished = true;
    else c.year++;
  }
  return { win, critterOut, year: gc.year, finished: c.finished };
}

export function yearStatus(c, n) {
  if (c.games.some((g) => g.year === n && g.win)) return 'gagnee';
  if (n === c.year && !c.finished) return 'en-cours';
  return n < c.year ? 'gagnee' : 'a-venir';
}

// Options de partie (logic.newGame) selon l'année.
export function gameOptions(c, extra = {}) {
  return { ...extra, level: c.level, mist: !!YEARS[c.year - 1].mist };
}
