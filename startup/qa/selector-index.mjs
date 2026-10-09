import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { BASE_URL, HEIGHT, discoverRoutes } from './lib/config.mjs';
import { settle, watchRequests } from './lib/capture.mjs';
import { startServer } from './lib/server.mjs';

// For csskit's merge: which elements each over-approximated selector can match, on every generated page.
// Input is `csskit.py selectors` output ({ member: probe }); output is { member: ["route#element", ...] }.
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: npm run selector-index -- <selectors.json> <out.json>');
  process.exit(2);
}
const probes = JSON.parse(readFileSync(input, 'utf8'));
const index = Object.fromEntries(Object.keys(probes).map((member) => [member, []]));
const unparseable = new Set();

const stop = await startServer();
const browser = await chromium.launch();
try {
  for (const route of discoverRoutes()) {
    const page = await browser.newPage({ viewport: { width: 1280, height: HEIGHT }, baseURL: BASE_URL });
    const assertNoFailedRequests = watchRequests(page);
    await page.goto(route);
    await settle(page);
    assertNoFailedRequests();
    const matches = await page.evaluate((allProbes) => {
      const position = new Map([...document.querySelectorAll('*')].map((element, i) => [element, i]));
      const result = {};
      for (const [member, probe] of Object.entries(allProbes)) {
        try {
          result[member] = [...document.querySelectorAll(probe)].map((element) => position.get(element));
        } catch {
          result[member] = null;
        }
      }
      return result;
    }, probes);
    for (const [member, ids] of Object.entries(matches)) {
      if (ids === null) unparseable.add(member);
      else index[member].push(...ids.map((id) => `${route}#${id}`));
    }
    await page.close();
  }
} finally {
  await browser.close();
  stop();
}
// csskit treats selectors missing from the index as overlapping everything.
for (const member of unparseable) delete index[member];
writeFileSync(output, JSON.stringify(index));
console.log(`Indexed ${Object.keys(index).length} selectors (${unparseable.size} unparseable, treated as overlapping everything).`);
