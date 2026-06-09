# Isopacks

An **isopack** is a collection of icons (and related assets) that Reticulyne can render. The
editor doesn't ship any default icons — you supply collections at mount time via the
`initialData.icons` prop.

## Collection shape

An isopack is plain data. Each icon in a collection conforms to:

```ts
type Icon = {
  id: string;
  name: string;
  url: string;       // resolvable image URL (absolute or relative)
  category?: string; // optional grouping label
  collection?: string;
  isIsometric?: boolean;
};
```

A collection groups icons under an `id`:

```ts
type ProcessedCollection = {
  id: string;
  name: string;
  icons: Icon[];
};
```

When you have multiple collections, flatten them into a single `Icon[]` list before passing
to the editor:

```ts
const icons = collections.flatMap((c) =>
  c.icons.map((icon) => ({ ...icon, collection: c.id }))
);
```

## Loading icons

```tsx
import Reticulyne from '@qant-au/isoflow';
import myIcons from './my-icons.json'; // [{ id, name, url, ... }]

<Reticulyne initialData={{
  title: 'Example scene',
  icons: myIcons,
  colors: [],
  items: [],
  views: [],
}} />
```

The icons appear in the icon panel and can be dragged onto the canvas.

## Bundled icons

The repository ships five icon collections embedded under `src/vendor/isopacks/`:

- **reticulyne** — general infrastructure icons (server, storage, switch, etc.)
- **aws** — Amazon Web Services
- **azure** — Microsoft Azure
- **gcp** — Google Cloud Platform
- **kubernetes** — Kubernetes resource types

These collections power the [standalone Docker editor](docker.md) and the in-repo examples
(see `src/examples/initialData.ts`). They are part of this single project — this fork does
not maintain or depend on a separate icon package.

If you need the same cloud-provider icons in an application that embeds
`@qant-au/isoflow` as an npm dependency, supply your own `ProcessedCollection`-shaped data
through the plugin interface below.

## Custom collections (plugin framework)

You can mix any number of collections together. Each icon needs a stable `id` (the model
references icons by `id`, so renames break diagrams that already use the icon).

```ts
const customCollection: ProcessedCollection = {
  id: 'my-org',
  name: 'My organisation',
  icons: [
    { id: 'my-org-app', name: 'Application', url: '/icons/app.svg' },
    { id: 'my-org-db',  name: 'Database',    url: '/icons/db.svg'  },
  ],
};

const icons = customCollection.icons.map((icon) => ({
  ...icon,
  collection: customCollection.id,
}));

<Reticulyne initialData={{ title: 'Example', icons, colors: [], items: [], views: [] }} />;
```

The plugin interface is intentionally minimal — any data that satisfies `ProcessedCollection`
works. There is no registration step and no runtime API; you build the array and pass it
in.

## Best practice

- **Stable IDs.** Icon `id` is referenced from the model items. Renaming an `id` will
  break diagrams that already use it.
- **Self-host the URLs.** Inline data URLs work but bloat the model JSON. CDN-served URLs
  are smaller, cacheable, and let you replace assets without re-emitting the model.
- **Set the right CSP.** If you front the editor with a Content-Security-Policy that limits
  `img-src`, allowlist your icon host. The standalone Docker container's nginx config
  allows the icon hosts used by the bundled collections — if you self-host or change icon
  hosts, update the CSP accordingly (see [docker.md](docker.md)).
