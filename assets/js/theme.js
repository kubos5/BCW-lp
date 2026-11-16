// Tema del sito: chiaro/scuro/automatico e colore d'accento, come in Impostazioni › Aspetto di BCW.
// I colori di un accento scelto si generano con material-color-utilities (schema Tonal Spot, specifica
// 2025) con gli stessi ritocchi di BCW-web (js/theme.js), e si salvano nel browser: lo script in cima a
// ogni pagina li applica prima del primo disegno. Il cambio avviene con un cerchio che si allarga dal
// pulsante toccato (View Transitions), come i colori nell'introduzione dell'app.

export const DEFAULT_ACCENT = '#a23e2f';

/** I colori d'accento proposti dall'app, con il nome dello screenshot della Dashboard in quel tema. */
export const ACCENTS = [
  ['#a23e2f', 'Mattone', 'mattone'],
  ['#c0661b', 'Arancio', 'arancio'],
  ['#9a7b12', 'Oro', 'oro'],
  ['#2f7d55', 'Verde', 'verde'],
  ['#1f7a80', 'Petrolio', 'petrolio'],
  ['#2f6db5', 'Blu', 'blu'],
  ['#5b5bb0', 'Indaco', 'indaco'],
  ['#8a4fb0', 'Viola', 'viola'],
  ['#b8456f', 'Rosa', 'rosa'],
  ['#5f6b7a', 'Ardesia', 'ardesia'],
];

const MODE_KEY = 'bcw-lp.mode';
const ACCENT_KEY = 'bcw-lp.accent';
const STYLE_ID = 'accent-theme';
const html = document.documentElement;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* ignorato */ } },
};

let lib = null;
let libLoading = null;
export function loadColorLibrary() {
  if (lib) return Promise.resolve(lib);
  libLoading ??= import('./vendor/material-color-utilities.js').then((m) => { lib = m; return m; });
  return libLoading;
}

// MARK: - Chiaro e scuro

/** 'light', 'dark' o 'auto'. */
export function currentMode() {
  const value = html.getAttribute('data-theme');
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function isDark() {
  const mode = currentMode();
  return mode === 'dark' || (mode === 'auto' && darkQuery.matches);
}

/** Gli screenshot con una versione scura (`<source data-dark>`) seguono il tema scelto nella pagina. */
function syncPictures() {
  const mode = currentMode();
  const media = mode === 'auto' ? '(prefers-color-scheme: dark)' : mode === 'dark' ? 'all' : 'not all';
  for (const source of document.querySelectorAll('source[data-dark]')) source.media = media;
}

function syncChrome() {
  const style = getComputedStyle(html);
  const surface = style.getPropertyValue('--surface').trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = surface;
  updateFavicon();
  for (const listener of listeners) listener();
}

const listeners = new Set();
/** Chiamata dopo ogni cambio di tema (colori o chiaro/scuro). */
export function onThemeChange(listener) { listeners.add(listener); }

export function setMode(mode, origin) {
  return withReveal(origin, () => {
    if (mode === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', mode);
    store.set(MODE_KEY, mode === 'auto' ? null : mode);
    syncPictures();
    syncChrome();
  });
}

darkQuery.addEventListener('change', () => { if (currentMode() === 'auto') syncChrome(); });

// MARK: - Colore d'accento

export function currentAccent() {
  try { return JSON.parse(store.get(ACCENT_KEY) || 'null')?.accent ?? DEFAULT_ACCENT; } catch { return DEFAULT_ACCENT; }
}

export async function setAccent(hex, origin) {
  hex = normalizeHex(hex) ?? DEFAULT_ACCENT;
  let css = null;
  if (hex !== DEFAULT_ACCENT) {
    const m = await loadColorLibrary();
    css = buildTheme(m, hex);
  }
  await withReveal(origin, () => {
    let element = document.getElementById(STYLE_ID);
    if (css) {
      if (!element) {
        element = document.createElement('style');
        element.id = STYLE_ID;
        document.head.append(element);
      }
      element.textContent = css;
      store.set(ACCENT_KEY, JSON.stringify({ accent: hex, css }));
    } else {
      element?.remove();
      store.set(ACCENT_KEY, null);
    }
    syncChrome();
  });
}

/** Il colore proposto più vicino (per lo screenshot di un colore scelto a mano, come fa l'icona dell'app). */
export async function nearestPreset(hex) {
  const preset = ACCENTS.find(([value]) => value === hex);
  if (preset) return preset;
  const m = await loadColorLibrary();
  const hct = (value) => m.Hct.fromInt(m.argbFromHex(value));
  const target = hct(hex);
  if (target.chroma < 14) return ACCENTS[ACCENTS.length - 1];
  let best = ACCENTS[0];
  let distance = Infinity;
  for (const entry of ACCENTS.slice(0, -1)) {
    const diff = Math.abs(((hct(entry[0]).hue - target.hue + 540) % 360) - 180);
    if (diff < distance) { distance = diff; best = entry; }
  }
  return best;
}

export function normalizeHex(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text)) return `#${[...text.slice(1)].map((c) => c + c).join('')}`;
  return null;
}

// MARK: - Cerchio che si allarga

/**
 * Esegue `change` dentro una View Transition: la pagina nuova compare in un cerchio che parte da
 * `origin` (un elemento o un punto {x, y}). Senza View Transitions o con le animazioni ridotte, subito.
 */
async function withReveal(origin, change) {
  if (!origin || !document.startViewTransition || reduceMotion()) { change(); return; }
  let x, y;
  if (origin instanceof Element) {
    const rect = origin.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else ({ x, y } = origin);
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(change);
  try {
    await transition.ready;
    html.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 820, easing: 'cubic-bezier(.05, .7, .1, 1)', pseudoElement: '::view-transition-new(root)' },
    );
    await transition.finished;
  } catch { /* transizione saltata: il cambio è già avvenuto */ }
}

// MARK: - Icona nei colori del tema

export const ICON_TEXT_PATH = 'M-302.01 63.40Q-316.72 63.40 -327.32 52.80Q-337.92 42.20 -337.92 27.49L-337.92 -112.10Q-337.92 -126.81 -327.32 -137.36Q-316.72 -147.91 -302.01 -147.91L-229.65 -147.91Q-200.93 -147.91 -184.40 -132.89Q-167.87 -117.86 -167.72 -94.49L-167.72 -94.49Q-167.72 -76.00 -176.11 -63.87Q-184.50 -51.75 -199.30 -45.90L-199.30 -45.90Q-180.51 -41.17 -170.72 -28.06Q-160.93 -14.95 -160.93 4.33L-160.93 4.33Q-160.93 29.02 -177.86 46.21Q-194.78 63.40 -224.44 63.40ZM-272.69 17.26L-246.97 17.26Q-236.88 17.26 -230.46 11.46Q-224.05 5.65 -224.05 -3.69L-224.05 -3.69Q-224.05 -12.89 -230.64 -18.40Q-237.23 -23.91 -247.71 -23.91L-285.09 -23.91L-285.09 -61.59L-250.76 -61.59Q-240.97 -61.59 -235.21 -67.34Q-229.46 -73.10 -229.46 -81.61L-229.46 -81.61Q-229.46 -90.61 -235.48 -96.09Q-241.51 -101.58 -252.18 -101.58L-272.69 -101.58ZM-44.13 66.60Q-92.92 66.60 -125.45 35.66Q-157.98 4.72 -157.98 -42.40L-157.98 -42.40Q-157.98 -89.66 -125.40 -120.41Q-92.82 -151.16 -44.56 -151.16Q-30.04 -151.16 -16.88 -148.11Q-3.73 -145.06 5.84 -140.22Q15.41 -135.37 21.85 -129.27Q33.41 -119.24 34.84 -105.27Q36.27 -91.30 27.90 -82.44L27.90 -82.44Q18.95 -73.19 7.93 -72.60Q-3.09 -72.01 -12.28 -78.51Q-16.42 -82.29 -21.26 -84.85Q-26.11 -87.41 -31.12 -88.76Q-36.14 -90.12 -42.75 -90.12Q-62.95 -90.12 -76.77 -76.96Q-90.59 -63.80 -90.59 -42.58L-90.59 -42.58Q-90.59 -21.29 -76.79 -7.91Q-63.00 5.46 -43.47 5.46Q-36.93 5.46 -31.64 3.93Q-26.35 2.41 -21.68 -0.27Q-17.01 -2.95 -13.76 -6.15Q-3.78 -14.66 7.29 -14.66Q18.36 -14.66 27.66 -6.05L27.66 -6.05Q36.96 2.56 36.66 15.96Q36.37 29.36 27.61 39.06Q19.74 47.81 9.06 54.01Q-1.61 60.21 -14.91 63.40Q-28.21 66.60 -44.13 66.60ZM122.00 67.88Q109.85 67.88 99.89 59.72Q89.93 51.55 86.34 40.19L39.32 -112.15Q34.35 -127.84 43.64 -139.50Q52.94 -151.16 68.44 -151.16L68.44 -151.16Q79.75 -151.16 87.42 -144.32Q95.10 -137.48 98.10 -128.29L125.50 -36.26L129.02 -25.19L129.14 -25.19L132.19 -36.35L158.16 -127.11Q161.26 -138.22 169.72 -144.59Q178.18 -150.96 189.69 -150.96L189.69 -150.96Q202.08 -150.96 210.69 -144.35Q219.30 -137.73 222.20 -126.12L246.50 -36.55L249.04 -25.88L249.11 -25.88L252.36 -36.55L278.92 -128.29Q281.53 -137.39 288.85 -144.22Q296.18 -151.06 307.30 -151.06L307.30 -151.06Q322.99 -151.06 331.99 -139.95Q341.00 -128.83 336.32 -113.92L288.56 40.24Q284.97 51.60 275.06 59.74Q265.15 67.88 252.01 67.88L252.01 67.88Q240.06 67.88 229.97 59.89Q219.89 51.89 216.69 40.97L188.90 -54.35L187.25 -61.93L187.18 -61.93L185.31 -54.40L157.57 40.78Q154.37 51.80 144.24 59.84Q134.10 67.88 122.00 67.88Z';
export const ICON_BAR_PATH = 'M162.33 174.08L162.33 174.08C162.33 186.31 152.42 196.22 140.19 196.22L-140.19 196.22C-152.42 196.22 -162.33 186.31 -162.33 174.08L-162.33 174.08C-162.33 161.86 -152.42 151.95 -140.19 151.95L140.19 151.95C152.42 151.95 162.33 161.86 162.33 174.08Z';

/** L'icona di BCW come SVG (sfondo, scritta e barra), come `appIconSVG` di BCW-web. */
export function appIconSVG({ background, ink, brand, radius = 230 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-512 -512 1024 1024">`
    + `<rect x="-512" y="-512" width="1024" height="1024" rx="${radius}" fill="${background}"/>`
    + `<path fill="${ink}" d="${ICON_TEXT_PATH}"/><path fill="${brand}" d="${ICON_BAR_PATH}"/></svg>`;
}

/** I colori dell'icona con "Tema dell'app": sfondo nel contenitore primario (in scuro il più scuro). */
export function iconColors() {
  const style = getComputedStyle(html);
  const read = (name) => style.getPropertyValue(name).trim();
  return {
    background: read(isDark() ? '--surface-container-lowest' : '--primary-container'),
    ink: read('--on-surface'),
    brand: read('--brand'),
  };
}

let faviconSignature = null;
function updateFavicon() {
  const colors = iconColors();
  if (!colors.brand) return;
  const signature = JSON.stringify(colors);
  if (signature === faviconSignature) return;
  faviconSignature = signature;
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = `data:image/svg+xml,${encodeURIComponent(appIconSVG(colors))}`;
}

// MARK: - Generazione dei colori (da BCW-web, js/theme.js)

const ROLES = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'surface', 'surface-dim', 'surface-bright',
  'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest',
  'on-surface', 'on-surface-variant', 'outline', 'outline-variant',
  'inverse-surface', 'inverse-on-surface', 'inverse-primary',
];

/** Le variabili CSS del tema chiaro e scuro per un colore d'accento (schema Tonal Spot). */
export function buildTheme(m, accent) {
  const seed = m.Hct.fromInt(m.argbFromHex(accent));
  const colors = new m.MaterialDynamicColors().allColors.filter(Boolean);
  const hex = (argb) => m.hexFromArgb(argb);
  const tone = (palette, t) => hex(palette.tone(t));
  const toneOf = (value) => m.Hct.fromInt(m.argbFromHex(value)).tone;

  const make = (dark) => {
    const scheme = new m.SchemeTonalSpot(seed, dark, 0, '2025', 'phone');
    const legacy = new m.SchemeTonalSpot(seed, dark, 0, '2021', 'phone');
    const values = {};
    for (const color of colors) values[color.name.replace(/_/g, '-')] = hex(color.getArgb(scheme));
    for (const name of ['inverse-surface', 'inverse-on-surface']) {
      const color = colors.find((c) => c.name.replace(/_/g, '-') === name);
      if (color) values[name] = hex(color.getArgb(legacy));
    }
    values['surface-container-lowest'] = dark ? tone(scheme.neutralPalette, 3) : mixWhite(values.surface, 0.6);
    values['outline-variant'] = tone(scheme.neutralVariantPalette, dark ? 26 : 84);
    if (dark) {
      // Nel tema scuro i contenitori restano scuri (la specifica 2025 li schiarisce).
      for (const [role, palette] of [['primary', scheme.primaryPalette], ['secondary', scheme.secondaryPalette], ['tertiary', scheme.tertiaryPalette]]) {
        if (toneOf(values[`${role}-container`]) > 50) {
          values[`${role}-container`] = tone(palette, 35);
          values[`on-${role}-container`] = tone(palette, 90);
        }
      }
      values['on-secondary-container'] = tone(scheme.secondaryPalette, 85);
      values['on-error-container'] = tone(scheme.errorPalette, 80);
    }
    return { values, scheme };
  };

  const light = make(false);
  const dark = make(true);
  dark.values['inverse-primary'] = light.values.primary;

  const seedPalette = m.TonalPalette.fromHct(seed);
  const brand = (isDarkScheme) => (isDarkScheme ? hex(m.Hct.from(seed.hue, seed.chroma * 0.8, 64).toInt()) : tone(seedPalette, 40));
  const rgb = (value) => {
    const n = parseInt(value.slice(1), 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  };
  const block = (part, isDarkScheme) => {
    const lines = ROLES.map((role) => `--${role}: ${part.values[role]};`);
    lines.push(`--brand: ${brand(isDarkScheme)};`);
    const shadow = rgb(tone(part.scheme.neutralPalette, isDarkScheme ? 2 : 6));
    lines.push(`--scrim: rgb(${shadow} / ${isDarkScheme ? '.55' : '.38'});`, `--shadow-color: ${shadow};`);
    return lines.join(' ');
  };
  const darkBlock = block(dark, true);
  return `:root { ${block(light, false)} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${darkBlock} } }
:root[data-theme="dark"] { ${darkBlock} }`;
}

/** Avvicina un colore al bianco (senza arrivarci: niente sfondi bianchi puri). */
function mixWhite(value, amount) {
  const n = parseInt(value.slice(1), 16);
  const channel = (shift) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * amount);
  return `#${[16, 8, 0].map((shift) => Math.min(channel(shift), 254).toString(16).padStart(2, '0')).join('')}`;
}

// Stato iniziale (il tema è già applicato dallo script in cima alla pagina).
syncPictures();
syncChrome();
