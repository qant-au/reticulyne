# Vendored A* (`src/vendor/pathfinder`)

Reticulyne previously depended on the `pathfinding` npm package
(`^0.4.18`) for connector auto-routing (FEA7-02). That package is
pre-1.0 and has had no upstream release since 2022, so any future
advisory has no patch path. The CommonJS-interop pain it introduced
also required a dedicated `src/__tests__/mocks/pathfindingMock.js`
shim. SEC-04 swaps it for this minimal in-tree A*.

## Upstream

- Reference: <https://github.com/qiao/PathFinding.js>
- Last reviewed: 2026-06-09 against upstream `master`.
- npm version replaced: `pathfinding@0.4.18`.

## Vendored subset

The single call site
(`src/utils/pathfinder.ts` → `src/utils/connector.ts:20`) only ever
exercised:

- `new Grid(width, height)` with `setWalkableAt(x, y, walkable)`,
- `new AStarFinder({ heuristic: manhattan, diagonalMovement: Always })`
  and its `findPath(x1, y1, x2, y2, grid)` returning `Array<[x, y]>`.

`astar.ts` re-implements only that: a `Grid` class backed by a
`Uint8Array` walkable bitmap and a `findPath()` function with the
Manhattan heuristic, 8-directional movement, and diagonal step cost
`√2`. No alternative finders, no biased heuristics, no jump-point
search, no smoother / interpolator.

## Local modifications

None vs. the documented subset. The implementation is a clean rewrite
in TypeScript; we didn't fork upstream files.

## Closure criterion

Drop the vendor and pull in a maintained graph-routing library if
Reticulyne grows to need other algorithms (jump-point search, bias
toward existing edges, weighted obstacles, etc.). For the current
"route around node obstacles" use case the A* subset is enough.

## ESLint / build notes

`eslint.config.js` already ignores `src/vendor/**`. The file does
still get type-checked by `tsc --noEmit` (lint script) and by the
publish-time `tsc -p tsconfig.build.json`.
