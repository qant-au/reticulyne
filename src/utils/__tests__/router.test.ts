import { Grid, findPath as legacyFindPath } from 'src/vendor/pathfinder/astar';
import { Coords } from 'src/types';
import { findPath } from '../pathfinder';
import { directionOf, measureRoute } from '../router';

// Small deterministic PRNG so the property sweep is reproducible.
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const legacy = (
  width: number,
  height: number,
  from: Coords,
  to: Coords,
  obstacles: Coords[]
) => {
  const grid = new Grid(width, height);
  for (const o of obstacles) grid.setWalkableAt(o.x, o.y, false);
  return legacyFindPath(from.x, from.y, to.x, to.y, grid).map(([x, y]) => {
    return { x, y };
  });
};

const isConnected = (path: Coords[]) => {
  return path.every((tile, i) => {
    if (i === 0) return true;
    const prev = path[i - 1];
    return Math.abs(tile.x - prev.x) <= 1 && Math.abs(tile.y - prev.y) <= 1;
  });
};

describe('ROADMAP 3.3 connector routing', () => {
  test('an open route turns once at most', () => {
    const path = findPath({
      gridSize: { width: 8, height: 5 },
      from: { x: 0, y: 0 },
      to: { x: 7, y: 3 }
    });
    const { turns, length } = measureRoute(path);
    expect(turns).toBe(1);
    // Still the shortest route: 3 diagonal steps and 4 straight ones.
    expect(length).toBeCloseTo(3 * Math.SQRT2 + 4);
  });

  test('never scores worse than the A* it replaced, on 1,000 random grids', () => {
    const rand = mulberry32(3_3);
    let newTurns = 0;
    let oldTurns = 0;
    for (let run = 0; run < 1000; run += 1) {
      const width = 4 + Math.floor(rand() * 14);
      const height = 4 + Math.floor(rand() * 14);
      const tile = () => {
        return {
          x: Math.floor(rand() * width),
          y: Math.floor(rand() * height)
        };
      };
      const from = tile();
      const to = tile();
      const obstacles = Array.from(
        { length: Math.floor(rand() * width * height * 0.3) },
        tile
      ).filter((o) => {
        return !(
          (o.x === from.x && o.y === from.y) ||
          (o.x === to.x && o.y === to.y)
        );
      });

      const before = legacy(width, height, from, to, obstacles);
      const after = findPath({
        gridSize: { width, height },
        from,
        to,
        obstacles
      });

      expect(after[0]).toEqual(from);
      expect(after[after.length - 1]).toEqual(to);
      expect(isConnected(after)).toBe(true);
      if (before.length === 0) continue;
      // Reachable before, so it must avoid every obstacle now too.
      expect(
        after.some((t) => {
          return obstacles.some((o) => {
            return o.x === t.x && o.y === t.y;
          });
        })
      ).toBe(false);
      const a = measureRoute(after);
      const b = measureRoute(before);
      expect(a.length).toBeLessThanOrEqual(b.length + 1e-9);
      expect(a.turns).toBeLessThanOrEqual(b.turns);
      newTurns += a.turns;
      oldTurns += b.turns;
    }
    expect(newTurns).toBeLessThan(oldTurns);
  });

  test('connectors whose ends are offset alike run in parallel', () => {
    const gridSize = { width: 12, height: 8 };
    const first = findPath({
      gridSize,
      from: { x: 0, y: 0 },
      to: { x: 9, y: 4 }
    });
    const second = findPath({
      gridSize,
      from: { x: 0, y: 2 },
      to: { x: 9, y: 6 }
    });
    expect(second).toEqual(
      first.map(({ x, y }) => {
        return { x, y: y + 2 };
      })
    );
  });

  test('leaves in the direction it starts in', () => {
    const path = findPath({
      gridSize: { width: 8, height: 8 },
      from: { x: 0, y: 3 },
      to: { x: 5, y: 7 },
      startDir: directionOf(1, 0)
    });
    expect(path[1]).toEqual({ x: 1, y: 3 });
    expect(measureRoute(path, directionOf(1, 0)).turns).toBe(1);
  });

  test('arrives in the direction it must end in', () => {
    const path = findPath({
      gridSize: { width: 8, height: 8 },
      from: { x: 0, y: 0 },
      to: { x: 5, y: 6 },
      endDir: directionOf(0, 1)
    });
    expect(path[path.length - 2]).toEqual({ x: 5, y: 5 });
  });
});
