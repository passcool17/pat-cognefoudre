#!/usr/bin/env bash
# Encode les boucles peintes de Créa (720x960, 24 i/s) pour le web : 540x720, webm VP9 + mp4 H.264, sans audio,
# plus une affiche JPEG par humeur (1re image de la boucle « repos »).
# Usage : tools/anim/encode.sh [dossier source]   (défaut : /workspace/shared/voix-pat/anim)
set -euo pipefail
SRC="${1:-/workspace/shared/voix-pat/anim}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/video"
mkdir -p "$OUT"
for mood in content grognon boudeur impatient endormi triomphant; do
  for kind in repos parle; do
    in="$SRC/pat-$mood-$kind.mp4"; base="$OUT/pat-$mood-$kind"
    ffmpeg -v error -y -i "$in" -an -vf "scale=540:720:flags=lanczos" -c:v libx264 -profile:v main -preset slow -crf 28 \
      -pix_fmt yuv420p -g 24 -movflags +faststart "$base.mp4"
    ffmpeg -v error -y -i "$in" -an -vf "scale=540:720:flags=lanczos" -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 \
      -deadline good -cpu-used 2 -g 24 -pix_fmt yuv420p "$base.webm"
  done
  ffmpeg -v error -y -i "$SRC/pat-$mood-repos.mp4" -frames:v 1 -vf "scale=540:720:flags=lanczos" -q:v 5 "$OUT/pat-$mood.jpg"
done
ls -l "$OUT"
