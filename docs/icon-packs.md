# Icon packs

An **icon pack** is a named set of icons that Reticulyne can draw. The editor takes a flat list
of icons in `initialData.icons`; a pack is how a set of them is built, shipped and installed as
one unit. Reticulyne's own device drawings ship as a pack, and a third-party pack has the same
shape.

## Icon shape

```ts
type Icon = {
  id: string;
  name: string;
  url: string;          // the main image: isometric when isIsometric is true
  collection?: string;  // the library section it is filed under
  isIsometric?: boolean;
  flatUrl?: string;     // the flat (2D, schematic) drawing, for the flat view
};
```

Each icon can carry **two drawings**, one per view:

- **`url`** is what the isometric view draws. With `isIsometric: true` it is an isometric drawing
  and is drawn as it is; otherwise it is a flat image laid onto the tile.
- **`flatUrl`** is what the flat 2D view draws. An icon with none is drawn flat from its `url`.

Both are in the file format, so an exported diagram carries both images of every icon it uses. A
diagram saved before icons had `flatUrl` still draws flat when the editor's library has an icon
of the same id with one.

URLs must be `http(s):`, `blob:`, a relative path, or a `data:image/...` URI, at most 65,536
characters each.

## Pack shape

```ts
type IconPack = {
  id: string;        // stable; the default collection of its icons
  name: string;
  version?: string;
  icons: Icon[];     // ids unique within the pack
};
```

The package exports the helpers (from `@reticulyne/editor` and `@reticulyne/editor/standalone`):

| Export | Does |
|---|---|
| `validateIconPack(value)` | Checks a parsed value against the pack schema (strict: unknown fields are refused) and that icon ids are unique. Returns `{ ok: true, pack }` or `{ ok: false, errors }`. |
| `iconPackSchema` | The Zod schema behind it. |
| `packIcons(pack)` | The pack's icons, each without a `collection` filed under the pack id. |
| `flattenPacks(packs)` | Every pack's icons as one `Icon[]` for `initialData.icons`; the first icon of an id wins. |
| `fillFlatUrls(icons, library)` | Gives each icon with no `flatUrl` the one of the same id in `library`. |
| `BUILTIN_PACK`, `builtinIcons()` | Reticulyne's own drawings, below. |

## Loading packs

```tsx
import Reticulyne, { BUILTIN_PACK, flattenPacks } from '@reticulyne/editor';
import myPack from './my-pack.json';

<Reticulyne initialData={{
  title: 'Example scene',
  icons: flattenPacks([BUILTIN_PACK, myPack]),
  colors: [],
  items: [],
  views: [],
}} />
```

The icons appear in the icon library, one section per collection, and can be dragged onto the
canvas. `iconCollections: { allow, deny }` filters the library by collection, so a pack can be
allowed or denied by its id.

## The built-in pack

`BUILTIN_PACK` (id `reticulyne`) holds Reticulyne's device drawings (`src/icons/drawings.ts`):
network, security, fire, AV and power equipment, each with an isometric view as `url` and a flat,
front-on schematic as `flatUrl`. The icons are `reticulyne-<drawing id>`, filed under
`Reticulyne`. The [catalogue](catalogue.md) items draw with them: an item names its drawing with
`drawing`.

## The bundled isopacks

The repository also carries five icon collections under `src/vendor/isopacks/`. Each one is
already pack-shaped (`{ id, name, icons }`), with an isometric `url` and no `flatUrl`:

- **isoflow**: general infrastructure icons (server, storage, switch and so on)¹
- **aws**: Amazon Web Services
- **azure**: Microsoft Azure
- **gcp**: Google Cloud Platform
- **kubernetes**: Kubernetes resource types

¹ The general pack keeps its pre-rename id `isoflow` so diagrams saved before the
Isoflow → Reticulyne rename still resolve their icons. Filter it with
`iconCollections: { allow: ['isoflow'] }`.

They power the [standalone Docker editor](docker.md) and the in-repo examples (see
`src/examples/initialData.ts`), which load all five plus the built-in pack. They are not part of
the published package; an application embedding `@reticulyne/editor` that wants the same
cloud-provider icons supplies them as its own pack.

## Packs installed in the Docker editor

The [standalone Docker editor](docker.md) keeps installed packs in the browser's IndexedDB,
beside the saved diagrams, and adds their icons to the library when it starts. A pack installed
there stays in that browser only. Installing and removing a pack from the editor's own interface
is planned; until then the store's `install` takes any value that passes `validateIconPack`.

## Best practice

- **Stable ids.** Diagrams name icons by `id`; renaming one breaks the diagrams that use it.
  Prefix a pack's ids with the pack id so two packs never collide.
- **Give every icon both drawings** where you can. A flat image used for the isometric view, or
  an isometric one drawn in the flat view, both read as out of place.
- **Self-host the URLs.** Inline data URLs work but make every diagram file that uses the icon
  bigger. CDN-served URLs are smaller and cacheable.
- **Set the right CSP.** If you front the editor with a Content-Security-Policy that limits
  `img-src`, allowlist your icon host. The standalone Docker container's nginx config allows
  images only from `'self'`, `data:` and `blob:`; if you add externally hosted icons, update the
  CSP accordingly (see [docker.md](docker.md)).
