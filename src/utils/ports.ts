import type { Coords, Scroll, Size } from 'src/types';
import { getTilePosition } from './coordinates';

// ROADMAP 2.1 / 2.5: a node's four ports sit on the midpoints of its
// tile's edges. This is their screen-space geometry, shared by the
// hotspot renderer (what to show) and the interaction modes (what a
// press or a release is aiming at), so the two can never disagree.

const EDGES = [
  ['TOP', 'RIGHT'],
  ['RIGHT', 'BOTTOM'],
  ['BOTTOM', 'LEFT'],
  ['LEFT', 'TOP']
] as const;

interface View {
  zoom: number;
  scroll: Scroll;
  rendererSize: Size;
}

const toScreen = (p: Coords, { zoom, scroll, rendererSize }: View) => {
  return {
    x: rendererSize.width / 2 + scroll.position.x + p.x * zoom,
    y: rendererSize.height / 2 + scroll.position.y + p.y * zoom
  };
};

/** Screen positions of the four ports of the node on `tile`. */
export const getPortScreenPositions = (tile: Coords, view: View): Coords[] => {
  return EDGES.map(([a, b]) => {
    const pa = getTilePosition({ tile, origin: a });
    const pb = getTilePosition({ tile, origin: b });
    return toScreen({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, view);
  });
};

/**
 * Capture radius in screen px: 12, as specified, but never more than a
 * third of the centre-to-port distance. At low zoom a fixed 12 px would
 * cover the whole node and turn every drag into a connector.
 */
export const getPortRadius = (view: View) => {
  const c = toScreen(getTilePosition({ tile: { x: 0, y: 0 } }), view);
  const [p] = getPortScreenPositions({ x: 0, y: 0 }, view);
  return Math.min(12, Math.hypot(p.x - c.x, p.y - c.y) / 3);
};

/**
 * The node whose port is under `screen`, if any. A port is on a shared
 * edge, so the pointer can be over the neighbouring tile: the caller
 * passes every node near the pointer, not just the one on its tile.
 */
export const getNodeAtPort = <T extends { id: string; tile: Coords }>(
  screen: Coords,
  nodes: T[],
  view: View
): T | null => {
  const r = getPortRadius(view);
  for (const node of nodes) {
    const hit = getPortScreenPositions(node.tile, view).some((p) => {
      return Math.hypot(p.x - screen.x, p.y - screen.y) <= r;
    });
    if (hit) return node;
  }
  return null;
};

/** Nodes on `tile` or on one of its four edge neighbours. */
export const nodesNearTile = <T extends { tile: Coords }>(
  tile: Coords,
  nodes: T[]
): T[] => {
  return nodes.filter((n) => {
    return Math.abs(n.tile.x - tile.x) + Math.abs(n.tile.y - tile.y) <= 1;
  });
};

/**
 * For interaction modes: the node whose port is under the pointer, using
 * the handler state's own mouse, zoom, scroll and renderer size.
 */
export const getNodeAtPointerPort = <
  T extends { id: string; tile: Coords }
>(state: {
  mouse: { position: { screen: Coords; tile: Coords } };
  zoom: number;
  scroll: Scroll;
  rendererSize: Size;
  nodes: T[];
}): T | null => {
  const { mouse, zoom, scroll, rendererSize, nodes } = state;
  return getNodeAtPort(
    mouse.position.screen,
    nodesNearTile(mouse.position.tile, nodes),
    { zoom, scroll, rendererSize }
  );
};
