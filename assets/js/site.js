// Pagina principale: navigazione, comparsa dei colori, lezione in corso che scorre davvero,
// simulatore "E se prendessi…", temi, confronto con Liquid Glass.

import { ACCENTS, currentAccent, setAccent, nearestPreset, onThemeChange, iconColors, appIconSVG, loadColorLibrary } from './theme.js';
import { initModeControls, initReveal, createRing, formatAverage, toneOf, reduceMotion } from './ui.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Ogni parte si avvia da sola: un errore in una non deve lasciare la pagina a metà (per esempio con
// le sezioni ancora invisibili in attesa della comparsa allo scorrimento).
for (const init of [initReveal, initModeControls, initIsland, initScrollSpy, initLive, initRings, initSimulator, initThemes, initCompare]) {
  try { init(); } catch (error) { console.error(error); }
}

// MARK: - Isola

/** Poco dopo l'apertura l'isola sotto il titolo si allarga. */
function initIsland() {
  const island = $('[data-hero-island]');
  setTimeout(() => island?.classList.add('on'), 900);
}

// MARK: - Navigazione

/** La scheda della barra si accende sulla sezione in vista (con l'icona, come nell'app). */
function initScrollSpy() {
  const items = $$('.nav-item[data-spy]');
  const sections = $$('main > section[id]');
  let current = null;
  let queued = false;
  const update = () => {
    queued = false;
    const line = innerHeight * 0.4;
    let key = null;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) key = section.dataset.nav ?? section.id;
    }
    if (key === current) return;
    current = key;
    for (const item of items) item.classList.toggle('active', item.dataset.spy === key);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

// MARK: - Lezione in corso

/**
 * Una giornata finta attorno all'ora vera: Matematica è cominciata 20 minuti fa e dura un'ora, poi
 * 10 minuti di intervallo e Storia. Tutti i `data-live` (isola, schermata di blocco, widget) si
 * aggiornano ogni secondo; finita la lezione, se ne comincia un'altra.
 */
function initLive() {
  const fields = $$('[data-live]');
  if (!fields.length) return;
  const minute = 60_000;
  let plan;
  const makePlan = (offset) => {
    const start = new Date(Date.now() - offset);
    start.setSeconds(0, 0);
    const s = start.getTime();
    return { start: s, end: s + 60 * minute, prev: s - 60 * minute, next: s + 70 * minute, last: s + 130 * minute };
  };
  plan = makePlan(20 * minute);
  const clock = (time) => new Date(time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let left = plan.end - Date.now();
    if (left <= 0) { plan = makePlan(0); left = plan.end - Date.now(); }
    const seconds = Math.ceil(left / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const text = h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    const progress = 1 - left / (plan.end - plan.start);
    for (const field of fields) {
      switch (field.dataset.live) {
        case 'left': field.textContent = text; break;
        case 'left-min': field.textContent = `${Math.ceil(left / minute)} min`; break;
        case 'bar': field.style.width = `${(progress * 100).toFixed(2)}%`; break;
        case 'start': field.textContent = clock(plan.start); break;
        case 'end': field.textContent = clock(plan.end); break;
        case 'prev-start': field.textContent = clock(plan.prev); break;
        case 'next-start': field.textContent = clock(plan.next); break;
        case 'last-start': field.textContent = clock(plan.last); break;
      }
    }
  };
  tick();
  setInterval(tick, 1000);

  // Dynamic Island grande: si allarga toccandola, e da sola la prima volta che si vede.
  const island = $('[data-big-island]');
  if (!island) return;
  const toggle = (open) => {
    island.classList.toggle('open', open);
    island.setAttribute('aria-expanded', String(open));
    island.setAttribute('aria-label', open ? 'Dynamic Island allargata con la lezione in corso: tocca per richiuderla' : 'Dynamic Island con la lezione in corso: tocca per allargarla');
  };
  island.addEventListener('click', () => toggle(!island.classList.contains('open')));
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    setTimeout(() => toggle(true), 900);
  }, { threshold: 1 });
  observer.observe(island);
}

// MARK: - Anelli

function initRings() {
  for (const element of $$('[data-ring]:not([data-sim-ring])')) createRing(element).intro();
}

// MARK: - E se prendessi…

function initSimulator() {
  const root = $('[data-sim]');
  if (!root) return;
  const base = [7, 6.5, 8, 5.5, 7.5];
  const target = 7;
  const maxExtra = 4;
  let extra = [];
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const baseAverage = mean(base);
  const avgLabel = $('[data-sim-avg]', root);
  const ring = createRing($('[data-sim-ring]', root), { onFrame: (v) => { avgLabel.textContent = formatAverage(v); } });
  ring.intro();
  const grades = $('[data-sim-grades]', root);
  const count = $('[data-sim-count]', root);
  const delta = $('[data-sim-delta]', root);
  const goal = $('[data-sim-goal]', root);
  const reset = $('[data-sim-reset]', root);
  const pickers = $$('[data-grade]', root);

  /** Voti alla maniera della scuola: 6+, 6½, 7-. */
  const formatGrade = (v) => {
    const whole = Math.floor(v);
    const part = Math.round((v - whole) * 4) / 4;
    if (part === 0) return `${whole}`;
    if (part === 0.25) return `${whole}+`;
    if (part === 0.5) return `${whole}½`;
    if (part === 0.75) return `${whole + 1}-`;
    return `${whole + 1}`;
  };
  const badge = (value, ghost, index) => {
    const tone = toneOf(value);
    const tag = ghost ? 'button' : 'span';
    const attrs = ghost ? ` type="button" data-remove="${index}" aria-label="Togli il voto ipotetico ${formatGrade(value)}"` : ` role="img" aria-label="Voto ${formatGrade(value)}"`;
    return `<${tag} class="grade tone-${tone}${ghost ? ' ghost' : ''}"${attrs}><svg viewBox="0 0 100 100" aria-hidden="true"><use href="assets/shapes.svg#cookie9Sided"/></svg><span>${formatGrade(value)}</span></${tag}>`;
  };

  const render = (animate = true) => {
    const all = base.concat(extra);
    const average = mean(all);
    if (animate) ring.set(average);
    grades.innerHTML = base.map((v) => badge(v, false)).join('') + extra.map((v, i) => badge(v, true, i)).join('');
    count.textContent = extra.length
      ? `${all.length} voti · con ${extra.length === 1 ? 'un voto ipotetico' : `${extra.length} voti ipotetici`}`
      : `${base.length} voti · media della materia`;
    const diff = average - baseAverage;
    delta.hidden = !extra.length;
    delta.classList.toggle('good', diff >= 0);
    delta.classList.toggle('poor', diff < 0);
    delta.classList.toggle('down', diff < 0);
    delta.lastElementChild.textContent = `${diff >= 0 ? '+' : '−'}${formatAverage(Math.abs(diff))}`;
    reset.hidden = !extra.length;
    for (const button of pickers) button.disabled = extra.length >= maxExtra;

    // Obiettivo: il voto che serve alla prossima prova per arrivare alla media voluta.
    const sum = all.reduce((a, b) => a + b, 0);
    const needed = target * (all.length + 1) - sum;
    if (average >= target && needed <= 1) {
      goal.innerHTML = `Media <b>${target}</b> già raggiunta.`;
    } else if (needed > 10) {
      const tests = Math.ceil((target * all.length - sum) / (10 - target));
      goal.innerHTML = `Per arrivare a <b>${target}</b> non basta una prova: ti servono almeno <b>${tests}</b> voti da 10.`;
    } else {
      goal.innerHTML = `Per arrivare a <b>${target}</b> ti serve almeno <b>${formatGrade(Math.ceil(needed * 4) / 4)}</b> alla prossima prova.`;
    }
  };

  root.addEventListener('click', (event) => {
    const add = event.target.closest('[data-grade]');
    const remove = event.target.closest('[data-remove]');
    if (add && extra.length < maxExtra) { extra.push(Number(add.dataset.grade)); render(); }
    else if (remove) { extra.splice(Number(remove.dataset.remove), 1); render(); }
    else if (event.target.closest('[data-sim-reset]')) { extra = []; render(); }
  });
  render(false);
}

// MARK: - Temi

function initThemes() {
  const group = $('[data-swatches]');
  if (!group) return;
  const swatches = $$('.swatch', group);
  const customSwatch = $('[data-custom-swatch]', group);
  const customInput = $('[data-custom-color]', group);
  const picture = $('[data-accent-shot]');
  const nameLabel = $('[data-accent-name]');
  const iconHolder = $('[data-app-icon]');

  const markSelected = (hex) => {
    let found = false;
    for (const swatch of swatches) {
      const selected = swatch.dataset.accent === hex;
      found ||= selected;
      swatch.setAttribute('aria-checked', String(selected));
    }
    customSwatch.setAttribute('aria-checked', String(!found));
    if (!found) customInput.value = hex;
  };

  const showAccent = async (hex) => {
    const [, name, slug] = await nearestPreset(hex);
    const preset = ACCENTS.some(([value]) => value === hex);
    nameLabel.textContent = preset ? name : 'Il tuo colore';
    if (!picture) return;
    const source = picture.querySelector('source');
    const img = picture.querySelector('img');
    source.srcset = `assets/img/shots/d-accent-${slug}.webp`;
    img.src = `assets/img/shots/l-accent-${slug}.webp`;
  };

  const drawIcon = () => {
    if (iconHolder) iconHolder.innerHTML = appIconSVG({ ...iconColors(), radius: 230 });
  };
  onThemeChange(drawIcon);
  drawIcon();

  const choose = async (hex, origin) => {
    markSelected(hex);
    showAccent(hex);
    await setAccent(hex, origin);
  };

  group.addEventListener('click', (event) => {
    const swatch = event.target.closest('.swatch[data-accent]');
    if (swatch && swatch.getAttribute('aria-checked') !== 'true') choose(swatch.dataset.accent, swatch);
  });
  // Le frecce spostano la scelta tra i colori, come in un gruppo di pulsanti di opzione.
  group.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const index = swatches.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = swatches[(index + step + swatches.length) % swatches.length];
    next.focus();
    choose(next.dataset.accent, next);
  });
  customInput.addEventListener('change', () => choose(customInput.value, customSwatch));
  customInput.addEventListener('focus', () => loadColorLibrary());
  group.addEventListener('pointerenter', () => loadColorLibrary(), { once: true });

  const initial = currentAccent();
  markSelected(initial);
  if (initial !== ACCENTS[0][0]) showAccent(initial);
}

// MARK: - Material 3 Expressive / Liquid Glass

function initCompare() {
  const phone = $('[data-compare]');
  const range = $('[data-compare-range]');
  if (!phone || !range) return;
  const set = () => phone.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', set);
  set();
  // Un piccolo cenno la prima volta che si vede, per far capire che si trascina.
  if (reduceMotion()) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    const frames = [50, 32, 68, 50];
    let i = 0;
    const step = () => {
      if (++i >= frames.length || range.matches(':active')) return;
      phone.animate([{ '--pos': `${frames[i - 1]}%` }, { '--pos': `${frames[i]}%` }], { duration: 650, easing: 'cubic-bezier(.2, 0, 0, 1)' }).finished.then(step);
      phone.style.setProperty('--pos', `${frames[i]}%`);
      range.value = frames[i];
    };
    setTimeout(step, 500);
  }, { threshold: 0.7 });
  observer.observe(phone);
}
