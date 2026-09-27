import { produce, Draft } from 'immer';
import { ItemReference, LayerOrderingAction, View } from 'src/types';
import { getItemByIdOrThrow } from 'src/utils';
import { State, ViewReducerContext } from './types';

// ROADMAP 1.3. Rectangles, connectors and text boxes each render in
// array order within their own layer (index 0 frontmost; the layers
// reverse before painting), so reordering the array is what moves them.
// Nodes are different: each node's z-index is its isometric depth
// (-x - y), so array order never changes how nodes paint, and ITEM
// references are ignored here rather than thrown on. Connector anchors
// are sub-parts with no order of their own. Ordering is within a kind;
// cross-kind ordering would need the layers merged.
type Orderable = { id: string };

const arrayFor = (
  view: Draft<View>,
  type: ItemReference['type']
): Orderable[] | undefined => {
  switch (type) {
    case 'RECTANGLE':
      return view.rectangles;
    case 'CONNECTOR':
      return view.connectors;
    case 'TEXTBOX':
      return view.textBoxes;
    default:
      return undefined;
  }
};

// Moves every selected entry together and keeps their relative order,
// so a multi-selection behaves like one block (Excalidraw's semantics).
const reorder = (
  arr: Orderable[],
  ids: Set<string>,
  action: LayerOrderingAction
) => {
  const isSelected = (entry: Orderable) => {
    return ids.has(entry.id);
  };
  let next: Orderable[];

  switch (action) {
    case 'BRING_TO_FRONT':
      next = [
        ...arr.filter(isSelected),
        ...arr.filter((e) => {
          return !isSelected(e);
        })
      ];
      break;
    case 'SEND_TO_BACK':
      next = [
        ...arr.filter((e) => {
          return !isSelected(e);
        }),
        ...arr.filter(isSelected)
      ];
      break;
    case 'BRING_FORWARD':
      // One step toward index 0: each selected entry swaps with the
      // unselected neighbour in front of it. Walking front-to-back lets a
      // contiguous block move as a block.
      next = [...arr];
      for (let i = 1; i < next.length; i += 1) {
        if (isSelected(next[i]) && !isSelected(next[i - 1])) {
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
        }
      }
      break;
    case 'SEND_BACKWARD':
      next = [...arr];
      for (let i = next.length - 2; i >= 0; i -= 1) {
        if (isSelected(next[i]) && !isSelected(next[i + 1])) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
      break;
    default:
      return;
  }

  arr.splice(0, arr.length, ...next);
};

export const changeLayerOrder = (
  {
    action,
    item,
    items
  }: {
    action: LayerOrderingAction;
    /** A single target; kept for the context menu and existing callers. */
    item?: ItemReference;
    /** Several targets, moved as one block in a single history step. */
    items?: ItemReference[];
  },
  { viewId, state }: ViewReducerContext
): State => {
  const targets = items ?? (item ? [item] : []);

  return produce(state, (draft) => {
    const view = getItemByIdOrThrow(draft.model.views, viewId).value;
    const byType = new Map<ItemReference['type'], Set<string>>();

    for (const target of targets) {
      const ids = byType.get(target.type) ?? new Set<string>();
      ids.add(target.id);
      byType.set(target.type, ids);
    }

    byType.forEach((ids, type) => {
      const arr = arrayFor(view, type);
      if (!arr) return;
      for (const id of ids) {
        // Surface a stale reference the same way the old reducer did.
        getItemByIdOrThrow(arr, id);
      }
      reorder(arr, ids, action);
    });
  });
};
