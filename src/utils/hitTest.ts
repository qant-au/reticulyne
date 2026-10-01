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
import { getBoundingBox, isWithinBounds } from './geometry';
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
  // Pass over locked things, as a click on the canvas does.
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

// What a marquee asks of each thing: is this tile-space box (inclusive
// corners, a single tile when both are the same) wholly inside the band,
// and is this point (a tile's centre) inside it?
interface BandTest {
  box: (a: Coords, b: Coords) => boolean;
  point: (tile: Coords) => boolean;
}

/**
 * Everything wholly inside the band, in a stable order (items, text boxes,
 * connectors, rectangles, then collapsed groups' members) so a sweep
 * produces the same selection whichever corner it was dragged from.
 * Containment, as Excalidraw's marquee (the parity target) does: a node
 * or text box or rectangle is caught when its whole footprint is inside,
 * and a connector only when its whole route is, so a band around one node
 * no longer takes the connector running off to another outside it (sweep
 * 2026-09-30). Shift+marquee adds to the selection (MarqueeMode's base).
 * CONNECTOR_ANCHOR is never returned, and nothing locked is.
 */
const itemsInside = (scene: Scene, band: BandTest): ItemReference[] => {
  const found: ItemReference[] = [];

  scene.items.forEach((item) => {
    if (!item.locked && band.box(item.tile, item.tile)) {
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
    if (con.locked || con.path.tiles.length === 0) return;
    // The route runs through its path tiles' centres, end to end.
    const inside = con.path.tiles.every((pathTile) => {
      return band.point(
        connectorPathTileToGlobal(pathTile, con.path.rectangle.from)
      );
    });

    if (inside) {
      found.push({ type: 'CONNECTOR', id: con.id });
    }
  });

  scene.rectangles.forEach(({ id, from: rFrom, to: rTo, locked }) => {
    if (!locked && band.box(rFrom, rTo)) {
      found.push({ type: 'RECTANGLE', id });
    }
  });

  // A collapsed group's box catches the members it stands for.
  collapsedBoxes(scene.visibleView).forEach((box) => {
    if (!band.box(box.tile, box.tile)) return;
    found.push(...collapsedGroupMembers(scene.currentView, box.groupId));
  });

  return found;
};

/**
 * 1.4: marquee hit-test against a tile-space box described by
 * `from`/`to`. See itemsInside for what is returned.
 */
export const getItemsInBounds = ({
  from,
  to,
  scene
}: GetItemsInBounds): ItemReference[] => {
  const bounds = getBoundingBox([from, to]);
  return itemsInside(scene, {
    box: (a, b) => {
      return isWithinBounds(a, bounds) && isWithinBounds(b, bounds);
    },
    point: (tile) => {
      return isWithinBounds(tile, bounds);
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

/**
 * The marquee as the user sees it: a rectangle on the screen, catching
 * everything wholly inside it (see itemsInside). The band used to be the
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
  // box of tiles lands on the screen as a parallelogram, which is inside
  // the rectangle exactly when its four corners are.
  const onScreen = (tile: Coords): Coords => {
    const p = getTilePosition({ tile, projection: scene.projection });
    return {
      x: rendererSize.width / 2 + scroll.position.x + p.x * zoom,
      y: rendererSize.height / 2 + scroll.position.y + p.y * zoom
    };
  };
  const inRect = (pt: Coords) => {
    return (
      pt.x >= rect.lowX &&
      pt.x <= rect.highX &&
      pt.y >= rect.lowY &&
      pt.y <= rect.highY
    );
  };
  return itemsInside(scene, {
    box: (a, b) => {
      const lowX = Math.min(a.x, b.x) - 0.5;
      const highX = Math.max(a.x, b.x) + 0.5;
      const lowY = Math.min(a.y, b.y) - 0.5;
      const highY = Math.max(a.y, b.y) + 0.5;
      return [
        { x: lowX, y: lowY },
        { x: highX, y: lowY },
        { x: highX, y: highY },
        { x: lowX, y: highY }
      ].every((corner) => {
        return inRect(onScreen(corner));
      });
    },
    point: (tile) => {
      return inRect(onScreen(tile));
    }
  });
};
