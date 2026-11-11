// Jonas Thiaucourt — interactions légères, le site fonctionne sans JS.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Barre de navigation : fond au défilement, menu mobile, section active
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const btn = $('.menu-btn');
  btn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  $$('.nav ul a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
  }));

  const links = new Map($$('.nav ul a').map(a => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('active'));
      links.get(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  // Apparition douce des blocs
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  // Rose des vents : construite à partir des cartes de prestations
  const svg = $('.compass');
  const services = $$('.service[data-dir]');
  if (!svg || !services.length) return;

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    parent?.appendChild(n);
    return n;
  };
  const ANGLE = { N: 0, E: 90, S: 180, W: 270, O: 270 };

  // Couronne graduée
  const tickR = 134, ticks = 64, circ = 2 * Math.PI * tickR;
  el('circle', { class: 'ring', r: tickR, 'stroke-width': 9, 'stroke-dasharray': `2.2 ${circ / ticks - 2.2}`, opacity: .55 }, svg);
  el('circle', { class: 'ring', r: 120, 'stroke-width': 5 }, svg);
  el('circle', { class: 'ring', r: 78, 'stroke-width': 1.2 }, svg);
  el('circle', { class: 'ring', r: 66, 'stroke-width': 1.2 }, svg);
  el('circle', { class: 'ring', r: 72, 'stroke-width': 11, 'stroke-dasharray': `1.2 ${(2 * Math.PI * 72) / 32 - 1.2}`, opacity: .6 }, svg);

  const point = (parent, angle, len, w, cls = '') => {
    const g = el('g', { transform: `rotate(${angle})`, class: cls }, parent);
    el('path', { class: 'pt-light', d: `M0 0 L0 ${-len} L${-w} ${-w} Z` }, g);
    el('path', { class: 'pt-dark', d: `M0 0 L0 ${-len} L${w} ${-w} Z` }, g);
    return g;
  };

  const minor = el('g', { class: 'minor' }, svg);
  [45, 135, 225, 315].forEach(a => point(minor, a, 100, 15));
  [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].forEach(a => point(minor, a, 62, 8));

  const byDir = {};
  services.forEach(card => {
    const dir = card.dataset.dir;
    const a = ANGLE[dir];
    const link = el('a', { href: `#${card.id}`, 'aria-label': card.dataset.short }, svg);
    const g = point(link, a, 165, 21, 'main');
    // Lettre cardinale à l'intérieur de la couronne
    const rad = (a - 90) * Math.PI / 180;
    const t = el('text', { class: 'card-pt', x: Math.cos(rad) * 97, y: Math.sin(rad) * 97 + 4, 'text-anchor': 'middle' }, link);
    t.textContent = dir;
    // Libellé à l'extérieur, sur deux lignes au besoin
    const lab = el('g', { class: 'label' }, link);
    const words = card.dataset.short.split('|');
    const r = dir === 'N' || dir === 'S' ? 192 : 200;
    let x = Math.cos(rad) * r, y = Math.sin(rad) * r;
    const lh = 22, h = (words.length - 1) * lh;
    if (dir === 'N') y -= h;
    if (dir === 'E' || dir === 'W' || dir === 'O') { y = -34 - h; x = Math.sign(x) * 196; }
    words.forEach((w, i) => {
      const tx = el('text', { x, y: y + i * lh + 5, 'text-anchor': 'middle' }, lab);
      tx.textContent = w;
    });
    byDir[dir] = { g, lab, card, a };
  });

  // Aiguille orange qui pointe vers la prestation survolée
  const needle = el('g', { class: 'needle' }, svg);
  el('path', { d: 'M0 -112 L7 0 L0 10 L-7 0 Z', fill: 'var(--signal)' }, needle);
  el('circle', { r: 9, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
  el('circle', { r: 3, fill: 'var(--ink)' }, svg);

  let current = 0;
  const point2 = target => {
    // Rotation par le plus court chemin
    const d = ((target - current) % 360 + 540) % 360 - 180;
    current += d;
    needle.style.transform = `rotate(${current}deg)`;
  };
  const activate = dir => {
    Object.entries(byDir).forEach(([k, v]) => {
      const on = k === dir;
      v.g.classList.toggle('on', on);
      v.lab.classList.toggle('on', on);
      v.card.classList.toggle('on', on);
    });
    if (dir) point2(byDir[dir].a);
  };

  Object.entries(byDir).forEach(([dir, v]) => {
    v.card.addEventListener('mouseenter', () => activate(dir));
    v.card.addEventListener('focusin', () => activate(dir));
    v.g.parentNode.addEventListener('mouseenter', () => activate(dir));
    v.g.parentNode.addEventListener('focus', () => activate(dir));
  });

  // Au défilement (mobile surtout), l'aiguille suit la carte au centre de l'écran
  const follow = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) activate(e.target.dataset.dir);
  }), { rootMargin: '-45% 0px -50% 0px' });
  services.forEach(c => follow.observe(c));
})();
