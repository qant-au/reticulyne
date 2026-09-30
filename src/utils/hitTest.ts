// Hit-testing helpers: `getItemAtTile` is the primary one — given a
// world tile, return the item that occupies it (ViewItem, TextBox,
// Connector path tile, or Rectangle), or null. `hasMovedTile` is the
// small mouse-delta check used by interaction modes.
//
// Extracted from src/utils/renderer.ts under QUA4-07. The `scene`
// parameter type is now a type-only import from src/hooks/useScene so
// hitTest.ts has no runtime dependency on the hook (previously the
// value import inverted the utils → hooks layer boundary).

import { Coords, ItemReference, Mouse, Scroll, Size } from 'src/types';
import { CoordsUtils } from './CoordsUtils';
import { getBoundingBox, isWithinBounds, doBoundsIntersect } from './geometry';
import { connectorPathTileToGlobal } from './connector';
import { getTextBoxEndTile } from './textBox';
import { collapsedBoxes, collapsedGroupMembers } from './collapse';
import { getTilePosition } from './coordinates';
// Type-only import — useScene is a React hook in src/hooks, but we
// only need its return-type shape to describe the data we read off
// the scene. The import is erased at compile time, so there's no
// runtime dependency on the hooks layer from this utils module.
import type { useScene } from 'src/hooks/useScene';

export const hasMovedTile = (mouse: Mouse) => {
  if (!mouse.delta) return false;

  return !CoordsUtils.isEqual(mouse.delta.tile, CoordsUtils.zero());
};

interface GetItemAtTile {
  tile: Coords;
  scene: ReturnType<typeof useScene>;
  // lw-069: pass over locked things, as a click on the canvas does.
  skipLocked?: boolean;
}

export const getItemAtTile = ({
  tile,
  scene,
  skipLocked = false
}: GetItemAtTile): ItemReference | null => {
  const open = (entry: { locked?: boolean }) => {
    return !skipLocked || !entry.locked;
  };

  const viewItem = scene.items.find((item) => {
    return open(item) && CoordsUtils.isEqual(item.tile, tile);
  });

  if (viewItem) {
    return {
      type: 'ITEM',
      id: viewItem.id
    };
  }

  const textBox = scene.textBoxes.find((tb) => {
    if (!open(tb)) return false;
    const textBoxTo = getTextBoxEndTile(tb, tb.size);
    const textBoxBounds = getBoundingBox([
      tb.tile,
      {
        x: Math.ceil(textBoxTo.x),
        y:
          tb.orientation === 'X'
            ? Math.ceil(textBoxTo.y)
            : Math.floor(textBoxTo.y)
      }
    ]);

    return isWithinBounds(tile, textBoxBounds);
  });

  if (textBox) {
    return {
      type: 'TEXTBOX',
      id: textBox.id
    };
  }

  const connector = scene.connectors.find((con) => {
    if (!open(con)) return false;
    return con.path.tiles.find((pathTile) => {
      const globalPathTile = connectorPathTileToGlobal(
        pathTile,
        con.path.rectangle.from
      );

      return CoordsUtils.isEqual(globalPathTile, tile);
    });
  });

  if (connector) {
    return {
      type: 'CONNECTOR',
      id: connector.id
    };
  }

  const rectangle = scene.rectangles.find(({ from, to, locked }) => {
    return open({ locked }) && isWithinBounds(tile, [from, to]);
  });

  if (rectangle) {
    return {
      type: 'RECTANGLE',
      id: rectangle.id
    };
  }

  return null;
};

interface GetItemsInBounds {
  from: Coords;
  to: Coords;
  scene: ReturnType<typeof useScene>;
}

type Scene = ReturnType<typeof useScene>;

// What a marquee asks of each thing's footprint: does this one tile, or
// this tile-space box (inclusive corners), touch the band?
interface BandTest {
  tile: (tile: Coords) => boolean;
  box: (a: Coords, b: Coords) => boolean;
}

/**
 * Everything the band touches, in a stable order (items, text boxes,
 * connectors, rectangles, then collapsed groups' members) so a sweep
 * produces the same selection whichever corner it was dragged from.
 * Deliberately *intersection*, not containment: Excalidraw's marquee
 * selects anything the band touches, and requiring full containment makes
 * large rectangles nearly unselectable. CONNECTOR_ANCHOR is never
 * returned, and nothing locked is (lw-069).
 */
const itemsTouching = (scene: Scene, band: BandTest): ItemReference[] => {
  const found: ItemReference[] = [];

  scene.items.forEach((item) => {
    if (!item.locked && band.tile(item.tile)) {
      found.push({ type: 'ITEM', id: item.id });
    }
  });

  scene.textBoxes.forEach((tb) => {
    if (tb.locked) return;
    const textBoxTo = getTextBoxEndTile(tb, tb.size);
    const end = {
      x: Math.ceil(textBoxTo.x),
      y:
        tb.orientation === 'X'
          ? Math.ceil(textBoxTo.y)
          : Math.floor(textBoxTo.y)
    };

    if (band.box(tb.tile, end)) {
      found.push({ type: 'TEXTBOX', id: tb.id });
    }
  });

  scene.connectors.forEach((con) => {
    if (con.locked) return;
    const touches = con.path.tiles.some((pathTile) => {
      return band.tile(
        connectorPathTileToGlobal(pathTile, con.path.rectangle.from)
      );
    });

    if (touches) {
      found.push({ type: 'CONNECTOR', id: con.id });
    }
  });

  scene.rectangles.forEach(({ id, from: rFrom, to: rTo, locked }) => {
    if (!locked && band.box(rFrom, rTo)) {
      found.push({ type: 'RECTANGLE', id });
    }
  });

  // lw-062: a collapsed group's box catches the members it stands for.
  collapsedBoxes(scene.visibleView).forEach((box) => {
    if (!band.tile(box.tile)) return;
    found.push(...collapsedGroupMembers(scene.currentView, box.groupId));
  });

  return found;
};

/**
 * 1.4: marquee hit-test against a tile-space box described by
 * `from`/`to`. See itemsTouching for what is returned.
 */
export const getItemsInBounds = ({
  from,
  to,
  scene
}: GetItemsInBounds): ItemReference[] => {
  const bounds = getBoundingBox([from, to]);
  return itemsTouching(scene, {
    tile: (tile) => {
      return isWithinBounds(tile, bounds);
    },
    box: (a, b) => {
      return doBoundsIntersect(bounds, getBoundingBox([a, b]));
    }
  });
};

interface GetItemsInScreenRect {
  /** The band's two corners, in px relative to the canvas. */
  from: Coords;
  to: Coords;
  scene: Scene;
  zoom: number;
  scroll: Scroll;
  rendererSize: Size;
}

// Separating-axis test: does a convex polygon overlap an axis-aligned
// rectangle? Touching counts.
const polygonTouchesRect = (
  polygon: Coords[],
  rect: { lowX: number; lowY: number; highX: number; highY: number }
) => {
  const corners = [
    { x: rect.lowX, y: rect.lowY },
    { x: rect.highX, y: rect.lowY },
    { x: rect.highX, y: rect.highY },
    { x: rect.lowX, y: rect.highY }
  ];
  const axes: Coords[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    axes.push({ x: q.y - p.y, y: p.x - q.x });
  });
  return axes.every((axis) => {
    const project = (points: Coords[]) => {
      const dots = points.map((pt) => {
        return pt.x * axis.x + pt.y * axis.y;
      });
      return { min: Math.min(...dots), max: Math.max(...dots) };
    };
    const a = project(polygon);
    const b = project(corners);
    return a.min <= b.max && b.min <= a.max;
  });
};

/**
 * The marquee as the user sees it: a rectangle on the screen, catching
 * everything whose tiles it visibly touches. The band used to be the
 * tile-space box between the two corner tiles, which in the isometric
 * view is a thin diamond nowhere near the rectangle the pointer drew, so
 * a node visibly inside the drag was missed (sweep 2026-09-30).
 */
export const getItemsInScreenRect = ({
  from,
  to,
  scene,
  zoom,
  scroll,
  rendererSize
}: GetItemsInScreenRect): ItemReference[] => {
  const rect = {
    lowX: Math.min(from.x, to.x),
    lowY: Math.min(from.y, to.y),
    highX: Math.max(from.x, to.x),
    highY: Math.max(from.y, to.y)
  };
  // Tile space to canvas px: the inverse of screenToIso. Linear, so a
  // box of tiles lands on the screen as a parallelogram.
  const onScreen = (tile: Coords): Coords => {
    const p = getTilePosition({ tile, projection: scene.projection });
    return {
      x: rendererSize.width / 2 + scroll.position.x + p.x * zoom,
      y: rendererSize.height / 2 + scroll.position.y + p.y * zoom
    };
  };
  const box = (a: Coords, b: Coords) => {
    const lowX = Math.min(a.x, b.x) - 0.5;
    const highX = Math.max(a.x, b.x) + 0.5;
    const lowY = Math.min(a.y, b.y) - 0.5;
    const highY = Math.max(a.y, b.y) + 0.5;
    return polygonTouchesRect(
      [
        onScreen({ x: lowX, y: lowY }),
        onScreen({ x: highX, y: lowY }),
        onScreen({ x: highX, y: highY }),
        onScreen({ x: lowX, y: highY })
      ],
      rect
    );
  };
  return itemsTouching(scene, {
    tile: (tile) => {
      return box(tile, tile);
    },
    box
  });
};
