# Embedding `@qant-au/reticulyne`

This document describes the contract a consumer of `@qant-au/reticulyne` can rely on: every prop, every callback, the imperative API exposed by the `useReticulyne` hook, the container-sizing rules, and the security model.

Audience: a frontend developer embedding the editor inside a larger React application.

> If you only need the standalone editor (Docker SPA), see [`docker.md`](./docker.md) instead.

## Importing

```tsx
import Reticulyne, { useReticulyne } from '@qant-au/reticulyne';
```

The default export is the `Reticulyne` React component. The named export `useReticulyne` is the imperative hook (only callable inside `<Reticulyne>`'s subtree). Standalone exports (schemas, reducers, types) are also re-exported from the default entrypoint.

## Required peer dependencies (v2 onwards)

`@qant-au/reticulyne@2+` externalises its UI / state / theming stack. Install these alongside the library:

```bash
npm install \
  @qant-au/reticulyne \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

### GitHub Packages authentication

The package is published to GitHub Packages, not the public npm registry. Before installing, add the following to your project's `.npmrc` (create the file at the project root if it does not exist):

```
@qant-au:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with a [GitHub personal access token](https://github.com/settings/tokens) that has the `read:packages` scope. The token only needs read access — it is used to pull the package, not to publish. Keep the token out of source control (add `.npmrc` to `.gitignore` if the token is embedded, or use an environment variable: `_authToken=${GITHUB_TOKEN}`). Once the `.npmrc` is in place, `npm install` resolves `@qant-au/reticulyne` normally.

`@qant-au/reticulyne@3` requires **MUI v9** (v2 required MUI v5). If your application already uses MUI v9 / Emotion / Zustand, you share a single copy at runtime — no duplicate providers, no double Emotion CacheProvider, no version-drift hazards. See [`installation.md`](./installation.md#peer-dependencies) for the exact tested version ranges and v1 → v2 → v3 migration notes.

## Component props (`<Reticulyne>`)

All props are optional. The component renders a fully-functional editor with sensible defaults.

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialData` | `InitialData` | `INITIAL_DATA` (empty model) | Diagram contents to hydrate on mount. Validated against `modelSchema` (Zod). On rejection the editor renders empty and the failure is routed to `onValidationError` (or `console.error` if that prop is omitted). |
| `mainMenuOptions` | `MainMenuOptions` | full menu | Whitelist of main-menu items. Pass `[]` to hide the main menu entirely. See [Controlling UI visibility](#controlling-ui-visibility). |
| `showTitleBar` | `boolean` | `undefined` (follows editorMode) | Override title-bar visibility. `false` = always hidden; `true` = always shown; omitted = controlled by editor mode (`EDITABLE` / `EXPLORABLE_READONLY` show it, `NON_INTERACTIVE` hides it). |
| `iconCollections` | `{ allow?: string[]; deny?: string[] }` | `undefined` (no filtering) | Filter icon collections by name (case-insensitive). `allow` keeps only matched collections; `deny` removes matched collections. Both can be combined. When omitted, all icons from `initialData.icons` pass through. |
| `onModelUpdated` | `(model: Model) => void` | `undefined` | Callback invoked whenever the model changes. Callback identity does **not** need to be memoised — the component stores it in a ref to avoid identity churn. |
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
| `highlightedItemId` | `string` | `undefined` | When set, the editor highlights the item with this ID and dims all others to `opacity: 0.2` with a CSS transition (FEA12-01). Drives focus from host-side navigation without touching interaction state. When omitted, the `I` keyboard shortcut controls dimming based on the current interactive selection instead. |
| `themeMode` | `'light'` \| `'dark'` \| `'auto'` | `'auto'` | Controls the editor colour scheme. `'light'` and `'dark'` force the respective palette. `'auto'` (the default) mirrors the OS/browser `prefers-color-scheme` setting and switches live when the user changes their system preference. |
| `exportTheme` | `'light'` \| `'dark'` | `'light'` | Controls the initial background colour in the export dialog (PNG / PDF). `'light'` seeds the dialog with the light-mode diagram background (`#f6faff`); `'dark'` seeds it with the dark-mode background (`#1a1d24`). The user can still change the background colour inside the dialog before downloading. |
| `children` | `ReactNode` | `undefined` | Optional children rendered inside the Reticulyne provider tree. Intended use is a "driver" child component that calls [`useReticulyne()`](#imperative-api-usereticulyne) to drive the editor from outside — pulse connectors on a timer, update colours from a poller, etc. Driver components typically return `null`. |

> **Breaking change (FEA9-01):** Prior to this release `themeMode` defaulted to `'light'`. The default is now `'auto'`, which follows the user's OS colour-scheme preference. Embedders that relied on the implicit light theme must now pass `themeMode="light"` explicitly to preserve the previous behaviour.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `V`, `S` | Select tool |
| `H` | Hand (pan) tool |
| `A` | Add item |
| `R` | Rectangle tool |
| `C` | Connector tool |
| `T` | Text tool |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| `F` | Fit to view |
| `⌘/Ctrl Z` | Undo |
| `⌘/Ctrl ⇧ Z` | Redo |
| `⌘/Ctrl C` | Copy |
| `⌘/Ctrl V` | Paste |
| `⌘/Ctrl D` | Duplicate |
| `Del` / `⌫` | Delete selected |
| `↑↓←→` | Nudge selected item |
| `⇧ ↑↓←→` | Nudge ×5 |
| `Esc` | Deselect |
| `I` | Toggle item highlighting (dims all items except the selected one) |
| `?` | Toggle keyboard shortcuts dialog |

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
| `EXPLORABLE_READONLY` | Pan, zoom, selection | No add/edit controls; selection-inspector still rendered | Rejected — `Model.set` and `loadModel` log a dev-mode warning and return |
| `NON_INTERACTIVE` | None | None visible | Rejected |

The data-layer guard is enforced inside `useReticulyne` — calling `useReticulyne().Model.set(...)` or `useReticulyne().loadModel(...)` from outside `EDITABLE` mode is a silent no-op (with a dev-mode `console.warn`). Read access via `getModel()` is always allowed.

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

**Tools — `EDITABLE` mode only.** Bare letter, no modifier.

| Key | Tool |
|---|---|
| `V` or `S` | Select |
| `H` | Hand / Pan |
| `A` | Add item |
| `R` | Rectangle |
| `C` | Connector |
| `T` | Text (creates a textbox at the current mouse tile) |

**Zoom and viewport — `EDITABLE` + `EXPLORABLE_READONLY`.**

| Key | Action |
|---|---|
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `0` or `1` | Reset zoom to 100% |
| `F` | Fit to screen |

**Selection-dependent — `EDITABLE` mode only.** Requires an item to be selected.

| Key | Action |
|---|---|
| `Esc` | Deselect (works in any editor mode) |
| `Delete` / `Backspace` | Delete the selected item |
| `↑` `↓` `←` `→` | Nudge by one tile (+`Shift` for 5 tiles) |
| `Ctrl/Cmd + D` | Duplicate the selected item (skips connectors) |
| `Ctrl/Cmd + C` | Copy the selected item to the editor's clipboard |
| `Ctrl/Cmd + V` | Paste with a one-tile offset (works repeatedly) |

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
- All shortcuts respect `editorMode` — `EXPLORABLE_READONLY` only gets zoom + fit-to-view + Escape; `NON_INTERACTIVE` gets none.

## Controlling UI visibility

All visibility controls are **opt-in restrictions** — omitting a prop always produces the full default behaviour. You only pass a prop when you want to narrow or override it.

### Main menu items — `mainMenuOptions`

Pass an array of the items you want to show. Omit the prop to get the full default menu. Pass `[]` to hide the main menu entirely.

Available values (`MainMenuOptionsEnum`):

| Value | What it renders |
|---|---|
| `'ACTION.OPEN'` | Open a diagram from a local JSON file |
| `'EXPORT.JSON'` | Download the current model as JSON |
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

The bottom-centre strip shows `"Project title › View name"`. By default it follows the editor mode: visible in `EDITABLE` and `EXPLORABLE_READONLY`, hidden in `NON_INTERACTIVE`. Override it independently with `showTitleBar`:

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

### Host-managed save — `onSave` + `'ACTION.SAVE'`

The default `'EXPORT.JSON'` menu entry downloads a `.json` file to the user's disk — useful for ad-hoc archival, but rarely what a host application wants. For a hosted editor whose state lives in the parent application, the natural save path is "hand the model back to the host" — register an `'ACTION.SAVE'` entry in `mainMenuOptions` and pass an `onSave` callback:

```tsx
<Reticulyne
  initialData={diagramFromBackend}
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.PDF']}
  onSave={(model) => {
    return postToBackend(model);
  }}
/>
```

The Save menu entry only renders when BOTH conditions hold:

- `'ACTION.SAVE'` is listed in `mainMenuOptions`, AND
- the `onSave` prop is supplied.

Listing `'ACTION.SAVE'` without supplying `onSave` logs a one-shot `console.warn` so the misconfiguration is visible in dev. Supplying `onSave` without listing `'ACTION.SAVE'` is silent — useful when the host wants the callback armed for a future menu config change.

Callback identity does not need to be memoised. The component stores the latest `onSave` in the UI-state store and reads it at click time, so passing a fresh inline closure on every render is fine.

### Combined example

A typical embedded deployment that shows only what the host needs:

```tsx
<Reticulyne
  initialData={diagramFromBackend}
  editorMode="EDITABLE"
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.PDF', 'EXPORT.PNG']}
  showTitleBar={false}
  iconCollections={{ deny: ['AWS', 'GCP', 'Azure', 'Kubernetes'] }}
  onSave={(model) => saveToBackend(model)}
  onModelUpdated={(model) => updateLocalDraft(model)}
/>
```

`onSave` fires explicitly when the user clicks Save; `onModelUpdated` fires on every model change. Most hosts will use one or the other — `onSave` for an explicit-save workflow, `onModelUpdated` for autosave-on-every-change.

## Callback: `onModelUpdated`

```tsx
onModelUpdated={(model: Model) => {
  // model includes: title, version, icons[], colors[], items[], views[]
  // Note: descriptions are HTML strings, not Markdown.
  persistToBackend(model);
}}
```

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
| `getModel()` | `() => Model` | Serialised current model. |
| `loadModel(data)` | `(data: InitialData) => void` | Validate + hydrate fresh data. Gated on `editorMode === 'EDITABLE'`. |
| `setEditorMode(mode)` | `(mode) => void` | Switch between `EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`. |
| `setZoom(z)` | `(z: number) => void` | Set absolute zoom. |
| `incrementZoom()` / `decrementZoom()` | `() => void` | Step zoom by `ZOOM_INCREMENT` (0.2). |
| `rendererEl` | `HTMLDivElement \| null` | The renderer's outer DOM node — useful for export-to-image or programmatic focus. |
| `Connector.get(id)` | `(id: string) => Connector \| undefined` | Returns the connector (defaults merged) for the given id, or `undefined` if no view contains it. |
| `Connector.update(id, patch)` | `(id, patch) => void` | Mutate `color` / `width` / `style` / `direction` / `glyph` / `animated` from the host. **Bypasses the undo stack** so a live-data poller doesn't fill Ctrl+Z. Gated on `editorMode !== 'NON_INTERACTIVE'` — warns and no-ops otherwise. |
| `Connector.pulse(id, opts?)` | `(id, { durationMs?, glyph? }?) => void` | Fire a one-shot signal pulse — the chosen glyph travels the connector once over `durationMs` (default 1500). Runtime-only: writes to the scene-store overlay, never persisted to the model, never recorded in history. Each call supersedes any pulse already in-flight on that connector. |
| `Model` *(escape hatch)* | `{ get, set }` | Raw zustand actions. `set` is gated by editorMode. Prefer the named methods above. |
| `uiState` *(escape hatch)* | `UiStateActions` | Full UI store action bag. Prefer the named methods above. |

Worked example (read-only viewer + round-trip):

```tsx
import Reticulyne, { useReticulyne } from '@qant-au/reticulyne';
import { useEffect, useState } from 'react';

function DiagramViewer({ diagramId }: { diagramId: string }) {
  const [model, setModel] = useState(null);

  return (
    <div style={{ width: '100%', height: 600 }}>
      <Reticulyne
        editorMode="EXPLORABLE_READONLY"
        initialData={model ?? undefined}
        onModelUpdated={setModel}
      >
        <RemoteLoader diagramId={diagramId} />
      </Reticulyne>
    </div>
  );
}

function RemoteLoader({ diagramId }: { diagramId: string }) {
  const { loadModel, setEditorMode } = useReticulyne();
  useEffect(() => {
    fetchDiagram(diagramId).then((data) => {
      setEditorMode('EDITABLE');   // temporarily unlock for the hydrate
      loadModel(data);
      setEditorMode('EXPLORABLE_READONLY');
    });
  }, [diagramId, loadModel, setEditorMode]);
  return null;
}
```

## Rectangle custom styling

The `Rectangle` schema accepts four optional styling overrides in addition to the existing `color` palette reference (FEA11-01):

| Field | Type | Description |
|---|---|---|
| `colorValue` | `string` — 6-digit hex (e.g. `#ff6600`) | Direct fill colour. Overrides the `color` palette reference. Falls back to the palette colour when absent. |
| `outlineColor` | `string` — 6-digit hex | Border stroke colour. Overrides the auto-derived dark variant of the fill. Falls back to the derived colour when absent. |
| `transparency` | `number` (0–1) | Fill alpha, where `0` = fully opaque and `1` = fully transparent. Applied on top of `colorValue` or the palette colour. Omit or set to `0` for a solid fill. |
| `zIndex` | `integer` | Per-rectangle z-order override. Higher values render in front of lower values. Rectangles with the same `zIndex` (or no `zIndex`) keep their relative order from the layer controls (Bring to Front etc.). |

These fields are designed for embedders that push status colours from external systems (e.g. monitoring dashboards, compliance tools) without needing to pre-register palette entries. The editor inspector panel exposes **Fill colour**, **Border colour**, and **Transparency** controls when a rectangle is selected. `zIndex` is an API-only field — interactive layer ordering continues to work via the existing Bring to Front / Send to Back context-menu actions.

Example using `Model.set` (the escape-hatch raw accessor on `useReticulyne()`):

```typescript
import Reticulyne, { useReticulyne } from '@qant-au/reticulyne';

function StatusOverlay() {
  const { Model, getModel } = useReticulyne();

  function paintAlert(rectangleId: string) {
    const current = getModel();
    Model.set({
      ...current,
      views: current.views.map((view) => ({
        ...view,
        rectangles: (view.rectangles ?? []).map((r) =>
          r.id === rectangleId
            ? { ...r, colorValue: '#d32f2f', transparency: 0.3 }
            : r
        )
      }))
    });
  }

  function clearAlert(rectangleId: string) {
    const current = getModel();
    Model.set({
      ...current,
      views: current.views.map((view) => ({
        ...view,
        rectangles: (view.rectangles ?? []).map((r) =>
          r.id === rectangleId
            ? { ...r, colorValue: undefined, transparency: undefined }
            : r
        )
      }))
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
import Reticulyne, { useReticulyne } from '@qant-au/reticulyne';

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

The package declares `react` and `react-dom` as peers with the range `>=18` and is tested against React 19.

CSS is injected at runtime via Emotion (an Reticulyne dependency, not a peer). No stylesheet imports are required from the consumer side.

## Security model

The top-level [README §Security](../README.md#security) carries the short version. This section is the full embed-side contract. Pair it with [`../SECURITY.md`](../SECURITY.md), which tracks accepted residual advisories.

### What's rendered as HTML

Only one field on the model is HTML: `Model.items[].description`. Everything else (titles, names, ids, view metadata, colours, icon urls) is plain string / structured data and is rendered through React's text-node escaping. Connector and view-item *names* are likewise plain text.

The `description` field is rendered through a **TipTap** editor ([`src/components/MarkdownEditor/MarkdownEditor.tsx`](../src/components/MarkdownEditor/MarkdownEditor.tsx)). Both paths run the string through a ProseMirror schema before it reaches the DOM: the editable path parses it into the document via `useEditor({ content })`, and the read-only path (used for on-canvas labels) regenerates display HTML with `generateHTML(generateJSON(value))`. Because that schema only knows five inline marks, the rendered HTML can only ever be those marks — the input string is never written to the DOM verbatim.

### What the library does for you

1. **Schema-based sanitisation (both directions).** The editor registers only `Document`, `Paragraph`, `Text`, and the marks `Bold`, `Italic`, `Underline`, `Strike`, `Link` (`EDITOR_EXTENSIONS` in [`MarkdownEditor.tsx`](../src/components/MarkdownEditor/MarkdownEditor.tsx)). ProseMirror's parser has no rule for any other tag, so `<script>`, `<iframe>`, `<svg>`, `<img>`, `<style>`, `<form>` and every undeclared attribute (`onerror`, `onload`, `srcdoc`, `style`) are dropped when the `value`/`initialData` HTML is parsed **in**, and the serialiser can only emit the registered marks on the way **out**. **Do not widen `EDITOR_EXTENSIONS`** (e.g. an image, `iframe`, or raw-HTML extension) without re-evaluating this: those reopen vectors the current design closes.
2. **`SafeLink` protocol rejection** ([`src/components/MarkdownEditor/sanitizeLinkUrl.ts`](../src/components/MarkdownEditor/sanitizeLinkUrl.ts)). The `Link` mark is extended so every `href` is routed through `sanitizeLinkUrl` on both parse and render. Allowed protocols: `http`, `https`, `mailto`, `tel`; forbidden (link dropped / replaced): `javascript`, `data`, `vbscript`, `file`, `blob` — including percent-encoded variants such as `javascript%3a`. This applies to user-typed links and to `value`-prop HTML alike.
3. **JSON validation.** Both the `initialData` prop and the in-editor "open JSON file" flow run every model through `initialDataSchema.safeParse()` (Zod) before any state mutation. Cross-references (view items must exist in model items, connector anchors must reference valid items) are also validated. This protects you from malformed data but **does not sanitise HTML in the `description` field** — Zod has no opinion on HTML.
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
import Reticulyne from '@qant-au/reticulyne';

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
