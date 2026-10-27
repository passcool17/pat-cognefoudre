// Écrit audio/liste.js (pour voice.js) et audio/liste.json (pour le service worker),
// et crée audio/silence.mp3 (déblocage de la lecture au premier geste).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = new URL('../../audio/', import.meta.url);
if (!fs.existsSync(new URL('silence.mp3', dir))) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.2', '-c:a', 'libmp3lame', '-b:a', '32k', new URL('silence.mp3', dir).pathname]);
}
const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3') && f !== 'silence.mp3').map((f) => f.slice(0, -4)).sort();
fs.writeFileSync(new URL('liste.js', dir), `// Généré par tools/voix/manifest.mjs : répliques enregistrées disponibles.\nexport const AUDIO_IDS = ${JSON.stringify(ids)};\n`);
fs.writeFileSync(new URL('liste.json', dir), JSON.stringify(['audio/silence.mp3', ...ids.map((i) => `audio/${i}.mp3`)]) + '\n');
console.log(`${ids.length} répliques audio`);
