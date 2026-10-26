// Builds one Reticulyne icon pack file from a folder of drawings.
//
//   node scripts/build-pack.mjs <folder> [--out <file>] [--check]
//
// The folder holds:
//   pack.json         { id, name, version?, sourceUrl, media?, order? }
//   <name>.iso.svg    an icon's isometric drawing (its `url`)
//   <name>.flat.svg   its flat drawing (`flatUrl`), optional
//   <name>.json       its detail, optional: { name?, collection?, family?,
//                     description?, ports?, props? }
//
// Every <name> becomes the icon `<pack id>-<name>`. Its name is the one in
// <name>.json, or <name> in Title Case. `order` in pack.json, when present,
// lists every <name> once, in the order the library shows them; otherwise
// they are sorted by name. The drawings go in inline, so the pack is one
// file that carries everything: details, ports, both drawings.
//
// The result is checked with the library's own validateIconPack, and every
// problem is printed; nothing is written unless it passes. --out defaults
// to <pack id>.reticulyne-pack.json in the current directory. --check
// builds in memory and fails if --out differs, so a committed pack can be
// kept in step with its drawings.
//
// Needs @reticulyne/editor (built, in this repo: `npm run build`).

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const usage = () => {
  console.error(
    'usage: node scripts/build-pack.mjs <folder> [--out <file>] [--check]'
  );
  process.exit(2);
};

const args = process.argv.slice(2);
const folder = args.find((a, i) => {
  return !a.startsWith('--') && args[i - 1] !== '--out';
});
if (!folder) usage();
const outAt = args.indexOf('--out');
const check = args.includes('--check');

const { validateIconPack } = await import('@reticulyne/editor/standalone');

const problems = [];
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    problems.push(`${basename(file)}: ${e.message}`);
    return undefined;
  }
};

const titleCase = (stem) => {
  return stem
    .split('-')
    .map((w) => {
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
};

const svgUrl = (file) => {
  return `data:image/svg+xml,${encodeURIComponent(readFileSync(file, 'utf8').trim())}`;
};

const packFile = join(folder, 'pack.json');
if (!existsSync(packFile)) {
  console.error(`${folder}: no pack.json`);
  process.exit(1);
}
const { order, ...head } = readJson(packFile) ?? {};

const files = readdirSync(folder);
const stems = new Set();
for (const file of files) {
  const m = file.match(/^(.+?)\.(iso\.svg|flat\.svg|json)$/);
  if (!m || file === 'pack.json') {
    if (file !== 'pack.json') problems.push(`${file}: not a pack file`);
    continue;
  }
  stems.add(m[1]);
}
for (const stem of stems) {
  if (!files.includes(`${stem}.iso.svg`)) {
    problems.push(`${stem}: has no ${stem}.iso.svg`);
  }
}

let names = [...stems].sort();
if (order !== undefined) {
  const listed = new Set(order);
  for (const stem of stems) {
    if (!listed.has(stem)) problems.push(`order: does not list ${stem}`);
  }
  for (const stem of order) {
    if (!stems.has(stem))
      problems.push(`order: lists ${stem}, which has no drawing`);
  }
  if (listed.size !== order.length) problems.push('order: lists a name twice');
  names = order;
}

const icons = names
  .filter((stem) => {
    return files.includes(`${stem}.iso.svg`);
  })
  .map((stem) => {
    const detailFile = join(folder, `${stem}.json`);
    const detail = existsSync(detailFile) ? (readJson(detailFile) ?? {}) : {};
    const flat = join(folder, `${stem}.flat.svg`);
    return {
      id: `${head.id}-${stem}`,
      name: detail.name ?? titleCase(stem),
      url: svgUrl(join(folder, `${stem}.iso.svg`)),
      isIsometric: true,
      ...(existsSync(flat) ? { flatUrl: svgUrl(flat) } : {}),
      ...Object.fromEntries(
        Object.entries(detail).filter(([key]) => {
          return key !== 'name';
        })
      )
    };
  });

const pack = { ...head, icons };
if (!problems.length) {
  const result = validateIconPack(pack);
  if (!result.ok) problems.push(...result.errors);
}
if (problems.length) {
  console.error(`${folder}: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const out = outAt !== -1 ? args[outAt + 1] : `${head.id}.reticulyne-pack.json`;
const text = JSON.stringify(pack, null, 2) + '\n';
if (check) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== text) {
    console.error(`${out} is not what ${folder} builds; run without --check`);
    process.exit(1);
  }
  console.log(`${out} is up to date (${icons.length} icons)`);
} else {
  writeFileSync(out, text);
  console.log(
    `${out}: ${icons.length} icons, ${(text.length / 1024).toFixed(0)} KB`
  );
}
