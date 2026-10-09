# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 10-layer `startup/dist/assets/site.css` with token-based, per-component source files concatenated by `generate.py`, and add a committed QA toolkit that proves the rendered site is unchanged.

**Architecture:** A stdlib-only Python tool (`startup/tools/csskit.py`) parses the stylesheet, prunes dead declarations and dead selectors, substitutes tokens, and splits rules into partials under `startup/styles/`. `generate.py` concatenates those partials into the published `site.css`. A separate Node package (`startup/qa/`) uses Playwright to snapshot computed styles, geometry and screenshots of every page in several states, and to compare two snapshot sets. That comparison is the zero-change gate for every CSS step. The same package runs axe-core and keyboard tests in Chromium and WebKit.

**Tech Stack:** Python 3.9+ standard library; Node 22+; `@playwright/test` ^1.62.1; `@axe-core/playwright` ^4.13.0; Python `unittest`; Node's built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-09-foundation-design.md`

## Global Constraints

- Netlify builds `startup/` with `python3 generate.py` only. `startup/package.json` stays `{"type":"commonjs"}` with no dependencies.
- QA dependencies live only in `startup/qa/package.json`: `@playwright/test` `^1.62.1`, `@axe-core/playwright` `^4.13.0`. Commit `startup/qa/package-lock.json`.
- No changes to generated HTML, `startup/dist/assets/site.js`, `startup/dist/assets/concept-model.js`, images, `netlify.toml`, `startup/dist/_redirects`, `fragments/`, `portfolio.json`, or page content in `generate.py`/`product_pages.py`.
- The published stylesheet is `startup/dist/assets/site.css`, generated from `startup/styles/`. It must not be hand-edited after Task 7.
- Output format: one rule per line (`selector{prop:value;prop:value}`). At-rule blocks put each inner rule on its own line, indented two spaces. No minification beyond that.
- Token names (exact):
  - surfaces: `--color-bg` `#090f1b`, `--surface-1` `#0d1727`, `--surface-2` `#101d30`, `--surface-3` `#111d30`, `--surface-4` `#142238`, `--surface-5` `#14243a`, `--surface-6` `#132640`
  - borders: `--border-1` `#2b415e`, `--border-2` `#304965`, `--border-3` `#3b5576`, `--border-4` `#415b7d`, `--border-5` `#6685af`
  - text: `--text` `#e7eef9`, `--text-muted` `#d2def0`, `--text-quiet` `#c1cfe0`, `--text-subtle` `#acbad0`
  - accent: `--accent` `#8bb6ff`, `--accent-text` `#b4cfff`, `--accent-text-soft` `#c0d5f4`, `--on-accent` `#091321`
  - shadow: `--shadow-color` `#00000040`
  - radii: `--radius-sm` `.75rem`, `--radius-md` `1rem`, `--radius-lg` `1.5rem`, `--radius-lg-px` `24px`, `--radius-pill` `100px`
  - gap spacing: `--space-2` `.5rem`, `--space-3` `.75rem`, `--space-4` `1rem`, `--space-5` `1.25rem`, `--space-6` `1.5rem`, `--space-8` `2rem`, `--space-10` `2.5rem`, `--space-16` `4rem`
- Old custom properties map: `--ink` → `--text`, `--muted` → `--text-muted`, `--blue` → `--accent`, `--line` → `--border-5`. Remove `--pale`, `--white`, `--radius`.
- Breakpoints: `(max-width:760px)` → `(max-width:47.5rem)`; `(min-width:761px)` → `(min-width:47.5625rem)`; `(max-width:1000px)` → `(max-width:62.5rem)`; `(max-width:440px)` → `(max-width:27.5rem)`. Others unchanged.
- `!important` only inside `print` or `prefers-reduced-motion` contexts.
- Exactly one `:root` rule (in `styles/tokens.css`), holding all custom properties plus `color-scheme:dark` and `font-size:100%`.
- The generated `site.css` must be no larger than the baseline's byte size, which Task 2 records.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `claude/foundation`. Push it when the plan is complete, open a pull request, and never merge it without the user's explicit instruction.

## Review Focus

1. Lazy-loaded images and unfinished entrance animations at capture time. Two snapshots of the same build must compare identical. Pinned by the determinism check in Task 2, Step 6.
2. Something else already listening on the QA port (for example an old server serving a stale `dist`). The toolkit must refuse to run, not snapshot the wrong site. Pinned by the port-collision check in Task 2, Step 5.
3. A stylesheet partial added to `styles/` but missing from the generator's list. The build must fail, not silently ship without it. Pinned by the guard test in Task 7, Step 4.
4. Styles that apply only in states the default render never shows: open `<details>`, open mobile menu, paused or completed demo. A change there must still be caught. Pinned by the state-only detection check in Task 2, Step 7.
5. Selectors that look dead but are not, such as `:not(.unused)`, `:has(.unused)`, or one live member in a selector list. Pruning must keep them. Pinned by the unit tests in Task 5, Step 1.

---

### Task 1: QA package scaffold and diff library

**Files:**
- Create: `startup/qa/package.json`
- Create: `startup/qa/.gitignore`
- Create: `startup/qa/lib/config.mjs`
- Create: `startup/qa/lib/diff.mjs`
- Test: `startup/qa/unit/config.test.mjs`, `startup/qa/unit/diff.test.mjs`

**Interfaces:**
- Produces: `DIST`, `PORT`, `BASE_URL`, `WIDTHS` (`[320, 375, 1280]`), `HEIGHT` (`900`), `discoverRoutes(dist?: string): string[]`, `routeSlug(route: string): string` from `lib/config.mjs`; `diffRecords(before, after, { limit }?) → { total: number, differences: {path, property, before, after}[] }` and `diffFileSets(beforeFiles: string[], afterFiles: string[]) → { missing: string[], added: string[] }` from `lib/diff.mjs`. A record is `{ elements: { [path: string]: { [property: string]: string } } }`.

- [ ] **Step 1: Create the package files**

`startup/qa/package.json`:

```json
{
  "name": "biro-dev-qa",
  "private": true,
  "type": "module",
  "description": "Quality checks for the Biro.dev startup website. Not installed by Netlify.",
  "scripts": {
    "unit": "node --test unit/",
    "snapshot": "node snapshot.mjs",
    "compare": "node compare.mjs",
    "trace": "node trace.mjs",
    "audit": "playwright test audit",
    "demo": "playwright test demo",
    "test": "playwright test"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.13.0",
    "@playwright/test": "^1.62.1"
  }
}
```

`startup/qa/.gitignore`:

```text
node_modules/
.snapshots/
test-results/
playwright-report/
```

- [ ] **Step 2: Write the failing unit tests**

`startup/qa/unit/config.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverRoutes, routeSlug } from '../lib/config.mjs';

test('discoverRoutes lists home, page directories and 404, skipping assets and the legacy alias', () => {
  const dist = mkdtempSync(join(tmpdir(), 'qa-dist-'));
  writeFileSync(join(dist, 'index.html'), '');
  writeFileSync(join(dist, '404.html'), '');
  for (const dir of ['zeta', 'about', 'assets', 'focusflow', 'empty']) mkdirSync(join(dist, dir));
  for (const dir of ['zeta', 'about', 'focusflow']) writeFileSync(join(dist, dir, 'index.html'), '');
  assert.deepEqual(discoverRoutes(dist), ['/', '/about/', '/zeta/', '/404.html']);
});

test('routeSlug turns routes into file-safe names', () => {
  assert.equal(routeSlug('/'), 'home');
  assert.equal(routeSlug('/carebridge/'), 'carebridge');
  assert.equal(routeSlug('/404.html'), '404');
});
```

`startup/qa/unit/diff.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffFileSets, diffRecords } from '../lib/diff.mjs';

const record = (elements) => ({ elements });

test('identical records have no differences', () => {
  const a = record({ 'body:2': { color: 'red', box: '0,0,10,10' } });
  assert.deepEqual(diffRecords(a, structuredClone(a)), { total: 0, differences: [] });
});

test('a changed property is reported with before and after values', () => {
  const a = record({ 'body:2': { color: 'red' } });
  const b = record({ 'body:2': { color: 'blue' } });
  assert.deepEqual(diffRecords(a, b).differences, [{ path: 'body:2', property: 'color', before: 'red', after: 'blue' }]);
});

test('elements that appear or disappear are reported', () => {
  const a = record({ 'body:2': { color: 'red' }, 'body:2>p:1': { color: 'red' } });
  const b = record({ 'body:2': { color: 'red' }, 'body:2>div:1': { color: 'red' } });
  const { total, differences } = diffRecords(a, b);
  assert.equal(total, 2);
  assert.deepEqual(differences.map((d) => [d.path, d.before, d.after]), [
    ['body:2>div:1', 'missing', 'present'],
    ['body:2>p:1', 'present', 'missing'],
  ]);
});

test('limit truncates the list but total counts everything', () => {
  const a = record({ x: { a: '1', b: '1', c: '1' } });
  const b = record({ x: { a: '2', b: '2', c: '2' } });
  const result = diffRecords(a, b, { limit: 1 });
  assert.equal(result.total, 3);
  assert.equal(result.differences.length, 1);
});

test('diffFileSets reports files present on only one side', () => {
  assert.deepEqual(diffFileSets(['a.json', 'b.json'], ['b.json', 'c.json']), { missing: ['a.json'], added: ['c.json'] });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd startup/qa && node --test unit/`
Expected: FAIL with `Cannot find module '.../lib/config.mjs'` and `.../lib/diff.mjs`.

- [ ] **Step 4: Write the implementations**

`startup/qa/lib/config.mjs`:

```js
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// QA_DIST lets the toolkit snapshot another checkout's build, such as the baseline worktree.
export const DIST = process.env.QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url));
export const PORT = Number(process.env.QA_PORT ?? 4310);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const WIDTHS = [320, 375, 1280];
export const HEIGHT = 900;

// Netlify answers /focusflow/ with a 301 before the file is ever served.
const EXCLUDED_DIRS = new Set(['assets', 'focusflow']);

export function discoverRoutes(dist = DIST) {
  const pages = readdirSync(dist, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name) && existsSync(join(dist, entry.name, 'index.html')))
    .map((entry) => `/${entry.name}/`)
    .sort();
  const routes = ['/', ...pages];
  if (existsSync(join(dist, '404.html'))) routes.push('/404.html');
  return routes;
}

export function routeSlug(route) {
  if (route === '/') return 'home';
  return route.replace(/^\/|\/$/g, '').replace(/\.html$/, '').replaceAll('/', '_');
}
```

`startup/qa/lib/diff.mjs`:

```js
// Compares snapshot records shaped { elements: { [path]: { [property]: value } } }.
export function diffRecords(before, after, { limit = Infinity } = {}) {
  const differences = [];
  let total = 0;
  const report = (difference) => {
    total += 1;
    if (differences.length < limit) differences.push(difference);
  };
  const paths = new Set([...Object.keys(before.elements), ...Object.keys(after.elements)]);
  for (const path of [...paths].sort()) {
    const a = before.elements[path];
    const b = after.elements[path];
    if (!a || !b) {
      report({ path, property: '(element)', before: a ? 'present' : 'missing', after: b ? 'present' : 'missing' });
      continue;
    }
    const properties = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const property of [...properties].sort()) {
      if (a[property] !== b[property]) report({ path, property, before: a[property], after: b[property] });
    }
  }
  return { total, differences };
}

export function diffFileSets(beforeFiles, afterFiles) {
  const before = new Set(beforeFiles);
  const after = new Set(afterFiles);
  return {
    missing: [...before].filter((file) => !after.has(file)).sort(),
    added: [...after].filter((file) => !before.has(file)).sort(),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd startup/qa && node --test unit/`
Expected: PASS, 7 tests.

- [ ] **Step 6: Install dependencies and browsers**

Run: `cd startup/qa && npm install && npx playwright install chromium webkit`
Expected: `package-lock.json` created; Chromium and WebKit downloaded or reported as already installed.

- [ ] **Step 7: Commit**

```bash
git add startup/qa/package.json startup/qa/package-lock.json startup/qa/.gitignore startup/qa/lib startup/qa/unit
git commit -m "Add QA package scaffold with route discovery and snapshot diffing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Snapshot, compare and trace commands, plus the baseline

**Files:**
- Create: `startup/qa/lib/server.mjs`
- Create: `startup/qa/lib/capture.mjs`
- Create: `startup/qa/snapshot.mjs`
- Create: `startup/qa/compare.mjs`
- Create: `startup/qa/trace.mjs`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces: `startServer(): Promise<() => void>` (resolves to a stop function); `PROPS: string[]`, `collectElements(props)`, `collectFocused()`, `settle(page)` from `lib/capture.mjs`. CLI contracts:
  - `npm run snapshot -- <out> [--pass a,b] [--route /x/,/y/] [--width 375]` writes `<out>/manifest.json`, `<out>/<pass>/<width>/<slug>.json` and `.png`, and `<out>/focus/<width>/<slug>.json`.
  - `npm run compare -- <a> <b> [--subset]` exits 0 when identical and 1 otherwise. It writes diff images to `<b>/_diff/`.
  - `npm run trace -- <route> <width> <path> <property> [--pass reduced]` prints the matching rules.

- [ ] **Step 1: Write the server helper**

`startup/qa/lib/server.mjs`:

```js
import { spawn } from 'node:child_process';
import { BASE_URL, DIST, PORT } from './config.mjs';

async function responds(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

// Serves DIST on 127.0.0.1:PORT and resolves to a stop function.
export async function startServer() {
  if (await responds(`${BASE_URL}/`)) {
    throw new Error(`Something is already serving ${BASE_URL}. Stop it or set QA_PORT so the toolkit cannot snapshot the wrong build.`);
  }
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', DIST], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await responds(`${BASE_URL}/`)) return () => server.kill();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill();
  throw new Error(`Static server did not start on ${BASE_URL}`);
}
```

- [ ] **Step 2: Write the capture helpers**

`startup/qa/lib/capture.mjs`:

```js
export const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'box-sizing',
  'width', 'height', 'min-height', 'max-width',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
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

// Loads lazy images, waits for finite animations and fonts, and returns to the top of the page.
export async function settle(page) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    }))));
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    const finite = document.getAnimations().filter((animation) => animation.effect && animation.effect.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => {})));
    await document.fonts.ready;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
}
```

- [ ] **Step 3: Write the snapshot command**

`startup/qa/snapshot.mjs`:

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { BASE_URL, DIST, HEIGHT, WIDTHS, discoverRoutes, routeSlug } from './lib/config.mjs';
import { PROPS, collectElements, collectFocused, settle } from './lib/capture.mjs';
import { startServer } from './lib/server.mjs';

const START = new Date('2026-10-01T09:00:00Z');
const CONCURRENCY = Number(process.env.QA_CONCURRENCY ?? 4);

const openAllDetails = (page) => page.evaluate(() => document.querySelectorAll('details').forEach((details) => { details.open = true; }));
const openMenu = (page) => page.click('.menu-toggle');
const pauseDemo = async (page) => { await page.click('#af-primary'); await page.clock.runFor(31_000); await page.click('#af-primary'); };
const completeDemo = async (page) => { await page.click('#af-primary'); await page.click('#af-done'); };

const SCENARIOS = [
  { pass: 'motion', widths: WIDTHS, media: { reducedMotion: 'no-preference' } },
  { pass: 'reduced', widths: WIDTHS, media: { reducedMotion: 'reduce' } },
  { pass: 'print', widths: [1280], media: { reducedMotion: 'reduce', media: 'print' } },
  { pass: 'contrast', widths: WIDTHS, media: { reducedMotion: 'reduce', contrast: 'more' } },
  { pass: 'details-open', widths: WIDTHS, media: { reducedMotion: 'reduce' }, setup: openAllDetails },
  { pass: 'menu-open', widths: [320, 375], routes: ['/'], media: { reducedMotion: 'reduce' }, setup: openMenu },
  { pass: 'demo-paused', widths: WIDTHS, routes: ['/addvancedfocus/'], media: { reducedMotion: 'reduce' }, setup: pauseDemo },
  { pass: 'demo-done', widths: WIDTHS, routes: ['/addvancedfocus/'], media: { reducedMotion: 'reduce' }, setup: completeDemo },
];

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1].split(',');
}

const out = process.argv[2];
if (!out || out.startsWith('--')) {
  console.error('Usage: npm run snapshot -- <out-dir> [--pass a,b] [--route /x/] [--width 375]');
  process.exit(2);
}
const passFilter = option('pass');
const routeFilter = option('route');
const widthFilter = option('width')?.map(Number);

async function openPage(browser, width, media) {
  const context = await browser.newContext({ viewport: { width, height: HEIGHT }, baseURL: BASE_URL });
  const page = await context.newPage();
  await page.clock.install({ time: START });
  if (media) await page.emulateMedia(media);
  return { context, page };
}

async function capture(browser, job) {
  const { context, page } = await openPage(browser, job.width, job.media);
  try {
    await page.goto(job.route);
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
    if (job.setup) await job.setup(page);
    await settle(page);
    const dir = join(out, job.pass, String(job.width));
    mkdirSync(dir, { recursive: true });
    const file = join(dir, routeSlug(job.route));
    writeFileSync(`${file}.json`, JSON.stringify(await page.evaluate(collectElements, PROPS)));
    await page.screenshot({ path: `${file}.png`, fullPage: true, animations: 'disabled', caret: 'hide' });
  } finally {
    await context.close();
  }
}

async function captureFocus(browser, job) {
  const { context, page } = await openPage(browser, job.width, { reducedMotion: 'reduce' });
  try {
    await page.goto(job.route);
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
    const elements = {};
    const seen = new Set();
    for (let index = 0; index < 400; index += 1) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(collectFocused);
      if (!focused || seen.has(focused.path)) break;
      seen.add(focused.path);
      const { path, ...style } = focused;
      elements[`${String(index).padStart(3, '0')} ${path}`] = style;
    }
    const dir = join(out, 'focus', String(job.width));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${routeSlug(job.route)}.json`), JSON.stringify({ elements }));
  } finally {
    await context.close();
  }
}

async function contrastSupported(browser) {
  const { context, page } = await openPage(browser, 375, null);
  try {
    await page.emulateMedia({ contrast: 'more' });
    return await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches);
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

async function runPool(items, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

const stop = await startServer();
const browser = await chromium.launch();
try {
  const routes = discoverRoutes().filter((route) => !routeFilter || routeFilter.includes(route));
  const skipped = {};
  if (!(await contrastSupported(browser))) skipped.contrast = 'This Playwright build cannot emulate prefers-contrast: more.';
  const jobs = [];
  for (const scenario of SCENARIOS) {
    if (skipped[scenario.pass] || (passFilter && !passFilter.includes(scenario.pass))) continue;
    for (const width of scenario.widths.filter((w) => !widthFilter || widthFilter.includes(w))) {
      for (const route of (scenario.routes ?? routes).filter((r) => routes.includes(r))) jobs.push({ ...scenario, width, route });
    }
  }
  const focusJobs = (!passFilter || passFilter.includes('focus'))
    ? WIDTHS.filter((w) => !widthFilter || widthFilter.includes(w)).flatMap((width) => routes.map((route) => ({ width, route })))
    : [];
  await runPool(jobs, (job) => capture(browser, job));
  await runPool(focusJobs, (job) => captureFocus(browser, job));
  const passes = [...new Set([...jobs.map((job) => job.pass), ...(focusJobs.length ? ['focus'] : [])])];
  writeFileSync(join(out, 'manifest.json'), JSON.stringify({ dist: DIST, passes, skipped, routes }, null, 2));
  console.log(`Captured ${jobs.length} page states and ${focusJobs.length} focus sequences into ${out}`);
  for (const [pass, reason] of Object.entries(skipped)) console.log(`Skipped ${pass}: ${reason}`);
} finally {
  await browser.close();
  stop();
}
```

- [ ] **Step 4: Write the compare and trace commands**

`startup/qa/compare.mjs`:

```js
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { chromium } from '@playwright/test';
import { diffFileSets, diffRecords } from './lib/diff.mjs';

const [before, after] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const subset = process.argv.includes('--subset');
if (!before || !after) {
  console.error('Usage: npm run compare -- <before-dir> <after-dir> [--subset]');
  process.exit(2);
}

function listFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== '_diff') walk(path); } else if (entry.name !== 'manifest.json') files.push(relative(root, path));
    }
  };
  walk(root);
  return files.sort();
}

async function pixelDiff(page, aPath, bPath) {
  const images = [readFileSync(aPath).toString('base64'), readFileSync(bPath).toString('base64')];
  return page.evaluate(async ([a, b]) => {
    const load = (data) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `data:image/png;base64,${data}`;
    });
    const [imageA, imageB] = await Promise.all([load(a), load(b)]);
    if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
      return { sizeMismatch: `${imageA.width}x${imageA.height} → ${imageB.width}x${imageB.height}` };
    }
    const draw = (image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return context;
    };
    const contextA = draw(imageA);
    const pixelsA = contextA.getImageData(0, 0, imageA.width, imageA.height).data;
    const pixelsB = draw(imageB).getImageData(0, 0, imageB.width, imageB.height).data;
    const output = contextA.createImageData(imageA.width, imageA.height);
    let changed = 0;
    for (let i = 0; i < pixelsA.length; i += 4) {
      const same = pixelsA[i] === pixelsB[i] && pixelsA[i + 1] === pixelsB[i + 1] && pixelsA[i + 2] === pixelsB[i + 2] && pixelsA[i + 3] === pixelsB[i + 3];
      if (same) {
        const grey = ((pixelsA[i] + pixelsA[i + 1] + pixelsA[i + 2]) / 3) * 0.3;
        output.data.set([grey, grey, grey, 255], i);
      } else {
        changed += 1;
        output.data.set([255, 0, 80, 255], i);
      }
    }
    contextA.putImageData(output, 0, 0);
    return { changed, image: contextA.canvas.toDataURL('image/png').split(',')[1] };
  }, images);
}

const manifestBefore = JSON.parse(readFileSync(join(before, 'manifest.json'), 'utf8'));
const manifestAfter = JSON.parse(readFileSync(join(after, 'manifest.json'), 'utf8'));
let failures = 0;
if (!subset && JSON.stringify([manifestBefore.passes, manifestBefore.skipped]) !== JSON.stringify([manifestAfter.passes, manifestAfter.skipped])) {
  failures += 1;
  console.log(`Pass lists differ: ${JSON.stringify(manifestBefore.passes)} vs ${JSON.stringify(manifestAfter.passes)}`);
}

const filesBefore = listFiles(before);
const filesAfter = listFiles(after);
const { missing, added } = diffFileSets(filesBefore, filesAfter);
if (!subset && (missing.length || added.length)) {
  failures += missing.length + added.length;
  for (const file of missing) console.log(`Only in ${before}: ${file}`);
  for (const file of added) console.log(`Only in ${after}: ${file}`);
}

const common = filesBefore.filter((file) => filesAfter.includes(file));
const changedImages = [];
for (const file of common.filter((name) => name.endsWith('.json'))) {
  const { total, differences } = diffRecords(JSON.parse(readFileSync(join(before, file), 'utf8')), JSON.parse(readFileSync(join(after, file), 'utf8')), { limit: 20 });
  if (!total) continue;
  failures += total;
  console.log(`\n${file}: ${total} difference(s)`);
  for (const d of differences) console.log(`  ${d.path}  ${d.property}: ${d.before} → ${d.after}`);
}
for (const file of common.filter((name) => name.endsWith('.png'))) {
  if (!readFileSync(join(before, file)).equals(readFileSync(join(after, file)))) changedImages.push(file);
}

if (changedImages.length) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const file of changedImages) {
    const result = await pixelDiff(page, join(before, file), join(after, file));
    failures += 1;
    if (result.sizeMismatch) {
      console.log(`\n${file}: size changed ${result.sizeMismatch}`);
      continue;
    }
    const target = join(after, '_diff', file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(result.image, 'base64'));
    console.log(`\n${file}: ${result.changed} pixel(s) differ → ${target}`);
  }
  await browser.close();
}

console.log(failures ? `\nFAIL: ${failures} difference(s) across ${common.length} compared files.` : `\nPASS: ${common.length} files identical.`);
process.exit(failures ? 1 : 0);
```

`startup/qa/trace.mjs`:

```js
import { chromium } from '@playwright/test';
import { BASE_URL, HEIGHT } from './lib/config.mjs';
import { settle } from './lib/capture.mjs';
import { startServer } from './lib/server.mjs';

const [route, width, path, property] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const passIndex = process.argv.indexOf('--pass');
const pass = passIndex === -1 ? 'reduced' : process.argv[passIndex + 1];
if (!route || !width || !path || !property) {
  console.error('Usage: npm run trace -- <route> <width> <element-path> <property> [--pass reduced|motion|print|contrast]');
  process.exit(2);
}
const MEDIA = {
  motion: { reducedMotion: 'no-preference' },
  reduced: { reducedMotion: 'reduce' },
  print: { reducedMotion: 'reduce', media: 'print' },
  contrast: { reducedMotion: 'reduce', contrast: 'more' },
};

const stop = await startServer();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: Number(width), height: HEIGHT }, baseURL: BASE_URL });
  await page.emulateMedia(MEDIA[pass]);
  await page.goto(route);
  await settle(page);
  const result = await page.evaluate(({ path: target, property: name }) => {
    const [elementPath, pseudo] = target.split('::');
    let element = document.documentElement;
    if (elementPath !== 'html') {
      for (const part of elementPath.split('>')) {
        element = element.children[Number(part.split(':')[1]) - 1];
        if (!element) return { error: `No element at ${part}` };
      }
    }
    const rows = [];
    let order = 0;
    const visit = (rules, condition) => {
      for (const rule of rules) {
        if (rule.cssRules && 'conditionText' in rule) { visit(rule.cssRules, rule.conditionText); continue; }
        if (!(rule instanceof CSSStyleRule)) continue;
        order += 1;
        const value = rule.style.getPropertyValue(name);
        if (!value) continue;
        const wantsPseudo = pseudo ? new RegExp(`::?${pseudo}\\b`).test(rule.selectorText) : !/::?(before|after)\b/.test(rule.selectorText);
        if (!wantsPseudo) continue;
        let matches = false;
        try { matches = element.matches(rule.selectorText.replace(/::?(before|after)\b/g, '')); } catch { matches = false; }
        if (matches) rows.push({ order, active: !condition || matchMedia(condition).matches, condition: condition ?? '', selector: rule.selectorText, value, priority: rule.style.getPropertyPriority(name) });
      }
    };
    for (const sheet of document.styleSheets) visit(sheet.cssRules, null);
    return { computed: getComputedStyle(element, pseudo ? `::${pseudo}` : null).getPropertyValue(name), rows };
  }, { path, property });
  if (result.error) throw new Error(result.error);
  console.log(`${route} @ ${width}px [${pass}] ${path} ${property} = ${result.computed}`);
  for (const row of result.rows) console.log(`  #${String(row.order).padStart(4)} ${row.active ? 'active  ' : 'inactive'} ${row.condition.padEnd(32)} ${row.selector} { ${property}: ${row.value}${row.priority ? ' !' + row.priority : ''} }`);
} finally {
  await browser.close();
  stop();
}
```

- [ ] **Step 5: Check the port-collision guard (Review Focus 2)**

Run:

```bash
cd startup/qa
python3 -m http.server 4310 --bind 127.0.0.1 --directory /tmp >/dev/null 2>&1 & DUMMY=$!
sleep 1; npm run snapshot -- .snapshots/should-not-exist --route / --pass reduced; echo "exit=$?"
kill $DUMMY
test ! -e .snapshots/should-not-exist && echo "no output written"
```

Expected: the error `Something is already serving http://127.0.0.1:4310`, a non-zero exit, and `no output written`.

- [ ] **Step 6: Create the baseline and check determinism (Review Focus 1)**

Run:

```bash
cd ~/Projects/biro-dev-site
git worktree add ../biro-dev-baseline claude/visual-polish
wc -c < ../biro-dev-baseline/startup/dist/assets/site.css   # record this number as BASELINE_CSS_BYTES in the PR description
cd startup/qa
QA_DIST="$HOME/Projects/biro-dev-baseline/startup/dist" npm run snapshot -- .snapshots/baseline
QA_DIST="$HOME/Projects/biro-dev-baseline/startup/dist" npm run snapshot -- .snapshots/baseline-repeat
npm run compare -- .snapshots/baseline .snapshots/baseline-repeat
```

Expected: both snapshots report the same counts: 216 page states and 48 focus sequences (168 page states if the contrast pass is skipped), and compare prints `PASS: … files identical.` If compare reports differences, fix the nondeterminism in `settle()` before going on. Every later task depends on this gate.

- [ ] **Step 7: Check that a state-only change is detected (Review Focus 4)**

Run:

```bash
cd ~/Projects/biro-dev-site/startup
cp dist/assets/site.css /tmp/site.css.keep
printf '\n.header nav.open{letter-spacing:1px}\n' >> dist/assets/site.css
cd qa && npm run snapshot -- .snapshots/tamper --pass reduced,menu-open
npm run compare -- .snapshots/baseline .snapshots/tamper --subset; echo "exit=$?"
cp /tmp/site.css.keep ../dist/assets/site.css && git -C .. diff --quiet dist/assets/site.css && echo "restored"
```

Expected: `reduced` files identical, differences reported only under `menu-open/…`, `exit=1`, and `restored`.

- [ ] **Step 8: Commit**

```bash
git add startup/qa/lib/server.mjs startup/qa/lib/capture.mjs startup/qa/snapshot.mjs startup/qa/compare.mjs startup/qa/trace.mjs
git commit -m "Add snapshot, compare and trace commands to the QA toolkit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Accessibility audit and keyboard demo tests

**Files:**
- Create: `startup/qa/playwright.config.mjs`
- Create: `startup/qa/lib/structure.mjs`
- Create: `startup/qa/known-issues.json`
- Create: `startup/qa/audit.spec.mjs`
- Create: `startup/qa/demo.spec.mjs`

**Interfaces:**
- Consumes: `BASE_URL`, `DIST`, `PORT`, `WIDTHS`, `HEIGHT`, `discoverRoutes` from Task 1.
- Produces: `structuralProblems(): string[]` (runs in the page). The `known-issues.json` format is an array of `{ rule, route, widths, engines, reason }`. Every listed issue must still occur, or the test fails.

- [ ] **Step 1: Write the configuration and helpers**

`startup/qa/playwright.config.mjs`:

```js
import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, DIST, PORT } from './lib/config.mjs';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs$/,
  fullyParallel: true,
  workers: 4,
  reporter: [['line']],
  use: { baseURL: BASE_URL, reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory "${DIST}"`,
    url: `${BASE_URL}/`,
    reuseExistingServer: false,
  },
});
```

`startup/qa/lib/structure.mjs`:

```js
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
```

`startup/qa/known-issues.json`:

```json
[]
```

- [ ] **Step 2: Write the tests**

`startup/qa/audit.spec.mjs`:

```js
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { HEIGHT, WIDTHS, discoverRoutes } from './lib/config.mjs';
import { structuralProblems } from './lib/structure.mjs';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Documented, deferred issues: [{ rule, route, widths, engines, reason }]. Each must still occur.
const KNOWN = JSON.parse(readFileSync(new URL('./known-issues.json', import.meta.url), 'utf8'));

const describe = (violation) => `${violation.id} (${violation.impact}): ${violation.nodes.slice(0, 3).map((node) => node.target.join(' ')).join(' | ')}`;

async function axeViolations(page, include) {
  const builder = new AxeBuilder({ page }).withTags(AXE_TAGS);
  if (include) builder.include(include);
  return (await builder.analyze()).violations;
}

function checkAgainstKnown(violations, route, width, engine) {
  const applicable = KNOWN.filter((issue) => issue.route === route && issue.widths.includes(width) && issue.engines.includes(engine));
  const unexpected = violations.filter((violation) => !applicable.some((issue) => issue.rule === violation.id));
  const stale = applicable.filter((issue) => !violations.some((violation) => violation.id === issue.rule));
  for (const issue of applicable) test.info().annotations.push({ type: 'known-issue', description: `${issue.rule}: ${issue.reason}` });
  expect(unexpected.map(describe), 'new accessibility violations').toEqual([]);
  expect(stale.map((issue) => `${issue.rule} no longer occurs on ${route}; remove it from known-issues.json`), 'stale known issues').toEqual([]);
}

for (const route of discoverRoutes()) {
  for (const width of WIDTHS) {
    test(`${route} at ${width}px: structure`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto(route);
      expect(await page.evaluate(structuralProblems)).toEqual([]);
    });

    test(`${route} at ${width}px: axe WCAG 2.2 AA with disclosures open`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto(route);
      await page.evaluate(() => document.querySelectorAll('details').forEach((details) => { details.open = true; }));
      checkAgainstKnown(await axeViolations(page), route, width, testInfo.project.name);
    });
  }
}

test('open mobile menu at 375px: axe and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: HEIGHT });
  await page.goto('/');
  const toggle = page.locator('.menu-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect((await axeViolations(page, '.header')).map(describe)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});
```

`startup/qa/demo.spec.mjs`:

```js
import { expect, test } from '@playwright/test';

const START = new Date('2026-10-01T09:00:00Z');

test.describe('AddvancedFocus demo, keyboard only', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: START });
    await page.goto('/addvancedfocus/');
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
  });

  test('horizon tabs move with the arrow keys', async ({ page }) => {
    await page.locator('[data-horizon="now"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-horizon="today"]')).toBeFocused();
    await expect(page.locator('[data-horizon="today"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#af-panel-today')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-horizon="now"]')).toBeFocused();
    await expect(page.locator('#af-panel-now')).toBeVisible();
  });

  test('start, pause, complete and undo keep focus and announce each step', async ({ page }) => {
    const primary = page.locator('#af-primary');
    const status = page.locator('#af-announcement');
    await primary.focus();
    await expect(primary).toHaveText('Start 2 minutes');

    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Session started. Pause whenever you need.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Pause & keep my place');
    await expect(page.locator('[data-scenario]').first()).toBeDisabled();
    await expect(page.locator('#af-stop')).toBeVisible();

    await page.clock.runFor(31_000);
    await expect(page.locator('#af-timer')).toHaveText('01:29');

    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Session paused. You can leave a return note.');
    await expect(primary).toHaveText('Resume session');
    await expect(page.locator('#af-checkpoint')).toBeVisible();

    await page.locator('#af-done').focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Step complete. Continue or leave it here—both are okay.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Choose next small step');
    await expect(page.locator('#af-completion')).toBeVisible();

    await page.locator('#af-undo').focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Completion undone. Your step is ready again.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Start 2 minutes');
  });
});
```

- [ ] **Step 3: Run the tests on the unchanged build**

Run: `cd startup/qa && npm test`
Expected: all `demo` tests and all `structure` tests pass in both engines. If any `axe` test fails, the failure is a pre-existing issue on the baseline. Foundation must not change HTML or JavaScript (Global Constraints), so do not fix it here. Add an entry to `known-issues.json` with the exact rule, route, widths, engines and a one-sentence reason naming the sub-project that will fix it, for example `{"rule":"target-size","route":"/products/","widths":[320,375],"engines":["webkit"],"reason":"Product index chips are 22px tall; resized in the visual redesign."}`. Re-run until `npm test` passes, and list every entry in the PR description.

- [ ] **Step 4: Commit**

```bash
git add startup/qa/playwright.config.mjs startup/qa/lib/structure.mjs startup/qa/known-issues.json startup/qa/audit.spec.mjs startup/qa/demo.spec.mjs
git commit -m "Add axe, structure and keyboard demo tests for Chromium and WebKit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: csskit parser, serializer, report and check

**Files:**
- Create: `startup/tools/csskit.py`
- Test: `startup/tools/test_csskit.py`

**Interfaces:**
- Produces: `Decl(prop, value, important)`, `Rule(selector, decls, context)`, `Raw(text, context)`; `KEEP_CLASSES: set[str]`; `parse(text) -> list[Rule | Raw]`; `serialize(nodes) -> str`; `split_top_level(text, sep) -> list[str]`; `classes_outside_pseudos(selector) -> set[str]`; `load_usage(dist: Path) -> Callable[[str], bool]` (returns `is_used(class_name)`); `check(nodes, is_used) -> list[str]` (problems). CLI: `python3 tools/csskit.py report|check <css> --html <dist>`. Rule and Raw both expose `.render() -> str`.

- [ ] **Step 1: Write the failing tests**

`startup/tools/test_csskit.py`:

```python
import unittest

import csskit as ck


class ParseSerialize(unittest.TestCase):
    def test_round_trip_keeps_rules_contexts_importance_and_keyframes(self):
        source = ('/* layer */ .a , .b > c { color : red ; margin:0 !important }\n'
                  '@media (max-width: 47.5rem) { .a{color:blue} }\n'
                  '@keyframes enter{from{opacity:0}to{opacity:1}}')
        nodes = ck.parse(source)
        self.assertEqual([type(n).__name__ for n in nodes], ['Rule', 'Rule', 'Raw'])
        self.assertEqual(nodes[0].selector, '.a,.b > c')
        self.assertEqual([(d.prop, d.value, d.important) for d in nodes[0].decls], [('color', 'red', False), ('margin', '0', True)])
        self.assertEqual(nodes[1].context, '@media(max-width:47.5rem)')
        self.assertEqual(ck.serialize(nodes), (
            '.a,.b > c{color:red;margin:0!important}\n'
            '@media(max-width:47.5rem){\n'
            '  .a{color:blue}\n'
            '}\n'
            '@keyframes enter{from{opacity:0}to{opacity:1}}\n'))

    def test_adjacent_rules_in_the_same_context_share_one_block(self):
        nodes = ck.parse('@media print{.a{color:red}}@media print{.b{color:red}}')
        self.assertEqual(ck.serialize(nodes), '@media print{\n  .a{color:red}\n  .b{color:red}\n}\n')

    def test_media_query_words_keep_their_spaces(self):
        node = ck.parse('@media screen and (min-width: 30rem){.a{color:red}}')[0]
        self.assertEqual(node.context, '@media screen and (min-width:30rem)')

    def test_custom_property_names_keep_their_case(self):
        decl = ck.parse(':root{--Brand-Blue:#fff}')[0].decls[0]
        self.assertEqual(decl.prop, '--Brand-Blue')

    def test_nested_conditional_rules_are_rejected(self):
        with self.assertRaises(ValueError):
            ck.parse('@media print{@media (min-width:1px){.a{color:red}}}')


class Selectors(unittest.TestCase):
    def test_split_top_level_ignores_commas_inside_parentheses(self):
        self.assertEqual(ck.split_top_level(':is(.a,.b) p,.c', ','), [':is(.a,.b) p', '.c'])

    def test_classes_inside_functional_pseudos_are_ignored(self):
        self.assertEqual(ck.classes_outside_pseudos('.cards:has(.card:nth-child(4)) .x:not(.y)'), {'cards', 'x'})


class Check(unittest.TestCase):
    def is_used(self, name):
        return name in {'a', 'b'}

    def test_clean_stylesheet_has_no_problems(self):
        nodes = ck.parse(':root{--x:red;color-scheme:dark}.a{color:var(--x)}@media print{.b{color:red!important}}')
        self.assertEqual(ck.check(nodes, self.is_used), [])

    def test_each_rule_of_the_spec_is_enforced(self):
        nodes = ck.parse(':root{--x:red;--unused:1px}:root{--y:blue}'
                         '.a{color:var(--x);margin:0!important}.a{padding:0;color:var(--y)}'
                         '.zombie{color:red}.b .x{border-color:var(--missing)}')
        problems = ck.check(nodes, self.is_used)
        self.assertIn('Duplicate rule: ":root" (top level) appears 2 times', problems)
        self.assertIn('Duplicate rule: ".a" (top level) appears 2 times', problems)
        self.assertIn('Unused custom property: --unused', problems)
        self.assertIn('Undefined custom property: --missing', problems)
        self.assertIn('!important outside print/reduced motion: .a { margin }', problems)
        self.assertIn('Dead selector: ".zombie" (top level)', problems)
        self.assertIn('Dead selector: ".b .x" (top level)', problems)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: FAIL with `ModuleNotFoundError: No module named 'csskit'`.

- [ ] **Step 3: Write the implementation**

`startup/tools/csskit.py` (Tasks 5 and 6 append more functions to this file):

```python
"""Parse, audit and restructure the Biro.dev stylesheet. Standard library only.

  python3 tools/csskit.py report <css> --html dist
  python3 tools/csskit.py check  <css> --html dist
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

COMMENT = re.compile(r'/\*.*?\*/', re.S)
IMPORTANT = re.compile(r'\s*!\s*important\s*$', re.I)
FUNCTIONAL_PSEUDO = re.compile(r':[a-zA-Z-]+\(')
CLASS = re.compile(r'\.(-?[_a-zA-Z][\w-]*)')
VAR_USE = re.compile(r'var\(\s*(--[\w-]+)')
ALLOWED_IMPORTANT = ('print', 'prefers-reduced-motion')


@dataclass
class Decl:
    prop: str
    value: str
    important: bool = False

    def render(self) -> str:
        return f"{self.prop}:{self.value}{'!important' if self.important else ''}"


@dataclass
class Rule:
    selector: str
    decls: list
    context: str = ''

    def render(self) -> str:
        return self.selector + '{' + ';'.join(d.render() for d in self.decls) + '}'


@dataclass
class Raw:
    """A block kept verbatim, such as @keyframes."""
    text: str
    context: str = ''

    def render(self) -> str:
        return self.text


def split_top_level(text: str, sep: str) -> list:
    parts, depth, quote, start = [], 0, '', 0
    for i, ch in enumerate(text):
        if quote:
            if ch == quote:
                quote = ''
        elif ch in '"\'':
            quote = ch
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == sep and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


def normalize_selector(text: str) -> str:
    return re.sub(r'\s*,\s*', ',', re.sub(r'\s+', ' ', text.strip()))


def normalize_context(text: str) -> str:
    text = re.sub(r'\s+', ' ', text.strip())
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'\s*:\s*', ':', text)
    text = re.sub(r'\s*,\s*', ',', text)
    return re.sub(r'^@media\s+\(', '@media(', text)


def parse_decls(block: str) -> list:
    decls = []
    for chunk in split_top_level(block, ';'):
        if not chunk.strip():
            continue
        if ':' not in chunk:
            raise ValueError(f'Unparseable declaration: {chunk!r}')
        prop, value = chunk.split(':', 1)
        prop = prop.strip()
        if not prop.startswith('--'):
            prop = prop.lower()
        value = value.strip()
        important = bool(IMPORTANT.search(value))
        value = IMPORTANT.sub('', value).strip()
        if '"' not in value and "'" not in value:
            value = re.sub(r'\s+', ' ', value)
        decls.append(Decl(prop, value, important))
    return decls


def _matching_brace(text: str, start: int) -> int:
    depth = 0
    for j in range(start, len(text)):
        if text[j] == '{':
            depth += 1
        elif text[j] == '}':
            depth -= 1
            if depth == 0:
                return j
    raise ValueError('Unbalanced braces')


def _parse_block(text: str, context: str) -> list:
    nodes, i = [], 0
    while i < len(text):
        brace = text.find('{', i)
        if brace == -1:
            if text[i:].strip():
                raise ValueError(f'Trailing content: {text[i:][:60]!r}')
            break
        prelude = text[i:brace].strip()
        if ';' in prelude:
            raise ValueError(f'Statement at-rules are not supported: {prelude[:60]!r}')
        end = _matching_brace(text, brace)
        body = text[brace + 1:end]
        if prelude.startswith(('@media', '@supports')):
            if context:
                raise ValueError('Nested conditional at-rules are not supported')
            nodes.extend(_parse_block(body, normalize_context(prelude)))
        elif prelude.startswith('@'):
            nodes.append(Raw(prelude + '{' + re.sub(r'\s+', ' ', body.strip()) + '}', context))
        else:
            nodes.append(Rule(normalize_selector(prelude), parse_decls(body), context))
        i = end + 1
    return nodes


def parse(text: str) -> list:
    return _parse_block(COMMENT.sub('', text), '')


def serialize(nodes: list) -> str:
    lines, current = [], ''
    for node in nodes:
        if isinstance(node, Rule) and not node.decls:
            continue
        if node.context != current:
            if current:
                lines.append('}')
            if node.context:
                lines.append(node.context + '{')
            current = node.context
        lines.append(('  ' if node.context else '') + node.render())
    if current:
        lines.append('}')
    return '\n'.join(lines) + '\n'


def strip_functional_pseudos(selector: str) -> str:
    out, i = [], 0
    while i < len(selector):
        match = FUNCTIONAL_PSEUDO.search(selector, i)
        if not match:
            out.append(selector[i:])
            break
        out.append(selector[i:match.start()])
        depth, j = 0, match.end() - 1
        while j < len(selector):
            if selector[j] == '(':
                depth += 1
            elif selector[j] == ')':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        i = j + 1
    return ''.join(out)


def classes_outside_pseudos(selector: str) -> set:
    return set(CLASS.findall(strip_functional_pseudos(selector)))


# Classes a script builds at runtime (so the usage scan cannot see them), each with a comment naming where.
KEEP_CLASSES = set()


def load_usage(dist: Path):
    """Returns is_used(class_name): true if any generated page or site script references the class."""
    classes = set()
    for page in dist.rglob('*.html'):
        for value in re.findall(r'class="([^"]*)"', page.read_text()):
            classes.update(value.split())
    scripts = '\n'.join(p.read_text() for p in (dist / 'assets').rglob('*.js'))

    def is_used(name: str) -> bool:
        return name in KEEP_CLASSES or name in classes or re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', scripts) is not None
    return is_used


def _where(context: str) -> str:
    return context or 'top level'


def check(nodes: list, is_used) -> list:
    problems = []
    rules = [n for n in nodes if isinstance(n, Rule)]
    counts = Counter((r.context, r.selector) for r in rules)
    for (context, selector), count in counts.items():
        if count > 1:
            problems.append(f'Duplicate rule: "{selector}" ({_where(context)}) appears {count} times')
    defined, used = set(), set()
    for rule in rules:
        for decl in rule.decls:
            if decl.prop.startswith('--'):
                defined.add(decl.prop)
            used.update(VAR_USE.findall(decl.value))
            if decl.important and not any(word in rule.context for word in ALLOWED_IMPORTANT):
                problems.append(f'!important outside print/reduced motion: {rule.selector} {{ {decl.prop} }}')
        for member in split_top_level(rule.selector, ','):
            if not all(is_used(name) for name in classes_outside_pseudos(member)):
                problems.append(f'Dead selector: "{member}" ({_where(rule.context)})')
    problems += [f'Unused custom property: {p}' for p in sorted(defined - used)]
    problems += [f'Undefined custom property: {p}' for p in sorted(used - defined)]
    return problems


def report(nodes: list, is_used) -> str:
    rules = [n for n in nodes if isinstance(n, Rule)]
    colors = Counter(h.lower() for r in rules for d in r.decls for h in re.findall(r'#[0-9a-fA-F]{3,8}\b', d.value))
    contexts = Counter(r.context for r in rules if r.context)
    lines = [f'{len(rules)} rules, {sum(len(r.decls) for r in rules)} declarations',
             'Contexts: ' + ', '.join(f'{c} ×{n}' for c, n in contexts.most_common()),
             'Colors used 3+ times: ' + ', '.join(f'{c} ×{n}' for c, n in colors.most_common() if n >= 3)]
    lines += check(nodes, is_used)
    return '\n'.join(lines)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['report', 'check'])
    parser.add_argument('css', type=Path)
    parser.add_argument('--html', type=Path, required=True, help='generated site directory (dist)')
    args = parser.parse_args(argv)
    nodes = parse(args.css.read_text())
    is_used = load_usage(args.html)
    if args.command == 'report':
        print(report(nodes, is_used))
        return 0
    problems = check(nodes, is_used)
    print('\n'.join(problems) if problems else 'OK: stylesheet satisfies the Foundation rules.')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the report against the real stylesheet**

Run: `cd startup && python3 tools/csskit.py report dist/assets/site.css --html dist | head -20`
Expected: no exception. It shows about 600 rules, color counts matching the Global Constraints table (for example `#8bb6ff ×21`), and lists of duplicate rules and dead selectors.

- [ ] **Step 6: Commit**

```bash
git add startup/tools/csskit.py startup/tools/test_csskit.py
git commit -m "Add csskit parser, serializer, report and Foundation rule check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: csskit prune and tokenize

**Files:**
- Modify: `startup/tools/csskit.py` (add functions and the `prune` and `tokenize` commands)
- Test: `startup/tools/test_csskit.py` (add test classes)

**Interfaces:**
- Consumes: `Rule`, `Decl`, `parse`, `serialize`, `split_top_level`, `classes_outside_pseudos`, `load_usage` from Task 4.
- Produces: `prune_dead_selectors(nodes, is_used) -> (nodes, removed: list[str])`; `prune_overridden(nodes) -> (nodes, removed_count: int)`; `tokenize(nodes) -> nodes`; the constants `COLOR_TOKENS`, `RENAMED_VARS`, `RADIUS_TOKENS`, `GAP_TOKENS`, `BREAKPOINTS`; CLI `prune <in> <out> --html <dist>` and `tokenize <in> <out> --html <dist>`.

- [ ] **Step 1: Write the failing tests (Review Focus 5)**

Append to `startup/tools/test_csskit.py`, above the `if __name__` line:

```python
class PruneDeadSelectors(unittest.TestCase):
    def is_used(self, name):
        return name in {'live', 'cards'}

    def run_prune(self, css):
        nodes, removed = ck.prune_dead_selectors(ck.parse(css), self.is_used)
        return ck.serialize(nodes), removed

    def test_rule_with_only_unused_classes_is_removed(self):
        out, removed = self.run_prune('.gone{color:red}.live{color:blue}')
        self.assertEqual(out, '.live{color:blue}\n')
        self.assertEqual(removed, ['.gone'])

    def test_only_the_dead_members_of_a_selector_list_are_removed(self):
        out, _ = self.run_prune('.gone,.live p{color:red}')
        self.assertEqual(out, '.live p{color:red}\n')

    def test_classes_inside_not_and_has_never_make_a_selector_dead(self):
        out, removed = self.run_prune('p:not(.gone){color:red}.cards:has(.gone){gap:1px}')
        self.assertEqual(out, 'p:not(.gone){color:red}\n.cards:has(.gone){gap:1px}\n')
        self.assertEqual(removed, [])


class PruneOverridden(unittest.TestCase):
    def run_prune(self, css):
        nodes, count = ck.prune_overridden(ck.parse(css))
        return ck.serialize(nodes), count

    def test_earlier_declaration_overridden_by_same_selector_is_removed(self):
        out, count = self.run_prune('.a{color:red;margin:0}.b{color:green}.a{color:blue}')
        self.assertEqual(out, '.a{margin:0}\n.b{color:green}\n.a{color:blue}\n')
        self.assertEqual(count, 1)

    def test_important_declaration_survives_a_later_normal_one(self):
        out, count = self.run_prune('@media print{.a{color:red!important}.a{color:blue}}')
        self.assertEqual(count, 0)

    def test_different_contexts_do_not_override_each_other(self):
        _, count = self.run_prune('.a{color:red}@media print{.a{color:blue}}')
        self.assertEqual(count, 0)

    def test_progressive_fallbacks_are_kept(self):
        _, count = self.run_prune('.a{min-height:100vh}.a{min-height:100dvh}')
        self.assertEqual(count, 0)

    def test_duplicates_inside_one_rule_are_kept(self):
        _, count = self.run_prune('.a{display:block;display:grid}')
        self.assertEqual(count, 0)


class Tokenize(unittest.TestCase):
    def test_colors_vars_radii_gaps_and_breakpoints_are_tokenized(self):
        css = (':root{color-scheme:dark;--ink:#e7eef9;--muted:#d2def0;--blue:#8bb6ff;--line:#6685af;--pale:#101d30}'
               '.a{color:var(--ink);background:#101D30;border:1px solid #304965;border-radius:1rem;gap:1.5rem;'
               'box-shadow:0 0 4px #00000040;outline-color:var(--blue);border-color:var(--line);fill:var(--muted)}'
               '@media(max-width:760px){.a{gap:10px}}')
        out = ck.serialize(ck.tokenize(ck.parse(css)))
        root, rest = out.split('\n', 1)
        self.assertTrue(root.startswith(':root{color-scheme:dark;--color-bg:#090f1b;'))
        for token in ('--text:#e7eef9', '--text-muted:#d2def0', '--accent:#8bb6ff', '--border-5:#6685af', '--space-6:1.5rem'):
            self.assertIn(token, root)
        for removed in ('--ink', '--pale', '--muted:', '--blue', '--line'):
            self.assertNotIn(removed, root)
        self.assertEqual(rest, (
            '.a{color:var(--text);background:var(--surface-2);border:1px solid var(--border-2);'
            'border-radius:var(--radius-md);gap:var(--space-6);box-shadow:0 0 4px var(--shadow-color);'
            'outline-color:var(--accent);border-color:var(--border-5);fill:var(--text-muted)}\n'
            '@media(max-width:47.5rem){\n  .a{gap:10px}\n}\n'))

    def test_effective_values_of_renamed_properties_must_match_the_token_table(self):
        with self.assertRaises(ValueError):
            ck.tokenize(ck.parse(':root{--muted:#acbad0}.a{color:var(--muted)}'))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: FAIL with `AttributeError: module 'csskit' has no attribute 'prune_dead_selectors'` (and likewise for `prune_overridden` and `tokenize`).

- [ ] **Step 3: Write the implementation**

In `startup/tools/csskit.py`, add after `report()` and before `main()`:

```python
FALLBACK_MARKERS = ('dvh', 'svh', 'lvh', 'dvw', 'svw', 'lvw', 'cqw', 'cqh', 'cqi', 'clamp(', 'min(', 'max(', 'env(', 'color-mix(', '-webkit-', '-moz-')

# Token table from the Foundation spec. Values are exact; the redesign normalizes them later.
COLOR_TOKENS = {
    '#090f1b': '--color-bg', '#0d1727': '--surface-1', '#101d30': '--surface-2', '#111d30': '--surface-3',
    '#142238': '--surface-4', '#14243a': '--surface-5', '#132640': '--surface-6',
    '#2b415e': '--border-1', '#304965': '--border-2', '#3b5576': '--border-3', '#415b7d': '--border-4', '#6685af': '--border-5',
    '#e7eef9': '--text', '#d2def0': '--text-muted', '#c1cfe0': '--text-quiet', '#acbad0': '--text-subtle',
    '#8bb6ff': '--accent', '#b4cfff': '--accent-text', '#c0d5f4': '--accent-text-soft', '#091321': '--on-accent',
    '#00000040': '--shadow-color',
}
RENAMED_VARS = {'--ink': '--text', '--muted': '--text-muted', '--blue': '--accent', '--line': '--border-5'}
RADIUS_TOKENS = {'.75rem': '--radius-sm', '1rem': '--radius-md', '1.5rem': '--radius-lg', '24px': '--radius-lg-px', '100px': '--radius-pill'}
GAP_TOKENS = {'.5rem': '--space-2', '.75rem': '--space-3', '1rem': '--space-4', '1.25rem': '--space-5',
              '1.5rem': '--space-6', '2rem': '--space-8', '2.5rem': '--space-10', '4rem': '--space-16'}
BREAKPOINTS = {'(max-width:760px)': '(max-width:47.5rem)', '(min-width:761px)': '(min-width:47.5625rem)',
               '(max-width:1000px)': '(max-width:62.5rem)', '(max-width:440px)': '(max-width:27.5rem)'}
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def prune_dead_selectors(nodes: list, is_used) -> tuple:
    out, removed = [], []
    for node in nodes:
        if isinstance(node, Rule):
            members = split_top_level(node.selector, ',')
            alive = [m for m in members if all(is_used(name) for name in classes_outside_pseudos(m))]
            removed += [m for m in members if m not in alive]
            if not alive:
                continue
            node = Rule(','.join(alive), node.decls, node.context)
        out.append(node)
    return out, removed


def _markers(value: str) -> set:
    return {marker for marker in FALLBACK_MARKERS if marker in value}


def prune_overridden(nodes: list) -> tuple:
    """Drops a declaration when a later rule with the same selector and context sets the same property."""
    later = defaultdict(list)
    kept_reversed, removed = [], 0
    for node in reversed(nodes):
        if not isinstance(node, Rule):
            kept_reversed.append(node)
            continue
        key = (node.context, node.selector)
        decls = []
        for decl in node.decls:
            overriding = [d for d in later[(key, decl.prop)] if (d.important or not decl.important) and _markers(d.value) == _markers(decl.value)]
            if overriding:
                removed += 1
            else:
                decls.append(decl)
        for decl in node.decls:
            later[(key, decl.prop)].append(decl)
        kept_reversed.append(Rule(node.selector, decls, node.context))
    return list(reversed(kept_reversed)), removed


def tokenize(nodes: list) -> list:
    effective = {}
    for node in nodes:
        if isinstance(node, Rule) and node.selector == ':root' and not node.context:
            effective.update({d.prop: d.value.lower() for d in node.decls if d.prop.startswith('--')})
    used = {name for n in nodes if isinstance(n, Rule) for d in n.decls for name in VAR_USE.findall(d.value)}
    unknown = used - set(RENAMED_VARS)
    if unknown:
        raise ValueError(f'Custom properties without a token mapping: {sorted(unknown)}')
    token_values = {token: hex_value for hex_value, token in COLOR_TOKENS.items()}
    for old, new in RENAMED_VARS.items():
        if old in used and effective.get(old) != token_values.get(new):
            raise ValueError(f'{old} resolves to {effective.get(old)}, but {new} is {token_values.get(new)}')

    def swap(decl: Decl) -> Decl:
        value = re.sub(r'var\(\s*(--[\w-]+)', lambda m: 'var(' + RENAMED_VARS.get(m.group(1), m.group(1)), decl.value)
        value = HEX.sub(lambda m: f'var({COLOR_TOKENS[m.group(0).lower()]})' if m.group(0).lower() in COLOR_TOKENS else m.group(0), value)
        if decl.prop == 'border-radius' and value in RADIUS_TOKENS:
            value = f'var({RADIUS_TOKENS[value]})'
        if decl.prop in ('gap', 'row-gap', 'column-gap') and value in GAP_TOKENS:
            value = f'var({GAP_TOKENS[value]})'
        return Decl(decl.prop, value, decl.important)

    root_settings, body = [], []
    for node in nodes:
        context = node.context
        for old, new in BREAKPOINTS.items():
            context = context.replace(old, new)
        if isinstance(node, Rule) and node.selector == ':root' and not node.context:
            root_settings += [d for d in node.decls if not d.prop.startswith('--')]
            continue
        if isinstance(node, Rule):
            body.append(Rule(node.selector, [swap(d) for d in node.decls], context))
        else:
            body.append(type(node)(node.text, context))
    tokens = [Decl(name, value) for value, name in COLOR_TOKENS.items()]
    tokens += [Decl(name, value) for value, name in RADIUS_TOKENS.items()]
    tokens += [Decl(name, value) for value, name in GAP_TOKENS.items()]
    return [Rule(':root', root_settings + tokens)] + body
```

Then change `main()` so the parser accepts the two new commands and their output path:

```python
def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['report', 'check', 'prune', 'tokenize'])
    parser.add_argument('css', type=Path)
    parser.add_argument('out', type=Path, nargs='?')
    parser.add_argument('--html', type=Path, required=True, help='generated site directory (dist)')
    args = parser.parse_args(argv)
    nodes = parse(args.css.read_text())
    is_used = load_usage(args.html)
    if args.command == 'report':
        print(report(nodes, is_used))
        return 0
    if args.command == 'check':
        problems = check(nodes, is_used)
        print('\n'.join(problems) if problems else 'OK: stylesheet satisfies the Foundation rules.')
        return 1 if problems else 0
    if args.out is None:
        parser.error(f'{args.command} needs an output path')
    if args.command == 'prune':
        nodes, dead = prune_dead_selectors(nodes, is_used)
        nodes, overridden = prune_overridden(nodes)
        print(f'Removed {len(dead)} dead selectors and {overridden} overridden declarations.')
        for member in dead:
            print(f'  dead: {member}')
    else:
        nodes = tokenize(nodes)
        print('Tokenized colors, radii, gaps and breakpoints.')
    args.out.write_text(serialize(nodes))
    return 0
```

Also replace the module docstring's usage block with:

```text
  python3 tools/csskit.py report   <css> --html dist
  python3 tools/csskit.py check    <css> --html dist
  python3 tools/csskit.py prune    <in.css> <out.css> --html dist
  python3 tools/csskit.py tokenize <in.css> <out.css> --html dist
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add startup/tools/csskit.py startup/tools/test_csskit.py
git commit -m "Add csskit pruning of dead selectors and overridden declarations, and tokenization

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: csskit split and merge

**Files:**
- Modify: `startup/tools/csskit.py` (add partitioning, the merge, and the `split` command)
- Test: `startup/tools/test_csskit.py` (add test classes)

**Interfaces:**
- Consumes: everything Tasks 4 and 5 produce.
- Produces: `STYLE_ORDER: list[str]`, `PARTITION: dict[str, str]`, `OWNER_OVERRIDES: dict[str, str]`, `owner_file(member: str, context: str) -> str`, `related(a: str, b: str) -> bool`, `merge_duplicates(nodes) -> nodes`, `split(nodes) -> dict[str, list]` (file → nodes, in `STYLE_ORDER`); CLI `split <in> --out-dir <styles> --html <dist>`, which writes the files and prints the `STYLE_SOURCES` list for `generate.py`.

- [ ] **Step 1: Write the failing tests**

Append to `startup/tools/test_csskit.py`, above the `if __name__` line:

```python
class Related(unittest.TestCase):
    def test_shorthands_longhands_and_box_families_are_related(self):
        for a, b in [('padding', 'padding-top'), ('gap', 'row-gap'), ('border-radius', 'border-top-left-radius'),
                     ('margin-inline', 'margin-left'), ('font', 'line-height'), ('color', 'color')]:
            self.assertTrue(ck.related(a, b), (a, b))
            self.assertTrue(ck.related(b, a), (b, a))

    def test_unrelated_properties(self):
        for a, b in [('color', 'background-color'), ('display', 'gap'), ('--a', '--b')]:
            self.assertFalse(ck.related(a, b), (a, b))


class Merge(unittest.TestCase):
    def test_earlier_rule_folds_into_the_last_one_when_nothing_between_conflicts(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}.b{margin:0}.a{padding:0}'))
        self.assertEqual(ck.serialize(nodes), '.b{margin:0}\n.a{color:red;padding:0}\n')

    def test_declaration_stays_when_a_rule_between_sets_a_related_property(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red;padding:1px}.b{padding-top:2px}.a{margin:0}'))
        self.assertEqual(ck.serialize(nodes), '.a{padding:1px}\n.b{padding-top:2px}\n.a{color:red;margin:0}\n')

    def test_rules_in_different_contexts_are_not_merged(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}@media print{.a{color:blue}}'))
        self.assertEqual(len([n for n in nodes if n.decls]), 2)


class Split(unittest.TestCase):
    def test_owner_is_the_leftmost_class_outside_pseudos(self):
        self.assertEqual(ck.owner_file('.hero-visual .concept', ''), 'pages/home.css')
        self.assertEqual(ck.owner_file('.js-enabled .header nav', ''), 'components/header.css')
        self.assertEqual(ck.owner_file('main :is(h1,h2)', ''), 'base.css')
        self.assertEqual(ck.owner_file('#af-progress', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-step', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-product-hero .pill', ''), 'pages/addvancedfocus.css')
        self.assertEqual(ck.owner_file('.header', '@media print'), 'media.css')
        self.assertEqual(ck.owner_file('.header', '@media(prefers-reduced-motion:reduce)'), 'media.css')

    def test_unknown_class_is_an_error(self):
        with self.assertRaises(KeyError):
            ck.owner_file('.never-mapped', '')

    def test_selector_lists_are_distributed_and_files_follow_style_order(self):
        files = ck.split(ck.parse(':root{--x:1px}h1,.hero,.wrap{margin:0}.pill{color:red}@keyframes enter{to{opacity:1}}'))
        self.assertEqual(list(files), ['tokens.css', 'base.css', 'layout.css', 'components/pills.css', 'pages/home.css'])
        self.assertEqual(ck.serialize(files['base.css']), 'h1{margin:0}\n@keyframes enter{to{opacity:1}}\n')
        self.assertEqual(ck.serialize(files['layout.css']), '.wrap{margin:0}\n')
        self.assertEqual(ck.serialize(files['pages/home.css']), '.hero{margin:0}\n')
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: FAIL with `AttributeError: module 'csskit' has no attribute 'related'` (and likewise for `merge_duplicates`, `owner_file` and `split`).

- [ ] **Step 3: Write the implementation**

In `startup/tools/csskit.py`, add after `tokenize()` and before `main()`:

```python
STYLE_ORDER = [
    'tokens.css', 'base.css', 'layout.css',
    'components/header.css', 'components/footer.css', 'components/buttons.css', 'components/pills.css',
    'components/cards.css', 'components/faq.css', 'components/notice.css', 'components/closing.css',
    'components/readiness.css', 'components/page-nav.css', 'components/steps.css', 'components/app-icon.css',
    'components/app-mockup.css', 'components/concept-card.css', 'components/demo.css',
    'pages/home.css', 'pages/about.css', 'pages/products.css', 'pages/addvancedfocus.css',
    'pages/mission.css', 'pages/contact.css', 'pages/product-page.css', 'media.css',
]

# Class → file, from the class-usage map of the generated pages (2026-10-09).
_PARTITION_SOURCE = {
    'base.css': 'skip sr-only muted large intro micro eyebrow wide-copy divider',
    'layout.css': 'wrap section section-intro page-hero split feature-section editorial-split editorial-copy title-row',
    'components/header.css': 'header brand menu-toggle js-enabled open',
    'components/footer.css': 'footer footer-top footer-bottom footer-email',
    'components/buttons.css': 'button text-link actions',
    'components/pills.css': 'pill tags',
    'components/cards.css': 'cards card card-number',
    'components/faq.css': 'faq',
    'components/notice.css': 'notice',
    'components/closing.css': 'closing',
    'components/readiness.css': 'readiness-grid',
    'components/page-nav.css': 'page-contents breadcrumbs',
    'components/steps.css': 'development-steps',
    'components/app-icon.css': 'app-icon',
    'components/app-mockup.css': 'app-mockup',
    'components/concept-card.css': 'concept concept-top task task-meta af-mini-horizons',
    'pages/home.css': 'hero hero-visual ribbon visual-caption principle-strip feature flow-list founder-teaser home-product-grid portfolio-teaser',
    'pages/about.css': 'founder-layout founder-panel monogram prose company-overview company-facts evaluation-list founder-contact',
    'pages/products.css': 'product-large product-art product-guide portfolio-card portfolio-detail portfolio-grid portfolio-image-link portfolio-index portfolio-page-link portfolio-tagline logo-family brand-family',
    'pages/addvancedfocus.css': 'af-product-hero af-product-promise focus-contexts horizon-guide concept-section concept-section-heading intent-example example-intention example-label approach-cards',
    'pages/mission.css': 'mission-image mission-statement privacy-note',
    'pages/contact.css': 'contact-address contact-card contact-layout contact-note contact-ready contact-stage contact-topics',
    'pages/product-page.css': 'future-product-hero future-hero-grid product-brief product-brief-head product-brief-tagline product-detail-grid product-example example-boundary capability-list product-feedback related-grid related-product',
}
PARTITION = {name: file for file, names in _PARTITION_SOURCE.items() for name in names.split()}
# Selector member → file, for rules that must sit later than their owner to keep today's cascade.
OWNER_OVERRIDES = {}
MEDIA_FILE_CONTEXTS = ('print', 'prefers-reduced-motion', 'prefers-contrast')

SHORTHAND_GROUPS = {
    'gap': {'row-gap', 'column-gap'}, 'inset': {'top', 'right', 'bottom', 'left'},
    'place-items': {'align-items', 'justify-items'}, 'place-content': {'align-content', 'justify-content'},
    'place-self': {'align-self', 'justify-self'}, 'font': {'line-height'}, 'flex-flow': {'flex-direction', 'flex-wrap'},
    'border-radius': {'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'},
    'grid-area': {'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end'},
    'grid-row': {'grid-row-start', 'grid-row-end'}, 'grid-column': {'grid-column-start', 'grid-column-end'},
}
BOX_FAMILIES = {'margin', 'padding', 'border', 'inset', 'overflow'}


def related(a: str, b: str) -> bool:
    if a == b:
        return True
    if a.startswith('--') or b.startswith('--'):
        return False
    if a.startswith(b + '-') or b.startswith(a + '-'):
        return True
    if a.split('-')[0] == b.split('-')[0] and a.split('-')[0] in BOX_FAMILIES:
        return True
    return any((a == s and b in longs) or (b == s and a in longs) for s, longs in SHORTHAND_GROUPS.items())


def owner_file(member: str, context: str) -> str:
    if any(word in context for word in MEDIA_FILE_CONTEXTS):
        return 'media.css'
    if member in OWNER_OVERRIDES:
        return OWNER_OVERRIDES[member]
    if member == ':root':
        return 'tokens.css'
    stripped = strip_functional_pseudos(member)
    first_class = CLASS.search(stripped)
    if first_class:
        name = first_class.group(1)
        if name in PARTITION:
            return PARTITION[name]
        if name.startswith('af-'):
            return 'components/demo.css'
        raise KeyError(f'No partition for class .{name} (selector "{member}"). Add it to _PARTITION_SOURCE: '
                       'the page file if one page uses it, otherwise a components/ file.')
    first_id = re.search(r'#([\w-]+)', stripped)
    if first_id and first_id.group(1).startswith('af-'):
        return 'components/demo.css'
    return 'base.css'


def merge_duplicates(nodes: list) -> list:
    """Folds earlier rules into the last rule with the same selector and context when no rule in between sets a related property."""
    nodes = [Rule(n.selector, list(n.decls), n.context) if isinstance(n, Rule) else n for n in nodes]
    positions = defaultdict(list)
    for index, node in enumerate(nodes):
        if isinstance(node, Rule):
            positions[(node.context, node.selector)].append(index)
    for indexes in positions.values():
        if len(indexes) < 2:
            continue
        last, moved = indexes[-1], []
        for index in indexes[:-1]:
            stay = []
            for decl in nodes[index].decls:
                between = [nodes[k] for k in range(index + 1, last) if isinstance(nodes[k], Rule)]
                if any(related(decl.prop, other.prop) for rule in between for other in rule.decls):
                    stay.append(decl)
                else:
                    moved.append(decl)
            nodes[index].decls = stay
        nodes[last].decls = moved + nodes[last].decls
    return [n for n in nodes if not (isinstance(n, Rule) and not n.decls)]


def _redistribute(ordered: list, owners: dict, merged: list) -> dict:
    """Assigns merged nodes back to their files. A rule's file depends only on its selector, context and type, and
    merging only moves declarations into a later rule with the same selector and context, so membership is stable."""
    def key(node):
        return (type(node).__name__, node.context, node.selector if isinstance(node, Rule) else node.text)
    file_of = {key(node): owners[id(node)] for node in ordered}
    result = {name: [] for name in STYLE_ORDER}
    for node in merged:
        result[file_of[key(node)]].append(node)
    return {name: items for name, items in result.items() if items}


def split(nodes: list) -> dict:
    files = defaultdict(list)
    for node in nodes:
        if isinstance(node, Raw):
            files['media.css' if any(w in node.context for w in MEDIA_FILE_CONTEXTS) else 'base.css'].append(node)
            continue
        for member in split_top_level(node.selector, ','):
            files[owner_file(member, node.context)].append(Rule(member, list(node.decls), node.context))
    unknown = set(files) - set(STYLE_ORDER)
    if unknown:
        raise KeyError(f'Files missing from STYLE_ORDER: {sorted(unknown)}')
    ordered = [n for name in STYLE_ORDER for n in files.get(name, [])]
    owners = {id(n): name for name in STYLE_ORDER for n in files.get(name, [])}
    # Prune first so merged rules do not carry declarations a later rule already overrides.
    pruned, _ = prune_overridden(ordered)
    owners.update({id(new): owners[id(old)] for old, new in zip(ordered, pruned)})
    return _redistribute(pruned, owners, merge_duplicates(pruned))
```

Extend `main()`. Add `'split'` to the `choices`, add `parser.add_argument('--out-dir', type=Path)`, and insert this branch before the `if args.out is None` line:

```python
    if args.command == 'split':
        if args.out_dir is None:
            parser.error('split needs --out-dir')
        files = split(nodes)
        for name, file_nodes in files.items():
            target = args.out_dir / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(serialize(file_nodes))
        print('STYLE_SOURCES = [')
        for name in files:
            print(f"    '{name}',")
        print(']')
        return 0
```

Add to the docstring: `python3 tools/csskit.py split    <in.css> --out-dir styles --html dist`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd startup && python3 -m unittest discover -s tools -p 'test_*.py'`
Expected: PASS, 27 tests.

- [ ] **Step 5: Commit**

```bash
git add startup/tools/csskit.py startup/tools/test_csskit.py
git commit -m "Add csskit component partitioning and safe duplicate merging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Generate site.css from startup/styles

**Files:**
- Create: `startup/styles/legacy.css` (a verbatim copy of today's `startup/dist/assets/site.css`)
- Modify: `startup/generate.py` (add the stylesheet build after the `NAV = [...]` line, at about line 19)

**Interfaces:**
- Produces: `STYLE_SOURCES: list[str]` and `build_stylesheet()` in `generate.py`. Later tasks replace the list contents.

- [ ] **Step 1: Copy the stylesheet into the source directory**

Run: `cd startup && mkdir -p styles && cp dist/assets/site.css styles/legacy.css`

- [ ] **Step 2: Add the build to generate.py**

Insert after the `NAV = [...]` line:

```python
# The published stylesheet is generated from startup/styles; edit those files, not dist/assets/site.css.
STYLE_DIR = ROOT / 'styles'
STYLE_SOURCES = [
    'legacy.css',
]
STYLE_HEADER = '/* Generated by generate.py from startup/styles. Do not edit this file. */\n'


def build_stylesheet():
    present = {path.relative_to(STYLE_DIR).as_posix() for path in STYLE_DIR.rglob('*.css')}
    unlisted = sorted(present - set(STYLE_SOURCES))
    missing = sorted(set(STYLE_SOURCES) - present)
    if unlisted or missing:
        raise ValueError(f'startup/styles is out of sync with STYLE_SOURCES. Unlisted: {unlisted}. Missing: {missing}.')
    css = '\n'.join((STYLE_DIR / name).read_text().strip() for name in STYLE_SOURCES)
    (OUT / 'assets' / 'site.css').write_text(STYLE_HEADER + css + '\n')


build_stylesheet()
```

- [ ] **Step 3: Rebuild and confirm nothing visible changed**

Run:

```bash
cd startup && python3 generate.py && node check-concept.cjs
git diff --stat -- dist ':!dist/assets/site.css'
cd qa && npm run snapshot -- .snapshots/task7 && npm run compare -- .snapshots/baseline .snapshots/task7
```

Expected:
- the generator prints `Generated 15 pages, …`
- both concept checks print `PASS`
- `git diff --stat` shows no files outside `site.css`
- compare prints `PASS: … files identical.`

- [ ] **Step 4: Check the out-of-sync guard (Review Focus 3)**

Run:

```bash
cd startup && echo '.stray{color:red}' > styles/stray.css
python3 generate.py; echo "exit=$?"
rm styles/stray.css && python3 generate.py
```

Expected: `ValueError: startup/styles is out of sync with STYLE_SOURCES. Unlisted: ['stray.css']. Missing: [].`, then `exit=1`, and the second run succeeds.

- [ ] **Step 5: Commit**

```bash
git add startup/styles/legacy.css startup/generate.py startup/dist/assets/site.css
git commit -m "Generate site.css from startup/styles with an out-of-sync guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Prune dead selectors and overridden declarations

**Files:**
- Modify: `startup/styles/legacy.css` (rewritten by csskit)
- Regenerated: `startup/dist/assets/site.css`

**Interfaces:**
- Consumes: `csskit.py prune` from Task 5 and the generator pipeline from Task 7.

- [ ] **Step 1: Prune**

Run: `cd startup && python3 tools/csskit.py prune styles/legacy.css styles/legacy.css --html dist`
Expected: `Removed N dead selectors and M overridden declarations.` The dead list should include selectors built on the 12 classes no page or script uses (for example `.demo-panel`, `.focus-hero`, `.nav-contact`, `.secondary-cta`, `.contact-pending`, `.task-icon`, `.summary`).

Then confirm that no script builds class names at runtime, which the usage scan cannot see:

```bash
grep -nE "classList\.(add|remove|toggle)\([^'\"]|className *[+=]|class=\"\$\{|\`[^\`]*class=" dist/assets/site.js dist/assets/concept-model.js
```

Expected: no output. If anything matches, work out every class name it can produce. For each one that appears in the dead list, add it to `KEEP_CLASSES` in `tools/csskit.py` with a comment naming the script line. Then restore the file with `git checkout -- styles/legacy.css` and repeat this step.

- [ ] **Step 2: Rebuild and compare**

Run:

```bash
cd startup && python3 generate.py
cd qa && npm run snapshot -- .snapshots/task8 && npm run compare -- .snapshots/baseline .snapshots/task8
```

Expected: `PASS: … files identical.`

If compare reports a difference, trace the element and property in the current build (`npm run trace -- <route> <width> <path> <property> --pass <pass>`) and in the baseline (prefix the same command with `QA_DIST="$HOME/Projects/biro-dev-baseline/startup/dist" QA_PORT=4311`). The baseline lists a rule the current build lacks. Add that rule's class to `KEEP_CLASSES` with a comment naming the state that needs it. Then restore the file with `git checkout -- styles/legacy.css` and redo Steps 1 and 2.

- [ ] **Step 3: Commit**

```bash
git add startup/styles/legacy.css startup/dist/assets/site.css startup/tools/csskit.py
git commit -m "Remove dead selectors and overridden declarations from the stylesheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Tokens and rem breakpoints

**Files:**
- Modify: `startup/styles/legacy.css` (rewritten by csskit)
- Regenerated: `startup/dist/assets/site.css`

**Interfaces:**
- Consumes: `csskit.py tokenize` from Task 5.

- [ ] **Step 1: Tokenize**

Run: `cd startup && python3 tools/csskit.py tokenize styles/legacy.css styles/legacy.css --html dist`
Expected: `Tokenized colors, radii, gaps and breakpoints.` If it raises `Custom properties without a token mapping` or a resolves-to mismatch, the stylesheet differs from what the spec measured. Stop and report the message rather than editing the token table.

- [ ] **Step 2: Rebuild, compare and confirm the checks that already apply**

Run:

```bash
cd startup && python3 generate.py
grep -c ':root{' dist/assets/site.css
grep -cE '760px|761px|1000px|440px' dist/assets/site.css
cd qa && npm run snapshot -- .snapshots/task9 && npm run compare -- .snapshots/baseline .snapshots/task9
```

Expected: `1` (one `:root`), then `0` (no pixel breakpoints left), then `PASS: … files identical.`

- [ ] **Step 3: Commit**

```bash
git add startup/styles/legacy.css startup/dist/assets/site.css
git commit -m "Introduce role-named design tokens and rem breakpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Split into component and page partials

**Files:**
- Create: the `startup/styles/` partials listed in `STYLE_ORDER` (only those that receive rules)
- Delete: `startup/styles/legacy.css`
- Modify: `startup/generate.py` (`STYLE_SOURCES` list)
- Modify: `startup/tools/csskit.py` (`OWNER_OVERRIDES`, and `_PARTITION_SOURCE` only if `split` reports an unmapped class)
- Regenerated: `startup/dist/assets/site.css`

**Interfaces:**
- Consumes: `csskit.py split` and `check` from Tasks 4–6.

- [ ] **Step 1: Split**

Run:

```bash
cd startup && python3 tools/csskit.py split styles/legacy.css --out-dir styles --html dist > /tmp/style-sources.txt
cat /tmp/style-sources.txt && git rm -q styles/legacy.css
```

Expected: a `STYLE_SOURCES = [ … ]` list beginning `'tokens.css', 'base.css', 'layout.css'` and ending `'media.css'`. If it raises `No partition for class .<name>`, add that class to `_PARTITION_SOURCE` following the rule in the message (one page → that page's file; several pages → a `components/` file), restore with `git checkout -- styles/legacy.css`, and re-run.

- [ ] **Step 2: Update the generator list**

Replace the `STYLE_SOURCES = [...]` block in `startup/generate.py` with the list printed in Step 1, verbatim.

- [ ] **Step 3: Rebuild, compare and resolve every difference**

Run:

```bash
cd startup && python3 generate.py
cd qa && npm run snapshot -- .snapshots/task10 && npm run compare -- .snapshots/baseline .snapshots/task10
```

Expected: `PASS: … files identical.` Reordering rules across files can change which of two equal-specificity rules wins. Resolve each reported difference this way until compare passes:

1. Trace the element and property in both builds, using `QA_PORT=4311` and `QA_DIST=…/biro-dev-baseline/startup/dist` for the baseline. Identify the declaration that wins now but lost before.
2. Try deleting that losing-before declaration from its partial. Rebuild, then run a filtered snapshot plus compare for the affected route and pass (`--route … --pass …` and `compare … --subset`), then a full compare. If everything is identical, the declaration never mattered. Keep the deletion.
3. Otherwise, add the earlier-winning rule's selector member to `OWNER_OVERRIDES` with the file it must follow, for example `'.wrap': 'pages/home.css'`. Reset `styles/` to Task 9's commit with `git clean -fdq styles && git checkout HEAD -- styles`, which removes the partials and restores `legacy.css`. Then redo Steps 1–3.

- [ ] **Step 4: Run the rule check and the unit tests**

Run:

```bash
cd startup && python3 tools/csskit.py check dist/assets/site.css --html dist
python3 -m unittest discover -s tools -p 'test_*.py'
```

Expected: `OK: stylesheet satisfies the Foundation rules.` and all 27 unit tests passing. If `check` lists duplicate rules that `merge_duplicates` left in place because of a conflict in between, resolve each one by hand: move the declarations to whichever rule keeps compare passing. Re-run Step 3's compare after every edit.

- [ ] **Step 5: Commit**

```bash
git add startup/styles startup/generate.py startup/tools/csskit.py startup/dist/assets/site.css
git commit -m "Split the stylesheet into token, base, layout, component and page partials

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Documentation and acceptance

**Files:**
- Modify: `startup/README.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Update the README**

Replace `Fourteen public pages` with `Fifteen public pages` in the first paragraph. Then append:

```markdown
## Styles

The published `dist/assets/site.css` is generated by `generate.py` from the files in `styles/`, in the order given by `STYLE_SOURCES`. Edit `styles/`, never the generated file. `styles/tokens.css` holds every color, radius and gap token. Adding a file to `styles/` without listing it in `STYLE_SOURCES` stops the build.

`python3 tools/csskit.py check dist/assets/site.css --html dist` confirms the stylesheet rules: one rule per selector and context, a single `:root`, no unused or undefined custom properties, `!important` only for print and reduced motion, and no dead selectors.

## Quality checks

The QA toolkit in `qa/` is a separate Node package. Netlify never installs it.

    cd qa && npm install && npx playwright install chromium webkit
    npm run unit                        # toolkit unit tests
    npm test                            # axe WCAG 2.2 AA, page structure and the keyboard demo, in Chromium and WebKit
    npm run snapshot -- .snapshots/a    # computed styles, geometry and screenshots of every page and state
    npm run compare -- .snapshots/a .snapshots/b
    npm run trace -- /products/ 375 'body:2>main:3' padding-top

Take a snapshot before and after any styling change. `compare` lists every element and property that changed.
```

- [ ] **Step 2: Verify every acceptance criterion**

Run:

```bash
cd ~/Projects/biro-dev-site/startup
python3 generate.py && node check-concept.cjs                                  # criterion 3
python3 tools/csskit.py check dist/assets/site.css --html dist                 # criterion 4
wc -c < dist/assets/site.css                                                   # criterion 5: ≤ BASELINE_CSS_BYTES from Task 2
git diff --stat claude/visual-polish -- dist ':!dist/assets/site.css' ../netlify.toml   # criterion 6: no output
cd qa && npm run unit && npm test                                             # criterion 2
npm run snapshot -- .snapshots/final && npm run compare -- .snapshots/baseline .snapshots/final   # criterion 1
```

Expected:
- the concept checks pass
- `check` prints `OK`
- the byte count is no larger than the baseline
- the `git diff --stat` prints nothing
- the unit tests and `npm test` pass
- compare prints `PASS`

If the size criterion fails, look at `media.css` and the distributed selector lists for repetition that a shared rule could absorb. Re-run the full compare after any change.

- [ ] **Step 3: Commit, push and open the pull request**

```bash
git add startup/README.md
git commit -m "Document the styles source and QA toolkit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin claude/foundation
gh pr create --base claude/visual-polish --head claude/foundation --title "Foundation: token-based stylesheet partials and QA toolkit" --body-file /tmp/foundation-pr.md
git worktree remove ../biro-dev-baseline
```

Write `/tmp/foundation-pr.md` before running `gh pr create`. It must include:
- the summary
- the baseline and final `site.css` byte counts
- the compare result line
- the `npm test` result
- every `known-issues.json` entry with its reason
- every `OWNER_OVERRIDES` entry and every declaration deleted in Task 10, Step 3
- a final line: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Do not merge. The user decides when, after reviewing.
