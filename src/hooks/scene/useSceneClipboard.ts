import { useCallback } from 'react';
import { ClipboardEntry, Coords, ItemReference } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import * as reducers from 'src/stores/reducers';
import { generateId, getItemByIdOrThrow } from 'src/utils';
import type { SceneCore } from './types';

const DUPLICATE_TILE_OFFSET = { x: 1, y: 1 };

// Duplicate, copy and paste. The clipboard subscriptions moved here with
// the code that reads them; useScene calls this hook unconditionally, so
// its consumers subscribe to exactly what they did before the split.
// 1.7: a copy is not in the original's group. Copying a group would
// otherwise pour the copies into the original, merging the two.
const ungrouped = <T extends { parentGroupId?: string }>(value: T): T => {
  return { ...value, parentGroupId: undefined };
};

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
              ...ungrouped(viewItem.value),
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
              ...ungrouped(textBox.value),
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
              ...ungrouped(rectangle.value),
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

  // Worklist 19: the clipboard holds a LIST of entries, so copy, cut and
  // paste act on the whole selection. A paste is one setState, so one
  // undo step, and keeps the copied items' spacing (every entry moves by
  // the same offset). UXA-03's Alt+drag reuses the same two steps with a
  // zero offset, so a copy made by dragging is built exactly like a paste.
  const entriesFor = useCallback(
    (targets: ItemReference[]): ClipboardEntry[] => {
      const state = getState();
      const entries: ClipboardEntry[] = [];
      for (const t of targets) {
        switch (t.type) {
          case 'ITEM':
            entries.push({
              kind: 'ITEM',
              modelItem: getItemByIdOrThrow(state.model.items, t.id).value,
              viewItem: ungrouped(
                getItemByIdOrThrow(currentView.items ?? [], t.id).value
              )
            });
            break;
          case 'TEXTBOX':
            entries.push({
              kind: 'TEXTBOX',
              textBox: ungrouped(
                getItemByIdOrThrow(currentView.textBoxes ?? [], t.id).value
              )
            });
            break;
          case 'RECTANGLE':
            entries.push({
              kind: 'RECTANGLE',
              rectangle: ungrouped(
                getItemByIdOrThrow(currentView.rectangles ?? [], t.id).value
              )
            });
            break;
          default:
            // CONNECTOR is intentionally not copyable.
            break;
        }
      }
      return entries;
    },
    [getState, currentView]
  );

  const createFrom = useCallback(
    (entries: ClipboardEntry[], offset: Coords) => {
      let state = getState();
      const refs: ItemReference[] = [];
      const shift = (c: Coords) => {
        return { x: c.x + offset.x, y: c.y + offset.y };
      };
      for (const entry of entries) {
        const newId = generateId();
        switch (entry.kind) {
          case 'ITEM': {
            const afterModel = reducers.createModelItem(
              {
                ...entry.modelItem,
                id: newId,
                name: `${entry.modelItem.name} (copy)`
              },
              state
            );
            state = reducers.view({
              action: 'CREATE_VIEWITEM',
              payload: {
                ...entry.viewItem,
                id: newId,
                tile: shift(entry.viewItem.tile)
              },
              ctx: { viewId: currentViewId, state: afterModel }
            });
            refs.push({ type: 'ITEM', id: newId });
            break;
          }
          case 'TEXTBOX':
            state = reducers.view({
              action: 'CREATE_TEXTBOX',
              payload: {
                ...entry.textBox,
                id: newId,
                tile: shift(entry.textBox.tile)
              },
              ctx: { viewId: currentViewId, state }
            });
            refs.push({ type: 'TEXTBOX', id: newId });
            break;
          case 'RECTANGLE':
            state = reducers.view({
              action: 'CREATE_RECTANGLE',
              payload: {
                ...entry.rectangle,
                id: newId,
                from: shift(entry.rectangle.from),
                to: shift(entry.rectangle.to)
              },
              ctx: { viewId: currentViewId, state }
            });
            refs.push({ type: 'RECTANGLE', id: newId });
            break;
          default:
            break;
        }
      }
      return { state, refs };
    },
    [getState, currentViewId]
  );

  const copySelection = useCallback(
    (target: ItemReference | ItemReference[]) => {
      const entries = entriesFor(Array.isArray(target) ? target : [target]);
      // Copying only connectors leaves the clipboard as it was.
      if (entries.length > 0) setClipboard(entries);
      return entries.length;
    },
    [entriesFor, setClipboard]
  );

  const paste = useCallback((): ItemReference[] | null => {
    if (clipboard.length === 0) return null;
    const { state, refs } = createFrom(clipboard, DUPLICATE_TILE_OFFSET);
    setState(state);
    return refs;
  }, [clipboard, createFrom, setState]);

  /**
   * UXA-03: copy these items in place (connectors skipped) in one undo
   * step and return the copies, for Alt+drag to move instead of the
   * originals. Does not touch the clipboard.
   */
  const duplicateInPlace = useCallback(
    (targets: ItemReference[]): ItemReference[] => {
      const entries = entriesFor(targets);
      if (entries.length === 0) return [];
      const { state, refs } = createFrom(entries, { x: 0, y: 0 });
      setState(state);
      return refs;
    },
    [entriesFor, createFrom, setState]
  );

  return { duplicateItem, copySelection, paste, duplicateInPlace };
};
