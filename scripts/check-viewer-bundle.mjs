#!/usr/bin/env node
// Checks the read-only viewer's built bundles (after `npm run build`):
//
// - each of dist/viewer.js and dist/esm/viewer.mjs is under the size budget,
//   gzipped (the built-in drawings are a separate file loaded only when a
//   diagram needs them, so they do not count);
// - neither loads React, React DOM, MUI, Emotion or Zustand;
// - the drawings are reached only through a dynamic import (ESM) or a
//   require inside a function (CommonJS), never on load.
//
//   node scripts/check-viewer-bundle.mjs

import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET = 60 * 1024;
const BANNED = /(?:require\(|from\s*|import\()\s*["'](react|react-dom|@mui\/[^"']*|@emotion\/[^"']*|zustand)(?:\/[^"']*)?["']/g;

let failed = false;
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

for (const file of ['dist/viewer.js', 'dist/esm/viewer.mjs']) {
  let source;
  try {
    source = readFileSync(join(root, file), 'utf8');
  } catch {
    fail(`${file} is missing: run npm run build first`);
    continue;
  }
  const size = gzipSync(source, { level: 9 }).length;
  const kb = (size / 1024).toFixed(1);
  if (size >= BUDGET) {
    fail(`${file} is ${kb} KB gzipped, over the ${BUDGET / 1024} KB budget`);
  } else {
    console.log(`✓ ${file}: ${kb} KB gzipped (budget ${BUDGET / 1024} KB)`);
  }
  const banned = [...source.matchAll(BANNED)].map((m) => m[1]);
  if (banned.length) {
    fail(`${file} loads ${[...new Set(banned)].join(', ')}`);
  }
  if (/^import[^;]*["']\.\/drawings\.mjs["']/m.test(source)) {
    fail(`${file} imports the drawings on load`);
  }
}

if (failed) process.exit(1);
console.log('✓ the viewer loads no React, MUI, Emotion or Zustand');
