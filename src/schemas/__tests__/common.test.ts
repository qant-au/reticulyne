import { coords, TILE_COORD_MAX } from '../common';

describe('coords schema (SEC5-01)', () => {
  test('accepts integer coords within ±TILE_COORD_MAX', () => {
    expect(coords.safeParse({ x: 0, y: 0 }).success).toBe(true);
    expect(
      coords.safeParse({ x: TILE_COORD_MAX, y: -TILE_COORD_MAX }).success
    ).toBe(true);
    expect(coords.safeParse({ x: -1, y: 42 }).success).toBe(true);
  });

  test('rejects coords beyond ±TILE_COORD_MAX (pathfinder DoS guard)', () => {
    // Before SEC5-01 the schema was unbounded z.number(). A crafted
    // connector with anchors at e.g. {x: 1e7, y: 1e7} forced the
    // pathfinder to allocate ~10^14 grid cells in the host page's
    // main thread (instant OOM). The bound caps the worst-case grid
    // at ~4M cells.
    expect(coords.safeParse({ x: TILE_COORD_MAX + 1, y: 0 }).success).toBe(
      false
    );
    expect(coords.safeParse({ x: 0, y: -(TILE_COORD_MAX + 1) }).success).toBe(
      false
    );
    expect(coords.safeParse({ x: 1e7, y: 1e7 }).success).toBe(false);
  });

  test('rejects non-integer coords (pathfinder grid uses integer indices)', () => {
    expect(coords.safeParse({ x: 0.5, y: 0 }).success).toBe(false);
    expect(coords.safeParse({ x: 0, y: 2.7 }).success).toBe(false);
  });

  test('rejects non-finite coords', () => {
    expect(
      coords.safeParse({ x: Number.POSITIVE_INFINITY, y: 0 }).success
    ).toBe(false);
    expect(coords.safeParse({ x: Number.NaN, y: 0 }).success).toBe(false);
  });
});
