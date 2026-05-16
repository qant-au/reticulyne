# API reference

The contract every consumer of `@qant-au/isoflow` can rely on: every prop, every callback,
the `useIsoflow` imperative hook, and the supporting type shapes.

For deeper notes on editor modes, container sizing, and the security model, see
[embedding.md](embedding.md).

## Imports

```tsx
import Isoflow, { useIsoflow } from '@qant-au/isoflow';
import type { IsoflowProps, InitialData, Model } from '@qant-au/isoflow';
```

`Isoflow` is the default React component. `useIsoflow` is the imperative hook (only
callable inside `<Isoflow>`'s subtree). The package also re-exports the schemas and
reducers from `src/standaloneExports.ts`.

## `<Isoflow>` props

Every prop is optional.

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialData` | `InitialData` | empty model | Diagram to hydrate on mount. Validated against `modelSchema` (Zod). Invalid data triggers a `window.alert` and the editor renders empty. |
| `mainMenuOptions` | `MainMenuOptions` | full menu | Whitelist of main-menu entries. Pass `[]` to hide the main menu entirely. |
| `onModelUpdated` | `(model: Model) => void` | `undefined` | Called whenever the model changes. Callback identity does **not** need to be memoised — the component stores it in a ref. |
| `width` | `number \| string` | `'100%'` | Forwarded to the root `<Box>`'s `sx`. Numbers are treated as px; strings pass through verbatim. |
| `height` | `number \| string` | `'100%'` | Same semantics as `width`. |
| `enableDebugTools` | `boolean` | `false` | Toggles the in-editor debug overlay. |
| `editorMode` | `'EDITABLE' \| 'EXPLORABLE_READONLY' \| 'NON_INTERACTIVE'` | `'EDITABLE'` | See [editor modes](embedding.md#editor-modes). |
| `renderer` | `RendererProps` | `undefined` | Forwarded to the internal `Renderer`. Currently `{ showGrid?: boolean; backgroundColor?: string }`. |
| `onError` | `(error: Error, info: ErrorInfo) => void` | `undefined` | Invoked by the internal `IsoflowErrorBoundary` when a render error escapes. Pipe to your telemetry. |
| `errorFallback` | `ReactNode` | default fallback box | Override the "Editor failed to load" fallback rendered when the error boundary catches. |

## `editorMode`

`editorMode` controls three things at once: which mouse interactions are wired up, which UI
affordances are visible, and whether model mutations are accepted at the data layer.

| Mode | Pointer | UI affordances | Model-mutation API |
|---|---|---|---|
| `EDITABLE` | All (pan, zoom, drag items, draw connectors, place icons, transform) | Main menu, item controls, context menu | Accepted |
| `EXPLORABLE_READONLY` | Pan, zoom, selection | Selection-inspector still rendered; no add/edit controls | Rejected — `Model.set` and `loadModel` log a dev-mode warning and return |
| `NON_INTERACTIVE` | None | None | Rejected |

The data-layer guard lives inside `useIsoflow`. Calling `useIsoflow().Model.set(...)` or
`useIsoflow().loadModel(...)` from outside `EDITABLE` mode is a silent no-op in production
(with a `console.warn` in dev). Read access via `getModel()` is always allowed.

## `mainMenuOptions`

Pass an array of identifiers — only the listed entries appear in the main menu. Pass `[]`
to hide the menu entirely. Default: every option shown.

| Identifier | What it does |
|---|---|
| `'ACTION.OPEN'` | Load a previously-exported JSON file. |
| `'EXPORT.JSON'` | Download the current model as JSON. |
| `'EXPORT.PNG'` | Render the current view to PNG and download. |
| `'ACTION.CLEAR_CANVAS'` | Wipe items + views back to an empty scene. |
| `'LINK.GITHUB'` | External link button (legacy upstream icon). |
| `'LINK.DISCORD'` | External link button (legacy upstream icon). |
| `'VERSION'` | Shows the running package version. |

`'LINK.GITHUB'` and `'LINK.DISCORD'` still appear in the menu enum but point at upstream
URLs — most embedders will want to exclude them with a custom `mainMenuOptions` list.

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

The full Zod schemas live in `src/schemas/` and are re-exported from the package. Pass
anything invalid and the editor alerts at mount and renders the empty default.

## `useIsoflow()` — imperative hook

Callable from any component rendered **inside** `<Isoflow>`. Returns:

| Member | Signature | Notes |
|---|---|---|
| `getModel()` | `() => Model` | Serialised current model. |
| `loadModel(data)` | `(data: InitialData) => void` | Validate + hydrate fresh data. Gated on `editorMode === 'EDITABLE'`. |
| `setEditorMode(mode)` | `(mode) => void` | Switch between `EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`. |
| `setZoom(z)` | `(z: number) => void` | Set absolute zoom. |
| `incrementZoom()` | `() => void` | Step zoom up by `ZOOM_INCREMENT` (0.2). |
| `decrementZoom()` | `() => void` | Step zoom down by `ZOOM_INCREMENT`. |
| `rendererEl` | `HTMLDivElement \| null` | The renderer's outer DOM node — useful for export-to-image or programmatic focus. |
| `Model` *(escape hatch)* | `{ get, set }` | Raw zustand actions. `set` is gated by `editorMode`. Prefer the named methods above. |
| `uiState` *(escape hatch)* | `UiStateActions` | Full UI store action bag. Prefer the named methods above. |

A worked round-trip example is in [embedding.md](embedding.md#imperative-api-useisoflow).

## Re-exported helpers

The package also re-exports from `src/standaloneExports.ts`:

- `version` — the published package version string.
- `reducers` — namespace of every model reducer (useful for unit-testing model mutations).
- `INITIAL_DATA`, `INITIAL_SCENE_STATE` — the default-empty model and scene state.
- Schemas from `src/schemas/` — `modelSchema`, plus item / view / connector schemas.
- Types — `IsoflowProps`, `InitialData`, and the full `Model` tree from `src/types/model.ts`.

These can be imported either from the main entry (`@qant-au/isoflow`) or from the standalone
subpath (`@qant-au/isoflow/standalone`). The standalone subpath omits the component itself
and is safe to import in Node environments (server-side validation, scripts).
