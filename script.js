const chapters = [...document.querySelectorAll('.chapter')];
history.scrollRestoration = 'manual';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.getElementById('site-index');
const nextButton = document.getElementById('next-scene');
const labels = chapters.map(chapter => chapter.dataset.label);
let active = -1;
let progress = 0;
let target = 0;
let frame = 0;
let lastTime = 0;
let width = innerWidth;
let height = innerHeight;
let pointerX = 0;
let pointerY = 0;

const track = document.createElement('div');
track.className = 'scroll-track';
track.setAttribute('aria-hidden', 'true');
chapters.forEach(() => {
  const step = document.createElement('div');
  step.className = 'scroll-step';
  track.append(step);
});
document.body.append(track);
document.documentElement.classList.add('js');
const steps = [...track.children];

const canvas = document.getElementById('star-field');
const ctx = canvas.getContext('2d');
const moon = document.querySelector('.moon');
const stars = Array.from({ length: 170 }, (_, index) => ({
  x: ((Math.sin(index * 127.1 + 5) * 43758.5453) % 1 + 1) % 1,
  y: ((Math.sin(index * 311.7 + 8) * 25123.823) % 1 + 1) % 1,
  size: index % 13 === 0 ? 1.6 : .7,
  alpha: .12 + (index % 7) * .045
}));

function paintUniverse(p) {
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const x = (star.x * width + Math.sin(p * .7) * (20 + star.size * 25) + width) % width;
      const y = (star.y * height - p * (10 + star.size * 8) + height * 2) % height;
      ctx.fillStyle = 'rgba(215,225,206,' + star.alpha + ')';
      ctx.fillRect(Math.round(x), Math.round(y), star.size, star.size);
    }
    // A projected orbital plane rotates with scroll; nothing runs while idle.
    const cx = width * (.69 - Math.min(p, 1) * .32);
    const cy = height * (.51 + Math.sin(p * 1.2) * .09);
    const radius = Math.min(width, height) * (.56 + Math.sin(p * 1.4) * .10);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-.32 + p * .27);
    for (let ring = 0; ring < 4; ring++) {
      const r = radius * (.93 + ring * .12);
      for (let dot = 0; dot < 240; dot++) {
        const angle = dot / 240 * Math.PI * 2 + p * .13;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * (.31 + ring * .045);
        ctx.fillStyle = 'rgba(201,215,184,' + (.09 + ring * .012) + ')';
        ctx.fillRect(x, y, dot % 12 === 0 ? 2 : 1, dot % 12 === 0 ? 2 : 1);
      }
    }
    ctx.restore();
  }
  const homeBlend = Math.max(0, 1 - p);
  const small = width <= 700;
  const x = small ? 78 - Math.min(p, 1) * 22 : 72 - Math.min(p, 1) * 46;
  const scale = small ? 1 - Math.min(p, 1) * .3 : 1 - Math.min(p, 1) * .42;
  moon.style.left = x + '%';
  moon.style.top = (small ? 38 : 49) + Math.sin(p * 1.4) * 7 + '%';
  moon.style.opacity = (small ? .62 : .84) * (.53 + homeBlend * .47);
  moon.style.transform = 'translate(calc(-50% + ' + pointerX + 'px),calc(-50% + ' + pointerY + 'px)) scale(' + scale + ') rotate(' + p * 13 + 'deg)';
}

function selectActive(index) {
  if (index === active) return;
  const focusedChapter = document.activeElement.closest('.chapter');
  active = index;
  chapters.forEach((chapter, i) => {
    const selected = i === active;
    chapter.classList.toggle('is-active', selected);
    chapter.inert = !selected;
    chapter.setAttribute('aria-hidden', String(!selected));
  });
  document.getElementById('current-label').textContent = labels[index];
  document.getElementById('current-number').textContent = String(index + 1).padStart(2, '0');
  nextButton.disabled = index === chapters.length - 1;
  document.getElementById('scroll-label').textContent = index === 0 ? '滚动探索' : index === chapters.length - 1 ? '已到最后一幕' : '继续向下';
  document.title = index === 0 ? '林李谦 Liqian Lin' : labels[index] + ' — 林李谦';
  document.querySelectorAll('#site-index nav a').forEach(link => {
    if (link.hash === '#' + chapters[index].id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (focusedChapter && focusedChapter !== chapters[index]) {
    chapters[index].setAttribute('tabindex', '-1');
    chapters[index].focus({ preventScroll: true });
  }
}

function render(now) {
  frame = 0;
  const dt = lastTime ? Math.min(now - lastTime, 40) : 16;
  lastTime = now;
  progress = reducedMotion.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt / 70));
  if (Math.abs(progress - target) < .0005) progress = target;
  selectActive(Math.max(0, Math.min(chapters.length - 1, Math.round(progress))));
  chapters.forEach((chapter, i) => {
    const distance = i - progress;
    const opacity = reducedMotion.matches ? Number(i === active) : Math.max(0, 1 - Math.abs(distance) * 1.85);
    chapter.style.opacity = opacity;
    chapter.style.transform = reducedMotion.matches ? 'none' : 'translate3d(0,' + distance * 100 + 'px,0) scale(' + (1 - Math.min(Math.abs(distance), 1) * .07) + ')';
  });
  document.getElementById('position-fill').style.width = ((progress + 1) / chapters.length * 100) + '%';
  paintUniverse(progress);
  if (progress !== target && !document.hidden) frame = requestAnimationFrame(render);
  else {
    lastTime = 0;
    if (Math.abs(progress - active) < .005 && location.hash !== '#' + chapters[active].id) {
      history.replaceState(null, '', '#' + chapters[active].id);
    }
  }
}
function requestRender() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(render);
}
function updateScroll() {
  const unit = steps[0].getBoundingClientRect().height;
  target = Math.max(0, Math.min(chapters.length - 1, scrollY / unit));
  requestRender();
}
function resize() {
  width = innerWidth;
  height = innerHeight;
  if (ctx) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  updateScroll();
}
function navigate(index, { push = true, instant = false } = {}) {
  const i = Math.max(0, Math.min(chapters.length - 1, index));
  if (push && location.hash !== '#' + chapters[i].id) history.pushState(null, '', '#' + chapters[i].id);
  scrollTo({ top: steps[i].offsetTop, behavior: 'instant' });
  target = i;
  if (instant || reducedMotion.matches) progress = i;
  requestRender();
}
function hashIndex() {
  const id = location.hash.slice(1);
  const aliases = { overview: 'home', about: 'home', research: 'vllm', kvcache: 'vllm', projects: 'mooncake' };
  return Math.max(0, chapters.findIndex(chapter => chapter.id === (aliases[id] || id)));
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0) return;
  if (link.classList.contains('skip-link')) {
    event.preventDefault();
    chapters[active].setAttribute('tabindex', '-1');
    chapters[active].focus({ preventScroll: true });
    return;
  }
  const index = chapters.findIndex(chapter => chapter.id === link.hash.slice(1));
  if (index < 0) return;
  event.preventDefault();
  if (menu.open) menu.close();
  navigate(index);
});
document.getElementById('index-toggle').addEventListener('click', () => menu.showModal());
document.getElementById('index-close').addEventListener('click', () => menu.close());
menu.addEventListener('click', event => { if (event.target === menu) menu.close(); });
nextButton.addEventListener('click', () => navigate(active + 1));
window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('hashchange', () => navigate(hashIndex(), { push: false }));
reducedMotion.addEventListener('change', requestRender);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  else updateScroll();
});
window.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse') return;
  pointerX = (event.clientX / width - .5) * 20;
  pointerY = (event.clientY / height - .5) * 14;
  requestRender();
}, { passive: true });
resize();
navigate(hashIndex(), { push: false, instant: true });
selectActive(hashIndex());

