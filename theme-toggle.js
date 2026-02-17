(() => {
  const pageMap = {
    'index.html': 'Dashboard',
    'processos.html': 'Processos',
    'clientes.html': 'Clientes',
    'relatorios.html': 'Relatórios',
    'contas.html': 'Contas',
    'versoes.html': 'Versões'
  };

  const path = window.location.pathname.split('/').pop() || 'index.html';
  const html = document.documentElement;
  html.classList.add('app', 'theme-dark');
  document.body.classList.add('app-body');

  if (!document.querySelector('.app-shell')) {
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    const header = document.createElement('header');
    header.className = 'topbar glass';
    header.innerHTML = `
      <div><h1 class="topbar-title">${pageMap[path] || 'PSYZON Caixa'}</h1><p class="topbar-subtitle">PSYZON Caixa • v6</p></div>
      <div class="topbar-actions">
        <button class="icon-btn" type="button" aria-label="Atualizar" onclick="window.location.reload()">↻</button>
      </div>`;

    const main = document.createElement('main');
    main.className = 'content';
    while (document.body.firstChild) main.appendChild(document.body.firstChild);

    const nav = document.createElement('nav');
    nav.className = 'tabbar glass';
    nav.innerHTML = `
      <a class="tab-item" href="index.html" data-page="index.html">Início</a>
      <a class="tab-item" href="processos.html" data-page="processos.html">Processos</a>
      <a class="tab-item" href="clientes.html" data-page="clientes.html">Clientes</a>
      <a class="tab-item" href="contas.html" data-page="contas.html">Contas</a>
      <a class="tab-item" href="relatorios.html" data-page="relatorios.html">Relatórios</a>`;

    shell.append(header, main, nav);
    document.body.appendChild(shell);
  }

  document.querySelectorAll('.tab-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.page === path);
  });
})();
