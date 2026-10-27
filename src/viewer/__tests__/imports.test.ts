import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// The viewer must load without React, MUI, the stores or the editor's
// heavier libraries. The ESLint rule on src/viewer only sees the viewer's
// own imports; this walks everything they import in turn, as the bundler
// would, after TypeScript has dropped the type-only ones.

const SRC = path.resolve(__dirname, '../..');
const ENTRY = path.join(SRC, 'viewer/index.ts');

const BANNED_PACKAGES = [
  /^react(-dom)?(\/|$)/,
  /^@mui\//,
  /^@emotion\//,
  /^zustand(\/|$)/,
  /^@tiptap\//,
  /^gsap(\/|$)/,
  /^chroma-js$/,
  /^immer$/,
  /^html-to-image$/,
  /^jspdf$/
];
const BANNED_DIRS = ['stores', 'hooks', 'components', 'interaction'].map(
  (dir) => {
    return path.join(SRC, dir) + path.sep;
  }
);

const resolveFile = (base: string): string | null => {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx')
  ];
  return (
    candidates.find((candidate) => {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    }) ?? null
  );
};

/** The modules a file loads at run time, as written. */
export const runtimeImports = (file: string): string[] => {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: file
  });
  const found: string[] = [];
  const pattern = /require\("([^"]+)"\)|import\("([^"]+)"\)/g;
  let match = pattern.exec(outputText);
  while (match) {
    found.push(match[1] ?? match[2]);
    match = pattern.exec(outputText);
  }
  return found;
};

/** Every file and package reachable from `entry`, with the chain to it. */
export const walk = (entry: string) => {
  const files = new Map<string, string[]>();
  const packages = new Map<string, string[]>();
  const queue: [string, string[]][] = [[entry, []]];
  while (queue.length) {
    const [file, chain] = queue.shift()!;
    if (files.has(file)) continue;
    files.set(file, chain);
    for (const request of runtimeImports(file)) {
      const here = [...chain, path.relative(SRC, file)];
      let target: string | null = null;
      if (request.startsWith('src/')) {
        target = resolveFile(path.join(SRC, request.slice(4)));
      } else if (request.startsWith('.')) {
        target = resolveFile(path.resolve(path.dirname(file), request));
      } else {
        if (!packages.has(request)) packages.set(request, here);
        continue;
      }
      if (target) queue.push([target, here]);
    }
  }
  return { files, packages };
};

describe('the viewer loads no React, MUI or stores', () => {
  const { files, packages } = walk(ENTRY);

  it('reaches only its own dependencies', () => {
    const banned = [...packages.entries()]
      .filter(([name]) => {
        return BANNED_PACKAGES.some((re) => {
          return re.test(name);
        });
      })
      .map(([name, chain]) => {
        return `${name} via ${chain.join(' > ')}`;
      });
    expect(banned).toEqual([]);
  });

  it('reaches no store, hook or component', () => {
    const banned = [...files.entries()]
      .filter(([file]) => {
        return BANNED_DIRS.some((dir) => {
          return file.startsWith(dir);
        });
      })
      .map(([file, chain]) => {
        return `${path.relative(SRC, file)} via ${chain.join(' > ')}`;
      });
    expect(banned).toEqual([]);
  });

  it('would catch a banned import', () => {
    const planted = path.join(SRC, 'viewer/__tests__/fixtures/planted.ts');
    const walked = walk(planted);
    expect([...walked.packages.keys()]).toContain('react');
    expect(
      [...walked.files.keys()].some((file) => {
        return file.includes(`${path.sep}stores${path.sep}`);
      })
    ).toBe(true);
  });
});
