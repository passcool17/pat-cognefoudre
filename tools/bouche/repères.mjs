// Convertit les sorties JSON de Rhubarb Lip Sync (une par réplique) en un seul module compact : audio/bouche.js.
// Format : { id: "X0 B12 C25 …" } = forme de bouche + début en centièmes de seconde.
// Usage : node tools/bouche/repères.mjs DOSSIER_JSON
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const out = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const id = path.basename(f, '.json');
  if (id === 'silence') continue;
  const { mouthCues } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const parts = [];
  for (const c of mouthCues) {
    const s = c.value, t = Math.round(c.start * 100);
    if (parts.length && parts[parts.length - 1][0] === s) continue;
    parts.push(s + t);
  }
  out[id] = parts.join(' ');
}
const file = new URL('../../audio/bouche.js', import.meta.url);
fs.writeFileSync(file, `// Repères de bouche (Rhubarb Lip Sync 1.14, reconnaisseur phonétique), générés par tools/bouche/repères.mjs.\n// forme + début en centièmes de seconde. Formes : X fermée, A lèvres jointes, B légère, C/D ouverte, E arrondie, F « ou », G « f/v », H « l ».\nexport const BOUCHE = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n"')};\n`);
console.log(Object.keys(out).length, 'répliques', fs.statSync(file).size, 'octets');
