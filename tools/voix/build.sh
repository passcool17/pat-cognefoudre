#!/usr/bin/env bash
# Régénère toutes les répliques audio de Pat (Piper, hors ligne) dans audio/.
# Prérequis : venv avec piper-tts (PIPER_PY), voix dans $PIPER_VOICES, ffmpeg avec rubberband.
# Usage : tools/voix/build.sh [preset]   (tom par défaut ; voir tools/voix/render.py)
set -euo pipefail
cd "$(dirname "$0")/../.."
PY=${PIPER_PY:-/workspace/tts-venv/bin/python}
PRESET=${1:-tom}
JOBS=${JOBS:-4}
TMP=$(mktemp -d)
node tools/voix/lines.mjs > "$TMP/lines.json"
node -e "const a=require('$TMP/lines.json');for(let k=0;k<$JOBS;k++)require('fs').writeFileSync('$TMP/l'+k+'.json',JSON.stringify(a.filter((_,i)=>i%$JOBS===k)))"
mkdir -p audio
for k in $(seq 0 $((JOBS-1))); do OMP_NUM_THREADS=2 "$PY" tools/voix/render.py --lines "$TMP/l$k.json" --out audio --preset "$PRESET" --bitrate 32k & done
wait
node tools/voix/manifest.mjs
rm -rf "$TMP"
