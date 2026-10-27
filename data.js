// Données transcrites depuis regles-pat.md (cartes Plan, Complot, Tactiques).
// Coins des Plans dans le sens horaire : 0 = haut-gauche, 1 = haut-droite, 2 = bas-droite, 3 = bas-gauche.
// 'O' = placer un ouvrier (patte), 'C' = jouer une carte.

export const CORNERS = ['HG', 'HD', 'BD', 'BG'];

export const PLANS = [
  { id: 'P1', corners: ['C', 'O', 'C', 'O'], cave: 3, arrow: 'bas' },
  { id: 'P2', corners: ['O', 'C', 'C', 'O'], cave: 3, arrow: 'bas' },
  { id: 'P3', corners: ['O', 'C', 'O', 'C'], cave: 0, arrow: 'bas' },
  { id: 'P4', corners: ['O', 'C', 'C', 'O'], cave: 0, arrow: 'bas' },
  { id: 'P5', corners: ['O', 'O', 'C', 'C'], cave: 1, arrow: 'bas' },
  { id: 'P6', corners: ['O', 'C', 'O', 'C'], cave: 2, arrow: 'bas' },
  { id: 'P7', corners: ['O', 'C', 'O', 'C'], cave: 2, arrow: 'haut' },
  { id: 'P8', corners: ['C', 'O', 'O', 'C'], cave: 1, arrow: 'haut' },
];

// Lieux : bouleau3, mousse2, cuivre1, gland2, forge, guilde, voyHaut, voyBas, voy2, bal{n}{g|d}
// Source : V = Vallée, P = pile principale. Couleurs : violet, bleu, rouge, beige, vert.
const Q = (s) => {
  const [loc, src] = s.split('/');
  return { loc, src: src === 'P' ? 'pile' : 'vallee' };
};
const C = (id, hg, hd, bg, bd, colors) => ({
  id,
  // indexé par coin du Plan (HG, HD, BD, BG)
  quarters: [Q(hg), Q(hd), Q(bd), Q(bg)],
  colors: colors.split(','),
});

export const COMPLOTS = [
  C('C1', 'gland2/V', 'bouleau3/P', 'forge/V', 'bal2d/V', 'violet,bleu,rouge,beige,vert'),
  C('C2', 'voyHaut/P', 'bal1g/V', 'mousse2/V', 'forge/P', 'violet,bleu,rouge,vert,beige'),
  C('C3', 'mousse2/P', 'forge/P', 'guilde/V', 'bal2d/V', 'beige,bleu,rouge,violet,vert'),
  C('C4', 'bouleau3/V', 'guilde/P', 'forge/V', 'bal2d/P', 'beige,bleu,rouge,vert,violet'),
  C('C5', 'bouleau3/V', 'bouleau3/P', 'forge/V', 'bal2d/P', 'beige,bleu,rouge,vert,violet'),
  C('C6', 'bal3g/P', 'gland2/V', 'bal3g/P', 'mousse2/P', 'beige,bleu,rouge,violet,vert'),
  C('C7', 'bal3g/P', 'gland2/V', 'bal3g/P', 'forge/P', 'beige,bleu,rouge,violet,vert'),
  C('C8', 'bal1d/P', 'bouleau3/V', 'voy2/V', 'gland2/P', 'violet,vert,rouge,bleu,beige'),
  C('C9', 'voy2/P', 'cuivre1/P', 'guilde/P', 'bal2g/V', 'violet,bleu,rouge,beige,vert'),
  C('C10', 'bal2g/P', 'guilde/P', 'forge/P', 'voyHaut/V', 'vert,beige,bleu,rouge,violet'),
  C('C11', 'mousse2/V', 'bouleau3/P', 'cuivre1/P', 'bal2g/V', 'rouge,vert,beige,bleu,violet'),
  C('C12', 'cuivre1/V', 'mousse2/P', 'bal1g/V', 'bouleau3/P', 'bleu,vert,beige,violet,rouge'),
  C('C13', 'voyHaut/P', 'guilde/P', 'forge/P', 'bal3g/V', 'vert,beige,bleu,rouge,violet'),
  C('C14', 'guilde/V', 'bal1d/P', 'voyHaut/P', 'forge/P', 'vert,rouge,violet,bleu,beige'),
  C('C15', 'bal3d/P', 'forge/P', 'cuivre1/V', 'guilde/V', 'rouge,vert,bleu,violet,beige'),
  C('C16', 'guilde/V', 'bal2g/P', 'voy2/P', 'gland2/V', 'rouge,vert,bleu,violet,beige'),
  C('C17', 'forge/V', 'mousse2/P', 'bal3g/V', 'bouleau3/P', 'bleu,vert,beige,violet,rouge'),
  C('C18', 'bal1d/P', 'mousse2/V', 'gland2/P', 'voy2/V', 'violet,vert,rouge,bleu,beige'),
  C('C19', 'mousse2/P', 'gland2/V', 'bal2g/P', 'mousse2/P', 'vert,beige,violet,bleu,rouge'),
  C('C20', 'gland2/V', 'voyBas/P', 'guilde/V', 'bal1d/P', 'violet,rouge,vert,beige,bleu'),
];

// Carte Tactiques, de haut en bas.
export const TACTIQUES = ['forge', 'bouleau3', 'mousse2', 'cuivre1', 'gland2', 'guilde', 'balD', 'voyage', 'balG'];

export const COLORS = {
  violet: { label: 'violette (Prospérité)', short: 'Violet', hex: '#7b4fa8' },
  bleu: { label: 'bleue (Gouvernance)', short: 'Bleu', hex: '#3a76b8' },
  rouge: { label: 'rouge (Destination, lieu exclusif)', short: 'Rouge', hex: '#b8322f' },
  beige: { label: 'beige (Voyageur)', short: 'Beige', hex: '#a8946a' },
  vert: { label: 'verte (Production)', short: 'Vert', hex: '#4f9a45' },
};

export const SEASONS = ['ete', 'automne', 'hiver', 'printemps'];
export const SEASON_LABEL = { ete: 'Été', automne: 'Automne', hiver: 'Hiver', printemps: 'Printemps' };
export const SEASON_ARTICLE = { ete: "l'été", automne: "l'automne", hiver: "l'hiver", printemps: 'le printemps' };
// Ouvriers gagnés en se préparant (livret p.14)
export const WORKER_GAIN = { automne: 1, hiver: 1, printemps: 2 };
// Cartes Tempête de neige retournées à 2 joueurs (livret p.14)
export const STORM_CARDS = { automne: 2, hiver: 3, printemps: 1 };

// Pile Quête de Pat : 5 quêtes, livret Silverfrost p.17 (niveau 4 : 3 en plaine + 2 en montagne)
export const QUEST_PILE = { 1: { plaine: 5, montagne: 0 }, 2: { plaine: 4, montagne: 1 }, 3: { plaine: 4, montagne: 1 }, 4: { plaine: 3, montagne: 2 } };
// Bonus de fin de partie par niveau (§9)
export const LEVEL_BONUS = { 1: { violet: 2, feu: 0, cachee: 0 }, 2: { violet: 3, feu: 1, cachee: 1 }, 3: { violet: 5, feu: 1, cachee: 1 }, 4: { violet: 6, feu: 1, cachee: 1 } };

export const PAT_TOKENS = 10;
