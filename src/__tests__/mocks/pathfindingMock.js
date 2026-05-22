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
// FEA7-02: obstacle-aware connector auto-routing made path contents
// load-bearing for tests, so this mock now delegates straight through
// to the real library (with a `default` property attached so the
// transpiled CJS import shape still works). Existing tests that only
// needed `findPath` to return *something* still pass; new tests can
// rely on real A* behaviour including `setWalkableAt`.
const path = require('path');
const realPF = require(
  path.join(__dirname, '..', '..', '..', 'node_modules', 'pathfinding')
);

module.exports = realPF;
module.exports.default = realPF;
