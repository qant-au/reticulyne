---
project: reticulyne
display_name: Reticulyne
type: other
prefix: iso
---

# Reticulyne TODO
- [x] Verify GitHub Dependabot alerts have cleared on the default branch after the v0.2.0 release — the Quill XSS advisory GHSA-v3m3-f69x-jf25 that motivated the TipTap migration, plus the DEP-06 dompurify / http-proxy-middleware moderates @due(2026-08-03) @id(iso-001)
  verified: quill #135 + DEP-06 moderates #140/#141 all now fixed; they were stale-open on a dependency graph frozen pre-v0.2.0, refreshed by the DEP-07 lockfile push. 0 runtime-scope alerts remain; 5 dev-only tracked as iso-002
- [x] Bump the dev toolchain to clear the 5 residual dev-only Dependabot alerts — postcss >=8.5.18 (#153), js-yaml >=4.3.0 (#149, the existing ^4.2.0 override now pins the vulnerable release), shell-quote >=1.9.0 (#146), webpack-dev-server >=5.2.6 (#150, #151). All in-major patches. Zero runtime-scope alerts remain; the accepted brace-expansion GHSA-mh99-v99m-4gvg residual is documented in SECURITY.md DEP-07 @due(2026-08-24) @id(iso-002)
  shipped in 354d65e (DEP-08) — postcss 8.5.23, shell-quote 1.10.0, js-yaml 4.3.0, wds 5.2.6, body-parser 1.20.6; no new overrides needed, all within declared ranges. Dependabot board now 0 open alerts
- [x] Mirror Excalidraw keyboard shortcuts — UXA-01 tool hotkey realignment plus ROADMAP 1.4 multi-select. Split out of qant-private-modules mdls-005, which closed on the Blueprint→Drafts absorption; this is the rider that repo could not carry because the code lives here. Already MATCH, out of scope: Cmd+Z / Cmd+Shift+Z / Ctrl+Y undo-redo, R rectangle, T text, H hand, Ctrl+D duplicate, Delete, arrow nudge, ? dialog. Excalidraw's D/O/L/P/E (diamond, ellipse, line, freedraw, eraser) are DOMAIN divergences with no isometric equivalent — leave unbound. UXA-01: add 1/2/5/8/9 number aliases, move A to connector, I to add-item, Ctrl+0 reset zoom (freeing bare 0/1 for the tool layer), Ctrl+= / Ctrl+- zoom aliases, Shift+1 fit-to-view; update KeyboardShortcutsDialog rows. 1.4: widen itemControls in src/stores/uiStateStore.tsx from a single ItemReference to a discriminated array, shift-click extend and marquee drag-select in src/interaction/modes/Cursor.ts, multi-edit ItemControls panel, group nudge/delete/drag. Full audit table and approach sketches: ROADMAP.md UXA-01 and section 1.4. @effort(1d UXA-01 + 2-3d multi-select) @due(2026-09-07) @id(iso-003)
  shipped in 48f0d76 + 5fa50e7 + f2b4fbc. UXA-01 (tool hotkeys onto Excalidraw's, plus UXA-04 cut and UXA-07 select-all/fit-to-selection) and ROADMAP 1.4 (selection slice, shift-click, marquee, group drag/nudge/delete, multi-edit panel). Blocker found and fixed first: getMouse ignored pointer events since FEA10-01, so DragItems/Pan/DrawRectangle were all silently dead. 474 unit tests green (up from 397), 7 new browser e2e green. Left open and noted in ROADMAP: bulk colour (per-type), layer order for non-rectangles (1.3), multi-item clipboard
- [x] ROADMAP 1.3 layer ordering for rectangles, connectors and text boxes, plus UXA-06 hotkeys @due(2026-09-27) @id(iso-004)
  shipped in bb012d9 + 17a76d9 (FEA14-01): reducer, inspector, multi-select, context menu, UXA-06 hotkeys; nodes deliberately excluded (depth-sorted). 495 unit, 39/39 e2e
- [x] ROADMAP 1.2 diagram title in the UI and the API @due(2026-09-27) @id(iso-005)
  shipped in FEA14-02: rename dialog, getTitle/setTitle, optional title, JSON export named after it. 508 unit, 41/41 e2e
- [x] ROADMAP 2.1 connector hotspots + 2.2 double-click to add @due(2026-09-28) @id(iso-006)
  shipped in c9010ac (2.1 hotspots, visual only: edge snapping needs an anchor-side schema field) + b8d2ab8 (2.2 dblclick add)
- [x] ROADMAP 2.3 save status, dirty state and opt-in auto-save @due(2026-09-28) @id(iso-007)
  shipped in FEA14-05; autoSaveDebounce opt-in (default false). 516 unit, 48/48 e2e
- [x] ROADMAP 2.5 drag from a port to draw a connector @due(2026-09-28) @id(iso-008)
  shipped in FEA14-06: port drag to connect; ends resolved by port and at release. 50/50 e2e
- [x] Multi-select follow-ups: bulk colour and multi-item clipboard @due(2026-09-28) @id(iso-009)
  shipped in FEA14-07 (clipboard) + FEA14-08 (bulk colour); duplicate stays single-item. 518 unit, 52/52 e2e
- [x] Excalidraw parity remainder (UXA-02, -03, -05, -08) and ROADMAP 2.12 pinch to zoom @due(2026-09-28) @id(iso-010)
  shipped: UXA-08, UXA-02/03 + 2.12, UXA-05. 1.7 grouping and 2.11 palette left for their own items. 57/57 e2e
- [x] Worklist 29 + 28: post-menu click / pointer lag fix; ROADMAP 3.1 tooltip and 3.2 align/distribute @due(2026-09-28) @id(iso-011)
  114d0d9 (29), FEA14-10 (3.1), FEA14-11 (3.2); 3.3-3.6 deliberately not started, reasons in ROADMAP
- [x] Worklist 21-24: ROADMAP 1.5/1.6 imperative API, 2.7 find, 2.8 mini-map, 2.9 guides, 2.11 icon library @due(2026-09-28) @id(iso-012)
  shipped in 9a3daee, c0071f5, 6651a5c
- [x] Worklist 25-27: 2.13 icon upload, 2.14 templates, 1.7 grouping, APP-01 saved diagrams, APP-02 PWA @due(2026-09-28) @id(iso-013)
  shipped in 78d56c5, 539e3e0, 8f03114, fc9f319, 6c4e5d8, 701d32c, 7bdfe30

