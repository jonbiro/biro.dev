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
