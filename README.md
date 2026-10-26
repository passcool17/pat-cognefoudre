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
```
Les images de cartes ne sont pas incluses : les cartes sont encodées comme données.
