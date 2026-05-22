# Roadmap — `@qant-au/isoflow`

> **Status:** forward-looking ledger of features under consideration before
> stabilisation. Not a commitment — items are picked up at the maintainer's
> discretion, and the catalogue evolves as the fork's two confirmed use cases
> (embedded live dashboards; consumer-built diagrams) tell us what really
> matters.

Last completed review/fix round was **FEA6** (see `README.md` and `git log`
for the historical record). The next round of feature work will land under
**`FEA7-NN`**, with each `NN` allocated at pick-up time — the same convention
`CLAUDE.md` documents for prior rounds. Bugs / docs / security work that falls
out of these features carries the matching prefix (`BUG7-NN`, `DOC7-NN`, …).

Companion documents:

- `README.md` — installation, retrospective history of completed rounds.
- `SECURITY.md` — security policy and ledger of accepted residual advisories.
- `CLAUDE.md` — task-ID convention, working agreements.
- `docs/embedding.md`, `docs/api.md` — embedder contract; any new public
  surface added here must update both.

---

## Audience and constraints

Three groups shape what belongs in which tier:

1. **Embedders building live dashboards** — host React apps that mount
   `<Isoflow>` in read-only / explorable mode and push live infra status into
   it (node colour, connector flow rate, status badges). The
   `nodeIndicatorComponent` prop (FEA5-07, `LiveDashboard` example) already
   anchors this use case; everything in Tier 1 either widens that contract or
   removes a foot-gun in it.
2. **Consumer-app end-users drawing their own diagrams** — humans inside the
   editor. They feel multi-select, grouping, snap, search, dark mode, and
   templates immediately; they don't feel the imperative API at all.
3. **Maintainer (long-tail)** — schema migrations, public-API stability, and
   keeping the door open for real-time collab without committing to it now.
   The Tier 1 ranking is driven primarily by what would force a breaking
   change later if we skipped it.

**Explicit non-goal for this round:** real-time collaboration. Several Tier 1
items (selection shape, group identity, imperative API, diff-based updates)
are designed so collab can be added later without a schema migration. That
forward-compatibility is part of the cost of each item.

---

## Review of the source recommendations

This catalogue is a re-write of a longer recommendations document produced in
a prior session, cross-checked against `main` at commit `c2c28114`. The
exploration that produced the corrections below is summarised here so future
readers can audit what changed and why.

### What the source doc got wrong or stale

1. **Selection is `itemControls`, not `selection`.** Lives at
   `src/stores/uiStateStore.tsx:32` as an `ItemReference | AddItemControls`
   union. Multi-select work (Tier 1.1) needs to widen this union, not invent
   a parallel field, and must explicitly preserve the `AddItemControls`
   branch.
2. **A right-click context menu already exists and is fully wired.**
   `src/components/ContextMenu/ContextMenuManager.tsx:55-80` already fires
   **Duplicate / Send Backward / Bring Forward / Send to Back / Bring to
   Front** against the reducer. Layer-ordering UI work (1.5) collapses to
   inspector buttons + four keyboard shortcuts.
3. **The layer-ordering reducer only handles rectangles.**
   `src/stores/reducers/layerOrdering.ts:18-19` throws for non-rectangle
   items. Tier 1.5 must extend the reducer to cover connectors, view-items,
   and text boxes — not just hook UI to existing-working logic.
4. **There are three stores plus history**, not two: `modelStore` (persistent
   model — items, views, colors, icons), `sceneStore` (runtime — connectors,
   textBoxes, connectorOverlays), `uiStateStore` (UI, including
   `nodeIndicatorComponent`), and `historyStore` (undo). Tier 1.3 and 1.4
   touch all of them.
5. **`useIsoflow()` already exists as the imperative surface.**
   `src/Isoflow.tsx:174-370` exports `getModel`, `loadModel`,
   `setEditorMode`, `setZoom`, `incrementZoom`, `decrementZoom`,
   `rendererEl`, `Connector`, plus `Model` and `uiState` escape hatches.
   Tier 1.3 *extends* this hook (and optionally adds a `forwardRef` mirror);
   it doesn't invent a new surface.
6. **The "patches skip undo" pattern is already implemented** for the one
   mutation that needs it: `updateConnector(id, updates, { recordHistory:
   false })`. `useScene.setState()` is the single chokepoint that records
   prior state. Tier 1.4 generalises this — adding `recordHistory: false` to
   sibling mutations and wrapping batched diffs — rather than starting from
   scratch.
7. **Connectors already have a `direction` field**
   (`'START_TO_END' | 'END_TO_START' | 'BOTH' | 'NONE'`) for arrow
   rendering. Telemetry-driven animation must use a non-colliding name —
   `animationRate: number` + `animationFlow: 'forward' | 'reverse' | 'both'`
   — instead of "animationDirection".
8. **Pathfinding is already wired.** `pathfinding@0.4.18` is consumed via
   `src/utils/pathfinder.ts` and `src/utils/connector.ts`. Tier 3
   auto-routing extends `findPath` rather than starting fresh.
9. **No `connectorIndicatorComponent`.** Confirmed gap. Node indicator
   renders at `src/components/SceneLayers/Nodes/Node/Node.tsx:97-100`; the
   connector equivalent would follow the same shape.
10. **Theme is already MUI-driven** (`src/styles/theme.ts:52-136`) with only
    two hard-coded hex colours in `customVars`. Dark mode (Tier 2.5) is a
    `palette.mode` branch plus a small audit, not a sweeping refactor.

### What the source doc got right

- No `Group` item type; no `parentId` on any item; no `children` array.
  Grouping (1.2) is a true schema addition.
- Undo cap is 100; debounce is 250 ms (`historyStore`).
- Items are flat — `viewItem` is `{ id, tile, labelHeight }`,
  `rectangle` is `{ id, color, from, to }`, `textBox` is
  `{ id, tile, content, fontSize, orientation }`.
- All currently-listed keyboard shortcuts work as documented.
- The `nodeIndicatorComponent` foundation for live dashboards exists and is
  the single best thing already in the fork.
- The recommendation to leave collab out of this round is the right call —
  Tier 1's shape keeps the door open.

---

## Tier 1 — Land before stabilisation

These four items change the state model or the public API. Adding them later
means either a breaking change for embedders or running a parallel system
alongside.

### 1.1 Real multi-select with bulk operations

**What it does.** Click + shift-click to grow the selection; marquee-drag to
select an area; with multiple items selected, delete / drag / colour /
animation-toggle apply to every one of them. Today the inspector only
operates on one item at a time.

**Why Tier 1.** Selection is the spine of the embedder API. Once
embedders wire up something like `onSelectionChange(id)` and consumers' saved
diagrams assume single-selection, widening becomes a breaking change. Doing
it now also unlocks alignment/distribute (3.2), bulk colour, bulk delete.

**Where in code.** `src/stores/uiStateStore.tsx:32` (the `itemControls`
field, which today holds `ItemReference | AddItemControls`); selection
writes in `src/interaction/modes/Cursor.ts` and other handlers under
`src/interaction/modes/`; inspector UI under `src/components/ItemControls/`;
hit-detection helpers in `src/utils/geometry.ts`.

**Approach sketch.**

- Widen `itemControls` from a single `ItemReference | AddItemControls` to
  `{ kind: 'add'; … } | { kind: 'select'; items: ItemReference[] }`. Keep
  the discriminator so the existing `AddItemControls` branch stays
  type-safe.
- Add shift-click handler in `Cursor` mode; add a new interaction mode for
  marquee drag that draws a rectangle and finalises by intersecting
  existing hit-detection helpers.
- `ItemControls`: when `items.length > 1`, render a "Multi-edit" panel that
  only shows fields safely applicable to many (colour, delete, animation
  toggle, layer order).
- Keyboard `Delete` / `Backspace` already operates on the selection — extend
  to iterate the array. Same for arrow-key nudge.

**Reviewer's notes.** The correction in §1 of the review above narrows the
work: this is widening `itemControls`, not introducing a separate selection
concept. The marquee mode is the largest piece (a new entry under
`src/interaction/modes/`); the inspector multi-edit panel is the second-
largest. Don't let the marquee select items inside a locked layer or while
in read-only mode. Drag-move with multi-selection must apply the delta to
every item then clamp to the grid as a *group*, not per item, or items
drift apart.

**Collab-ready.** Model selection as
`Map<userId, ItemReference[]>` internally even though there's only one user
today; foreign-user selections become a render concern later (coloured
outlines), not a model migration.

**Effort.** Medium. ~2–3 days including marquee, keyboard, and inspector.

### 1.2 Grouping / nesting

**What it does.** Select several items → Group (Ctrl+G). The group is now a
single draggable thing. Click into the group to edit its contents;
Ctrl+Shift+G to ungroup. Groups can be named, given a faint backing colour,
and — most importantly for dynamic diagramming — bound to telemetry data as
a unit ("this VPC", "this K8s namespace").

**Why Tier 1.** Parent-child relationships don't exist in the schema today;
items are flat. Adding `parentGroupId` (or `children`) later means migrating
every saved diagram. Cheap to add to the schema now and ship a minimal
create/ungroup UI; collapse/expand and richer group operations can ship
later without further migration.

**Where in code.** Schemas under `src/schemas/`; rendering through
`src/components/SceneLayers/`. New scene layer needed: groups render below
items but capture clicks for the group as a whole when not in
edit-group mode.

**Approach sketch.**

- Add a `Group` item kind with `{ id, name, color?, children: ItemRef[] }`.
- Pick one source of truth: either `parentGroupId?: string` on each item,
  *or* `children: ItemRef[]` on the group — not both. `children-array` is
  easier to reason about for undo/redo; `parentGroupId` is more
  CRDT-friendly. **Recommendation: `parentGroupId`** — it generalises
  better to nesting and to future collab, at the cost of a slightly
  thornier "get the children of group G" lookup that's cached easily.
- Hit-detection: clicking a child while not in "edit group" mode selects
  the parent group.
- Drag a group → translate all descendants by the delta.
- Bounds of a group = bounding box of children + padding; render as a faint
  rectangle behind items.
- Keyboard: `Ctrl+G` (group), `Ctrl+Shift+G` (ungroup).

**Reviewer's notes.** Connector endpoints that reference a node inside a
group should stay attached; do not re-parent the connector itself unless
both endpoints sit inside the same group. Undo of "ungroup" must restore
the group identity (its `id`), not just rebuild a fresh group — otherwise
any data binding from a host (live-status overlays keyed by group id) is
silently broken on undo. Nested groups should be allowed (matches the
Figma/Sketch mental model) but a no-cycle invariant must be enforced on
every mutation.

**Collab-ready.** A strict `parentGroupId` approach with the no-cycle
invariant is materially more CRDT-friendly than a `children`-array, which
is one reason to favour the former even though the latter feels simpler at
single-user.

**Effort.** Medium-large. ~3–5 days for create / ungroup / drag-as-unit.
Collapse/expand is a follow-up.

### 1.3 Stable, documented imperative API

**What it does (embedder view).** The host gets a typed surface for driving
the diagram from outside:

```tsx
const iso = useIsoflow(); // already exists
iso.setNodeStatus('i-0abc', 'critical');
iso.setConnectorRate('conn-42', 0.8);
iso.focusNode('i-0abc', { zoom: 1.5 });
iso.applyPatch({ items: { 'i-0abc': { color: '#f00' } } });
```

Plus event callbacks: `onNodeClick`, `onConnectorClick`,
`onSelectionChange`, `onChange`, `onViewportChange`.

**Why Tier 1.** This is THE surface for dynamic diagramming. Once consumers
start reaching into the component via internal store imports, side effects
of `onSave`, or ref hacks, those locks become permanent. Lock the surface
down deliberately now; private internals stay private.

**Where in code.** `src/Isoflow.tsx:174-370` already exposes `useIsoflow()`
with `getModel`, `loadModel`, `setEditorMode`, `setZoom`, `incrementZoom`,
`decrementZoom`, `rendererEl`, `Connector`, plus `Model` and `uiState`
escape hatches. Extend this hook — and optionally mirror via
`forwardRef` + `useImperativeHandle` for embedders who prefer refs to
hooks. `docs/api.md` and `docs/embedding.md` already document the existing
surface; both must be updated when this lands.

**Approach sketch.**

- Categorise methods: **read** (`getNode`, `getViewport`), **write**
  (`updateNode`, `applyPatch`), **view** (`focusNode`, `fitToView`,
  `setZoom`), **selection** (`select`, `clearSelection`).
- Every write goes through the same reducer the UI uses. No parallel path.
- Return narrow DTOs from read methods — never the raw `Item` shape — so
  internal refactors don't break consumers.
- Add JSDoc to every method; the generated `.d.ts` becomes the contract.

**Reviewer's notes.** The correction in §5 of the review reframes this from
"invent" to "extend". The two big additions are (a) `applyPatch` for
embedders' diff-driven updates (pair with 1.4), and (b) **dropping the
`Model` / `uiState` escape hatches** in favour of typed accessors, since
those escape hatches are what locks us into supporting accidental APIs.
Removing them is a breaking change for any embedder already using them —
the round notes need to flag this in the changelog.

Decision worth getting right early: do imperative writes go on the undo
stack? **Recommendation: no.** Host-driven updates are not user actions.
Add an opt-in `pushToUndo: boolean` for the rare exception. This matches
the existing `recordHistory: false` pattern (see correction §6).

**Collab-ready.** A clean imperative API is also where remote-user
mutations eventually plug in.

**Effort.** Medium. ~2–3 days to extend, document, and test, plus the
breaking-change communication if the escape hatches are removed.

### 1.4 Diff-based external updates that preserve UI state

**What it does.** Host data refreshes every 5 seconds. The diagram updates
node colours, status badges, and connector flow rates without losing the
user's selection, pan offset, zoom, or expanded inspector panel. If the user
is mid-drag, updates queue until the gesture finishes.

**Why Tier 1.** This is where the "feels alive" vs "feels broken" line is
for live dashboards. The right place to put it is inside `useScene` and
`historyStore`; refactoring those after the API is published is painful.

**Where in code.** `src/stores/modelStore.tsx`, `src/stores/sceneStore.tsx`,
and `src/stores/historyStore.tsx`; orchestrator is `src/hooks/useScene.ts`.
The existing `updateConnector(id, updates, { recordHistory: false })` is
the seed pattern.

**Approach sketch.**

- Pair with 1.3: `iso.applyPatch(diff)` is the entry point.
- A patch may only mutate model state, never UI state (selection,
  viewport).
- During an active drag / marquee / connector-draw, queue patches in a
  ref-held buffer; flush on interaction end.
- For visual continuity: status / colour transitions can fade over ~200 ms
  via CSS transitions on the rendered SVG attribute (not React-driven
  animation, to avoid re-render cost).

**Reviewer's notes.** The correction in §6 narrows this to "generalise the
pattern": add `{ recordHistory: false }` to sibling mutations
(`updateModelItem`, `updateRectangle`, `updateTextBox`, `updateViewItem`),
then wrap them in a batched `applyPatch` helper that diffs at the item-id
level so React keeps stable DOM nodes. Silent no-op if a patch references
an id that no longer exists (the user just deleted it). Don't replace the
model wholesale even on "everything changed" patches — diff or React will
remount everything.

**Collab-ready.** The same queue-during-drag, flush-on-end pattern
generalises to remote-user mutations.

**Effort.** Small-medium. ~1–2 days, mostly testing.

### 1.5 Layer ordering UI

**What it does.** Inspector buttons and keyboard shortcuts for **Bring to
Front / Send to Back / Forward One / Backward One**
(`Ctrl+]` / `Ctrl+[` / `Ctrl+Shift+]` / `Ctrl+Shift+[`).

**Why Tier 1 (just barely).** The reducer is already wired to a working
context menu — but it only operates on rectangles
(`src/stores/reducers/layerOrdering.ts:18-19` throws for everything else).
Either extend the reducer or accept that layer ordering is rectangle-only
forever; the right time to make that decision is now, before users build
diagrams that rely on either behaviour.

**Where in code.** Reducer at `src/stores/reducers/layerOrdering.ts:6-40`.
Context-menu actions are already in
`src/components/ContextMenu/ContextMenuManager.tsx:55-80`. UI hookup needs
inspector buttons in `src/components/ItemControls/`; keyboard shortcuts in
`src/interaction/useKeyboardShortcuts.ts`.

**Approach sketch.**

- Extend `layerOrdering.ts` to handle `view-item`, `connector`, and
  `textBox` items, not just rectangle. Decide whether front/back can cross
  *kinds* — currently render order is hard-coded per kind in
  `src/components/SceneLayers/`. **Recommendation: keep within-kind for
  v1**, and document the limitation; cross-kind ordering is a separate,
  larger piece of work.
- Add four inspector buttons (⏶ ⏷ ⏏ ⏬) wired to the same actions the
  context menu already dispatches.
- Add the four keyboard shortcuts in `useKeyboardShortcuts.ts`.
- Skip the layers panel for v1; pair it with multi-select (1.1) if we
  reach for it later.

**Reviewer's notes.** Corrections §2 and §3 of the review change the
framing: there's no context menu to build, but there is reducer work to
do. With grouping (1.2) in scope, "Bring to Front" inside a group only
reorders within that group's `children`.

**Effort.** Small. ~1 day including the reducer extension.

---

## Tier 2 — Ship for v1

High-value, low-to-medium effort, expected by users.

### 2.1 Snap-to-grid + smart guides

**What it does.** During drag, items snap to the existing isometric tile
grid (`Alt` disables snap for fine positioning). Smart guides: faint magenta
lines appear when a dragged item aligns its centre/edge with another item;
the drag snaps to that alignment.

**Where in code.** Grid utilities in `src/utils/geometry.ts`; drag handling
in `src/interaction/modes/` (`Cursor.ts` and item-specific handlers).

**Approach sketch.** During drag, project the cursor to grid coords with the
existing utilities; if `!event.altKey`, round to nearest tile. For
multi-select (1.1), snap from the group's bounding-box anchor, not per
item. For smart guides, compare the dragged item's centre/left/right/top/
bottom against every other item's same edges; render a guide and snap when
within ~6 px screen-space. Spatial-hash if the diagram exceeds ~100 items.

**Reviewer's notes.** Snap and smart guides should be independently
toggleable from the same settings surface as animation (already in
`MainMenu`). Connectors don't snap to grid (their endpoints anchor to
nodes); exclude them from smart-guide alignment calcs too. Ship snap
first; smart guides are the 10× polish move.

**Effort.** Small for snap; medium for smart guides.

### 2.2 Mini-map

**What it does.** A ~200×150 px viewport bottom-right of the canvas showing
the whole diagram with a rectangle outlining the visible area. Click or
drag to pan the main view.

**Where in code.** New `src/components/MiniMap/`. Reads from `modelStore` /
`sceneStore` for items and from `uiStateStore` for viewport offset/zoom.
Render items as plain coloured rectangles — no icons (illegible at scale,
and they kill performance).

**Approach sketch.** Compute the bounding box of all items + margin as the
mini-map "world". Each item becomes a tiny rectangle (or circle for
nodes). The viewport rectangle is computed from the main canvas's visible
bounds. Click anywhere to centre the main view there; drag the rectangle
to pan. Throttle redraws to 30 fps.

**Reviewer's notes.** Hide the mini-map (don't show an empty rectangle) when
the diagram is empty. Keep it out of `EXPLORABLE_READONLY` mode by default
unless the embedder opts in.

**Effort.** Small. ~1 day.

### 2.3 Search / find (Ctrl+F)

**What it does.** `Ctrl+F` opens a search input; type to filter items by
name or description; `Enter` jumps to (and selects) the next match with a
pan/zoom; `Shift+Enter` reverses; `Esc` dismisses.

**Where in code.** New `src/components/SearchBar/`. Plugs into the existing
fit-to-view code path from the `F` shortcut.

**Approach sketch.** Match against `name`, `description`, and optionally
icon name. Match scoring: exact > prefix > substring > fuzzy (substring is
fine for v1). Highlight all matches faintly while the search is open.
Cycle through matches in reading order (top-to-bottom, left-to-right).

**Reviewer's notes.** Critical for dynamic diagrams whose IDs are
system-generated (EC2 instance IDs, K8s pod names). Debounce the filter
~100 ms for large diagrams. Don't keep focus when the user clicks the
canvas — that breaks the regular keyboard shortcuts.

**Effort.** Small. ~1 day.

### 2.4 Auto-save indicator + dirty state

**What it does.** A small "Saved 3 s ago" / "Saving…" / "Unsaved changes"
pill in the title bar. Browser confirm on tab close with unsaved changes;
red pill with retry button if `onSave` errors.

**Where in code.** Add `saveState: 'idle' | 'saving' | 'saved' | 'error'`
and `lastSavedAt: number` to `uiStateStore`. Title bar component lives
under `src/components/`.

**Approach sketch.** Treat `onSave` as `Promise`-returning; await it and set
`saving` → `saved` / `error`. Compare a content hash on each change; if it
matches the last-saved hash, state is `saved`. `beforeunload` listener if
state is unsaved.

**Reviewer's notes.** Don't trigger `onSave` on every keystroke. Debounce
~2 s; let the host opt out via `autoSaveDebounce: number | false`. Document
the debounce in `docs/embedding.md`. Cheap state to expose, large trust
dividend.

**Effort.** Tiny. ~half a day.

### 2.5 Dark mode

**What it does.** Canvas, toolbar, and inspector all support a dark theme;
embedder controls via `themeMode: 'light' | 'dark' | 'auto'`.

**Where in code.** `src/styles/theme.ts:52-136` is fully MUI-token driven
today with only ~2 hard-coded hex values in `customVars`. Adding a
`palette.mode === 'dark'` branch is the bulk of the work; an audit pass
covers the rest.

**Approach sketch.** Add a dark variant to the MUI theme. Top-level prop
`themeMode`; default to `'auto'` (respects `prefers-color-scheme`). Replace
the two `customVars` hex colours with mode-aware tokens. Grid lines,
default node fills, connector strokes all need dark equivalents — pick
fresh colours, don't just invert.

**Reviewer's notes.** Correction §10 cuts the effort estimate from "medium,
~2 days mostly auditing colours" to "small-medium, ~1 day mostly picking
dark palette". The Quill rich-text editor has its own theme; needs
separate dark-mode CSS. Icon packs (AWS/Azure/GCP/K8s) are coloured SVGs
that read fine on dark; only black/white icons need a backing chip. PNG/
PDF exports: default to light always, so docs stay readable — add a
separate `exportTheme` prop for embedders who want otherwise.

**Effort.** Small-medium. ~1 day.

### 2.6 Image upload / custom icons

**What it does.** "Upload custom icon" button in the icon picker. Drop an
SVG / PNG; it appears in a "My Icons" collection.

**Where in code.** Icon-collection plumbing already exists (FEA5-02). The
picker is in `src/components/ItemControls/`. Storage is the host's problem.

**Approach sketch.** Add `onIconUpload(file: File): Promise<{ url: string;
name: string }>` prop. The returned URL goes into a per-diagram "Custom"
collection that travels with import/export.

**Reviewer's notes.** SVGs can carry `<script>` and external references —
sanitisation is the host's responsibility (already documented as the model
in `SECURITY.md`). Document a recommended max (e.g. 200 KB). Dedupe by hash
where possible.

**Collab-ready.** Custom-icon uploads broadcast cleanly because the upload
result is just a URL handle.

**Effort.** Small. ~1 day on the Isoflow side; host owns storage.

### 2.7 Templates / starter diagrams

**What it does.** "New Diagram" → modal with thumbnails: Blank, AWS 3-Tier
Web App, K8s Cluster, Datacenter Rack, Generic Network. Selecting one
loads it as the canvas.

**Where in code.** New `src/templates/` directory with bundled JSON;
"New from template" entry in the main menu (whitelistable, like existing
items).

**Approach sketch.** Hand-build 4–5 templates in the editor; export JSON
and thumbnails. Template-picker modal lists them; selection calls the
existing import-JSON code path.

**Reviewer's notes.** Templates will drift if the schema changes. Add a CI
check that loads every template through `validateModel()` on every PR
(unit-tests already use it in `src/schemas/`). Keep template names
brand-agnostic; let embedders override the list via a prop.

**Effort.** Small. ~1 day plus design time.

---

## Tier 3 — Nice-to-have

### 3.1 Hover highlight + tooltip

Hover an item → faint outline; after ~600 ms hover, tooltip shows name +
description snippet. Pure render-layer; no model implications. Reuse the
existing hit-detection on `mousemove` (throttled). Half a day.

### 3.2 Alignment / distribute toolbar

Align left/right/top/bottom/centre + distribute horizontally/vertically.
Falls out of 1.1 (multi-select) — don't build before the selection model is
ready. Half a day, post-1.1.

### 3.3 Connector auto-routing

Connectors automatically route around nodes via right-angle paths. The
A* scaffolding already exists (`src/utils/pathfinder.ts` consumed by
`src/utils/connector.ts`) — Tier 3 wraps it in a "route around obstacles"
solver with aesthetic constraints (minimise turns, prefer parallel runs).

**Reviewer's notes.** Good auto-routing is genuinely hard. Ship something
worse than manual routing and you'll regret it. Preserve manual waypoints
when the user has dragged a route by hand — auto-router only kicks in when
the route has no manual waypoints. 3+ days for a respectable v1.

### 3.4 Presentation / focus mode

For read-only embeds: a "tour" mode that walks through nodes in a defined
order, with the canvas auto-zooming and optional markdown narration.
Arrow keys advance. Pairs with `focusNode` from 1.3 and the existing
rich-text TextBoxes. New mode under `src/interaction/modes/`. ~2–3 days.

### 3.5 Comments / annotations

Click anywhere → comment pin; pins show count badges; clicking opens a
thread. Much bigger than it looks once you consider threading, mentions,
notifications, resolution, persistence. **Defer until collab lands** —
they share infrastructure.

---

## Tier 4 — Explicit non-goals (this round)

- **Real-time collaboration** (CRDT/OT, presence cursors) — deferred. Tier
  1 keeps the door open without committing.
- **Full auto-layout** (graphviz-style) — rarely produces what users want
  for isometric layouts; high effort, low return. Templates (2.7) cover the
  same blank-canvas pain at 1% of the cost.
- **Plugin / extension system** — premature. Better to stay opinionated
  until clear demand appears.
- **i18n** — low ROI; defer until non-English demand appears. Isometric
  diagrams are largely language-agnostic.
- **Named-snapshot version history** — undo/redo covers the common case;
  named snapshots belong in the host (save the JSON elsewhere with a
  timestamp).
- **Accessibility / full keyboard nav / screen-reader support** — important
  eventually but a deep, separate project. **Deferred, not declined** —
  worth planning as its own initiative once Tier 1/2 is done.

---

## Cross-cutting guidance for dynamic diagramming

Five design moves that matter most for the embedded-live-dashboard use case:

1. **Treat the model as externally driven.** Host passes data → Isoflow
   reflects it. Every mutation surfaces through `onChange` / event
   callbacks. Avoid implicit internal mutation paths the host can't
   observe.
2. **Everything observable must be addressable by stable id.** Nodes,
   connectors, rectangles, and groups (once 1.2 lands). The imperative API
   (1.3) is only useful if the host can target items by id without scanning
   the model.
3. **Animation should be data-driven, not just on/off.** Today the
   connector schema has a boolean `animated`. Extend with
   `animationRate: number` (0–1) and **`animationFlow:
   'forward' | 'reverse' | 'both'`** so hosts can drive flow rate from real
   telemetry. (The name `animationFlow` avoids colliding with the existing
   `direction: 'START_TO_END' | 'END_TO_START' | 'BOTH' | 'NONE'` field,
   which governs arrow rendering — see review correction §7.)
4. **Status indicators belong on connectors too.** `nodeIndicatorComponent`
   exists; add a `connectorIndicatorComponent` prop alongside it so
   connectors can show throughput / latency / error-rate / link-down
   status. Cheap extension of the existing pattern (render slot at
   `src/components/SceneLayers/Connectors/`).
5. **Read-only mode should look read-only.** `EXPLORABLE_READONLY` exists
   but cursor / hover affordances may still suggest interactivity. A once-
   over pass to make the intent clear (default cursor, no hover-edit
   highlights, no "click to edit" affordances) is worth doing before the
   stabilisation cut.

---

## Suggested order of attack

If a sequence is wanted rather than a menu, this order minimises re-work:

1. **1.1 multi-select** — biggest single UX gap; unlocks 3.2 (align /
   distribute) and bulk operations.
2. **1.2 grouping** — schema change; do alongside 1.1 while the model is
   open.
3. **1.3 + 1.4 imperative API + diff updates** — publish the dynamic-
   diagramming surface, document once.
4. **1.5 layer ordering UI** — small finisher.
5. **2.4 + 2.5 auto-save indicator + dark mode** — embedded-dashboard
   polish.
6. **2.1 + 2.2 snap + mini-map** — tactile editor polish.
7. **2.3 + 2.7 search + templates** — discoverability and onboarding.
8. **2.6 custom icons** — fit in alongside any of the above.

Stop after Tier 2 and stabilise. Tier 3 becomes a "next minor release"
backlog.

---

## Maintenance

- When a Tier 1/2/3 item is picked up, allocate the next free `FEA7-NN`
  (or `BUG7-NN` etc. if scope shifts) at the start of the branch. Use the
  ID in every commit subject for that work, per `CLAUDE.md`.
- On merge, move the item from this file into `README.md`'s historical
  section under the appropriate round heading, keyed by ID. Don't keep the
  description here; the source of truth becomes the commits and the README
  retrospective.
- If an item is dropped without shipping, leave a one-line tombstone here
  noting the decision and the date — don't silently delete. Reuse of an
  item slot is fine; reuse of a `FEA7-NN` ID is not (IDs are append-only).
- This file is forward-looking strategy. Anything observable today (props,
  hooks, schemas) belongs in `docs/api.md` / `docs/embedding.md`, not here.
