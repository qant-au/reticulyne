import PF from 'pathfinding';
import { Size, Coords } from 'src/types';

interface Args {
  gridSize: Size;
  from: Coords;
  to: Coords;
  // FEA7-02: tiles in search-area-local coords that the pathfinder
  // must route around. Endpoints (matching `from` or `to`) are
  // silently ignored so a connector that terminates ON an obstacle
  // (e.g. a node it points to) can still enter and exit it.
  obstacles?: Coords[];
}

export const findPath = ({
  gridSize,
  from,
  to,
  obstacles = []
}: Args): Coords[] => {
  const grid = new PF.Grid(gridSize.width, gridSize.height);

  for (const obstacle of obstacles) {
    if (obstacle.x === from.x && obstacle.y === from.y) continue;
    if (obstacle.x === to.x && obstacle.y === to.y) continue;
    if (obstacle.x < 0 || obstacle.x >= gridSize.width) continue;
    if (obstacle.y < 0 || obstacle.y >= gridSize.height) continue;
    grid.setWalkableAt(obstacle.x, obstacle.y, false);
  }

  const finder = new PF.AStarFinder({
    heuristic: PF.Heuristic.manhattan,
    diagonalMovement: PF.DiagonalMovement.Always
  });
  const path = finder.findPath(from.x, from.y, to.x, to.y, grid);

  const pathTiles = path.map((tile) => {
    return {
      x: tile[0],
      y: tile[1]
    };
  });

  return pathTiles;
};
