// Importe les voix ElevenLabs (voix « C », faites par le bot Voix) depuis /workspace/shared/voix-pat/final/
// vers audio/. Répliques sans nombre : <id>.mp3 ; répliques avec nombre : segments seg-*-a/b + nombre-N.
// Un id absent garde l'ancienne prise (Gilles/Piper) en secours. Une réplique numérotée dont tous les
// segments existent n'a plus besoin de son ancien fichier entier : il est retiré.
// Usage : node tools/voix/import.mjs [dossier]  puis  node tools/voix/manifest.mjs
import fs from 'node:fs';
import path from 'node:path';
const SRC = process.argv[2] || '/workspace/shared/voix-pat/final';
const SHARED = path.dirname(SRC);
const DIR = new URL('../../audio/', import.meta.url).pathname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(SHARED, f), 'utf8'));
const wanted = [...new Set([...read('lignes-sans-nombres.json'), ...read('segments.json')].map((l) => l.id).concat('test'))]; // test = « Tester la voix »
const imported = []; const missing = [];
for (const id of wanted) {
  const f = path.join(SRC, `${id}.mp3`);
  if (fs.existsSync(f) && fs.statSync(f).size > 1000) { fs.copyFileSync(f, path.join(DIR, `${id}.mp3`)); imported.push(id); } else missing.push(id);
}
const have = new Set(fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
const removed = [];
for (const f of fs.readdirSync(DIR)) {
  const m = /^(content-6|content-12|grognon-10)-(\d+)\.mp3$/.exec(f);
  if (m && [`seg-${m[1]}-a`, `nombre-${m[2]}`, `seg-${m[1]}-b`].every((p) => have.has(p))) { fs.unlinkSync(path.join(DIR, f)); removed.push(f); }
}
const fallback = missing.filter((id) => have.has(id));
const report = { imported: imported.length, missing, fallbackGilles: fallback, removedWholeNumbered: removed.length };
fs.writeFileSync(path.join(DIR, '..', 'tools', 'voix', 'import-rapport.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`${imported.length}/${wanted.length} voix ElevenLabs importées ; ${missing.length} manquantes (${fallback.length} gardent la prise Gilles) ; ${removed.length} anciens fichiers numérotés retirés`);
if (missing.length) console.log('Manquantes :', missing.join(' '));
