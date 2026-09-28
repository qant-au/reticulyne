import type { Coords, ItemReference, View } from 'src/types';

// ROADMAP 1.7: reading groups off a view. Membership is `parentGroupId` on
// each node (view item), rectangle, text box and group; these helpers turn
// that into "who is in G" and "what does a click on X select".

type Member = { id: string; parentGroupId?: string };

const leafLists = (view: View): [ItemReference['type'], Member[]][] => {
  return [
    ['ITEM', view.items ?? []],
    ['RECTANGLE', view.rectangles ?? []],
    ['TEXTBOX', view.textBoxes ?? []]
  ];
};

/** The group a node, rectangle or text box sits in directly, if any. */
export const parentGroupOf = (
  view: View,
  ref: ItemReference
): string | undefined => {
  const list = leafLists(view).find(([type]) => {
    return type === ref.type;
  })?.[1];
  return list?.find((m) => {
    return m.id === ref.id;
  })?.parentGroupId;
};

/**
 * The groups containing `groupId`, outermost first, ending with `groupId`
 * itself. Stops at a missing parent or a cycle rather than looping.
 */
export const groupChain = (view: View, groupId: string): string[] => {
  const groups = view.groups ?? [];
  const chain: string[] = [];
  let at: string | undefined = groupId;
  while (at && !chain.includes(at)) {
    const current: string = at;
    if (
      !groups.some((g) => {
        return g.id === current;
      })
    ) {
      break;
    }
    chain.unshift(current);
    at = groups.find((g) => {
      return g.id === current;
    })?.parentGroupId;
  }
  return chain;
};

/** Every group nested anywhere inside `groupId`, and `groupId` itself. */
export const groupAndDescendants = (view: View, groupId: string) => {
  const found = new Set([groupId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const g of view.groups ?? []) {
      if (g.parentGroupId && found.has(g.parentGroupId) && !found.has(g.id)) {
        found.add(g.id);
        grew = true;
      }
    }
  }
  return found;
};

/** The nodes, rectangles and text boxes in a group, at any depth. */
export const groupMembers = (view: View, groupId: string): ItemReference[] => {
  const inside = groupAndDescendants(view, groupId);
  return leafLists(view).flatMap(([type, list]) => {
    return list
      .filter((m) => {
        return m.parentGroupId !== undefined && inside.has(m.parentGroupId);
      })
      .map((m) => {
        return { type, id: m.id };
      });
  });
};

/**
 * What a click on `ref` selects. Outside any group edit, the outermost
 * group it belongs to; while editing a group (entered by double-click),
 * the next level down inside it. Clicking outside the group being edited
 * leaves it.
 */
export const clickTarget = (
  view: View,
  ref: ItemReference,
  editingGroupId: string | null
): {
  groupId: string | null;
  refs: ItemReference[];
  editingGroupId: string | null;
} => {
  const parent = parentGroupOf(view, ref);
  const chain = parent ? groupChain(view, parent) : [];
  const depth = editingGroupId ? chain.indexOf(editingGroupId) : -1;
  const editing = depth >= 0 ? editingGroupId : null;
  const groupId = chain[depth + 1] ?? null;
  return {
    groupId,
    refs: groupId ? groupMembers(view, groupId) : [ref],
    editingGroupId: editing
  };
};

/** The group whose members are exactly `refs`, if there is one. */
export const groupMatchingSelection = (
  view: View,
  refs: ItemReference[]
): string | null => {
  // Connectors are never group members, so one in the selection (Ctrl+A
  // takes them) must not stop the group matching: the panel then kept
  // offering Group instead of Ungroup straight after grouping.
  const memberable = refs.filter((r) => {
    return r.type === 'ITEM' || r.type === 'RECTANGLE' || r.type === 'TEXTBOX';
  });
  if (memberable.length === 0) return null;
  const key = (r: ItemReference) => {
    return `${r.type}:${r.id}`;
  };
  const wanted = new Set(memberable.map(key));
  // Innermost first, so a nested group wins over its parent when both
  // happen to have the same members.
  const ordered = [...(view.groups ?? [])].sort((a, b) => {
    return groupChain(view, b.id).length - groupChain(view, a.id).length;
  });
  const match = ordered.find((g) => {
    const members = groupMembers(view, g.id);
    return (
      members.length === wanted.size &&
      members.every((m) => {
        return wanted.has(key(m));
      })
    );
  });
  return match?.id ?? null;
};

/** The tile box around a group's members, for drawing it. */
export const groupBounds = (
  view: View,
  groupId: string
): { from: Coords; to: Coords } | null => {
  const inside = groupAndDescendants(view, groupId);
  const isMember = (m: Member) => {
    return m.parentGroupId !== undefined && inside.has(m.parentGroupId);
  };
  const tiles: Coords[] = [
    ...(view.items ?? []).filter(isMember).map((i) => {
      return i.tile;
    }),
    ...(view.textBoxes ?? []).filter(isMember).map((t) => {
      return t.tile;
    }),
    ...(view.rectangles ?? []).filter(isMember).flatMap((r) => {
      return [r.from, r.to];
    })
  ];
  if (tiles.length === 0) return null;
  const xs = tiles.map((t) => {
    return t.x;
  });
  const ys = tiles.map((t) => {
    return t.y;
  });
  return {
    from: { x: Math.min(...xs), y: Math.min(...ys) },
    to: { x: Math.max(...xs), y: Math.max(...ys) }
  };
};
