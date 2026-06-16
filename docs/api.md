# API reference

The contract every consumer of `@qant-au/reticulyne` can rely on: every prop, every callback,
the `useReticulyne` imperative hook, and the supporting type shapes.

For deeper notes on editor modes, container sizing, and the security model, see
[embedding.md](embedding.md).

## Imports

```tsx
import Reticulyne, { useReticulyne } from '@qant-au/reticulyne';
import type { ReticulyneProps, InitialData, Model } from '@qant-au/reticulyne';
```

`Reticulyne` is the default React component. `useReticulyne` is the imperative hook (only
callable inside `<Reticulyne>`'s subtree). The package also re-exports the schemas and
reducers from `src/standaloneExports.ts`.

## `<Reticulyne>` props

Every prop is optional.

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialData` | `InitialData` | empty model | Diagram to hydrate on mount. Validated against `modelSchema` (Zod). On rejection the editor renders empty and the failure is routed to `onValidationError` (or `console.error` if that prop is omitted). |
| `mainMenuOptions` | `MainMenuOptions` | full menu | Whitelist of main-menu entries. Pass `[]` to hide the main menu entirely. |
| `showTitleBar` | `boolean` | `undefined` (follows editorMode) | Override title-bar visibility. `false` = always hidden; `true` = always shown; omitted = controlled by editor mode (`EDITABLE` / `EXPLORABLE_READONLY` show it, `NON_INTERACTIVE` hides it). |
| `iconCollections` | `{ allow?: string[]; deny?: string[] }` | `undefined` (no filtering) | Filter icon collections by name (case-insensitive). `allow` keeps only matched collections; `deny` removes matched collections. Both can be combined. When omitted, all icons from `initialData.icons` pass through. |
| `onModelUpdated` | `(model: Model) => void` | `undefined` | Called whenever the model changes. Callback identity does **not** need to be memoised — the component stores it in a ref. |
| `width` | `number \| string` | `'100%'` | Forwarded to the root `<Box>`'s `sx`. Numbers are treated as px; strings pass through verbatim. |
| `height` | `number \| string` | `'100%'` | Same semantics as `width`. |
| `enableDebugTools` | `boolean` | `false` | Toggles the in-editor debug overlay. |
| `editorMode` | `'EDITABLE' \| 'EXPLORABLE_READONLY' \| 'NON_INTERACTIVE'` | `'EDITABLE'` | See [editor modes](embedding.md#editor-modes). |
| `renderer` | `RendererProps` | `undefined` | Forwarded to the internal `Renderer`. Currently `{ showGrid?: boolean; backgroundColor?: string }`. |
| `onError` | `(error: Error, info: ErrorInfo) => void` | `undefined` | Invoked by the internal `ReticulyneErrorBoundary` when a render error escapes. Pipe to your telemetry. |
| `errorFallback` | `ReactNode` | default fallback box | Override the "Editor failed to load" fallback rendered when the error boundary catches. |
| `onValidationError` | `(issues: ZodIssue[]) => void` | `undefined` | Invoked when `initialData` (or a `useReticulyne().loadModel(...)` payload) fails schema validation. Receives the array of Zod issues. When omitted, the failure is logged to `console.error` instead. Earlier versions popped a `window.alert`; that has been replaced by this contract. Callback identity does **not** need to be memoised — the hook stores it in a ref. |
| `enableAnimation` | `boolean` | `false` | Opt-in for the connector animation feature (FEA5-06). When `true`, a connector whose `animated` schema field is `true` renders its glyph travelling along the line on a continuous loop, and the **Animate** toggle appears in ConnectorControls. When `false`, the toggle is hidden and `animated: true` connectors render statically. |
| `enableGlobalDragHandlers` | `boolean` | `true` | When `false`, pointer event listeners attach to the renderer element rather than `window`, preventing drag events from leaking into host-page sibling widgets (FEA10-01). Defaults to `true` for backwards compatibility. |
| `nodeIndicatorComponent` | `(args: { item: ModelItem, view: ViewItem }) => ReactNode` | `undefined` | Per-node decorator (FEA5-07). Rendered inside every Node at its tile, receiving the `ModelItem` + `ViewItem`. Use it to overlay live indicators — status pips, gauges, badges — driven by host state outside the model. |
| `connectorIndicatorComponent` | `(args: { connector: Connector, view: View }) => ReactNode` | `undefined` | Per-connector decorator (FEA7-03). Rendered at every connector's midpoint, receiving the connector's schema-level model and the parent `View`. Mirrors `nodeIndicatorComponent` for link-level telemetry. |
| `highlightedItemId` | `string` | `undefined` | When set, highlights the item with this ID and dims all others to `opacity: 0.2` with a CSS transition (FEA12-01). Drives focus from host-side navigation without touching interaction state. When omitted, the `I` keyboard shortcut controls dimming based on the current selection instead. |
| `themeMode` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Controls the editor colour scheme. `'light'` / `'dark'` force the respective palette. `'auto'` (the default) mirrors the OS/browser `prefers-color-scheme` and switches live. **Breaking change (FEA9-01):** this previously defaulted to `'light'` — see the note below the table. |
| `exportTheme` | `'light' \| 'dark'` | `'light'` | Controls the initial background colour in the export dialog (PNG / PDF). `'light'` seeds the light-mode background (`#f6faff`); `'dark'` seeds the dark-mode background (`#1a1d24`). The user can still change it inside the dialog. |
| `children` | `ReactNode` | `undefined` | Children rendered inside the Reticulyne provider tree. Intended use is a "driver" child that calls `useReticulyne()` to drive the editor from outside — pulse connectors on a timer, update colours from a poller, etc. Driver components typically return `null`. |
| `onSave` | `(model: Model) => void` | `undefined` | Invoked when the user clicks the **Save** menu entry. Receives the current model snapshot — the host persists it however it wants. The Save entry only renders when (a) `'ACTION.SAVE'` appears in `mainMenuOptions` AND (b) `onSave` is supplied; listing `'ACTION.SAVE'` without `onSave` logs a one-shot `console.warn` so the misconfiguration is visible in dev. |

> **Breaking change (FEA9-01):** Prior to this release `themeMode` defaulted to `'light'`. The default is now `'auto'`, which follows the user's OS colour-scheme preference. Embedders that relied on the implicit light theme must now pass `themeMode="light"` explicitly to preserve the previous behaviour.

## `editorMode`

`editorMode` controls three things at once: which mouse interactions are wired up, which UI
affordances are visible, and whether model mutations are accepted at the data layer.

| Mode | Pointer | UI affordances | Model-mutation API |
|---|---|---|---|
| `EDITABLE` | All (pan, zoom, drag items, draw connectors, place icons, transform) | Main menu, item controls, context menu | Accepted |
| `EXPLORABLE_READONLY` | Pan, zoom, selection | Selection-inspector still rendered; no add/edit controls | Rejected — `Model.set` and `loadModel` log a dev-mode warning and return |
| `NON_INTERACTIVE` | None | None | Rejected |

The data-layer guard lives inside `useReticulyne`. Calling `useReticulyne().Model.set(...)` or
`useReticulyne().loadModel(...)` from outside `EDITABLE` mode is a silent no-op in production
(with a `console.warn` in dev). Read access via `getModel()` is always allowed.

## `mainMenuOptions`

Pass an array of identifiers — only the listed entries appear in the main menu. Pass `[]`
to hide the menu entirely. Default: every option marked **default-on** below.

| Identifier | Default? | What it does |
|---|---|---|
| `'ACTION.OPEN'` | on | Load a previously-exported JSON file. |
| `'ACTION.SAVE'` | off | Render a **Save** menu entry that fires the `onSave` prop with the current model. Only appears when both `'ACTION.SAVE'` is listed AND the `onSave` prop is supplied. Off-by-default because there's no useful behaviour without a host callback. Added in v4.1.0. |
| `'EXPORT.JSON'` | on | Download the current model as JSON. |
| `'EXPORT.PNG'` | on | Render the current view to PNG and download. (Menu label: "Export as Image".) |
| `'EXPORT.PDF'` | on | Render the current view to PNG and embed it in a single-page A4 PDF, then download. All client-side via jsPDF — no network call. Added in v4.0.0. |
| `'ACTION.CLEAR_CANVAS'` | on | Wipe items + views back to an empty scene. (Menu label: "Clear".) |
| `'LINK.GITHUB'` | on | External link button — opens this fork's GitHub repo (`https://github.com/qant-au/reticulyne`). |
| `'VERSION'` | on | Shows the running package version. |

The `'LINK.DISCORD'` identifier from earlier versions has been removed in v4.0.0 — it
only ever pointed at upstream `markmanx/reticulyne`'s Discord, and the fork no longer
surfaces upstream-project branding. Consumers that previously opted in with
`mainMenuOptions: ['LINK.DISCORD', ...]` will see a TypeScript error and should drop the
identifier.

## `InitialData`

Equal to the `Model` shape plus two optional view hints:

```ts
type InitialData = Model & {
  fitToView?: boolean; // recompute zoom on mount to fit the diagram
  view?: string;       // id of the view to activate
};
```

The `Model` shape (all arrays default to empty):

```ts
type Model = {
  title: string;
  version: string;
  icons: Icons;
  colors: Colors;
  items: ModelItems;
  views: Views;
};
```

The full Zod schemas live in `src/schemas/` and are re-exported from the package. If validation
fails, the editor renders the empty default and the issue array is routed to
`onValidationError` (or to `console.error` when that prop is omitted).

## `useReticulyne()` — imperative hook

Callable from any component rendered **inside** `<Reticulyne>`. Returns:

| Member | Signature | Notes |
|---|---|---|
| `getModel()` | `() => Model` | Serialised current model. |
| `loadModel(data)` | `(data: InitialData) => void` | Validate + hydrate fresh data. Gated on `editorMode === 'EDITABLE'`. |
| `setEditorMode(mode)` | `(mode) => void` | Switch between `EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`. |
| `setZoom(z)` | `(z: number) => void` | Set absolute zoom. |
| `incrementZoom()` | `() => void` | Step zoom up by `ZOOM_INCREMENT` (0.2). |
| `decrementZoom()` | `() => void` | Step zoom down by `ZOOM_INCREMENT`. |
| `rendererEl` | `HTMLDivElement \| null` | The renderer's outer DOM node — useful for export-to-image or programmatic focus. |
| `Connector.get(id)` | `(id: string) => Connector \| undefined` | Returns the connector (defaults merged) for the given id, or `undefined` if no view contains it. |
| `Connector.update(id, patch)` | `(id, patch) => void` | Mutate `color` / `width` / `style` / `direction` / `glyph` / `animated` from the host. **Bypasses the undo stack** so a live-data poller doesn't fill Ctrl+Z. Gated on `editorMode !== 'NON_INTERACTIVE'` — warns and no-ops otherwise. |
| `Connector.pulse(id, opts?)` | `(id, { durationMs?, glyph? }?) => void` | Fire a one-shot signal pulse — the chosen glyph travels the connector once over `durationMs` (default 1500). Runtime-only: writes to the scene-store overlay, never persisted to the model, never recorded in history. Each call supersedes any pulse already in-flight on that connector. |
| `Model` *(escape hatch)* | `{ get, set }` | Raw zustand actions. `set` is gated by `editorMode`. Prefer the named methods above. |
| `uiState` *(escape hatch)* | `UiStateActions` | Full UI store action bag. Prefer the named methods above. |

A worked round-trip example is in [embedding.md](embedding.md#imperative-api-usereticulyne).

### Failure modes

`useReticulyne()` reads from the same Zustand stores (`ModelProvider`, `SceneProvider`,
`UiStateProvider`) that the `<Reticulyne>` component installs. Calling it from a component
**outside** the `<Reticulyne>` subtree throws synchronously:

```
Missing Model provider in the tree. Wrap your component in <ModelProvider>.
```

(The exact provider name depends on which store is reached first — `Model`, `Scene`, or
`UiState`.) This is a programming error rather than a runtime condition you can catch
gracefully: ensure every `useReticulyne()` consumer is rendered as a descendant of an
`<Reticulyne>` element. React's error-boundary path will catch the throw, but it's
clearer to keep the call sites inside the subtree.

## Re-exported helpers

The package also re-exports from `src/standaloneExports.ts`:

- `version` — the published package version string.
- `reducers` — namespace of every model reducer (useful for unit-testing model mutations).
- `INITIAL_DATA`, `INITIAL_SCENE_STATE` — the default-empty model and scene state.
- Schemas from `src/schemas/` — `modelSchema`, plus item / view / connector schemas.
- Types — `ReticulyneProps`, `InitialData`, and the full `Model` tree from `src/types/model.ts`.

These can be imported either from the main entry (`@qant-au/reticulyne`) or from the standalone
subpath (`@qant-au/reticulyne/standalone`). The standalone subpath omits the component itself
and is safe to import in Node environments (server-side validation, scripts).
