# Roadmap — `@qant-au/isoflow`

> **Status:** forward-looking ledger of features under consideration before
> stabilisation. Not a commitment — items are picked up at the maintainer's
> discretion, and the catalogue evolves as the fork's two confirmed use cases
> (embedded live dashboards; consumer-built diagrams) tell us what really
> matters.

Last completed review/fix round was **FEA8** (keyboard shortcuts dialog and
help button). The next round of feature work will land under **`FEA9-NN`**,
with each `NN` allocated at pick-up time. Bugs / docs / security work that
falls out of these features carries the matching prefix (`BUG9-NN`, …).

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
  `INITIAL_DATA`. What is missing: UI to edit it and `useIsoflow()` exposure.
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
Dark mode leads this tier as the P1 integration requirement.

### 1.1 Dark mode ⭐ P1 integration requirement

**What it does.** Canvas, toolbar, and inspector all support a dark theme;
embedder controls via `themeMode: 'light' | 'dark' | 'auto'`.

**Why Tier 1.** P1 integration requirement for the host application. Also,
locking the theming surface in early means the SVG export (2.4), mini-map
(2.8), and future connectorIndicator renders all inherit the correct token
palette without needing separate dark-mode passes. The earlier this lands, the
less rework downstream colour-sensitive features accumulate.

**Where in code.** `src/styles/theme.ts:52-136` is fully MUI-token driven today
with only ~2 hard-coded hex values in `customVars`. Adding a `palette.mode ===
'dark'` branch is the bulk of the work; an audit pass covers the rest.

**Approach sketch.**
- Add a dark variant to the MUI theme. Top-level prop `themeMode: 'light' |
  'dark' | 'auto'`; default to `'auto'` (respects `prefers-color-scheme`).
- Replace the two `customVars` hex colours with mode-aware tokens.
- Grid lines, default node fills, and connector strokes all need dark
  equivalents — pick fresh colours, don't just invert.
- The Quill rich-text editor has its own stylesheet; needs a separate dark-mode
  CSS override (or coordinate with 2.10 if Quill is being replaced first).
- PNG / PDF / SVG exports: default to light always so documents stay readable.
  Add a separate `exportTheme` prop for embedders who need dark exports.
- Add `'dark'` / `'light'` demo toggle to the examples picker
  (`src/index.tsx`) so QA can flip modes without changing code.

**Reviewer's notes.** Icon packs (AWS/Azure/GCP/K8s) are coloured SVGs that
read fine on dark backgrounds. Only black/white icons need a backing chip. The
correction in the prior analysis cuts the effort estimate from "~2 days mostly
auditing colours" to "~1 day mostly picking dark palette". Coordinate with 2.10
(Replace Quill) — TipTap has no bundled theme, which simplifies the dark-mode
audit once Quill is gone.

**Effort.** Small-medium. ~1 day.

---

### 1.2 Diagram title UI and API exposure **[NEW]**

**What it does.** The model schema already carries `title: string` (max 100,
required, defaults to `'Untitled'`). This item exposes that field to users and
to embedders:
- Main menu gains an inline "Rename diagram" action (or an editable title field
  in the header area) that writes to `modelStore.title`.
- `useIsoflow()` gains `getTitle(): string` and `setTitle(s: string): void`.
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
`.default('Untitled')` transform; `src/Isoflow.tsx:174-370` — add to
`useIsoflow()` hook; `src/components/MainMenu/` — add rename action.

**Approach sketch.**
- Change `title: constrainedStrings.name` →
  `title: constrainedStrings.name.optional().default('Untitled')`. Verify
  existing diagrams round-trip correctly.
- Add a "Rename…" item to the main menu that opens an inline text input (reuse
  `<Section>` / `<TextField>` patterns from the inspector panels). On confirm,
  dispatch a `setTitle(s)` action to `modelStore`.
- `getTitle()` and `setTitle(s)` in `useIsoflow()`, both operating on
  `modelStore.title` directly — no history entry needed.
- Update `docs/api.md` with the two new methods.

**Effort.** Tiny. ~0.5 days.

---

### 1.3 Layer ordering UI

*(Was item 1.5 in the previous catalogue; promoted by effort-to-value ratio.)*

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

*(Was item 1.1.)*

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

*(Was item 1.4.)*

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

*(Was item 1.3.)*

**What it does (embedder view).** The host gets a typed surface for driving the
diagram from outside:

```tsx
const iso = useIsoflow();
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

**Where in code.** `src/Isoflow.tsx:174-370` already exposes `useIsoflow()`
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

*(Was item 1.2.)*

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

High-value features ordered by bang-for-buck (cheapest wins first, larger-effort
items last). Items marked **[NEW]** were not in the previous catalogue.

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

*(Was item 2.4.)*

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

### 2.4 SVG export **[NEW]**

**What it does.** A new "Export as SVG" option alongside the existing PNG and
PDF entries. The output is a vector SVG that opens in Illustrator, Figma, or
slides at any resolution.

**Why Tier 2.** The canvas is already SVG-DOM — this is the natural highest-
quality export with no additional dependency.

**Where in code.** `src/components/ExportImageDialog/` — add SVG tab/option;
new `src/utils/exportAsSVG.ts` (mirrors `exportAsImage.ts` shape but targets
`XMLSerializer`).

**Approach sketch.**
- Clone the renderer's root `<svg>` DOM node. Walk the clone to inline `style`
  attributes, replace `class` references with explicit properties, strip React
  data attributes.
- Add correct `xmlns`, `viewBox`, and `width`/`height`.
- `XMLSerializer.serializeToString()` → Blob → `saveAs()` via existing
  `file-saver` dep.
- Icon images: inline as `data:` URIs so the SVG is portable. Test with AWS
  and GCP icon packs (largest isopack icons are ~32 KB; base64 inflation ~33%).
- Export policy: always use light theme (same as PNG/PDF). Add `exportTheme`
  prop override for embedders who need dark exports.
- Known caveat to document: GSAP animations don't transfer; animated connectors
  export as static.

**Effort.** Small. ~1 day.

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

### 2.6 Dark mode (already listed as 1.1)

*Promoted to Tier 1 position 1.1 as the P1 integration requirement. See 1.1.*

---

### 2.7 Search / find (Ctrl+F)

*(Was item 2.3.)*

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

*(Was item 2.2.)*

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

*(Was item 2.1.)*

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

### 2.10 Replace Quill rich-text editor (DEP-04 follow-up)

*(Was item 2.8.)*

**What it does.** Swaps `react-quill-new` → an actively maintained alternative
(TipTap recommended) for the node-description rich-text editor at
`src/components/MarkdownEditor/`.

**Why Tier 2.** The only outstanding accepted residual advisory in `SECURITY.md`
(`GHSA-v3m3-f69x-jf25`, low-severity). The in-source `Link.sanitize` override
plus the narrow `formats` allowlist contain the risk today. Better to land the
swap in v1.

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
- TipTap has no built-in theme, simplifying the dark-mode (1.1) audit.
- Update `SECURITY.md` to close `GHSA-v3m3-f69x-jf25` once npm audit is clean.
  Ping the consumer (`qantcore/app`, `_BlueprintShell.tsx`) to retire their
  explanatory Quill CVE comment.

**Effort.** Medium. ~2–3 days including swap, security-test gate, docs
lockstep, and Docker smoke pass.

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

*(Was item 2.6.)*

**What it does.** "Upload custom icon" button in the icon picker. Drop an SVG /
PNG; it appears in a "My Icons" collection that travels with the diagram JSON.

**Where in code.** Icon-collection plumbing already exists (FEA5-02). Picker in
`src/components/ItemControls/`.

**Approach sketch.** Add `onIconUpload(file: File): Promise<{ url: string;
name: string }>` prop. The returned URL goes into a per-diagram "Custom"
collection. SVG sanitisation is the host's responsibility (already documented
in `SECURITY.md`). Recommend max 200 KB; dedupe by hash.

**Effort.** Small. ~1 day on the Isoflow side; host owns storage.

---

### 2.14 Templates / starter diagrams

*(Was item 2.7.)*

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
`src/index-docker.tsx` and companion files; the `<Isoflow>` component itself is
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

1. **Treat the model as externally driven.** Host passes data → Isoflow
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
   and `connectorIndicatorComponent` (FEA7-03) are both live. SVG export (2.4)
   and mini-map (2.8) must handle these render slots gracefully.
5. **Read-only mode should look read-only.** `EXPLORABLE_READONLY` exists but
   cursor and hover affordances may still suggest interactivity. A once-over
   pass — default cursor, no hover-edit highlights, no "click to edit"
   affordances — is worth doing before the stabilisation cut. Pair with the
   touch pinch-to-zoom work (2.12) since that mode is the primary touch target.

---

## Suggested order of attack

If a sequence is wanted rather than a menu, this order minimises re-work and
front-loads the highest-return items:

1. **1.1 dark mode** — 1 day; P1 integration requirement; no dependencies.
2. **1.2 diagram title UI** — 0.5 days; tiny schema fix + API method.
3. **1.3 layer ordering UI** — 1 day; reducer already half-wired.
4. **2.1 + 2.2 anchor hotspots + double-click to add** — 1 day combined;
   pure UX wins.
5. **2.3 auto-save indicator** — 0.5 days; completes the embedder trust
   contract.
6. **2.5 left-click drag to connect** — 1.5 days; depends on 2.1 being done.
7. **2.4 SVG export** — 1 day; independent, no risk.
8. **1.4 multi-select** — 2–3 days; unlocks 3.2 and bulk operations.
9. **1.5 + 1.6 diff updates + stable API** — 2–3 days; document once.
10. **2.7 + 2.8 search + mini-map** — 2 days combined.
11. **2.9 snap-to-grid** — 1 day (snap only; guides are follow-on).
12. **2.10 replace Quill** — 2–3 days; security milestone.
13. **2.11 + 2.12 D&D palette + touch pinch** — 3 days combined.
14. **2.13 + 2.14 custom icons + templates** — 2 days combined.
15. **1.7 grouping** — 3–5 days; save for last in Tier 1 (largest schema
    change).
16. **APP-01 + APP-02 Docker shell** — 2.5 days; after library API is stable.

Stop after Tier 2 and stabilise. Tier 3 becomes a "next minor release" backlog.

---

## Maintenance

- When a Tier 1/2/3 item is picked up, allocate the next free `FEA9-NN` (or
  `BUG9-NN` etc.) at the start of the branch. Application-layer items use
  `APP-NN`. Use the ID in every commit subject per `CLAUDE.md`.
- On merge, move the item from this file into `README.md`'s historical section
  under the appropriate round heading, keyed by ID. Don't keep the description
  here; the source of truth becomes the commits and the README retrospective.
- If an item is dropped without shipping, leave a one-line tombstone here noting
  the decision and the date. Reuse of a slot is fine; reuse of a `FEA9-NN` ID
  is not (IDs are append-only).
- This file is forward-looking strategy. Anything observable today (props,
  hooks, schemas) belongs in `docs/api.md` / `docs/embedding.md`, not here.
