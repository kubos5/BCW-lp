// Genera assets/icons.svg (sprite di <symbol>) dalle icone Material Symbols Rounded dell'app iOS.
// Uso: node tools/icons.mjs [cartella Material dell'app]
// Predefinita: ../BCW/BCW/Resources/Assets.xcassets/Material (repo kubos5/BCW clonata accanto).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] ?? join(root, '..', 'BCW', 'BCW', 'Resources', 'Assets.xcassets', 'Material');

// Icone usate dal sito: aggiungere qui il nome e rilanciare lo script.
const names = `
  dashboard dashboardFill timetable timetableFill grades gradesFill you youFill search calendar calendarMonth
  chevronDown chevronRight chevronLeft arrowUpRight arrowBack externalLink check checkCircle checkSealFill
  book bookOpen clipboardPen test clock megaphone stickyNote folder bell bellActive wifiOff lock lockOpen lockClock
  key users userPlus switchAccount person cloud sparkles wand palette contrast sun widgets favoriteFill volunteer
  workspacePremium newReleases update github ios android api globe server download info alertTriangle alertCircle
  trendingUp trendingDown target timer schedule today viewAgenda dayView history paperclip signature doneAll
  textSearch refresh x plus minus menuOpen more link share copy school graduationCap coffee beach tune eye
  visibilityOff motion corners textStyle colorize keyboard listUnchecked checklist fileText hand messageAlert
`.trim().split(/\s+/);

// Icone che l'app non ha (Material Symbols Rounded, peso 400, viewBox 0 -960 960 960).
const extra = {
  darkMode: 'M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-60q109 0 190-67.5T771-406q-25 11-53.67 16.5Q688.67-384 660-384q-114.69 0-195.34-80.66Q384-545.31 384-660q0-24 5-51.5t18-62.5q-98 27-162.5 109.5T180-480q0 125 87.5 212.5T480-180Zm-4-297Z',
};

// Icone senza il margine delle Material Symbols: viewBox allargato così restano centrate e della stessa
// grandezza delle altre.
const viewBoxes = { github: '-2 -2 20 20' };

const symbols = names.map((name) => {
  const svg = readFileSync(join(source, `m.${name}.imageset`, `${name}.svg`), 'utf8');
  const viewBox = viewBoxes[name] ?? svg.match(/viewBox="([^"]+)"/)[1];
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*\/?>/g)].map((m) => `<path d="${m[1]}"/>`).join('');
  return `<symbol id="${name}" viewBox="${viewBox}">${paths}</symbol>`;
});

for (const [name, d] of Object.entries(extra)) symbols.push(`<symbol id="${name}" viewBox="0 -960 960 960"><path d="${d}"/></symbol>`);

writeFileSync(join(root, 'assets', 'icons.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Material Symbols Rounded (Apache 2.0), dall'app iOS di BCW. Generato da tools/icons.mjs. -->\n${symbols.join('\n')}\n</svg>\n`);
console.log(`assets/icons.svg: ${symbols.length} icone`);
