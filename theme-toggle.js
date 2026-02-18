(() => {
  const CACHE_NAME = 'sitey-html-cache-v1';
  const PREFETCH_DELAY_MS = 80;

  const isLocalHtml = (url) => (
    url.origin === window.location.origin
    && /\.html?(\?|#|$)/.test(url.pathname)
  );

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', warmupLinkedPages);
  } else {
    warmupLinkedPages();
  }
})();
