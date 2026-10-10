// Margins are omitted: Chromium reports auto margins inconsistently between runs, and every
// visible margin change already shows up in the element's box geometry.
export const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'box-sizing',
  'width', 'height', 'min-height', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform',
  'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset',
  'text-align', 'white-space', 'overflow-wrap', 'color', 'background-color', 'background-image',
  'background-size', 'background-position', 'box-shadow', 'opacity', 'transform', 'filter', 'visibility',
  'overflow-x', 'overflow-y', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'flex-direction', 'flex-wrap',
  'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-self', 'align-content',
  'object-fit', 'list-style-type', 'cursor', 'outline-style', 'outline-width', 'outline-color', 'outline-offset',
  'transition-property', 'transition-duration', 'animation-name', 'animation-duration', 'scroll-behavior',
];

// Runs in the page. Keys are child-index paths such as "body:2>main:3>section:1".
export function collectElements(props) {
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      parts.unshift(`${node.localName}:${Array.prototype.indexOf.call(node.parentElement.children, node) + 1}`);
    }
    return parts.join('>') || 'html';
  };
  const round = (value) => Math.round(value * 100) / 100;
  const read = (style) => Object.fromEntries(props.map((property) => [property, style.getPropertyValue(property)]));
  const elements = {};
  for (const element of [document.documentElement, document.body, ...document.body.querySelectorAll('*')]) {
    if (element !== document.documentElement && element.getClientRects().length === 0) continue;
    const rect = element.getBoundingClientRect();
    const key = pathOf(element);
    elements[key] = { box: [rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height].map(round).join(','), ...read(getComputedStyle(element)) };
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(element, pseudo);
      const content = style.getPropertyValue('content');
      if (content && content !== 'none' && content !== 'normal') elements[`${key}${pseudo}`] = { content, ...read(style) };
    }
  }
  return { elements };
}

// Runs in the page. Describes the focused element's visible focus treatment.
export function collectFocused() {
  const element = document.activeElement;
  if (!element || element === document.body || element === document.documentElement) return null;
  const parts = [];
  for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
    parts.unshift(`${node.localName}:${Array.prototype.indexOf.call(node.parentElement.children, node) + 1}`);
  }
  const style = getComputedStyle(element);
  return {
    path: parts.join('>'),
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} ${style.outlineOffset}`,
    'box-shadow': style.boxShadow,
    color: style.color,
    'background-color': style.backgroundColor,
    'text-decoration-line': style.textDecorationLine,
  };
}

// Records failed or 4xx/5xx requests; call the returned function before trusting a capture.
export function watchRequests(page) {
  const failures = [];
  page.on('requestfailed', (request) => failures.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.url()} → HTTP ${response.status()}`);
  });
  return () => {
    if (failures.length) throw new Error(`Page loaded with failed requests: ${failures.join(', ')}`);
  };
}

// Loads lazy images, waits for finite animations and fonts, and returns to the top of the page.
export async function settle(page) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    }))));
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    // Reveal every section and freeze endless animations at their start, so captures are deterministic.
    document.querySelectorAll('main > *').forEach((node) => node.classList.add('is-visible'));
    for (const animation of document.getAnimations()) {
      if (animation.effect && animation.effect.getComputedTiming().iterations === Infinity) {
        animation.pause();
        animation.currentTime = 0;
      }
    }
    const finite = document.getAnimations().filter((animation) => animation.effect && animation.effect.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => {})));
    await document.fonts.ready;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
}
