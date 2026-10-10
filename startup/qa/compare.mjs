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
