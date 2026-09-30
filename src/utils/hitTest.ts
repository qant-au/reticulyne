// Hit-testing helpers: `getItemAtTile` is the primary one — given a
// world tile, return the item that occupies it (ViewItem, TextBox,
// Connector path tile, or Rectangle), or null. `hasMovedTile` is the
// small mouse-delta check used by interaction modes.
//
// Extracted from src/utils/renderer.ts under QUA4-07. The `scene`
// parameter type is now a type-only import from src/hooks/useScene so
// hitTest.ts has no runtime dependency on the hook (previously the
// value import inverted the utils → hooks layer boundary).

import { Coords, ItemReference, Mouse } from 'src/types';
import { CoordsUtils } from './CoordsUtils';
import { getBoundingBox, isWithinBounds, doBoundsIntersect } from './geometry';
import { connectorPathTileToGlobal } from './connector';
import { getTextBoxEndTile } from './textBox';
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

/**
 * 1.4: marquee hit-test. Returns every item whose own footprint intersects
 * the tile-space box described by `from`/`to`, in a stable order (items,
 * text boxes, connectors, rectangles) so a marquee sweep produces the same
 * selection regardless of which corner the user dragged from.
 *
 * Deliberately *intersection*, not containment: Excalidraw's marquee selects
 * anything the band touches, and requiring full containment makes large
 * rectangles nearly unselectable.
 *
 * CONNECTOR_ANCHOR is never returned — anchors are sub-parts of a connector
 * and are only ever selected by dragging one directly. Nor is anything
 * locked (lw-069).
 */
export const getItemsInBounds = ({
  from,
  to,
  scene
}: GetItemsInBounds): ItemReference[] => {
  const bounds = getBoundingBox([from, to]);
  const found: ItemReference[] = [];

  scene.items.forEach((item) => {
    if (!item.locked && isWithinBounds(item.tile, bounds)) {
      found.push({ type: 'ITEM', id: item.id });
    }
  });

  scene.textBoxes.forEach((tb) => {
    if (tb.locked) return;
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

    if (doBoundsIntersect(bounds, textBoxBounds)) {
      found.push({ type: 'TEXTBOX', id: tb.id });
    }
  });

  scene.connectors.forEach((con) => {
    if (con.locked) return;
    const touches = con.path.tiles.some((pathTile) => {
      return isWithinBounds(
        connectorPathTileToGlobal(pathTile, con.path.rectangle.from),
        bounds
      );
    });

    if (touches) {
      found.push({ type: 'CONNECTOR', id: con.id });
    }
  });

  scene.rectangles.forEach(({ id, from: rFrom, to: rTo, locked }) => {
    if (!locked && doBoundsIntersect(bounds, getBoundingBox([rFrom, rTo]))) {
      found.push({ type: 'RECTANGLE', id });
    }
  });

  return found;
};
