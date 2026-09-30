// lw-062: collapsed groups. A collapsed group is drawn as one box in place
// of its members. Pure, so the editor, the exports and the tests share one
// rule, and applied after the layer filter, so a box stands for the members
// that are shown.
//
// Members hide at any depth, and a group inside a collapsed group is hidden
// with it: only the outermost collapsed group gets a box. A connector from
// outside to a hidden member docks on the box instead; one that runs
// between members of the same collapsed group is hidden, since it would
// start and end on the box. A connector that ends on an anchor of a hidden
// connector goes too.

import type { Connector, Coords, ItemReference, View } from 'src/types';
import { getConnectorPath } from './connector';
import {
  groupAndDescendants,
  groupBounds,
  groupChain,
  groupMembers
} from './groups';
import { isLocked } from './lock';

export interface CollapsedBox {
  groupId: string;
  tile: Coords;
  /** How many nodes, rectangles and text boxes it stands for. */
  count: number;
}

type ConnectorPath = ReturnType<typeof getConnectorPath>;

interface CollapseMeta {
  boxes: CollapsedBox[];
  /** Paths for the connectors re-docked on a box, by connector id. */
  paths: Map<string, ConnectorPath>;
}

const meta = new WeakMap<View, CollapseMeta>();

/** The collapsed groups with no collapsed group around them. */
export const collapsedRoots = (view: View): string[] => {
  const collapsed = new Set(
    (view.groups ?? [])
      .filter((g) => {
        return g.collapsed;
      })
      .map((g) => {
        return g.id;
      })
  );
  return [...collapsed].filter((id) => {
    return groupChain(view, id)
      .slice(0, -1)
      .every((ancestor) => {
        return !collapsed.has(ancestor);
      });
  });
};

/** True when `groupId` is collapsed or sits inside a collapsed group. */
export const isInCollapsedGroup = (view: View, groupId: string): boolean => {
  return groupChain(view, groupId).some((id) => {
    return view.groups?.find((g) => {
      return g.id === id;
    })?.collapsed;
  });
};

/**
 * The view with the members of every collapsed group removed and the
 * connectors to them re-docked on the group's box. Returns the same view
 * object when no group is collapsed, so a diagram without one costs
 * nothing.
 */
export const filterViewByCollapsedGroups = (view: View): View => {
  const roots = collapsedRoots(view);
  if (roots.length === 0) return view;

  // Which box each hidden member (at any depth) is folded into.
  const boxOf = new Map<string, string>();
  const boxes: CollapsedBox[] = [];
  for (const groupId of roots) {
    const bounds = groupBounds(view, groupId);
    if (!bounds) continue;
    const inside = groupAndDescendants(view, groupId);
    let count = 0;
    const fold = (m: { id: string; parentGroupId?: string }) => {
      if (m.parentGroupId === undefined || !inside.has(m.parentGroupId)) {
        return;
      }
      boxOf.set(m.id, groupId);
      count += 1;
    };
    view.items.forEach(fold);
    (view.rectangles ?? []).forEach(fold);
    (view.textBoxes ?? []).forEach(fold);
    boxes.push({
      groupId,
      tile: {
        x: Math.round((bounds.from.x + bounds.to.x) / 2),
        y: Math.round((bounds.from.y + bounds.to.y) / 2)
      },
      count
    });
  }
  if (boxes.length === 0) return view;
  const tileOf = new Map(
    boxes.map((b) => {
      return [b.groupId, b.tile];
    })
  );
  const shown = (entry: { id: string }) => {
    return !boxOf.has(entry.id);
  };

  // Re-dock each end on a hidden node onto its box; hide a connector whose
  // node ends all fold into the same box.
  const rerouted = new Set<string>();
  let connectors: Connector[] = (view.connectors ?? []).flatMap((c) => {
    const folded = c.anchors
      .map((a) => {
        return a.ref.item !== undefined ? boxOf.get(a.ref.item) : undefined;
      })
      .filter((g): g is string => {
        return g !== undefined;
      });
    if (folded.length === 0) return [c];
    const nodeEnds = c.anchors.filter((a) => {
      return a.ref.item !== undefined;
    }).length;
    if (folded.length === nodeEnds && new Set(folded).size === 1) return [];
    rerouted.add(c.id);
    return [
      {
        ...c,
        anchors: c.anchors.map((a) => {
          const groupId =
            a.ref.item !== undefined ? boxOf.get(a.ref.item) : undefined;
          if (groupId === undefined) return a;
          return { ...a, ref: { tile: tileOf.get(groupId) as Coords } };
        })
      }
    ];
  });
  for (;;) {
    const anchorIds = new Set(
      connectors.flatMap((c) => {
        return c.anchors.map((a) => {
          return a.id;
        });
      })
    );
    const next = connectors.filter((c) => {
      return c.anchors.every(({ ref }) => {
        return ref.anchor === undefined || anchorIds.has(ref.anchor);
      });
    });
    if (next.length === connectors.length) break;
    connectors = next;
  }

  const filtered: View = {
    ...view,
    items: view.items.filter(shown),
    ...(view.connectors ? { connectors } : {}),
    ...(view.rectangles ? { rectangles: view.rectangles.filter(shown) } : {}),
    ...(view.textBoxes ? { textBoxes: view.textBoxes.filter(shown) } : {})
  };

  const paths = new Map<string, ConnectorPath>();
  for (const c of connectors) {
    if (!rerouted.has(c.id)) continue;
    try {
      paths.set(c.id, getConnectorPath({ anchors: c.anchors, view: filtered }));
    } catch {
      // No route: the connector keeps its stored path rather than vanish.
    }
  }
  meta.set(filtered, { boxes, paths });
  return filtered;
};

/** The boxes drawn for the collapsed groups of a filtered view. */
export const collapsedBoxes = (view: View): CollapsedBox[] => {
  return meta.get(view)?.boxes ?? [];
};

/** The path of a connector re-docked on a box, if it was. */
export const reroutedPath = (
  view: View,
  connectorId: string
): ConnectorPath | undefined => {
  return meta.get(view)?.paths.get(connectorId);
};

/**
 * How far a collapsed group's box reaches from its tile's centre, in tiles,
 * along each axis. It is drawn across most of the neighbouring tiles too
 * (Groups), so a press anywhere on it must find it, not only on its centre
 * tile (sweep 2026-09-30: off-centre clicks selected nothing).
 */
export const COLLAPSED_BOX_REACH = 0.95;

/**
 * The collapsed group whose box is under `point`, a position in tile units
 * (pointerTilePosition), if any.
 */
export const collapsedBoxAt = (
  view: View,
  point: Coords
): CollapsedBox | null => {
  return (
    collapsedBoxes(view).find((b) => {
      return (
        Math.abs(point.x - b.tile.x) <= COLLAPSED_BOX_REACH &&
        Math.abs(point.y - b.tile.y) <= COLLAPSED_BOX_REACH
      );
    }) ?? null
  );
};

/**
 * True when an end of this connector is docked on a node hidden in a
 * collapsed group, so it is drawn to the group's box. Its anchors as drawn
 * point that end at the box's tile: dragging an anchor, or adding a
 * waypoint (which writes the drawn anchors back), would re-point it at a
 * bare tile and detach the connector from the group.
 */
export const isDockedOnCollapsedBox = (
  view: View,
  connectorId: string
): boolean => {
  const connector = view.connectors?.find((c) => {
    return c.id === connectorId;
  });
  return (connector?.anchors ?? []).some((a) => {
    const itemId = a.ref.item;
    if (itemId === undefined) return false;
    const parent = view.items.find((i) => {
      return i.id === itemId;
    })?.parentGroupId;
    return parent !== undefined && isInCollapsedGroup(view, parent);
  });
};

/** The collapsed group whose box is on `tile`, if any. */
export const collapsedBoxAtTile = (
  view: View,
  tile: Coords
): CollapsedBox | null => {
  return (
    collapsedBoxes(view).find((b) => {
      return b.tile.x === tile.x && b.tile.y === tile.y;
    }) ?? null
  );
};

/** What selecting a collapsed group's box selects: its unlocked members. */
export const collapsedGroupMembers = (
  view: View,
  groupId: string
): ItemReference[] => {
  return groupMembers(view, groupId).filter((ref) => {
    return !isLocked(view, ref);
  });
};
