#!/usr/bin/env python3
"""Repère les répliques mal prononcées et les régénère (meilleure de N prises).

La synthèse Piper est aléatoire : une même phrase sort parfois bafouillée ou tronquée, surtout avec la voix
« gilles » (modèle « low »). On fait transcrire chaque mp3 par faster-whisper, on compare au texte attendu,
et pour celles sous le seuil on génère N nouvelles prises et on garde la mieux comprise.
Usage : tools/voix/best.py --lines lines.json --audio audio [--preset gilles] [--seuil 0.75] [--prises 4]
Prérequis : pip install faster-whisper (modèle « small », hors ligne une fois téléchargé).
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys, tempfile, unicodedata
import numpy as np
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(__file__))
import render as R

UNITS = 'zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize'.split()
TENS = {20: 'vingt', 30: 'trente'}
def say(n):
    n = int(n)
    if n <= 16: return UNITS[n]
    if n < 20: return 'dix ' + UNITS[n - 10]
    t, u = divmod(n, 10)
    return TENS[t * 10] + ('' if u == 0 else (' et un' if u == 1 else ' ' + UNITS[u]))

def norm(s):
    s = re.sub(r'\d+', lambda m: say(m.group()), s.lower().replace('’', ' ').replace('-', ' '))
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    return re.sub(r'[^a-z ]', ' ', s).split()

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--lines', required=True); a.add_argument('--audio', default='audio')
    a.add_argument('--preset', default='gilles', choices=R.PRESETS)
    a.add_argument('--seuil', type=float, default=0.75); a.add_argument('--prises', type=int, default=4)
    a.add_argument('--bitrate', default='32k'); a.add_argument('--rapport')
    o = a.parse_args()
    asr = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    def score(text, mp3):
        pcm = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', mp3, '-af', 'loudnorm', '-f', 's16le',
                                                     '-ac', '1', '-ar', '16000', '-']), np.int16).astype(np.float32) / 32768
        hyp = ' '.join(s.text for s in asr.transcribe(pcm, language='fr', beam_size=5, condition_on_previous_text=False)[0])
        return round(difflib.SequenceMatcher(None, norm(text), norm(hyp)).ratio(), 2), hyp.strip()
    p = R.PRESETS[o.preset]; voice = R.load(p)
    report = []
    for it in json.load(open(o.lines)):
        f = os.path.join(o.audio, it['id'] + '.mp3')
        best, hyp = score(it['text'], f)
        before = best
        if best < o.seuil:
            with tempfile.TemporaryDirectory() as d:
                for k in range(o.prises):
                    c = os.path.join(d, f'{k}.mp3')
                    R.render(voice, p, it['text'], c, o.bitrate)
                    s, h = score(it['text'], c)
                    if s > best: best, hyp = s, h; shutil.copy(c, f)
                    if best >= 0.95: break
        report.append(dict(id=it['id'], avant=before, apres=best, texte=it['text'], entendu=hyp))
        if before < o.seuil: print(f"{it['id']}: {before} → {best}  « {hyp} »", file=sys.stderr, flush=True)
    if o.rapport: json.dump(report, open(o.rapport, 'w'), ensure_ascii=False, indent=1)
    bad = [r for r in report if r['apres'] < o.seuil]
    print(f"{len(report)} répliques, moyenne {sum(r['apres'] for r in report) / len(report):.2f}, {len(bad)} sous le seuil", file=sys.stderr)

if __name__ == '__main__':
    main()
