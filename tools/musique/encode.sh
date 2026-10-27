#!/usr/bin/env bash
# Musique de fond « Snowbound Pass » (passcool17, faite avec Suno) → boucle web sans couture.
# La fin du morceau s'éteint (≈ 2 s) et le début est un intro calme : on fond les X dernières secondes
# dans les X premières, et la boucle commence à X s. Lue en boucle par Web Audio (sans blanc entre deux tours).
# Usage : tools/musique/encode.sh [source.mp3]
set -euo pipefail
SRC="${1:-/workspace/shared/voix-pat/musique/musique-fond.mp3}"
OUT="$(dirname "$0")/../../music/musique-fond.mp3"
X=4
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
ffmpeg -loglevel error -y -i "$SRC" -i "$SRC" -filter_complex \
  "[0:a]aresample=44100,atrim=start=${X},asetpts=PTS-STARTPTS[body];[1:a]aresample=44100,atrim=0:${X},asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=${X}:c1=qsin:c2=qsin[out]" \
  -map "[out]" -ac 2 -c:a libmp3lame -b:a 96k -id3v2_version 3 \
  -metadata title="Snowbound Pass" -metadata artist="passcool17" "$OUT"
echo "$OUT : $(du -h "$OUT" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s (source $T s)"
