// Connector auto-routing with aesthetic costs (ROADMAP 3.3).
//
// Same grid, same 8 moves and same step costs (1 straight, √2
// diagonal) as the vendored A* in src/vendor/pathfinder, so every
// route the old router could draw this one can draw too. What
// changes is what a route costs:
//
//   score = length + TURN_COST × turns
//
// and the search is exact for that score: the heuristic is the
// octile distance (admissible for 8-way moves, unlike the Manhattan
// heuristic the old router used), and the search state carries the
// direction it arrived in, so a turn is priced where it happens.
//
// Parallel runs come from determinism: ties are broken on fixed
// rules that depend only on relative positions, never on the heap's
// insertion order, so two connectors whose ends differ by the same
// offset get the same shape and run side by side instead of
// criss-crossing.
//
// Never worse: pathfinder.ts also asks the old router and keeps this
// route only when it is no longer and turns no more often. When the
// cheapest route here buys fewer turns with a detour, the old route
// stands.

export interface GridPoint {
  x: number;
  y: number;
}

/** A turn is worth this much extra length. */
export const TURN_COST = 0.5;

const DIRS: ReadonlyArray<readonly [number, number, number]> = [
  // dx, dy, cost. Straight moves first: on a tie, a straight run wins.
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];

const NO_DIR = -1;
const EPSILON = 1e-9;

/** The index into the move table of a unit step, or NO_DIR. */
export const directionOf = (dx: number, dy: number): number => {
  return DIRS.findIndex(([x, y]) => {
    return x === dx && y === dy;
  });
};

const octile = (ax: number, ay: number, bx: number, by: number) => {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
};

/** Length, turns and score of a route; a turn is any change of step. */
export const measureRoute = (
  path: GridPoint[],
  startDir = NO_DIR,
  endDir = NO_DIR
) => {
  let length = 0;
  let turns = 0;
  let prev = startDir;
  for (let i = 1; i < path.length; i += 1) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const dir = directionOf(dx, dy);
    length += dir === NO_DIR ? Math.hypot(dx, dy) : DIRS[dir][2];
    if (prev !== NO_DIR && dir !== prev) turns += 1;
    prev = dir;
  }
  if (endDir !== NO_DIR && prev !== NO_DIR && prev !== endDir) turns += 1;
  return { length, turns, score: length + TURN_COST * turns };
};

interface Entry {
  state: number;
  g: number;
  f: number;
  h: number;
  dir: number;
}

// Deterministic order: lower f, then lower h (closer to the goal),
// then the move-table order of the arriving step, then the state id.
const before = (a: Entry, b: Entry) => {
  if (Math.abs(a.f - b.f) > EPSILON) return a.f < b.f;
  if (Math.abs(a.h - b.h) > EPSILON) return a.h < b.h;
  if (a.dir !== b.dir) return a.dir < b.dir;
  return a.state < b.state;
};

class Heap {
  private readonly data: Entry[] = [];

  get size() {
    return this.data.length;
  }

  push(entry: Entry) {
    const { data } = this;
    data.push(entry);
    let i = data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(data[i], data[parent])) return;
      [data[i], data[parent]] = [data[parent], data[i]];
      i = parent;
    }
  }

  pop(): Entry | undefined {
    const { data } = this;
    const top = data[0];
    const last = data.pop();
    if (data.length === 0 || last === undefined) return top;
    data[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let best = i;
      if (l < data.length && before(data[l], data[best])) best = l;
      if (r < data.length && before(data[r], data[best])) best = r;
      if (best === i) return top;
      [data[i], data[best]] = [data[best], data[i]];
      i = best;
    }
  }
}

interface RouteArgs {
  width: number;
  height: number;
  from: GridPoint;
  to: GridPoint;
  /** Walkable bitmap, row-major, 1 = walkable. */
  walkable: Uint8Array;
  /** Direction the route is already travelling in when it starts. */
  startDir?: number;
  /** Direction the route must be travelling in when it ends. */
  endDir?: number;
  /** Extra length a turn is worth; defaults to TURN_COST. */
  turnCost?: number;
}

/** The lowest-scoring route from `from` to `to`, or [] when walled in. */
export const route = ({
  width,
  height,
  from,
  to,
  walkable,
  startDir = NO_DIR,
  endDir = NO_DIR,
  turnCost = TURN_COST
}: RouteArgs): GridPoint[] => {
  const cells = width * height;
  const inside = (x: number, y: number) => {
    return x >= 0 && x < width && y >= 0 && y < height;
  };
  if (!inside(from.x, from.y) || !inside(to.x, to.y)) return [];
  if (!walkable[from.y * width + from.x] || !walkable[to.y * width + to.x]) {
    return [];
  }

  // A state is a cell plus the direction it was entered in (9 slots:
  // NO_DIR and the 8 moves).
  const slots = DIRS.length + 1;
  const best = new Float64Array(cells * slots).fill(Infinity);
  const parent = new Int32Array(cells * slots).fill(-1);
  const closed = new Uint8Array(cells * slots);
  const stateOf = (cell: number, dir: number) => {
    return cell * slots + dir + 1;
  };

  const goalCell = to.y * width + to.x;
  const start = stateOf(from.y * width + from.x, startDir);
  const h0 = octile(from.x, from.y, to.x, to.y);
  best[start] = 0;
  const open = new Heap();
  open.push({ state: start, g: 0, f: h0, h: h0, dir: startDir });

  let goal = -1;
  while (open.size > 0) {
    const current = open.pop();
    if (!current) break;
    if (closed[current.state]) continue;
    closed[current.state] = 1;

    const cell = Math.floor(current.state / slots);
    if (cell === goalCell) {
      goal = current.state;
      break;
    }
    const x = cell % width;
    const y = Math.floor(cell / width);

    for (let d = 0; d < DIRS.length; d += 1) {
      const [dx, dy, step] = DIRS[d];
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(nx, ny)) continue;
      const nCell = ny * width + nx;
      if (!walkable[nCell]) continue;
      const next = stateOf(nCell, d);
      if (closed[next]) continue;

      let g = current.g + step;
      if (current.dir !== NO_DIR && current.dir !== d) g += turnCost;
      // Arriving at the goal against the required direction is one
      // more turn, charged here so the goal pop is still exact.
      if (nCell === goalCell && endDir !== NO_DIR && d !== endDir) {
        g += turnCost;
      }
      if (g >= best[next] - EPSILON) continue;
      best[next] = g;
      parent[next] = current.state;
      const h = octile(nx, ny, to.x, to.y);
      open.push({ state: next, g, f: g + h, h, dir: d });
    }
  }

  if (goal === -1) return [];
  const path: GridPoint[] = [];
  for (let s = goal; s !== -1; s = parent[s]) {
    const cell = Math.floor(s / slots);
    path.push({ x: cell % width, y: Math.floor(cell / width) });
  }
  return path.reverse();
};
