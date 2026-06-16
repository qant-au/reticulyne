# Quick start

A minimal example. Assumes you've completed [installation](installation.md).

## Minimal render

```tsx
import Reticulyne from '@qant-au/reticulyne';

export function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Reticulyne />
    </div>
  );
}
```

This mounts a fully functional editor with an empty canvas. Without icons it is not
particularly useful — see [isopacks.md](isopacks.md) for how to load icon collections.

## Container sizing

`<Reticulyne>` fills 100% of its containing block. Make sure the container has non-zero
dimensions, or pass `width` / `height` props directly:

```tsx
<Reticulyne width={640} height={480} />
<Reticulyne width="50vw" height="80vh" />
```

The renderer attaches a `ResizeObserver` to its root, so layout changes are picked up
without a remount.

## Hydrating from data

`initialData` accepts a complete model:

```tsx
<Reticulyne
  initialData={{
    title: 'My diagram',
    version: '',
    icons: [],     // see isopacks.md
    colors: [],
    items: [],
    views: [],
  }}
/>
```

Invalid data is rejected by Zod; the editor renders empty and the failure is
routed to `onValidationError` (or to `console.error` if you don't supply that
prop). See [api.md](api.md#initialdata) for the full shape.

## Capturing edits

```tsx
<Reticulyne
  initialData={diagram}
  onModelUpdated={(model) => {
    persistToBackend(model);
  }}
/>
```

`onModelUpdated` fires whenever the model changes. Callback identity does not need to be
memoised — the component captures the latest callback in a ref so passing a fresh inline
closure on every render is fine.

## Read-only

```tsx
<Reticulyne editorMode="EXPLORABLE_READONLY" initialData={diagram} />
```

`EXPLORABLE_READONLY` keeps pan, zoom, and selection but hides edit controls and blocks
data-layer mutations. `NON_INTERACTIVE` additionally disables all pointer interactions.
See [embedding.md](embedding.md#editor-modes) for the full mode matrix.

## Next.js

`<Reticulyne>` accesses `window` at module load and cannot be server-side rendered. Wrap it in
a dynamic import with SSR disabled:

```tsx
// ReticulyneDynamic.tsx
import dynamic from 'next/dynamic';

export const ReticulyneDynamic = dynamic(
  () => import('@qant-au/reticulyne').then((m) => m.default),
  { ssr: false }
);
```

Then use `<ReticulyneDynamic />` from your pages or components.

## Next steps

- [API reference](api.md) — props and the imperative hook.
- [Embedding contract](embedding.md) — modes, container sizing, callback identity, security model.
- [Isopacks](isopacks.md) — loading icon collections.
