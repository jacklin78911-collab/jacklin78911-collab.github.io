const views = [
  { id: 'overview', label: 'OVERVIEW', kind: 'PERSONAL INDEX', title: 'Research & Open Source' },
  { id: 'research', label: 'RESEARCH', kind: 'RESEARCH INTERESTS', title: '研究方向' },
  { id: 'mooncake', label: 'MOONCAKE', kind: 'OPEN-SOURCE CONTRIBUTIONS', title: 'Mooncake 开源贡献' },
  { id: 'kvcache', label: 'KV CACHE', kind: 'SYSTEMS STUDY', title: 'KV Cache Tiering' },
  { id: 'glossa', label: 'GLOSSA', kind: 'READING & QUESTIONING', title: 'Glossa' },
  { id: 'about', label: 'ABOUT', kind: 'ABOUT ME', title: '关于我' }
];
const tabs = [...document.querySelectorAll('.orbit-card')];
const panels = [...document.querySelectorAll('.panel')];
const readerBody = document.querySelector('.reader-body');
let currentView;

function viewFromHash() {
  const id = location.hash.slice(1);
  return ({ home: 'overview', projects: 'mooncake' })[id] || id;
}

function showView(id, { push = false, focus = false } = {}) {
  const index = Math.max(0, views.findIndex(view => view.id === id));
  const view = views[index];
  if (push && location.hash !== '#' + view.id) history.pushState(null, '', '#' + view.id);
  if (currentView !== view.id) {
    panels.forEach(panel => { panel.hidden = panel.id !== view.id; });
    tabs.forEach(tab => {
      const selected = tab.dataset.view === view.id;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.navigation a').forEach(link => {
      const group = ['mooncake', 'kvcache', 'glossa'].includes(view.id) ? 'mooncake' : view.id;
      if (link.dataset.view === group) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.getElementById('view-number').textContent = String(index + 1).padStart(2, '0');
    document.getElementById('view-label').textContent = view.label;
    document.getElementById('view-kind').textContent = view.kind;
    document.querySelectorAll('.page-dots i').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
    document.title = 'Liqian Lin — ' + view.title;
    readerBody.scrollTop = 0;
    if (currentView) document.getElementById('view-status').textContent = view.title;
    currentView = view.id;
  }
  if (focus) document.getElementById(view.id).focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-view]');
  if (!trigger || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showView(trigger.dataset.view, { push: true, focus: Boolean(trigger.closest('.panel')) });
});
document.querySelector('.orbit-tabs').addEventListener('keydown', event => {
  const tabIndex = tabs.indexOf(event.target);
  if (tabIndex < 0) return;
  let next;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (tabIndex + 1) % tabs.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (tabIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[next].focus({ preventScroll: true });
  showView(tabs[next].dataset.view, { push: true });
});
function syncHash() {
  const focusHiddenPanel = Boolean(document.activeElement.closest('.panel'));
  const focusTab = tabs.includes(document.activeElement);
  showView(viewFromHash(), { focus: focusHiddenPanel });
  if (focusTab) tabs.find(tab => tab.dataset.view === currentView).focus({ preventScroll: true });
}
window.addEventListener('hashchange', syncHash);
showView(viewFromHash());
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById(currentView).focus();
});

// The stationary button owns the hit area; only its paper surface moves.
const motion = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 961px) and (prefers-reduced-motion: no-preference)');
const scene = document.querySelector('.orbit-scene');
let frame = 0;
let pointer;
function resetMotion() {
  cancelAnimationFrame(frame);
  frame = 0;
  pointer = undefined;
  scene.style.removeProperty('--art-x');
  scene.style.removeProperty('--art-y');
  tabs.forEach(tab => ['--rx', '--ry', '--gx', '--gy'].forEach(key => tab.style.removeProperty(key)));
}
scene.addEventListener('pointermove', event => {
  if (!motion.matches || event.pointerType === 'touch') return;
  pointer = { x: event.clientX, y: event.clientY, tab: event.target.closest('.orbit-card') };
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const bounds = scene.getBoundingClientRect();
    const x = (pointer.x - bounds.left) / bounds.width - .5;
    const y = (pointer.y - bounds.top) / bounds.height - .5;
    scene.style.setProperty('--art-x', x * 34 + 'px');
    scene.style.setProperty('--art-y', y * 34 + 'px');
    tabs.forEach(tab => {
      if (tab !== pointer.tab) {
        tab.style.removeProperty('--rx');
        tab.style.removeProperty('--ry');
        return;
      }
      const box = tab.getBoundingClientRect();
      const dx = Math.max(-.5, Math.min(.5, (pointer.x - box.left) / box.width - .5));
      const dy = Math.max(-.5, Math.min(.5, (pointer.y - box.top) / box.height - .5));
      tab.style.setProperty('--rx', -dy * 20 + 'deg');
      tab.style.setProperty('--ry', dx * 20 + 'deg');
      tab.style.setProperty('--gx', (dx + .5) * 100 + '%');
      tab.style.setProperty('--gy', (dy + .5) * 100 + '%');
    });
  });
});
scene.addEventListener('pointerleave', resetMotion);
motion.addEventListener('change', resetMotion);
window.addEventListener('blur', resetMotion);

