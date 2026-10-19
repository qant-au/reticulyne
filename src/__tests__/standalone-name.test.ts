import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Reticulyne stands alone, and the name of the project it was forked from is
// to be reused for something unrelated, so that name appears nowhere in the
// code, tests, docs or scripts. Two exceptions:
// - src/core/scene/legacy.ts, the one place that knows the older names, so
//   files written under them still open;
// - the older names themselves (`accurona-scene`, `accurona-<id>`) in docs
//   and e2e specs that describe or exercise reading those files, and the
//   e2e fixture that is such a file, saved by an older build.
// CHANGELOG.md is history and is not checked.

const root = join(__dirname, '../..');
const DIRS = ['src', 'docs', 'e2e', 'scripts', 'schema', 'samples'];
const FILES = ['README.md', 'package.json', 'CONTRIBUTING.md', 'SECURITY.md'];
const LEGACY_FILE = 'src/core/scene/legacy.ts';
const LEGACY_FIXTURE = 'e2e/fixtures/export-icons-scene.json';
// Under src/, only the legacy file; elsewhere, only an older identifier.
const NAME = /accurona/i;
const NAME_NOT_IDENTIFIER = /accurona(?!-)/i;
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

test('the older project name appears only where older files are read', () => {
  const offending = files.flatMap((file) => {
    if (
      [LEGACY_FILE, LEGACY_FIXTURE, relative(root, __filename)].includes(file)
    ) {
      return [];
    }
    const pattern = file.startsWith('src/') ? NAME : NAME_NOT_IDENTIFIER;
    return readFileSync(join(root, file), 'utf8')
      .split('\n')
      .flatMap((line, i) => {
        return pattern.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [];
      });
  });
  expect(offending).toEqual([]);
});

test('the check sees the files it is meant to', () => {
  expect(files).toContain(LEGACY_FILE);
  expect(files).toContain('docs/scene-format.md');
  expect(files).toContain(LEGACY_FIXTURE);
});
