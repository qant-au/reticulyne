import type { State } from './types';

// Lock and unlock (Excalidraw's Ctrl/Cmd+Shift+L). Locking is per
// view, like a layer: `locked` sits on the view item, connector, rectangle
// or text box. Returns the state unchanged when nothing changes, so no
// empty undo step is made.

type LockRef = {
  type: 'ITEM' | 'CONNECTOR' | 'RECTANGLE' | 'TEXTBOX' | 'CONNECTOR_ANCHOR';
  id: string;
};

export const setItemsLocked = (
  state: State,
  viewId: string,
  refs: LockRef[] | 'all',
  locked: boolean
): State => {
  const ids = {
    ITEM: new Set<string>(),
    CONNECTOR: new Set<string>(),
    RECTANGLE: new Set<string>(),
    TEXTBOX: new Set<string>()
  };
  if (refs !== 'all') {
    refs.forEach((ref) => {
      if (ref.type !== 'CONNECTOR_ANCHOR') ids[ref.type].add(ref.id);
    });
  }
  let changed = false;
  const put = <T extends { id: string; locked?: boolean }>(
    list: T[] | undefined,
    wanted: Set<string>
  ) => {
    return list?.map((entry) => {
      if (refs !== 'all' && !wanted.has(entry.id)) return entry;
      if (Boolean(entry.locked) === locked) return entry;
      changed = true;
      const next = { ...entry };
      // Unlocked is stored as no flag at all.
      if (locked) next.locked = true;
      else delete next.locked;
      return next;
    });
  };
  const views = state.model.views.map((view) => {
    if (view.id !== viewId) return view;
    return {
      ...view,
      items: put(view.items, ids.ITEM) ?? [],
      ...(view.connectors
        ? { connectors: put(view.connectors, ids.CONNECTOR) }
        : {}),
      ...(view.rectangles
        ? { rectangles: put(view.rectangles, ids.RECTANGLE) }
        : {}),
      ...(view.textBoxes ? { textBoxes: put(view.textBoxes, ids.TEXTBOX) } : {})
    };
  });
  if (!changed) return state;
  return { ...state, model: { ...state.model, views } };
};
