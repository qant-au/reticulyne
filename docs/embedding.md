# Embedding `@reticulyne/editor`

This document describes the contract a consumer of `@reticulyne/editor` can rely on: every prop, every callback, the imperative API exposed by the `useReticulyne` hook, the container-sizing rules, and the security model.

Audience: a frontend developer embedding the editor inside a larger React application.

> If you only need the standalone editor (Docker SPA), see [`docker.md`](./docker.md) instead.

## Importing

```tsx
import Reticulyne, { useReticulyne } from '@reticulyne/editor';
```

The default export is the `Reticulyne` React component. The named export `useReticulyne` is the imperative hook (only callable inside `<Reticulyne>`'s subtree). Standalone exports (schemas, reducers, types) are also re-exported from the default entrypoint.

## Required peer dependencies

`@reticulyne/editor` externalises its UI / state / theming stack. Install these alongside the library:

```bash
npm install \
  @reticulyne/editor \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

### Getting the package

`@reticulyne/editor` is on npm; the command above installs it with no token or registry
setup. It was `@qant-au/reticulyne` on GitHub Packages up to 0.3.0
([`installation.md`](./installation.md)).

It requires **MUI v9** (v2 required MUI v5). If your application already uses MUI v9 / Emotion / Zustand, you share a single copy at runtime — no duplicate providers, no double Emotion CacheProvider, no version-drift hazards. See [`installation.md`](./installation.md#peer-dependencies) for the exact tested version ranges and v1 → v2 → v3 migration notes.

## Component props (`<Reticulyne>`)

All props are optional. The component renders a fully-functional editor with sensible defaults.

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialData` | `Scene \| InitialData` | `INITIAL_DATA` (empty diagram) | Diagram to open on mount: a scene ([the file format](#the-file-format-scenes)), or a legacy Reticulyne model, converted to a scene on load. Validated whole (Zod). On rejection the editor renders empty and the failure is routed to `onValidationError` (or `console.error` if that prop is omitted). |
| `mainMenuOptions` | `MainMenuOptions` | full menu | Whitelist of main-menu items. Pass `[]` to hide the main menu entirely. See [Controlling UI visibility](#controlling-ui-visibility). |
| `showTitleBar` | `boolean` | `undefined` (follows editorMode) | Override title-bar visibility. `false` = always hidden; `true` = always shown; omitted = controlled by editor mode (`EDITABLE` / `EXPLORABLE_READONLY` show it, `NON_INTERACTIVE` hides it). |
| `showAlignmentGuides` | `boolean` | `true` | While dragging, draw a guide to the nearest other item on the same tile X or Y line. Items already sit on whole tiles, so there is no separate snap setting. |
| `showMiniMap` | `boolean` | `undefined` (shown in `EDITABLE`) | The overview map, bottom-right: the whole diagram with the visible area outlined; click or drag in it to move the view. `true` / `false` force it on or off in any mode. |
| `onIconUpload` | `(file: File) => Promise<{ url: string; name?: string }>` | `undefined` | Adds **Upload icon** to the icon picker (editable diagrams only). Receives the chosen SVG, PNG, JPEG, GIF or WebP file (at most 200 KB), stores it, and resolves with its URL; the icon joins a **My icons** collection saved in the diagram and is armed for placing. Reject with an `Error` to show its message in the picker. The same URL uploaded twice is one icon. Pass the exported `readIconAsDataUrl` to embed the file in the diagram JSON with no server (files up to about 48 KB). Sanitising SVG is the host's job (see SECURITY.md). An `iconCollections` allow-list keeps My icons; only a `deny` entry drops it. |
| `onDiagramReplaced` | `() => void` | `undefined` | Called after the user replaces the whole diagram from inside the editor (**New from template** or **Clear**). A host that stores diagrams by id should treat what follows as a new diagram, or its next save overwrites the one that was open. |
| `templates` | `DiagramTemplate[]` | the bundled `TEMPLATES` | What **New from template** offers: blank, three-tier web app, AWS web application, Kubernetes service and office network by default. A template holds items and views only; it opens with the editor's own icons and colours, and a node whose icon the editor lacks opens without one. Pass your own list to replace them (`TEMPLATES` and `templateToInitialData` are exported), or `[]` to hide the entry. |
| `onNodeClick` | `(id: string) => void` | `undefined` | A node was clicked (press and release without dragging). Fires in `EDITABLE` and `EXPLORABLE_READONLY`, whether or not the click also changed the selection. |
| `onConnectorClick` | `(id: string) => void` | `undefined` | As `onNodeClick`, for a connector. |
| `onSelectionChange` | `(selection: SelectedRef[]) => void` | `undefined` | The selection changed, from any source (click, marquee, keyboard, `select()`). Receives `{ type, id }` copies; not called on mount. |
| `onViewportChange` | `(viewport: Viewport) => void` | `undefined` | Zoom, pan or the current view changed: `{ zoom, scroll: { x, y }, viewId }`. Fires on every step of a pan or pinch, so throttle in the host if the handler is expensive. Not called on mount. |
| `iconCollections` | `{ allow?: string[]; deny?: string[] }` | `undefined` (no filtering) | Filter icon collections by name (case-insensitive). `allow` keeps only matched collections; `deny` removes matched collections. Both can be combined. When omitted, all icons from `initialData.icons` pass through. |
| `onModelUpdated` | `(model: Model) => void` | `undefined` | Live-state notification, invoked whenever the model changes. Not a save: persist with `onSave` or `getScene()`, which give the scene. Callback identity does **not** need to be memoised — the component stores it in a ref to avoid identity churn. |
| `width` | `number \| string` | `'100%'` | Width passed to the root `Box`. Numbers are treated as px; strings are passed verbatim (e.g. `'640px'`, `'50vw'`). |
| `height` | `number \| string` | `'100%'` | Height passed to the root `Box`. Same semantics as `width`. |
| `enableDebugTools` | `boolean` | `false` | Toggles the in-editor debug overlay. |
| `editorMode` | `'EDITABLE'` \| `'EXPLORABLE_READONLY'` \| `'NON_INTERACTIVE'` | `'EDITABLE'` | See [Editor modes](#editor-modes). |
| `renderer` | `RendererProps` | `undefined` | Forwarded to the renderer. Currently supports `{ showGrid?: boolean; backgroundColor?: string }`. |
| `onError` | `(error: Error, info: ErrorInfo) => void` | `undefined` | Invoked by the internal `ErrorBoundary` when a render error escapes. Pipe to your telemetry. |
| `errorFallback` | `ReactNode` | default fallback box | Override the "Editor failed to load" fallback rendered on `ErrorBoundary` catch. |
| `onValidationError` | `(issues: ZodIssue[]) => void` | `undefined` | Invoked when `initialData` (or a `useReticulyne().loadModel(...)` payload) fails schema validation. Receives the array of Zod issues. When omitted, the failure is logged to `console.error` instead. Earlier versions popped a `window.alert`; that has been replaced by this contract. Callback identity does **not** need to be memoised. |
| `enableAnimation` | `boolean` | `false` | Opt-in for the connector animation feature (FEA5-06). When `true`, a connector whose `animated` schema field is `true` renders its glyph travelling along the line on a continuous loop, and the **Animate** toggle appears in the ConnectorControls panel. When `false`, the toggle is hidden and `animated: true` connectors render statically — so a saved-with-animation diagram looks identical to a pre-FEA5-06 deployment until the host opts in. |
| `enableGlobalDragHandlers` | `boolean` | `true` | When `false`, pointer event listeners attach to the renderer element rather than `window`, preventing drag events from leaking into host-page sibling widgets (FEA10-01). Defaults to `true` for backwards compatibility. All pointer input (mouse, touch, stylus) is handled via the Pointer Events API regardless of this setting. |
| `nodeIndicatorComponent` | `(args: { item: ModelItem, view: ViewItem }) => ReactNode` | `undefined` | Per-node decorator (FEA5-07). Rendered inside every Node, positioned at the node's tile and receiving its `ModelItem` + `ViewItem`. Use it to overlay live indicators — status pips, gauges, badges, mini-charts — driven by host state that isn't part of the model. See [Live dashboards](#live-dashboards). |
| `connectorIndicatorComponent` | `(args: { connector: Connector, view: View }) => ReactNode` | `undefined` | Per-connector decorator (FEA7-03). Rendered at every connector's midpoint as an absolutely-positioned overlay, receiving the connector's schema-level model and the parent `View`. Mirrors `nodeIndicatorComponent` for link-level telemetry — throughput, latency, error-rate, link-down — driven by host state that isn't part of the model. |
| `highlightedItemId` | `string` | `undefined` | When set, the editor highlights the item with this ID and dims all others to `opacity: 0.2` with a CSS transition (FEA12-01). Drives focus from host-side navigation without touching interaction state. When omitted, the `Alt+I` keyboard shortcut controls dimming based on the current interactive selection instead. |
| `tour` | `TourStep[]` | `undefined` | A presentation tour (lw-064). When set, a **Start tour** button shows in every mode but `NON_INTERACTIVE`. Each step is `{ nodeId, viewId?, zoom?, title?, narration? }`; see [Presentation tours](embedding.md#presentation-tours). |
| `onTourStepChange` | `(state: TourState \| null) => void` | `undefined` | Called with `{ index, total, step }` each time the tour moves to a step, and with `null` when it ends. |
| `themeMode` | `'light'` \| `'dark'` \| `'auto'` | `'auto'` | Controls the editor colour scheme. `'light'` and `'dark'` force the respective palette. `'auto'` (the default) mirrors the OS/browser `prefers-color-scheme` setting and switches live when the user changes their system preference. The user can flip light / dark for the session with `Alt+Shift+D` (as in Excalidraw); that overrides this prop until the page reloads. |
| `exportTheme` | `'light'` \| `'dark'` | `'light'` | Controls the initial background colour in the export dialog (PNG / PDF). `'light'` seeds the dialog with the light-mode diagram background (`#f6faff`); `'dark'` seeds it with the dark-mode background (`#1a1d24`). The user can still change the background colour inside the dialog before downloading. |
| `children` | `ReactNode` | `undefined` | Optional children rendered inside the Reticulyne provider tree. Intended use is a "driver" child component that calls [`useReticulyne()`](#imperative-api-usereticulyne) to drive the editor from outside — pulse connectors on a timer, update colours from a poller, etc. Driver components typically return `null`. |

> **Breaking change (FEA9-01):** Prior to this release `themeMode` defaulted to `'light'`. The default is now `'auto'`, which follows the user's OS colour-scheme preference. Embedders that relied on the implicit light theme must now pass `themeMode="light"` explicitly to preserve the previous behaviour.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `V`, `S`, `1` | Select tool |
| `H` | Hand (pan) tool |
| `R`, `2` | Rectangle tool |
| `A`, `C`, `5` | Connector tool |
| `T`, `8` | Text tool |
| `I`, `9` | Add item |
| `+` / `-` | Zoom in / out |
| `⌘/Ctrl 0` | Reset zoom |
| `F`, `⇧ 1` | Fit to view |
| `⇧ 2` | Fit to selection |
| `⌘/Ctrl Z` | Undo |
| `⌘/Ctrl ⇧ Z` | Redo |
| `⌘/Ctrl C` | Copy selection |
| `⌘/Ctrl X` | Cut selection |
| `⌘/Ctrl V` | Paste |
| `⌘/Ctrl D` | Duplicate active item |
| `⌘/Ctrl G` | Group the selection |
| `⌘/Ctrl ⇧ G` | Ungroup |
| `⌘/Ctrl A` | Select all |
| `⌘/Ctrl F` | Find items by name, description or icon; `Enter` / `Shift+Enter` step through the matches, `Esc` closes |
| `⇧ Click` | Add / remove from selection |
| Drag on empty canvas | Marquee select (`⇧` to add to the selection) |
| `Del` / `⌫` | Delete selection |
| `↑↓←→` | Nudge selection |
| `⇧ ↑↓←→` | Nudge ×5 |
| `Enter` | Edit the selected object: focus its text or the first field of its panel |
| `⌘/Ctrl ]` / `[` | Bring forward / send backward (`⇧`, or `⌘ ⌥` on macOS, for front / back) |
| `Esc` | Deselect |
| `Alt I` | Toggle item highlighting (dims all items except the selected one) |
| `Alt ↑` / `Alt ↓` | Show the floor above / below |
| `Alt ⇧ D` | Toggle light / dark |
| `?` | Toggle keyboard shortcuts dialog |
| `Tab` / `⇧ Tab` | Select the next / previous object (canvas focused; see [Keyboard and screen-reader access](#keyboard-and-screen-reader-access)) |
| `⌘/Ctrl ↑↓←→` | Pan the view |
| `⇧ F10`, Menu key | Open the selected object's menu |

### Container sizing

The component renders into a single `<Box>` element. `width`/`height` props are forwarded to that box's MUI `sx`. Equivalent options:

- **Fill parent.** Default. Let the surrounding flex/grid layout drive the box.
- **Fixed pixel size.** `<Reticulyne width={640} height={480} />`.
- **CSS units.** `<Reticulyne width="50vw" height="80vh" />`.
- **Wrap in a constrained container.** Useful when the editor needs to share a row with other content:

  ```tsx
  <Box sx={{ width: 640, height: 480, border: '1px solid' }}>
    <Reticulyne />
  </Box>
  ```

The renderer uses a `ResizeObserver` on its DOM root, so it responds to layout changes without a remount.

## Editor modes

`editorMode` controls three things: which mouse interactions are wired up, which UI affordances are visible, and whether model mutations are accepted at the data layer.

| Mode | Pointer interactions | UI affordances | Model-mutation API |
|---|---|---|---|
| `EDITABLE` | All (pan, zoom, drag items, draw connectors, place icons, transform) | Main menu, item controls, context menu | Accepted |
| `EXPLORABLE_READONLY` | Pan, zoom, selection | No add/edit controls; selection-inspector still rendered | Rejected — `setTitle` and `loadModel` log a dev-mode warning and return; `applyPatch` and `Connector.update` are accepted, for live data |
| `NON_INTERACTIVE` | None | None visible | Rejected |

The data-layer guard is enforced inside `useReticulyne` — calling `useReticulyne().setTitle(...)` or `useReticulyne().loadModel(...)` from outside `EDITABLE` mode is a silent no-op (with a dev-mode `console.warn`). Read access via `getModel()` is always allowed.

## Wheel / trackpad input

Mouse-wheel and trackpad input map onto canvas operations the same way modern editors (Figma, Miro, Excalidraw) do:

| Input | Action |
|---|---|
| Plain wheel / two-finger trackpad scroll (vertical) | Pan vertically |
| Plain wheel / trackpad horizontal scroll, Magic Mouse left-right swipe (`deltaX`) | Pan horizontally |
| **Ctrl** + wheel | Zoom in / out |
| **Cmd** + wheel (macOS) | Zoom in / out |
| Trackpad pinch | Zoom in / out (browsers synthesise `ctrlKey` for pinch, so it follows the same path) |
| Click-and-drag with the **Hand / Pan tool** in the toolbar | Pan via drag (unchanged from earlier releases) |

The host page never sees these wheel events bubble — the renderer's wheel listener calls `preventDefault()` on both branches, so embedders that mount `<Reticulyne>` inside a scrollable parent stay pinned (BUG5-09 guarantee).

> **Behaviour change in v4.2.0**: Earlier releases zoomed on plain wheel and required the Hand tool to pan. From v4.2.0 onwards the modifier convention above is the default. The Hand tool still works for click-and-drag panning, so muscle-memory users keep their workflow.

## Keyboard shortcuts

The editor wires the conventions used by Figma, Miro, Excalidraw and tldraw. All shortcuts are window-level and are suppressed while focus is on a text input / textarea / contenteditable surface (e.g. an item-description editor), so they never collide with the host's own typing.

The bindings are the **shared linework keymap**, the same one [Axonometra](https://github.com/qant-au/axonometra) binds, aligned with **Excalidraw's**, letter and number alike, so an operator moving between an Excalidraw canvas and this one is not retrained. The specification, with every deliberate difference from Excalidraw, is [Accurona's `docs/keymap.md`](https://github.com/qant-au/accurona/blob/main/docs/keymap.md); the `?` dialog lists the same table. Excalidraw's free-form tools — diamond (`D`), ellipse (`O`), line (`L`), freedraw (`P`), eraser (`E`) — have no equivalent on a tile-based isometric grid and are deliberately left unbound.

**Tools.** Bare key, no modifier. Select and Hand work in `EXPLORABLE_READONLY` too; the drawing tools need `EDITABLE`.

| Key | Tool |
|---|---|
| `V`, `S` or `1` | Select |
| `H` | Hand / Pan |
| `R` or `2` | Rectangle |
| `A`, `C` or `5` | Connector (`A` is Excalidraw's arrow; `C` is kept as a Reticulyne alias) |
| `T` or `8` | Text (creates a textbox at the current mouse tile) |
| `I` or `9` | Add item (`I` = Icon) |

**Zoom and viewport — `EDITABLE` + `EXPLORABLE_READONLY`.**

| Key | Action |
|---|---|
| `+` / `=` (or `Ctrl/Cmd +=`) | Zoom in |
| `-` / `_` (or `Ctrl/Cmd +-`) | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| `F` or `Shift + 1` | Fit to view |
| `Shift + 2` | Fit to selection (no-op when nothing is selected) |

**Selection — `EDITABLE` mode only.**

| Gesture / Key | Action |
|---|---|
| Click | Select one item |
| Double-click an empty tile | Open the icon picker for that tile; picking an icon places it there (`EDITABLE` only) |
| Double-click an item | Select it and open its inspector (`EDITABLE` only) |
| Toolbar **Icon library** | Opens a persistent icon panel on the right; drag an icon onto a tile, or click it then click the canvas. It stays open for the next one (`EDITABLE` only) |
| Hold `Space` and drag | Pan, from any tool; release `Space` to return to it |
| `Alt` + drag an item | Drag a copy, leaving the original in place; with a multi-selection the whole group is copied (connectors are not). `EDITABLE` only |
| Pinch (touch) | Zoom about the fingers; moving both fingers pans |
| Drag from a node's port to another node | Draw a connector without switching tools. Hovering a node shows a port on each edge; press one and release on the target node or its port. An end pressed or released on a port leaves through that edge of the node; one released on the node itself docks on its centre. Releasing anywhere else cancels. `Shift` + press on a port extends the selection instead (`EDITABLE` only) |
| `Shift` + click | Add the item to the selection, or remove it if already in |
| Drag on empty canvas | Marquee select everything the band touches |
| `Shift` + drag | Add the marquee's contents to the existing selection |
| `Ctrl/Cmd + A` | Select every item, text box, connector and rectangle on the view |
| `Esc` | Deselect (works in any editor mode) |
| `Delete` / `Backspace` | Delete every selected item |
| `↑` `↓` `←` `→` | Nudge the whole selection by one tile (+`Shift` for 5 tiles) |
| Drag a selected item | Move the whole selection, preserving its internal spacing |

With more than one item selected, the inspector shows a multi-edit panel: a
type breakdown, Delete, and layer order.

**Layer order — `EDITABLE` mode only.** Rectangles, connectors and text boxes
each have a layer order within their own kind; a rectangle never passes a text
box. Nodes have none: each node's z-index is its isometric depth, so the node
nearer the viewer always paints in front, and layer actions leave nodes where
they are. A multi-selection moves as one block, keeps its internal order, and
is a single undo step. The same four actions are in the inspector, in the
right-click menu of a rectangle, connector or text box, and on the keyboard:

| Key | Action |
|---|---|
| `Ctrl/Cmd + ]` | Bring forward |
| `Ctrl/Cmd + [` | Send backward |
| `Ctrl/Cmd + Shift + ]` (Mac also `Cmd + Opt + ]`) | Bring to front |
| `Ctrl/Cmd + Shift + [` (Mac also `Cmd + Opt + [`) | Send to back |

**Lock — `EDITABLE` mode only.** `Ctrl/Cmd + Shift + L`, or **Lock** in an
item's right-click menu, locks the selection, as in Excalidraw; the same key
unlocks it when all of it is locked. A locked item is drawn as usual but is
not selectable on the canvas: a click passes over it to what is below, and the
marquee and `Ctrl/Cmd + A` skip it. Locking deselects. Right-click a locked
item for **Unlock**, or the empty canvas for **Unlock all**. The flag is
`locked: true` on a view item, connector, rectangle or text box.

**Clipboard — `EDITABLE` mode only.** Copy, cut and paste act on the **whole
selection**. Connectors are not copied (their ends point at other items), so a
cut leaves selected connectors in place. A paste keeps the copied items'
spacing, is one undo step, and selects what it created. Duplicate still acts on
the **active item** (the one most recently added to the selection).

| Key | Action |
|---|---|
| `Ctrl/Cmd + D` | Duplicate the active item (skips connectors) |
| `Ctrl/Cmd + C` | Copy the selection to the editor's clipboard |
| `Ctrl/Cmd + X` | Cut the selection (connectors stay) |
| `Ctrl/Cmd + V` | Paste with a one-tile offset (works repeatedly) |

**Groups** (`EDITABLE` only). Select two or more nodes, rectangles
or text boxes and press `Ctrl/Cmd + G` (or **Group** in the selection panel).
A group draws as a faint area under its members and acts as one thing: a click
on any member selects the whole group, and dragging, deleting, copying and
recolouring act on all of it. With the group selected, the panel names it,
gives it a backing colour, or ungroups it (`Ctrl/Cmd + Shift + G`).
**Double-click** a member to work inside the group (the group gets a solid
outline and clicks select one level down); `Esc` or a click outside leaves.
Grouping groups nests them. Connectors are never members: they follow the
items they join. A copy of a grouped item is not in the group. Deleting the
last member removes the group; undoing an ungroup restores the same group id.

**Collapse** a selected group from the panel to draw it as one box, labelled
with its name and how many things it holds, in place of its members. The box
sits at the centre of the members' area; nothing else moves. A connector from
outside to a member docks on the box, and one between two members of the group
is hidden until it is expanded. Clicking the box selects the group, so it can
be dragged, copied or deleted as one; the marquee and `Ctrl/Cmd + A` take it
too. **Expand** in the panel, or double-click the box, draws the members
again. A group inside a collapsed group is hidden with it. Each collapse or
expand is one undo step, and the state is saved with the diagram, so an image
or PDF export draws the group as it is shown.

| Key | Action |
|---|---|
| `Ctrl/Cmd + G` | Group the selection |
| `Ctrl/Cmd + Shift + G` | Ungroup the selected group |
| `Double-click` a member | Work inside its group (`Esc` leaves) |
| `Double-click` a collapsed group | Expand it |

In the data, a group is `{ id, name?, color?, parentGroupId?, collapsed? }` in a view's
`groups` array, and membership is `parentGroupId` on each view item, rectangle,
text box or group, so "the members of G" is a filter rather than a list to keep
in sync. `parentGroupId` must name a group on the same view and nesting may not
loop; either failure is a validation error. A host can rename or recolour a
group, or collapse and expand it, live with
`applyPatch({ groups: { [id]: { name, color, collapsed } } })`.

**Arrange.** With two or more items selected, the panel's Arrange row lines
them up along the tile axes: **Align X / Y** puts every item on the active
item's X (or Y) line, and **Distribute X / Y** keeps the two end items and
spaces the rest evenly between them on whole tiles (three or more items). A
move that would put two nodes on one tile is disabled. One undo step each.

**Hover.** Resting the pointer on a node (or a connector that has a
description) shows its name and the start of its description as plain text,
in every editor mode, which is the only way a read-only viewer sees them.

**Colour.** With several items selected, the multi-edit panel's Colour row
recolours every connector and rectangle in the selection in one step (a
rectangle's hex override is cleared so the palette colour shows). Nodes and
text boxes have no colour and are left as they are.

**Undo / redo — `EDITABLE` mode only.**

| Key | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl + Y` | Redo (Windows) |
| `Ctrl/Cmd + Shift + Z` | Redo (Mac convention) |

Undo/redo covers all document mutations (items, view items, connectors, rectangles, textboxes) — rapid bursts within ~250ms collapse into a single history step, so dragging an item counts as one undo. Depth cap is 100 entries.

**Notes for embedders:**

- The clipboard lives in editor session state — copied selections survive across model loads, undo/redo, and view changes, but **not** across page refreshes. There is no integration with the OS clipboard.
- Connectors are not copyable/duplicatable. Their anchors reference other items by id; the right "what does paste mean for a connector whose anchored items aren't in the target context?" semantics is not locked in. PRs welcome.
- All shortcuts respect `editorMode`. `EXPLORABLE_READONLY` drops every editing binding and keeps selecting, panning, zoom, fit, find, the theme toggle, `Alt+I`, `Alt+Up` / `Alt+Down` (floors), `Esc` and `?`. `NON_INTERACTIVE` keeps only the ones that change the view, never a tool.
- `Ctrl/Cmd` + arrow pans the view (Excalidraw uses it for its flowchart walk, which has no equivalent here); only a bare or `Shift` arrow nudges.

## Keyboard and screen-reader access

Everything a pointer does on the canvas has a keyboard route, and a screen reader is
told what is on the diagram and what is selected.

**Reaching the canvas.** The canvas is a focusable `role="application"` region in every
editor mode but `NON_INTERACTIVE`, so it is one stop in the page's tab order (lw-068;
before, it was focusable only with `enableGlobalKeyboardShortcuts={false}`). Its
`aria-describedby` hint names the keys below, and it shows a focus ring when reached
from the keyboard.

**Moving between objects.** With the canvas focused, `Tab` selects the next object and
`Shift + Tab` the previous one, in reading order (top to bottom, then left to right, as
drawn): nodes, text boxes, rectangles and collapsed groups, then connectors. Locked
objects and hidden layers are skipped, as a click skips them. The view follows the
selection when it would be off screen. Past the last object `Tab` clears the selection
and focus moves on out of the canvas, so the canvas is never a keyboard trap. This works
read-only too, and `Ctrl/Cmd` + arrow keys pan.

**Acting on the selection (`EDITABLE`).** The ordinary shortcuts apply: arrows nudge,
`Enter` edits (a node's name and description, a text box's text), `Delete` deletes.
`Shift + F10` or the Menu key opens the object's right-click menu.

| Pointer action | Keyboard route |
|---|---|
| Drag an icon onto the canvas | Open the icon library or the add-item tool, pick the icon with `Enter`; it goes on the free tile nearest the middle of the view, selected, ready to nudge |
| Drag out a rectangle | `R`, then `Enter` on the canvas: a 3 by 3 rectangle in the middle of the view |
| Drag from a port to another node | Select the node, then **Connect to…** in its menu (`Shift + F10`), or `A` then `Enter`; choose the other end by name |
| Right-click | `Shift + F10`, or the Menu key |
| Wheel / drag to pan | `Ctrl/Cmd` + arrow keys |

**Screen readers.** A polite live region reads out each selection as it changes,
however it was made (Tab, a click, a search hit): a node's name, its icon, the plain
text of its description and what it is connected to; a connector's two ends and label;
a text box's text; and where the object is in the Tab order ("3 of 12"). Keyboard
additions and connections are confirmed the same way.

Beside the canvas, outside the application region, a visually hidden **Diagram outline**
section lists every node on the view with its description and connections, and every
text box. It is the diagram's text alternative: a screen reader can browse the whole
diagram with its ordinary reading keys, read-only embeds included, without selecting
anything.

## Controlling UI visibility

All visibility controls are **opt-in restrictions** — omitting a prop always produces the full default behaviour. You only pass a prop when you want to narrow or override it.

### Main menu items — `mainMenuOptions`

Pass an array of the items you want to show. Omit the prop to get the full default menu. Pass `[]` to hide the main menu entirely.

Available values (`MainMenuOptionsEnum`):

| Value | What it renders |
|---|---|
| `'ACTION.OPEN'` | Open a diagram from a local JSON file: a scene, or a legacy model (converted) |
| `'ACTION.NEW_FROM_TEMPLATE'` | Replace the diagram with a starter diagram (see the `templates` prop) |
| `'EXPORT.JSON'` | Download the diagram as a scene file (JSON) |
| `'EXPORT.PNG'` | Export the diagram as a PNG image |
| `'EXPORT.PDF'` | Export the diagram as a PDF |
| `'EXPORT.SVG'` | Export the diagram as SVG. Opens a dialog with background colour picker and two download buttons: **vector SVG** (true-flat, Illustrator/Inkscape/Figma compatible — text boxes not captured) and **universal SVG** (foreignObject, full-fidelity in browsers and Figma) |
| `'ACTION.CLEAR_CANVAS'` | Clear all items from the current view |
| `'LINK.GITHUB'` | Link to the GitHub repository |
| `'VERSION'` | Display the library version number |

```tsx
// Show only export options — hide open/clear/links/version
<Reticulyne mainMenuOptions={['EXPORT.PDF', 'EXPORT.PNG']} />

// Hide the main menu completely
<Reticulyne mainMenuOptions={[]} />
```

### Title bar — `showTitleBar`

The bottom-centre strip shows `"Project title › "` and the [floor switcher](#floors-and-cross-floor-connections) (just the view name in a read-only diagram with one view). By default it follows the editor mode: visible in `EDITABLE` and `EXPLORABLE_READONLY`, hidden in `NON_INTERACTIVE`. Override it independently with `showTitleBar`:

```tsx
// Always hide — regardless of editorMode
<Reticulyne showTitleBar={false} />

// Always show — even in NON_INTERACTIVE
<Reticulyne showTitleBar={true} editorMode="NON_INTERACTIVE" />

// Default (omit the prop) — controlled by editorMode
<Reticulyne />
```

### Icon collections — `iconCollections`

> **Note:** icons are not bundled with the library. They must be supplied by the host application via `initialData.icons`. Each icon can carry a `collection` name (e.g. `"AWS"`, `"Azure"`, `"my-app"`). The `iconCollections` prop lets you filter which collections reach the editor without pre-processing `initialData` yourself.

A saved or exported scene (Export as JSON, `onSave`, `getScene()`) carries only the icons its objects use and the ones uploaded into it (**My icons**), not the whole set you supplied. Loading a scene (`loadModel`, a new `initialData`) keeps the icons the editor already has beside the file's own, so the palette survives opening a file; the previous diagram's uploads are not carried over.

When omitted, every icon in `initialData.icons` passes through unchanged. Collection names are matched **case-insensitively** (`"AWS"` matches `"aws"`). Icons whose `collection` field is `undefined` are treated as "uncategorised" and always pass through both filters.

Changing `iconCollections` at runtime re-applies the filter on the next load — passing a new spec causes `<Reticulyne>` to re-run the model pipeline against the same `initialData` reference, so the filter actually takes effect without the host having to also rebuild `initialData`. Allow/deny array contents are compared by value, so an inline literal like `iconCollections={{ deny: ['AWS'] }}` is fine to pass on every render.

```tsx
// Deny-list: keep everything except AWS and GCP icons
<Reticulyne
  initialData={myData}
  iconCollections={{ deny: ['AWS', 'GCP'] }}
/>

// Allow-list: show only icons from your custom collection
<Reticulyne
  initialData={myData}
  iconCollections={{ allow: ['my-app'] }}
/>

// Both: allow-list runs first, then deny-list refines the survivors
<Reticulyne
  initialData={myData}
  iconCollections={{ allow: ['my-app', 'shared'], deny: ['shared-legacy'] }}
/>
```

### The file format: scenes

Reticulyne opens and saves the [Accurona scene format](https://github.com/qant-au/accurona/blob/main/docs/scene-format.md), the file format it shares
with [Axonometra](https://github.com/qant-au/axonometra). A scene lists each thing once as
an **object**, and **views** place objects: Reticulyne draws the `iso` and `schematic`
views, Axonometra the `plan` views. What `onSave` receives, what Export as JSON downloads
and what `getScene()` returns are all scenes.

On save the edited diagram is merged into the scene that was opened, so a plan view,
objects no diagram view places, connections, object `props` / `ports` / `links`, layers
and the connection a connector draws survive a round trip through Reticulyne. A legacy
Reticulyne model (`InitialData`) is still accepted as input, by `initialData`,
`loadModel` and Open, and converted to a scene (one `iso` view per Reticulyne view, ids
and colours normalised to the scene format's rules). It is never written.

```ts
import { parseScene, serializeScene, type Scene } from '@reticulyne/editor';

const text = serializeScene(scene); // validated; throws on an invalid scene
const result = parseScene(text);    // { ok: true, scene } or { ok: false, errors }
```

### Layers and the Redacted layer

Nodes, connectors, rectangles and text boxes can sit on named **layers** (the scene
format's `layers` and `layer`), which cut across views and groups. The **Layers**
button beside the zoom controls lists them: add, rename, delete (what a layer held
moves to the base layer) and show or hide each one; the inspector's **Layer** field
puts an item, or the whole selection, on one. Anything without a layer is on the base
layer, which is always shown. What a hidden layer holds is not drawn, not selectable
and not exported, and a connector that ends on a hidden node is hidden with it.
Whether a layer is shown is saved with the diagram, and a host can switch it with
`useReticulyne().setLayerVisible(id, visible)`, so one diagram serves several
audiences.

**Redacted** is a reserved layer, always offered and never listed. What is on it is
shown in the editor and left out of **every export** (PNG, PDF, SVG and JSON) unless
the export ticks **Include redacted content**: put addresses and other sensitive
notes there, and the copy you send out leaves them behind. A diagram with nothing on
it exports exactly as before, with no extra question. The file the editor saves
(`onSave`, the Docker image's own storage) is the working copy and always keeps it;
`redactScene(scene)` in `@accurona/core` gives the redacted copy of any scene.

### Floors and cross-floor connections

A **floor** is a view, and the model's `views` are in floor order, lowest first. The
title bar holds the **floor switcher**: a tab per floor, lowest on the left. Clicking a
tab, or `Alt` + `Up` / `Alt` + `Down`, shows another floor, in `EDITABLE` and
`EXPLORABLE_READONLY`. In an editable diagram **+** adds a floor above the others,
drawn like the current one (isometric or flat), double-clicking a tab renames it, and
the floor menu moves the current floor up or down or deletes it (the last floor
stays). Each of those is one undo step; showing a floor is not.

A **connection** joins two items whatever floors they are on: the model's
`connections`, `{ id, from, to, description? }`, which are the scene format's
`connections` between two of the diagram's items. When the two items are on
different floors, each floor draws a **transition stub**: a dashed riser from the item,
up when the other floor is above and down when it is below, ending at a marker that
names the other floor and item. Clicking the marker shows that floor with the item
selected. The node inspector's **Links to other floors** lists an item's links and
adds (pick a floor, then an item on it) or removes them. A stub is not drawn while
either item is on a hidden layer, and an export leaves out a connection to anything it
leaves out (the Redacted layer, say), so a stub never names it.

While an isometric floor is on show, the **other floors** are drawn faintly above and
below it, a storey apart, so the building reads as a stack: enough to follow the
topology, not enough to compete with the floor being edited. They cannot be clicked
and are never exported; the eye button in the floor switcher hides them. That choice
is the viewer's, not the diagram's, and is not saved.

### Presentation tours

For read-only embeds, a tour walks a viewer through the diagram one node at a time
(lw-064). Each step switches to the node's view if need be, centres on it (the canvas
animates the move), highlights it as `highlightedItemId` does, and shows a narration
panel above the title strip: the step count, the node's name, and its narration, with
**Previous**, **Next** (**Finish** on the last step) and a close button.

```tsx
<Reticulyne
  initialData={scene}
  editorMode="EXPLORABLE_READONLY"
  tour={[
    { nodeId: 'edge-fw', narration: '<p>Traffic enters through the <strong>edge firewall</strong>.</p>' },
    { nodeId: 'core-sw', title: 'Core switching', zoom: 0.6 },
    { nodeId: 'db-1', viewId: 'floor-2' }
  ]}
  onTourStepChange={(state) => analytics.track('tour', state?.index ?? 'end')}
/>
```

- **A step** is `{ nodeId, viewId?, zoom?, title?, narration? }`. With no `viewId` it is
  shown on the view on show if that holds the node, or else the first view that does.
  `zoom` defaults to 0.8 and is clamped. `title` defaults to the node's
  name and `narration` to its description.
- **Narration is rich text** in the node-description format, and is rendered through the
  same schema-bound viewer (see [What's rendered as HTML](#whats-rendered-as-html)), so a
  tour from an untrusted source cannot inject markup. Plain text works too.
- **Keys.** While a tour runs, `→` / `↓` / `Page Down` step forward, `←` / `↑` /
  `Page Up` step back, `Home` and `End` jump to the ends and `Escape` ends it. They win
  over the editor's own bindings, so in `EDITABLE` the arrows step the tour rather than
  nudge the selection. Space is left alone: holding it pans.
- **Modes.** A tour runs in every editor mode. In `NON_INTERACTIVE` the panel shows the
  narration without buttons, the keys are ignored, and the host steps it with
  `nextTourStep()` and friends.
- **Starting it from code.** `useReticulyne().startTour(steps?)` takes the same steps; with
  none, and no `tour` prop, it walks every node on the view in reading order (top to
  bottom, then left to right, as drawn). Steps whose node has been deleted are skipped.
- **Ending it** (the close button, `Escape`, **Finish** or `endTour()`) restores whatever
  `highlightedItemId` was before. Loading another diagram ends it too.
- The tour is **viewer state**: it is not saved with the diagram and not on the undo stack.

### Host-managed save — `onSave` + `'ACTION.SAVE'`

The default `'EXPORT.JSON'` menu entry downloads a `.json` scene file to the user's disk — useful for ad-hoc archival, but rarely what a host application wants. For a hosted editor whose state lives in the parent application, the natural save path is "hand the diagram back to the host" — register an `'ACTION.SAVE'` entry in `mainMenuOptions` and pass an `onSave` callback. It receives the diagram as a validated scene:

```tsx
<Reticulyne
  initialData={sceneFromBackend}
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.PDF']}
  onSave={(scene) => {
    return postToBackend(scene);
  }}
/>
```

The Save menu entry only renders when BOTH conditions hold:

- `'ACTION.SAVE'` is listed in `mainMenuOptions`, AND
- the `onSave` prop is supplied.

Listing `'ACTION.SAVE'` without supplying `onSave` logs a one-shot `console.warn` so the misconfiguration is visible in dev. Supplying `onSave` without listing `'ACTION.SAVE'` is silent — useful when the host wants the callback armed for a future menu config change.

Callback identity does not need to be memoised. The component stores the latest `onSave` in the UI-state store and reads it at click time, so passing a fresh inline closure on every render is fine.

**Save status and auto-save.** When `onSave` is supplied, the title bar shows where saving stands:

| Pill | When |
|---|---|
| *(nothing)* | The diagram is as loaded, or as last saved, and nothing has been saved this session |
| Unsaved changes | The model differs from what was loaded or last saved |
| Saving… | `onSave` returned a Promise that is still pending |
| Saved *n* s ago | The last save succeeded and nothing has changed since |
| Save failed · Retry | `onSave` threw or its Promise rejected; the error message is the pill's tooltip |

An edit made while a save is in flight leaves the diagram dirty afterwards. With unsaved changes the browser asks before the tab closes. For auto-save pass `autoSaveDebounce` (milliseconds after the last edit), e.g. `autoSaveDebounce={2000}`; it is off by default, and after a failure it waits for Retry rather than retrying on its own.

```tsx
<Reticulyne
  initialData={diagram}
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.JSON']}
  onSave={(scene) => fetch('/api/diagram', { method: 'PUT', body: serializeScene(scene) })}
  autoSaveDebounce={2000}
/>
```

### Combined example

A typical embedded deployment that shows only what the host needs:

```tsx
<Reticulyne
  initialData={diagramFromBackend}
  editorMode="EDITABLE"
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.PDF', 'EXPORT.PNG']}
  showTitleBar={false}
  iconCollections={{ deny: ['AWS', 'GCP', 'Azure', 'Kubernetes'] }}
  onSave={(scene) => saveToBackend(scene)}
  onModelUpdated={(model) => updateLocalDraft(model)}
/>
```

`onSave` fires when the user clicks Save (and by auto-save, with `autoSaveDebounce`), with the diagram as a scene; `onModelUpdated` fires on every model change with the editor's live model. `onModelUpdated` is a notification, not a save: to persist, use `onSave` (with `autoSaveDebounce` for save-as-you-go) or `useReticulyne().getScene()`, so what is stored is the file format and keeps the parts of the scene Reticulyne does not show.

## Callback: `onModelUpdated`

```tsx
onModelUpdated={(model: Model) => {
  // model includes: title, icons[], colors[], items[], views[]
  // Note: descriptions are HTML strings, not Markdown.
  updateLocalPreview(model);
}}
```

This is live editor state, not a file: persist with `onSave` or `getScene()`.

Identity stability is handled by the component — passing a fresh inline closure on every render does **not** re-fire the callback unless the model itself changed.

## Imperative API: `useReticulyne()`

> **Renamed from `useIsoflow`.** The hook keeps the same return shape and
> semantics, but the old name is **not** re-exported — there is no back-compat
> alias. Upgrading from `@qant-au/isoflow` means renaming
> `import { useIsoflow }` → `import { useReticulyne }`; every unrenamed call site
> raises a TypeScript error.

Callable from any component rendered **inside** `<Reticulyne>`. Returns:

| Member | Signature | Notes |
|---|---|---|
| `getModel()` | `() => Model` | The editor's current model (live state; not a file). |
| `getScene()` | `() => Scene` | The diagram as a scene, the file format: what a save hands to `onSave`. Use this to persist the diagram. |
| `getTitle()` | `() => string` | The diagram title. |
| `setTitle(title)` | `(title: string) => void` | Rename the diagram. Gated on `editorMode === 'EDITABLE'`; schema-validated (over 100 characters goes to `onValidationError`); a blank title becomes `'Untitled'`. Not recorded in undo history. |
| `loadModel(data, options?)` | `(data: Scene \| InitialData, { fitToView?, view? }?) => Promise<boolean>` | Validate and open a scene, or a legacy model (converted to a scene). `options` fits the diagram to the screen or opens a view. Gated on `editorMode === 'EDITABLE'`. Resolves `true` once the diagram has rendered, `false` if refused (wrong mode, or invalid); never rejects. |
| `setEditorMode(mode)` | `(mode) => void` | Switch between `EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`. |
| `setView(viewId)` | `(viewId: string) => void` | Show another view (floor) of the model. Allowed in every editor mode; clears the selection; warns and does nothing for an unknown id. The title bar's floor switcher does the same for the user. |
| `getLayers()` | `() => Layer[]` | The diagram's layers, `{ id, name, visible? }` (absent `visible` is shown). The base layer and the reserved Redacted layer are never listed. |
| `setLayerVisible(layerId, visible)` | `(layerId: string, visible: boolean) => void` | Show or hide a layer, so one diagram serves several audiences. Allowed in every editor mode; saved with the diagram; not recorded in undo; warns and does nothing for an unknown id. |
| `setZoom(z)` | `(z: number) => void` | Set absolute zoom, clamped to 0.2 to 1. |
| `incrementZoom()` / `decrementZoom()` | `() => void` | Step zoom by `ZOOM_INCREMENT` (0.2). |
| `rendererEl` | `HTMLDivElement \| null` | The renderer's outer DOM node — useful for export-to-image or programmatic focus. |
| `Connector.get(id)` | `(id: string) => Connector \| undefined` | Returns the connector (defaults merged) for the given id, or `undefined` if no view contains it. |
| `Connector.update(id, patch)` | `(id, patch) => void` | Mutate `color` / `width` / `style` / `direction` / `glyph` / `animated` from the host. **Bypasses the undo stack** so a live-data poller doesn't fill Ctrl+Z. Gated on `editorMode !== 'NON_INTERACTIVE'` — warns and no-ops otherwise. |
| `Connector.pulse(id, opts?)` | `(id, { durationMs?, glyph? }?) => void` | Fire a one-shot signal pulse — the chosen glyph travels the connector once over `durationMs` (default 1500). Runtime-only: writes to the scene-store overlay, never persisted to the model, never recorded in history. Each call supersedes any pulse already in-flight on that connector. |
| `applyPatch(patch, opts?)` | `(patch: DiagramPatch, { pushToUndo? }?) => void` | Live update by id: node `name` / `description` / `icon` / `tile`; connector, rectangle and text-box styling; group `name` / `color` / `collapsed`. Never touches the selection, zoom or pan. Ids that no longer exist are skipped. During a drag, a marquee or a connector or rectangle being drawn, the patch waits and lands when the gesture ends. Validated first (a bad patch goes to `onValidationError`, nothing changes). Not on the undo stack unless `pushToUndo: true`. Refused in `NON_INTERACTIVE`. |
| `updateNode(id, patch, opts?)` | `(id, NodePatch, opts?) => void` | `applyPatch` for one node. |
| `setConnectorRate(id, rate, opts?)` | `(id, rate: number) => void` | Connector animation rate, 0 (stopped) to 1. Shows only with `enableAnimation`. |
| `getNode(id)` | `(id) => NodeInfo \| undefined` | `{ id, name, description?, icon?, tile }`, a copy; `tile` is `null` when the node is not on the current view. |
| `getViewport()` | `() => Viewport` | `{ zoom, scroll: { x, y }, viewId }`. |
| `getSelection()` | `() => SelectedRef[]` | `{ type, id }` copies, oldest first. |
| `focusNode(id, opts?)` | `(id, { zoom? }?) => void` | Centre the view on a node, optionally at a new zoom (clamped). Allowed in every mode; warns and does nothing if the node is not on the current view. |
| `fitToView()` | `() => void` | Zoom and pan so the whole current view fits. Allowed in every mode. |
| `select(ids)` | `(ids: string \| string[]) => void` | Replace the selection with these nodes, connectors, rectangles or text boxes on the current view; unknown ids are skipped. `EDITABLE` only. |
| `clearSelection()` | `() => void` | Clear the selection. |
| `startTour(steps?)` | `(steps?: TourStep[]) => boolean` | Start a presentation tour (lw-064): these steps, else the `tour` prop's, else every node on the current view in reading order. Validated (a bad step goes to `onValidationError`); a step whose node is on no view is skipped. Returns `false` if nothing could be started. Allowed in every mode. |
| `nextTourStep()` / `previousTourStep()` | `() => void` | Step the tour; does nothing past either end. |
| `goToTourStep(index)` | `(index: number) => void` | Jump to a step (from 0); out of range does nothing. |
| `endTour()` | `() => void` | End the tour and restore the highlight it replaced. |
| `getTourState()` | `() => TourState \| null` | `{ index, total, step }`, or `null` when no tour is running. |

The `Model` and `uiState` escape hatches were removed in 1.6 (breaking; see the CHANGELOG).
Model writes go through `applyPatch`, `setTitle` or `loadModel`; view and selection through the
methods above. There is no `setNodeStatus`: node status is host state, drawn with
`nodeIndicatorComponent` (see Live dashboards).

Worked examples. `loadModel` is gated on the editor mode **as of the last
render**, so it cannot be unlocked and called in the same tick: calling
`setEditorMode('EDITABLE')` then `loadModel(data)` synchronously is refused with
a console warning. (Earlier versions of this page showed exactly that sequence;
`src/__tests__/Reticulyne.api.test.tsx` now pins that it does not work.) Pick
the pattern that matches the editor you are showing.

**Read-only viewer: pass the data as a prop.** A new `initialData` reference
re-hydrates the editor in any mode, so a viewer never needs `loadModel`.

```tsx
import Reticulyne from '@reticulyne/editor';
import type { Scene } from '@reticulyne/editor';
import { useEffect, useState } from 'react';

function DiagramViewer({ diagramId }: { diagramId: string }) {
  const [data, setData] = useState<Scene | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDiagram(diagramId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  if (!data) return <p>Loading...</p>;
  return (
    <div style={{ width: '100%', height: 600 }}>
      <Reticulyne editorMode="EXPLORABLE_READONLY" initialData={data} />
    </div>
  );
}
```

**Editable editor: `loadModel` from a child.** Mount in `EDITABLE` and call
`loadModel` whenever the host wants to replace the contents, for example on
"Revert to saved". The `view` option picks the view to show.

```tsx
import Reticulyne, { useReticulyne, type Scene } from '@reticulyne/editor';

function RevertButton({ diagramId }: { diagramId: string }) {
  const { loadModel } = useReticulyne();
  return (
    <button
      onClick={async () => {
        const saved: Scene = await fetchDiagram(diagramId);
        loadModel(saved, { view: 'network' });
      }}
    >
      Revert to saved
    </button>
  );
}

<Reticulyne editorMode="EDITABLE" initialData={draft}>
  <RevertButton diagramId={id} />
</Reticulyne>;
```

## Rectangle custom styling

The `Rectangle` schema accepts four optional styling overrides in addition to the existing `color` palette reference (FEA11-01):

| Field | Type | Description |
|---|---|---|
| `colorValue` | `string` — 6-digit hex (e.g. `#ff6600`) | Direct fill colour. Overrides the `color` palette reference. Falls back to the palette colour when absent. |
| `outlineColor` | `string` — 6-digit hex | Border stroke colour. Overrides the auto-derived dark variant of the fill. Falls back to the derived colour when absent. |
| `transparency` | `number` (0–1) | Fill alpha, where `0` = fully opaque and `1` = fully transparent. Applied on top of `colorValue` or the palette colour. Omit or set to `0` for a solid fill. |
| `zIndex` | `integer` | Per-rectangle z-order override. Higher values render in front of lower values. Rectangles with the same `zIndex` (or no `zIndex`) keep their relative order from the layer controls (Bring to Front etc.). |

These fields are designed for embedders that push status colours from external systems (e.g. monitoring dashboards, compliance tools) without needing to pre-register palette entries. The editor inspector panel exposes **Fill colour**, **Border colour**, and **Transparency** controls when a rectangle is selected. `zIndex` is an API-only field — interactive layer ordering works through the Layer order buttons, the context menu and the `Ctrl/Cmd + ]` / `[` hotkeys (see Layer order above).

Example using `applyPatch` from a driver child:

```typescript
import Reticulyne, { useReticulyne } from '@reticulyne/editor';

function StatusOverlay() {
  const { applyPatch } = useReticulyne();

  function paintAlert(rectangleId: string) {
    applyPatch({
      rectangles: { [rectangleId]: { colorValue: '#d32f2f', transparency: 0.3 } }
    });
  }

  function clearAlert(rectangleId: string) {
    applyPatch({
      rectangles: { [rectangleId]: { colorValue: undefined, transparency: undefined } }
    });
  }

  return null;
}
```

Alternatively, supply `colorValue` / `outlineColor` / `transparency` / `zIndex` directly in `initialData` when mounting the component — all fields are optional and round-trip through `onModelUpdated` unchanged.

## Live dashboards

Four pieces of surface area combine to turn the editor into a host-driven dashboard:

- **`enableAnimation`** (boolean prop) flips the connector animation feature on. When omitted, every dashboard primitive below is a silent no-op — your existing embed renders unchanged.
- **`nodeIndicatorComponent`** decorates every node with host-supplied React (gauges, pips, badges).
- **`connectorIndicatorComponent`** mirrors it for connectors (FEA7-03) — pass a component to overlay link-level telemetry at each connector's midpoint (throughput, latency, error-rate, link-down).
- **`useReticulyne().Connector`** lets host code mutate connector visuals and fire signal pulses from outside the editor tree. Because the hook needs to be a descendant of `<Reticulyne>` to see the contextual stores, pass a "driver" child component via the `children` prop.

Worked example — a simulated three-tier system whose API and database states wobble on a timer:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import Reticulyne, { useReticulyne } from '@reticulyne/editor';

type Status = 'up' | 'degraded' | 'down';
const STATUS_COLOR: Record<Status, string> = {
  up: '#1f9d55',
  degraded: '#f59e0b',
  down: '#dc2626'
};

// Driver child rendered inside <Reticulyne>. Reads host state via
// props, calls useReticulyne().Connector imperatively on each tick.
function DashboardDriver({ statuses, onTick }: { statuses: Record<string, Status>; onTick: () => void }) {
  const { Connector } = useReticulyne();
  useEffect(() => {
    const id = window.setInterval(onTick, 1500);
    return () => window.clearInterval(id);
  }, [onTick]);
  useEffect(() => {
    Connector.pulse('conn-web-api', { durationMs: 1200 });
    if (statuses.db !== 'down') {
      Connector.pulse('conn-api-db', { durationMs: 1200 });
    }
    Connector.update('conn-api-db', {
      color: statuses.db === 'down' ? 'color-red' : 'color-green'
    });
  }, [Connector, statuses]);
  return null;
}

export function LiveDashboard() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({
    web: 'up', api: 'up', db: 'up'
  });
  const advance = useCallback(() => {
    // ...scripted state machine; see src/examples/LiveDashboard/...
    setStatuses(/* next */);
  }, []);
  // Rebuild the indicator function whenever statuses change so the
  // captured closure stays current.
  const nodeIndicatorComponent = useMemo(() => {
    return ({ item }) => (
      <div style={{
        position: 'absolute',
        right: -28,
        top: -68,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: STATUS_COLOR[statuses[item.id]],
        border: '2px solid white'
      }} />
    );
  }, [statuses]);

  return (
    <Reticulyne
      initialData={dashboardData}
      enableAnimation
      editorMode="EXPLORABLE_READONLY"
      nodeIndicatorComponent={nodeIndicatorComponent}
    >
      <DashboardDriver statuses={statuses} onTick={advance} />
    </Reticulyne>
  );
}
```

A complete runnable version lives at [`src/examples/LiveDashboard/LiveDashboard.tsx`](../src/examples/LiveDashboard/LiveDashboard.tsx) and ships as the "Live dashboard" entry in the examples picker at <http://localhost:2223/>.

### When to use which primitive

| You want… | Use… |
|---|---|
| A status badge / gauge rendered next to a node | `nodeIndicatorComponent` |
| A throughput / latency / link-down badge on a connector | `connectorIndicatorComponent` |
| A connector that always pulses to show it's "live" | `connector.animated: true` in the model |
| To fire one-shot signal pulses per event (request, payment, etc.) | `useReticulyne().Connector.pulse(id, …)` |
| To recolour a connector based on health / status | `useReticulyne().Connector.update(id, { color })` |
| To swap the arrowhead for `$` / parcel / lightning / etc. | `connector.glyph: 'dollar' \| 'square' \| 'bolt' \| …` |

### What gets persisted vs what's runtime

| State | Persisted in the model? | Survives undo? |
|---|---|---|
| `connector.glyph`, `connector.animated`, `connector.color` (set via UI dropdown) | Yes (schema fields) | Yes (editor changes are undoable) |
| `useReticulyne().Connector.update(...)` writes | Yes (model) | **No** — host-driven updates bypass the undo stack |
| `useReticulyne().Connector.pulse(...)` | **No** — scene-store overlay only | N/A — never touches the model |
| `nodeIndicatorComponent` output | **No** — host renders into a slot on each render | N/A — host state |
| `connectorIndicatorComponent` output | **No** — host renders into a midpoint slot on each render | N/A — host state |

The "host updates bypass undo" rule is deliberate: a poller calling `Connector.update` once a second would otherwise saturate the 100-deep undo ring and make Ctrl+Z useless for the editor user.

## Peer dependencies

The package declares `react` and `react-dom` as peers with the range `>=19`: the export dialogs use `useActionState`, which React 18 does not have.

CSS is injected at runtime via Emotion (a Reticulyne dependency, not a peer). No stylesheet imports are required from the consumer side.

## Security model

The top-level [README §Security](../README.md#security) carries the short version. This section is the full embed-side contract. Pair it with [`../SECURITY.md`](../SECURITY.md), which tracks accepted residual advisories.

### What's rendered as HTML

Only one field on the model is HTML: `Model.items[].description`. Everything else (titles, names, ids, view metadata, colours, icon urls) is plain string / structured data and is rendered through React's text-node escaping. Connector and view-item *names* are likewise plain text.

The `description` field is rendered through a **TipTap** editor ([`src/components/MarkdownEditor/MarkdownEditor.tsx`](../src/components/MarkdownEditor/MarkdownEditor.tsx)). Both paths run the string through a ProseMirror schema before it reaches the DOM: the editable path parses it into the document via `useEditor({ content })`, and the read-only path (used for on-canvas labels) regenerates display HTML with `generateHTML(generateJSON(value))`. Because that schema only knows five inline marks, the rendered HTML can only ever be those marks — the input string is never written to the DOM verbatim.

### What the library does for you

1. **Schema-based sanitisation (both directions).** The editor registers only `Document`, `Paragraph`, `Text`, and the marks `Bold`, `Italic`, `Underline`, `Strike`, `Link` (`EDITOR_EXTENSIONS` in [`MarkdownEditor.tsx`](../src/components/MarkdownEditor/MarkdownEditor.tsx)). ProseMirror's parser has no rule for any other tag, so `<script>`, `<iframe>`, `<svg>`, `<img>`, `<style>`, `<form>` and every undeclared attribute (`onerror`, `onload`, `srcdoc`, `style`) are dropped when the `value`/`initialData` HTML is parsed **in**, and the serialiser can only emit the registered marks on the way **out**. **Do not widen `EDITOR_EXTENSIONS`** (e.g. an image, `iframe`, or raw-HTML extension) without re-evaluating this: those reopen vectors the current design closes.
2. **`SafeLink` protocol rejection** ([`src/components/MarkdownEditor/sanitizeLinkUrl.ts`](../src/components/MarkdownEditor/sanitizeLinkUrl.ts)). The `Link` mark is extended so every `href` is routed through `sanitizeLinkUrl` on both parse and render. Allowed protocols: `http`, `https`, `mailto`, `tel`; forbidden (link dropped / replaced): `javascript`, `data`, `vbscript`, `file`, `blob` — including percent-encoded variants such as `javascript%3a`. This applies to user-typed links and to `value`-prop HTML alike.
3. **JSON validation.** A file is parsed with `parseJson`, which drops `__proto__`, `constructor` and `prototype` keys. Both the `initialData` prop and the in-editor "open JSON file" flow then validate the whole document before any state mutation: a scene against the scene schema, a legacy model through `initialDataSchema.safeParse()` (Zod) and then as the scene it converts to. Cross-references (view items must exist in model items, connector anchors must reference valid items) are also validated. This protects you from malformed data but **does not sanitise HTML in the `description` field** — Zod has no opinion on HTML.
4. **Icon URL allowlist + export-time SVG sanitisation** (SEC-01). `iconSchema.url` is restricted at validation time to `http(s):`, `blob:`, relative paths, and image-only `data:` URIs (`png`/`jpeg`/`gif`/`webp`/`svg+xml`); `javascript:`, `file:`, and non-image `data:` (e.g. `data:text/html`) are rejected, so a crafted `initialData` can't smuggle an executable URL into an `<img src>`. When you export to SVG, every inlined SVG icon is additionally stripped of `<script>`, `<foreignObject>`, and `on*` handlers — so an exported file opened directly from a `file:` origin can't execute embedded content. The export inliner also re-checks each icon URL against the same allowlist *before* fetching it (SEC-11), so even an embedder running a permissive `connect-src` can't be coerced into fetching `file:`/cross-protocol targets through the export path.

### What the library does NOT do for you

Unlike the previous Quill implementation, the schema now **does** run on the `description` *value* between the prop and the render, so the vectors that used to survive no longer do:

- `<iframe srcdoc="...">`, `<svg onload="...">`, `<img src=x onerror="...">`, `<style>...</style>`, `<form>` — dropped on parse, in both the editable and read-only paths.
- Inline-handler attributes (`onclick`, `onmouseover`, `onerror`, `onload`, …) — never survive, because the schema declares no such attributes on any node or mark.
- `onModelUpdated` returns `description` strings that have already been normalised by the schema (re-serialised from the parsed document), so what comes out is HTML restricted to the five marks.

What remains **your** responsibility is anything you do with a `description` **outside** Reticulyne — a preview pane, search results, a server-side render, a non-Reticulyne HTML sink, or trusting a stored value verbatim later. Reticulyne only guarantees the markup it renders itself.

### The rule for embedders

**Inside Reticulyne, a `description` is sanitised for you.** If you render descriptions anywhere else — or want defense-in-depth because the same strings flow through other systems — sanitise them there. [DOMPurify](https://github.com/cure53/DOMPurify) with an allowlist matching the editor's marks makes a round-trip lossless:

```tsx
import DOMPurify from 'dompurify';
import Reticulyne from '@reticulyne/editor';

// Match the editor's own allowlist so a round-trip through Reticulyne is lossless.
const SANITISE_OPTIONS: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
};

const sanitised = {
  ...rawInitialData,
  items: rawInitialData.items.map((item) => {
    return {
      ...item,
      description: DOMPurify.sanitize(item.description ?? '', SANITISE_OPTIONS)
    };
  })
};

<Reticulyne
  initialData={sanitised}
  onModelUpdated={(model) => {
    // The same rule applies on the way out — anything downstream of
    // `onModelUpdated` that re-renders descriptions should re-sanitise.
    persistToBackend(model);
  }}
/>;
```

For rendering *inside* Reticulyne this step is optional — the schema already sanitises. Add it when descriptions are consumed elsewhere too, or when you'd simply rather sanitise at the trust boundary regardless.

### Other notes

- **Standalone Docker image.** The standalone editor (see [`docker.md`](docker.md)) loads no diagrams from untrusted sources by default — the user types directly into the running editor. The nginx CSP it ships is `script-src 'self'; object-src 'none'; frame-ancestors 'self'` (full policy in [`../docker/nginx.conf`](../docker/nginx.conf)), which contains a typed-XSS payload to the local origin and blocks script execution from anywhere else. The `style-src 'unsafe-inline'` allowance is required by Emotion/MUI and is documented in [`../SECURITY.md`](../SECURITY.md).
- **Embedding inside another app with a strict CSP.** Reticulyne inherits the host page's CSP. Because Emotion injects styles at runtime, you'll need `style-src 'unsafe-inline'` (or a nonce-based equivalent) in the host policy. `script-src` can stay tight.

## Globals and side effects on import

- A small block of global CSS is injected (Emotion `<GlobalStyles>`) when `<Reticulyne>` first mounts. Scoped to selectors the editor controls; no overrides of body / `*` styles.
- The rich-text editor (TipTap, used for descriptions) registers no global editor state. Its link-protocol guard is a per-editor `SafeLink` extension, not a module-load global mutation — an improvement on the previous Quill implementation, which patched a shared `Link` blot at import.
- No global event listeners are registered on `window` outside the component's lifecycle. All listeners are removed in their effect's cleanup.
