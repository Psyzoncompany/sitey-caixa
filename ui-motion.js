(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('.glass-card, .page-section, .stat-card, .topbar');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.style.opacity = '1');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate([
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 380, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  targets.forEach((el) => { el.style.opacity = '0'; io.observe(el); });
})();
