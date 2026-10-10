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
