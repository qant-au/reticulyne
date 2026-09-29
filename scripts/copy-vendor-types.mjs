// Copies the vendored Accurona packages' type declarations into dist/, so
// the published .d.ts files that import them (the scene format's `Scene`
// type, the theme's shared UI types) resolve, and points those imports at
// the copies. Run by `npm run build` after tsc-alias, which leaves the
// `src/vendor/...` paths alone because src/vendor is not compiled. Only
// .d.ts files are copied; the code itself is in the bundles.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const packages = ['accurona-core', 'accurona-ui'];

for (const name of packages) {
  const from = resolve(root, 'src/vendor', name);
  if (!existsSync(from)) continue;
  cpSync(from, resolve(dist, 'vendor', name), {
    recursive: true,
    filter: (path) => {
      return !/\.[a-z]+$/i.test(path) || path.endsWith('.d.ts');
    }
  });
}

const declarations = (dir) => {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return declarations(path);
    return path.endsWith('.d.ts') ? [path] : [];
  });
};

const pattern = new RegExp(`(['"])src/vendor/(${packages.join('|')})\\1`, 'g');
for (const file of declarations(dist)) {
  const text = readFileSync(file, 'utf8');
  const next = text.replace(pattern, (_match, quote, name) => {
    let path = relative(dirname(file), join(dist, 'vendor', name));
    if (!path.startsWith('.')) path = `./${path}`;
    return `${quote}${path}${quote}`;
  });
  if (next !== text) writeFileSync(file, next);
}
