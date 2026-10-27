// Exporte toutes les répliques à enregistrer (une par nombre possible pour les répliques chiffrées).
// Usage : node tools/voix/lines.mjs > /tmp/lines.json
import { LINES, MIN_VALUE, MAX_VALUE, TEST_LINE, fill } from '../../pet.js';

// Le texte lu peut différer un peu de la bulle (onomatopées que la synthèse épelle sinon).
export function forSpeech(text) {
  return text
    .replace(/Grrr…?/g, 'Hum…')
    .replace(/Hmpf\./g, 'Hum.')
    .replace(/Mmh/g, 'Mmm')
    .replace(/\s*[Zz]zz…?/g, '…')
    .replace(/Cognefoudre/g, 'Cogne-foudre')
    .replace(/Roi des Bandits/g, 'roi des bandits') // la majuscule fait buter la voix
    .replace(/Tap\. Tap\. Tap\./g, 'Tape, tape, tape.') // « Tap. » isolé fait bafouiller la voix (gilles)
    .replace(/Mon Plan/g, 'mon plan')
    .replace(/Mes coffres débordent de neige : /g, 'Mes coffres, débordent de neige. ') // sinon « mes confres »
    .replace(/Mes moustaches gèlent/g, 'Mes moustaches, gèlent')
    .replace(/[.…]*…[.…]*/g, '…')
    .replace(/^…\s*/, '')
    .trim();
}

const fake = (k, n) => ({ city: 0, snow: 0, patTokensVallee: 0, patTokensFixed: 0, [k === 'tokens' ? 'patTokensVallee' : k]: n });
const out = [{ id: 'test', text: forSpeech(TEST_LINE) }];
for (const [mood, pool] of Object.entries(LINES)) {
  pool.forEach((line, i) => {
    const k = line.match(/\{(\w+)/)?.[1];
    if (!k) return out.push({ id: `${mood}-${i}`, text: forSpeech(line) });
    for (let n = MIN_VALUE[k]; n <= MAX_VALUE[k]; n++) out.push({ id: `${mood}-${i}-${n}`, text: forSpeech(fill(line, fake(k, n))) });
  });
}
if (process.argv[1]?.endsWith('lines.mjs')) console.log(JSON.stringify(out, null, 1));
