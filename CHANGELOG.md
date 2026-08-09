# Changelog

All notable changes to `@qant-au/reticulyne` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Versioning policy (0.x).** While the package is on a `0.x` line, minor
releases may include breaking changes to props, the `useReticulyne()` return
shape, or exported types — this is permitted by SemVer for pre-1.0 versions.
`v1.0.0` will mark API stabilisation. Until then, treat every minor release as
potentially breaking and read the release notes before upgrading.

## [Unreleased]

### Added — real multi-select (ROADMAP 1.4)

Selection is no longer one item at a time.

- **`Shift`+click** adds an item to the selection, or removes it if already in.
- **Marquee drag** on empty canvas selects everything the band touches;
  `Shift`+drag unions with the existing selection. Intersection, not
  containment — a band crossing a large rectangle catches it.
- **`Ctrl/Cmd+A`** selects every item, text box, connector and rectangle on
  the view. Connector anchors are excluded; they are sub-parts, selected only
  by dragging one directly.
- **Delete, nudge and drag** apply to the whole selection. A dragged or nudged
  group keeps its internal spacing.
- **Multi-edit inspector panel** when more than one item is selected: type
  breakdown, Delete, and layer order. Layer order acts on **rectangles only**
  — the reducer still throws for other kinds (ROADMAP 1.3) — and the panel
  says so when the selection is mixed.
- **`Shift+2`** fits the viewport to the selection (`Shift+1` / `F` still fit
  the whole diagram).

The selection lives in a new `selection: ItemReference[]` slice on the UI
store. `itemControls` is unchanged in shape and remains the single inspector
target; the store writes the two together so they cannot drift. Existing
consumers of `itemControls` needed no changes.

`Ctrl/Cmd+C`, `Ctrl/Cmd+X` and `Ctrl/Cmd+D` deliberately stay **single-item**,
acting on the most recently selected item: the clipboard slice holds one entry
by construction. The `?` dialog labels them "active item" rather than implying
they cover the selection.

### Changed — tool hotkeys realigned onto Excalidraw's (UXA-01)

**Breaking for anyone with the old keys in muscle memory or in their own
docs.** An operator moving between an Excalidraw canvas and this one should
not be retrained, so the tool layer now matches Excalidraw's, letter and
number alike.

| Action | Was | Now |
|---|---|---|
| Connector | `C` | `A`, `C`, `5` |
| Add item | `A` | `I`, `9` |
| Select | `V`, `S` | `V`, `S`, `1` |
| Rectangle | `R` | `R`, `2` |
| Text | `T` | `T`, `8` |
| Reset zoom | bare `0` or `1` | `Ctrl/Cmd+0` |
| Fit to view | `F` | `F`, `Shift+1` |
| Toggle item highlighting | `I` | `Alt+I` |

Bare `0` and `1` are no longer zoom keys — they belong to Excalidraw's tool
row, and that collision was the single worst source of friction. `Ctrl/Cmd+=`
and `Ctrl/Cmd+-` join the existing bare `=` / `-` as zoom aliases.
`Ctrl/Cmd+X` (cut) is new (UXA-04).

Excalidraw's `D` / `O` / `L` / `P` / `E` (diamond, ellipse, line, freedraw,
eraser) stay unbound: free-form vector tools with no meaning on a tile-based
isometric grid.

### Fixed — dragging, panning and rectangle-drawing were silently dead

`getMouse` switched on the legacy `mousedown` / `mousemove` event names, but
the editor migrated to the Pointer Events API in FEA10-01 and dispatches
`pointerdown` / `pointermove` / `pointerup`. Every event fell through to the
`default` branch, so `mouse.mousedown` was pinned at `null` and every code
path guarding on it did nothing: `DragItems`, `Pan`, `DrawRectangle` — and,
once written, the new marquee. Found while building 1.4, which cannot work
without it. No test covered it because none dispatched real pointer events at
`getMouse`; `src/utils/__tests__/coordinates.pointer.test.ts` now does.

### Security

- **Icon URL scheme allowlist (SEC-01).** `iconSchema.url` now rejects schemes
  other than `http(s):`, `blob:`, relative paths, and image-only `data:` URIs
  (`png`/`jpeg`/`gif`/`webp`/`svg+xml`). Models carrying `javascript:`, `file:`,
  or non-image `data:` icon URLs that previously validated will now fail schema
  validation (routed to `onValidationError`). SVG icons inlined during SVG export
  are additionally stripped of `<script>`, `<foreignObject>`, and `on*` handlers.
  This is a 0.x-permitted breaking change (see the versioning policy above).

## [0.1.0] - 2026-06-09

The renamed identity. This is **a naming reset, not a content reset** — the
codebase that shipped through `@qant-au/isoflow` v1.x–v4.7.0 continues here as
Reticulyne v0.1.0. The technical lineage is unbroken; the semantic-version
line restarts because the package name did.

### Renamed

- **Package**: `@qant-au/isoflow` → `@qant-au/reticulyne` (GitHub Packages).
- **Component**: `Isoflow` → `Reticulyne` (named + default export). Public
  imports change: `import Reticulyne from '@qant-au/reticulyne'`.
- **Hook**: `useIsoflow` → `useReticulyne` — same return shape and semantics.
  This is a clean rename with **no back-compat alias**: `useIsoflow` is not
  re-exported, so every call site raises a TypeScript error until you rename the
  import. Update `import { useIsoflow }` → `import { useReticulyne }`.
- **Props interface**: `IsoflowProps` → `ReticulyneProps`. Same fields.
- **Error boundary**: `IsoflowErrorBoundary` → `ReticulyneErrorBoundary`
  (file + directory + class rename).
- **Browser globals**: `window.Isoflow` → `window.Reticulyne` (the Docker SPA's
  imperative helper); `window.__ISOFLOW_E2E__` → `window.__RETICULYNE_E2E__`
  (Playwright harness only).
- **Docker containers**: `isoflow` / `isoflow-examples` → `reticulyne` /
  `reticulyne-examples`. Host ports (2222 / 2223) unchanged.
- **CSP `img-src`**: removed `https://isoflow.io` and
  `https://static.isoflow.io` from `docker/nginx.conf`. The two demo
  fixtures that previously referenced those URLs are now inline
  `data:image/svg+xml` SVGs. Embedders shipping icon collections that
  reference those external origins must self-host or migrate to
  `data:`/`blob:` URIs in their `iconCollections` payload.

### Reset

- **Version**: `4.7.0` (under prior name) → `0.1.0` (under new name).
  The v4 modernisation arc is preserved in the README's "Pre-rename
  development history" section and remains queryable in `git log`.

### Preserved

- **Fork attribution**: Mark Mankarious's MIT copyright stays in `LICENSE`;
  the README's "Succession from Isoflow" section retains the upstream link.
- **`src/vendor/isopacks/isoflow.js`**: the vendored upstream icon pack
  (parallel to AWS / Azure / GCP / Kubernetes) keeps its name and pack-ID
  so existing diagrams that reference `iconCollection: 'isoflow'` continue
  to render.

### Notes

Rationale for the rename and the framing as **succession, not forking** lives
in the README's "Succession from Isoflow" section. The commit-level audit
trail is `git log --grep '^[a-z]*(RNM-' main` — the full chain runs
`RNM-01` through `RNM-09`, one commit per task ID, no rewrites or amends.
The package is published to GitHub Packages
(`registry: https://npm.pkg.github.com/`).

**Note on deprecation of the prior name.** GitHub Packages' npm registry
does not currently support `npm deprecate` — the `PUT` to update the
packument returns `400 Bad Request: version.ID cannot be empty`. Consumers
still installing `@qant-au/isoflow` are redirected via the package's
`repository.url` (which now points at `qant-au/reticulyne`) and via this
release's GitHub Releases entry. A registry-level deprecation marker will
be revisited if GitHub Packages adds support, or if the package migrates
to the public npm registry.

## Pre-rename history

This project shipped as `@qant-au/isoflow` from v1.0.0 through v4.7.0 — see
the README's **"Pre-rename development history"** section for the v4
modernisation arc (test surface, security hardening, dark-mode pass, SVG/PDF
export, per-rectangle styling, 8-directional routing, embedding isolation).
The pre-rename git tags (`v4.1.0`–`v4.6.0`) remain on this repository as
historical pointers.
