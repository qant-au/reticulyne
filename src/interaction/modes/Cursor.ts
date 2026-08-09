import { produce } from 'immer';
import {
  ConnectorAnchor,
  SceneConnector,
  ItemReference,
  ModeActions,
  ModeActionsAction,
  Coords,
  View
} from 'src/types';
import {
  getItemAtTile,
  hasMovedTile,
  getAnchorAtTile,
  getItemByIdOrThrow,
  generateId,
  CoordsUtils,
  getAnchorTile,
  connectorPathTileToGlobal
} from 'src/utils';
import { useScene } from 'src/hooks/useScene';

const getAnchorOrdering = (
  anchor: ConnectorAnchor,
  connector: SceneConnector,
  view: View
) => {
  const anchorTile = getAnchorTile(anchor, view);
  const index = connector.path.tiles.findIndex((pathTile) => {
    const globalTile = connectorPathTileToGlobal(
      pathTile,
      connector.path.rectangle.from
    );
    return CoordsUtils.isEqual(globalTile, anchorTile);
  });

  if (index === -1) {
    throw new Error(
      `Could not calculate ordering index of anchor [anchorId: ${anchor.id}]`
    );
  }

  return index;
};

const getAnchor = (
  connectorId: string,
  tile: Coords,
  scene: ReturnType<typeof useScene>
) => {
  const connector = getItemByIdOrThrow(scene.connectors, connectorId).value;
  const anchor = getAnchorAtTile(tile, connector.anchors);

  if (!anchor) {
    const newAnchor: ConnectorAnchor = {
      id: generateId(),
      ref: { tile }
    };

    const orderedAnchors = [...connector.anchors, newAnchor]
      .map((anch) => {
        return {
          ...anch,
          ordering: getAnchorOrdering(anch, connector, scene.currentView)
        };
      })
      .sort((a, b) => {
        return a.ordering - b.ordering;
      });

    scene.updateConnector(connector.id, { anchors: orderedAnchors });
    return newAnchor;
  }

  return anchor;
};

const isSelected = (item: ItemReference, selection: ItemReference[]) => {
  return selection.some((s) => {
    return s.type === item.type && s.id === item.id;
  });
};

const mousedown: ModeActionsAction = ({
  uiState,
  scene,
  isRendererInteraction,
  modifiers
}) => {
  if (uiState.mode.type !== 'CURSOR' || !isRendererInteraction) return;

  const itemAtTile = getItemAtTile({
    tile: uiState.mouse.position.tile,
    scene
  });

  if (itemAtTile) {
    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.mousedownItem = itemAtTile;
      })
    );

    // 1.4: Shift+click extends. Toggling on mousedown (not mouseup) means
    // the item is in the selection before any drag can start, so
    // Shift+click-and-drag moves the item you just added along with the
    // rest of the group.
    if (modifiers.shift) {
      uiState.actions.toggleSelected(itemAtTile);
      return;
    }

    // Plain click on something already part of a multi-selection keeps the
    // group intact — otherwise dragging a group by one of its members
    // would collapse the selection to that member and move only it, which
    // is the single most jarring way to get multi-select wrong.
    if (
      uiState.selection.length > 1 &&
      isSelected(itemAtTile, uiState.selection)
    ) {
      return;
    }

    uiState.actions.setItemControls(itemAtTile);
  } else {
    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.mousedownItem = null;
      })
    );

    // Shift+click on empty canvas keeps the selection — the user is
    // most likely starting an additive marquee.
    if (!modifiers.shift) {
      uiState.actions.setItemControls(null);
    }
  }
};

export const Cursor: ModeActions = {
  entry: (state) => {
    const { uiState } = state;

    if (uiState.mode.type !== 'CURSOR') return;

    if (uiState.mode.mousedownItem) {
      mousedown(state);
    }
  },
  mousemove: ({ scene, uiState, modifiers }) => {
    if (uiState.mode.type !== 'CURSOR' || !hasMovedTile(uiState.mouse)) return;

    let item = uiState.mode.mousedownItem;

    // 1.4: nothing under the press + button still held on empty canvas
    // => start a marquee. Guarded on `mouse.mousedown` so a plain hover
    // (no button) never opens a band.
    if (!item) {
      if (uiState.editorMode !== 'EDITABLE' || !uiState.mouse.mousedown) return;

      uiState.actions.setMode({
        type: 'MARQUEE',
        showCursor: true,
        from: uiState.mouse.mousedown.tile,
        to: uiState.mouse.position.tile,
        base: modifiers.shift ? uiState.selection : []
      });
      return;
    }

    if (item.type === 'CONNECTOR' && uiState.mouse.mousedown) {
      const anchor = getAnchor(item.id, uiState.mouse.mousedown.tile, scene);

      item = {
        type: 'CONNECTOR_ANCHOR',
        id: anchor.id
      };
    }

    // 1.4: dragging any member of a multi-selection drags the whole group.
    // Connector anchors are excluded — an anchor drag re-parents that one
    // anchor to whatever is under the cursor, which has no group meaning.
    const dragging =
      item.type !== 'CONNECTOR_ANCHOR' &&
      uiState.selection.length > 1 &&
      isSelected(item, uiState.selection)
        ? uiState.selection
        : [item];

    uiState.actions.setMode({
      type: 'DRAG_ITEMS',
      showCursor: true,
      items: dragging,
      isInitialMovement: true
    });
  },
  mousedown,
  mouseup: ({ uiState, isRendererInteraction, modifiers }) => {
    if (uiState.mode.type !== 'CURSOR') return;

    // Mouseup outside the renderer (toolbar, scrollbar, off-window):
    // the inspector/item-controls panel handles its own click targets,
    // so don't reach in and override its selection. But we MUST still
    // clear any stashed mousedownItem — otherwise the next mousemove
    // back into the renderer promotes to DRAG_ITEMS with no button
    // held, dragging the item until the user clicks again.
    if (!isRendererInteraction) {
      if (uiState.mode.mousedownItem) {
        uiState.actions.setMode(
          produce(uiState.mode, (draft) => {
            draft.mousedownItem = null;
          })
        );
      }
      return;
    }

    // 1.4: mousedown already settled the selection for both multi-select
    // gestures — Shift+click toggled the item, and a plain click on an
    // existing group member deliberately left the group alone. Re-running
    // the single-select write here would undo either one, so both cases
    // skip straight to clearing mousedownItem.
    const settledByMousedown =
      modifiers.shift ||
      (uiState.mode.mousedownItem !== null &&
        uiState.selection.length > 1 &&
        isSelected(uiState.mode.mousedownItem, uiState.selection));

    if (!settledByMousedown) {
      if (uiState.mode.mousedownItem) {
        if (uiState.mode.mousedownItem.type === 'ITEM') {
          uiState.actions.setItemControls({
            type: 'ITEM',
            id: uiState.mode.mousedownItem.id
          });
        } else if (uiState.mode.mousedownItem.type === 'RECTANGLE') {
          uiState.actions.setItemControls({
            type: 'RECTANGLE',
            id: uiState.mode.mousedownItem.id
          });
        } else if (uiState.mode.mousedownItem.type === 'CONNECTOR') {
          uiState.actions.setItemControls({
            type: 'CONNECTOR',
            id: uiState.mode.mousedownItem.id
          });
        } else if (uiState.mode.mousedownItem.type === 'TEXTBOX') {
          uiState.actions.setItemControls({
            type: 'TEXTBOX',
            id: uiState.mode.mousedownItem.id
          });
        }
      } else {
        uiState.actions.setItemControls(null);
      }
    }

    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.mousedownItem = null;
      })
    );
  }
};
