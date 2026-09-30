import { produce } from 'immer';
import { ModeActions, Coords, ItemReference } from 'src/types';
import { useScene } from 'src/hooks/useScene';
import {
  getItemByIdOrThrow,
  CoordsUtils,
  hasMovedTile,
  getAnchorParent,
  getItemAtTile,
  wouldStackNodes
} from 'src/utils';

const dragItems = (
  items: ItemReference[],
  tile: Coords,
  delta: Coords,
  scene: ReturnType<typeof useScene>
) => {
  items.forEach((item) => {
    if (item.type === 'ITEM') {
      // The whole view too, not only scene.items: a collapsed group's
      // members are left out of the visible items, and dragging the
      // group's box drags them (lw-062). Looked up in scene.items alone,
      // every move threw "Item with id not found" and the members stayed.
      const node = getItemByIdOrThrow(
        [...scene.items, ...(scene.currentView.items ?? [])],
        item.id
      ).value;

      scene.updateViewItem(item.id, {
        tile: CoordsUtils.add(node.tile, delta)
      });
    } else if (item.type === 'RECTANGLE') {
      const rectangle = getItemByIdOrThrow(scene.rectangles, item.id).value;
      const newFrom = CoordsUtils.add(rectangle.from, delta);
      const newTo = CoordsUtils.add(rectangle.to, delta);

      scene.updateRectangle(item.id, { from: newFrom, to: newTo });
    } else if (item.type === 'TEXTBOX') {
      const textBox = getItemByIdOrThrow(scene.textBoxes, item.id).value;

      scene.updateTextBox(item.id, {
        tile: CoordsUtils.add(textBox.tile, delta)
      });
    } else if (item.type === 'CONNECTOR_ANCHOR') {
      const connector = getAnchorParent(item.id, scene.connectors);

      const newConnector = produce(connector, (draft) => {
        const anchor = getItemByIdOrThrow(connector.anchors, item.id);

        const itemAtTile = getItemAtTile({ tile, scene });

        switch (itemAtTile?.type) {
          case 'ITEM':
            draft.anchors[anchor.index] = {
              ...anchor.value,
              ref: {
                item: itemAtTile.id
              }
            };
            break;
          case 'CONNECTOR_ANCHOR':
            draft.anchors[anchor.index] = {
              ...anchor.value,
              ref: {
                anchor: itemAtTile.id
              }
            };
            break;
          default:
            draft.anchors[anchor.index] = {
              ...anchor.value,
              ref: {
                tile
              }
            };
            break;
        }
      });

      scene.updateConnector(connector.id, newConnector);
    }
  });

  // A connector whose node ends all moved moves with them: its bare-tile
  // waypoints shift too. Left behind, the moved line bent back to where
  // the nodes had been (as a pasted copy's does not).
  const moved = new Set(
    items
      .filter((i) => {
        return i.type === 'ITEM';
      })
      .map((i) => {
        return i.id;
      })
  );
  if (moved.size < 2) return;
  scene.connectors.forEach((connector) => {
    const ends = connector.anchors.filter((a) => {
      return a.ref.item !== undefined;
    });
    const waypoints = connector.anchors.some((a) => {
      return a.ref.tile !== undefined;
    });
    if (
      !waypoints ||
      ends.length < 2 ||
      !ends.every((a) => {
        return moved.has(a.ref.item!);
      })
    ) {
      return;
    }
    scene.updateConnector(connector.id, {
      anchors: connector.anchors.map((a) => {
        return a.ref.tile
          ? { ...a, ref: { tile: CoordsUtils.add(a.ref.tile, delta) } }
          : a;
      })
    });
  });
};

export const DragItems: ModeActions = {
  entry: ({ uiState, rendererRef }) => {
    if (uiState.mode.type !== 'DRAG_ITEMS' || !uiState.mouse.mousedown) return;

    const renderer = rendererRef;
    renderer.style.userSelect = 'none';
  },
  exit: ({ rendererRef }) => {
    const renderer = rendererRef;
    renderer.style.userSelect = 'auto';
  },
  mousemove: ({ uiState, scene }) => {
    const { mode } = uiState;
    if (mode.type !== 'DRAG_ITEMS' || !uiState.mouse.mousedown) return;

    let delta: Coords;
    if (mode.isInitialMovement) {
      delta = CoordsUtils.subtract(
        uiState.mouse.position.tile,
        uiState.mouse.mousedown.tile
      );
    } else {
      if (!hasMovedTile(uiState.mouse) || !uiState.mouse.delta?.tile) return;
      delta = uiState.mouse.delta.tile;
    }
    const wanted = CoordsUtils.add(delta, mode.refused ?? CoordsUtils.zero());

    // A drag onto a tile another node holds is refused, as a nudge is
    // (BUG15-56): dropped there, the moved node sat on the other and its
    // label was hidden (sweep 2026-09-30). The nodes wait at their last
    // free tile, so a drop there leaves them on it.
    if (wouldStackNodes(mode.items, wanted, scene.currentView.items ?? [])) {
      uiState.actions.setMode(
        produce(mode, (draft) => {
          draft.isInitialMovement = false;
          draft.refused = wanted;
        })
      );
      return;
    }

    dragItems(mode.items, uiState.mouse.position.tile, wanted, scene);

    if (mode.isInitialMovement || mode.refused) {
      uiState.actions.setMode(
        produce(mode, (draft) => {
          draft.isInitialMovement = false;
          delete draft.refused;
        })
      );
    }
  },
  mouseup: ({ uiState }) => {
    uiState.actions.setMode({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  }
};
