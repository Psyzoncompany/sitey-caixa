/**
 * chatbot.js — Navegação otimizada para IA + animação de entrada dos cards
 */

(() => {
  const FAB_ID = 'psyzon-ai-fab';

  const createAIFab = () => {
    if (document.getElementById(FAB_ID)) return;

    const fab = document.createElement('a');
    fab.id = FAB_ID;
    fab.href = 'ai.html';
    fab.className = 'psyzon-ai-fab';
    fab.setAttribute('aria-label', 'Abrir página da IA');
    fab.title = 'Abrir IA';

    // Vetor inline (ícone orbit/estrela)
    fab.innerHTML = `
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" class="psyzon-ai-fab__icon">
        <defs>
          <linearGradient id="aiGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop stop-color="#22d3ee"/>
            <stop offset="1" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="16" stroke="url(#aiGrad)" stroke-width="2.8" opacity="0.9"/>
        <path d="M24 12v24M12 24h24" stroke="url(#aiGrad)" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="24" cy="24" r="5.4" fill="url(#aiGrad)"/>
        <path d="M34 14l2 2m-24 0l2-2m20 20l2-2m-24 2l2 2" stroke="url(#aiGrad)" stroke-width="2" stroke-linecap="round" opacity="0.95"/>
      </svg>
      <span class="psyzon-ai-fab__label">IA</span>
    `;

    document.body.appendChild(fab);
  };

  const initScrollReveal = () => {
    const selectors = [
      '.glass-card',
      '.metric-card',
      '.dashboard-section',
      '.card',
      '.launch-card',
      '.syt-card',
      '.cut-card',
      '.process-card',
      '.neo-card'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(',')))
      .filter((el) => !el.closest('header, nav'));

    if (!elements.length) return;

    elements.forEach((el, index) => {
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(index * 35, 210)}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px'
    });

    elements.forEach((el) => observer.observe(el));
  };

  document.addEventListener('DOMContentLoaded', () => {
    createAIFab();
    initScrollReveal();
  });
})();
