# Reticulyne scene format

**Status: specification, version 2.** This is Reticulyne's **native file format**: it saves and
opens a scene as a plain `.json` file, not as an import or export target beside a format of its
own. `src/core` implements it.

- **One schema.** A scene is validated by one [Zod 4](https://zod.dev) schema, in
  `src/core/scene/schema.ts`. This document and that schema say the same thing: the tests
  validate every example below.
- **A JSON Schema for everyone else.** The schema is also published as a JSON Schema (Draft
  2020-12), generated from the Zod schema (`z.toJSONSchema()`) and shipped in the package as
  `dist/schema/scene-v2.json`, so a scene can be validated in any language without Reticulyne's
  code. A file names it in its [`$schema`](#top-level-shape) field.
- **Drawings are not scenes.** Reticulyne's device drawings stay library source; a scene refers to
  them by id.

One JSON document describes a floor plan, an isometric network diagram and a flat 2D
(schematic) diagram of the same things, so that the tools open and save the same file,
and so that code, or a language model, can write a drawing without knowing either
editor.

## The one idea

**A thing exists once, and is placed in any number of views.**

The scene has one list of **objects**: a rack, a switch, a camera, a sofa. Each has
one stable `id`. A **view** (a floor plan, an isometric diagram, a schematic) does not
contain objects; it **places** them. So the access point on the level 2 plan and the
access point node in the network diagram are the same object, with the same `id`, placed
twice. Nothing else is needed to link them.

Reticulyne already works this way for its own views (model `items`, placed by view
`items`). This format extends the same rule to floor plans.

## Top-level shape

```ts
interface Scene {
  $schema?: string;         // URL of the published JSON Schema for this version
  format: 'reticulyne-scene'; // fixed; identifies the file
  version: 2;               // schema version, see Versioning
  id: Id;                   // this scene's own id
  title?: string;           // max 100; default 'Untitled'
  description?: string;     // max 1000
  units?: 'mm' | 'cm' | 'm' | 'in' | 'ft-in'; // display and entry unit; default 'mm'
  objects: SceneObject[];   // the model: every thing, once
  connections?: Connection[]; // logical links between objects
  views?: View[];           // where objects are drawn; default []
  layers?: Layer[];         // default []
  icons?: Icon[];           // custom icons, for objects with no element
  colors?: Color[];         // named colours views can refer to
  externalPacks?: ExternalPack[]; // the icon packs the diagram's icons came from
  links?: ExternalLink[];   // links back to external tools, for the whole scene
}
```

A scene with `objects` and no `views` is valid: it says what exists and how it
connects, and leaves the drawing to an editor (see [Writing a scene from code](#writing-a-scene-from-code)).

- **`$schema`** points at the JSON Schema published for this version, in the form
  `https://cdn.jsdelivr.net/npm/@reticulyne/editor@<major>/dist/schema/scene-v2.json`. It is
  optional and never changes how a file is read; it lets an editor or a validator in any
  language find the schema. Editors write it on save.
- **`units`** is how lengths are **shown and typed**, not how they are stored. Every
  length is stored in millimetres whatever it says (see [Plan views](#plan-views)), so
  changing it never rewrites a number. Showing and entering other units is the editors'
  job, not the format's.

## Ids

```ts
type Id = string; // /^[A-Za-z0-9_-]{1,64}$/
```

- **Unique within its collection** (objects, connections, views, floors, walls,
  connectors and so on each form one collection per scope; a floor's walls are unique
  within the view).
- **Opaque.** Nothing may parse meaning out of an id. `ap-level2-east` and
  `01J9Z3K8...` are equally valid.
- **Stable.** An editor never renames an id and never reuses one, including after a
  delete. This is what lets another scene, a ticket or an external tool point at an
  object and still find it later.
- **From outside the scene**, an object is addressed as `<sceneId>/<objectId>`.

Editors that create objects should generate collision-free ids (a ULID or UUID is
fine). Hand-written and generated scenes may use readable ones.

## Objects

```ts
interface SceneObject {
  id: Id;
  element?: string;       // a drawing or element id, e.g. 'rack-600x1000-42u'
  icon?: Id;              // an entry in `icons`, when there is no element
  iconOverride?: {        // this object's own images, over its icon or element
    url?: string;         // isometric drawing for iso views
    flatUrl?: string;     // flat drawing for schematic views (at least one of the two)
  };
  name?: string;          // max 100; shown as the label
  description?: string;   // max 1000
  tags?: string[];        // e.g. ['network', 'poe']; max 20, each max 40
  props?: Record<string, string | number | boolean>; // max 50 keys
  ports?: Port[];         // where connections attach; ids unique within the object
  links?: ExternalLink[]; // links back to external tools
}

interface Port {
  id: Id;                 // e.g. 'eth1', '24', 'psu-a'
  name?: string;          // max 100
  kind?: string;          // free text, e.g. 'ethernet', 'sfp', 'power'
  props?: Record<string, string | number | boolean>; // max 50 keys
  links?: ExternalLink[]; // e.g. the port on a switch controller
}
```

- **`element`** is the usual case for a physical thing: the id of one of Reticulyne's
  [drawings](icon-packs.md#the-built-in-pack), which gives it an isometric view and a 2D
  symbol, so the object needs nothing else to be drawn. A floor planner can read the same
  id for its plan drawing and real size. Element ids are never renamed once shipped, which
  is why a scene can store them.
- **`icon`** covers things the library does not have: an icon from another pack or an
  uploaded image. An object with an `icon` and no `element` can be drawn in diagram
  views, and in a plan view only as a symbol.
- **Doors and windows are not in the library yet.** Until they are, `element` may also
  name a floor planner's own wall fittings (`door`, `window` and the rest), so a plan can
  be carried in full.
- An object with neither is drawn as a plain labelled box.
- **`iconOverride`** replaces how this one object is drawn, view by view, without changing
  what it is: `url` is drawn in iso views in place of its icon's isometric drawing,
  `flatUrl` in flat (schematic) views in place of its flat one. Either can be set alone; the
  other view keeps the icon's own drawing. The icon entry, every other object using it, and
  the object's `element` and `ports` are untouched, so an override never changes what the
  object can connect to. Both URLs follow the icon URL rules ([Limits](#limits)). The editor
  sets it from the inspector's **Icon images** (an upload) and removes it the same way; a
  copied object keeps it, and a new one placed from the library starts without.
- **Drawings and the catalogue.** The drawings are how physical things look; the things a
  diagram connects, including virtual ones that never appear on a floor plan, come from
  Reticulyne's [catalogue](catalogue.md), which is where ports, media and protocols are
  defined. An object on both a floor plan and a diagram is still **one object**: its `id`
  is what links the two views. A catalogue item names its drawing, which a scene never
  needs.
- **`props`** holds the facts about the thing: an IP address, a MAC, a serial number, a
  port count. Flat, and scalar values only, so that every tool can show and edit it as
  a table without knowing what the keys mean.
- **`ports`** are the points a connection can attach to: a switch's ports, a patch
  panel's sockets, a device's power inlets. An object lists only the ports it needs;
  a connection to an object with no ports attaches to the object as a whole.

## Connections

A connection is a **logical** link between two objects: this camera is patched to that
switch. It belongs to the model, not to a view, so it survives when the objects are
drawn somewhere else.

```ts
interface Connection {
  id: Id;
  from: Id;               // an object id
  fromPort?: Id;          // a port of the `from` object
  to: Id;                 // an object id
  toPort?: Id;            // a port of the `to` object
  kind?: string;          // free text, e.g. 'ethernet', 'fibre', 'power', 'wireless'
  name?: string;          // max 100
  description?: string;   // max 1000
  props?: Record<string, string | number | boolean>; // e.g. { vlan: 20, poe: true }
  links?: ExternalLink[];
}
```

The model uses the vocabulary of the IETF network topology model,
[RFC 8345](https://www.rfc-editor.org/rfc/rfc8345), so a topology can be read into and
out of tools that speak it without renaming anything's meaning:

| RFC 8345 | Scene |
|---|---|
| node | an object |
| termination point (`tp-id`) | a port |
| link (`source-node` + `source-tp`, `dest-node` + `dest-tp`) | a connection (`from` + `fromPort`, `to` + `toPort`) |

The fields keep the names `connections` and `ports` because `links` already means
[links back to external tools](#links-back-to-external-tools). RFC 8345 links are
directed; a connection is too, but only by which end is written first, and an editor
may draw it either way.

How a connection is **drawn** is up to each view: a diagram view draws it as a
connector, a plan view may draw it as a cable run or not at all. A view connector says
which connection it draws (see [Diagram views](#diagram-views-iso-and-schematic)).
A connector that draws no connection is only a line on that view.

## Links back to external tools

Any object, connection or scene can point back to the same thing in another tool: the
device's page in a remote-management console, its host in a network-monitoring console,
its port on a switch controller, a ticket. The format has **no field for any particular
product**. Every such link has the same shape:

```ts
interface ExternalLink {
  source: string;   // /^[a-z0-9][a-z0-9._-]{0,39}$/: names the tool, e.g. 'rmm', 'nsm', 'switch'
  ref?: string;     // max 200: that tool's own identifier for the thing, as the tool writes it
  url?: string;     // max 2000: an absolute http: or https: URL that opens it
  label?: string;   // max 100: link text; default is `source`
}
```

- **At least one of `ref` and `url` is required.** Some tools give a thing an id of its
  own (an agent id, an asset tag); some have none and find it by address or host name,
  so only a URL makes sense. Where a tool has both, store both: a URL breaks when the
  tool moves host, and the `ref` survives it.
- **`source` is free text**, chosen by whoever writes the scene. A new tool needs no
  change to the format. Use one value per tool, consistently, so links can be grouped.
- **Several links per thing, and several per source**, are allowed: a switch port and
  the switch it is on are both useful links for one device.
- **A link is never identity.** The scene finds its objects by their own `id`; nothing
  in the format depends on a link, and a link that has gone stale breaks only itself.
- **`url` must be `http:` or `https:`.** It is opened by a person clicking it, so
  `javascript:`, `data:`, `file:` and every other scheme are rejected.

```json
"links": [
  { "source": "rmm", "ref": "AbCdEf0123456789", "url": "https://rmm.example.com/agents/AbCdEf0123456789", "label": "RMM agent" },
  { "source": "nsm", "url": "https://nsm.example.com/#/hunt?q=10.0.20.14", "label": "Network monitoring" },
  { "source": "switch", "ref": "sw-core-1:24" }
]
```

## Views

```ts
type View = PlanView | DiagramView;

interface ViewBase {
  id: Id;
  name: string;           // max 100
  description?: string;   // max 1000
  lastUpdated?: string;   // ISO 8601 date-time
}
```

**An object appears at most once in a view.** So within a view, an object id is also
the id of its placement, and connectors and groups refer to placements by object id.

### Plan views

A plan view is a building: floors, walls, and objects placed at true scale. A floor
planner draws it; Reticulyne keeps it, and reads where its devices are.

```ts
interface PlanView extends ViewBase {
  kind: 'plan';
  floors: Floor[];        // lowest first
  placements?: PlanPlacement[];
}

interface Floor {
  id: Id;
  name?: string;          // e.g. 'Ground', 'Level 2'
  elevationMm?: number;   // floor level above ground; default 3000 per storey below it
  wallHeightMm?: number;  // default 2700
  nodes?: WallNode[];     // wall corners
  walls?: Wall[];
}

interface WallNode { id: Id; x: number; y: number } // mm

interface Wall {
  id: Id;
  from: Id;               // a node id on this floor
  to: Id;                 // a node id on this floor
  exterior?: boolean;     // default false (interior, thinner)
  layer?: Id;
}

interface PlanPlacement {
  object: Id;
  floor: Id;
  x: number;              // mm: the centre of the footprint
  y: number;              // mm
  rotation?: number;      // degrees clockwise; default 0
  mirror?: { x?: boolean; y?: boolean; z?: boolean }; // flips, e.g. a door's hinge side and swing; z: top to bottom
  mountFrom?: 'floor' | 'ceiling' | 'surface'; // what mountMm is measured from, see Mounting and facing
  mountMm?: number;       // the offset from mountFrom; default the element's `mount`, else 0
  mountOn?: Id;           // 'surface' only: the object this one stands on
  size?: { w?: number; d?: number; h?: number }; // mm; overrides the element's size
  attach?: { wall: Id };  // doors, windows and anything else fixed into a wall
  layer?: Id;
  symbol?: boolean;       // force the 400 mm plan symbol; default is the element's choice
}
```

- **Every length is stored in millimetres**, as an integer wherever the value allows,
  whatever the scene's `units` says. **Axes:** x runs right, y runs down
  the plan, z runs up. **Rotation** is clockwise in degrees, about the footprint centre.
- **The footprint** is the element's `size.w` by `size.d`, unless `size` overrides it.
  An editor records the size it placed when the scene must not change if the element
  library does.
- **`attach`** fixes the placement into a wall of the same floor. The placement's `x`
  and `y` still say where along the wall it sits.

### Mounting and facing (version 2)

**Status: built.** In `src/core` (schema, validation and the version 1 migration), and in
Reticulyne, which keeps these fields as found.
Version 1 has one number for height,
`mountMm`, measured from the floor, and nothing for which way an item faces, so a
downlight is placed at a fixed 2700 mm whatever the ceiling height, and a dome camera
draws with its dome pointing up. Version 2 fixes both.

```ts
interface PlanPlacement {
  // ...every version 1 field, unchanged in meaning except as below
  mountFrom?: 'floor' | 'ceiling' | 'surface'; // default the element's `mountFrom`, else 'floor'
  mountMm?: number;       // the offset from that reference, see below
  mountOn?: Id;           // 'surface' only: the object this one stands on
  mirror?: { x?: boolean; y?: boolean; z?: boolean }; // z: flips top to bottom
}
```

**Height is a reference plus an offset.** `mountFrom` names what the height is measured
from, and `mountMm` is the offset from it. The item's underside, above its floor's level:

| `mountFrom` | `mountMm` means | Underside at | Default `mountMm` |
|---|---|---|---|
| `floor` | underside above the floor | `mountMm` | the element's `mount`, else 0 |
| `ceiling` | gap from the ceiling down to the item's **top**; 0 is flush, negative is recessed | `wallHeightMm - mountMm - h` | the element's `mount`, else 0 |
| `surface` | gap from the supporting item's top to this item's underside | the support's top `+ mountMm` | 0 |

- `h` is the placement's `size.h`, else the element's `size.h`. `wallHeightMm` is the
  placement's floor's (default 2700). So a flush downlight (`ceiling`, 0) sits at the
  ceiling on a 2400, a 2550 and a 2700 mm floor, and moves when the floor's wall height
  changes, which nothing does in version 1.
- **A negative ceiling gap is a recess**: the item's top is that far above the ceiling,
  in the void, and only the rest shows below it. An AC cassette 250 mm tall at `-220` hangs
  its 30 mm panel below the ceiling and hides its body; a recessed ceiling speaker or an
  in-ceiling projector screen casing does the same. The recess is at most the item's
  height `h`. The resolved underside is the same formula, `wallHeightMm - mountMm - h`.
- **The file stores the reference and the offset, never only the resolved height.** An
  editor that knows the absolute height of a ceiling item does not write it back as a
  floor offset; doing so would detach the item from the ceiling it hangs from.
- **`surface`** requires `mountOn`, the id of an object placed on the same floor of the
  same view, and is refused without it (and `mountOn` is refused with any other
  `mountFrom`). The support's top is its resolved underside plus the element's surface
  height, else its `h`; what makes an element a support, and what an editor does when a
  support is moved away or deleted, is the element library's and the editor's business,
  not the file's. A file never holds a cycle of `mountOn`.
- Elements carry the same reference: an element's `mountFrom` (default `floor`) says
  what its `mount` is measured from, so `mount: 0, mountFrom: 'ceiling'` is a flush
  ceiling item.
- **What carries what is in the element library.** An element whose top carries other
  items has `surface`, the cm from its underside to that top (a desk 73, a breakfast bar
  105, a workstation pod with screens 73, not its 120). An element with `mountFrom:
  'surface'` (a monitor, a microwave) stands on one; a placement of it with no `mountOn`
  is not refused for that, and stands on the floor at `mountMm` (default 0), as if it
  were `floor`. An editor writes the reference it resolved, so a saved placement says
  `surface` with its `mountOn`, or `floor`.

**Facing.** Parts are always authored facing up: z counts up from the item's underside.
An element's `facing` (`'up'`, the default, or `'down'`) says how it is installed, and
`mirror.z` on a placement flips it against that default, beside `mirror.x` and
`mirror.y`, which already flip in place. Facing down mirrors every part inside the
item's own height (a part at `z` of height `p` moves to `H - z - p`), so a dome narrows
downwards and a top-face decal moves to the underside. The item occupies the same box
either way: facing never moves the underside.

**From version 1.** A version 1 file loads, and is written back as version 2, by one
forward migration:

- A placement with `mountMm` and no `mountFrom` gets `mountFrom: 'floor'`, so a stored
  height keeps meaning exactly what it meant, so a file whose editor wrote `mountMm` on
  every placement opens with every item where it was.
- A placement with no `mountMm` is left as it is: in version 1 it already followed the
  element's `mount`, and in version 2 it follows the element's `mount` and `mountFrom`.
- Facing is not pinned. A version 1 placement has no `mirror.z`, so it takes the
  element's `facing`; the item is drawn the right way up where it was always drawn
  wrong, and its position does not change.

**Reticulyne.** Reticulyne reads and writes the same scene file but does not draw plans:
it keeps every plan view as it found it and writes it back unchanged, and reads only a
placement's floor and `x`, `y` (to say where a device sits on the building). The new
fields therefore need nothing from it beyond validation, with one consequence: the
schema is strict and a reader refuses a version newer than its own, so a Reticulyne
build carrying a version 1 schema refuses a version 2 file outright (it does not drop the
fields).

### Diagram views (`iso` and `schematic`)

A diagram view is a network drawing on a grid of tiles. `iso` draws the grid
isometrically, which is Reticulyne's view today; `schematic` draws the same grid
flat, with 2D symbols, in the style of a conventional network diagram. **The two
kinds share one shape**, so a diagram can be switched between them without losing
anything.

```ts
interface DiagramView extends ViewBase {
  kind: 'iso' | 'schematic';
  placements?: DiagramPlacement[];
  connectors?: Connector[];
  rectangles?: Rectangle[];
  textBoxes?: TextBox[];
  groups?: Group[];
}

interface Tile { x: number; y: number } // integers, -1000 to 1000

interface DiagramPlacement {
  object: Id;
  tile: Tile;
  labelHeight?: number;   // how far the label sits from the object
  labelPosition?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'; // which way; default 'N', above
  group?: Id;             // a group in this view
  layer?: Id;
  locked?: boolean;       // default false
}

interface Connector {
  id: Id;
  connection?: Id;        // the Connection this connector draws
  anchors: Anchor[];      // 2 to 100: the ends first and last, waypoints between
  description?: string;
  color?: Id;             // an entry in `colors`
  width?: number;
  style?: 'SOLID' | 'DOTTED' | 'DASHED';
  direction?: 'START_TO_END' | 'END_TO_START' | 'BOTH' | 'NONE';
  glyph?: string;         // one of Reticulyne's connector glyphs
  animated?: boolean;
  animationRate?: number; // 0 to 1
  animationFlow?: 'forward' | 'reverse' | 'both';
  layer?: Id;
  locked?: boolean;
}

// Exactly one of the three.
interface Anchor {
  id: Id;
  ref: { object: Id; side?: '+X' | '-X' | '+Y' | '-Y' } | { anchor: Id } | { tile: Tile };
}

interface Rectangle {
  id: Id;
  from: Tile;
  to: Tile;
  color?: Id;
  colorValue?: string;    // #rrggbb
  outlineColor?: string;  // #rrggbb
  transparency?: number;  // 0 to 1
  zIndex?: number;
  group?: Id;
  layer?: Id;
  locked?: boolean;
}

interface TextBox {
  id: Id;
  tile: Tile;
  content: string;        // max 100
  fontSize?: number;
  orientation?: 'X' | 'Y';
  group?: Id;
  layer?: Id;
  locked?: boolean;
}

interface Group {
  id: Id;
  name?: string;
  color?: string;         // #rrggbb, a faint fill behind the members
  group?: Id;             // groups nest; a cycle is invalid
  collapsed?: boolean;    // drawn as one box in place of its members; absent is expanded
}
```

- When a connector has a `connection`, its first and last anchors must reference that
  connection's `from` and `to` objects (in either order).
- An anchor on an object may name the `side` of the object's tile the connector leaves
  by: the edge facing the named grid direction (`+X` is the edge towards the tile at
  x + 1). It means the same edge in the iso and the flat view. Without it the end docks
  on the tile's centre and the route picks its own way out.
- A `locked` placement, connector, rectangle or text box is drawn as usual but an
  editor does not let it be selected on the canvas, so it cannot be moved, edited or
  deleted until it is unlocked. It is a view property, like `layer`: the same object
  can be locked in one view and not in another.
- Group membership lives on the member, not as a list on the group, as in Reticulyne:
  "the members of G" is a filter, and two people editing one diagram never race on one
  array.

## Layers

```ts
interface Layer {
  id: Id;
  name: string;           // max 100
  visible?: boolean;      // default true
}
```

A layer is scene-wide: one layer can hold walls on a plan and connectors in a diagram.
Anything without a `layer` is on the base layer, which always exists and is never
listed.

**`redacted` is a reserved layer id.** Anything on it is shown in an editor and left
out of every export (image, PDF, SVG, shared link, JSON) unless the export explicitly
opts in. It exists so a diagram can carry addresses and other sensitive notes in
the working copy without them leaking into the copy that gets sent out.
`redactScene(scene)` gives that copy, still a valid scene: an object
whose every placement was redacted goes with it, as do the connections and connectors
that end on it, a placement fixed into a redacted wall loses its `attach`, and one
standing on a redacted placement loses its `mountOn` and stands on the floor.
`hasRedacted(scene)` says whether there is anything to leave out, so an editor can
offer the opt-in only when it means something.

## Icons and colours

```ts
interface Icon {
  id: Id;
  name: string;           // max 100
  url: string;            // max 65,536; see Validation for the allowed schemes
  collection?: string;
  isIsometric?: boolean;  // whether `url` is an isometric drawing
  flatUrl?: string;       // max 65,536; the flat (2D) drawing, for schematic views
}

interface Color { id: Id; value: string } // #rrggbb
```

These are Reticulyne's icon and colour entries. An icon's `url` is what an `iso` view
draws; a `schematic` view draws its `flatUrl`, or its `url` when it has none (see
[icon packs](icon-packs.md)).

### Packs a diagram uses

```ts
interface ExternalPack {
  id: Id;               // the pack's id
  name: string;         // max 100
  version?: string;     // max 40
  sourceUrl: string;    // where to get it; any non-empty text, max 2,000
  icons: Id[];          // the pack's icons this diagram uses
}
```

A diagram drawn with an [icon pack](icon-packs.md) other than Reticulyne's own lists
that pack here, once, when it is saved or exported. The diagram still carries its own
copy of every icon it uses in `icons`, so it draws without the pack; the entry is
there so that someone who opens the file without the pack is told which pack it was
and where to get it. An editor that opens a file listing a pack it does not have
keeps the entry on the next save while objects still use that pack's icons.

**An icon nobody has.** `validateScene` refuses an object whose `icon` is not in
`icons`. The editor is kinder when it opens a file: an icon an object names that the
file does not carry is taken from the editor's own library when it has one of that
id, and otherwise put in as a placeholder (a question mark in both views) with the
same id, and listed so it can be replaced. The placeholder is saved with the diagram,
which keeps the file valid, and is recognised again when the file is next opened.

## Writing a scene from code

The format is meant to be written by hand, by a script, and by a language model
describing a network in words. So:

- **Almost everything is optional.** The smallest valid scene is three fields and an
  empty list.
- **Placement is optional.** A scene can list objects and connections with no views at
  all; an editor opening it places the unplaced objects itself. An object that is in no
  view is still part of the scene.
- **Rotation is in degrees**, not radians, and **lengths are in millimetres**, because
  those are the numbers people write down and read off a drawing.
- **Ids can be readable.** `core-switch` is as good as a UUID.

### Smallest valid scene

```json
{ "format": "reticulyne-scene", "version": 2, "id": "empty", "objects": [] }
```

### A network with no drawing yet

```json
{
  "format": "reticulyne-scene",
  "version": 2,
  "id": "branch-office",
  "title": "Branch office",
  "objects": [
    { "id": "fw", "element": "firewall", "name": "Firewall" },
    { "id": "core", "element": "network-switch", "name": "Core switch", "ports": [{ "id": "1", "kind": "ethernet" }] },
    { "id": "ap-1", "element": "wifi-ap", "name": "AP reception" }
  ],
  "connections": [
    { "id": "c1", "from": "fw", "to": "core", "kind": "ethernet" },
    { "id": "c2", "from": "core", "fromPort": "1", "to": "ap-1", "kind": "ethernet", "props": { "poe": true } }
  ]
}
```

### A plan

One room, 4 m by 3 m (4000 by 3000 mm) with a 2.4 m ceiling: a door, a rack, a desk with a
monitor standing on it, and a recessed downlight that hangs from the ceiling, so it
follows the ceiling if the wall height changes.

```json
{
  "format": "reticulyne-scene",
  "version": 2,
  "id": "comms-room",
  "objects": [
    { "id": "door-1", "element": "door" },
    { "id": "rack-1", "element": "rack-600x1000-42u", "name": "Rack A" },
    { "id": "desk-1", "element": "desk" },
    { "id": "monitor-1", "element": "monitor" },
    { "id": "light-1", "element": "downlight" }
  ],
  "views": [
    {
      "id": "plan",
      "kind": "plan",
      "name": "Floor plan",
      "floors": [
        {
          "id": "g",
          "name": "Ground",
          "wallHeightMm": 2400,
          "nodes": [
            { "id": "n1", "x": 0, "y": 0 },
            { "id": "n2", "x": 4000, "y": 0 },
            { "id": "n3", "x": 4000, "y": 3000 },
            { "id": "n4", "x": 0, "y": 3000 }
          ],
          "walls": [
            { "id": "w1", "from": "n1", "to": "n2", "exterior": true },
            { "id": "w2", "from": "n2", "to": "n3", "exterior": true },
            { "id": "w3", "from": "n3", "to": "n4" },
            { "id": "w4", "from": "n4", "to": "n1", "exterior": true }
          ]
        }
      ],
      "placements": [
        { "object": "door-1", "floor": "g", "x": 3000, "y": 3000, "attach": { "wall": "w3" } },
        { "object": "rack-1", "floor": "g", "x": 600, "y": 600 },
        { "object": "desk-1", "floor": "g", "x": 3000, "y": 600 },
        { "object": "monitor-1", "floor": "g", "x": 3000, "y": 400, "mountFrom": "surface", "mountOn": "desk-1", "mountMm": 0 },
        { "object": "light-1", "floor": "g", "x": 2000, "y": 1500, "mountFrom": "ceiling", "mountMm": -90 }
      ]
    }
  ]
}
```

### The same device on a plan and in a diagram

The access point `ap-2e` is placed on the level 2 plan and in the network schematic.
The connector draws connection `c-ap`, so selecting the cable in the diagram can
highlight the device on the plan. The access point and the switch both link back to a
remote-management console and a network-monitoring console.

```json
{
  "format": "reticulyne-scene",
  "version": 2,
  "id": "hq",
  "title": "Head office",
  "objects": [
    {
      "id": "sw-2",
      "element": "network-switch",
      "name": "Level 2 switch",
      "props": { "ip": "10.0.20.2" },
      "ports": [{ "id": "14", "kind": "ethernet" }],
      "links": [
        { "source": "rmm", "ref": "Sw2AgentId0001", "url": "https://rmm.example.com/agents/Sw2AgentId0001" },
        { "source": "nsm", "url": "https://nsm.example.com/#/hunt?q=10.0.20.2" }
      ]
    },
    {
      "id": "ap-2e",
      "element": "wifi-ap",
      "name": "AP level 2 east",
      "props": { "ip": "10.0.20.14", "serial": "Q2XX-0000-0001" },
      "links": [
        { "source": "rmm", "ref": "Ap2eAgentId001", "url": "https://rmm.example.com/agents/Ap2eAgentId001" },
        { "source": "nsm", "url": "https://nsm.example.com/#/hunt?q=10.0.20.14" },
        { "source": "switch", "ref": "sw-2:14" }
      ]
    }
  ],
  "connections": [
    { "id": "c-ap", "from": "sw-2", "fromPort": "14", "to": "ap-2e", "kind": "ethernet", "props": { "poe": true } }
  ],
  "views": [
    {
      "id": "plan",
      "kind": "plan",
      "name": "Building",
      "floors": [{ "id": "l2", "name": "Level 2", "elevationMm": 3500 }],
      "placements": [
        { "object": "sw-2", "floor": "l2", "x": 1200, "y": 800 },
        { "object": "ap-2e", "floor": "l2", "x": 18400, "y": 6200, "mountFrom": "ceiling", "mountMm": 0 }
      ]
    },
    {
      "id": "net",
      "kind": "schematic",
      "name": "Network",
      "placements": [
        { "object": "sw-2", "tile": { "x": 0, "y": 0 } },
        { "object": "ap-2e", "tile": { "x": 4, "y": 0 } }
      ],
      "connectors": [
        {
          "id": "k1",
          "connection": "c-ap",
          "anchors": [
            { "id": "a1", "ref": { "object": "sw-2" } },
            { "id": "a2", "ref": { "object": "ap-2e" } }
          ]
        }
      ]
    }
  ]
}
```

## Crossover: one object in a plan and a diagram

A floor planner draws the plan views and Reticulyne the diagram views of one scene, and
each keeps the other's views when it saves. An object placed in both is linked by
its `id` and by nothing else, so the links are read straight out of the scene.
`src/core` reads them:

```ts
objectPlaces(scene, objectId): ObjectPlace[]
// every view that places the object: its plan floor and position, or its tile

placedOnlyElsewhere(scene, kinds): SceneObject[]
// objects placed in a view of another kind and in no view of `kinds`:
// what one editor can offer to place from the other's drawing

diagramLocations(scene, diagramViewId): FloorLocation[]
// where a diagram view is on the building: the plan floors its objects
// are on, most objects first

floorsOf(scene, objectIds): FloorLocation[]
// the same for any set of objects, such as a diagram view not saved yet
```

- **Placing an object from the other editor keeps its `id`.** It is the same thing,
  now drawn twice; a copy with a new id would be a second thing.
- **A diagram view is not tied to a floor by a field.** Its physical location is
  where its objects are: a diagram per storey maps to that storey, a diagram of a
  whole site maps to several floors, and a diagram of cloud services maps to none.
  Nothing has to be kept in step when a device moves floor.
- **At catalogue level** a catalogue item names its drawing (`drawing: '<id>'`), so a
  plan object with that `element` can be drawn in a diagram with its catalogue twin.
  The scene never stores the catalogue item.

## Migrating from Reticulyne's model

The scene format replaces the model older versions of Reticulyne saved. The model is
**read, never written**:

- **On load**, a Reticulyne model is converted to a scene as below, and from then on the
  editor works on the scene.
- **On save**, it writes only the scene format. There is no "save as Reticulyne model",
  and no round trip back.
- **Exports are separate and unchanged.** Exporting a drawing as SVG, PDF or PNG is
  output, not a file format, and works as it does today.

### Reticulyne model

The Reticulyne model schema is in
[src/schemas](https://github.com/qant-au/reticulyne/tree/main/src/schemas). A model
becomes one scene with one `iso` view per Reticulyne view.

| Reticulyne | Scene | Note |
|---|---|---|
| `title`, `description` | `title`, `description` | |
| `items[]` (`id`, `name`, `description`, `icon`) | `objects[]` | same ids; `icon` stays an icon reference |
| `icons[]`, `colors[]` | `icons[]`, `colors[]` | unchanged |
| `views[]` | `views[]` with `kind: 'iso'` | |
| view `items[]` (`id`, `tile`, `labelHeight`, `parentGroupId`) | `placements[]` (`object`, `tile`, `labelHeight`, `group`) | a view item's `id` is its model item's id |
| `connectors[]` | `connectors[]` | anchor `ref.item` becomes `ref.object`; no `connection` |
| `rectangles[]`, `textBoxes[]`, `groups[]` | same | `parentGroupId` becomes `group` |
| `version` (string) | none | the scene carries its own `version` |

Reticulyne connectors carry no logical connection today. On load, a connector
whose two ends are objects may also create a `Connection` between them; an editor
that does so must do it only when asked, since two connectors between the same pair
are not necessarily two cables.

## Validation

An editor never calls `JSON.parse` on a scene without a reviver that drops
`__proto__`, `constructor` and `prototype` keys, and validates the result before using
it. A scene that fails validation is refused whole; nothing is half-loaded.

**Structure.** Unknown keys are rejected at every level (so a typo fails loudly rather
than being dropped), and every string length and array size is capped:

| Collection | Max |
|---|---|
| objects, connections | 10,000 |
| views | 1,000 |
| placements per view | 10,000 |
| connectors, rectangles, text boxes, groups per view | 5,000 each |
| anchors per connector | 100 |
| floors per plan | 200 |
| nodes, walls per floor | 10,000 each |
| layers | 100 |
| icons | 5,000 |
| colors | 100 |
| ports per object | 1,000 |
| links per object, port, connection or scene | 20 |

**Coordinates.** Diagram tiles are integers from -1000 to 1000 (a pathfinder allocates
a grid the size of the area a connector spans). Plan coordinates and lengths are finite
numbers in millimetres from -10,000,000 to 10,000,000 (10 km).

**URLs.** An icon `url` may be `http:`, `https:`, `blob:`, a relative path, or a
`data:image/` URI of type png, jpeg, gif, webp or svg+xml. An external link `url` must
be `http:` or `https:`. Everything else is rejected, percent-encoded schemes included.

**References.** Every id reference must resolve:

- a connection's `from` and `to`, and a placement's `object`, to an object, and a
  connection's `fromPort` and `toPort` to a port of that end's object;
- a plan placement's `floor` to a floor of that view, and `attach.wall` to a wall of
  that floor;
- a wall's `from` and `to` to nodes of the same floor;
- a plan placement's `mountOn` to an object placed on the same floor of that view, only
  with `mountFrom: 'surface'` (which requires it), with no cycles;
- a connector anchor's `object` to an object placed in that view, and `anchor` to
  another anchor of a connector in that view;
- a `group` to a group in the same view, with no cycles;
- a `color` to `colors`, an `icon` to `icons`, a `layer` to `layers` or `redacted`;
- a connector's `connection` to a connection whose ends match its end anchors.

And no object is placed twice in one view.

## Versioning

- `version` is a single integer. This document is version 2. The Zod schema in
  `src/core` and the JSON Schema generated from it are published per version
  (`scene-v2.json`), so a file's `$schema` keeps pointing at the schema it was written
  against.
- A new required field, a removed field, or a change to what a field means bumps the
  version, and adds a forward-only migration from the previous version.
- A new optional field, whose absence means the old behaviour, needs no migration, but
  still bumps the version, so that an older reader refuses the file rather than
  silently dropping the field.
- Migrations are append-only: never edit a released one.
- Readers accept every version they have a migration for, and refuse anything newer.
- **Before 1.0, optional additions stay within version 2.** No compatibility is
  promised before 1.0, so icon `flatUrl`, object `iconOverride` and scene
  `externalPacks` were added without a bump. The rule above applies from 1.0.
- **Version 2** adds [mounting and facing](#mounting-and-facing-version-2): placement
  `mountFrom`, `mountOn` and `mirror.z`, and gives `mountMm` a meaning that depends on
  `mountFrom`. Its migration from version 1 is described there.

## Out of scope

- **Editor state**: selection, tool, zoom, scroll position. A scene describes the
  drawing, not a session.
- **The element library itself.** A scene refers to elements by id; their shapes,
  sizes and drawings come from the library.
- **Anything product-specific.** Links to other tools are generic
  ([Links back to external tools](#links-back-to-external-tools)); a tool that wants
  more stores it in `props`.
- **Importing other formats.** The scene format is the native format; reading a
  building or diagram from another standard (IFC, glTF, GraphML, draw.io) is not part of
  it, and exporting a drawing (SVG, PDF, PNG) is separate from it.
