import { Grid, findPath as astarFindPath } from 'src/vendor/pathfinder/astar';
import { Size, Coords } from 'src/types';
import { measureRoute, route } from './router';

// Small enough that no number of turns outweighs one diagonal's worth
// of extra length on a canvas-sized grid: the route is the shortest,
// and turns only break ties between shortest routes.
const SHORTEST_FIRST = 1e-4;

interface Args {
  gridSize: Size;
  from: Coords;
  to: Coords;
  // FEA7-02: tiles in search-area-local coords that the pathfinder
  // must route around. Endpoints (matching `from` or `to`) are
  // silently ignored so a connector that terminates ON an obstacle
  // (e.g. a node it points to) can still enter and exit it.
  obstacles?: Coords[];
  // Direction (index into the router's move table) the connector is
  // already travelling in at `from`, and must be travelling in at
  // `to`. A change of direction there counts as a turn.
  startDir?: number;
  endDir?: number;
}

const legacyPath = (
  gridSize: Size,
  from: Coords,
  to: Coords,
  blocked: Coords[]
): Coords[] => {
  const grid = new Grid(gridSize.width, gridSize.height);
  for (const tile of blocked) grid.setWalkableAt(tile.x, tile.y, false);
  return astarFindPath(from.x, from.y, to.x, to.y, grid).map(([x, y]) => {
    return { x, y };
  });
};

export const findPath = ({
  gridSize,
  from,
  to,
  obstacles = [],
  startDir,
  endDir
}: Args): Coords[] => {
  const blocked = obstacles.filter((obstacle) => {
    if (obstacle.x === from.x && obstacle.y === from.y) return false;
    if (obstacle.x === to.x && obstacle.y === to.y) return false;
    if (obstacle.x < 0 || obstacle.x >= gridSize.width) return false;
    if (obstacle.y < 0 || obstacle.y >= gridSize.height) return false;
    return true;
  });

  const walkable = new Uint8Array(gridSize.width * gridSize.height).fill(1);
  for (const tile of blocked) walkable[tile.y * gridSize.width + tile.x] = 0;

  const args = {
    width: gridSize.width,
    height: gridSize.height,
    from,
    to,
    walkable,
    startDir,
    endDir
  };

  // ROADMAP 3.3: never worse than the A* this replaced. Both see the
  // same grid, and a new route is kept only when it is no longer AND
  // turns no more often; otherwise the old route stands. The first
  // pass may buy fewer turns with a detour, so when it comes out
  // longer the second asks for the shortest route with fewest turns.
  const legacy = legacyPath(gridSize, from, to, blocked);
  const old = measureRoute(legacy, startDir, endDir);
  const noWorse = (candidate: Coords[]) => {
    if (candidate.length === 0) return false;
    if (legacy.length === 0) return true;
    const m = measureRoute(candidate, startDir, endDir);
    return m.length <= old.length + 1e-9 && m.turns <= old.turns;
  };

  let path = route(args);
  if (!noWorse(path)) path = route({ ...args, turnCost: SHORTEST_FIRST });
  if (!noWorse(path)) path = legacy;

  // Walled in: take the direct route over the obstacles rather than
  // returning nothing, which renders as a connector that has vanished.
  if (path.length === 0 && blocked.length > 0) {
    path = findPath({ gridSize, from, to, startDir, endDir });
  }

  return path;
};
