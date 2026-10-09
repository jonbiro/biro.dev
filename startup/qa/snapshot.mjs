import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { BASE_URL, DIST, HEIGHT, WIDTHS, discoverRoutes, routeSlug } from './lib/config.mjs';
import { PROPS, collectElements, collectFocused, settle, watchRequests } from './lib/capture.mjs';
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
  const assertNoFailedRequests = watchRequests(page);
  try {
    await page.goto(job.route);
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
    if (job.setup) await job.setup(page);
    // Park the pointer outside the page so no :hover style depends on where a setup click landed.
    await page.mouse.move(-1, -1);
    await settle(page);
    assertNoFailedRequests();
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
  const assertNoFailedRequests = watchRequests(page);
  try {
    await page.goto(job.route);
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
    await settle(page);
    assertNoFailedRequests();
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
