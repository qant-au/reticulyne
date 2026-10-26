// Tiles for an imported flowchart. Mermaid lays a flowchart out itself
// when it renders; a Reticulyne diagram keeps positions, so an import has
// to choose them. This is a small layered layout (after Sugiyama):
//
//  1. ranks: each node one rank past every node linking to it (a link
//     written longer, `--->`, spans more ranks), cycles broken at the
//     links that close them;
//  2. bands: every subgraph gets its own strip across the flow, wide
//     enough for its widest rank, nested inside its parent's strip, so a
//     subgraph's box never takes in another's nodes;
//  3. order: within a strip, each rank is sorted by the mean position of
//     the nodes it links to (barycentres), a few sweeps each way, which
//     takes out most crossings.
//
// The flow runs along +x for LR (the reading direction on screen in both
// the iso and the flat view), -y for TB, and the reverse for RL and BT.

import type { Tile } from 'src/core';
import type { FlowDirection } from './parse';

export interface LayoutInput {
  direction: FlowDirection;
  nodes: string[];
  /** Links, invisible ones included: they shape the layout too. */
  edges: { from: string; to: string; length?: number }[];
  /** Subgraphs, each with its parent and its own (direct) member nodes. */
  groups: { id: string; parent?: string; nodes: string[] }[];
}

/** Tiles between ranks, and between nodes side by side in a rank. */
export const RANK_STEP = 3;
export const CROSS_STEP = 3;
/** Tiles between two subgraphs' strips. */
export const BAND_GAP = 2;

interface Band {
  id: string;
  nodes: string[];
  children: Band[];
  /** Width across the flow, in tiles, padding included. */
  width: number;
  // Where the strip starts, and where its own nodes start inside it.
  start: number;
  offset: number;
  pad: number;
}

/**
 * Ranks along the flow: longest path from a source, each link adding its
 * length. Links that close a cycle (found by a depth-first walk in node
 * order) are left out of the ranking, so every node gets a rank.
 */
export const rankNodes = (
  nodes: string[],
  edges: LayoutInput['edges']
): Map<string, number> => {
  const out = new Map<string, { to: string; length: number }[]>();
  for (const n of nodes) out.set(n, []);
  for (const e of edges) {
    if (e.from !== e.to && out.has(e.from) && out.has(e.to)) {
      out.get(e.from)!.push({ to: e.to, length: Math.max(1, e.length ?? 1) });
    }
  }
  // Back edges, by an iterative DFS (a long chain must not overflow).
  const state = new Map<string, 0 | 1 | 2>();
  const forward = new Map<string, { to: string; length: number }[]>();
  for (const n of nodes) forward.set(n, []);
  for (const root of nodes) {
    if (state.get(root)) continue;
    const stack: [string, number][] = [[root, 0]];
    state.set(root, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [node, i] = top;
      const next = out.get(node)![i];
      if (!next) {
        state.set(node, 2);
        stack.pop();
        continue;
      }
      top[1] += 1;
      const s = state.get(next.to) ?? 0;
      if (s === 1) continue; // closes a cycle: not used for ranks
      forward.get(node)!.push(next);
      if (s === 0) {
        state.set(next.to, 1);
        stack.push([next.to, 0]);
      }
    }
  }
  // Longest path over the acyclic links, in topological order.
  const indegree = new Map<string, number>();
  for (const n of nodes) indegree.set(n, 0);
  for (const list of forward.values()) {
    for (const e of list) indegree.set(e.to, indegree.get(e.to)! + 1);
  }
  const rank = new Map<string, number>();
  const queue = nodes.filter((n) => {
    return indegree.get(n) === 0;
  });
  for (const n of queue) rank.set(n, 0);
  for (let i = 0; i < queue.length; i += 1) {
    const n = queue[i];
    for (const e of forward.get(n)!) {
      rank.set(e.to, Math.max(rank.get(e.to) ?? 0, rank.get(n)! + e.length));
      indegree.set(e.to, indegree.get(e.to)! - 1);
      if (indegree.get(e.to) === 0) queue.push(e.to);
    }
  }
  return rank;
};

/** Tiles for every node, and each subgraph's box (padding included). */
export const layoutFlowchart = (
  input: LayoutInput
): {
  tiles: Map<string, Tile>;
  boxes: Map<string, { from: Tile; to: Tile }>;
} => {
  const rank = rankNodes(input.nodes, input.edges);

  // Bands: the root strip, and one per subgraph, nested.
  const bands = new Map<string, Band>();
  const root: Band = {
    id: '',
    nodes: [],
    children: [],
    width: 0,
    start: 0,
    offset: 0,
    pad: 0
  };
  for (const g of input.groups) {
    bands.set(g.id, {
      id: g.id,
      nodes: [...g.nodes],
      children: [],
      width: 0,
      start: 0,
      offset: 0,
      pad: 0
    });
  }
  const inGroup = new Set<string>();
  for (const g of input.groups) {
    const band = bands.get(g.id)!;
    const parent = (g.parent && bands.get(g.parent)) || root;
    parent.children.push(band);
    for (const n of g.nodes) inGroup.add(n);
  }
  root.nodes = input.nodes.filter((n) => {
    return !inGroup.has(n);
  });

  // Each band's node order per rank; starts in declaration order.
  const order = new Map<Band, Map<number, string[]>>();
  const allBands = [root, ...bands.values()];
  for (const band of allBands) {
    const byRank = new Map<number, string[]>();
    for (const n of band.nodes) {
      const r = rank.get(n) ?? 0;
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r)!.push(n);
    }
    order.set(band, byRank);
  }
  const directWidth = (band: Band) => {
    let most = 0;
    for (const list of order.get(band)!.values()) {
      most = Math.max(most, list.length);
    }
    return most ? (most - 1) * CROSS_STEP + 1 : 0;
  };
  // Widths and padding, innermost first.
  const measure = (band: Band): void => {
    for (const child of band.children) measure(child);
    const parts = [
      directWidth(band),
      ...band.children.map((c) => {
        return c.width;
      })
    ].filter((w) => {
      return w > 0;
    });
    const inner =
      parts.reduce((a, b) => {
        return a + b;
      }, 0) +
      Math.max(0, parts.length - 1) * BAND_GAP;
    Object.assign(band, {
      pad:
        band === root
          ? 0
          : 1 +
            band.children.reduce((m, c) => {
              return Math.max(m, c.pad);
            }, 0),
      width: Math.max(1, inner) + (band === root ? 0 : 2)
    });
  };
  measure(root);
  const place = (band: Band, offset: number): void => {
    let at = offset + (band === root ? 0 : 1);
    const direct = directWidth(band);
    // The band's own nodes first, then each child strip.
    const nodesAt = at;
    if (direct) at += direct + BAND_GAP;
    for (const child of band.children) {
      place(child, at);
      at += child.width + BAND_GAP;
    }
    Object.assign(band, { start: offset, offset: nodesAt });
  };
  place(root, 0);

  // Cross positions: the band's start plus the node's slot in its rank.
  const cross = new Map<string, number>();
  const assign = () => {
    for (const band of allBands) {
      for (const list of order.get(band)!.values()) {
        list.forEach((n, i) => {
          cross.set(n, band.offset + i * CROSS_STEP);
        });
      }
    }
  };
  assign();

  // Barycentre sweeps, down and up the ranks.
  const neighbours = new Map<string, string[]>();
  for (const n of input.nodes) neighbours.set(n, []);
  for (const e of input.edges) {
    if (e.from === e.to) continue;
    neighbours.get(e.from)?.push(e.to);
    neighbours.get(e.to)?.push(e.from);
  }
  const maxRank = Math.max(0, ...rank.values());
  for (let sweep = 0; sweep < 4; sweep += 1) {
    const ranks = Array.from({ length: maxRank + 1 }, (_, i) => {
      return sweep % 2 === 0 ? i : maxRank - i;
    });
    for (const r of ranks) {
      for (const band of allBands) {
        const list = order.get(band)!.get(r);
        if (!list || list.length < 2) continue;
        const score = new Map<string, number>();
        for (const n of list) {
          const near = neighbours.get(n)!.filter((m) => {
            const mr = rank.get(m) ?? 0;
            return sweep % 2 === 0 ? mr < r : mr > r;
          });
          score.set(
            n,
            near.length
              ? near.reduce((s, m) => {
                  return s + cross.get(m)!;
                }, 0) / near.length
              : cross.get(n)!
          );
        }
        list.sort((a, b) => {
          return score.get(a)! - score.get(b)!;
        });
        list.forEach((n, i) => {
          cross.set(n, band.offset + i * CROSS_STEP);
        });
      }
    }
  }

  // Onto the tile grid, flow axis by direction, centred on the origin.
  const span = (maxRank * RANK_STEP) / 2;
  const width = (root.width - 1) / 2;
  const toTile = (along: number, across: number): Tile => {
    const a = Math.round(along - span);
    const c = Math.round(across - width);
    switch (input.direction) {
      case 'LR':
        return { x: a, y: -c };
      case 'RL':
        return { x: -a, y: -c };
      case 'BT':
        return { x: c, y: a };
      default:
        return { x: c, y: -a };
    }
  };
  const tiles = new Map<string, Tile>();
  for (const n of input.nodes) {
    tiles.set(n, toTile((rank.get(n) ?? 0) * RANK_STEP, cross.get(n) ?? 0));
  }

  // Each subgraph's box: its nodes' extent, padded by its depth of nesting.
  const boxes = new Map<string, { from: Tile; to: Tile }>();
  const members = (band: Band): string[] => {
    return [...band.nodes, ...band.children.flatMap(members)];
  };
  for (const band of bands.values()) {
    const ns = members(band);
    if (!ns.length) continue;
    const along = ns.map((n) => {
      return (rank.get(n) ?? 0) * RANK_STEP;
    });
    const a0 = Math.min(...along) - band.pad;
    const a1 = Math.max(...along) + band.pad;
    const corners = [
      toTile(a0, band.start),
      toTile(a1, band.start + band.width - 1)
    ];
    boxes.set(band.id, {
      from: {
        x: Math.min(corners[0].x, corners[1].x),
        y: Math.min(corners[0].y, corners[1].y)
      },
      to: {
        x: Math.max(corners[0].x, corners[1].x),
        y: Math.max(corners[0].y, corners[1].y)
      }
    });
  }
  return { tiles, boxes };
};
