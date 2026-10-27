# Voix de Pat

Les voix viennent d’**ElevenLabs** (voix « C »), faites par le bot Voix. Il dépose les mp3 dans
`/workspace/shared/voix-pat/final/` :
- `<id>.mp3` pour chaque réplique sans nombre (`lignes-sans-nombres.json`, par ex. `content-0`) ;
- les morceaux des répliques avec un nombre (`segments.json`) : `seg-content-6-a|b` (cartes),
  `seg-content-12-a|b` (neige), `seg-grognon-10-a|b` (jetons) et `nombre-2` à `nombre-30`.
  L’app joue début + nombre + fin à la suite (`voice.js`, `audioChain`).

Le texte de la bulle reste celui de `pet.js`.

```
node tools/voix/import.mjs     # copie les mp3 ElevenLabs dans audio/ ; rapport : import-rapport.json
node tools/voix/manifest.mjs   # réécrit audio/liste.js et audio/liste.json
```
Un id encore absent garde l’ancienne prise Piper « gilles » (ou la synthèse vocale de l’appareil s’il n’y en a pas).
Quand les trois morceaux d’une réplique numérotée existent, son ancien fichier entier est retiré.
Après un import, augmenter `CACHE` dans `sw.js`.

Anciens outils (Piper « gilles », gardés pour mémoire) : `build.sh`, `render.py`, `lines.mjs`, `best.py`.
