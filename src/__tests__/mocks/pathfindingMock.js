// Jest module mock for the `pathfinding` package.
//
// Why this exists: pathfinding is a CommonJS module that exports its
// public API directly on `module.exports` (no `default` key). The
// project's `tsconfig.json` enables `allowSyntheticDefaultImports`
// (for editor / webpack ergonomics) but not `esModuleInterop`, so
// ts-jest emits `pathfinding_1.default` for `import PF from
// 'pathfinding'`. That resolves to `undefined` at runtime and any
// `PF.Grid(...)` blows up before the hook under test can do anything
// observable.
//
// Real Isoflow only uses pathfinding to compute connector tile-paths
// (`findPath` in `src/utils/pathfinder.ts`, called by
// `getConnectorPath` during `syncConnector` / `syncScene`). Test code
// doesn't care about the exact path; it just needs the call to return
// an array so the downstream `[...acc, ...path]` spread succeeds.
//
// This mock returns an empty path, which is enough to keep the
// reducer chain alive in tests that hydrate a model containing
// connectors. The `default` property mirrors the import shape the
// transpiled CJS expects.
const PF = {
  Grid: function Grid() {},
  AStarFinder: function AStarFinder() {
    return {
      findPath: () => {
        return [];
      }
    };
  },
  Heuristic: { manhattan: 'manhattan' },
  DiagonalMovement: { Always: 'always' }
};

module.exports = PF;
module.exports.default = PF;
