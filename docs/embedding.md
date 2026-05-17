# Embedding `@qant-au/isoflow`

This document describes the contract a consumer of `@qant-au/isoflow` can rely on: every prop, every callback, the imperative API exposed by the `useIsoflow` hook, the container-sizing rules, and the security model.

Audience: a frontend developer embedding the editor inside a larger React application.

> If you only need the standalone editor (Docker SPA), see [`docker.md`](./docker.md) instead.

## Importing

```tsx
import Isoflow, { useIsoflow } from '@qant-au/isoflow';
```

The default export is the `Isoflow` React component. The named export `useIsoflow` is the imperative hook (only callable inside `<Isoflow>`'s subtree). Standalone exports (schemas, reducers, types) are also re-exported from the default entrypoint.

## Required peer dependencies (v2 onwards)

`@qant-au/isoflow@2` externalises its UI / state / theming stack. Install these alongside the library:

```bash
npm install \
  @qant-au/isoflow \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

If your application already uses MUI v5 / Emotion / Zustand, you share a single copy at runtime — no duplicate providers, no double Emotion CacheProvider, no version-drift hazards. See [`installation.md`](./installation.md#peer-dependencies) for the exact tested version ranges and a v1 → v2 migration note.

## Component props (`<Isoflow>`)

All props are optional. The component renders a fully-functional editor with sensible defaults.

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialData` | `InitialData` | `INITIAL_DATA` (empty model) | Diagram contents to hydrate on mount. Validated against `modelSchema` (Zod). Invalid data triggers a `window.alert` and the editor renders empty. |
| `mainMenuOptions` | `MainMenuOptions` | full menu | Whitelist of main-menu items. Pass `[]` to hide the main menu entirely. |
| `onModelUpdated` | `(model: Model) => void` | `undefined` | Callback invoked whenever the model changes. Callback identity does **not** need to be memoised — the component stores it in a ref to avoid identity churn. |
| `width` | `number \| string` | `'100%'` | Width passed to the root `Box`. Numbers are treated as px; strings are passed verbatim (e.g. `'640px'`, `'50vw'`). |
| `height` | `number \| string` | `'100%'` | Height passed to the root `Box`. Same semantics as `width`. |
| `enableDebugTools` | `boolean` | `false` | Toggles the in-editor debug overlay. |
| `editorMode` | `'EDITABLE'` \| `'EXPLORABLE_READONLY'` \| `'NON_INTERACTIVE'` | `'EDITABLE'` | See [Editor modes](#editor-modes). |
| `renderer` | `RendererProps` | `undefined` | Forwarded to the renderer. Currently supports `{ showGrid?: boolean; backgroundColor?: string }`. |
| `onError` | `(error: Error, info: ErrorInfo) => void` | `undefined` | Invoked by the internal `ErrorBoundary` when a render error escapes. Pipe to your telemetry. |
| `errorFallback` | `ReactNode` | default fallback box | Override the "Editor failed to load" fallback rendered on `ErrorBoundary` catch. |

### Container sizing

The component renders into a single `<Box>` element. `width`/`height` props are forwarded to that box's MUI `sx`. Equivalent options:

- **Fill parent.** Default. Let the surrounding flex/grid layout drive the box.
- **Fixed pixel size.** `<Isoflow width={640} height={480} />`.
- **CSS units.** `<Isoflow width="50vw" height="80vh" />`.
- **Wrap in a constrained container.** Useful when the editor needs to share a row with other content:

  ```tsx
  <Box sx={{ width: 640, height: 480, border: '1px solid' }}>
    <Isoflow />
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

The data-layer guard is enforced inside `useIsoflow` — calling `useIsoflow().Model.set(...)` or `useIsoflow().loadModel(...)` from outside `EDITABLE` mode is a silent no-op (with a dev-mode `console.warn`). Read access via `getModel()` is always allowed.

## Callback: `onModelUpdated`

```tsx
onModelUpdated={(model: Model) => {
  // model includes: title, version, icons[], colors[], items[], views[]
  // Note: descriptions are HTML strings, not Markdown.
  persistToBackend(model);
}}
```

Identity stability is handled by the component — passing a fresh inline closure on every render does **not** re-fire the callback unless the model itself changed.

## Imperative API: `useIsoflow()`

Callable from any component rendered **inside** `<Isoflow>`. Returns:

| Member | Signature | Notes |
|---|---|---|
| `getModel()` | `() => Model` | Serialised current model. |
| `loadModel(data)` | `(data: InitialData) => void` | Validate + hydrate fresh data. Gated on `editorMode === 'EDITABLE'`. |
| `setEditorMode(mode)` | `(mode) => void` | Switch between `EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`. |
| `setZoom(z)` | `(z: number) => void` | Set absolute zoom. |
| `incrementZoom()` / `decrementZoom()` | `() => void` | Step zoom by `ZOOM_INCREMENT` (0.2). |
| `rendererEl` | `HTMLDivElement \| null` | The renderer's outer DOM node — useful for export-to-image or programmatic focus. |
| `Model` *(escape hatch)* | `{ get, set }` | Raw zustand actions. `set` is gated by editorMode. Prefer the named methods above. |
| `uiState` *(escape hatch)* | `UiStateActions` | Full UI store action bag. Prefer the named methods above. |

Worked example (read-only viewer + round-trip):

```tsx
import Isoflow, { useIsoflow } from '@qant-au/isoflow';
import { useEffect, useState } from 'react';

function DiagramViewer({ diagramId }: { diagramId: string }) {
  const [model, setModel] = useState(null);

  return (
    <div style={{ width: '100%', height: 600 }}>
      <Isoflow
        editorMode="EXPLORABLE_READONLY"
        initialData={model ?? undefined}
        onModelUpdated={setModel}
      >
        <RemoteLoader diagramId={diagramId} />
      </Isoflow>
    </div>
  );
}

function RemoteLoader({ diagramId }: { diagramId: string }) {
  const { loadModel, setEditorMode } = useIsoflow();
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

## Peer dependencies

The package declares `react` and `react-dom` as peers with the range `>=18` and is tested against React 19.

CSS is injected at runtime via Emotion (an Isoflow dependency, not a peer). No stylesheet imports are required from the consumer side.

## Security model

See the [Security](../README.md#security) section in the top-level README, plus [`../SECURITY.md`](../SECURITY.md) for the residual-advisory ledger. The two rules that matter for embedders:

1. `initialData.items[].description` is rendered as HTML. Sanitise consumer-supplied historic content before passing it in.
2. `onModelUpdated`'s payload contains those HTML strings verbatim. Anywhere it's displayed outside Isoflow, apply your usual HTML-sanitisation policy.

## Globals and side effects on import

- A small block of global CSS is injected (Emotion `<GlobalStyles>`) when `<Isoflow>` first mounts. Scoped to selectors the editor controls; no overrides of body / `*` styles.
- Quill (the rich-text editor used for descriptions) registers a custom `Link` blot at module load that restricts allowed URL protocols. This is a one-time side effect; subsequent `<Isoflow>` mounts share it.
- No global event listeners are registered on `window` outside the component's lifecycle. All listeners are removed in their effect's cleanup.
