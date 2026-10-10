import { expect, test } from '@playwright/test';
import { BASE_URL, discoverRoutes } from './lib/config.mjs';

const ROUTES = discoverRoutes();

test('reduced motion: nothing animates, transitions or moves on any page', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const route of ROUTES) {
    await page.goto(route);
    const moving = await page.evaluate(() => [...document.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element);
      return style.animationName !== 'none' || style.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
    }).map((element) => `${element.localName}.${element.className}`).slice(0, 5));
    expect(moving, route).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.classList.contains('js-reveal')), route).toBe(false);
  }
  await context.close();
});

test('without JavaScript every section is visible', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, javaScriptEnabled: false, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  for (const route of ROUTES) {
    await page.goto(route);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('main > *')]
      .filter((node) => getComputedStyle(node).opacity !== '1' || getComputedStyle(node).visibility !== 'visible')
      .map((node) => node.className));
    expect(hidden, route).toEqual([]);
  }
  await context.close();
});

test('with motion, sections reveal once as they scroll into view', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/js-reveal/);
  await expect(page.locator('main > *').first()).toHaveClass(/is-visible/);
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  const unrevealed = await page.evaluate(() => [...document.querySelectorAll('main > *')].filter((n) => !n.classList.contains('is-visible')).length);
  expect(unrevealed).toBe(0);
  await context.close();
});

test('the constellation pauses when it is off-screen', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/');
  const orbit = page.locator('.constellation');
  await expect(orbit).not.toHaveClass(/is-paused/);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(orbit).toHaveClass(/is-paused/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(orbit).not.toHaveClass(/is-paused/);
  await context.close();
});

// Final-review regressions: these run with motion allowed, where the audit (reduced motion) cannot see them.
const OVERFLOW_WIDTHS = [320, 375, 390, 414, 430, 800, 1024, 1280];

test('with motion on and the orbit at 45°, no page scrolls sideways at any common width', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const overflowing = [];
  for (const width of OVERFLOW_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      const extra = await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          if (animation.effect && animation.effect.getComputedTiming().iterations === Infinity) {
            animation.pause();
            animation.currentTime = 6000; // 45° of the 48s drift: the widest rotated box
          }
        }
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      if (extra > 0) overflowing.push(`${route}@${width}: +${extra}px`);
    }
  }
  expect(overflowing).toEqual([]);
  await context.close();
});

test('printing with motion on shows every section, revealed or not', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  for (const route of ['/', '/products/', '/addvancedfocus/', '/accessibility/']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveClass(/js-reveal/);
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(() => [...document.querySelectorAll('main > *')].filter((n) => getComputedStyle(n).opacity !== '1').length);
    expect(hidden, route).toBe(0);
    await page.emulateMedia({ media: 'screen' });
  }
  await context.close();
});

test('sections already on screen when site.js runs are never hidden', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__hiddenOnScreen = null;
    new MutationObserver(() => {
      if (window.__hiddenOnScreen === null && document.documentElement.classList.contains('js-reveal')) {
        window.__hiddenOnScreen = [...document.querySelectorAll('main > *')]
          .filter((n) => n.getBoundingClientRect().top < innerHeight && !n.classList.contains('is-visible'))
          .map((n) => n.className);
      }
    }).observe(document, { attributes: true, attributeFilter: ['class'], subtree: true });
  });
  await page.route('**/assets/site.js', async (route) => { await new Promise((r) => setTimeout(r, 800)); await route.continue(); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/js-reveal/);
  expect(await page.evaluate(() => window.__hiddenOnScreen)).toEqual([]);
  await context.close();
});

test('keyboard focus never lands in a hidden section', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/accessibility/');
  await expect(page.locator('html')).toHaveClass(/js-reveal/);
  const opacity = await page.evaluate(() => {
    const link = [...document.querySelectorAll('main > *')].at(-1).querySelector('a, summary');
    link.focus();
    return getComputedStyle(link.closest('main > *')).opacity;
  });
  expect(opacity).toBe('1');
  await context.close();
});
