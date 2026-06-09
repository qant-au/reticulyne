# Roadmap — Reticulyne

> **Status:** forward-looking ledger of features under consideration before
> stabilisation. Not a commitment — items are picked up at the maintainer's
> discretion, and the catalogue evolves as the fork's two confirmed use cases
> (embedded live dashboards; consumer-built diagrams) tell us what really
> matters.

Last completed feature round was **FEA13** (Export as SVG). The next round of
feature work will land under **`FEA14-NN`** (or `UXA-NN` for the
Excalidraw-alignment workstream described in `Excalidraw Side-by-Side` below),
with each `NN` allocated at pick-up time. Bugs / docs / security work that
falls out of these features carries the matching prefix (`BUG14-NN`, …).

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
   `<Reticulyne>` in read-only / explorable mode and push live infra status into
   it (node colour, connector flow rate, status badges). The
   `nodeIndicatorComponent` prop (FEA5-07, `LiveDashboard` example) and
   `connectorIndicatorComponent` (FEA7-03) already anchor this use case;
   everything in Tier 1 either widens that contract or removes a foot-gun.
2. **Consumer-app end-users drawing their own diagrams** — humans inside the
   editor. They feel the connector UX, double-click shortcuts, multi-select,
   and dark mode immediately; they don't feel the imperative API at all.
3. **Maintainer (long-tail)** — schema migrations, public-API stability, and
   keeping the door open for real-time collab without committing to it now.
   The Tier 1 ranking is driven primarily by what forces a breaking change
   later if we skip it.

**Explicit non-goal for this round:** real-time collaboration.

---

## Review of source recommendations

### Existing codebase review (cross-checked at commit `c2c28114`)

See the full enumeration in prior ROADMAP versions; the ten corrections
remain valid and are not repeated here.

### FossFlow fork analysis (May 2026)

`abhinav-1305/fossflow-lib` and the companion `FossFlow` PWA app were reviewed
against our codebase. Key findings:

**Things they attempted that we've already shipped:** keyboard shortcuts dialog
(FEA8-01/02); transaction-based undo/redo.

**Things they attempted but abandoned:** lasso/marquee selection (their
`Lasso.tsx` is 100% commented out — no useful code to cherry-pick).

**Things they flag as high-priority UX issues that remain unaddressed in our
fork too:** the connector tool discoverability problem (no visual port hotspots;
mode-switch required before drawing); double-click-to-place; drag-from-palette.

**Things that appeared to be gaps but turned out to already exist in our
codebase:**
- *Connector midpoint labels* — `ConnectorLabel.tsx` already renders
  `connector.description` as a chip at the path midpoint for any connector
  where `description` is set. No new schema work needed; surfacing and
  documenting this is a doc/discoverability task, not a dev task.
- *Diagram title in model* — `title: constrainedStrings.name` (max 100) is
  already required in `modelObjectSchema` and defaults to `'Untitled'` in
  `INITIAL_DATA`. What is missing: UI to edit it and `useReticulyne()` exposure.
- *Single-touch pan* — `touchstart`/`touchmove`/`touchend` are already mapped
  to mouse events in `useInteractionManager.ts`. The gap is multi-touch
  pinch-to-zoom.

**New items sourced from the fossflow analysis or from independent review:**
anchor hotspot visualisation, left-click drag to draw connectors, diagram title
UI exposure, double-click to add item, SVG export, drag-and-drop from icon
palette, multi-touch pinch-to-zoom, multi-diagram management in Docker shell,
PWA shell for Docker image.

---

## Ordering note

Items within each tier are sorted by bang-for-buck (impact ÷ effort), highest
first. **Exception: dark mode (1.1) is the P1 integration requirement and is
placed first regardless of comparative effort.** Tier 1 boundaries are defined
by schema or public API changes that must land before stabilisation, plus the
P1 integration item. Tier 2 covers expected-by-v1 user value. Tier 3 covers
post-v1 desirability.

---

## Tier 1 — Land before stabilisation

These items change the state model or the public API. Adding them later means
either a breaking change for embedders or running a parallel system alongside.

### 1.2 Diagram title UI and API exposure **[NEW]**

**What it does.** The model schema already carries `title: string` (max 100,
required, defaults to `'Untitled'`). This item exposes that field to users and
to embedders:
- Main menu gains an inline "Rename diagram" action (or an editable title field
  in the header area) that writes to `modelStore.title`.
- `useReticulyne()` gains `getTitle(): string` and `setTitle(s: string): void`.
- The title is included in the `onModelUpdated` callback payload (it already is
  — the callback returns the full model), and in JSON export file names.
- Make `title` optional in the schema (currently required, which can cause
  validation failures if an embedder omits it). Provide `'Untitled'` as the
  default fallback instead.

**Why Tier 1.** The schema change (making `title` optional with a default) is
minor but is a migration; changing it after embedders have been forced to supply
a `title` is awkward. The API exposure (`getTitle`/`setTitle`) is part of the
stable surface being locked down in 1.5.

**Where in code.** `src/schemas/model.ts` — make `title` optional with a
`.default('Untitled')` transform; `src/Reticulyne.tsx:174-370` — add to
`useReticulyne()` hook; `src/components/MainMenu/` — add rename action.

**Approach sketch.**
- Change `title: constrainedStrings.name` →
  `title: constrainedStrings.name.optional().default('Untitled')`. Verify
  existing diagrams round-trip correctly.
- Add a "Rename…" item to the main menu that opens an inline text input (reuse
  `<Section>` / `<TextField>` patterns from the inspector panels). On confirm,
  dispatch a `setTitle(s)` action to `modelStore`.
- `getTitle()` and `setTitle(s)` in `useReticulyne()`, both operating on
  `modelStore.title` directly — no history entry needed.
- Update `docs/api.md` with the two new methods.

**Effort.** Tiny. ~0.5 days.

---

### 1.3 Layer ordering UI

**What it does.** Inspector buttons and keyboard shortcuts for **Bring to
Front / Send to Back / Forward One / Backward One**
(`Ctrl+]` / `Ctrl+[` / `Ctrl+Shift+]` / `Ctrl+Shift+[`).

**Why Tier 1.** The reducer is already wired to the context menu — but it only
operates on rectangles (`src/stores/reducers/layerOrdering.ts:18-19` throws
for everything else). Either extend the reducer now or accept that layer
ordering is rectangle-only forever; the right time to decide is before v1.

**Where in code.** Reducer at `src/stores/reducers/layerOrdering.ts:6-40`.
Context-menu actions already in
`src/components/ContextMenu/ContextMenuManager.tsx:55-80`. Inspector buttons
needed in `src/components/ItemControls/`; keyboard shortcuts in
`src/interaction/useKeyboardShortcuts.ts`.

**Approach sketch.**
- Extend `layerOrdering.ts` to handle `view-item`, `connector`, and `textBox`
  items, not just rectangle. Keep within-kind ordering for v1 (cross-kind is a
  separate, larger piece of work).
- Add four inspector buttons (⏶ ⏷ ⏏ ⏬) wired to the same actions the context
  menu already dispatches.
- Add the four keyboard shortcuts in `useKeyboardShortcuts.ts`.
- Skip a layers panel for v1; pair with multi-select (1.4) if needed later.

**Reviewer's notes.** With grouping (1.6) in scope, "Bring to Front" inside a
group only reorders within that group's children.

**Effort.** Small. ~1 day including the reducer extension.

---

### 1.4 Real multi-select with bulk operations

**What it does.** Click + shift-click to grow the selection; marquee-drag to
select an area; with multiple items selected, delete / drag / colour /
animation-toggle apply to every one of them.

**Why Tier 1.** Selection is the spine of the embedder API. Once embedders wire
up `onSelectionChange(id)` and consumers' saved diagrams assume single-
selection, widening becomes a breaking change. Doing it now also unlocks
alignment/distribute (3.2) and bulk colour / delete.

**Where in code.** `src/stores/uiStateStore.tsx:32` (the `itemControls` field,
which today holds `ItemReference | AddItemControls`); selection writes in
`src/interaction/modes/Cursor.ts` and handlers under `src/interaction/modes/`;
inspector UI under `src/components/ItemControls/`; hit-detection helpers in
`src/utils/geometry.ts`.

**Approach sketch.**
- Widen `itemControls` from `ItemReference | AddItemControls` to
  `{ kind: 'add'; … } | { kind: 'select'; items: ItemReference[] }`. Keep the
  discriminator so the existing `AddItemControls` branch stays type-safe.
- Add shift-click handler in `Cursor` mode; add a new marquee-drag interaction
  mode that draws a rectangle overlay and finalises by intersecting existing
  hit-detection helpers.
- `ItemControls`: when `items.length > 1`, render a "Multi-edit" panel that
  only shows fields safely applicable to many (colour, delete, animation toggle,
  layer order).
- `Delete` / `Backspace` and arrow-key nudge extend to iterate the array.
- Don't let the marquee select items in read-only mode. Drag-move with multi-
  selection must apply the delta as a group then clamp to grid — not per item,
  or items drift apart.

**Collab-ready.** Model selection as `Map<userId, ItemReference[]>` internally
even though there is only one user today.

**Effort.** Medium. ~2–3 days including marquee, keyboard, and inspector.

---

### 1.5 Diff-based external updates that preserve UI state

**What it does.** Host data refreshes every 5 seconds. The diagram updates node
colours, status badges, and connector flow rates without losing the user's
selection, pan offset, zoom, or expanded inspector panel. If the user is
mid-drag, updates queue until the gesture finishes.

**Why Tier 1.** This is where the "feels alive" vs "feels broken" line is for
live dashboards. The right place to put it is inside `useScene` and
`historyStore`; refactoring those after the API is published is painful.

**Where in code.** `src/stores/modelStore.tsx`, `src/stores/sceneStore.tsx`,
and `src/stores/historyStore.tsx`; orchestrator is `src/hooks/useScene.ts`.
The existing `updateConnector(id, updates, { recordHistory: false })` is the
seed pattern.

**Approach sketch.**
- Pair with 1.6: `iso.applyPatch(diff)` is the entry point.
- A patch may only mutate model state, never UI state (selection, viewport).
- During an active drag / marquee / connector-draw, queue patches in a ref-held
  buffer; flush on interaction end.
- Add `{ recordHistory: false }` to sibling mutations (`updateModelItem`,
  `updateRectangle`, `updateTextBox`, `updateViewItem`) and wrap them in a
  batched `applyPatch` helper that diffs at the item-id level. Silent no-op if
  a patch references an id that no longer exists.
- CSS transitions for colour changes (~200 ms) rather than React-driven
  animation to avoid re-render cost.

**Collab-ready.** The queue-during-drag, flush-on-end pattern generalises to
remote-user mutations.

**Effort.** Small-medium. ~1–2 days, mostly testing.

---

### 1.6 Stable, documented imperative API

**What it does (embedder view).** The host gets a typed surface for driving the
diagram from outside:

```tsx
const iso = useReticulyne();
iso.setTitle('My Diagram');         // added in 1.2
iso.setNodeStatus('i-0abc', 'critical');
iso.setConnectorRate('conn-42', 0.8);
iso.focusNode('i-0abc', { zoom: 1.5 });
iso.applyPatch({ items: { 'i-0abc': { color: '#f00' } } });
```

Plus event callbacks: `onNodeClick`, `onConnectorClick`,
`onSelectionChange`, `onChange`, `onViewportChange`.

**Why Tier 1.** This is THE surface for dynamic diagramming. Once consumers
start reaching into the component via internal store imports, those paths become
permanent. Lock the surface down deliberately now.

**Where in code.** `src/Reticulyne.tsx:174-370` already exposes `useReticulyne()`
with a broad set of methods. Extend this hook — and optionally mirror via
`forwardRef` + `useImperativeHandle` for embedders who prefer refs to hooks.
`docs/api.md` and `docs/embedding.md` must be updated when this lands.

**Approach sketch.**
- Categorise methods: **read** (`getNode`, `getViewport`, `getTitle`),
  **write** (`updateNode`, `applyPatch`, `setTitle`), **view** (`focusNode`,
  `fitToView`, `setZoom`), **selection** (`select`, `clearSelection`).
- Every write goes through the same reducer the UI uses. No parallel path.
- Return narrow DTOs from read methods — never the raw `Item` shape.
- Drop the `Model` / `uiState` escape hatches in favour of typed accessors.
  This is a breaking change for any embedder already using them; flag in
  changelog.
- Imperative writes do NOT go on the undo stack by default. Opt-in
  `pushToUndo: boolean` for the rare exception. Matches the existing
  `recordHistory: false` pattern.
- Add JSDoc to every method; the generated `.d.ts` becomes the contract.

**Collab-ready.** A clean imperative API is also where remote-user mutations
eventually plug in.

**Effort.** Medium. ~2–3 days to extend, document, and test.

---

### 1.7 Grouping / nesting

**What it does.** Select several items → Group (`Ctrl+G`). The group is a
single draggable thing. Click into a group to edit contents; `Ctrl+Shift+G` to
ungroup. Groups can be named, given a faint backing colour, and bound to
telemetry data as a unit ("this VPC", "this K8s namespace").

**Why Tier 1.** Parent-child relationships don't exist in the schema today.
Adding `parentGroupId` later means migrating every saved diagram.

**Where in code.** Schemas under `src/schemas/`; rendering through
`src/components/SceneLayers/`. New scene layer needed: groups render below items
but capture clicks for the group as a whole.

**Approach sketch.**
- Add a `Group` item kind with `{ id, name, color? }`.
- `parentGroupId?: string` on each item (not `children` array — easier for
  CRDT / collab later, and "get children of group G" is a cheap filter).
- Hit-detection: clicking a child outside "edit group" mode selects the parent.
- Drag a group → translate all descendants by the delta.
- Bounds = bounding box of children + padding; render as a faint rectangle.
- Keyboard: `Ctrl+G` / `Ctrl+Shift+G`.
- Connector endpoints stay attached to children; no-cycle invariant enforced
  on every mutation.
- Undo of "ungroup" must restore the original group `id` (not a fresh one) to
  preserve any data bindings keyed by group id.
- Nested groups allowed; enforce no-cycle invariant.

**Effort.** Medium-large. ~3–5 days for create / ungroup / drag-as-unit.
Collapse/expand is a follow-up.

---

## Tier 2 — Ship for v1

Ordered by the same criteria as the README-tracked feature set: dependencies first, then schema / API changes cheapest to do early, then bang-for-buck as tiebreaker. The quick wins (2.1–2.3) lead; Replace Quill (2.10) is promoted ahead of the interaction features to clear the Quill API surface before it accretes further. Items marked **[NEW]** were not in the previous catalogue.

### 2.1 Anchor hotspot visualisation **[NEW]**

**What it does.** When the user is in **Connector mode** (toolbar selected) or
is hovering a node while about to initiate a left-click-drag connector (item
2.5 below), small circular port indicators appear on the cardinal edges of the
hovered node tile (N, S, E, W). On hover they grow slightly and show a pointer
cursor. This makes connection points discoverable without documentation.

**Why Tier 2.** Pure render-layer; no schema change. Tiny effort with
disproportionate discoverability value. Ships independently: even with the
existing toolbar-based connector flow, hotspots tell new users *where* to aim.

**Where in code.** `src/components/SceneLayers/Nodes/Node/Node.tsx` — add hover
state; new overlay SVG elements for hotspot circles. Positions derived from
`useIsoProjection`.

**Approach sketch.**
- Add `hoveredNodeId: string | null` to `uiStateStore`, set on `mousemove`
  over a node tile.
- When `mode.type === 'CONNECTOR'` or a left-click-drag gesture has started,
  render 4 SVG `<circle>` elements at the projected N/S/E/W tile-edge positions
  of `hoveredNodeId`.
- 8 px radius, semi-transparent blue fill, 2 px stroke, `pointer-events: none`.
- On hover of a circle, grow to 12 px and snap the connector anchor to that
  specific edge — refine `getAnchor()` in `src/utils/` to prefer the snapped
  edge when cursor is within ~12 px.

**Effort.** Small. ~0.5 days.

---

### 2.2 Double-click empty cell → add item **[NEW]**

**What it does.** Double-clicking an empty canvas tile opens the icon picker
with the target tile pre-set. On icon selection, the item is placed immediately
without a second click. Reduces the "add item" flow from 3 steps to 2. Double-
clicking an occupied tile opens that item's inspector if it is not already open.

**Why Tier 2.** Zero schema impact. One of the most commonly requested UX
shortcuts across isoflow forks. "Every other tool does this."

**Where in code.** `src/interaction/modes/Cursor.ts` — add `dblclick` handler;
re-uses the `PlaceIcon` mode entry point.

**Approach sketch.**
- `dblclick` on empty tile in `Cursor` mode → record the target tile → enter
  `PlaceIcon` mode with the tile pre-set, bypassing the "click to position"
  step.
- `dblclick` on occupied tile → open that item's inspector.
- Esc from icon picker returns to Cursor mode and discards.
- Guard: no-op if `editorMode !== 'EDITABLE'`.

**Effort.** Tiny. ~0.5 days.

---

### 2.3 Auto-save indicator + dirty state

**What it does.** A small "Saved 3 s ago" / "Saving…" / "Unsaved changes" pill
in the title bar. Browser confirm on tab close with unsaved changes; red pill
with retry button if `onSave` errors.

**Where in code.** Add `saveState: 'idle' | 'saving' | 'saved' | 'error'` and
`lastSavedAt: number` to `uiStateStore`. Title bar component under
`src/components/`.

**Approach sketch.** Treat `onSave` as `Promise`-returning; await it and set
`saving` → `saved` / `error`. Compare a content hash on each change; if it
matches the last-saved hash, state is `saved`. `beforeunload` listener when
unsaved. Debounce ~2 s; let host opt out via `autoSaveDebounce: number | false`.
Document the debounce in `docs/embedding.md`.

**Effort.** Tiny. ~0.5 days.

---

### 2.10 Replace Quill rich-text editor (DEP-04 follow-up)

**What it does.** Swaps `react-quill-new` → an actively maintained alternative
(TipTap recommended) for the node-description rich-text editor at
`src/components/MarkdownEditor/`.

**Why sorted here (before 2.5).** The only outstanding accepted residual
advisory (`GHSA-v3m3-f69x-jf25`, low-severity) — contained today by the
`Link.sanitize` override and narrow `formats` allowlist. Promoted ahead of the
interaction features because the longer Quill stays, the more code accumulates
around its API: the dark-mode CSS override (1.1) must be migrated here, and
every subsequent feature that exercises description editing (2.5 connector UX,
2.7 search, 2.11 D&D) builds on the right substrate from the start. Replacing
it immediately after the quick wins means no Quill-specific surface accretes
past this point.

**Where in code.** `src/components/MarkdownEditor/MarkdownEditor.tsx`;
`src/components/MarkdownEditor/sanitizeLinkUrl.ts`; `SECURITY.md`,
`README.md`, `docs/embedding.md`.

**Approach sketch.**
- TipTap with `StarterKit` subsetted to `Bold`, `Italic`, `Underline`,
  `Strike`, `Link` only.
- Re-implement link-protocol sanitisation in TipTap's link extension; verify
  it rejects `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` including
  percent-encoded variants.
- Build behind a sibling directory so Quill stays runnable during the swap.
- Clipboard security test: paste `<iframe>`, `<svg onload>`, `<style>`,
  `data:` link; assert all stripped. This is the merge gate.
- Existing `description` strings are Quill HTML; TipTap reads HTML on init.
  Verify bold/italic/underline/strike/link round-trip cleanly.
- TipTap has no built-in theme — the dark-mode CSS override added in 1.1
  migrates to TipTap theming in this step; no separate dark-mode pass needed
  later.
- Update `SECURITY.md` to close `GHSA-v3m3-f69x-jf25` once npm audit is clean.
  Ping the consumer (`qantcore/app`, `_BlueprintShell.tsx`) to retire their
  explanatory Quill CVE comment.

**Effort.** Medium. ~2–3 days including swap, security-test gate, docs
lockstep, and Docker smoke pass.

---

### 2.5 Left-click drag to draw connectors **[NEW]**

**What it does.** Without switching the toolbar to Connector mode, the user can
hover a node (port hotspots appear, per 2.1), then left-click-drag from a
hotspot toward another node. The connector draws live. Releasing over a valid
target node completes the connection; releasing over empty space cancels. The
existing toolbar connector tool remains as an alternative.

**Why Tier 2.** The most-cited UX complaint across every isoflow fork. Not a
schema change, but high-enough impact to ship with v1. The earlier this
interaction model is locked in, the less documentation needs updating later.

**Where in code.** `src/interaction/modes/Cursor.ts` — add `mousedown` handler
for the drag-from-hotspot gesture; `src/interaction/modes/Connector.ts` —
refactor entry point to accept an initial anchor coordinate and transition from
`Cursor`; `src/utils/geometry.ts` — edge-proximity detection for hotspot
targeting.

**Approach sketch.**
- In `Cursor` mode `mousedown`: if the pointer is within ~12 px (screen-space)
  of any port hotspot of a node tile, record that as the start anchor and enter
  `Connector` mode carrying the anchor, bypassing the normal `DragItems`
  branch.
- `Connector` mode already handles live path drawing and `mouseup` to commit;
  only its entry point needs to accept an initial anchor and skip the "first
  click places start anchor" step.
- Live preview line from the hotspot to the cursor while dragging; snap the end
  anchor when within hotspot proximity of a target node.
- `mouseup` over empty space → cancel (remove the in-progress connector, return
  to `Cursor` mode).
- Keep right-click context menu and toolbar connector tool as alternatives.
- Guard: no-op if `editorMode !== 'EDITABLE'`.

**Reviewer's notes.** The proximity threshold (~12 px) should match the hotspot
circle radius from 2.1. Test that the gesture does not conflict with shift-click
multi-select (1.4): shift+mousedown near a hotspot should extend selection, not
start a connector.

**Effort.** Medium. ~1.5 days.

---

### 2.7 Search / find (Ctrl+F)

**What it does.** `Ctrl+F` opens a search input; type to filter items by name
or description; `Enter` jumps to the next match with a pan/zoom; `Shift+Enter`
reverses; `Esc` dismisses.

**Where in code.** New `src/components/SearchBar/`. Plugs into the existing
fit-to-view code path.

**Approach sketch.** Match against `name`, `description`, and optionally icon
name. Exact > prefix > substring for v1. Highlight all matches faintly while
open. Debounce ~100 ms. Don't steal focus when the user clicks the canvas.
Critical for diagrams whose IDs are system-generated (EC2 instance IDs, etc.).

**Effort.** Small. ~1 day.

---

### 2.8 Mini-map

**What it does.** A ~200×150 px viewport bottom-right of the canvas showing the
whole diagram with a rectangle outlining the visible area. Click or drag to pan.

**Where in code.** New `src/components/MiniMap/`.

**Approach sketch.** Compute bounding box of all items + margin. Each item
renders as a tiny coloured rectangle (no icons). Viewport rectangle from the
main canvas's visible bounds. Click anywhere to centre; drag the rectangle to
pan. Throttle to 30 fps. Hide when diagram is empty. Off by default in
`EXPLORABLE_READONLY`; opt-in via prop.

**Effort.** Small. ~1 day.

---

### 2.9 Snap-to-grid + smart guides

**What it does.** During drag, items snap to the isometric tile grid (`Alt`
disables). Smart guides: magenta lines appear when a dragged item aligns its
centre/edge with another item.

**Where in code.** Grid utilities in `src/utils/geometry.ts`; drag handling in
`src/interaction/modes/`.

**Approach sketch.** Project cursor to grid coords; if `!event.altKey`, round
to nearest tile. For multi-select (1.4), snap from the group's bounding-box
anchor. For smart guides, compare dragged item's edges against every other item;
render a guide and snap within ~6 px screen-space. Spatial-hash beyond ~100
items. Snap and smart guides independently toggleable from `MainMenu`. Ship snap
first; guides are follow-on polish.

**Effort.** Small for snap; medium for smart guides.

---

### 2.11 Drag-and-drop from icon palette **[NEW]**

**What it does.** A persistent (or toggled) icon sidebar from which icons can
be dragged directly onto the canvas tile they land on. Ghost preview shows the
icon following the cursor with a tile-highlight overlay. The existing toolbar-
click + canvas-click flow remains unchanged.

**Why Tier 2.** Identified in the fossflow TODO as high-priority; no fork has
shipped it. Pairs naturally with 2.2 (double-click to add).

**Where in code.** New `src/components/IconPalette/` (persistent sidebar).
`src/interaction/` — new `DragFromPalette` interaction mode.
`src/components/DragAndDrop/DragAndDrop.tsx` — existing component can be
extended.

**Approach sketch.**
- Optional persistent icon palette panel (hidden by default, toggled from
  toolbar). Renders the same collection list as the picker in a scrollable
  sidebar.
- `dragstart` on an icon → enter `DragFromPalette` mode; compute target tile
  using existing projection utilities; render ghost overlay.
- `drop` on canvas → place item (reuse `PlaceIcon` reducer path).
- Hide palette toggle in `EXPLORABLE_READONLY` mode.

**Effort.** Medium. ~2 days.

---

### 2.12 Multi-touch pinch-to-zoom **[NEW]**

**What it does.** On touch-screen devices (tablets, touch-screen laptops), a
two-finger pinch gesture zooms the canvas; a single-finger drag pans in non-
editable modes. Existing mouse and trackpad interactions are unchanged.

**Why Tier 2.** `onTouchStart` / `onTouchMove` / `onTouchEnd` are already wired
in `useInteractionManager.ts` but only map single-touch to mouse events.
Multi-touch pinch is the gap. The live-dashboard use case is commonly viewed on
tablets.

**Where in code.** `src/interaction/useInteractionManager.ts:130-155` — extend
existing touch handlers; new `src/interaction/touchInput.ts` (mirrors
`wheelInput.ts` structure).

**Approach sketch.**
- `touchstart` with 2 touches: record initial inter-touch distance and midpoint.
- `touchmove` with 2 touches: compute new distance → zoom delta (same pipeline
  as wheel zoom); midpoint movement → pan delta. Apply both.
- Single-finger drag-to-pan: only in `EXPLORABLE_READONLY` mode — conflicts
  with node dragging in `EDITABLE`.
- `preventDefault()` on handled touch events to suppress browser scroll
  interference (same pattern as wheel events, already `passive: false`).

**Effort.** Medium. ~1.5 days.

---

### 2.13 Custom icons / image upload

**What it does.** "Upload custom icon" button in the icon picker. Drop an SVG /
PNG; it appears in a "My Icons" collection that travels with the diagram JSON.

**Where in code.** Icon-collection plumbing already exists (FEA5-02). Picker in
`src/components/ItemControls/`.

**Approach sketch.** Add `onIconUpload(file: File): Promise<{ url: string;
name: string }>` prop. The returned URL goes into a per-diagram "Custom"
collection. SVG sanitisation is the host's responsibility (already documented
in `SECURITY.md`). Recommend max 200 KB; dedupe by hash.

**Effort.** Small. ~1 day on the Reticulyne side; host owns storage.

---

### 2.14 Templates / starter diagrams

**What it does.** "New Diagram" → modal with thumbnails: Blank, AWS 3-Tier Web
App, K8s Cluster, Datacenter Rack, Generic Network.

**Where in code.** New `src/templates/` with bundled JSON; "New from template"
in the main menu.

**Approach sketch.** Hand-build 4–5 templates; export JSON and thumbnails.
Template-picker modal; selection calls existing import-JSON code path. CI check
loads every template through `validateModel()` on every PR. Keep names brand-
agnostic; let embedders override via prop.

**Effort.** Small. ~1 day plus design time.

---

## Tier 3 — Nice-to-have

### 3.1 Hover highlight + tooltip

Hover an item → faint outline; after ~600 ms hover, tooltip shows name +
description snippet. Pure render-layer. Reuse hit-detection on `mousemove`
(throttled). ~0.5 days.

### 3.2 Alignment / distribute toolbar

Align left/right/top/bottom/centre + distribute horizontally/vertically.
Depends on 1.4 (multi-select) — don't build before the selection model is
ready. ~0.5 days post-1.4.

### 3.3 Connector auto-routing improvements

Connectors already auto-route via A* (`src/utils/pathfinder.ts`). Tier 3 adds
aesthetic constraints: minimise turns, prefer parallel runs, preserve manual
waypoints (auto-router only kicks in when no manual waypoints exist). Good auto-
routing is genuinely hard — ship something worse than manual routing and you'll
regret it. ~3+ days.

### 3.4 Presentation / focus mode

For read-only embeds: a "tour" mode that walks through nodes in a defined order,
with the canvas auto-zooming and optional markdown narration. Arrow keys advance.
Pairs with `focusNode` from 1.6 and existing rich-text TextBoxes.
New mode under `src/interaction/modes/`. ~2–3 days.

### 3.5 Comments / annotations

Click anywhere → comment pin; pins show count badges; clicking opens a thread.
Much bigger than it looks once threading, mentions, notifications, resolution,
and persistence are in scope. **Defer until collab lands** — they share
infrastructure.

---

## Application-layer — Docker shell enhancements

These items are host-app work that sits *above* the library. They live in
`src/index-docker.tsx` and companion files; the `<Reticulyne>` component itself is
unchanged. Use `APP-01`, `APP-02` task IDs (not `FEA9-NN`).

### APP-01 Multi-diagram management **[NEW]**

**What it does.** The standalone Docker editor gains: create new diagram, name
and save to `localStorage`, list and switch between named diagrams, delete,
import from JSON file, export to JSON file. A collapsible top toolbar hosts
these actions.

**Why here, not in the library.** The `onSave` / `onModelUpdated` props already
provide the necessary hooks. Shipping persistence as a library dependency would
couple it to the library's release cycle for what is a host-app concern.

**Where in code.** `src/index-docker.tsx` — app shell; new `src/docker/`
directory for management UI and storage utilities.

**Approach sketch.**
- `DiagramManager`: localStorage-backed store. Strip icon data on write (full
  icon set re-hydrated on load). Quota-exceeded handler with a clear-space
  dialog.
- Toolbar: `New`, `Save`, `Load…`, `Import`, `Export`.
- Unsaved-changes pill wired to `onModelUpdated`.
- Auto-save every 5 s for any named diagram (debounced, no-op for "Untitled").
- `beforeunload` guard for unsaved changes.

**Effort.** Medium. ~2 days. Zero library API changes.

---

### APP-02 PWA shell for Docker image **[NEW]**

**What it does.** Adds a Web App Manifest and service worker to the Docker
image's static files so the editor installs as a PWA on macOS, Linux, and
ChromeOS. Works offline after first load.

**Where in code.** `public/manifest.json`, `public/sw.js` (via Workbox);
`webpack/docker.config.js` — register service worker in HTML template.

**Approach sketch.**
- Manifest: `name`, `short_name`, `start_url`, `display: standalone`, `icons`
  (192 × 192 and 512 × 512 PNGs).
- Service worker (Workbox): cache-first for all static assets.
- `<link rel="manifest">` in the Docker HTML template.
- Note in `docs/docker.md` that the service worker is active.

**Effort.** Small. ~0.5 days.

---

## Tier 4 — Explicit non-goals (this round)

- **Real-time collaboration** (CRDT/OT, presence cursors) — deferred. Tier 1
  keeps the door open without committing.
- **Full auto-layout** (graphviz-style) — rarely produces what users want for
  isometric layouts; high effort, low return. Templates (2.14) cover the same
  blank-canvas pain at 1% of the cost.
- **Plugin / extension system** — premature. Better to stay opinionated until
  clear demand appears.
- **i18n** — low ROI; defer until non-English demand appears. Isometric
  diagrams are largely language-agnostic.
- **Named-snapshot version history** — undo/redo covers the common case;
  named snapshots belong in the host. The Docker shell (APP-01) handles the
  standalone case.
- **Accessibility / full keyboard nav / screen-reader support** — important
  eventually but a deep, separate project. **Deferred, not declined** — worth
  planning as its own initiative once Tier 1/2 is done.

---

## Cross-cutting guidance for dynamic diagramming

Five design moves that matter most for the embedded-live-dashboard use case:

1. **Treat the model as externally driven.** Host passes data → Reticulyne
   reflects it. Every mutation surfaces through `onChange` / event callbacks.
   Avoid implicit internal mutation paths the host can't observe.
2. **Everything observable must be addressable by stable id.** Nodes,
   connectors, rectangles, and groups (once 1.7 lands). The imperative API
   (1.6) is only useful if the host can target items by id without scanning the
   model.
3. **Animation should be data-driven, not just on/off.** `animationRate:
   number` and `animationFlow: 'forward' | 'reverse' | 'both'` (FEA7-01,
   already landed) let hosts drive flow rate from real telemetry. The name
   `animationFlow` avoids colliding with the existing `direction` field
   governing arrow rendering.
4. **Status indicators belong on connectors too.** `nodeIndicatorComponent`
   and `connectorIndicatorComponent` (FEA7-03) are both live. SVG export
   (shipped FEA13-01) and mini-map (2.8) must handle these render slots
   gracefully.
5. **Read-only mode should look read-only.** `EXPLORABLE_READONLY` exists but
   cursor and hover affordances may still suggest interactivity. A once-over
   pass — default cursor, no hover-edit highlights, no "click to edit"
   affordances — is worth doing before the stabilisation cut. Pair with the
   touch pinch-to-zoom work (2.12) since that mode is the primary touch target.

---

## Suggested order of attack

If a sequence is wanted rather than a menu, this order minimises re-work and
front-loads the highest-return items. **Assumption:** the README-tracked feature
set (enableGlobalDragHandlers, per-rectangle fill, 8-directional routing, SVG
export, selection dimming, dark mode, diagram layers + Redacted, multi-floor
management) lands before item 1 below begins.

1. **1.2 diagram title UI** — 0.5 days; tiny schema fix + API method.
2. **1.3 layer ordering UI** — 1 day; reducer already half-wired.
3. **2.1 + 2.2 anchor hotspots + double-click to add** — 1 day combined;
   pure UX wins; 2.1 is a dependency for 2.5.
4. **2.3 auto-save indicator** — 0.5 days; completes the embedder trust
   contract.
5. **2.10 replace Quill** — 2–3 days; promoted early to clear the Quill API
   surface before interaction features accrete around it; security milestone;
   dark-mode CSS override migrates to TipTap in this step.
6. **2.5 left-click drag to connect** — 1.5 days; depends on 2.1 (step 3).
7. **1.4 multi-select** — 2–3 days; unlocks 3.2 and bulk operations.
8. **1.5 + 1.6 diff updates + stable API** — 2–3 days; document once.
9. **2.7 + 2.8 search + mini-map** — 2 days combined.
10. **2.9 snap-to-grid** — 1 day (snap only; guides are follow-on).
11. **2.11 + 2.12 D&D palette + touch pinch** — 3 days combined.
12. **2.13 + 2.14 custom icons + templates** — 2 days combined.
13. **1.7 grouping** — 3–5 days; save for last in Tier 1 (largest schema
    change).
14. **APP-01 + APP-02 Docker shell** — 2.5 days; after library API is stable.

Stop after Tier 2 and stabilise. Tier 3 becomes a "next minor release" backlog.

---

## Maintenance

- When a Tier 1/2/3 item is picked up, allocate the next free `FEA14-NN` (or
  `BUG14-NN` etc.) at the start of the branch. Excalidraw-alignment items use
  `UXA-NN` (see `Excalidraw Side-by-Side` below). Application-layer items use
  `APP-NN`. Use the ID in every commit subject per `CLAUDE.md`.
- On merge, move the item from this file into `README.md`'s historical section
  under the appropriate round heading, keyed by ID. Don't keep the description
  here; the source of truth becomes the commits and the README retrospective.
- If an item is dropped without shipping, leave a one-line tombstone here noting
  the decision and the date. Reuse of a slot is fine; reuse of a `FEA9-NN` ID
  is not (IDs are append-only).
- This file is forward-looking strategy. Anything observable today (props,
  hooks, schemas) belongs in `docs/api.md` / `docs/embedding.md`, not here.

---

## Excalidraw Side-by-Side

Reticulyne is being embedded into a larger product that also embeds a
customised Excalidraw. The two tools serve different audiences — Excalidraw for
free-form sketching, Reticulyne for tile-based isometric infra diagrams — but they
sit one tab apart in the same shell. A user who has just drawn a flowchart in
Excalidraw and clicks across to sketch an isometric network should feel like
they are still in the same family of tools (the way a Visio user moves between
network-diagram, floor-plan, and flowchart templates without retraining).

**This section is not a merit comparison.** It is a **UX-alignment audit**:
where does Reticulyne's keyboard / mouse / toolbar / menu surface diverge from
Excalidraw's, what should be aligned, and what divergences are domain-driven
and worth keeping. Excalidraw's surface is treated as the fixed reference;
Reticulyne moves to meet it where the action is the same.

**Explicit non-goal:** this section does not propose making Reticulyne into a
free-form vector editor, nor making Excalidraw isometric. The bar is "Excalidraw
muscle memory should not be punished".

### Alignment principles

- **Match the shortcut when the action is the same** (`Ctrl+Z`, `?`, `V`, `R`,
  `T`, `H` — already aligned today).
- **Don't invent a new modifier convention when Excalidraw has one** —
  `Alt+drag` = duplicate; `Space+drag` = pan; `Shift+click` = extend selection.
- **Free-form-only behaviours are domain-divergent, not bugs** (eraser,
  freehand, diamond, ellipse, line — no equivalent in a tile-based isometric
  editor).
- **Where Reticulyne has a concept Excalidraw doesn't** (isometric tiles, fixed
  connector anchors, layered floors) — invent freely, but don't reuse a key
  Excalidraw already owns.
- **The Excalidraw `?` help dialog is the implicit contract.** If a shortcut
  appears there, Reticulyne should either match it, deliberately leave it unbound,
  or document the divergence in its own `?` dialog.

### Side-by-side — keyboard shortcuts

Status legend: **MATCH** = same key, same action (keep). **MISMATCH** = same
key, different action (collision) or different key, same action — fix.
**GAP** = Excalidraw has it, Reticulyne doesn't, would translate — add.
**DOMAIN** = Excalidraw concept that doesn't apply here — acknowledge and
leave.

| Action | Excalidraw | Reticulyne today | Status | Fix tracked under |
|---|---|---|---|---|
| Selection tool | `1` or `V` | `V` / `S` | **MISMATCH** — `1` collides with Reticulyne's reset-zoom | UXA-01 |
| Hand / pan tool | `H` | `H` | MATCH | — |
| Rectangle tool | `R` or `2` | `R` | MISMATCH (number alias missing) | UXA-01 |
| Text tool | `T` or `8` | `T` | MISMATCH (number alias missing) | UXA-01 |
| Arrow / connector | `A` or `5` | `C` | **MISMATCH** — `A` collides with Reticulyne's Add-item | UXA-01 |
| Add image / icon | `9` | `A` | **MISMATCH** — reuses Excalidraw's arrow key | UXA-01 |
| Reset zoom | `Ctrl/Cmd+0` | bare `0` or `1` | **MISMATCH** — bare digits collide with Excalidraw's tool keys | UXA-01 |
| Zoom in | `Ctrl/Cmd+=` | bare `=` | MISMATCH (modifier alias missing) | UXA-01 |
| Zoom out | `Ctrl/Cmd+-` | bare `-` | MISMATCH (modifier alias missing) | UXA-01 |
| Fit to view | `Shift+1` | `F` | MISMATCH (Shift+1 alias missing) | UXA-01 |
| Fit to selection | `Shift+2` | n/a | GAP — depends on multi-select | UXA-07 (after 1.4) |
| Space+drag pan | wired | dialog-documented, **not wired** | GAP | UXA-02 |
| Alt+drag duplicate | wired | unbound (Alt has no Reticulyne bindings) | GAP | UXA-03 |
| Shift+click extend select | wired | unbound | GAP | 1.4 |
| Marquee drag-select | wired | unbound | GAP | 1.4 |
| Select all | `Ctrl/Cmd+A` | unbound | GAP | UXA-07 (after 1.4) |
| Cut | `Ctrl/Cmd+X` | unbound | GAP | UXA-04 |
| Copy | `Ctrl/Cmd+C` | `Ctrl/Cmd+C` | MATCH | — |
| Paste | `Ctrl/Cmd+V` | `Ctrl/Cmd+V` | MATCH | — |
| Duplicate | `Ctrl/Cmd+D` (or `Alt+drag`) | `Ctrl/Cmd+D` | MATCH for `Ctrl/Cmd+D`; gap on `Alt+drag` | UXA-03 |
| Delete | `Delete` / `Backspace` | `Delete` / `Backspace` | MATCH | — |
| Undo | `Ctrl/Cmd+Z` | `Ctrl/Cmd+Z` | MATCH | — |
| Redo | `Ctrl/Cmd+Shift+Z`; Win `Ctrl+Y` | `Ctrl/Cmd+Shift+Z`; Win `Ctrl+Y` | MATCH | — |
| Group | `Ctrl/Cmd+G` | unbound | GAP | 1.7 |
| Ungroup | `Ctrl/Cmd+Shift+G` | unbound | GAP | 1.7 |
| Send backward | `Ctrl/Cmd+[` | context-menu only | GAP | 1.3 + UXA-06 |
| Bring forward | `Ctrl/Cmd+]` | context-menu only | GAP | 1.3 + UXA-06 |
| Send to back | `Ctrl/Cmd+Shift+[` (Win) / `Cmd+Opt+[` (Mac) | context-menu only | GAP | 1.3 + UXA-06 |
| Bring to front | `Ctrl/Cmd+Shift+]` (Win) / `Cmd+Opt+]` (Mac) | context-menu only | GAP | 1.3 + UXA-06 |
| Nudge | arrow keys (`Shift` = ×N) | arrow keys (`Shift` = ×5) | MATCH | — |
| Help dialog | `?` | `?` | MATCH | — |
| Toggle theme (light↔dark) | `Alt+Shift+D` | n/a (prop-only) | GAP | UXA-08 |
| Toggle selection dimming | n/a | `I` | DOMAIN — Reticulyne-only feature | — |
| Lock element | `Ctrl/Cmd+Shift+L` | n/a | GAP — Reticulyne has no lock concept | left open |
| Eraser | `E` or `0` | n/a | DOMAIN | — |
| Diamond | `D` or `3` | n/a | DOMAIN | — |
| Ellipse | `O` or `4` | n/a | DOMAIN | — |
| Line | `L` or `6` | n/a | DOMAIN | — |
| Freedraw | `P` or `7` | n/a | DOMAIN | — |
| Frame / Laser / Eye-dropper | `F` / `K` / `I` | n/a | DOMAIN | — |
| Flip horizontal / vertical | `Shift+H` / `Shift+V` | n/a | DOMAIN — isometric icons | — |

### Side-by-side — gestures, toolbar, menus

| Surface | Excalidraw | Reticulyne today | Status |
|---|---|---|---|
| Left-click empty | deselect | deselect | MATCH |
| Left-click item | select | select | MATCH |
| Double-click empty | start text | no-op | GAP (2.2) |
| Double-click item | edit text / open inline label | no-op | GAP (2.2 will open inspector) |
| Right-click | context menu (rich: cut/copy/paste/group/order/lock) | context menu **only on rectangles** (5 items) | MISMATCH — context menu must extend to items, connectors, textboxes |
| Wheel (plain) | zoom | pan | MISMATCH (intentional, see note) |
| Ctrl+wheel | zoom faster | zoom | MATCH |
| Pinch (touch) | zoom | n/a (single-touch only) | GAP (2.12) |
| Single-finger touch | pan | mapped to mouse events | partial MATCH |
| Drag from library / palette | drop on canvas | n/a — Add-item mode required | GAP (2.11) |
| Toolbar position | top-centre floating | top-left next to hamburger | Visual divergence; defer to integrating shell |
| Library / icon palette | right-side toggleable | inline via Add-Item mode | GAP (2.11 → persistent palette) |
| Main-menu location | hamburger top-left | hamburger top-left | MATCH |
| Property inspector | left rail (when item selected) | right rail (when item selected) | Visual divergence; defer to integrating shell |
| Zoom controls | bottom-left | right rail | Visual divergence; defer to integrating shell |
| Dark-theme toggle (in-app) | `Alt+Shift+D` and main menu | prop-only (no in-app control) | GAP (UXA-08) |

**Note on wheel direction.** Plain-wheel = pan is an Reticulyne design choice
(FEA5-01) because the isometric canvas is conceptually a 2D map where panning
is the primary navigation gesture. Changing this would be a deeper UX shift
than alignment work justifies — flag for product-level discussion if the
embedding host wants parity. `Ctrl+wheel` zoom already matches Excalidraw.

**Note on toolbar / panel positions.** Three layout items above are flagged
*Visual divergence; defer to integrating shell* rather than tracked as UXA
tasks. Moving the toolbar from top-left to top-centre, or flipping the
inspector to the left rail, is a visual-design decision the host shell can
re-skin without rewriting Reticulyne internals (the components are MUI-themed and
positionable). It is out of scope for the keyboard / interaction alignment
this section drives.

### New `UXA-NN` tasks

Ordered by bang-for-buck. Total estimated effort ≈ 3 days across the family;
none requires a schema change. All items are scoped to `EDITABLE` mode unless
noted.

#### UXA-01 Tool hotkey realignment (full parity)

**What it does.** Rebinds tool hotkeys so an Excalidraw user's muscle memory
carries over directly. New bindings:

- `1` → Select (alias of `V` / `S`) — was reset-zoom.
- `2` → Rectangle (alias of `R`).
- `5` → Connector (alias of `C`).
- `A` → Connector (second alias — Excalidraw uses `A` for arrow).
- `8` → Text (alias of `T`).
- `9` → Add-item (alias of `I`).
- `I` → Add-item (replaces current bare `A`). `I` doubles as Excalidraw's
  eye-dropper, but Reticulyne has no eye-dropper, so reuse is safe and "I = Icon"
  is mnemonic.
- `Ctrl/Cmd+0` → Reset zoom (Excalidraw match). Bare `0` / `1` no longer
  bound to reset zoom — they belong to Excalidraw's tool layer.
- `Ctrl/Cmd+=` / `Ctrl/Cmd+-` → zoom in / out aliases alongside existing bare
  `=` / `-`.
- `Shift+1` → Fit-to-view alias of `F` (Excalidraw match).

**Why.** This is the single largest piece of muscle-memory friction between
the two tools. Pressing `1` in Reticulyne currently resets zoom; an Excalidraw
user expects it to be Select. Pressing `A` currently opens the icon picker; an
Excalidraw user expects an arrow / connector. Without this rebind every other
alignment piece is undermined by a daily collision.

**Where in code.** `src/interaction/useKeyboardShortcuts.ts` (binding table);
`src/components/KeyboardShortcutsDialog/KeyboardShortcutsDialog.tsx` (rows
updated to list new bindings, including the deprecation note for bare `0` /
`1`); `docs/api.md` if any keybinding is publicly documented.

**Approach sketch.**
- Extend the binding table to accept multiple keys per action.
- Where a binding is changing semantics (bare `0`, bare `1`, bare `A`), this
  is a breaking change for existing Reticulyne users — call it out in the
  release-notes paragraph that ships with the commit.
- Keep all existing letter aliases (`V`, `S`, `H`, `R`, `T`, `C`, `F`) intact.
  This is additive for everything except the three bare keys whose meaning
  flips.

**Reviewer's notes.** Test that `1` in an input field (e.g. typing into a
node label) still types "1" — the existing input-focus guard in
`useKeyboardShortcuts.ts` already covers this; just verify the new bindings
inherit the same guard.

**Effort.** Small. ~1 day including dialog updates and tests.

---

#### UXA-02 Wire Space+drag to pan

**What it does.** Holding Space turns any current mode into a transient pan
mode. Release Space to return to the prior mode. Matches Excalidraw exactly.

**Why.** The shortcuts dialog already advertises it
(`KeyboardShortcutsDialog.tsx:44`), but no handler is wired. This is the
single most common "I tried to pan and got a wrong gesture" complaint in any
tool that lacks it.

**Where in code.** `src/interaction/useKeyboardShortcuts.ts` (key-up / key-down
on Space); `src/interaction/modes/Pan.ts` (already exists); the mode-stack
plumbing in `src/stores/uiStateStore.tsx` (transient overlay vs replace).

**Approach sketch.**
- On Space key-down (outside input fields): if current mode is not already
  `PAN`, push `PAN` as a transient overlay and remember the previous mode.
- On Space key-up: pop back to the remembered previous mode.
- Cursor changes to `grab` on Space-down, `grabbing` during drag — reuse the
  existing `Pan` mode's cursor logic.
- Guard: ignore Space if the focus target is an input / contenteditable
  (existing guard).

**Effort.** Small. ~0.5 days.

---

#### UXA-03 Alt+drag to duplicate

**What it does.** In Cursor mode, holding Alt while dragging a selected item
starts a drag that places a duplicate at release, leaving the original in
place. Matches Excalidraw.

**Why.** Alt-drag is the universal "copy this somewhere else" gesture in
diagram tools. Reticulyne has no Alt bindings at all today, so this is a pure
addition.

**Where in code.** `src/interaction/modes/Cursor.ts` (detect Alt on
`pointerdown`); `src/interaction/modes/DragItems.ts` (branch on a new
`duplicateOnRelease: boolean` flag); reuse the existing `duplicateItem()`
reducer already wired into the context menu
(`src/components/ContextMenu/ContextMenuManager.tsx`).

**Approach sketch.**
- On `pointerdown` over a selected item with `event.altKey`, enter
  `DRAG_ITEMS` mode with the duplicate flag set.
- During drag the original stays put; render a ghost at the drag position.
- On `pointerup`, call `duplicateItem()` with the drag delta as the placement
  offset, then return to Cursor mode with the duplicate selected.
- Cancel on `Esc`: discard the ghost, leave original untouched.

**Effort.** Small. ~0.5 days.

---

#### UXA-04 Cut (`Ctrl/Cmd+X`)

**What it does.** Copy + delete in one shot. Same key as Excalidraw.

**Where in code.** `src/interaction/useKeyboardShortcuts.ts` — add binding
that calls the existing copy reducer then the existing delete reducer.

**Effort.** Tiny. ~0.25 days.

---

#### UXA-05 Help-dialog audit and divergence note

**What it does.** Update the keyboard-shortcuts dialog to (a) reflect all
UXA-01 to UXA-04 bindings, and (b) add a "Differences from Excalidraw" footer
listing the intentional `DOMAIN` divergences (no diamond, ellipse, line,
freedraw, eraser, frame, laser, eye-dropper — because Reticulyne's atomic unit is
an icon-on-a-tile, not a free-form vector primitive). Users learn what to
expect rather than hunting for shortcuts that don't exist.

**Where in code.**
`src/components/KeyboardShortcutsDialog/KeyboardShortcutsDialog.tsx`.

**Effort.** Tiny. ~0.25 days.

---

#### UXA-06 Bring/send-order hotkeys (depends on 1.3)

**What it does.** Once 1.3 (layer ordering UI) lands, add keyboard bindings
matching Excalidraw exactly: `Ctrl/Cmd+]` / `Ctrl/Cmd+[` for forward /
backward; `Ctrl/Cmd+Shift+]` / `Ctrl/Cmd+Shift+[` for to-front / to-back on
Windows, plus the Mac variants `Cmd+Opt+]` / `Cmd+Opt+[` that Excalidraw
also accepts.

**Where in code.** `src/interaction/useKeyboardShortcuts.ts` (after 1.3 wires
the reducer to non-rectangle item types).

**Effort.** Rolled into 1.3.

---

#### UXA-07 `Ctrl+A` select-all + `Shift+2` fit-to-selection (depends on 1.4)

**What it does.** Once multi-select is wired (1.4): bind `Ctrl/Cmd+A` to
select every item in the current diagram / floor, and `Shift+2` to fit the
viewport to the current selection (Excalidraw's "zoom to selection"). Both
become no-ops with a single item or no selection.

**Where in code.** `src/interaction/useKeyboardShortcuts.ts` (after 1.4);
`src/utils/fitToView.ts` (extend to accept a selection-set bounding box
rather than the full-diagram bounds).

**Effort.** Tiny. ~0.25 days post-1.4.

---

#### UXA-08 `Alt+Shift+D` in-app theme toggle

**What it does.** Dark mode itself shipped in FEA7-04 / FEA9-01 — `themeMode`
is a prop today, host-driven, default `'auto'`. Excalidraw exposes an in-app
keyboard toggle (`Alt+Shift+D`) that flips light ↔ dark regardless of the OS
preference. To match, add a stateful in-app override layer.

**Why.** Without this binding an Excalidraw user pressing `Alt+Shift+D` in
Reticulyne gets nothing, even though the underlying theme machinery is there.
The cost of fixing it is small enough that "we have dark mode but not its
toggle" is not a defensible state.

**Where in code.** `src/stores/uiStateStore.tsx` (new
`themeOverride: 'light' | 'dark' | null` field plus action);
`src/hooks/useResolvedThemeMode.ts` (resolution priority becomes:
`themeOverride` if set, else the `themeMode` prop, else system preference);
`src/interaction/useKeyboardShortcuts.ts` (new binding cycles the override);
`src/components/KeyboardShortcutsDialog/KeyboardShortcutsDialog.tsx` (dialog
row).

**Approach sketch.**
- Match Excalidraw exactly: `Alt+Shift+D` is a binary light ↔ dark toggle,
  not a tri-state cycle. Users who want to return to `auto` either refresh
  the page or use a host-provided UI control. Adding a third "back to auto"
  position diverges from Excalidraw and would be an Excalidraw-user surprise.
- First press: set `themeOverride` to the opposite of whatever
  `useResolvedThemeMode` is currently returning. Subsequent presses flip.
- The host's `themeMode` prop still wins on mount (no UI override yet
  exists). After the first key press, the override wins.
- No persistence across page loads in v1 — the override is per-session.
  Persistence belongs to the host shell, not the library.

**Reviewer's notes.** Ensure the override does not fire while focus is in a
node label or rich-text editor (existing input-focus guard). Add a smoke test
that mirrors `src/__tests__/Reticulyne.fea7-04.test.tsx` for the override path.

**Effort.** Small. ~0.5 days.

### Cross-references to existing roadmap items

Per the cross-reference-only treatment of overlap, the following items already
sit in the roadmap tiers and happen to be alignment moves. They are not
duplicated as UXA tasks — they are noted here so the alignment story reads
end-to-end:

- **Dark mode (shipped — FEA7-04 / FEA9-01).** See README v4.x history. The
  remaining alignment piece is the in-app `Alt+Shift+D` toggle, tracked as
  UXA-08 above.
- **1.3 Layer ordering UI.** The reducer already half-wired; UXA-06 above
  covers the Excalidraw-exact key bindings that ship with it.
- **1.4 Real multi-select.** Covers `Shift+click`, marquee drag-select,
  `Ctrl/Cmd+A` (via UXA-07) and `Shift+2` fit-to-selection.
- **1.7 Grouping / nesting.** Covers `Ctrl/Cmd+G` / `Ctrl/Cmd+Shift+G`.
- **2.11 Drag-and-drop from icon palette.** Lands the persistent right-side
  icon library that aligns with Excalidraw's library panel paradigm.
- **2.12 Multi-touch pinch-to-zoom.** Touch-tablet parity.

### Items intentionally left divergent

These Excalidraw concepts will **not** be added to Reticulyne. Acknowledging them
explicitly here means the user-facing help dialog (per UXA-05) can list them
as "intentionally absent" rather than leaving users to discover the gap.

- **Eraser / Frame / Laser / Eye-dropper / Diamond / Ellipse / Line /
  Freedraw.** Free-form vector primitives. Reticulyne's atomic unit is an
  iconified tile plus a typed connector, a rectangle region, or a text box.
  Adding these primitives would dilute the tool's purpose and create
  ambiguity about which tool a user should reach for in which app.
- **Element lock (`Ctrl/Cmd+Shift+L`).** Reticulyne has no per-item lock concept
  today; read-only behaviour is handled at the embedder level via
  `editorMode`. Worth revisiting *if* embedders ask for per-item lock; not
  worth speculative work.
- **Flip horizontal / vertical (`Shift+H` / `Shift+V`).** Isometric icons are
  not symmetric in either axis; flipping is rarely meaningful and the rare
  cases (e.g. mirror-image rack layout) are better served by alternate icon
  variants in the icon pack.
- **Wheel-zoom default direction.** Plain wheel pans (FEA5-01) because the
  isometric canvas is conceptually a 2D map. `Ctrl/Cmd+wheel` zoom matches
  Excalidraw. Flipping the default to wheel-zoom would be a deeper UX shift
  than alignment work justifies — out of scope for UXA, can be raised as a
  separate product-level discussion.
