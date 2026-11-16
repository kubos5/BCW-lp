// Genera assets/shapes.svg: le forme di Material 3 Expressive (MaterialShapes) di BCW-web, in un
// quadrato 100 × 100, come <symbol> da usare con <svg><use href="assets/shapes.svg#nome"/></svg>.
// Uso: node tools/shapes.mjs [percorso di js/shapes.js di BCW-web]
import { writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(root, '..', 'BCW-web', 'js', 'shapes.js'));
const { shapes } = await import(pathToFileURL(source).href);
const symbols = Object.entries(shapes).map(([name, d]) => `<symbol id="${name}" viewBox="0 0 100 100"><path d="${d}"/></symbol>`);
writeFileSync(join(root, 'assets', 'shapes.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Forme di Material 3 Expressive, da BCW-web (js/shapes.js). Generato da tools/shapes.mjs. -->\n${symbols.join('\n')}\n</svg>\n`);
console.log(`assets/shapes.svg: ${symbols.length} forme`);
