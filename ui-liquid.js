// ui-liquid.js — camada visual isolada (parallax + lente + micro-distorção)
// Não toca em dados, rotas ou lógica financeira já existente.
(() => {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Garante elementos visuais caso o HTML seja reutilizado sem os nós de fundo.
  const ensureElement = (selector, className, prepend = true) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('div');
      el.className = className;
      prepend ? document.body.prepend(el) : document.body.appendChild(el);
    }
    return el;
  };

  ensureElement('.liquid-bg', 'liquid-bg', true);
  ensureElement('.noise', 'noise', true);
  const lens = ensureElement('.lens', 'lens', false);

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const setParallax = (x, y) => {
    root.style.setProperty('--mx', String(x));
    root.style.setProperty('--my', String(y));
  };

  const setLensPosition = (x, y) => {
    root.style.setProperty('--lx', `${x}px`);
    root.style.setProperty('--ly', `${y}px`);
  };

  // Brilho que acompanha o ponteiro, no mesmo espírito do mock solicitado.
  const setCardHighlight = (clientX, clientY) => {
    const xPct = `${Math.round((clientX / (window.innerWidth || 1)) * 100)}%`;
    const yPct = `${Math.round((clientY / (window.innerHeight || 1)) * 100)}%`;
    document.querySelectorAll('.liquid-dashboard .glass-card').forEach((card) => {
      card.style.setProperty('--lx', xPct);
      card.style.setProperty('--ly', yPct);
    });
  };

  // Micro distorção nos cards: cria sensação "liquid" quando o ponteiro se move.
  const applyCardTilt = (clientX, clientY) => {
    const cards = document.querySelectorAll('.liquid-dashboard .glass-card');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;

      // Só anima cards próximos ao ponteiro para reduzir custo.
      const near = relX > -0.2 && relX < 1.2 && relY > -0.2 && relY < 1.2;
      if (!near) {
        card.style.transform = 'translate3d(0,0,0)';
        return;
      }

      const rx = (0.5 - relY) * 3.5;
      const ry = (relX - 0.5) * 4;
      card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
  };

  const resetCardTilt = () => {
    document.querySelectorAll('.liquid-dashboard .glass-card').forEach((card) => {
      card.style.transform = 'translate3d(0,0,0)';
    });
  };

  const onPointerMove = (event) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = clamp01(event.clientX / w);
    const ny = clamp01(event.clientY / h);

    setParallax(nx, ny);
    setLensPosition(event.clientX, event.clientY);
    setCardHighlight(event.clientX, event.clientY);

    if (!prefersReducedMotion) {
      applyCardTilt(event.clientX, event.clientY);
    }
  };

  const onPointerDown = () => lens.classList.add('on');
  const onPointerUp = () => {
    lens.classList.remove('on');
    resetCardTilt();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  window.addEventListener('pointerleave', onPointerUp, { passive: true });

  // Fallback explícito para iOS Safari mais antigo.
  window.addEventListener('touchend', onPointerUp, { passive: true });

  if (!prefersReducedMotion) {
    // Movimento sutil contínuo para manter a sensação de profundidade quando o usuário está parado.
    let t = 0;
    const idleTick = () => {
      t += 0.004;
      if (!lens.classList.contains('on')) {
        setParallax(0.5 + Math.sin(t) * 0.055, 0.5 + Math.cos(t * 0.9) * 0.055);
      }
      requestAnimationFrame(idleTick);
    };
    requestAnimationFrame(idleTick);
  }
})();
