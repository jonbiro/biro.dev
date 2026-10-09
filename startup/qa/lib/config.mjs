import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// QA_DIST lets the toolkit snapshot another checkout's build, such as the baseline worktree.
export const DIST = process.env.QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url));
export const PORT = Number(process.env.QA_PORT ?? 4310);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const WIDTHS = [320, 375, 1280];
// One width inside each breakpoint band between the phone widths and desktop, used by the reduced-motion pass.
export const BAND_WIDTHS = [400, 600, 800, 980];
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
