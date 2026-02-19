/**
 * theme-toggle.js
 * (Apesar do nome, esse arquivo não muda mais Tema, mas sim carrega as páginas mais rápido!)
 * =========================================================================
 * Ele pega todos os links da página (ex: "Processos", "Clientes") e já 
 * baixa os arquivos em segundo plano. Assim, quando o usuário clica, 
 * a página abre instantaneamente, sem tela de carregamento.
 * =========================================================================
 */
(() => {
  const CACHE_NAME = 'sitey-html-cache-v1'; // Nome do "Baú" onde as páginas são guardadas
  const PREFETCH_DELAY_MS = 80;

  // Verifica se o link clicado é realmente uma página do site (e não do Google ou Youtube, por exemplo)
  const isLocalHtml = (url) => (
    url.origin === window.location.origin
    && /\.html?(\?|#|$)/.test(url.pathname)
  );

  // Função que baixa a página "escondida" no fundo e guarda no navegador
  const preloadHtmlInCache = async (href) => {
    if (!('caches' in window)) return;
    try {
      const url = new URL(href, window.location.href);
      if (!isLocalHtml(url)) return;

      const cache = await caches.open(CACHE_NAME);
      const req = new Request(url.href, { credentials: 'include', cache: 'reload' });
      const existing = await cache.match(req, { ignoreSearch: false });
      if (existing) return;

      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
    } catch (err) {
      console.debug('Prefetch ignorado:', err);
    }
  };

  // Acha todos os botões e links e sai baixando tudo um por um (com intervalo de milisegundos para não travar o celular)
  const warmupLinkedPages = () => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const targets = [...new Set(links
      .map((a) => a.href)
      .filter(Boolean)
      .filter((href) => {
        try {
          return isLocalHtml(new URL(href, window.location.href));
        } catch (_) {
          return false;
        }
      }))];

    targets.forEach((href, index) => {
      setTimeout(() => preloadHtmlInCache(href), index * PREFETCH_DELAY_MS);
    });
  };

  // Só dispara os downloads em fundo depois que a tela tiver carregado 100%
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', warmupLinkedPages);
  } else {
    warmupLinkedPages();
  }
})();
