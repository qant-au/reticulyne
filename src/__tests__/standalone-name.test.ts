import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Reticulyne stands alone: no other project's name appears in its code,
// tests, docs, samples or scripts. CHANGELOG.md is history and is not
// checked. The names are written split so this file does not match itself.

const root = join(__dirname, '../..');
const DIRS = ['src', 'docs', 'e2e', 'scripts', 'schema', 'samples'];
const FILES = [
  'README.md',
  'package.json',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'eslint.config.js',
  'jest.config.js'
];
const NAMES = new RegExp(['accu' + 'rona', 'axono' + 'metra'].join('|'), 'i');
const SKIP = new Set(['node_modules', 'vendor']);

const walk = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP.has(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};

const files = [
  ...DIRS.flatMap((dir) => {
    return walk(join(root, dir));
  }),
  ...FILES.map((file) => {
    return join(root, file);
  })
].map((path) => {
  return relative(root, path);
});

test('no other project is named', () => {
  const offending = files.flatMap((file) => {
    return readFileSync(join(root, file), 'utf8')
      .split('\n')
      .flatMap((line, i) => {
        return NAMES.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [];
      });
  });
  expect(offending).toEqual([]);
});

test('the check sees the files it is meant to', () => {
  expect(files).toContain('docs/scene-format.md');
  expect(files).toContain('src/core/keymap.ts');
  expect(files).toContain('e2e/fixtures/export-icons-scene.json');
});
