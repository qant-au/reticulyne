// Vendor Accurona's shared packages (qant-au/accurona) into src/vendor/.
//
//   node scripts/sync-accurona.mjs [path-to-accurona-checkout]
//
// Copies packages/<name>/dist/ into src/vendor/accurona-<name>/ (ui, core)
// and records the source commit. Defaults to ../accurona next to this repo.
// Run `npm run build` in the accurona checkout first.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.argv[2] ?? resolve(root, '../accurona'));
const packages = [
  { name: 'ui', label: 'shared UI' },
  { name: 'core', label: 'core (the scene format)' }
];

for (const { name } of packages) {
  const dist = resolve(source, `packages/${name}/dist`);
  if (!existsSync(resolve(dist, 'index.js'))) {
    console.error(`No ${dist}/index.js. Run \`npm run build\` in ${source}.`);
    process.exit(1);
  }
}

const git = (...args) =>
  execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', '--short', 'HEAD');
const dirty = git('status', '--porcelain') !== '';

for (const { name, label } of packages) {
  const target = resolve(root, `src/vendor/accurona-${name}`);
  rmSync(target, { recursive: true, force: true });
  cpSync(resolve(source, `packages/${name}/dist`), target, { recursive: true });
  writeFileSync(
    resolve(target, 'SOURCE.md'),
    `# Vendored ${label}\n\n\`@accurona/${name}\`, built by [qant-au/accurona](https://github.com/qant-au/accurona) at \`${commit}\`${dirty ? ' (with uncommitted changes)' : ''}.\nDo not edit these files: change packages/${name} in that repo and re-run\n\`node scripts/sync-accurona.mjs\`.\n`
  );
}
console.log(
  `Synced ${packages.map((p) => `@accurona/${p.name}`).join(', ')} @ ${commit}${dirty ? '+dirty' : ''} → src/vendor/`
);
