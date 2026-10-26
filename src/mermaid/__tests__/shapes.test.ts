import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DRAWINGS } from 'src/icons/drawings';
import {
  BRACKET_SHAPES,
  SHAPES,
  shapeByName,
  shapeForDrawing,
  writableShape
} from '../shapes';

// Mermaid's own shape list, read out of an installed package: the
// `shapesDefs` array in its core bundle, each entry a shortName plus its
// aliases and internalAliases.
const mermaidShapes = (pkg: string) => {
  const dir = join(
    __dirname,
    '../../../node_modules',
    pkg,
    'dist/chunks/mermaid.core'
  );
  const file = readdirSync(dir)
    .map((f) => {
      return readFileSync(join(dir, f), 'utf8');
    })
    .find((text) => {
      return text.includes('var shapesDefs');
    });
  if (!file) throw new Error(`no shapesDefs in ${pkg}`);
  const defs = file.slice(file.indexOf('var shapesDefs'));
  const body = defs.slice(0, defs.indexOf('];'));
  const shapes = new Map<string, string[]>();
  for (const entry of body.split('semanticName').slice(1)) {
    const short = /shortName: "([^"]+)"/.exec(entry)![1];
    const lists = [...entry.matchAll(/(?:a|internalA)liases: \[([^\]]*)\]/g)];
    const names = lists.flatMap((m) => {
      return [...m[1].matchAll(/"([^"]+)"/g)].map((n) => {
        return n[1];
      });
    });
    shapes.set(short, names);
  }
  return shapes;
};

describe('the Mermaid shape table', () => {
  it.each(['mermaid', 'mermaid11'])(
    'has a row for every shape %s knows, under every name',
    (pkg) => {
      const known = mermaidShapes(pkg);
      expect(known.size).toBeGreaterThanOrEqual(50);
      for (const [short, names] of known) {
        expect(shapeByName(short)?.shape).toBe(short);
        for (const name of names) {
          expect([name, shapeByName(name)?.shape]).toEqual([name, short]);
        }
      }
    }
  );

  it('has no shape that Mermaid does not know', () => {
    const known = mermaidShapes('mermaid');
    for (const s of SHAPES) expect(known.has(s.shape)).toBe(true);
  });

  it('gives each name to one shape only', () => {
    const seen = new Map<string, string>();
    for (const s of SHAPES) {
      for (const name of [s.shape, ...s.aliases]) {
        const key = name.toLowerCase();
        expect([key, seen.get(key) ?? s.shape]).toEqual([key, s.shape]);
        seen.set(key, s.shape);
      }
    }
  });

  it('draws every shape with a drawing that exists', () => {
    for (const s of SHAPES) {
      expect([s.shape, s.drawing in DRAWINGS]).toEqual([s.shape, true]);
      for (const d of s.alsoFrom ?? []) {
        expect([s.shape, d in DRAWINGS]).toEqual([s.shape, true]);
      }
    }
  });

  it('exports every exact drawing back to its own shape', () => {
    for (const s of SHAPES) {
      if (!s.approximate) {
        expect(shapeForDrawing(s.drawing)?.shape).toBe(s.shape);
      }
    }
    expect(shapeForDrawing('database-service')?.shape).toBe('cyl');
    expect(shapeForDrawing('router')).toBeUndefined();
  });

  it('gives every shape without brackets a classic stand-in that has them', () => {
    for (const s of SHAPES) {
      const written = writableShape(s, 'classic');
      expect([s.shape, written.brackets !== undefined]).toEqual([
        s.shape,
        true
      ]);
      expect(writableShape(s, 'extended')).toBe(s);
    }
  });

  it('orders bracket forms longest opener first', () => {
    const lengths = BRACKET_SHAPES.map((s) => {
      return s.brackets![0].length;
    });
    expect(
      [...lengths].sort((a, b) => {
        return b - a;
      })
    ).toEqual(lengths);
    expect(BRACKET_SHAPES).toHaveLength(14);
  });
});
