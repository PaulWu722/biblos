// Rebuild public/quiz/index.json from the quiz files present. Run: node tools/quiz-index.mjs
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
const dir = new URL('../public/quiz/', import.meta.url);
const index = {};
for (const book of ['lee', 'nee', 'nt', 'lsnt', 'lsot']) {
  const d = new URL(`${book}/`, dir);
  index[book] = existsSync(d) ? readdirSync(d).filter((f) => /^\d+\.json$/.test(f)).map((f) => +f.slice(0, -5)).sort((a, b) => a - b) : [];
}
writeFileSync(new URL('index.json', dir), JSON.stringify(index));
console.log(Object.entries(index).map(([b, l]) => `${b}:${l.length}`).join(' '));
