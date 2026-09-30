// Asserts the published tarball holds only what it should. Run by ci.yml
// and release.yml after `npm run build`; reads `npm pack --dry-run`.
//
// Two checks:
//  1. Top level: only dist/, README.md, LICENSE, package.json. A drifted
//     `files` field or tsconfig.build.json exclude would otherwise ship
//     test fixtures, vendor code or example components.
//  2. Inside dist/: only bundles, their source maps, type declarations and
//     webpack's extracted licence banners (SEC-05). Source maps ship on
//     purpose: the repo is public MIT, so they disclose nothing, and they
//     make consumer stack traces readable. Anything else in dist/ fails.
import { execSync } from 'node:child_process';

const report = JSON.parse(
  execSync('npm pack --dry-run --json', { encoding: 'utf8' })
);
const files = (report[0]?.files ?? []).map((f) => f.path);

const allowedTop = new Set(['dist', 'README.md', 'LICENSE', 'package.json']);
const allowedInDist = [
  /\.m?js$/,
  /\.m?js\.map$/,
  /\.d\.ts$/,
  /\.m?js\.LICENSE\.txt$/
];

const offenders = files.filter((p) => {
  if (!allowedTop.has(p.split('/')[0])) return true;
  if (!p.startsWith('dist/')) return false;
  return !allowedInDist.some((re) => re.test(p));
});

if (offenders.length) {
  console.error('Unexpected files in published tarball:');
  offenders.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(
  `pack contents OK: ${files.length} files, all under allowed roots and types`
);
