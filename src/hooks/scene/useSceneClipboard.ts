import { useCallback, useRef } from 'react';
import { produce } from 'immer';
import { ClipboardEntry, Coords, ItemReference } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import * as reducers from 'src/stores/reducers';
import { endRef, generateId, getItemByIdOrThrow } from 'src/utils';
import type { SceneCore } from './types';

const DUPLICATE_TILE_OFFSET = { x: 1, y: 1 };

// A copy of a copy is still "X (copy)", not "X (copy) (copy)".
const copyName = (name: string) => {
  return name.endsWith(' (copy)') ? name : `${name} (copy)`;
};

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
              name: copyName(modelItem.value.name)
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
  // Connectors are copied with both of their ends and rewired to the
  // copies; one whose ends are not both copied stays behind. Groups with
  // two or more copied members are recreated around the copies (decided
  // 2026-09-29, as Excalidraw does both).
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
          case 'ITEM': {
            const modelItem = getItemByIdOrThrow(state.model.items, t.id).value;
            entries.push({
              kind: 'ITEM',
              modelItem,
              viewItem: getItemByIdOrThrow(currentView.items ?? [], t.id).value,
              icon: state.model.icons.find((i) => {
                return i.id === modelItem.icon;
              })
            });
            break;
          }
          case 'TEXTBOX':
            entries.push({
              kind: 'TEXTBOX',
              textBox: getItemByIdOrThrow(currentView.textBoxes ?? [], t.id)
                .value
            });
            break;
          case 'RECTANGLE': {
            const rectangle = getItemByIdOrThrow(
              currentView.rectangles ?? [],
              t.id
            ).value;
            entries.push({
              kind: 'RECTANGLE',
              rectangle,
              color: state.model.colors.find((c) => {
                return c.id === rectangle.color;
              })
            });
            break;
          }
          default:
            // A connector comes along only with both of its ends (below).
            break;
        }
      }

      // Groups: one with two or more copied members (at any depth) is
      // recreated around the copies; with fewer, the copy is ungrouped.
      const groups = currentView.groups ?? [];
      const parentOf = (id: string | undefined) => {
        return groups.find((g) => {
          return g.id === id;
        });
      };
      const counts = new Map<string, number>();
      for (const e of entries) {
        const own =
          e.kind === 'ITEM'
            ? e.viewItem.parentGroupId
            : e.kind === 'TEXTBOX'
              ? e.textBox.parentGroupId
              : e.kind === 'RECTANGLE'
                ? e.rectangle.parentGroupId
                : undefined;
        for (let g = parentOf(own); g; g = parentOf(g.parentGroupId)) {
          counts.set(g.id, (counts.get(g.id) ?? 0) + 1);
        }
      }
      const kept = (id: string) => {
        return (counts.get(id) ?? 0) >= 2;
      };
      // The nearest copied group at or above this one, or none.
      const nearest = (id: string | undefined): string | undefined => {
        for (let g = parentOf(id); g; g = parentOf(g.parentGroupId)) {
          if (kept(g.id)) return g.id;
        }
        return undefined;
      };
      const regrouped = entries.map((e): ClipboardEntry => {
        switch (e.kind) {
          case 'ITEM':
            return {
              ...e,
              viewItem: {
                ...e.viewItem,
                parentGroupId: nearest(e.viewItem.parentGroupId)
              }
            };
          case 'TEXTBOX':
            return {
              ...e,
              textBox: {
                ...e.textBox,
                parentGroupId: nearest(e.textBox.parentGroupId)
              }
            };
          case 'RECTANGLE':
            return {
              ...e,
              rectangle: {
                ...e.rectangle,
                parentGroupId: nearest(e.rectangle.parentGroupId)
              }
            };
          default:
            return e;
        }
      });
      entries.splice(0, entries.length, ...regrouped);
      for (const g of groups) {
        if (kept(g.id)) {
          entries.push({
            kind: 'GROUP',
            group: { ...g, parentGroupId: nearest(g.parentGroupId) }
          });
        }
      }

      // Connectors: every connector whose node ends are all copied, and
      // whose anchor-to-anchor links stay inside itself, comes too.
      const copiedNodes = new Set(
        targets
          .filter((t) => {
            return t.type === 'ITEM';
          })
          .map((t) => {
            return t.id;
          })
      );
      for (const c of currentView.connectors ?? []) {
        const first = c.anchors[0];
        const last = c.anchors[c.anchors.length - 1];
        const ownAnchors = new Set(
          c.anchors.map((a) => {
            return a.id;
          })
        );
        const whole =
          first?.ref.item !== undefined &&
          last?.ref.item !== undefined &&
          c.anchors.every((a) => {
            if (a.ref.item !== undefined) return copiedNodes.has(a.ref.item);
            if (a.ref.anchor !== undefined) return ownAnchors.has(a.ref.anchor);
            return true;
          });
        if (whole) entries.push({ kind: 'CONNECTOR', connector: c });
      }
      return entries;
    },
    [getState, currentView]
  );

  const createFrom = useCallback(
    (entries: ClipboardEntry[], offset: Coords) => {
      let state = getState();
      const refs: ItemReference[] = [];
      // Bring along any icon or colour the target diagram lacks (a paste
      // into another diagram).
      const icons = [...state.model.icons];
      const colors = [...state.model.colors];
      for (const entry of entries) {
        if (entry.kind === 'ITEM' && entry.icon) {
          const { icon } = entry;
          if (
            !icons.some((i) => {
              return i.id === icon.id;
            })
          )
            icons.push(icon);
        }
        if (entry.kind === 'RECTANGLE' && entry.color) {
          const { color } = entry;
          if (
            !colors.some((c) => {
              return c.id === color.id;
            })
          )
            colors.push(color);
        }
      }
      if (
        icons.length !== state.model.icons.length ||
        colors.length !== state.model.colors.length
      ) {
        state = { ...state, model: { ...state.model, icons, colors } };
      }
      const shift = (c: Coords) => {
        return { x: c.x + offset.x, y: c.y + offset.y };
      };

      // Groups go in first: a member naming a group the view does not
      // have yet is refused. Each copied group gets a new id.
      const groupIds = new Map<string, string>();
      for (const entry of entries) {
        if (entry.kind === 'GROUP') groupIds.set(entry.group.id, generateId());
      }
      const newGroup = (id: string | undefined) => {
        return id === undefined ? undefined : groupIds.get(id);
      };
      if (groupIds.size > 0) {
        state = produce(state, (draft) => {
          const view = draft.model.views.find((v) => {
            return v.id === currentViewId;
          });
          if (!view) return;
          for (const entry of entries) {
            if (entry.kind !== 'GROUP') continue;
            view.groups = [
              ...(view.groups ?? []),
              {
                ...entry.group,
                id: groupIds.get(entry.group.id)!,
                parentGroupId: newGroup(entry.group.parentGroupId)
              }
            ];
          }
        });
      }

      const nodeIds = new Map<string, string>();
      for (const entry of entries) {
        const newId = generateId();
        switch (entry.kind) {
          case 'ITEM': {
            // A cut removed the original from the view (its model item
            // stays), so its paste keeps the name.
            const originalExists = state.model.views.some((v) => {
              return (v.items ?? []).some((i) => {
                return i.id === entry.viewItem.id;
              });
            });
            const afterModel = reducers.createModelItem(
              {
                ...entry.modelItem,
                id: newId,
                name: originalExists
                  ? copyName(entry.modelItem.name)
                  : entry.modelItem.name
              },
              state
            );
            state = reducers.view({
              action: 'CREATE_VIEWITEM',
              payload: {
                ...entry.viewItem,
                id: newId,
                tile: shift(entry.viewItem.tile),
                parentGroupId: newGroup(entry.viewItem.parentGroupId)
              },
              ctx: { viewId: currentViewId, state: afterModel }
            });
            nodeIds.set(entry.viewItem.id, newId);
            refs.push({ type: 'ITEM', id: newId });
            break;
          }
          case 'TEXTBOX':
            state = reducers.view({
              action: 'CREATE_TEXTBOX',
              payload: {
                ...entry.textBox,
                id: newId,
                tile: shift(entry.textBox.tile),
                parentGroupId: newGroup(entry.textBox.parentGroupId)
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
                to: shift(entry.rectangle.to),
                parentGroupId: newGroup(entry.rectangle.parentGroupId)
              },
              ctx: { viewId: currentViewId, state }
            });
            refs.push({ type: 'RECTANGLE', id: newId });
            break;
          default:
            break;
        }
      }

      // Connectors last, rewired to the copies: node ends to the new
      // nodes, bare-tile waypoints shifted, anchor links to new anchors.
      for (const entry of entries) {
        if (entry.kind !== 'CONNECTOR') continue;
        const anchorIds = new Map(
          entry.connector.anchors.map((a) => {
            return [a.id, generateId()] as const;
          })
        );
        state = reducers.view({
          action: 'CREATE_CONNECTOR',
          payload: {
            ...entry.connector,
            id: generateId(),
            anchors: entry.connector.anchors.map((a) => {
              return {
                id: anchorIds.get(a.id)!,
                ref:
                  a.ref.item !== undefined
                    ? endRef(nodeIds.get(a.ref.item)!, a.ref.side)
                    : a.ref.anchor !== undefined
                      ? { anchor: anchorIds.get(a.ref.anchor)! }
                      : { tile: shift(a.ref.tile!) }
              };
            })
          },
          ctx: { viewId: currentViewId, state }
        });
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

  // Each paste of the same clipboard lands one tile further on, so
  // pasting three times gives three visible copies rather than a stack.
  const pastes = useRef<{ clip: ClipboardEntry[]; count: number }>({
    clip: [],
    count: 0
  });

  // The first diagonal step, from `start` on, at which no copied node
  // lands on a tile a node already holds: a copy there hid the node under
  // it. (Align/Distribute refuse the same outcome.)
  const freeStep = useCallback(
    (entries: ClipboardEntry[], start: number) => {
      const view = getState().model.views.find((v) => {
        return v.id === currentViewId;
      });
      const taken = new Set(
        (view?.items ?? []).map((i) => {
          return `${i.tile.x},${i.tile.y}`;
        })
      );
      const tiles = entries.flatMap((e) => {
        return e.kind === 'ITEM' ? [e.viewItem.tile] : [];
      });
      for (let n = start; n < start + 200; n += 1) {
        const clash = tiles.some((t) => {
          return taken.has(
            `${t.x + DUPLICATE_TILE_OFFSET.x * n},${t.y + DUPLICATE_TILE_OFFSET.y * n}`
          );
        });
        if (!clash) return n;
      }
      return start;
    },
    [getState, currentViewId]
  );

  const paste = useCallback((): ItemReference[] | null => {
    if (clipboard.length === 0) return null;
    if (pastes.current.clip !== clipboard) {
      pastes.current = { clip: clipboard, count: 0 };
    }
    pastes.current.count = freeStep(clipboard, pastes.current.count + 1);
    const n = pastes.current.count;
    const { state, refs } = createFrom(clipboard, {
      x: DUPLICATE_TILE_OFFSET.x * n,
      y: DUPLICATE_TILE_OFFSET.y * n
    });
    setState(state);
    return refs;
  }, [clipboard, createFrom, setState, freeStep]);

  /**
   * UXA-03: copy these items in place (with the connectors between them) in one undo
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

  /**
   * Ctrl/Cmd+D: copy these items to the first free diagonal step, with the connectors between them, in one
   * undo step and return the copies, which the caller selects so that
   * pressing it again steps on from them instead of stacking.
   */
  const duplicateSelection = useCallback(
    (targets: ItemReference[]): ItemReference[] => {
      const entries = entriesFor(targets);
      if (entries.length === 0) return [];
      const n = freeStep(entries, 1);
      const { state, refs } = createFrom(entries, {
        x: DUPLICATE_TILE_OFFSET.x * n,
        y: DUPLICATE_TILE_OFFSET.y * n
      });
      setState(state);
      return refs;
    },
    [entriesFor, createFrom, setState, freeStep]
  );

  return {
    duplicateItem,
    copySelection,
    paste,
    duplicateInPlace,
    duplicateSelection
  };
};
