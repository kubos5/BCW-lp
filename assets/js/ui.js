// Pezzi comuni alle pagine: barra in alto (tema chiaro/scuro), comparsa allo scorrimento, anelli
// della media (l'indicatore circolare ondulato di M3 Expressive, come `RingShape` dell'app).

import { setMode, isDark, onThemeChange, currentMode } from './theme.js';

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// MARK: - Tema chiaro/scuro dalla barra in alto e dai gruppi di pulsanti

export function initModeControls() {
  const toggles = document.querySelectorAll('[data-mode-toggle]');
  const groups = document.querySelectorAll('[data-mode-group]');
  const sync = () => {
    const dark = isDark();
    for (const button of toggles) {
      button.setAttribute('aria-label', dark ? 'Passa al tema chiaro' : 'Passa al tema scuro');
      button.querySelector('use')?.setAttribute('href', button.querySelector('use').getAttribute('href').replace(/#.*$/, dark ? '#sun' : '#darkMode'));
    }
    const mode = currentMode();
    for (const group of groups) {
      for (const button of group.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
  };
  for (const button of toggles) button.addEventListener('click', () => setMode(isDark() ? 'light' : 'dark', button));
  for (const group of groups) {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]');
      if (button && button.getAttribute('aria-pressed') !== 'true') setMode(button.dataset.mode, button);
    });
  }
  onThemeChange(sync);
  sync();
}

// MARK: - Comparsa allo scorrimento

export function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion()) {
    for (const item of items) item.classList.add('in');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  for (const item of items) observer.observe(item);
}

// MARK: - Anello della media

/** Tono di un voto o di una media, come `Theme.tone(value:)` dell'app. */
export const toneOf = (value) => (value >= 6 ? 'good' : value >= 5.5 ? 'fair' : 'poor');

/** "7,43" */
export const formatAverage = (value) => value.toFixed(2).replace('.', ',');

function arc(c, r, from, to) {
  const large = to - from > Math.PI ? 1 : 0;
  const p = (a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(from)} A ${r} ${r} 0 ${large} 1 ${p(to)}`;
}

/**
 * Tracciati dell'anello: la parte piena ondulata (l'onda si appiattisce agli estremi) e, dopo uno
 * spazio, la traccia. Stessa geometria di `Shared/RingShape.swift`.
 */
export function ringPaths(size, lineWidth, progress) {
  const r = (size - lineWidth) / 2 - (size >= 60 ? 3 : 0);
  const c = size / 2;
  const start = -Math.PI / 2;
  const gap = (lineWidth * 1.1 + 4) / r;
  const end = start + progress * 2 * Math.PI;
  let track = '';
  if (progress < 0.999) {
    const from = progress > 0 ? end + gap : start;
    const to = start + 2 * Math.PI - (progress > 0 ? gap : 0);
    if (to > from) track = arc(c, r, from, to);
  }
  let value = '';
  if (progress > 0) {
    const to = progress >= 0.999 ? start + 2 * Math.PI : end;
    const amplitude = Math.min(3, size / 40);
    const wavelength = Math.max(16, size / 4);
    const length = (to - start) * r;
    const steps = Math.max(8, Math.ceil(length / 2));
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = start + ((to - start) * i) / steps;
      const s = (t - start) * r;
      const fade = Math.min(1, s / wavelength, (length - s) / wavelength);
      const rr = r + amplitude * fade * Math.sin((s / wavelength) * 2 * Math.PI);
      points.push(`${(c + rr * Math.cos(t)).toFixed(2)} ${(c + rr * Math.sin(t)).toFixed(2)}`);
    }
    value = `M ${points.join(' L ')}`;
  }
  return { track, value };
}

/** Molla smorzata (rimbalzo leggero, come `Motion.spatialSlow`): 0 → 1 in circa 700 ms. */
function spring(t) {
  const zeta = 0.72;
  const omega = 2 * Math.PI / 0.62;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t));
}

/** Un anello in `element` (con `data-ring`, `data-size`, `data-line`); `set(value)` lo anima. */
export function createRing(element, { onFrame } = {}) {
  const size = Number(element.dataset.size) || 120;
  const line = Number(element.dataset.line) || 10;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(ns, 'path');
  const value = document.createElementNS(ns, 'path');
  track.setAttribute('class', 'track');
  value.setAttribute('class', 'value');
  for (const path of [track, value]) path.setAttribute('stroke-width', line);
  svg.append(track, value);
  element.prepend(svg);

  let shown = Number(element.dataset.ring) || 0;
  let frame = 0;
  const draw = (v) => {
    const paths = ringPaths(size, line, Math.min(1, Math.max(0, v / 10)));
    track.setAttribute('d', paths.track);
    value.setAttribute('d', paths.value);
    onFrame?.(v);
  };
  const setTone = (v) => {
    element.classList.remove('tone-good', 'tone-fair', 'tone-poor');
    element.classList.add(`tone-${toneOf(v)}`);
  };
  draw(shown);
  setTone(shown);

  return {
    set(target, { animate = true } = {}) {
      cancelAnimationFrame(frame);
      setTone(target);
      if (!animate || reduceMotion()) { shown = target; draw(target); return; }
      const from = shown;
      const begin = performance.now();
      const tick = (now) => {
        const t = (now - begin) / 1000;
        const k = t > 1.2 ? 1 : spring(t);
        shown = from + (target - from) * k;
        draw(shown);
        if (t <= 1.2) frame = requestAnimationFrame(tick);
        else shown = target;
      };
      frame = requestAnimationFrame(tick);
    },
    /** Da 0 al valore, quando l'anello entra nello schermo. */
    intro() {
      const target = shown;
      shown = 0;
      draw(0);
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setTimeout(() => this.set(target), 250);
      }, { threshold: 0.5 });
      observer.observe(element);
    },
  };
}
