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
