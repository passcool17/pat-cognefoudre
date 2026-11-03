# Scènes Rive de Pat (v1.10.0)

`python3 gen.py <humeur>` lit les 19 calques PNG de `$ART/<humeur>/` (par défaut `../pat-rive-art`), les recadre en WebP
et écrit `pat-<humeur>/{rive.yaml, scene.rml, img/}` : squelette, respiration, clignement, 7 bouches (nombre `bouche`)
et 5 réactions (déclencheurs `tourPat`, `points`, `fureur`, `gagne`, `perd`) dans le modèle de vue « Pat ».
Boudeur : oreilles repliées, pivot propre (`OVR`). Puis `rive pat-<humeur> --once` (CLI Rive 1.8) →
`pat-<humeur>/build/pat-<humeur>.riv`, à copier dans `rive/`.
