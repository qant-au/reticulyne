# Vendored icon packs (`src/vendor/isopacks`)

Reticulyne previously depended on the `@isoflow/isopacks` npm package for
its bundled icon collections. The compiled distribution files were copied
in-tree to remove the external dependency (the package is pre-1.0 and shares
the unmaintained-upstream risk that motivated SEC-04's pathfinder vendor).
This `VENDOR.md` records provenance so a future maintainer can evaluate
whether to re-sync or whether a hypothetical advisory applies (SEC-06).

## Upstream

- npm package: `@isoflow/isopacks`
- Reference: <https://www.npmjs.com/package/@isoflow/isopacks>
- Version vendored: `0.0.10`
  (resolved from `https://registry.npmjs.org/@isoflow/isopacks/-/isopacks-0.0.10.tgz`).
- Vendored: 2026-05-16, repo commit `c21dd91`
  (`chore: vendor @isoflow/isopacks into src/vendor/isopacks`).
- Last reviewed: 2026-06-09.

## Vendored subset

The compiled `dist` output (minified JS + TypeScript `.d.ts` declarations)
for the five bundled collections, copied verbatim:

| File | Pack id | Name | Icons |
|------|---------|------|-------|
| `isoflow.js` | `isoflow` | Isoflow | 37 |
| `aws.js` | `aws` | AWS | 320 |
| `azure.js` | `azure` | Azure | 448 |
| `gcp.js` | `gcp` | GCP | 217 |
| `kubernetes.js` | `kubernetes` | Kubernetes | 40 |

Plus `utils/index.js` (the `flattenCollections` helper) and `types.d.ts`.
Every icon's image data is an inlined `data:image/svg+xml;base64,…` URI; the
packs reference no external image origins. The `isoflow` pack id is preserved
as-is for back-compat (see CHANGELOG / `docs/isopacks.md`), even though the
project itself was renamed to Reticulyne.

## Local modifications

None to the vendored files — they are the upstream `dist` artefacts copied
byte-for-byte. The only change at vendor time was repointing
`src/examples/initialData.ts` imports from `@isoflow/isopacks` to
`src/vendor/isopacks/`; the plugin contract is unchanged (any collection of
the same shape can still be passed in alongside or instead of these).

## Closure criterion

Re-sync (or drop) if upstream `@isoflow/isopacks` ships a meaningful icon
update worth pulling, or if the bundled packs are replaced by a host-supplied
`iconCollections` strategy. Because the assets are self-contained inlined
`data:` SVGs with no runtime code path beyond `flattenCollections`, there is
no advisory surface to track here — the closure trigger is content freshness,
not security.

## ESLint / build notes

`eslint.config.js` already ignores `src/vendor/**`. The `.d.ts` files are
still consumed by `tsc --noEmit` (lint) and the publish-time
`tsc -p tsconfig.build.json`.
