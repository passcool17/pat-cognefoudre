# Pat Cognefoudre — l’automate lynx d’Everdell : Silverfrost

Application web (PWA) en français qui remplace les cartes Plan, Complot et Tactiques de **Pat Cognefoudre, le Roi des Bandits**, l’automate solo d’*Everdell : Silverfrost*.

**Jouer : https://passcool17.github.io/pat-cognefoudre/**

## Ce que fait l’app
- **Mise en place** : choix du niveau (1 à 4), mélange des cartes Plan / Complot / Tactiques, liste de mise en place et pile Quête de Pat (quêtes en plaine 🟩, en montagne 🟪).
- **Tour de Pat** : un bouton exécute tout l’algorithme (coin du Plan, quart du Complot, Tactiques, jeton Pat, Guilde, Balise, Voyage, préparation, passe). L’app nomme le lieu ; tu fais le geste sur le plateau.
- **Suivi** : ouvriers, jetons Pat, feu, neige, ville, cartes face cachée, journal, corrections manuelles.
- **Annuler**, sauvegarde automatique sur l’appareil, nouvelle partie (⚙️).
- **Score** de Pat avec les bonus du niveau ; en cas d’égalité, Pat gagne.
- **Règles** : aide-mémoire et liste des interprétations.

Fonctionne hors ligne une fois ouverte.

## Installer sur le téléphone
- **Android (Chrome)** : ouvre le lien, menu ⋮ → *Installer l’application* (ou *Ajouter à l’écran d’accueil*).
- **iPhone / iPad (Safari)** : ouvre le lien, bouton Partager → *Sur l’écran d’accueil*.

## Pat, compagnon de jeu
Pendant ton tour, Pat le roi bandit reste à l’écran : il respire, cligne des yeux, penche la tête et fait tomber la neige.
- **Il parle** au début de ton tour, parfois pendant (≈ 20-30 s, une fois sur quatre il se tait), puis s’impatiente si tu prends ton temps (50 s, puis toutes les 75 s). Touche Pat ou *Parler* pour une réplique.
- **Son humeur suit la partie** : 😼 Content de lui, 😾 Grognon (bloqué ce tour-ci ou partie difficile), ⏳ Impatient, 😴 Endormi (hiver), 👑 Triomphant, 🙄 Boudeur (à la fin, selon les scores). 96 répliques, 16 par humeur, sans répétition tant qu’une liste n’est pas épuisée.
- **Voix** : synthèse vocale de l’appareil (fr-CA de préférence, sinon fr-FR), grave et un peu lente. Réglages dans ⚙️ (activer, volume, tester) ; bouton 🔊/🔇 sous Pat. La bulle s’affiche toujours, même en muet ou hors ligne. Sur iPhone, la voix se débloque au premier toucher.
- L’humeur est une invention de l’app (elle ne change aucune règle) ; elle est enregistrée avec la partie et suit *Annuler*.

## Campagne solo « L’année du Lapin »
D’après **The Year of the Rabbit** d’Otto Gregor (campagne non officielle, fichiers sur [BoardGameGeek](https://boardgamegeek.com/boardgame/436821/everdell-silverfrost/files)). Merci à lui !
- **Carnet de campagne** (accueil → *Campagne solo*) : niveau de Pat, équipe de Grosses Créatures, défausse, allié de l’Année 2, historique des parties. Sauvegardé sur l’appareil.
- **Intro de chaque année** : récit, mise en place, règles et décompte de l’année ; on choisit la créature qui accompagne la partie.
- **Pendant la partie** : bandeau repliable (année, règles, créature) ; bouton « J’active ma créature » (elle se retourne) et « Quête de Guilde réussie » (Année 1, la remet face visible) ; rappels aux bons moments (réfugiés de l’Année 2, bandits de l’Année 4, interlude au printemps de l’Année 4) ; « +1 ouvrier pour Pat (réfugié) » (−5 PV pour toi en fin de partie).
- **Année 3 : la brume** : consignes ajoutées aux étapes concernées (carte de la vallée, balise, quête de Guilde, jetons Pat).
- **Fin d’année** : il faut battre Pat (l’égalité compte comme une défaite) ; on rejoue l’année en cas de défaite. Une créature finie face cachée part à la défausse. Épilogue après l’Année 4.
- Interprétations de la campagne (aussi listées dans l’onglet Règles) :
  - Les quêtes « bleues » de la campagne sont les Quêtes en montagne (publiques), les « vertes » les Quêtes en plaine.
  - Année 1 : au printemps, tu gagnes ton garde forestier + 1 ouvrier normal (les 2 ouvriers de la saison).
  - Années 2 et 4 : tu commences avec 1 garde forestier, 1 ouvrier normal et l’apprenti (3 figurines).
  - Année 2 : un réfugié qui rejoint les bandits devient tout de suite un ouvrier normal de Pat, utilisable dès cette saison. En fin de partie, il ne compte que pour le −5.
  - Année 3 : « un de ses propres objectifs » = la quête du haut de la pile Quête de Pat.
  - Année 3 : la neige d’une carte face cachée prise par Pat va dans sa réserve, comme d’habitude.
  - Année 3 : la campagne ne dit rien des jetons Pat. L’app garde l’ordre habituel sur les cartes face visible et, s’il n’y en a aucune, applique l’ordre des cartes face cachée.
  - Année 4 : les bandits ne touchent que toi. Pat n’en reçoit pas et n’en chasse pas.
  - Pas de score cumulé : seule compte la victoire de chaque année.
  - Les noms des Grosses Créatures sont ceux de la campagne (anglais) ; la VF des cartes n’a pas été vérifiée.

## Interprétations (à confirmer)
- On lit le quart du Complot qui recouvre le coin du Plan en cours.
- Niveau 4 : pile de 3 quêtes en plaine + 1 en montagne.
- Carte Tactiques : pas de rebouclage par défaut (option dans ⚙️). Au bout de la liste, Pat joue la carte du coin (+1 neige).
- « Balise ? » de la carte Tactiques : valeur de balise du Complot en cours.
- Guilde sans quête possible : l’ouvrier se déplace avec la carte Tactiques.
- Printemps, tous les ouvriers posés et moins de 15 cartes : les cases ouvrier deviennent des cartes (+1 neige).
- Ouvriers de départ en été : réglable, 2 par défaut (page 6 non numérisée).
- Fureur de l’hiver déclenchée par Pat : non traitée.

## Développement
Vanilla HTML/CSS/JS, sans dépendance à l’exécution.
```
npm test            # tests de la logique (node --test)
npm run serve       # serveur local
npm run test:e2e    # parties complètes dans Chrome (téléphone + tablette), BASE_URL=http://localhost:8765/
npm run test:campagne-e2e  # campagne complète (4 années, une défaite) sur téléphone et tablette
npm run test:pet-e2e  # compagnon : réplique, toucher, minuterie (horloge simulée), muet, réglages voix
```
Les images de cartes ne sont pas incluses : les cartes sont encodées comme données.
