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
