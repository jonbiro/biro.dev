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
