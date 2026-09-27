import { useCallback } from 'react';
import { ItemReference } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import * as reducers from 'src/stores/reducers';
import { generateId, getItemByIdOrThrow } from 'src/utils';
import type { SceneCore } from './types';

const DUPLICATE_TILE_OFFSET = { x: 1, y: 1 };

// Duplicate, copy and paste. The clipboard subscriptions moved here with
// the code that reads them; useScene calls this hook unconditionally, so
// its consumers subscribe to exactly what they did before the split.
export const useSceneClipboard = ({
  getState,
  setState,
  currentViewId,
  currentView
}: Pick<
  SceneCore,
  'getState' | 'setState' | 'currentViewId' | 'currentView'
>) => {
  // Deep-clone the target item with a freshly-generated id and a small
  // tile offset so the copy doesn't sit exactly on top of the original.
  // Connectors are deliberately not duplicated yet — their anchors
  // reference other items and the right semantics for "duplicate a
  // connector pointing at the original anchors vs the copies" needs a
  // UX decision.
  const duplicateItem = useCallback(
    (target: ItemReference) => {
      const state = getState();
      switch (target.type) {
        case 'ITEM': {
          const modelItem = getItemByIdOrThrow(state.model.items, target.id);
          const viewItem = getItemByIdOrThrow(
            currentView.items ?? [],
            target.id
          );
          const newId = generateId();
          const afterModel = reducers.createModelItem(
            {
              ...modelItem.value,
              id: newId,
              name: `${modelItem.value.name} (copy)`
            },
            state
          );
          const afterView = reducers.view({
            action: 'CREATE_VIEWITEM',
            payload: {
              ...viewItem.value,
              id: newId,
              tile: {
                x: viewItem.value.tile.x + DUPLICATE_TILE_OFFSET.x,
                y: viewItem.value.tile.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state: afterModel }
          });
          setState(afterView);
          return;
        }
        case 'TEXTBOX': {
          const textBox = getItemByIdOrThrow(
            currentView.textBoxes ?? [],
            target.id
          );
          const newState = reducers.view({
            action: 'CREATE_TEXTBOX',
            payload: {
              ...textBox.value,
              id: generateId(),
              tile: {
                x: textBox.value.tile.x + DUPLICATE_TILE_OFFSET.x,
                y: textBox.value.tile.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state }
          });
          setState(newState);
          return;
        }
        case 'RECTANGLE': {
          const rectangle = getItemByIdOrThrow(
            currentView.rectangles ?? [],
            target.id
          );
          const newState = reducers.view({
            action: 'CREATE_RECTANGLE',
            payload: {
              ...rectangle.value,
              id: generateId(),
              from: {
                x: rectangle.value.from.x + DUPLICATE_TILE_OFFSET.x,
                y: rectangle.value.from.y + DUPLICATE_TILE_OFFSET.y
              },
              to: {
                x: rectangle.value.to.x + DUPLICATE_TILE_OFFSET.x,
                y: rectangle.value.to.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state }
          });
          setState(newState);
          return;
        }
        default:
          // CONNECTOR / CONNECTOR_ANCHOR: not supported (see comment above).
          break;
      }
    },
    [getState, setState, currentViewId, currentView]
  );

  // FEA5-04: copy/paste. Copy reads the selection's data from the
  // live stores and snapshots it into the clipboard slice on
  // uiStateStore. Paste deep-clones the clipboard entry with a
  // fresh id and a one-tile offset, then commits through setState
  // — which means paste is automatically captured by the FEA5-03
  // undo/redo history.
  //
  // Connectors are deliberately not copyable: their anchors
  // reference other items by id, and the right "paste a connector
  // into a context where its anchored items may or may not exist"
  // semantics isn't a UX call we want to lock in yet. Matches
  // duplicateItem's existing exclusion.
  const setClipboard = useUiStateStore((state) => {
    return state.actions.setClipboard;
  });
  const clipboard = useUiStateStore((state) => {
    return state.clipboard;
  });

  const copySelection = useCallback(
    (target: ItemReference) => {
      const state = getState();
      switch (target.type) {
        case 'ITEM': {
          const modelItem = getItemByIdOrThrow(
            state.model.items,
            target.id
          ).value;
          const viewItem = getItemByIdOrThrow(
            currentView.items ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'ITEM', modelItem, viewItem });
          return;
        }
        case 'TEXTBOX': {
          const textBox = getItemByIdOrThrow(
            currentView.textBoxes ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'TEXTBOX', textBox });
          return;
        }
        case 'RECTANGLE': {
          const rectangle = getItemByIdOrThrow(
            currentView.rectangles ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'RECTANGLE', rectangle });
          return;
        }
        default:
          // CONNECTOR is intentionally not copyable.
          break;
      }
    },
    [getState, currentView, setClipboard]
  );

  const paste = useCallback(() => {
    if (clipboard === null) return null;
    const state = getState();
    const newId = generateId();
    switch (clipboard.kind) {
      case 'ITEM': {
        const afterModel = reducers.createModelItem(
          {
            ...clipboard.modelItem,
            id: newId,
            name: `${clipboard.modelItem.name} (copy)`
          },
          state
        );
        const afterView = reducers.view({
          action: 'CREATE_VIEWITEM',
          payload: {
            ...clipboard.viewItem,
            id: newId,
            tile: {
              x: clipboard.viewItem.tile.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.viewItem.tile.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state: afterModel }
        });
        setState(afterView);
        return { type: 'ITEM' as const, id: newId };
      }
      case 'TEXTBOX': {
        const newState = reducers.view({
          action: 'CREATE_TEXTBOX',
          payload: {
            ...clipboard.textBox,
            id: newId,
            tile: {
              x: clipboard.textBox.tile.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.textBox.tile.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state }
        });
        setState(newState);
        return { type: 'TEXTBOX' as const, id: newId };
      }
      case 'RECTANGLE': {
        const newState = reducers.view({
          action: 'CREATE_RECTANGLE',
          payload: {
            ...clipboard.rectangle,
            id: newId,
            from: {
              x: clipboard.rectangle.from.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.rectangle.from.y + DUPLICATE_TILE_OFFSET.y
            },
            to: {
              x: clipboard.rectangle.to.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.rectangle.to.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state }
        });
        setState(newState);
        return { type: 'RECTANGLE' as const, id: newId };
      }
      default:
        return null;
    }
  }, [clipboard, getState, setState, currentViewId]);

  return { duplicateItem, copySelection, paste };
};
