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
Pendant ton tour, Pat le roi bandit reste à l’écran, sans cadre, fondu dans la neige : une courte vidéo en boucle par humeur (ajuste sa couronne, tapote son marteau, tape du pied, bâille sous la neige, brandit son marteau, croise les bras), et sa gueule s’ouvre quand il parle.
- **Il parle** au début de ton tour, parfois pendant (≈ 20-30 s, une fois sur quatre il se tait), puis s’impatiente si tu prends ton temps (50 s, puis toutes les 75 s). Touche Pat ou *Parler* pour une réplique.
- **Son humeur suit la partie** : 😼 Content de lui, 😾 Grognon (bloqué ce tour-ci ou partie difficile), ⏳ Impatient, 😴 Endormi (hiver), 👑 Triomphant, 🙄 Boudeur (à la fin, selon les scores). 96 répliques, 16 par humeur, sans répétition tant qu’une liste n’est pas épuisée.
- **Voix** : synthèse vocale de l’appareil (fr-CA de préférence, sinon fr-FR), grave et un peu lente. Réglages dans ⚙️ (activer, volume, tester) ; bouton 🔊/🔇 sous Pat. La bulle s’affiche toujours, même en muet ou hors ligne. Sur iPhone, la voix se débloque au premier toucher.
- **Bouche** : dessinée par-dessus la vidéo (canvas) et calée sur le museau image par image (`avatar-tracks.js`). Avec une voix enregistrée, elle suit le volume réel (Web Audio, `AnalyserNode`) ; avec la synthèse vocale ou en muet, elle bouge en rythme minuté. Mouvement réduit (réglage système) : image fixe, seule la bouche bouge.
- L’humeur est une invention de l’app (elle ne change aucune règle) ; elle est enregistrée avec la partie et suit *Annuler*.

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
npm run test:pet-e2e  # compagnon : réplique, toucher, minuterie (horloge simulée), muet, réglages voix
npm run test:realiste-e2e  # Pat réaliste : vidéo par humeur, bouche minutée et audio, mouvement réduit
```
### Pat réaliste
- `video/pat-<humeur>.webm|mp4|jpg` : boucles de 5-6 s (VP9 + H.264, 600×800), image d’attente. Le service worker met en cache le format lu par l’appareil et répond aux requêtes « Range » (Safari).
- `tools/realiste/track.py` et `build_tracks.py` (OpenCV) : suivi du museau dans chaque vidéo → `avatar-tracks.js`.
- Brancher une voix enregistrée : au début de la lecture, `window.dispatchEvent(new CustomEvent('pat:audio', { detail: audio }))` (élément `<audio>` de même origine).
Les images de cartes ne sont pas incluses : les cartes sont encodées comme données.
