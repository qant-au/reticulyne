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
  clickTarget,
  hasMovedTile,
  getAnchorAtTile,
  getItemByIdOrThrow,
  generateId,
  CoordsUtils,
  getAnchorTile,
  connectorPathTileToGlobal,
  getPortAtPointer,
  endRef,
  isLocked,
  collapsedBoxAtTile,
  collapsedGroupMembers
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
  modifiers,
  rendererSize
}) => {
  if (uiState.mode.type !== 'CURSOR' || !isRendererInteraction) return;

  // a press on one of a node's ports starts a connector from
  // that node, without switching tools. Connector mode then draws it live
  // and commits or cancels on release. Shift is left to multi-select (1.4).
  if (uiState.editorMode === 'EDITABLE' && !modifiers.shift) {
    const port = getPortAtPointer({
      mouse: uiState.mouse,
      zoom: uiState.zoom,
      scroll: uiState.scroll,
      rendererSize,
      nodes: scene.items,
      projection: scene.projection
    });
    if (port) {
      const connectorId = generateId();
      scene.createConnector({
        id: connectorId,
        // A scene may list no colours; the renderer then uses its default.
        color: scene.colors[0]?.id,
        anchors: [
          { id: generateId(), ref: endRef(port.node.id, port.side) },
          { id: generateId(), ref: { item: port.node.id } }
        ]
      });
      uiState.actions.setMode({
        type: 'CONNECTOR',
        showCursor: true,
        id: connectorId
      });
      return;
    }
  }

  // lw-069: a click passes over locked things to whatever is below.
  const itemAtTile = getItemAtTile({
    tile: uiState.mouse.position.tile,
    scene,
    skipLocked: true
  });

  // lw-062: a collapsed group's box stands for its members. A click selects
  // them all, and a press on one of them makes a drag move the whole group.
  const box = itemAtTile
    ? null
    : collapsedBoxAtTile(scene.visibleView, uiState.mouse.position.tile);
  const boxRefs = box
    ? collapsedGroupMembers(scene.currentView, box.groupId)
    : [];
  if (box && boxRefs.length > 0) {
    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.mousedownItem = boxRefs[0];
      })
    );
    if (uiState.editingGroupId) uiState.actions.setEditingGroupId(null);
    const all = boxRefs.every((ref) => {
      return isSelected(ref, uiState.selection);
    });
    if (modifiers.shift) {
      uiState.actions.setSelection(
        all
          ? uiState.selection.filter((s) => {
              return !isSelected(s, boxRefs);
            })
          : [
              ...uiState.selection,
              ...boxRefs.filter((ref) => {
                return !isSelected(ref, uiState.selection);
              })
            ]
      );
      return;
    }
    // Already part of the selection: keep it, so a drag moves all of it.
    if (!all) uiState.actions.setSelection(boxRefs);
    return;
  }

  if (itemAtTile) {
    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.mousedownItem = itemAtTile;
      })
    );

    // 1.7: a click on a grouped item selects its group (the next level
    // down while a group is being edited). Leaving the edited group by
    // clicking outside it happens here too.
    const clicked =
      itemAtTile.type === 'ITEM' ||
      itemAtTile.type === 'RECTANGLE' ||
      itemAtTile.type === 'TEXTBOX'
        ? clickTarget(scene.currentView, itemAtTile, uiState.editingGroupId)
        : null;
    // A group's locked members are not selected with it (lw-069).
    const target = clicked && {
      ...clicked,
      refs: clicked.refs.filter((ref) => {
        return !isLocked(scene.currentView, ref);
      })
    };
    if (target && target.editingGroupId !== uiState.editingGroupId) {
      uiState.actions.setEditingGroupId(target.editingGroupId);
    }

    // 1.4: Shift+click extends. Toggling on mousedown (not mouseup) means
    // the item is in the selection before any drag can start, so
    // Shift+click-and-drag moves the item you just added along with the
    // rest of the group.
    if (modifiers.shift) {
      if (target?.groupId) {
        // A group toggles as a unit: add it all, or remove it all.
        const all = target.refs.every((ref) => {
          return isSelected(ref, uiState.selection);
        });
        uiState.actions.setSelection(
          all
            ? uiState.selection.filter((s) => {
                return !isSelected(s, target.refs);
              })
            : [
                ...uiState.selection,
                ...target.refs.filter((ref) => {
                  return !isSelected(ref, uiState.selection);
                })
              ]
        );
        return;
      }
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

    if (target?.groupId) {
      uiState.actions.setSelection(target.refs);
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
      if (uiState.editingGroupId) uiState.actions.setEditingGroupId(null);
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
        from: uiState.mouse.mousedown.screen,
        to: uiState.mouse.position.screen,
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

    // UXA-03: Alt+drag leaves the originals where they are and drags a
    // copy, as in Excalidraw. The copies are made in place at the start of
    // the drag (one undo step; connectors are not copied) and become the
    // selection. Anchors are sub-parts and are never copied.
    if (
      modifiers.alt &&
      item.type !== 'CONNECTOR_ANCHOR' &&
      uiState.editorMode === 'EDITABLE'
    ) {
      const copies = scene.duplicateInPlace(dragging);
      if (copies.length > 0) {
        uiState.actions.setSelection(copies);
        uiState.actions.setMode({
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: copies,
          isInitialMovement: true
        });
        return;
      }
    }

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
