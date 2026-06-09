// A* on a rectangular grid with 8-directional movement and Manhattan
// heuristic. Vendored under SEC-04 to drop the unmaintained `pathfinding`
// dependency (last upstream release ~2022, pre-1.0, no patch path for
// any future advisory). See ./VENDOR.md for provenance.
//
// Exposes only the subset Reticulyne actually used:
//   new Grid(width, height)
//   grid.setWalkableAt(x, y, walkable)
//   findPath(startX, startY, endX, endY, grid) → [[x, y], …]
//
// The result shape (Array<[x, y]>) matches `pathfinding.AStarFinder`
// so src/utils/pathfinder.ts didn't need to change beyond the import.

const DIRS: Array<[number, number, number]> = [
  // dx, dy, cost
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];

export class Grid {
  readonly width: number;

  readonly height: number;

  private readonly walkable: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walkable = new Uint8Array(width * height).fill(1);
  }

  setWalkableAt(x: number, y: number, walkable: boolean): void {
    if (!this.inBounds(x, y)) return;
    this.walkable[y * this.width + x] = walkable ? 1 : 0;
  }

  isWalkableAt(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return this.walkable[y * this.width + x] === 1;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}

interface Node {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
}

const manhattan = (
  ax: number,
  ay: number,
  bx: number,
  by: number
): number => {
  return Math.abs(ax - bx) + Math.abs(ay - by);
};

// Minimum-heap keyed on Node.f. Tiny ad-hoc impl — the queue stays
// small in practice (bounded by visited tiles in a small grid).
class MinHeap {
  private readonly data: Node[] = [];

  push(node: Node): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): Node | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last !== undefined) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f < this.data[parent].f) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else {
        return;
      }
    }
  }

  private bubbleDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) return;
      [this.data[i], this.data[smallest]] = [
        this.data[smallest],
        this.data[i]
      ];
      i = smallest;
    }
  }
}

export const findPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  grid: Grid
): Array<[number, number]> => {
  if (!grid.isWalkableAt(startX, startY) || !grid.isWalkableAt(endX, endY)) {
    return [];
  }

  const visited = new Uint8Array(grid.width * grid.height);
  const open = new MinHeap();
  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    f: manhattan(startX, startY, endX, endY),
    parent: null
  };
  open.push(startNode);

  while (open.size > 0) {
    const current = open.pop();
    if (!current) break;
    if (current.x === endX && current.y === endY) {
      const path: Array<[number, number]> = [];
      for (let n: Node | null = current; n; n = n.parent) {
        path.unshift([n.x, n.y]);
      }
      return path;
    }
    visited[current.y * grid.width + current.x] = 1;

    for (let i = 0; i < DIRS.length; i += 1) {
      const [dx, dy, cost] = DIRS[i];
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!grid.isWalkableAt(nx, ny)) continue;
      if (visited[ny * grid.width + nx]) continue;
      const g = current.g + cost;
      const f = g + manhattan(nx, ny, endX, endY);
      open.push({ x: nx, y: ny, g, f, parent: current });
    }
  }
  return [];
};
