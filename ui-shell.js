(() => {
  const PAGE_MAP = {
    index: 'index.html',
    central: 'central.html',
    processos: 'processos.html',
    contas: 'contas.html',
    clientes: 'clientes.html',
    relatorios: 'relatorios.html',
    historico: 'historico.html',
    configuracoes: 'configuracoes.html',
    bloco_de_notas: 'bloco_de_notas.html',
    versoes: 'versoes.html',
    login: 'login.html'
  };

  function enforceDark() {
    const root = document.documentElement;
    root.classList.add('app', 'theme-dark');
    root.dataset.theme = 'dark';
  }

  function resolvePage() {
    const bodyPage = document.body?.dataset?.page;
    if (bodyPage) return bodyPage;
    const file = location.pathname.split('/').pop() || 'index.html';
    return file.replace('.html', '') || 'index';
  }

  function markActiveNav(page) {
    const targetHref = PAGE_MAP[page] || `${page}.html`;
    document.querySelectorAll('.bottom-nav .bottom-nav-item, .desktop-topbar .desktop-nav-link').forEach((el) => {
      const href = el.getAttribute('href');
      if (!href) return;
      const active = href === targetHref;
      el.classList.toggle('active', active);
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function adaptTabbarDesktop() {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    document.querySelectorAll('.tabbar').forEach((tabbar) => {
      tabbar.classList.toggle('tabbar--desktop-hidden', desktop);
    });
  }

  function init() {
    enforceDark();
    const page = resolvePage();
    markActiveNav(page);
    adaptTabbarDesktop();
    window.addEventListener('resize', adaptTabbarDesktop, { passive: true });

    // expose hook to legacy scripts
    window.AppShell = { page, markActiveNav, enforceDark };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
