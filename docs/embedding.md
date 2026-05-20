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

`@qant-au/isoflow@2+` externalises its UI / state / theming stack. Install these alongside the library:

```bash
npm install \
  @qant-au/isoflow \
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

Replace `YOUR_GITHUB_TOKEN` with a [GitHub personal access token](https://github.com/settings/tokens) that has the `read:packages` scope. The token only needs read access — it is used to pull the package, not to publish. Keep the token out of source control (add `.npmrc` to `.gitignore` if the token is embedded, or use an environment variable: `_authToken=${GITHUB_TOKEN}`). Once the `.npmrc` is in place, `npm install` resolves `@qant-au/isoflow` normally.

`@qant-au/isoflow@3` requires **MUI v9** (v2 required MUI v5). If your application already uses MUI v9 / Emotion / Zustand, you share a single copy at runtime — no duplicate providers, no double Emotion CacheProvider, no version-drift hazards. See [`installation.md`](./installation.md#peer-dependencies) for the exact tested version ranges and v1 → v2 → v3 migration notes.

## Component props (`<Isoflow>`)

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
| `onValidationError` | `(issues: ZodIssue[]) => void` | `undefined` | Invoked when `initialData` (or a `useIsoflow().loadModel(...)` payload) fails schema validation. Receives the array of Zod issues. When omitted, the failure is logged to `console.error` instead. Earlier versions popped a `window.alert`; that has been replaced by this contract. Callback identity does **not** need to be memoised. |

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
| `'ACTION.CLEAR_CANVAS'` | Clear all items from the current view |
| `'LINK.GITHUB'` | Link to the GitHub repository |
| `'VERSION'` | Display the library version number |

```tsx
// Show only export options — hide open/clear/links/version
<Isoflow mainMenuOptions={['EXPORT.PDF', 'EXPORT.PNG']} />

// Hide the main menu completely
<Isoflow mainMenuOptions={[]} />
```

### Title bar — `showTitleBar`

The bottom-centre strip shows `"Project title › View name"`. By default it follows the editor mode: visible in `EDITABLE` and `EXPLORABLE_READONLY`, hidden in `NON_INTERACTIVE`. Override it independently with `showTitleBar`:

```tsx
// Always hide — regardless of editorMode
<Isoflow showTitleBar={false} />

// Always show — even in NON_INTERACTIVE
<Isoflow showTitleBar={true} editorMode="NON_INTERACTIVE" />

// Default (omit the prop) — controlled by editorMode
<Isoflow />
```

### Icon collections — `iconCollections`

> **Note:** icons are not bundled with the library. They must be supplied by the host application via `initialData.icons`. Each icon can carry a `collection` name (e.g. `"AWS"`, `"Azure"`, `"my-app"`). The `iconCollections` prop lets you filter which collections reach the editor without pre-processing `initialData` yourself.

When omitted, every icon in `initialData.icons` passes through unchanged. Collection names are matched **case-insensitively** (`"AWS"` matches `"aws"`). Icons whose `collection` field is `undefined` are treated as "uncategorised" and always pass through both filters.

Changing `iconCollections` at runtime re-applies the filter on the next load — passing a new spec causes `<Isoflow>` to re-run the model pipeline against the same `initialData` reference, so the filter actually takes effect without the host having to also rebuild `initialData`. Allow/deny array contents are compared by value, so an inline literal like `iconCollections={{ deny: ['AWS'] }}` is fine to pass on every render.

```tsx
// Deny-list: keep everything except AWS and GCP icons
<Isoflow
  initialData={myData}
  iconCollections={{ deny: ['AWS', 'GCP'] }}
/>

// Allow-list: show only icons from your custom collection
<Isoflow
  initialData={myData}
  iconCollections={{ allow: ['my-app'] }}
/>

// Both: allow-list runs first, then deny-list refines the survivors
<Isoflow
  initialData={myData}
  iconCollections={{ allow: ['my-app', 'shared'], deny: ['shared-legacy'] }}
/>
```

### Combined example

A typical embedded deployment that shows only what the host needs:

```tsx
<Isoflow
  initialData={diagramFromBackend}
  editorMode="EDITABLE"
  mainMenuOptions={['EXPORT.PDF', 'EXPORT.PNG']}
  showTitleBar={false}
  iconCollections={{ deny: ['AWS', 'GCP', 'Azure', 'Kubernetes'] }}
  onModelUpdated={(model) => saveToBackend(model)}
/>
```

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

The top-level [README §Security](../README.md#security) carries the short version. This section is the full embed-side contract. Pair it with [`../SECURITY.md`](../SECURITY.md), which tracks accepted residual advisories.

### What's rendered as HTML

Only one field on the model is HTML: `Model.items[].description`. Everything else (titles, names, ids, view metadata, colours, icon urls) is plain string / structured data and is rendered through React's text-node escaping. Connector and view-item *names* are likewise plain text.

The `description` field is rendered through a Quill `ReactQuill` instance ([`src/components/MarkdownEditor/MarkdownEditor.tsx`](../src/components/MarkdownEditor/MarkdownEditor.tsx)). Quill writes the string into a contenteditable `<div>`, so it executes the same HTML the browser would execute given that input.

### What the library does for you

1. **Quill `Link` blot override** ([`src/components/MarkdownEditor/sanitizeLinkUrl.ts`](../src/components/MarkdownEditor/sanitizeLinkUrl.ts)). Installed at module load, applied to every `<a href>` Quill touches. Allowed protocols: `http`, `https`, `mailto`, `tel`. Forbidden protocols (replaced with `about:blank`): `javascript`, `data`, `vbscript`, `file`, `blob` — including percent-encoded variants such as `javascript%3a`. Covers both user-typed links and `value`-prop HTML re-parsed through Quill's clipboard converter.
2. **Formats allowlist.** The editor is configured with `formats={['bold', 'italic', 'underline', 'strike', 'link']}`. Quill drops registered formats it doesn't recognise during clipboard paste — so an `<img>`, `<iframe>`, or `<script>` arriving via *paste* is stripped on its way into the editor. **Do not widen this allowlist** (e.g. by adding `'image'` or `'video'`) without re-evaluating the security model: those formats reopen vectors this design currently closes.
3. **JSON validation.** Both the `initialData` prop and the in-editor "open JSON file" flow run every model through `initialDataSchema.safeParse()` (Zod) before any state mutation. Cross-references (view items must exist in model items, connector anchors must reference valid items) are also validated. This protects you from malformed data but **does not sanitise HTML in the `description` field** — Zod has no opinion on HTML.

### What the library does NOT do for you

The mitigations above protect Quill's *input* path. They do not run on the `description` string between when you put it on the prop and when Quill renders it. Specifically:

- HTML elements outside the small toolbar allowlist that are present in the `description` *value* you pass in are rendered as-is by Quill. `<iframe srcdoc="...">`, `<svg onload="...">`, `<img src=x onerror="...">`, `<style>...</style>`, `<form>`, and similar live elements survive.
- Inline-handler attributes (`onclick`, `onmouseover`, `onerror`, `onload`, …) on otherwise-allowed tags are not stripped.
- `onModelUpdated` returns the model with `description` strings exactly as Quill produced them. If you display those descriptions anywhere outside of Isoflow (preview pane, search results, PDF export), the contract is the same.

### The rule for embedders

**Treat every `items[].description` you receive from a user (or from any system a user can influence) as untrusted HTML, and sanitise it before it crosses the `<Isoflow>` boundary.** The standard tool is [DOMPurify](https://github.com/cure53/DOMPurify); any HTML sanitiser with a strict allowlist works.

```tsx
import DOMPurify from 'dompurify';
import Isoflow from '@qant-au/isoflow';

// Match the editor's own allowlist so a round-trip through Isoflow is lossless.
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

<Isoflow
  initialData={sanitised}
  onModelUpdated={(model) => {
    // The same rule applies on the way out — anything downstream of
    // `onModelUpdated` that re-renders descriptions should re-sanitise.
    persistToBackend(model);
  }}
/>;
```

If your `description` content only ever comes from already-trusted sources (a fixed configuration file, internal admin tooling without third-party input), the sanitisation step is optional. If you're not sure, sanitise.

### Other notes

- **Standalone Docker image.** The standalone editor (see [`docker.md`](docker.md)) loads no diagrams from untrusted sources by default — the user types directly into the running editor. The nginx CSP it ships is `script-src 'self'; object-src 'none'; frame-ancestors 'self'` (full policy in [`../docker/nginx.conf`](../docker/nginx.conf)), which contains a typed-XSS payload to the local origin and blocks script execution from anywhere else. The `style-src 'unsafe-inline'` allowance is required by Emotion/MUI and is documented in [`../SECURITY.md`](../SECURITY.md).
- **Embedding inside another app with a strict CSP.** Isoflow inherits the host page's CSP. Because Emotion injects styles at runtime, you'll need `style-src 'unsafe-inline'` (or a nonce-based equivalent) in the host policy. `script-src` can stay tight.

## Globals and side effects on import

- A small block of global CSS is injected (Emotion `<GlobalStyles>`) when `<Isoflow>` first mounts. Scoped to selectors the editor controls; no overrides of body / `*` styles.
- Quill (the rich-text editor used for descriptions) registers a custom `Link` blot at module load that restricts allowed URL protocols. This is a one-time side effect; subsequent `<Isoflow>` mounts share it.
- No global event listeners are registered on `window` outside the component's lifecycle. All listeners are removed in their effect's cleanup.
