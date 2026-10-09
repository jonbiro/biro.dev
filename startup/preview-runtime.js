(() => {
  'use strict';
  const hero = document.querySelector('.ribbon').getAttribute('src');
  const main = document.querySelector('#main');
  let currentPage = null;
  function parseRoute(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'focusflow') parts[0] = 'addvancedfocus';
    const page = Object.hasOwn(pages, parts[0]) ? parts[0] : '404';
    return {page, anchor: parts[1] || ''};
  }
  function rewriteLinks(page) {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href.startsWith('/')) {
        const [path, anchor] = href.split('#');
        a.setAttribute('href', '#/' + path.replace(/^\/|\/$/g, '') + (anchor ? '/' + anchor : ''));
      }
      else if (href.startsWith('#') && !href.startsWith('#/')) a.setAttribute('href', '#/' + page + '/' + href.slice(1));
    });
    // This shared link needs the current page even after it has been rewritten.
    document.querySelector('.skip').setAttribute('href', '#/' + page + '/main');
  }
  function render() {
    const {page, anchor} = parseRoute(location.hash);
    const changed = currentPage !== page;
    const initial = currentPage === null;
    if (changed) {
      main.innerHTML = pages[page].main.replaceAll('/assets/hero.png', hero).replace(/src="(\/assets\/[^"]+)"/g, (match, path) => productArtwork[path] ? 'src="' + productArtwork[path] + '"' : match);
      document.title = pages[page].title;
      currentPage = page;
    }
    rewriteLinks(page);
    document.querySelectorAll('#main-nav a, .footer nav a').forEach(a => {
      if (a.getAttribute('href') === '#/' + page) a.setAttribute('aria-current', 'page');
      else if (a.getAttribute('href') === '#/products' && !['', 'about', 'products', 'addvancedfocus', 'mission', 'contact', '404'].includes(page)) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    window.dispatchEvent(new CustomEvent('biro:routechange', {detail:{changed}}));
    if (anchor) {
      const target = document.getElementById(anchor);
      if (target && main.contains(target) || target === main) {
        target.focus({preventScroll:true}); target.scrollIntoView();
      }
    } else if (changed) {
      window.scrollTo(0, 0);
      if (!initial) main.focus({preventScroll:true});
    }
  }
  window.addEventListener('hashchange', render);
  render();
})();
