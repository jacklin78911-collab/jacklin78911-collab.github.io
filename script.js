const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu(returnFocus = false) {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开导航');
  if (returnFocus) menuButton.focus();
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
  navigation.classList.toggle('is-open', isOpen);
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((element) => {
    element.classList.add('is-pending');
    observer.observe(element);
  });
}

document.querySelector('#year').textContent = new Date().getFullYear();

// Only track a pointer while it is over a surface; no idle animation loop.
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
const activeSurfaces = new Set();

document.querySelectorAll('.hero, .button, .project-card, .featured-project, .research-item').forEach((surface) => {
  const isHero = surface.classList.contains('hero');
  const isButton = surface.classList.contains('button');
  let bounds;
  let frame = 0;
  let x = 0;
  let y = 0;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    bounds = null;
    surface.classList.remove('is-pointer-over');
    ['--light-x', '--light-y', '--move-x', '--move-y', '--tilt-x', '--tilt-y'].forEach((property) => surface.style.removeProperty(property));
    activeSurfaces.delete(reset);
  }

  function paint() {
    frame = 0;
    surface.style.setProperty('--light-x', `${(x + 0.5) * 100}%`);
    surface.style.setProperty('--light-y', `${(y + 0.5) * 100}%`);
    const distance = isHero ? 22 : isButton ? 12 : 0;
    surface.style.setProperty('--move-x', `${x * distance}px`);
    surface.style.setProperty('--move-y', `${y * distance}px`);
    if (surface.classList.contains('project-card')) {
      surface.style.setProperty('--tilt-x', `${-y * 5}deg`);
      surface.style.setProperty('--tilt-y', `${x * 5}deg`);
    }
  }

  function track(event) {
    if (!precisePointer.matches || reducedMotion.matches || event.pointerType === 'touch') {
      reset();
      return;
    }
    if (!bounds) {
      bounds = surface.getBoundingClientRect();
      surface.classList.add('is-pointer-over');
      activeSurfaces.add(reset);
    }
    x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
    y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
    if (!frame) frame = requestAnimationFrame(paint);
  }

  surface.addEventListener('pointerenter', track);
  surface.addEventListener('pointermove', track);
  surface.addEventListener('pointerleave', reset);
  surface.addEventListener('pointercancel', reset);
});

function resetSurfaces() {
  activeSurfaces.forEach((reset) => reset());
}

// Reset cached geometry when scrolling, changing input mode, or leaving the page.
window.addEventListener('scroll', resetSurfaces, { passive: true });
window.addEventListener('resize', resetSurfaces, { passive: true });
window.addEventListener('blur', resetSurfaces);
precisePointer.addEventListener('change', resetSurfaces);
reducedMotion.addEventListener('change', resetSurfaces);
