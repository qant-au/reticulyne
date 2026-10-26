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
  icons: PackIcon[]; // ids unique within the pack
};

// An icon, optionally with its connection detail.
type PackIcon = Icon & {
  family?: Family;          // palette section, as for a catalogue item
  description?: string;
  ports?: PortTemplate[];   // the device's ports, on the catalogue's media
  props?: Record<string, string | number | boolean>;
};
```

### Connection detail

A pack icon can carry the ports of the device it draws, so a pack brings its devices ready to
connect, not only their pictures. The ports are written exactly as a catalogue item's
([Ports](catalogue.md#ports-connector--medium--protocol)): a medium from the catalogue, and optionally a connector, gender,
role, protocols and capabilities. An icon with ports needs a `family` (its palette section) and a
kebab-case id.

```json
{
  "id": "acme-sat-hotspot",
  "name": "Acme Satellite Hotspot",
  "url": "data:image/svg+xml,...",
  "isIsometric": true,
  "flatUrl": "data:image/svg+xml,...",
  "family": "marine-vehicle",
  "ports": [
    { "id": "sat", "name": "Satellite link", "medium": "satellite", "role": "client" },
    { "id": "wifi", "name": "Wi-Fi", "medium": "wi-fi", "role": "hub" },
    { "id": "usb", "name": "USB", "medium": "usb", "connector": "usb-c" }
  ]
}
```

`validateIconPack` checks the ports against the catalogue's rules and reports each problem
under `icons.<id>`. `packCatalogueItems(pack)` returns one catalogue item per icon with ports
(the item's id and icon are the icon's id); pass them to `<Reticulyne catalogueItems>` and they
join the palette after the built-in items. The connection detail stays in the pack: the icon a
diagram stores is the plain icon record, and a placed device keeps its own copy of the ports.

The package exports the helpers (from `@reticulyne/editor` and `@reticulyne/editor/standalone`):

| Export | Does |
|---|---|
| `validateIconPack(value)` | Checks a parsed value against the pack schema (strict: unknown fields are refused) and that icon ids are unique. Returns `{ ok: true, pack }` or `{ ok: false, errors }`. |
| `iconPackSchema` | The Zod schema behind it. |
| `packIcons(pack)` | The pack's icons as plain icon records (connection detail left out), each without a `collection` filed under the pack id. |
| `packCatalogueItems(pack)` | A catalogue item for each icon with ports, for `<Reticulyne catalogueItems>`. |
| `packIconSchema` | The Zod schema of one pack icon. |
| `flattenPacks(packs)` | Every pack's icons as one `Icon[]` for `initialData.icons`; the first icon of an id wins. |
| `fillFlatUrls(icons, library)` | Gives each icon with no `flatUrl` the one of the same id in `library`. |
| `BUILTIN_PACK`, `builtinIcons()` | Reticulyne's own drawings, below. |

## Loading packs

```tsx
import Reticulyne, { BUILTIN_PACK, flattenPacks, packCatalogueItems } from '@reticulyne/editor';
import myPack from './my-pack.json';

<Reticulyne
  initialData={{
    title: 'Example scene',
    icons: flattenPacks([BUILTIN_PACK, myPack]),
    colors: [],
    items: [],
    views: [],
  }}
  catalogueItems={packCatalogueItems(myPack)}
/>
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

## Bringing your own icons

The built-in pack is the only one Reticulyne ships. To add your own icons (cloud-provider sets,
your own equipment, a company's house style), build a pack:

1. **Draw each icon twice** if you can: an isometric view for `url` and a flat, front-on view for
   `flatUrl`. SVG works best. An icon with only `url` still works, and the flat view draws it as
   it is.
2. **Write the pack** as `{ id, name, version?, icons }`, giving every icon an `id` that starts
   with the pack id (`acme-router`), a `name`, and its URLs.
3. **Add the ports** of each device, if you want it in the palette ready to connect (see
   [Connection detail](#connection-detail)).
4. **Check it** with `validateIconPack(pack)`, which reports every problem rather than the first.
5. **Load it** beside the built-in pack with `flattenPacks([BUILTIN_PACK, myPack])`, and its
   devices with `packCatalogueItems(myPack)`, as in [Loading packs](#loading-packs).

Use only icons you have the right to use: many vendor icon sets carry their own licence terms.

## One Object's Own Images

To change how a single object looks without touching the library, select it and use **Icon
images** in its inspector: **Upload** an isometric image, a flat one, or both. Each replaces
that object's drawing in its own view only, and **Remove** brings the icon's drawing back.

- The icon in the library, and every other object drawn with it, stays as it is.
- The object keeps its ports, so what it can connect to does not change.
- Copy and paste carries the images to the copy; the same device placed again from the
  library starts with the library's drawing.
- Uploads go through the host's `onIconUpload`, as **Upload icon** does, with the same
  checks (SVG, PNG, JPEG, GIF or WebP, at most 200 KB, an image the browser can draw). With
  no `onIconUpload` there is no Upload, but an object that already has images can still
  have them removed.
- In the file they are the object's `iconOverride` ([scene format](scene-format.md#objects)).

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
