// Tile-grid geometry: bounding boxes, sorting, hit-on-rect, named
// anchors. Pure functions over Coords / BoundingBox; no DOM, no store,
// no React.
//
// Extracted from src/utils/renderer.ts under QUA4-07.

import {
  Coords,
  Size,
  BoundingBox,
  TileOrigin,
  AnchorPosition
} from 'src/types';
import { CoordsUtils } from './CoordsUtils';

export const sortByPosition = (tiles: Coords[]) => {
  const xSorted = [...tiles];
  const ySorted = [...tiles];
  xSorted.sort((a, b) => {
    return a.x - b.x;
  });
  ySorted.sort((a, b) => {
    return a.y - b.y;
  });

  const highest = {
    byX: xSorted[xSorted.length - 1],
    byY: ySorted[ySorted.length - 1]
  };
  const lowest = { byX: xSorted[0], byY: ySorted[0] };

  const lowX = lowest.byX.x;
  const highX = highest.byX.x;
  const lowY = lowest.byY.y;
  const highY = highest.byY.y;

  return {
    byX: xSorted,
    byY: ySorted,
    highest,
    lowest,
    lowX,
    lowY,
    highX,
    highY
  };
};

// Returns a complete set of tiles that form a grid area (takes in any number of tiles to use points to encapsulate)
export const getGridSubset = (tiles: Coords[]) => {
  const { lowX, lowY, highX, highY } = sortByPosition(tiles);

  const subset = [];

  for (let x = lowX; x < highX + 1; x += 1) {
    for (let y = lowY; y < highY + 1; y += 1) {
      subset.push({ x, y });
    }
  }

  return subset;
};

export const isWithinBounds = (tile: Coords, bounds: Coords[]) => {
  const { lowX, lowY, highX, highY } = sortByPosition(bounds);

  return tile.x >= lowX && tile.x <= highX && tile.y >= lowY && tile.y <= highY;
};

// Returns the four corners of a grid that encapsulates all tiles
// passed in (at least 1 tile needed)
export const getBoundingBox = (
  tiles: Coords[],
  offset: Coords = CoordsUtils.zero()
): BoundingBox => {
  const { lowX, lowY, highX, highY } = sortByPosition(tiles);

  return [
    { x: lowX - offset.x, y: lowY - offset.y },
    { x: highX + offset.x, y: lowY - offset.y },
    { x: highX + offset.x, y: highY + offset.y },
    { x: lowX - offset.x, y: highY + offset.y }
  ];
};

export const getBoundingBoxSize = (boundingBox: Coords[]): Size => {
  const { lowX, lowY, highX, highY } = sortByPosition(boundingBox);

  return {
    width: highX - lowX + 1,
    height: highY - lowY + 1
  };
};

type GetRectangleFromSize = (
  from: Coords,
  size: Size
) => { from: Coords; to: Coords };

export const getRectangleFromSize: GetRectangleFromSize = (from, size) => {
  return {
    from,
    to: { x: from.x + size.width, y: from.y + size.height }
  };
};

export const outermostCornerPositions: TileOrigin[] = [
  'BOTTOM',
  'RIGHT',
  'TOP',
  'LEFT'
];

export const convertBoundsToNamedAnchors = (
  boundingBox: BoundingBox
): {
  [key in AnchorPosition]: Coords;
} => {
  return {
    BOTTOM_LEFT: boundingBox[0],
    BOTTOM_RIGHT: boundingBox[1],
    TOP_RIGHT: boundingBox[2],
    TOP_LEFT: boundingBox[3]
  };
};
