(() => {
  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = prefersReduced.matches;
  let lowMotion = false;

  const setVar = (name, value) => root.style.setProperty(name, value);
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const state = {
    mx: 0.5,
    my: 0.5,
    scroll: 0,
    targetMx: 0.5,
    targetMy: 0.5,
    targetScroll: 0,
    ticking: false,
    lastTs: 0,
    fpsSamples: [],
  };

  function applyMotionClass() {
    document.body.classList.toggle('reduced-motion', reducedMotion || lowMotion);
  }

  function sampleFps(ts) {
    if (!state.lastTs) {
      state.lastTs = ts;
      return;
    }
    const dt = ts - state.lastTs;
    state.lastTs = ts;
    if (dt <= 0) return;
    const fps = 1000 / dt;
    state.fpsSamples.push(fps);
    if (state.fpsSamples.length > 32) state.fpsSamples.shift();

    if (state.fpsSamples.length >= 18) {
      const avg = state.fpsSamples.reduce((a, b) => a + b, 0) / state.fpsSamples.length;
      const shouldLowMotion = avg < 42;
      if (shouldLowMotion !== lowMotion) {
        lowMotion = shouldLowMotion;
        applyMotionClass();
      }
    }
  }

  function writeVars() {
    if (reducedMotion || lowMotion) {
      state.mx += (0.5 - state.mx) * 0.12;
      state.my += (0.5 - state.my) * 0.12;
      state.scroll += (0 - state.scroll) * 0.12;
    } else {
      state.mx += (state.targetMx - state.mx) * 0.08;
      state.my += (state.targetMy - state.my) * 0.08;
      state.scroll += (state.targetScroll - state.scroll) * 0.08;
    }

    setVar('--mx', state.mx.toFixed(4));
    setVar('--my', state.my.toFixed(4));
    setVar('--scroll', state.scroll.toFixed(4));
    state.ticking = false;
  }

  function schedule() {
    if (state.ticking) return;
    state.ticking = true;
    requestAnimationFrame((ts) => {
      sampleFps(ts);
      writeVars();
    });
  }

  function onPointerMove(e) {
    if (reducedMotion || lowMotion) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    state.targetMx = clamp01(e.clientX / w);
    state.targetMy = clamp01(e.clientY / h);
    schedule();
  }

  function onScroll() {
    const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
    state.targetScroll = clamp01(window.scrollY / max);
    schedule();
  }

  function onPressStart(e) {
    const target = e.target.closest('.bottom-nav-item, .btn, .btn-shine, .glass-card, button, a');
    if (!target) return;
    target.classList.add('is-pressed');
  }

  function onPressEnd(e) {
    const target = e.target.closest('.is-pressed');
    if (!target) return;
    target.classList.remove('is-pressed');
  }

  function setupBottomNavIndicator() {
    const navs = Array.from(document.querySelectorAll('.bottom-nav'));
    navs.forEach((nav) => {
      if (nav.querySelector('.bottom-nav-indicator')) return;

      const indicator = document.createElement('span');
      indicator.className = 'bottom-nav-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      nav.appendChild(indicator);

      const update = () => {
        const active = nav.querySelector('.bottom-nav-item.active');
        if (!active) {
          indicator.style.opacity = '0';
          return;
        }
        const navRect = nav.getBoundingClientRect();
        const itemRect = active.getBoundingClientRect();
        const width = Math.max(28, Math.min(itemRect.width - 14, 62));
        const x = itemRect.left - navRect.left + (itemRect.width - width) / 2;
        indicator.style.width = `${width}px`;
        indicator.style.transform = `translate3d(${x}px,0,0)`;
        indicator.style.opacity = '1';
      };

      nav.addEventListener('click', (e) => {
        const item = e.target.closest('.bottom-nav-item');
        if (!item) return;
        nav.querySelectorAll('.bottom-nav-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        requestAnimationFrame(update);
      });

      window.addEventListener('resize', () => requestAnimationFrame(update), { passive: true });
      window.addEventListener('orientationchange', () => requestAnimationFrame(update), { passive: true });
      requestAnimationFrame(update);
    });
  }

  function init() {
    applyMotionClass();
    setVar('--mx', '0.5');
    setVar('--my', '0.5');
    setVar('--scroll', '0');

    if (window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onPressStart, { passive: true });
    window.addEventListener('pointerup', onPressEnd, { passive: true });
    window.addEventListener('pointercancel', onPressEnd, { passive: true });

    prefersReduced.addEventListener('change', (e) => {
      reducedMotion = e.matches;
      applyMotionClass();
      schedule();
    });

    setupBottomNavIndicator();
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
