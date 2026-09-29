import type { Coords, ItemReference } from 'src/types';

// align and distribute a multi-selection. The isometric grid
// has no screen "left" or "top", so both work along the tile axes: align
// puts every member on the active member's X (or Y) line; distribute keeps
// the two outermost members and spaces the rest evenly between them,
// snapped to whole tiles. Pure planning, so it can be tested and so the
// panel can grey out a move before anyone makes it.

export type ArrangeOp = 'ALIGN_X' | 'ALIGN_Y' | 'DISTRIBUTE_X' | 'DISTRIBUTE_Y';

export interface ArrangeMember {
  ref: ItemReference;
  /** A node or text box's tile; a rectangle's lowest corner. */
  at: Coords;
}

export interface ArrangeMove {
  ref: ItemReference;
  delta: Coords;
}

const axisOf = (op: ArrangeOp) => {
  return op.endsWith('_X') ? 'x' : 'y';
};

/**
 * The moves an arrangement needs, or null when it cannot apply: too few
 * members, or it would put two nodes on one tile (with each other or with
 * a node outside the selection). Moves of zero are left out.
 */
export const planArrangement = (
  op: ArrangeOp,
  members: ArrangeMember[],
  anchor: ItemReference | null,
  otherNodeTiles: Coords[]
): ArrangeMove[] | null => {
  const axis = axisOf(op);
  const targets = new Map<ArrangeMember, number>();

  if (op === 'ALIGN_X' || op === 'ALIGN_Y') {
    if (members.length < 2) return null;
    const lead =
      members.find((m) => {
        return anchor && m.ref.type === anchor.type && m.ref.id === anchor.id;
      }) ?? members[0];
    members.forEach((m) => {
      targets.set(m, lead.at[axis]);
    });
  } else {
    if (members.length < 3) return null;
    const sorted = [...members].sort((a, b) => {
      return a.at[axis] - b.at[axis];
    });
    const first = sorted[0].at[axis];
    const span = sorted[sorted.length - 1].at[axis] - first;
    sorted.forEach((m, i) => {
      targets.set(m, first + Math.round((span * i) / (sorted.length - 1)));
    });
  }

  const moves: ArrangeMove[] = [];
  const nodeTiles = new Set(
    otherNodeTiles.map((t) => {
      return `${t.x},${t.y}`;
    })
  );
  for (const [m, value] of targets) {
    const delta =
      axis === 'x' ? { x: value - m.at.x, y: 0 } : { x: 0, y: value - m.at.y };
    if (m.ref.type === 'ITEM') {
      const key = `${m.at.x + delta.x},${m.at.y + delta.y}`;
      if (nodeTiles.has(key)) return null;
      nodeTiles.add(key);
    }
    if (delta.x !== 0 || delta.y !== 0) moves.push({ ref: m.ref, delta });
  }
  return moves;
};
