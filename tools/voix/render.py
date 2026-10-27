#!/usr/bin/env python3
"""Génère les répliques audio de Pat (Piper, hors ligne) + traitement « roi bandit ».

Usage :
  tools/voix/render.py --lines lines.json --out audio/ [--preset gilles]
  tools/voix/render.py --sample "texte" --out fichier.mp3 --preset gilles
lines.json : [{"id": "content-0", "text": "..."}]  (produit par tools/voix/lines.mjs)
"""
import argparse, json, os, subprocess, sys, tempfile, wave
from piper import PiperVoice, SynthesisConfig

VOICES = os.environ.get('PIPER_VOICES', '/workspace/tts-voices')

# Préréglages : modèle, locuteur, débit, semitons, chaîne de filtres ffmpeg
PRESETS = {
    # Tom : voix d'homme claire, grave de 3 demi-tons, un peu lente, chaleur + petite salle
    'tom': dict(model='fr_FR-tom-medium', speaker=None, length=1.12, noise=0.6, semis=-3,
                fx='lowshelf=g=4:f=180,equalizer=f=3000:t=q:w=1:g=-2,aecho=0.8:0.6:40|70:0.18|0.10'),
    # Gilles : voix plus rauque (modèle « low »), grave de 2 demi-tons.
    # Ce modèle ne connaît pas le tilde des voyelles nasales (« ̃ ») : on lit « an/on/in/un » comme voyelle + n,
    # et on calme le bruit (noise, noise_w) pour éviter qu'il bafouille ou rallonge la fin des phrases.
    'gilles': dict(model='fr_FR-gilles-low', speaker=None, length=1.1, noise=0.5, noise_w=0.5, nasal='n', semis=-2,
                   fx='lowshelf=g=3:f=200,aecho=0.8:0.6:45|80:0.15|0.08'),
    # Pierre (UPMC) : voix posée, grave de 3 demi-tons, plus de réverbération
    'pierre': dict(model='fr_FR-upmc-medium', speaker=1, length=1.1, noise=0.6, semis=-3,
                   fx='lowshelf=g=4:f=160,aecho=0.8:0.7:50|90:0.22|0.12'),
}

def load(p):
    return PiperVoice.load(os.path.join(VOICES, p['model'] + '.onnx'))

NASAL = '\u0303'

def synth_wav(voice, p, text, path):
    cfg = SynthesisConfig(speaker_id=p['speaker'], length_scale=p['length'], noise_scale=p['noise'],
                          noise_w_scale=p.get('noise_w'))
    if not p.get('nasal'):
        with wave.open(path, 'wb') as w:
            voice.synthesize_wav(text, w, syn_config=cfg)
        return
    import numpy as np
    rate = voice.config.sample_rate
    parts = []
    for sent in voice.phonemize(text):
        ph = []
        for c in sent:
            if c == NASAL: ph.append(p['nasal'])  # voyelle nasale → voyelle + n
            else: ph.append(c)
        parts.append(voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph), cfg))
        parts.append(np.zeros(int(rate * 0.2), dtype=np.float32))  # courte pause entre phrases
    a = (np.clip(np.concatenate(parts), -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(a.tobytes())

def render(voice, p, text, out_mp3, bitrate='40k'):
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        synth_wav(voice, p, text, tmp.name)
        ratio = 2 ** (p['semis'] / 12)
        af = (f"rubberband=pitch={ratio:.5f}:formant=preserved,{p['fx']},"
              "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.15")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-af', af, '-ac', '1', '-ar', '24000',
                        '-c:a', 'libmp3lame', '-b:a', bitrate, out_mp3], check=True)

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--lines'); a.add_argument('--sample'); a.add_argument('--out', required=True)
    a.add_argument('--preset', default='gilles', choices=PRESETS)
    a.add_argument('--bitrate', default='40k')
    o = a.parse_args()
    p = PRESETS[o.preset]; voice = load(p)
    if o.sample:
        render(voice, p, o.sample, o.out, o.bitrate); return
    items = json.load(open(o.lines)); os.makedirs(o.out, exist_ok=True)
    for k, it in enumerate(items):
        render(voice, p, it['text'], os.path.join(o.out, it['id'] + '.mp3'), o.bitrate)
        if k % 20 == 0: print(f"{k + 1}/{len(items)} {it['id']}", file=sys.stderr)

if __name__ == '__main__':
    main()
