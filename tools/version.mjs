// Aggiorna in un colpo tutte le versioni scritte nel sito.
//
//   node tools/version.mjs                       mostra le versioni attuali (e se qualcuna non torna)
//   node tools/version.mjs ios 4.1               aggiorna la versione iOS
//   node tools/version.mjs android 4.0 web 4.0   più piattaforme insieme
//
// Nelle pagine ogni testo con una versione è marcato con data-version="ios|android|web": lo script
// cambia il numero dentro quel testo ("v4.0", "BCW 4.0 sta arrivando…", "BCW_v4.0.ipa") e i link alle
// release (github.com/kubos5/<repo>/releases/tag/v4.0). Le frasi storiche come "Dalla versione 4.0"
// non sono marcate e restano com'erano.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'support/index.html'];
const repos = { ios: 'BCW', web: 'BCW-web', android: 'BCW-android' };

const VERSION = /\d+(?:\.\d+)+/;
const marked = (platform) =>
  new RegExp(`(<(\\w+)\\b[^>]*\\bdata-version="${platform}"[^>]*>)([^<]*)(</\\2>)`, 'g');
const releaseLink = (platform) =>
  new RegExp(`(github\\.com/kubos5/${repos[platform]}/releases/tag/v)(\\d+(?:\\.\\d+)+)`, 'g');

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Le versioni trovate in ogni pagina, piattaforma per piattaforma. */
function scan() {
  const found = Object.fromEntries(Object.keys(repos).map((platform) => [platform, []]));
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    for (const platform of Object.keys(repos)) {
      for (const match of html.matchAll(marked(platform))) {
        found[platform].push({ page, text: match[3].trim(), version: match[3].match(VERSION)?.[0] });
      }
      for (const match of html.matchAll(releaseLink(platform))) {
        found[platform].push({ page, text: `link alla release v${match[2]}`, version: match[2] });
      }
    }
  }
  return found;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  for (const [platform, spots] of Object.entries(scan())) {
    const versions = [...new Set(spots.map((spot) => spot.version))];
    const status = versions.length === 1 ? versions[0] : `non allineata (${versions.join(', ')})`;
    console.log(`${platform.padEnd(8)} ${status}  ·  ${spots.length} punti`);
    if (versions.length > 1) for (const spot of spots) console.log(`           ${spot.version}  ${spot.page}: ${spot.text}`);
  }
  process.exit(0);
}

if (args.length % 2) fail('Uso: node tools/version.mjs <ios|android|web> <versione> [altra piattaforma e versione]');

const updates = {};
for (let i = 0; i < args.length; i += 2) {
  const [platform, raw] = [args[i], args[i + 1]];
  const version = raw.replace(/^v/, '');
  if (!(platform in repos)) fail(`Piattaforma sconosciuta: ${platform} (usa ios, android o web)`);
  if (!/^\d+(?:\.\d+)+$/.test(version)) fail(`Versione non valida: ${raw} (per esempio 4.1 o 4.0.2)`);
  updates[platform] = version;
}

for (const page of pages) {
  const path = join(root, page);
  let html = readFileSync(path, 'utf8');
  const before = html;
  for (const [platform, version] of Object.entries(updates)) {
    html = html.replace(marked(platform), (_, open, _tag, text, close) => `${open}${text.replace(VERSION, version)}${close}`);
    html = html.replace(releaseLink(platform), `$1${version}`);
  }
  if (html !== before) writeFileSync(path, html);
}

const found = scan();
for (const [platform, version] of Object.entries(updates)) {
  console.log(`${platform}: ${version}  ·  ${found[platform].length} punti aggiornati`);
  for (const spot of found[platform]) console.log(`   ${spot.page}: ${spot.text}`);
}
console.log('\nDa fare a mano: vedi "Nuova versione" nel README.');
