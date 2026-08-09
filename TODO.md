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
- [ ] Mirror Excalidraw keyboard shortcuts — UXA-01 tool hotkey realignment plus ROADMAP 1.4 multi-select. Split out of qant-private-modules mdls-005, which closed on the Blueprint→Drafts absorption; this is the rider that repo could not carry because the code lives here. Already MATCH, out of scope: Cmd+Z / Cmd+Shift+Z / Ctrl+Y undo-redo, R rectangle, T text, H hand, Ctrl+D duplicate, Delete, arrow nudge, ? dialog. Excalidraw's D/O/L/P/E (diamond, ellipse, line, freedraw, eraser) are DOMAIN divergences with no isometric equivalent — leave unbound. UXA-01: add 1/2/5/8/9 number aliases, move A to connector, I to add-item, Ctrl+0 reset zoom (freeing bare 0/1 for the tool layer), Ctrl+= / Ctrl+- zoom aliases, Shift+1 fit-to-view; update KeyboardShortcutsDialog rows. 1.4: widen itemControls in src/stores/uiStateStore.tsx from a single ItemReference to a discriminated array, shift-click extend and marquee drag-select in src/interaction/modes/Cursor.ts, multi-edit ItemControls panel, group nudge/delete/drag. Full audit table and approach sketches: ROADMAP.md UXA-01 and section 1.4. @effort(1d UXA-01 + 2-3d multi-select) @due(2026-09-07) @id(iso-003)

