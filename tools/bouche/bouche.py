#!/usr/bin/env python3
"""Fabrique la boucle « bouche » de chaque humeur à partir des boucles peintes de Créa (aucune nouvelle image).
Pour chaque image t de la boucle « repos » : on cherche dans la boucle « parle » une image où la bouche est ouverte
et où la tête a presque la même pose ; on prend sa bouche, on la recale sur le nez de l'image repos et on la fond
avec un masque elliptique doux. Le reste de l'image = repos, image pour image.
L'app superpose cette boucle à « repos » (même tempo) et règle son opacité selon les repères Rhubarb.
Usage : tools/bouche/bouche.py SRC_DIR OUT_DIR [humeurs…]  → OUT_DIR/<humeur>/fNNNN.png"""
import sys, os, cv2, numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]
MOODS = sys.argv[3:] or ['content', 'grognon', 'boudeur', 'impatient', 'endormi', 'triomphant']

def frames(p):
    c = cv2.VideoCapture(p); out = []
    while True:
        ok, f = c.read()
        if not ok: break
        out.append(f)
    return out
def crop(f, x, y, w, h): return f[y - h // 2: y - h // 2 + h, x - w // 2: x - w // 2 + w]

for mood in MOODS:
    R = frames(f'{SRC}/pat-{mood}-repos.mp4'); P = frames(f'{SRC}/pat-{mood}-parle.mp4')
    n = min(len(R), len(P)); R, P = R[:n], P[:n]
    H, W = R[0].shape[:2]
    g = lambda f: cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gR, gP = [g(f) for f in R], [g(f) for f in P]
    # Nez : la tache rose la plus saturée de la zone du visage (repos, image 0) → gabarit suivi partout.
    hsv = cv2.cvtColor(R[0], cv2.COLOR_BGR2HSV).astype(np.float32)
    pink = ((hsv[..., 0] < 12) | (hsv[..., 0] > 165)) * hsv[..., 1] * (hsv[..., 2] > 110)
    zone = np.zeros_like(pink); y0, y1, x0, x1 = int(H * .30), int(H * .55), int(W * .22), int(W * .62)
    zone[y0:y1, x0:x1] = cv2.GaussianBlur(pink[y0:y1, x0:x1], (0, 0), W / 70)
    ny0, nx0 = np.unravel_index(np.argmax(zone), zone.shape)
    tw, th = int(W * .30), int(H * .13)            # nez + yeux (ne bouge pas quand la bouche s'ouvre)
    ref = crop(gR[0], nx0, ny0 - int(H * .03), tw, th)
    S = int(W * .14)
    def nose(gf):
        win = crop(gf, nx0, ny0 - int(H * .03), tw + 2 * S, th + 2 * S)
        _, _, _, (mx, my) = cv2.minMaxLoc(cv2.matchTemplate(win, ref, cv2.TM_CCOEFF_NORMED))
        return (nx0 + mx - S, ny0 + my - S)
    nR, nP = [nose(x) for x in gR], [nose(x) for x in gP]
    # Bouche ouverte dans « parle » : intérieur sombre sous le nez.
    bw, bh = int(W * .20) // 2 * 2, int(H * .09) // 2 * 2
    mouth, area = [], []
    for t in range(n):
        x, y = nP[t]
        reg = crop(gP[t], x, y + int(H * .06), bw, bh)
        dark = (reg < 70).astype(np.float32)
        a = dark.sum(); area.append(a)
        if a > 0:
            ys, xs = np.nonzero(dark)
            mouth.append((x - bw // 2 + int(xs.mean()), y + int(H * .06) - bh // 2 + int(ys.mean())))
        else: mouth.append((x, y + int(H * .06)))
    area = np.array(area)
    opens = [t for t in range(n) if area[t] >= np.percentile(area, 75)]
    def pose_cost(t, j):
        a = crop(gR[t], *nR[t], tw, th); b = crop(gP[j], *nP[j], tw, th)
        return float(np.abs(a - b).mean()) + .15 * min(abs(t - j), n - abs(t - j))
    m = np.zeros((bh, bw), np.float32)
    cv2.ellipse(m, (bw // 2, bh // 2), (int(bw * .42), int(bh * .40)), 0, 0, 360, 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), bw / 16)[..., None]
    od = f'{OUT}/{mood}'; os.makedirs(od, exist_ok=True)
    for t in range(n):
        j = min(opens, key=lambda j: pose_cost(t, j))
        mx, my = mouth[j]; dx, dy = mx - nP[j][0], my - nP[j][1]
        xt, yt = nR[t][0] + dx, nR[t][1] + dy
        patch = crop(P[j], mx, my, bw, bh).astype(np.float32)
        out = R[t].astype(np.float32)
        dst = out[yt - bh // 2: yt + bh // 2, xt - bw // 2: xt + bw // 2]
        dst[:] = dst * (1 - m) + patch * m
        cv2.imwrite(f'{od}/f{t:04d}.png', out.clip(0, 255).astype(np.uint8))
    print(mood, 'nez', (nx0, ny0), 'ouvertes', len(opens), '/', n, flush=True)
