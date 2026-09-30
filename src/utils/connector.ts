// Connector-specific helpers: anchor resolution, pathfinding,
// coordinate-system conversion between search-area-local and world
// tiles, and the direction-arrow helper used by the renderer.
//
// Extracted from src/utils/renderer.ts under QUA4-07. The coordinate
// system was straightened out in BUG4-01 — normalisePositionFromOrigin
// is now `position - origin` and connectorPathTileToGlobal is
// `origin + tile` (its inverse).

import {
  AnchorSide,
  Coords,
  Connector,
  ConnectorAnchor,
  ConnectorDirection,
  Rect,
  View
} from 'src/types';
import { CONNECTOR_SEARCH_OFFSET, UNPROJECTED_TILE_SIZE } from 'src/config';
import { CoordsUtils } from './CoordsUtils';
import { findPath } from './pathfinder';
import { directionOf } from './router';
import { getItemByIdOrThrow } from './common';
import {
  getBoundingBox,
  getBoundingBoxSize,
  isWithinBounds,
  sortByPosition
} from './geometry';

export const getAllAnchors = (connectors: Connector[]) => {
  return connectors.reduce((acc, connector) => {
    return [...acc, ...connector.anchors];
  }, [] as ConnectorAnchor[]);
};

export const getAnchorTile = (anchor: ConnectorAnchor, view: View): Coords => {
  if (anchor.ref.item) {
    const viewItem = getItemByIdOrThrow(view.items, anchor.ref.item).value;
    return viewItem.tile;
  }

  if (anchor.ref.anchor) {
    const allAnchors = getAllAnchors(view.connectors ?? []);
    const nextAnchor = getItemByIdOrThrow(allAnchors, anchor.ref.anchor).value;

    return getAnchorTile(nextAnchor, view);
  }

  if (anchor.ref.tile) {
    return anchor.ref.tile;
  }

  throw new Error('Could not get anchor tile.');
};

// lw-061: the neighbouring tile each side of a node faces.
export const ANCHOR_SIDE_OFFSETS: Record<AnchorSide, Coords> = {
  '+X': { x: 1, y: 0 },
  '-X': { x: -1, y: 0 },
  '+Y': { x: 0, y: 1 },
  '-Y': { x: 0, y: -1 }
};

// The tile an end with a side steps onto first, or null. A side only
// means something on an end that references a node.
const sideStep = (anchor: ConnectorAnchor, tile: Coords): Coords | null => {
  if (!anchor.ref.item || !anchor.ref.side) return null;
  return CoordsUtils.add(tile, ANCHOR_SIDE_OFFSETS[anchor.ref.side]);
};

// An end on a node, on the given side of it when one was aimed at.
export const endRef = (item: string, side?: AnchorSide) => {
  return side ? { item, side } : { item };
};

interface NormalisePositionFromOrigin {
  position: Coords;
  origin: Coords;
}

export const normalisePositionFromOrigin = ({
  position,
  origin
}: NormalisePositionFromOrigin) => {
  // Subtract the origin from the position — the conventional way to
  // express a position in a local coordinate system. Used by
  // getConnectorPath() to express anchor world-coords in search-area-
  // local coords before handing them to the pathfinder.
  return CoordsUtils.subtract(position, origin);
};

interface GetConnectorPath {
  anchors: ConnectorAnchor[];
  view: View;
}

// FEA7-02: collect all tile coords inside `searchRect` (search-area-
// local coords, low-to-high rectangle) that are occupied by view
// items, rectangles, or text boxes. Items referenced by any of
// `anchorItemIds` are skipped so a connector terminating ON a node
// can enter/exit it. Other connectors are not treated as obstacles
// — diagram tools typically allow connectors to cross.
const collectObstacleTiles = (
  view: View,
  rectangleFrom: Coords,
  searchAreaSize: { width: number; height: number },
  anchorItemIds: Set<string>,
  anchorTiles: Coords[]
): Coords[] => {
  const obstacles: Coords[] = [];
  const localMaxX = searchAreaSize.width - 1;
  const localMaxY = searchAreaSize.height - 1;

  const pushIfInside = (worldTile: Coords) => {
    const local = CoordsUtils.subtract(worldTile, rectangleFrom);
    if (local.x < 0 || local.y < 0) return;
    if (local.x > localMaxX || local.y > localMaxY) return;
    obstacles.push(local);
  };

  for (const item of view.items ?? []) {
    if (anchorItemIds.has(item.id)) continue;
    pushIfInside(item.tile);
  }

  for (const rect of view.rectangles ?? []) {
    const bounds = [rect.from, rect.to];
    // A zone the connector starts or ends in is where it lives, not
    // something to route around: blocking it walls the endpoint in, and
    // every connector to a node inside a zone drew nothing.
    if (
      anchorTiles.some((tile) => {
        return isWithinBounds(tile, bounds);
      })
    ) {
      continue;
    }
    const sorted = sortByPosition(bounds);
    for (let x = sorted.lowX; x <= sorted.highX; x += 1) {
      for (let y = sorted.lowY; y <= sorted.highY; y += 1) {
        if (!isWithinBounds({ x, y }, bounds)) continue;
        pushIfInside({ x, y });
      }
    }
  }

  for (const textBox of view.textBoxes ?? []) {
    // Text boxes only persist their anchor tile in the schema; the
    // rendered width comes from the content at runtime. Treating the
    // anchor tile alone as occupied is approximate but matches the
    // schema's view of the world and is enough to stop trivial
    // collisions in tests.
    pushIfInside(textBox.tile);
  }

  return obstacles;
};

export const getConnectorPath = ({
  anchors,
  view
}: GetConnectorPath): {
  tiles: Coords[];
  rectangle: Rect;
} => {
  if (anchors.length < 2)
    throw new Error(
      `Connector needs at least two anchors (receieved: ${anchors.length})`
    );

  const anchorPosition = anchors.map((anchor) => {
    return getAnchorTile(anchor, view);
  });

  const searchArea = getBoundingBox(anchorPosition, CONNECTOR_SEARCH_OFFSET);

  const sorted = sortByPosition(searchArea);
  const searchAreaSize = getBoundingBoxSize(searchArea);
  // Conventional low-to-high rectangle: `from` is the minimum corner of
  // the search-area bounding box (= the bottom-left tile in iso-tile
  // coordinates, including the CONNECTOR_SEARCH_OFFSET expansion) and
  // `to` is the maximum corner. Previous releases stored these
  // high-to-low, which forced normalisePositionFromOrigin /
  // connectorPathTileToGlobal / the SVG renderer to all use mirrored
  // arithmetic; Connector.tsx then carried a `transform: 'scale(-1, 1)'`
  // hack to flip the rendered path back to world orientation. The
  // hack is gone now — see BUG4-01.
  const rectangle = {
    from: { x: sorted.lowX, y: sorted.lowY },
    to: { x: sorted.highX, y: sorted.highY }
  };

  const positionsNormalisedFromSearchArea = anchorPosition.map((position) => {
    return normalisePositionFromOrigin({
      position,
      origin: rectangle.from
    });
  });

  // FEA7-02: items that this connector's anchors reference are
  // intentionally NOT treated as obstacles — they're the endpoints
  // the connector is meant to dock onto. Anchors of other kinds
  // (tile-bound, anchor-to-anchor) contribute nothing to skip.
  const anchorItemIds = new Set<string>();
  for (const anchor of anchors) {
    if (anchor.ref.item) anchorItemIds.add(anchor.ref.item);
  }
  const obstacles = collectObstacleTiles(
    view,
    rectangle.from,
    searchAreaSize,
    anchorItemIds,
    anchorPosition
  );

  const tiles = positionsNormalisedFromSearchArea.reduce<Coords[]>(
    (acc, position, i) => {
      if (i === 0) return acc;

      const prev = positionsNormalisedFromSearchArea[i - 1];
      // lw-061: an end with a side leaves (or arrives) through that edge
      // of its node, so the route starts from the tile beyond it and the
      // node's own tile is routed around. A step onto the other end is
      // no step: two ends facing each other are already adjacent.
      const exit = sideStep(anchors[i - 1], prev);
      const entry = sideStep(anchors[i], position);
      const useExit = exit !== null && !CoordsUtils.isEqual(exit, position);
      const useEntry = entry !== null && !CoordsUtils.isEqual(entry, prev);
      // ROADMAP 3.3: a route carries on in the direction it is already
      // going - out of the node edge it leaves by, or through a manual
      // waypoint - and arrives square to the edge it enters by.
      const last = acc.length >= 2 ? acc.length - 1 : -1;
      const startDir = useExit
        ? directionOf(exit.x - prev.x, exit.y - prev.y)
        : last >= 0
          ? directionOf(
              acc[last].x - acc[last - 1].x,
              acc[last].y - acc[last - 1].y
            )
          : undefined;
      const endDir = useEntry
        ? directionOf(position.x - entry.x, position.y - entry.y)
        : undefined;
      const path = findPath({
        from: useExit ? exit : prev,
        to: useEntry ? entry : position,
        startDir,
        endDir,
        gridSize: searchAreaSize,
        obstacles: [
          ...obstacles,
          ...(useExit ? [prev] : []),
          ...(useEntry ? [position] : [])
        ]
      });

      const segment = [
        ...(useExit ? [prev] : []),
        ...path,
        ...(useEntry ? [position] : [])
      ];
      // Each leg starts where the one before ended (the waypoint between
      // them): keep that point once, not as a zero-length segment.
      if (
        acc.length > 0 &&
        segment.length > 0 &&
        CoordsUtils.isEqual(acc[acc.length - 1], segment[0])
      ) {
        segment.shift();
      }
      return [...acc, ...segment];
    },
    []
  );

  return { tiles, rectangle };
};

export const connectorPathTileToGlobal = (
  tile: Coords,
  origin: Coords
): Coords => {
  // Inverse of normalisePositionFromOrigin: given a tile in the
  // search-area-local coordinate system, add the origin (= the
  // rectangle's `from` corner, which already accounts for the
  // CONNECTOR_SEARCH_OFFSET) to recover the world coord.
  return CoordsUtils.add(origin, tile);
};

// Y-flip helpers (BUG6-01). `getConnectorPath` returns path tiles
// normalised as world-deltas from rectangle.from (+Y = world-up), but
// the SVG container that renders them has the iso projection matrix
// applied — and under that matrix SVG-local +Y maps to screen-down-
// right, i.e. world-DOWN. So the path's Y direction is the OPPOSITE
// of SVG-local Y. Without flipping, a connector between two anchors
// that differ in both X and Y is rendered along the wrong diagonal of
// its bounding box (source ends up at (sourceX, destY); dest at
// (destX, sourceY)). BUG4-01 fixed the equivalent X mirror; this is
// the Y companion.
//
// These helpers convert from the path's logical coordinate system to
// the renderer's SVG-local coordinate system. Use them in the
// connector renderer; do NOT use them outside the SVG container —
// hitTest.ts, Cursor.ts, ConnectorLabel.tsx all compose with
// connectorPathTileToGlobal() to recover real world coords and must
// stay in the logical (un-flipped) space.

// Render-side Y for a connector PATH tile. `gridHeight` is the
// inclusive tile span of the connector's bounding box rectangle
// (rectangle.to.y - rectangle.from.y + 1).
export const flipConnectorTileY = (pathTileY: number, gridHeight: number) => {
  return gridHeight - 1 - pathTileY;
};

// Render-side Y for a connector ANCHOR positioned at world coord
// `worldY` inside a connector whose path rectangle spans from
// `rectangle.from.y` to `rectangle.to.y`. Algebraically equivalent
// to flipConnectorTileY(worldY - rectangle.from.y, gridHeight).
export const anchorWorldYToRenderY = (worldY: number, rectangleToY: number) => {
  return rectangleToY - worldY;
};

export const getAnchorAtTile = (tile: Coords, anchors: ConnectorAnchor[]) => {
  return anchors.find((anchor) => {
    return Boolean(
      anchor.ref.tile && CoordsUtils.isEqual(anchor.ref.tile, tile)
    );
  });
};

export const getAnchorParent = (anchorId: string, connectors: Connector[]) => {
  const connector = connectors.find((con) => {
    return con.anchors.find((anchor) => {
      return anchor.id === anchorId;
    });
  });

  if (!connector) {
    throw new Error(`Could not find connector with anchor id ${anchorId}`);
  }

  return connector;
};

export const getConnectorsByViewItem = (
  viewItemId: string,
  connectors: Connector[]
) => {
  return connectors.filter((connector) => {
    return connector.anchors.find((anchor) => {
      return anchor.ref.item === viewItemId;
    });
  });
};

// Compute the SVG-pixel position and rotation for a direction-arrow
// rendered AT `iconTile`, pointing at `lastTile`. Pure function — no
// knowledge of which end of the connector this is. Used twice by
// getConnectorDirectionIcon below (once for the end-of-path arrow,
// once for the start-of-path arrow when BOTH or END_TO_START is set).
const computeArrowFromTwoTiles = (
  iconTile: Coords,
  lastTile: Coords
): { x: number; y: number; rotation: number } => {
  let rotation = 0;

  if (lastTile.x > iconTile.x) {
    if (lastTile.y > iconTile.y) {
      rotation = 135;
    } else if (lastTile.y < iconTile.y) {
      rotation = 45;
    } else {
      rotation = 90;
    }
  }

  if (lastTile.x < iconTile.x) {
    if (lastTile.y > iconTile.y) {
      rotation = -135;
    } else if (lastTile.y < iconTile.y) {
      rotation = -45;
    } else {
      rotation = -90;
    }
  }

  if (lastTile.x === iconTile.x) {
    if (lastTile.y > iconTile.y) {
      rotation = 180;
    } else if (lastTile.y < iconTile.y) {
      rotation = 0;
    } else {
      rotation = -90;
    }
  }

  return {
    x: iconTile.x * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
    y: iconTile.y * UNPROJECTED_TILE_SIZE + UNPROJECTED_TILE_SIZE / 2,
    rotation
  };
};

// Returns the set of direction-arrow icons to render on a connector,
// derived from the connector's `direction` field (FEA4-02).
//
//   * 'START_TO_END' — one arrow at tiles[N-2] pointing at tiles[N-1]
//                       (the historic behaviour).
//   * 'END_TO_START' — one arrow at tiles[1] pointing at tiles[0].
//   * 'BOTH'         — both of the above.
//   * 'NONE'         — empty array.
//
// Returns an empty array when there aren't enough path tiles to derive
// any arrow (< 2 tiles). The renderer maps over the result, so an empty
// array is the natural "no arrows" representation.
export const getConnectorDirectionIcon = (
  connectorTiles: Coords[],
  direction: ConnectorDirection = 'START_TO_END'
): Array<{ x: number; y: number; rotation: number }> => {
  if (direction === 'NONE') return [];
  if (connectorTiles.length < 2) return [];

  const renderEndArrow = direction === 'START_TO_END' || direction === 'BOTH';
  const renderStartArrow = direction === 'END_TO_START' || direction === 'BOTH';

  const icons: Array<{ x: number; y: number; rotation: number }> = [];

  if (renderEndArrow) {
    icons.push(
      computeArrowFromTwoTiles(
        connectorTiles[connectorTiles.length - 2],
        connectorTiles[connectorTiles.length - 1]
      )
    );
  }

  if (renderStartArrow) {
    icons.push(computeArrowFromTwoTiles(connectorTiles[1], connectorTiles[0]));
  }

  return icons;
};
