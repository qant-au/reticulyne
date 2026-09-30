import { produce } from 'immer';
import type { Group, ItemReference, View } from 'src/types';
import { getItemByIdOrThrow, groupChain, parentGroupOf } from 'src/utils';
import type { State, ViewReducerContext } from './types';

// group, ungroup and edit groups. Each is one reducer call,
// so each is one undo step, and undoing an ungroup restores the group
// with its original id (it is a snapshot restore), which keeps any data
// a host keyed on that id.

type Draftable = { id: string; parentGroupId?: string };

const listFor = (view: View, type: ItemReference['type']) => {
  switch (type) {
    case 'ITEM':
      return view.items as Draftable[];
    case 'RECTANGLE':
      return (view.rectangles ?? []) as Draftable[];
    case 'TEXTBOX':
      return (view.textBoxes ?? []) as Draftable[];
    default:
      return [] as Draftable[];
  }
};

/**
 * Group `refs` (nodes, rectangles, text boxes; anything else is ignored)
 * under a new group inside `group.parentGroupId`. A member already in a
 * group moves as that whole group, so grouping two groups nests them.
 * Needs at least two things to group, or it changes nothing.
 */
export const createGroup = (
  { group, refs }: { group: Group; refs: ItemReference[] },
  { viewId, state }: ViewReducerContext
): State => {
  const view = getItemByIdOrThrow(state.model.views, viewId).value;
  const context = group.parentGroupId;
  const units = new Map<
    string,
    ItemReference | { type: 'GROUP'; id: string }
  >();
  for (const ref of refs) {
    if (!['ITEM', 'RECTANGLE', 'TEXTBOX'].includes(ref.type)) continue;
    const parent = parentGroupOf(view, ref);
    const chain = parent ? groupChain(view, parent) : [];
    const start = context ? chain.indexOf(context) + 1 : 0;
    const unitGroup = chain[start];
    if (unitGroup)
      units.set(`GROUP:${unitGroup}`, { type: 'GROUP', id: unitGroup });
    else units.set(`${ref.type}:${ref.id}`, ref);
  }
  if (units.size < 2) return state;

  return produce(state, (draft) => {
    const v = getItemByIdOrThrow(draft.model.views, viewId).value;
    v.groups = [...(v.groups ?? []), group];
    for (const unit of units.values()) {
      const list =
        unit.type === 'GROUP'
          ? (v.groups as Draftable[])
          : listFor(v, unit.type as ItemReference['type']);
      const target = list.find((m) => {
        return m.id === unit.id;
      });
      if (target) target.parentGroupId = group.id;
    }
  });
};

/** Dissolve a group: its direct members move up to its parent group. */
export const ungroup = (
  { id }: { id: string },
  { viewId, state }: ViewReducerContext
): State => {
  const view = getItemByIdOrThrow(state.model.views, viewId).value;
  const group = view.groups?.find((g) => {
    return g.id === id;
  });
  if (!group) return state;

  return produce(state, (draft) => {
    const v = getItemByIdOrThrow(draft.model.views, viewId).value;
    const lists: Draftable[][] = [
      v.items,
      v.rectangles ?? [],
      v.textBoxes ?? [],
      v.groups ?? []
    ];
    for (const list of lists) {
      for (const m of list) {
        if (m.parentGroupId !== id) continue;
        if (group.parentGroupId) m.parentGroupId = group.parentGroupId;
        else delete m.parentGroupId;
      }
    }
    v.groups = (v.groups ?? []).filter((g) => {
      return g.id !== id;
    });
  });
};

export const updateGroup = (
  {
    id,
    ...updates
  }: { id: string } & Partial<Pick<Group, 'name' | 'color' | 'collapsed'>>,
  { viewId, state }: ViewReducerContext
): State => {
  return produce(state, (draft) => {
    const v = getItemByIdOrThrow(draft.model.views, viewId).value;
    const group = v.groups?.find((g) => {
      return g.id === id;
    });
    if (!group) return;
    Object.assign(group, updates);
    // An undefined field is a cleared one (an expanded group has no
    // `collapsed`), not a key to save.
    for (const key of Object.keys(updates) as (keyof Group)[]) {
      if (group[key] === undefined) delete group[key];
    }
  });
};

/**
 * Drop groups with nothing left in them, after a delete. Repeats because
 * removing an empty inner group can empty its parent.
 */
export const pruneEmptyGroups = (state: State, viewId: string): State => {
  const view = state.model.views.find((v) => {
    return v.id === viewId;
  });
  if (!view?.groups?.length) return state;
  let groups = view.groups;
  for (;;) {
    const used = new Set(
      [
        ...view.items,
        ...(view.rectangles ?? []),
        ...(view.textBoxes ?? []),
        ...groups
      ].map((m) => {
        return (m as Draftable).parentGroupId;
      })
    );
    const next = groups.filter((g) => {
      return used.has(g.id);
    });
    if (next.length === groups.length) break;
    groups = next;
  }
  if (groups.length === view.groups.length) return state;
  return produce(state, (draft) => {
    const v = getItemByIdOrThrow(draft.model.views, viewId).value;
    v.groups = groups;
  });
};
