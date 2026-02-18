(() => {
  const CACHE_NAME = 'sitey-html-cache-v1';
  const PAGE_TRANSITION_MS = 220;
  const PREFETCH_DELAY_MS = 80;
  const isLocalHtml = (url) => url.origin === window.location.origin && /\.html?(\?|#|$)/.test(url.pathname);

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

  const setupPageTransition = () => {
    const html = document.documentElement;
    requestAnimationFrame(() => html.classList.add('page-transition-in'));

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      if (link.target || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (_) {
        return;
      }

      if (!isLocalHtml(url)) return;
      if (url.href === window.location.href) return;

      event.preventDefault();
      preloadHtmlInCache(url.href);
      html.classList.add('page-transition-out');

      window.setTimeout(() => {
        window.location.href = url.href;
      }, PAGE_TRANSITION_MS);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupPageTransition();
      warmupLinkedPages();
    });
  } else {
    setupPageTransition();
    warmupLinkedPages();
  }
})();
