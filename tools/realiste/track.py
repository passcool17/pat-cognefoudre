import cv2, json, sys, numpy as np
# Suit le museau de Pat dans chaque clip (repère du frame 0) -> ancre bouche normalisée.
MOUTH=(255,392)  # bouche dans le frame 0 (coord. 720x960)
T=(175,310,170,125) # x,y,w,h du gabarit museau
out={}
for m in sys.argv[1:]:
    cap=cv2.VideoCapture(f'raw/{m}.mp4'); frames=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
    frames=frames[:-1]
    x,y,w,h=T; tpl=frames[0][y:y+h,x:x+w]
    res=[]; px,py,ps=x,y,1.0
    for i,g in enumerate(frames):
        best=(-1,0,0,1)
        for s in np.arange(max(0.7,ps-0.08),min(1.2,ps+0.081),0.02):
            t=cv2.resize(tpl,None,fx=s,fy=s)
            th,tw=t.shape
            x0=max(0,int(px-60));y0=max(0,int(py-60));x1=min(g.shape[1],int(px+60+tw));y1=min(g.shape[0],int(py+60+th))
            r=cv2.matchTemplate(g[y0:y1,x0:x1],t,cv2.TM_CCOEFF_NORMED)
            _,mv,_,ml=cv2.minMaxLoc(r)
            if mv>best[0]: best=(mv,x0+ml[0],y0+ml[1],s)
        mv,bx,by,s=best
        px,py,ps=bx,by,s
        mx=bx+(MOUTH[0]-x)*s; my=by+(MOUTH[1]-y)*s
        res.append([round(mx/720,4),round(my/960,4),round(s,3),round(mv,2)])
    out[m]={'fps':24,'n':len(res),'track':res}
    c=[r[3] for r in res]; print(m,len(res),'conf min %.2f mean %.2f'%(min(c),sum(c)/len(c)), 'lowcount',sum(1 for v in c if v<0.5))
json.dump(out,open('tracks.json','w'))
