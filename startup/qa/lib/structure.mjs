// Runs in the page. Returns human-readable problems; an empty array means the page passes.
export function structuralProblems() {
  const problems = [];
  const root = document.documentElement;
  if (root.scrollWidth > window.innerWidth + 1) problems.push(`horizontal overflow: ${root.scrollWidth}px wide at ${window.innerWidth}px`);
  const h1Count = document.querySelectorAll('h1').length;
  if (h1Count !== 1) problems.push(`expected one h1, found ${h1Count}`);
  let previous = 0;
  for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const level = Number(heading.tagName[1]);
    if (previous && level > previous + 1) problems.push(`heading level skipped: h${previous} then h${level} "${heading.textContent.trim().slice(0, 40)}"`);
    previous = level;
  }
  for (const image of document.images) if (!image.hasAttribute('alt')) problems.push(`image without alt: ${image.getAttribute('src')}`);
  const ids = new Map();
  for (const element of document.querySelectorAll('[id]')) ids.set(element.id, (ids.get(element.id) ?? 0) + 1);
  for (const [id, count] of ids) if (count > 1) problems.push(`duplicate id "${id}" (${count}×)`);
  for (const link of document.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (id && !document.getElementById(id)) problems.push(`in-page link to missing #${id}`);
  }
  // textContent (not innerText) so links inside collapsed <details> are not false positives.
  for (const link of document.querySelectorAll('a[href]')) {
    const name = (link.getAttribute('aria-label') ?? '').trim() || link.textContent.trim() || [...link.querySelectorAll('img[alt]')].map((image) => image.alt).join(' ').trim();
    if (!name) problems.push(`link without a name: ${link.getAttribute('href')}`);
  }
  return problems;
}
