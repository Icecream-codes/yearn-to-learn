import Lenis from 'lenis';

const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const motion = root.classList.contains('motion');
$('#year').textContent = new Date().getFullYear();

/* ---------- Enquiry form ---------- */
// GitHub Pages has no server, so the form hands off to the visitor's email app.
$('#enquiry').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.reportValidity()) return;
  const d = new FormData(form);
  const lines = [`Name: ${d.get('name')}`];
  if (d.get('company')) lines.push(`Company: ${d.get('company')}`);
  lines.push(`Email: ${d.get('email')}`, `Service: ${d.get('service')}`, '', d.get('message') || '');
  const subject = `Website enquiry: ${d.get('service')}`;
  window.location.href = `mailto:info@yearn2learn.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  $('#formNote').textContent = 'Your email app should now be open. If not, write to info@yearn2learn.co.za.';
});

/* ---------- Mobile menu ---------- */
const nav = $('#nav');
const toggle = $('#navToggle');
function setMenu(open) {
  nav.classList.toggle('nav--open', open);
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('no-scroll', open);
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('nav--open')));
$$('#navLinks a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Smooth scrolling and anchors ---------- */
const lenis = motion ? new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true, anchors: false }) : null;

document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const y = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - (id === 'contact' ? 0 : 72);
  if (lenis) lenis.scrollTo(y, { duration: 1.5 });
  else window.scrollTo(0, y);
  history.replaceState(null, '', `#${id}`);
});

/* ---------- Headlines rise in, word by word ---------- */
if (motion) {
  $$('[data-split]').forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.textContent = '';
    words.forEach((w, i) => {
      const outer = document.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.style.transitionDelay = `${i * 45}ms`;
      inner.textContent = w;
      outer.append(inner);
      h.append(outer, ' ');
    });
  });
}

/* ---------- Things that appear as you reach them ---------- */
const targets = $$('[data-reveal], [data-split]');
if (motion) {
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      seen.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
  // Neighbouring items follow one another rather than landing together.
  $$('.cards, .wall, .tiles, .dna__grid').forEach((group) => {
    [...group.children].forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; });
  });
  targets.forEach((el) => seen.observe(el));
} else {
  targets.forEach((el) => el.classList.add('in'));
}

/* ---------- The footage ---------- */
function createFilm() {
  const canvas = $('#filmCanvas');
  const ctx = canvas.getContext('2d');
  const slotEl = $('#filmSlot');
  const conn = navigator.connection;
  const lean = Boolean(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));
  const portrait = window.innerWidth / window.innerHeight < 0.85;
  // The focus point keeps the truck centred while the frame is small.
  const set = portrait ? { dir: 'm', count: 32, fx: 0.5, fy: 0.55, zoom: 1.0 } : { dir: 'd', count: 48, fx: 0.31, fy: 0.58, zoom: 1.02 };
  const frames = new Array(set.count).fill(null);
  const url = (i) => `assets/film/${set.dir}/${String(i + 1).padStart(3, '0')}.webp`;

  let width = 0;
  let height = 0;
  let slot = { x: 0, y: 0, w: 1, h: 1 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = slotEl.getBoundingClientRect();
    const stage = slotEl.parentElement.getBoundingClientRect();
    slot = { x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height };
  }

  function loadFrame(i) {
    if (frames[i]) return Promise.resolve();
    const im = new Image();
    im.decoding = 'async';
    im.src = url(i);
    return im.decode().then(() => { frames[i] = im; }).catch(() => {});
  }

  // Coarse frames first, so scrubbing works before everything has arrived.
  async function loadAll() {
    await loadFrame(0);
    root.classList.add('film-ready');
    const strides = lean ? [8] : [8, 4, 2, 1];
    for (const stride of strides) {
      const batch = [];
      for (let i = 0; i < set.count; i += stride) if (!frames[i]) batch.push(i);
      for (let i = 0; i < batch.length; i += 4) {
        await Promise.all(batch.slice(i, i + 4).map(loadFrame));
      }
    }
  }

  const nearest = (i, step) => {
    for (let k = i; k >= 0 && k < set.count; k += step) if (frames[k]) return k;
    return -1;
  };

  function draw(frame, grow, breathe) {
    const a = nearest(Math.floor(frame), -1);
    if (a < 0) return;
    let b = nearest(Math.ceil(frame), 1);
    if (b < 0) b = a;
    const mix = b === a ? 0 : clamp((frame - a) / (b - a));

    // Phones keep the whole truck in view: the footage fills the top, the words sit below it.
    const finalH = portrait ? height * clamp(1 - 350 / height, 0.42, 0.6) : height;
    const win = {
      x: lerp(slot.x, 0, grow), y: lerp(slot.y, 0, grow), w: lerp(slot.w, width, grow), h: lerp(slot.h, finalH, grow),
    };
    const im = frames[a];
    const zoom = lerp(set.zoom, 1, grow) * breathe;
    const scale = Math.max(win.w / im.naturalWidth, win.h / im.naturalHeight) * zoom;
    const dw = im.naturalWidth * scale;
    const dh = im.naturalHeight * scale;
    const fx = lerp(set.fx, 0.5, grow);
    const fy = lerp(set.fy, 0.5, grow);
    const dx = clamp(win.x + win.w / 2 - fx * dw, win.x + win.w - dw, win.x);
    const dy = clamp(win.y + win.h / 2 - fy * dh, win.y + win.h - dh, win.y);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();
    ctx.globalAlpha = 1;
    ctx.drawImage(im, dx, dy, dw, dh);
    if (mix > 0.01) {
      ctx.globalAlpha = mix;
      ctx.drawImage(frames[b], dx, dy, dw, dh);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return { resize, loadAll, draw, count: set.count, isReady: () => Boolean(frames[0]) };
}

/* ---------- Scroll-linked details ---------- */
const filmSection = $('.film');
const filmCopy = $('#filmCopy');
const filmType = $('.film__type');
const statement = $('#filmStatement');
const scrim = $('#filmScrim');
const feather = $('#feather');
const road = $('#road');
const roadFill = $('#roadFill');
const roadTruck = $('#roadTruck');
const stops = $$('#roadStops > li');
const dnaVideo = $('#dnaVideo');
const parallax = $$('.about__media img');

let film = null;
let filmTop = 0;
let filmRange = 1;
let solidFrom = 0;
let roadTop = 0;
let roadHeight = 1;
let vertical = false;

function measure() {
  const y = window.scrollY;
  const r = filmSection.getBoundingClientRect();
  filmTop = r.top + y;
  filmRange = Math.max(1, r.height - window.innerHeight);
  solidFrom = filmTop + r.height - 70;
  const rr = road.getBoundingClientRect();
  roadTop = rr.top + y;
  roadHeight = rr.height;
  vertical = window.matchMedia('(max-width: 860px)').matches;
  film?.resize();
}

function setNav(y) {
  nav.classList.toggle('nav--solid', y > (motion ? solidFrom : 40));
}

function setRoad(y) {
  const vh = window.innerHeight;
  const p = clamp((y + vh * 0.72 - roadTop) / (roadHeight + vh * 0.12));
  roadFill.style.transform = vertical ? `scaleY(${p})` : `scaleX(${p})`;
  roadTruck.style.transform = vertical
    ? `translate3d(0, ${p * (roadHeight - 56)}px, 0)`
    : `translate3d(${p * (road.clientWidth - roadTruck.clientWidth)}px, 0, 0)`;
  stops.forEach((li, i) => li.classList.toggle('on', p >= (i / (stops.length - 1)) * 0.94));
}

let y = window.scrollY;
let then = performance.now();
let drawn = '';

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - then) / 1000) || 0.016;
  then = now;
  lenis?.raf(now);
  const target = window.scrollY;
  y += (target - y) * (1 - Math.exp(-dt * 12));
  if (Math.abs(target - y) < 0.1) y = target;

  const p = clamp((y - filmTop) / filmRange);
  if (y < filmTop + filmRange + window.innerHeight) {
    const grow = smooth(0.05, 0.46, p);
    // The footage breathes very slightly at rest, so the opening never feels frozen.
    const breathe = 1 + Math.sin(now / 3200) * 0.006 * (1 - grow);
    const frame = clamp(smooth(0.02, 1, p) * (film ? film.count - 1 : 0), 0, (film ? film.count : 1) - 1);
    const key = `${frame.toFixed(2)}|${grow.toFixed(4)}|${breathe.toFixed(4)}`;
    if (film?.isReady() && key !== drawn) {
      film.draw(frame, grow, breathe);
      drawn = key;
    }
    filmCopy.style.opacity = 1 - smooth(0.03, 0.2, p);
    filmType.style.opacity = 1 - smooth(0.05, 0.24, p);
    filmType.style.transform = `translate3d(${-smooth(0.03, 0.3, p) * 7}vw, 0, 0)`;
    filmCopy.style.transform = `translate3d(0, ${-p * 90}px, 0)`;
    scrim.style.opacity = smooth(0.28, 0.6, p);
    statement.style.opacity = smooth(0.52, 0.66, p);
    statement.style.transform = `translate3d(0, ${(1 - smooth(0.52, 0.7, p)) * 28}px, 0)`;
    statement.classList.toggle('live', p > 0.56);
    feather.style.transform = `translate3d(-50%, -50%, 0) rotate(${(y / window.innerHeight) * 9}deg)`;
  }

  setNav(y);
  setRoad(y);
  for (const img of parallax) {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < -80 || r.top > window.innerHeight + 80) continue;
    const u = (r.top + r.height / 2) / window.innerHeight - 0.5;
    img.style.setProperty('--py', `${(u * -7).toFixed(2)}%`);
  }
}

/* ---------- The calm loop only loads and plays when it is on screen ---------- */
if (motion && dnaVideo) {
  const watch = new IntersectionObserver(([en]) => {
    if (en.isIntersecting) {
      const s = $('source', dnaVideo);
      if (s.dataset.src) {
        s.src = s.dataset.src;
        delete s.dataset.src;
        dnaVideo.load();
      }
      dnaVideo.play().catch(() => {});
    } else {
      dnaVideo.pause();
    }
  }, { rootMargin: '200px 0px' });
  watch.observe(dnaVideo);
}

/* ---------- Start ---------- */
if (motion) {
  root.classList.add('staged');
  film = createFilm();
  measure();
  film.loadAll();
  requestAnimationFrame(tick);
} else {
  measure();
  window.addEventListener('scroll', () => { setNav(window.scrollY); setRoad(window.scrollY); }, { passive: true });
  setNav(window.scrollY);
  setRoad(window.scrollY);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { measure(); drawn = ''; }, 120);
});
window.addEventListener('load', () => { measure(); drawn = ''; });

// Test hook for automated checks.
if (new URLSearchParams(location.search).has('debug')) window.__y2l = { lenis, measure };
