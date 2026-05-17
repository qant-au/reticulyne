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
import { getBoundingBox, isWithinBounds } from './geometry';
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
}

export const getItemAtTile = ({
  tile,
  scene
}: GetItemAtTile): ItemReference | null => {
  const viewItem = scene.items.find((item) => {
    return CoordsUtils.isEqual(item.tile, tile);
  });

  if (viewItem) {
    return {
      type: 'ITEM',
      id: viewItem.id
    };
  }

  const textBox = scene.textBoxes.find((tb) => {
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

  const rectangle = scene.rectangles.find(({ from, to }) => {
    return isWithinBounds(tile, [from, to]);
  });

  if (rectangle) {
    return {
      type: 'RECTANGLE',
      id: rectangle.id
    };
  }

  return null;
};
