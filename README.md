# Pat Cognefoudre — l’automate lynx d’Everdell : Silverfrost

Application web (PWA) en français qui remplace les cartes Plan, Complot et Tactiques de **Pat Cognefoudre, le Roi des Bandits**, l’automate solo d’*Everdell : Silverfrost*.

**Jouer : https://passcool17.github.io/pat-cognefoudre/**

## Ce que fait l’app
- **Mise en place** : choix du niveau (1 à 4), mélange des cartes Plan / Complot / Tactiques, liste de mise en place et pile Quête de Pat (quêtes en plaine 🟩, en montagne 🟪).
- **Tour de Pat** : un bouton exécute tout l’algorithme (coin du Plan, quart du Complot, Tactiques, jeton Pat, Guilde, Balise, Voyage, préparation, passe). L’app nomme le lieu ; tu fais le geste sur le plateau.
- **Suivi** : ouvriers, jetons Pat, feu, neige, ville, cartes face cachée, journal, corrections manuelles.
- **Annuler**, sauvegarde automatique sur l’appareil, nouvelle partie (⚙️).
- **Score** de Pat avec les bonus du niveau ; en cas d’égalité, Pat gagne.
- **Règles** : ① la base Everdell, ② ce que *Silverfrost* change (résumé), ③ le mode solo de Pat par-dessus, les précisions du livret (avec les pages), les réponses du concepteur et les décisions de Pascal.

Fonctionne hors ligne une fois ouverte.

## Règles en trois couches (v1.7.0, précisions v1.7.1)

Source principale : le livret officiel *Everdell: Silverfrost* (2025, 24 p., règles solo p.17-21). Le résumé « Silverfrost vs Everdell » et le livret *Everdell* de 2018 ne servent qu’en appui.

1. **Everdell** : la base. Ce que Silverfrost ne change pas reste vrai : une action par tour, lieux exclusifs/partagés, ville de 15 cartes, main de 8 cartes (carte donnée à une main pleine → défaussée), Vallée réapprovisionnée tout de suite, préparation quand tous les ouvriers sont posés, rien ne se donne à un joueur qui a passé.
2. **Silverfrost** : neige, garde forestier, Vallée à doubles empilés, Guilde et quêtes au lieu des Événements, balises, cheminées (à la place des jetons « occupé »), cartes rouges, joueur à ta gauche.
3. **Mode solo de Pat** : par-dessus les deux.

Ce qui change dans l’app :
- **Garde forestier de Pat** : +1 feu sauf si *ton* ouvrier est sur le lieu (p.19 et p.21). Bouton « Ton ouvrier est déjà là ».
- **Vallée** : les doubles sont empilés, 8 cartes différentes toujours visibles ; pour Pat, une pile = la carte du dessus (choix de carte, jeton Pat, prise en se préparant).
- **Pas d’Événements** : la Guilde des Forestiers et ses quêtes. Quêtes en montagne publiques, au premier qui la réalise (le journal le rappelle quand Pat en prend une) ; quêtes en plaine personnelles.
- **Cartes rouges** : lieu principal réservé à celui qui a joué la carte ; les Créatures rouges ont un lieu Communauté pour les adversaires (+1 point au propriétaire). L’app compte les couleurs de la ville de Pat et le rappelle au journal.
- **Joueur à ta gauche = Pat** (Suivi) : comparaison de sa progression et dons (feu gardé, carte face cachée sans limite car Pat n’a pas de main, autre ressource → réserve). Rien ne se donne à Pat après qu’il a passé.
- **Neige, balises, cheminées** : résumés dans l’onglet Règles ; Pat déblaie gratuitement et n’utilise pas de cheminée.

## Intro de Pat

À chaque ouverture : écran plein avec Pat grognon, le titre et un gros bouton **Entrer** (les navigateurs exigent un toucher pour le son). Au toucher, la musique entre en fondu, Pat passe en boucle « parle » et dit « Grrr… Je suis Pat Cognefoudre, le Roi des Bandits. Tu m’entends bien ? » (voix enregistrée, sous-titrée), puis l’intro s’efface vers l’app. **Passer ›** en haut à droite. Dans ⚙️ → 🎬 Intro : la couper à l’ouverture, ou **Revoir l’intro**. Paramètre d’URL `?intro=0` / `?intro=1` pour forcer.

## Installer sur le téléphone
- **Android (Chrome)** : ouvre le lien, menu ⋮ → *Installer l’application* (ou *Ajouter à l’écran d’accueil*).
- **iPhone / iPad (Safari)** : ouvre le lien, bouton Partager → *Sur l’écran d’accueil*.

## Plein écran

- Bouton ⛶ en haut à droite (à côté des réglages) : plein écran dans Brave, Chrome, Firefox, Android. Si tu l’avais activé, l’app propose « Revenir en plein écran » à la réouverture (le navigateur exige un toucher).
- App installée : elle s’ouvre directement sans barres (`display: fullscreen`), le bouton est alors masqué.
- iPhone : Safari ne permet pas le plein écran d’une page ; ajoute l’app à l’écran d’accueil (Partager → Sur l’écran d’accueil) pour l’ouvrir sans barres.

## Musique de fond

Musique : *Snowbound Pass*, par passcool17 (instrumental fait avec Suno).
- Elle démarre au premier toucher (règle des navigateurs) et tourne en boucle pendant la partie, à volume modeste (28 %).
- Quand Pat parle (réplique simple ou numérotée en 3 morceaux), elle baisse à 10 % en 300 ms, puis remonte.
- Bouton 🎵 en haut (barré quand elle est coupée) et volume dans ⚙️ → 🎵 Musique. Ces réglages sont gardés sur l’appareil et ne dépendent pas du muet de la voix.
- Elle se met en pause quand l’app passe en arrière-plan, puis reprend au retour.
- Hors ligne : le service worker garde le fichier après sa première lecture (il n’est pas préchargé à l’installation).
- iPhone : la musique suit le bouton silencieux de l’appareil (en mode silencieux, on ne l’entend pas).

Pendant ton tour, Pat le roi bandit reste à l’écran, sans cadre, fondu dans la neige : un Pat peint (boucles de Créa) par humeur, avec deux boucles de 4,5 s chacune, « repos » quand il se tait et « parle » (gueule animée) quand on l’entend. Fondu d’environ 200 ms entre repos et parle, et entre humeurs.
- **Il parle** au début de ton tour, parfois pendant (≈ 20-30 s, une fois sur quatre il se tait), puis s’impatiente si tu prends ton temps (50 s, puis toutes les 75 s). Touche Pat ou *Parler* pour une réplique.
- **Son humeur suit la partie** : 😼 Content de lui, 😾 Grognon (bloqué ce tour-ci ou partie difficile), ⏳ Impatient, 😴 Endormi (hiver), 👑 Triomphant, 🙄 Boudeur (à la fin, selon les scores). 96 répliques, 16 par humeur, sans répétition tant qu’une liste n’est pas épuisée.
- **Voix enregistrée** : chaque réplique est un petit mp3 (`audio/`) fait avec ElevenLabs (voix « C », préparée par le bot Voix). Elle marche dans tous les navigateurs (Brave sous Linux compris) et hors ligne : le service worker garde les fichiers en cache. Si un fichier manque, la synthèse vocale de l’appareil prend le relais (fr-CA, sinon fr-FR). Réglages dans ⚙️ (activer, volume, tester) ; bouton 🔊/🔇 sous Pat. La bulle s’affiche toujours, avec le texte de la réplique. La lecture se débloque au premier toucher (iPhone, Brave).
- **Répliques avec un nombre** (cartes 3 à 30, neige 2 à 25, jetons 2 à 10) : trois morceaux enchaînés sur le même lecteur audio, début + nombre + fin (par ex. `seg-content-6-a` + `nombre-12` + `seg-content-6-b`), avec ≈ 80 ms de blanc ; Pat reste en boucle « parle » tout du long. Le morceau suivant est chargé d’avance. En dessous ou au-dessus des valeurs prévues, la réplique n’est pas proposée (jamais « 0 cartes »). Singulier/pluriel gérés dans le texte.
- **Animation** : deux vidéos superposées ; la boucle suivante apparaît par-dessus l’ancienne, qui reste dessous jusqu’à la fin du fondu (pas de trou). Entre repos et parle de la même humeur, on reprend au même instant de la boucle. Si la vidéo ne peut pas se lire, l’image fixe de l’humeur reste affichée. Mouvement réduit (réglage système) : image fixe.
- L’humeur est une invention de l’app (elle ne change aucune règle) ; elle est enregistrée avec la partie et suit *Annuler*.

## Campagne solo « L’année du Lapin »
D’après **The Year of the Rabbit** d’Otto Gregor (campagne non officielle, fichiers sur [BoardGameGeek](https://boardgamegeek.com/boardgame/436821/everdell-silverfrost/files)). Merci à lui !
- **Carnet de campagne** (accueil → *Campagne solo*) : niveau de Pat, équipe de Grosses Créatures, défausse, allié de l’Année 2, historique des parties. Sauvegardé sur l’appareil.
- **Intro de chaque année** : récit, mise en place, règles et décompte de l’année ; on choisit la créature qui accompagne la partie.
- **Pendant la partie** : bandeau repliable (année, règles, créature) ; bouton « J’active ma créature » (elle se retourne) et « Quête de Guilde réussie » (Année 1, la remet face visible) ; rappels aux bons moments (réfugiés de l’Année 2, bandits de l’Année 4, interlude au printemps de l’Année 4) ; « +1 ouvrier pour Pat (réfugié) » (−5 PV pour toi en fin de partie).
- **Année 3 : la brume** : consignes ajoutées aux étapes concernées (carte de la vallée, balise, quête de Guilde, jetons Pat).
- **Fin d’année** : il faut battre Pat (l’égalité compte comme une défaite) ; on rejoue l’année en cas de défaite. Une créature finie face cachée part à la défausse. Épilogue après l’Année 4.
- Précisions de la campagne (aussi dans l’onglet Règles), vérifiées dans le texte de la campagne et le livret :
  - Quêtes « bleues » = Quêtes en montagne (publiques), « vertes » = Quêtes en plaine (campagne Année 1 ; livret p.6).
  - Année 1 : ton garde forestier est l’un de tes 2 nouveaux ouvriers du printemps (campagne Année 1 ; livret p.6).
  - Années 2 et 4 : 1 garde forestier, 1 ouvrier normal et l’apprenti, soit 3 figurines (campagne).
  - Année 2 : un réfugié qui rejoint les bandits va dans la réserve d’ouvriers de Pat (ouvrier normal, garde forestier toujours en dernier) ; en fin de partie, il ne compte que pour le −5 (campagne Année 2 ; livret p.19).
  - Année 3 : « un de ses propres objectifs » = la quête du haut de la pile Quête de Pat (campagne ; livret p.17 et p.19). La neige d’une carte face cachée prise par Pat va dans sa réserve (campagne).
  - Année 4 : les bandits arrivent avec la neige de ta ville ; Pat n’a jamais de neige dans sa ville, donc pas de bandits (campagne ; livret p.21).
  - Année 4 : un bandit sur un lieu où Pat envoie un ouvrier est traité comme la neige : Pat le chasse gratuitement, il retourne dans la réserve de bandits, sans butin (campagne : « Bandits work exactly like snow » ; livret p.19). L’app le rappelle à l’étape « Pat place un ouvrier ».
  - Pas de score cumulé : il faut battre Pat chaque année (campagne).
  - Noms des Grosses Créatures : ceux de la campagne (en anglais).
- Décision de Pascal :
  - Année 3 : jeton Pat dans la brume, ordre habituel sur les cartes face visible, sinon ordre des cartes face cachée.

## Précisions du livret (mode solo)
- On lit le quart du Complot qui recouvre le coin du Plan en cours (schéma p.18).
- En été, Pat a 2 ouvriers : 1 ouvrier normal + le garde forestier (mise en place p.6), puis +1 en automne, +1 en hiver, +2 au printemps.
- Pile Quête de Pat (p.17) : niveau 1 = 5 en plaine ; niveaux 2 et 3 = 4 + 1 en montagne ; niveau 4 = 3 + 2.
- « Balise ? » de la carte Tactiques : valeur de balise ailleurs sur le Complot en cours (p.19).
- Guilde sans quête possible : la carte Tactiques déplace l’ouvrier, et un jeton Pat va dans la Vallée (p.19).
- Plus d’ouvriers (au printemps aussi, tant qu’il a moins de 15 cartes) : les cases ouvrier deviennent des cartes (+1 neige) (p.19 et p.21).
- Jeton Pat sur une pile de doubles : Pat prend toute la pile en se préparant ou en fin de partie (p.20).
- Dons à Pat : il garde le feu (p.21), une carte va face cachée (p.20), toute autre ressource retourne à la réserve (p.19 et p.21).

## Réponses du concepteur (BGG, juill. 2025)
Réponses de chris (@iomio, badge Designer) sur BoardGameGeek, 22 juillet 2025 :
- Pat ne gagne pas de feu quand il se prépare pour la saison (l’app ne lui en donne pas).
- Bout de la liste Tactiques (par exemple, ouvrier déjà sur la balise du bas) : c’est la flèche qui donne le sens sur la carte Tactiques, Pat ne joue pas de carte à la place. L’app suit la flèche du Plan ; arrivée au bout de la liste, elle repart du lieu bloqué dans l’autre sens. Seul cas restant : tous les lieux bloqués dans les deux sens (théorique). Pat joue alors une carte (+1 neige).
- Leaf Ranger (« ton adversaire peut piocher une carte de la Vallée ») : la carte va face cachée chez Pat (bouton « il pioche » de l’onglet Suivi).

## Décision de Pascal (règle de base p.14)
- Fureur de l’hiver : Pat compte comme un joueur. S’il est le premier à se préparer pour l’hiver, il la déclenche : on retourne la tuile sur 2 feux et on remplace les Grosses Créatures visibles. L’app le rappelle à l’étape « Pat se prépare pour l’hiver ».

## Développement
Vanilla HTML/CSS/JS, sans dépendance à l’exécution.
```
npm test            # tests de la logique (node --test)
npm run serve       # serveur local
npm run test:e2e    # parties complètes dans Chrome (téléphone + tablette), BASE_URL=http://localhost:8765/
npm run test:campagne-e2e  # campagne complète (4 années, une défaite) sur téléphone et tablette
npm run test:pet-e2e  # compagnon : réplique, toucher, minuterie (horloge simulée), muet, réglages voix, lecture audio réelle, secours synthèse
npm run test:realiste-e2e  # Pat peint : repos/parle pendant l’audio, humeurs, réplique numérotée en 3 morceaux, mouvement réduit, vidéo en panne
npm run test:plein-ecran-e2e  # plein écran : bouton, bascule, retour proposé, API absente, app installée, astuce iPhone
npm run test:musique-e2e  # musique : premier toucher, baisse quand Pat parle (chaîne comprise), rampes, 🎵 et volume mémorisés, onglet caché, hors ligne
npm run test:intro-e2e  # intro : Entrer (musique, Pat parle, sous-titre), Passer, réglage ⚙️, Revoir, iPhone, vidéo de démo intro-demo.mp4
npm run test:regles-e2e  # règles Silverfrost : onglet Règles, garde forestier, Vallée, joueur à ta gauche
```
Voix : les mp3 viennent d’ElevenLabs (voix « C », faite par le bot Voix), déposés dans `/workspace/shared/voix-pat/final/` (`<id>.mp3`, plus les morceaux de `segments.json`). Pour les importer :
```
node tools/voix/import.mjs     # copie les voix ElevenLabs dans audio/ ; un id absent garde l’ancienne prise ; rapport dans tools/voix/import-rapport.json
node tools/voix/manifest.mjs   # réécrit audio/liste.js et audio/liste.json
```
Si tu modifies une réplique dans `pet.js`, il faut redemander le mp3 au bot Voix. (`tools/voix/build.sh`, `best.py` et `render.py` sont les anciens outils Piper « gilles », gardés pour mémoire.) Puis augmenter `CACHE` dans `sw.js` pour que les téléphones récupèrent les nouveaux fichiers.

### Musique
- `music/musique-fond.mp3` : *Snowbound Pass* réencodé en mp3 96 kb/s stéréo (≈ 2,0 Mo, 2 min 54 s) par `tools/musique/encode.sh` (ffmpeg), depuis `/workspace/shared/voix-pat/musique/musique-fond.mp3`.
- Boucle sans blanc : la fin du morceau (fondu de sortie) est fondue dans ses 4 premières secondes (intro calme), et le fichier commence 4 s après le début du morceau. La dernière seconde enchaîne donc naturellement sur la première.
- `music.js` lit le fichier décodé en Web Audio (`AudioBufferSourceNode` en boucle, en sautant le silence ajouté par l’encodeur) et règle le volume avec un `GainNode` (rampes). Sans Web Audio : élément `<audio loop>`.

### Pat peint (vidéos)
- `video/pat-<humeur>-repos|parle.webm|mp4` : boucles de Créa, série v3 (œil gauche aveugle et balafré ; 4,5 s, 24 i/s) réduites en 540×720, VP9 + H.264 ; `video/pat-<humeur>.jpg` : image fixe. Réencoder : `tools/anim/encode.sh /workspace/shared/voix-pat/anim/v3` (ffmpeg).
- Hors ligne sans tout télécharger d’un coup : à l’installation, le service worker garde l’app, les voix et les images fixes ; il ajoute ensuite le couple repos/parle de « content » dans le format lu par l’appareil, puis chaque boucle au moment où elle est lue la première fois. Il répond aux requêtes « Range » (Safari).
- `voice.js` émet `pat:voix` (`{ on: true|false }`) au début et à la fin d’une réplique audio (chaîne comprise) ; `avatar.js` passe alors en « parle » ou en « repos ».

Les images de cartes ne sont pas incluses : les cartes sont encodées comme données.
