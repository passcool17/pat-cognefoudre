#!/usr/bin/env python3
"""Génère un projet Rive (RML + images rognées WebP) pour une humeur de Pat.
Usage : python3 gen.py <humeur>   -> ./pat-<humeur>/ (rive.yaml, scene.rml, img/*.webp)
Le rig (noeuds, pivots, animations, machine à états, view model) est identique pour
toutes les humeurs : seules les images (et leurs boîtes englobantes) changent."""
import sys, os
from PIL import Image
H = sys.argv[1] if len(sys.argv) > 1 else 'content'
SRC = os.environ.get('ART', '../pat-rive-art') + f'/{H}'
OUT = f'pat-{H}'
os.makedirs(f'{OUT}/img', exist_ok=True)
Q = int(os.environ.get('Q', '90'))

_n = [100]
def nid():
    _n[0] += 1; return f'0:{_n[0]}'

# --- images : rognage à la boîte englobante, WebP ---
bbox = {}
def prep(name):
    im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
    b = im.getchannel('A').getbbox()
    if name.startswith('bouche-'):  # même boîte pour toutes les bouches
        b = None
    bbox[name] = b
    return im
names = ['fond','cape-corps','bras-gauche-marteau','bras-droit-parchemin','oreilles','tete','couronne',
         'oeil-gauche','paupiere-oeil-gauche','oeil-droit-balafre','paupiere-oeil-droit','sourcils']
MOUTHS = ['X','A','B','C','D','E','F']   # index = valeur de « bouche »
ims = {n: prep(n) for n in names + [f'bouche-{m}' for m in MOUTHS]}
# boîte commune des bouches
mb = None
for m in MOUTHS:
    b = ims[f'bouche-{m}'].getchannel('A').getbbox()
    mb = b if mb is None else (min(mb[0],b[0]),min(mb[1],b[1]),max(mb[2],b[2]),max(mb[3],b[3]))
for m in MOUTHS: bbox[f'bouche-{m}'] = mb
asset = {}
assets_rml = []
for n, im in ims.items():
    c = im.crop(bbox[n])
    if n == 'fond':
        c.convert('RGB').save(f'{OUT}/img/{n}.webp', quality=82, method=6)
    else:
        c.save(f'{OUT}/img/{n}.webp', quality=Q, method=6, exact=False)
    asset[n] = nid()
    assets_rml.append(f'    <ImageAsset file="img/{n}.webp" name="{n}" id="{asset[n]}"/>')

def img(n, parent_abs, extra=''):
    b = bbox[n]; cx = (b[0]+b[2])/2; cy = (b[1]+b[3])/2
    return f'<Image x="{cx-parent_abs[0]:g}" y="{cy-parent_abs[1]:g}" assetId="{asset[n]}" {extra}name="{n}" id="{nid_named(n)}"/>'
ids = {}
rest = {}
def off(o, p, v):
    if p == 'x': return v + rest.get(o, (0,0))[0]
    if p == 'y': return v + rest.get(o, (0,0))[1]
    return v
def nid_named(k):
    ids[k] = nid(); return ids[k]
def node(k, abs_, parent_abs, children, ind):
    ids[k] = nid(); rest[k] = (abs_[0]-parent_abs[0], abs_[1]-parent_abs[1])
    pad = ' ' * ind
    inner = '\n'.join(pad + '    ' + c for c in children)
    return f'<Node x="{abs_[0]-parent_abs[0]:g}" y="{abs_[1]-parent_abs[1]:g}" name="{k}" id="{ids[k]}">\n{inner}\n{pad}</Node>'

# --- pivots (ordre-calques.txt) ---
P = dict(racine=(540,1440), tete=(480,800), couronne=(470,285), oreilles=(485,335),
         epauleG=(330,900), epauleD=(940,790))
# Surcharges de pivots par humeur (boudeur : oreilles tombantes, bases (320,390) et (645,400))
OVR = {'boudeur': dict(oreilles=(482.5,395))}
P.update(OVR.get(H, {}))
# Premier frère = dessiné au-dessus.
couronne = node('Couronne', P['couronne'], P['tete'], [img('couronne', P['couronne'])], 16)
oreilles = node('Oreilles', P['oreilles'], P['tete'], [img('oreilles', P['oreilles'])], 16)
tete_kids = [img('sourcils', P['tete'])] + \
    [img(f'bouche-{m}', P['tete'], '' if m == 'X' else 'opacity="0" ') for m in MOUTHS] + \
    [img('paupiere-oeil-droit', P['tete'], 'opacity="0" '), img('oeil-droit-balafre', P['tete']),
     img('paupiere-oeil-gauche', P['tete'], 'opacity="0" '), img('oeil-gauche', P['tete']),
     couronne, img('tete', P['tete']), oreilles]
tete = node('Tete', P['tete'], P['tete'], tete_kids, 16)
teteR = node('TeteReac', P['tete'], P['racine'], [tete], 12)
brasD = node('BrasDReac', P['epauleD'], P['racine'], [node('BrasD', P['epauleD'], P['epauleD'], [img('bras-droit-parchemin', P['epauleD'])], 16)], 12)
brasG = node('BrasGReac', P['epauleG'], P['racine'], [node('BrasG', P['epauleG'], P['epauleG'], [img('bras-gauche-marteau', P['epauleG'])], 16)], 12)
souffle = node('Souffle', P['racine'], P['racine'], [teteR, brasD, brasG, img('cape-corps', P['racine'])], 8)
reac = node('Reac', P['racine'], (0,0), [souffle], 4)

# --- animations ---
anims = []
PK = dict(x=13, y=14, rot=15, sx=16, sy=17, op=18)
def anim(name, dur, keys, loop=False):
    """keys: {(objkey, prop): [(frame, value), ...]}"""
    aid = nid()
    objs = {}
    for (o, p), kf in keys.items(): objs.setdefault(o, []).append((p, kf))
    body = []
    for o, props in objs.items():
        body.append(f'        <KeyedObject objectId="{ids[o]}">')
        for p, kf in props:
            body.append(f'            <KeyedProperty propertyKey="{PK[p]}">')
            for i, (f, v) in enumerate(kf):
                v = off(o, p, v)
                it = 'cubic' if i < len(kf)-1 else 'hold'
                if it == 'cubic':
                    body.append(f'                <KeyFrameDouble value="{v:g}" frame="{f}" interpolationType="cubic"><CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/></KeyFrameDouble>')
                else:
                    body.append(f'                <KeyFrameDouble value="{v:g}" frame="{f}"/>')
            body.append('            </KeyedProperty>')
        body.append('        </KeyedObject>')
    lp = 'loopValue="loop" ' if loop else ''
    anims.append(f'    <LinearAnimation {lp}duration="{dur}" name="{name}" id="{aid}">\n' + '\n'.join(body) + '\n    </LinearAnimation>')
    return aid
def hold(name, dur, keys):  # sans interpolation (bouches, paupières)
    aid = nid(); body = []
    for (o, p), kf in keys.items():
        body.append(f'        <KeyedObject objectId="{ids[o]}"><KeyedProperty propertyKey="{PK[p]}">' +
                    ''.join(f'<KeyFrameDouble value="{off(o,p,v):g}" frame="{f}"/>' for f, v in kf) + '</KeyedProperty></KeyedObject>')
    anims.append(f'    <LinearAnimation duration="{dur}" name="{name}" id="{aid}">\n' + '\n'.join(body) + '\n    </LinearAnimation>')
    return aid

# Respiration : 4 s
A_souffle = anim('Souffle', 240, {
    ('Souffle','sy'): [(0,1),(110,1.007),(240,1)],
    ('Tete','y'): [(0,0),(120,-3),(240,0)],
    ('BrasG','rot'): [(0,0),(120,-0.004),(240,0)],
    ('BrasD','rot'): [(0,0),(120,0.002),(240,0)],
}, loop=True)
# Paupières
A_clin = hold('Clin', 9, {('paupiere-oeil-gauche','op'): [(0,1),(8,1),(9,0)], ('paupiere-oeil-droit','op'): [(0,1),(8,1),(9,0)]})
A_att = {d: hold(f'Attente{d}', d, {('paupiere-oeil-gauche','op'): [(0,0)], ('paupiere-oeil-droit','op'): [(0,0)]}) for d in (14, 110, 180, 260)}
# Bouches
A_b = [hold(f'Bouche{m}', 1, {(f'bouche-{k}','op'): [(0, 1 if k == m else 0)] for k in MOUTHS}) for m in MOUTHS]
# Réactions (commencent et finissent au repos)
A_idle = hold('Repos', 1, {('Reac','y'): [(0,0)]})
R = {}
R['tourPat'] = anim('R_tourPat', 60, {
    ('Oreilles','sy'): [(0,1),(10,1.08),(40,1.08),(60,1)],
    ('TeteReac','y'): [(0,0),(12,-14),(40,-14),(60,0)],
    ('Reac','y'): [(0,0),(10,-8),(22,0),(60,0)],
    ('Couronne','rot'): [(0,0),(14,-0.05),(30,0.02),(60,0)],
})
R['points'] = anim('R_points', 60, {
    ('Reac','y'): [(0,0),(10,-12),(22,0),(30,-5),(40,0),(60,0)],
    ('Couronne','y'): [(0,0),(12,-16),(24,0),(32,-6),(42,0),(60,0)],
    ('Couronne','rot'): [(0,0),(12,0.06),(26,-0.03),(42,0),(60,0)],
})
fz = [(0,0)] + [(i*3, 6 if i % 2 else -6) for i in range(1, 16)] + [(52,0),(66,0)]
fr = [(0,0)] + [(i*3, 0.012 if i % 2 else -0.012) for i in range(1, 16)] + [(52,0),(66,0)]
R['fureur'] = anim('R_fureur', 66, {
    ('Reac','x'): fz,
    ('TeteReac','rot'): fr,
    ('Oreilles','sy'): [(0,1),(6,0.9),(52,0.9),(66,1)],
    ('TeteReac','y'): [(0,0),(6,7),(52,7),(66,0)],
    ('Reac','sy'): [(0,1),(6,1.015),(52,1.015),(66,1)],
})
R['gagne'] = anim('R_gagne', 96, {
    ('BrasGReac','rot'): [(0,0),(18,-0.12),(30,-0.10),(42,-0.12),(72,-0.12),(96,0)],
    ('Reac','sy'): [(0,1),(18,1.02),(72,1.02),(96,1)],
    ('Couronne','y'): [(0,0),(20,-14),(32,0),(96,0)],
    ('TeteReac','rot'): [(0,0),(20,-0.03),(72,-0.03),(96,0)],
    ('Oreilles','sy'): [(0,1),(18,1.05),(72,1.05),(96,1)],
})
R['perd'] = anim('R_perd', 110, {
    ('TeteReac','y'): [(0,0),(24,12),(86,12),(110,0)],
    ('TeteReac','rot'): [(0,0),(24,0.03),(86,0.03),(110,0)],
    ('Oreilles','sy'): [(0,1),(24,0.92),(86,0.92),(110,1)],
    ('Reac','sy'): [(0,1),(24,0.985),(86,0.985),(110,1)],
    ('BrasGReac','rot'): [(0,0),(24,0.03),(86,0.03),(110,0)],
})

# --- view model ---
VM, VMI = nid(), nid()
vmp = {'bouche': nid(), **{k: nid() for k in R}}
vm = [f'    <ViewModel defaultInstanceId="{VMI}" name="Pat" id="{VM}">',
      f'        <ViewModelPropertyNumber name="bouche" id="{vmp["bouche"]}"/>'] + \
     [f'        <ViewModelPropertyTrigger name="{k}" id="{vmp[k]}"/>' for k in R] + \
     [f'        <ViewModelInstance exports="true" name="Defaut" id="{VMI}">',
      f'            <ViewModelInstanceNumber propertyValue="0" viewModelPropertyId="{vmp["bouche"]}"/>'] + \
     [f'            <ViewModelInstanceTrigger viewModelPropertyId="{vmp[k]}"/>' for k in R] + \
     ['        </ViewModelInstance>', '    </ViewModel>']
def cond_num(v):
    return (f'<TransitionViewModelCondition opValue="equal"><TransitionPropertyViewModelComparator><BindablePropertyNumber>'
            f'<DataBindContext sourcePathIds="{VM}-{vmp["bouche"]}" propertyKey="636"/></BindablePropertyNumber>'
            f'</TransitionPropertyViewModelComparator><TransitionValueNumberComparator value="{v}"/></TransitionViewModelCondition>')
def cond_trig(k):
    return (f'<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyTrigger>'
            f'<DataBindContext sourcePathIds="{VM}-{vmp[k]}" propertyKey="686"/></BindablePropertyTrigger>'
            f'</TransitionPropertyViewModelComparator><TransitionValueTriggerComparator/></TransitionViewModelCondition>')
EXIT = 'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"'
SM = nid()
sid = lambda: nid()
# couche souffle
s_souf = sid()
L1 = f'''        <StateMachineLayer name="Souffle" id="{nid()}">
            <EntryState x="0" y="0"><StateTransition stateToId="{s_souf}"/></EntryState>
            <AnimationState x="200" y="0" animationId="{A_souffle}" id="{s_souf}"/>
        </StateMachineLayer>'''
# couche clignement (attentes aléatoires, parfois double clignement)
s_clin = sid(); s_att = {d: sid() for d in A_att}
w = {14: 1, 110: 3, 180: 4, 260: 2}
att = '\n'.join(f'            <AnimationState x="{200+i*150}" y="150" animationId="{A_att[d]}" reset="true" id="{s_att[d]}"><StateTransition stateToId="{s_clin}" {EXIT}/></AnimationState>'
                for i, d in enumerate(A_att))
tr = ''.join(f'<StateTransition stateToId="{s_att[d]}" randomWeight="{w[d]}" {EXIT}/>' for d in A_att)
L2 = f'''        <StateMachineLayer name="Clin" id="{nid()}">
            <EntryState x="0" y="0"><StateTransition stateToId="{s_att[180]}"/></EntryState>
            <AnimationState x="200" y="0" animationId="{A_clin}" reset="true" random="true" id="{s_clin}">{tr}</AnimationState>
{att}
        </StateMachineLayer>'''
# couche bouche
s_b = [sid() for _ in MOUTHS]
L3 = f'''        <StateMachineLayer name="Bouche" id="{nid()}">
            <AnyState x="0" y="-150">{''.join(f'<StateTransition stateToId="{s_b[i]}">{cond_num(i)}</StateTransition>' for i in range(len(MOUTHS)))}</AnyState>
            <EntryState x="0" y="0"><StateTransition stateToId="{s_b[0]}"/></EntryState>
''' + '\n'.join(f'            <AnimationState x="{200+i*120}" y="0" animationId="{A_b[i]}" id="{s_b[i]}"/>' for i in range(len(MOUTHS))) + '\n        </StateMachineLayer>'
# couche réactions
s_idle = sid(); s_r = {k: sid() for k in R}
L4 = f'''        <StateMachineLayer name="Reaction" id="{nid()}">
            <AnyState x="0" y="-150">{''.join(f'<StateTransition stateToId="{s_r[k]}">{cond_trig(k)}</StateTransition>' for k in R)}</AnyState>
            <EntryState x="0" y="0"><StateTransition stateToId="{s_idle}"/></EntryState>
            <AnimationState x="200" y="0" animationId="{A_idle}" id="{s_idle}"/>
''' + '\n'.join(f'            <AnimationState x="{200+i*150}" y="150" animationId="{R[k]}" reset="true" id="{s_r[k]}"><StateTransition stateToId="{s_idle}" {EXIT}/></AnimationState>' for i, k in enumerate(R)) + '\n        </StateMachineLayer>'

art = f'''    <Artboard defaultStateMachineId="{SM}" viewModelId="{VM}" viewModelInstanceId="{VMI}" styleId="0:5" width="1080" height="1440" name="Pat" id="0:2">
        <LayoutComponentStyle name="Artboard Style" id="0:5"/>
        {reac}
        {img('fond', (0,0))}
        <StateMachine name="Pat" id="{SM}">
{L1}
{L2}
{L3}
{L4}
        </StateMachine>
{chr(10).join(anims)}
    </Artboard>'''
open(f'{OUT}/scene.rml','w').write('<Rive version="1" kind="fragment">\n' + art + '\n' + '\n'.join(vm) + '\n' + '\n'.join(assets_rml) + '\n</Rive>\n')
open(f'{OUT}/rive.yaml','w').write(f'name: pat-{H}\n')
print('ok', OUT)
