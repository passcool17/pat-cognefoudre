import json, numpy as np
d=json.load(open('tracks.json'))
POSTER={'content':2.0,'grognon':2.5,'impatient':2.0,'endormi':3.0,'triomphant':2.5,'boudeur':1.0}
out={}
for m,v in d.items():
    a=np.array(v['track'],dtype=float)
    k=5; pad=np.concatenate([a[-k:],a,a[:k]])  # boucle : lissage circulaire
    ker=np.ones(2*k+1)/(2*k+1)
    sm=np.stack([np.convolve(pad[:,j],ker,'same')[k:-k] for j in range(4)],1)
    sm[:,3]=np.minimum(sm[:,3],a[:,3]) # confiance prudente
    # 12 i/s suffisent (interpolation linéaire côté client)
    pts=sm[::2]
    out[m]={'fps':12,'poster':POSTER[m],'pts':[[round(p[0],4),round(p[1],4),round(p[2],3),round(p[3],2)] for p in pts]}
js='// Ancre de la bouche de Pat dans chaque vidéo (généré par tools/realiste/track.py).\n// pts : [x, y] normalisés (0..1) dans l’image, échelle du museau, confiance du suivi.\nexport const TRACKS = '+json.dumps(out,separators=(',',':'))+';\n'
open('/workspace/apps/pat-realiste/avatar-tracks.js','w').write(js)
print(len(js))
