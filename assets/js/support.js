// Pagina di supporto: ricerca nelle domande, filtri per argomento e collegamenti diretti alle risposte
// (support/#altstore apre quella risposta).

import { initModeControls, initReveal } from './ui.js';

for (const init of [initReveal, initModeControls]) {
  try { init(); } catch (error) { console.error(error); }
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const input = $('[data-search-input]');
const search = $('[data-search]');
const clear = $('[data-search-clear]');
const filters = $('[data-filters]');
const topics = $$('[data-topic]');
const empty = $('[data-empty]');
const items = $$('[data-topic] details');

/** Testo senza accenti e in minuscolo, per cercare "attivita" e trovare "attività". */
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

for (const item of items) {
  const question = $('.q', item);
  question.dataset.text = question.textContent;
  item.dataset.haystack = fold(item.textContent);
}

let topic = '';

function escapeHTML(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Evidenzia le parole cercate nella domanda. */
function highlight(question, words) {
  const text = question.dataset.text;
  if (!words.length) { question.textContent = text; return; }
  const folded = fold(text);
  const marks = new Array(text.length).fill(false);
  for (const word of words) {
    let index = folded.indexOf(word);
    while (index !== -1) {
      for (let i = index; i < index + word.length; i++) marks[i] = true;
      index = folded.indexOf(word, index + word.length);
    }
  }
  let html = '';
  let open = false;
  for (let i = 0; i < text.length; i++) {
    if (marks[i] && !open) { html += '<mark>'; open = true; }
    if (!marks[i] && open) { html += '</mark>'; open = false; }
    html += escapeHTML(text[i]);
  }
  if (open) html += '</mark>';
  question.innerHTML = html;
}

function apply() {
  const words = fold(input.value).split(/\s+/).filter((word) => word.length > 1);
  search.classList.toggle('has-text', input.value.length > 0);
  let shown = 0;
  for (const section of topics) {
    let visible = 0;
    const inTopic = !topic || section.id === topic;
    for (const item of $$('details', section)) {
      const match = inTopic && words.every((word) => item.dataset.haystack.includes(word));
      item.hidden = !match;
      highlight($('.q', item), match ? words : []);
      if (match) visible++;
    }
    section.hidden = visible === 0;
    shown += visible;
  }
  empty.classList.toggle('show', shown === 0);
}

input.addEventListener('input', apply);
clear.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
input.addEventListener('keydown', (event) => { if (event.key === 'Escape' && input.value) { input.value = ''; apply(); } });

filters.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-filter]');
  if (!chip) return;
  topic = chip.dataset.filter;
  for (const other of $$('[data-filter]', filters)) other.setAttribute('aria-pressed', String(other === chip));
  apply();
});

/** support/#altstore: mostra e apre quella risposta (anche se un filtro la nascondeva). */
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  if (target.matches('[data-topic] details, [data-topic]')) {
    topic = '';
    input.value = '';
    for (const chip of $$('[data-filter]', filters)) chip.setAttribute('aria-pressed', String(chip.dataset.filter === ''));
    apply();
  }
  if (target.tagName === 'DETAILS') target.open = true;
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}

addEventListener('hashchange', openFromHash);
openFromHash();
