import { findPath } from '../pathfinder';

describe('FEA7-02 pathfinder obstacles', () => {
  test('empty obstacles list returns a straight diagonal (back-compat)', () => {
    const path = findPath({
      gridSize: { width: 5, height: 5 },
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 }
    });
    // A* with diagonal-always moves one step per tile, so a path
    // from (0,0) to (4,4) on an empty grid is exactly 5 tiles long
    // (including endpoints) and ends at (4,4).
    expect(path.length).toBe(5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
  });

  test('routes around a single blocking tile', () => {
    const path = findPath({
      gridSize: { width: 5, height: 5 },
      from: { x: 0, y: 2 },
      to: { x: 4, y: 2 },
      obstacles: [{ x: 2, y: 2 }]
    });
    // The straight-line path would pass through (2,2). With it
    // blocked, the pathfinder must take an alternate route — so the
    // returned path must NOT include (2,2).
    const hitsBlocker = path.some((tile) => {
      return tile.x === 2 && tile.y === 2;
    });
    expect(hitsBlocker).toBe(false);
    // Sanity: still gets from start to end.
    expect(path[0]).toEqual({ x: 0, y: 2 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 2 });
  });

  test('endpoint tiles in the obstacles list are silently ignored', () => {
    // If a connector terminates ON a node, that node's tile is
    // "occupied" but the pathfinder must still permit entry/exit.
    const path = findPath({
      gridSize: { width: 5, height: 5 },
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 },
      obstacles: [
        { x: 0, y: 0 },
        { x: 4, y: 4 }
      ]
    });
    // A clear diagonal path of length 5 implies neither endpoint
    // was treated as blocked.
    expect(path.length).toBe(5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
  });

  test('obstacles outside the grid bounds are skipped without throwing', () => {
    expect(() => {
      return findPath({
        gridSize: { width: 3, height: 3 },
        from: { x: 0, y: 0 },
        to: { x: 2, y: 2 },
        obstacles: [
          { x: -1, y: 0 },
          { x: 0, y: 10 },
          { x: 5, y: 5 }
        ]
      });
    }).not.toThrow();
  });

  test('returns an empty path when no route is possible', () => {
    // Wall the destination off completely. Diagonal movement is
    // enabled, so the wall has to cover orthogonal AND diagonal
    // neighbours of the target.
    const path = findPath({
      gridSize: { width: 5, height: 5 },
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 },
      obstacles: [
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 3 }
      ]
    });
    expect(path).toEqual([]);
  });
});
