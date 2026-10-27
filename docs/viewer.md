# Read-only viewer

`@reticulyne/editor/viewer` draws a Reticulyne diagram on a web page, read only, with no
React, MUI, Emotion or Zustand. Use it where a diagram is shown but never edited: a
documentation page, a status page, an email preview rendered in a browser, a page built
with another framework or with none.

It draws what the editor's own read-only render draws (the render **Export as image** makes):
the same layers, routes, colours, labels and icons. A test compares the two pixel by pixel for
every sample diagram.

- **Size:** about 47 KB gzipped. The built-in device drawings (about 2.3 MB) are a separate
  file, loaded only when a diagram uses a built-in icon it does not carry.
- **No peer dependencies.** The viewer is plain DOM and SVG.
- **Content Security Policy:** it needs no inline script or style.

The full editor has read-only modes too (`EXPLORABLE_READONLY` and `NON_INTERACTIVE`,
[Editor modes](embedding.md#editor-modes)). Choose those when the page already runs React and
MUI, or when people should pan, zoom and select. Choose the viewer when it should be light and
framework-free.

## Quick start

```bash
npm install @reticulyne/editor
```

React and the editor's other peer dependencies are not needed for the viewer and are not
loaded by it.

```html
<div id="diagram" style="width: 100%; height: 600px"></div>
<script type="module">
  import { renderDiagram } from '@reticulyne/editor/viewer';

  const scene = await (await fetch('/diagrams/office.json')).json();
  const viewer = renderDiagram(document.getElementById('diagram'), scene);
  await viewer.ready;
</script>
```

The viewer fills the container you give it, so give the container a size. It fits the diagram
to the container (never above 100%) and fits again whenever the container is resized.

The same in React, where the viewer is mounted into an element and removed on unmount:

```tsx
import { useEffect, useRef } from 'react';
import { renderDiagram } from '@reticulyne/editor/viewer';

export const Diagram = ({ scene }: { scene: unknown }) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewer = renderDiagram(box.current!, scene);
    return () => viewer.destroy();
  }, [scene]);
  return <div ref={box} style={{ height: 600 }} />;
};
```

The examples app has both: **Read-only viewer** in its sidebar, and `viewer.html`, the viewer
on a page with no React at all (`bash restart.sh`, then http://localhost:2223/viewer.html).

## `renderDiagram(container, scene, options?)`

`container` is an element; the viewer adds one element to it and fills it. `scene` is a
diagram in the [scene format](scene-format.md), as an object or as its JSON text.

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `viewId` | `string` | the first view | The view (floor) shown first. |
| `projection` | `'iso' \| 'flat'` | each view's own | Draw every view isometric or flat, whatever it was saved as. |
| `theme` | `'light' \| 'dark'` | `'light'` | The canvas colours, as the editor's light and dark themes. |
| `background` | `string` | the theme's canvas colour | Any CSS colour, or `'transparent'`. |
| `grid` | `boolean` | `false` | Draw the tile grid. Off by default, as in an exported image. |
| `icons` | `Icon[]` | none | Icons the diagram names but does not carry, such as the icons of an installed [icon pack](icon-packs.md). |
| `onViewChange` | `(viewId: string) => void` | none | Called when the view changes, from `setView` or from a floor stub's marker. |

It returns a `Viewer`:

| Member | What it is |
| --- | --- |
| `title` | The diagram's title. |
| `views` | Its views (floors) in order, each `{ id, name, kind }`, `kind` being `'iso'` or `'flat'`. |
| `view` | The id of the view shown now. |
| `projection` | How the view shown now is drawn: `'iso'` or `'flat'`. |
| `element` | The element the viewer added to the container. |
| `ready` | A promise that resolves when the view shown now is fully drawn: icons decoded, fitted, labels laid out. A new one with every change below. |
| `setView(id, { projection? })` | Shows another view. Returns `ready`. |
| `setProjection(projection)` | Draws every view `'iso'` or `'flat'`; `undefined` goes back to each view's own. Returns `ready`. |
| `setTheme(theme)` | Switches between the light and dark canvas. Returns `ready`. |
| `refit()` | Fits the view to the container again. Resizes already do this. |
| `destroy()` | Removes everything the viewer added and stops watching for resizes. Later calls do nothing. |

When the container element carries the attribute `data-viewer-ready`, the view on show is
drawn. Tests can wait for it.

### Errors

`renderDiagram` throws a `ViewerError` when it cannot draw the diagram, and leaves the
container as it was:

- the text is not JSON;
- it is not a Reticulyne scene (no `format` and `version`);
- it is a scene that does not pass the scene format's checks. `error.issues` lists every
  problem, each with a `path` and a `message`;
- it has no isometric or flat view.

`setView` throws a `ViewerError` for a view id the diagram does not have.

```ts
import { renderDiagram, ViewerError } from '@reticulyne/editor/viewer';

try {
  renderDiagram(box, text);
} catch (error) {
  if (error instanceof ViewerError) {
    showMessage(error.message, error.issues);
  } else {
    throw error;
  }
}
```

## What it draws

Everything the editor's read-only render draws, in the same order: groups (and collapsed
groups as their boxes), zones, connectors with their colours, dashes and arrowheads, text
boxes, connector labels, devices with their icons, node labels, and floor stubs for
connections to another floor.

- **Hidden layers are left out**, and so is the reserved `redacted` layer, always. The viewer
  shows what an exported file would.
- **Icons:** each object's own images (`iconOverride`) first, then its icon's drawing for the
  view: the flat drawing in a flat view (its main image when it has none), else the isometric
  one. An icon the diagram names but does not carry comes from `options.icons`, else, for a
  built-in icon, from the built-in drawings, loaded on demand; any other draws the editor's
  question-mark placeholder.
- **Labels** are cut at the editor's height with a fade and a **Show more** button, which shows
  the whole description.
- **Floor stubs:** clicking a stub's marker shows the floor it names.

What it does not do, on purpose:

- **No editing, selection, panning or zooming.** The only things that respond to the pointer
  are **Show more** and the floor stubs' markers.
- **No other floors drawn faintly**, and no connector animation. Both are what the editor's
  read-only render leaves out too.
- **No floor picker.** `views` and `setView` let the page draw its own (the examples do).

## Accessibility

The viewer's element is a `figure` named after the diagram and the view on show. The
drawing itself is hidden from screen readers. Beside it is a visually hidden outline: each
object's name, its description in full, and what it is connected to, plus a button for each
other floor.

## Security

- **Descriptions** are rebuilt from the editor's allow-list (paragraphs, bold, italic,
  underline, strikethrough and links) with `createElement` and `textContent`, never
  `innerHTML`. Every link goes through the editor's link rule (only `http:`, `https:`,
  `mailto:` and `tel:`; anything else becomes `about:blank`) and opens in a new tab with
  `rel="noopener noreferrer nofollow"`.
- **Icon URLs** must pass the scene format's own rule (`http:`, `https:`, `blob:`, a relative
  path, or a `data:image/` URL of an allowed type), checked when the diagram is read, and
  are drawn with `<img>`, which runs no script.
- **Content Security Policy:** the viewer sets its styles through the DOM (`element.style`),
  never as a `<style>` element or an inline `style` attribute in markup, so it runs under
  `style-src 'self'` and `script-src 'self'`. Its images need `img-src` to allow `data:`, and
  whatever hosts your icons. `viewer.html` in the examples app runs under exactly such a
  policy.

## Sizes and loading

| File | Gzipped | Loaded |
| --- | --- | --- |
| `dist/esm/viewer.mjs` (ESM) or `dist/viewer.js` (CommonJS) | about 47 KB | always |
| `dist/esm/drawings.mjs` or `dist/drawings.js` | about 380 KB | only for a built-in icon the diagram does not carry |

The scene format's check (`zod`) is part of the 47 KB. Every diagram the editor saves or
exports carries the icons it uses, so the drawings file is normally needed only for
hand-written or trimmed files. CI holds the viewer under 60 KB and fails if it ever loads
React, MUI, Emotion or Zustand (`scripts/check-viewer-bundle.mjs`).

## How it is kept true to the editor

The viewer is built on the editor's own code for everything that decides where things go:
the connector router, collapsed groups, floors, layers, text sizes and the fit. Only the
drawing is its own, and that is checked:

- `e2e/viewer-parity.spec.ts` draws every sample diagram, every view, as saved and flat, plus
  the grid and the dark canvas, in the editor and in the viewer at the same size, in Chromium
  and WebKit, and fails if more than 1.5% of the pixels differ.
- `src/utils/__tests__/routingReference.test.ts` records every connector route of every
  sample and fails if the router or the viewer draws one differently.
- `src/viewer/__tests__/imports.test.ts` fails if anything the viewer loads, directly or not,
  loads React, MUI, the editor's stores or its heavier libraries.
