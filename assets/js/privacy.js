// Informativa sulla privacy: l'indice a lato segue la sezione che si sta leggendo.

import { initModeControls, initReveal } from './ui.js';

function initToc() {
  const toc = document.querySelector('[data-toc]');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
  let frame = 0;

  const update = () => {
    frame = 0;
    const line = innerHeight * 0.3;
    let current = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= line) current = index; });
    // In fondo alla pagina le ultime sezioni, corte, non arrivano alla linea: vale l'ultima.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections.length - 1;
    links.forEach((link, index) => {
      link.classList.toggle('active', index === current);
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  addEventListener('scroll', () => { frame ||= requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  update();
}

for (const init of [initReveal, initModeControls, initToc]) {
  try { init(); } catch (error) { console.error(error); }
}
