# Changelog

All notable changes to `@reticulyne/editor` (`@qant-au/reticulyne` up to 0.3.0) are
documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Versioning policy (0.x).** While the package is on a `0.x` line, minor
releases may include breaking changes to props, the `useReticulyne()` return
shape, or exported types — this is permitted by SemVer for pre-1.0 versions.
`v1.0.0` will mark API stabilisation. Until then, treat every minor release as
potentially breaking and read the release notes before upgrading.

## [Unreleased]

### Added

- **A read-only viewer with no React: `@reticulyne/editor/viewer`** ([docs/viewer.md](docs/viewer.md)). `renderDiagram(container, scene, options)` draws a diagram as DOM and SVG, as the editor's own read-only render (Export as image) draws it, and returns `{ title, views, view, projection, element, ready, setView, setProjection, setTheme, refit, destroy }`. Options: `viewId`, `projection` (`'iso'` or `'flat'`), `theme`, `background`, `grid`, `icons` and `onViewChange`. It fits the diagram to its container and again on resize; a label's **Show more** and a floor stub's marker are the only things that respond to the pointer. Hidden layers and the `redacted` layer are left out. About 47 KB gzipped, no peer dependencies, runs under a strict Content Security Policy; the built-in drawings are loaded only for a built-in icon a diagram does not carry. A scene it cannot draw throws a `ViewerError` with the scene format's issues. The examples app gains a **Read-only viewer** example and `viewer.html`, the viewer on a page with no React.
- **Icon packs: install, push in from code, share** ([docs/icon-packs.md](docs/icon-packs.md)). A pack is one file holding its icons (isometric and flat), their devices' ports and any media those devices connect on (`media`, new). Every pack now names where it comes from in a required `sourceUrl`.
  - **Icon packs** in the main menu (`'ACTION.ICON_PACKS'`, on by default, editable only) lists the packs loaded, installs one from a file (every problem listed; a pack of the same id replaced after a confirm naming both versions) and removes one. Removal is refused while a diagram places objects drawn with the pack, and the refusal lists them, with **Show** to go to them.
  - **From code:** the `iconPacks` prop (`[{ pack, removable?, origin? }]`) and `useReticulyne()`'s `installIconPack`, `removeIconPack` and `getIconPacks`. `removable: false` locks a pack: no Remove, no install over it. The last pack loaded with an id wins otherwise. A pack's devices join the palette with their ports, and its media join the catalogue's. `onIconPackInstall`, `onIconPackRemove`, `iconPackUsage` and `onShowIconPackUsage` let a host keep the user's installs and check its other diagrams.
  - **Sharing:** a saved or exported diagram lists each pack it used once, in a new optional `externalPacks` field (scene format still version 2). Opened without a pack, or with another version of it, the editor says which, with its source link, and draws the icons from the copies in the file.
  - **Missing icons:** an object whose icon nobody has now opens as a question-mark placeholder in both views, instead of the editor refusing the whole file, and is listed with **Replace…**, which redraws every object using it in one undo step, ports and connections kept. `validateScene` is unchanged and still refuses such a file.
  - `scripts/build-pack.mjs` builds a pack file from a folder of drawings and checks it; `dist/schema/icon-pack.json` is the pack's JSON Schema (`ICON_PACK_SCHEMA_URL`); `packMedia()` is exported.
  - **Nautical Flags**, a demo pack in `packs/nautical-flags`: the 40 flags of the International Code of Signals, joined by a halyard; and an **Icon packs from code** example in the examples app.

- **Mermaid flowcharts in and out** ([docs/mermaid.md](docs/mermaid.md)). **Export as Mermaid** writes the current view as flowchart text (preview, copy, `.mmd` or fenced `.md`), with zones and groups as subgraphs, connector direction, dashes, colours and labels, and a list of what did not carry across. **Import Mermaid** reads pasted text or a `.mmd` / `.md` file and lays the flowchart out on tiles; every problem is an error with a code, a line, a column and a plain message, listed as it is typed, and Import stays off until there are none. Both menu entries are on by default (`'EXPORT.MERMAID'`, `'ACTION.IMPORT_MERMAID'`). `useReticulyne()` gains `exportMermaid()` and `importMermaid()`, and the standalone entry exports `sceneToMermaid`, `mermaidToScene`, `parseMermaid` and the issue codes. The reader is Reticulyne's own (no Mermaid at runtime) and is checked against Mermaid 11 and 12.
- **An object's own icon images.** The inspector's **Icon images** uploads an isometric and/or a flat image for one object, drawn in place of its icon in that view, and removes it again. The icon in the library, other objects using it and the object's ports are not changed; copy and paste carries the images. Saved as the object's new optional `iconOverride` (`{ url?, flatUrl? }`) in the scene format, still version 2 ([docs/icon-packs.md](docs/icon-packs.md#one-objects-own-images)).
- **Two sample diagrams and flat pictures.** `samples/built-in-devices.json` (catalogue devices only, joined port to port) and `samples/mixed-icons.json` (built-in, pack, uploaded and overridden icons); every sample now has an isometric and a flat picture, exported by `demos/samples.demo.ts`.
- **Flowchart drawings and catalogue family.** 39 new drawings, one per flowchart shape (Process, Decision, Terminal Point, Document, Database and the rest), each a catalogue item in a new **Flowchart** palette section.

### Changed

- **Opening a diagram with an unknown icon** shows it as a placeholder and lists it, where it used to be refused as invalid (`onValidationError` is no longer called for that alone). Hosts that relied on the refusal can still check a file with `validateScene`.
- **The Docker editor's installed packs** now load through `iconPacks`, so their devices' ports reach the palette; packs stored by an older build without a `sourceUrl` are named under the Diagrams button with a Remove, not dropped silently.
- **Unsaved changes** no longer count the library's icons: loading or installing a pack is not a change to the diagram.

### Fixed

- **Labels clear their drawings.** A placement with no `labelHeight` of its own (a hand-written or imported scene, a Mermaid import) drew its label 20 px up, on the top of every taller drawing; it now starts at 80, where a placed item's label does.
- **Sample icons.** The samples' Wi-Fi access points drew as server towers, a NAS and two databases as storage arrays, a cache as a database and an event topic as an alert; each now draws as the device it names.

## [0.8.0] - 2026-10-21

### Changed

- **Copyright holder.** `LICENSE` names Adam Burgess personally as the copyright holder of the fork and everything added since, replacing the company notice that had been on it since the first commit. Mark Mankarious's Isoflow notice is unchanged, and the licence is still MIT.

### Changed (breaking)

- **Reticulyne stands alone.** The scene format, the shared widgets and the device drawings it carried as vendored copies of another project's builds are now its own source: `src/core` (the scene format, units, keymap), `src/kit` (dialogs, menus, panels, notifications, theme) and `src/icons` (the drawings and icon packs). Nothing is vendored from it any more, and `scripts/sync-accurona.mjs` is gone.
- **The file format is the [Reticulyne scene format](docs/scene-format.md)**, `format: 'reticulyne-scene'`, still version 2, with its JSON Schema shipped as `dist/schema/scene-v2.json` (`$schema` points there). Files saved under the format's previous name no longer open (no compatibility is kept before 1.0).
- **Built-in icon ids** are `reticulyne-<drawing id>` (collection `Reticulyne`).
- **Catalogue items name their drawing** with `drawing: '<id>'` in place of a `links: [{ source: 'accurona', ref }]` cross-reference.
- **A new set of built-in drawings, 329 in one style**, each with an isometric and a flat view. The earlier drawings keep their ids in the new style. The 15 catalogue items that had only a hand-drawn flat symbol now have a drawing of their own, so `ITEM_SYMBOLS` and `src/catalogue/symbols.ts` are gone. A virtual item gets its icon but still no `element`.
- **The bundled third-party icon collections are removed** (Isoflow, AWS, Azure, GCP and Kubernetes, with `src/vendor/isopacks`). The built-in pack is the only one Reticulyne ships; the samples, templates and examples use it, and [docs/icon-packs.md](docs/icon-packs.md) says how to bring your own icons.
- **Exports renamed or removed:** `builtinIcons`, `BUILTIN_ICON_COLLECTION` and `catalogueItemDrawing` replace `accuronaIcons`, `ACCURONA_ICON_COLLECTION` and `accuronaElement`; `schematicIconUrl` is removed (the flat view reads `flatUrl`). The theme factory is `createKitTheme` / `kitThemeOptions` / `kitVars`.

### Added

- **Label position.** A node's label can sit at any of eight compass points around it (`labelPosition`, default `N`, above), chosen on a compass behind the Label position button at the top right of the inspector; saved with the diagram as `placements[].labelPosition` in the scene format.
- **Hide labels.** A toolbar button and `Alt+L` hide and show the nodes' labels for the session, in every editor mode; the `showLabels` prop sets the start and `useReticulyne().setLabelsVisible()` drives it from code. Display only, never saved; hidden labels are left out of exports.
- **Demos.** `demos/` records the editor being used, as a person would, into the GIFs in `docs/demos`: drawing a small office network, that network as a live status board, and an NMEA 2000 network on a boat (`npm run demos:record`, `npm run demos:encode`). Each build demo asserts the scene it ends with.
- **"Office network, live" example** in the examples picker: the office network driven as a status board through `Connector.update`, `Connector.pulse`, `nodeIndicatorComponent` and `connectorIndicatorComponent`, with a fibre outage, a 4G failover and a mains failure carried by the UPS.
- **Icons carry a flat drawing.** An icon may have `flatUrl`, its flat (2D) drawing, beside `url`; the flat view draws it, and falls back to `url`. It is in the model, the scene format and the JSON Schema. A diagram saved before this takes the flat drawing of the library icon with the same id.
- **Icon packs** ([docs/icon-packs.md](docs/icon-packs.md)): `IconPack { id, name, version?, icons }`, with `validateIconPack`, `iconPackSchema`, `packIcons`, `flattenPacks` and `fillFlatUrls`. The device drawings ship as `BUILTIN_PACK`, each with an isometric and a flat view.
- **Pack icons can carry their connection detail.** A pack icon may list its device's `ports` (on the catalogue's media), with a palette `family`, `description` and `props`; `validateIconPack` checks them against the catalogue's rules. `packCatalogueItems(pack)` turns them into catalogue items and the new `catalogueItems` prop adds those to the palette, so a third-party pack brings its devices ready to connect. The icon a diagram stores is still the plain icon record.
- **Satellite communications:** a `satellite` medium, and catalogue items with drawings for a Satellite Dish, Satellite Terminal (flat panel), Satellite (in orbit, for the link up and back), Marine Satellite Dome, Satellite Hotspot (portable and desktop) and Marine Data Hub, plus an Outboard Motor item. 329 drawings.
- `SCENE_FORMAT`, `SCENE_VERSION`, `SCENE_SCHEMA_URL` and `redactScene` are exported.
- The keymap specification is in this repository: [docs/keymap.md](docs/keymap.md).

### Changed

- **The keymap is Reticulyne's alone**, aligned with Excalidraw's so a user can move between the two in either direction. `keymapFor()` takes no tool; the other tool's bindings, walk keys and differences are gone, `SHARED_BINDINGS` is `EXCALIDRAW_BINDINGS`, and `DIFFERENCES` is one list.
- **The Docker editor keeps diagrams in IndexedDB**, not localStorage, with room for far more than 5 MB. Diagrams an older version kept in localStorage are copied across the first time, and left in place. A save is reported once it is on disk. Icon packs installed in the browser are kept beside them and added to the library at start-up (installing from the editor is planned). Where IndexedDB cannot be used, diagrams stay in localStorage.

### Fixed

- In the flat view, an icon with no image drew an `<img src="">`; it now draws nothing, as the isometric view does.
- **The flat view is the same diagram as the isometric one in every respect but the drawing.** The other floors are now drawn faintly in the flat view too, in the flat projection, where before they were left out; and the diamond and square connector glyphs, drawn pre-skewed for the isometric view, no longer swap shapes in the flat one.

## [0.7.0] - 2026-10-11

### Changed

- **Scene format version 2.** The vendored Accurona core moves to scene version 2, which adds mounting (`mountFrom`: floor, ceiling or another item, with `mountOn`) and facing (`mirror.z`) to plan placements. Reticulyne does not draw a plan, so it keeps those fields as they were opened; a version 1 file opens as before and is saved as version 2. A file from a newer scene version is refused rather than misread.

### Added

- **Four sample diagrams** in `samples/`: an office network, a three-tier web app, an AWS serverless API and a two-floor building, saved as scene files with their icons embedded. They are in the repository, not the npm package.

### Fixed

- **A device placed from the floor plan keeps its connections.** A connection between it and an item already in the diagram was dropped on the next save, because it had never been loaded into the diagram; only connections whose ends were both in a diagram when the scene was opened are Reticulyne's to drop.

## [0.6.1] - 2026-10-01

0.6.0 was tagged but never published: its release stopped at the changelog check. 0.6.1 carries everything listed for it, plus the fixes below.

### Added

- **The catalogue in the icon library.** A Catalogue section lists Reticulyne's connectable devices by medium family; search covers every item. A placed item becomes an object with its ports, its catalogue link and its Accurona element, so it is the same object on a floor plan. An item with an Accurona twin draws with the twin's drawing when the host supplies the Accurona icons; an item with no twin draws with its 2D schematic symbol, which the diagram then carries as an icon.
- **Twins for the connectable comms, security and safety elements**: outlets, a fibre cabinet, a siren, gates, suppression, an ultrawide camera, a KVM, a floor UPS, an ATS, a generator, CRAC and in-row cooling, and DALI exit and emergency fittings.
- **Connections between ports.** A connector between two items that have ports draws a connection on a medium they share (`kind`), on named ports (`fromPort`, `toPort`), chosen with room left and, when it closes a loop, on that loop's return. The inspector edits both ends' ports. Topology rules are checked and shown under **Topology** as warnings, never refusals: port capacity, a bus that is not a tree or lacks its terminators, end-of-line device or bus power, a fire loop that does not return to its panel, and wireless association.
- **Props and ports as tables in the inspector.** An object's props are shown and edited by type (text, number, yes/no): add, rename, remove, up to 50. Its ports are listed with id, name and medium, each with its own props. A taken key or port id says so, and a full table says why it has no add row.
- **Esc cancels a drag** in progress (nodes, rectangles, text boxes, connectors, a multi-selection) and puts back what it moved.
- **`legacyConnections` prop: connections from a legacy model's connectors.** Opt-in. When a legacy Reticulyne model is opened (`initialData`, `loadModel` or Open), each pair of items a connector joins gets one logical connection, drawn by every connector between them and reusing one the model already has. `legacyModelToScene(model, id, { connections: true })` does the same for hosts converting stored models. Off by default, since two connectors between the same pair are not necessarily two cables.
- **`applyPatch` colour changes fade in.** A connector, rectangle or group colour set by a patch transitions over about 200 ms instead of jumping, so a live feed reads as a change rather than a flicker. It is CSS, so it costs no extra renders, and it is off under `prefers-reduced-motion`. Colours the user picks, undo and selection outlines still change at once.
- **The Docker image is cross-origin isolated.** It sends `Cross-Origin-Embedder-Policy: require-corp` beside the existing COOP and CORP headers (SEC-09). The page loads nothing from another origin, so nothing is blocked; a fork that adds a web font CDN needs `crossorigin` on its `<link>`.

### Fixed

- **Read-only mode looks, and stays, read-only.** In `EXPLORABLE_READONLY`, pressing `V` for the select tool and dragging moved nodes and marked the diagram unsaved; a drag there now does nothing. The hover tile no longer follows the pointer, and the cursor is the default arrow at rest (a grabbing hand only while panning) instead of the hand tool's open hand.
- **A collapsed group's name sits in the middle of its box.** Under the box, a connector docked at the bottom corner ran through it.
- **Accessible plain text decodes `&amp;` last**, so an escaped entity (`&amp;lt;`) reads as the literal `&lt;` rather than `<`.
- **The vector SVG note in the embedding docs** says, as the dialog does, that labels as well as text boxes are left out.

## [0.5.0] - 2026-10-01

### Changed (breaking)

- **The canvas is a tab stop.** It is focusable (`tabIndex=0`) in every editor mode but `NON_INTERACTIVE`, adding one stop to the host page's tab order; before, it was focusable only with `enableGlobalKeyboardShortcuts={false}`. `Tab` pressed on the canvas now moves between its objects before focus moves on.

- **React 19 is required.** The `react` and `react-dom` peers are now `>=19`: the PNG and SVG export dialogs keep their export state with `useActionState`, which React 18 does not have. The PNG dialog's actions run in order, so a render still in flight when an option changes can no longer land after it.

### Added

- **Keyboard navigation and screen-reader support.** With the canvas focused, `Tab` / `Shift + Tab` select the next / previous object in reading order (read-only too), the view following the selection; past the last object focus leaves the canvas, so it is never a keyboard trap. `Ctrl/Cmd` + arrow keys pan. `Shift + F10` or the Menu key opens the selected object's menu, which gains **Connect to…**: choose the other end of a new connector by name, the keyboard's way to draw one (also `A` then `Enter` with a node selected). An icon picked from the icon library or the add-item picker with the keyboard goes on the free tile nearest the middle of the view, and `Enter` with the rectangle tool draws a rectangle there. A polite live region reads out each selection (name, icon, description, connections, position in the Tab order) and the result of keyboard additions, and a visually hidden **Diagram outline** beside the canvas lists every node with its description and connections, and every text box, for browsing with a screen reader. See [Keyboard and screen-reader access](docs/embedding.md#keyboard-and-screen-reader-access).
- **Presentation / tour mode.** A new `tour` prop takes steps (`{ nodeId, viewId?, zoom?, title?, narration? }`) and shows a **Start tour** button; the tour centres on each node in turn, switching floors when a step says so, highlights it, and shows a narration panel with Previous, Next and End. The arrow keys, `Page Up` / `Page Down` and `Home` / `End` step it and `Escape` ends it. `useReticulyne()` gains `startTour(steps?)` (with no steps anywhere it walks every node on the view in reading order), `nextTourStep()`, `previousTourStep()`, `goToTourStep(index)`, `endTour()` and `getTourState()`, and `onTourStepChange` reports each step. Narration is rich text rendered through the description viewer. The `TourStep` and `TourState` types and `tourStepSchema` / `tourSchema` are exported.
- **Tidier connector routes.** Auto-routed connectors turn less: across 2,000 random routes, 38% fewer turns and slightly shorter overall. A route carries straight on out of the node edge it leaves by and through a manual waypoint, and arrives square to the edge it enters by. Ties are broken the same way every time, so connectors whose ends are offset alike take the same shape and run side by side instead of crossing. The previous router still runs alongside it, and a new route is used only when it is no longer and turns no more often, so no connector routes worse than before. Manual waypoints are kept as they are.
- **Collapse and expand groups.** A selected group's panel has **Collapse**, which draws the group as one box, labelled with its name and member count, in place of its members; **Expand**, or a double-click on the box, draws them again. Connectors from outside dock on the box, and those between the group's own members are hidden while it is collapsed. Clicking the box selects the group, so it drags, copies and deletes as one. The group's `collapsed` flag is saved to the model and the scene format, is one undo step, and can be set by a host with `applyPatch({ groups: { [id]: { collapsed } } })`.
- **Connectors snap to the edge you drew from.** Pressing or releasing on one of a node's four ports now fixes that end to that edge: the route leaves (or arrives) through it instead of finding its own way out of the node's centre. The side is saved on the anchor (`ref.side`: `'+X' | '-X' | '+Y' | '-Y'`, the grid direction the edge faces, so the same edge in the iso and flat views) and in the scene format; ends drawn on a node's body, and every existing diagram, keep docking on the centre.
- **Crossover with the floor plan.** A device on an Axonometra floor plan and its node in a diagram are one scene object, linked by its id. The object palette lists, under "On the floor plan", the devices on the plan that no diagram has yet; placing one keeps its id, so it is the same object drawn twice, and draws with its element's catalogue twin (when the host supplies the Accurona icons). The node inspector says where a node is on the plan (floor, plan, position), and each floor tab says which plan floors its nodes are on. A diagram floor is mapped to the building by where its devices are, not by a stored field.
- **`useReticulyne().loadModel()` returns a promise.** It resolves `true` once the new diagram has rendered (at once if that diagram is already open), and `false` when the load is refused: outside `EDITABLE`, or invalid. It never rejects, so it can be awaited, or read with React's `use()` under `<Suspense>`, instead of watching the editor for the load.
- **A flat 2D (Visio-style) view alongside the isometric one.** A view's `kind` is `'iso'` (the default) or `'schematic'`, as in the scene format, and buttons beside the zoom controls switch the current view between them, keeping the tile at the centre of the canvas in place. Both draw the same tiles, so nodes, connectors, rectangles, text boxes and groups keep their places. The flat view draws a square grid, and a node with an Accurona twin as that element's 2D schematic symbol (`schematicIconUrl`). A view switched in the editor saves as its new kind.
- **Diagram layers, and a Redacted layer left out of exports.** Nodes, connectors, rectangles and text boxes take a `layerId`, and the model a `layers` list (`{ id, name, visible? }`), read from and saved to the scene format's `layers` and `layer`. A Layers button beside the zoom controls adds, renames, deletes and shows or hides layers; the inspector's Layer field moves an item or a selection. A hidden layer's items are not drawn, selected or exported. The reserved `redacted` layer is shown in the editor and left out of PNG, PDF, SVG and JSON exports unless the export ticks "Include redacted content"; a diagram with nothing on it exports as before. `useReticulyne()` gains `getLayers()` and `setLayerVisible(id, visible)`.
- **Floors.** A floor is a view, and the views are in floor order, lowest first. The title bar's view name is now a floor switcher: a tab per floor, and `Alt` + `Up` / `Down` show the floor above or below, in every editor mode but `NON_INTERACTIVE`. An editable diagram adds a floor (drawn like the current one), renames one (double-click its tab) and moves or deletes one from the floor menu; each is one undo step. A read-only diagram with one view still shows just its name.
- **Cross-floor connections, drawn as transition stubs.** The model gains `connections` (`{ id, from, to, description? }`), the scene format's `connections` between two of the diagram's items. A connection whose items are on different floors is drawn on each floor as a riser from the item, up or down towards the other floor, ending at a marker that names that floor and item; clicking the marker shows that floor with the item selected. The node inspector's **Links to other floors** lists, adds and removes them. On save, a connection's ports, kind, props and links are kept while its ends are unchanged; connections to objects Reticulyne does not show are kept as before. An export leaves out a connection to anything it leaves out.
- **Lock, as in Excalidraw.** `Ctrl/Cmd` + `Shift` + `L` locks the selection (or unlocks it, when all of it is locked), and the right-click menu of a node, connector, rectangle or text box has **Lock**. A locked item is drawn as usual but cannot be selected on the canvas: a click passes over it to whatever is below, and the marquee and `Ctrl/Cmd` + `A` skip it, so it cannot be moved, edited or deleted by accident. Locking deselects. Right-clicking a locked item offers **Unlock**, and right-clicking the empty canvas offers **Unlock all** when anything is locked. Nodes, connectors, rectangles and text boxes take a `locked` flag, saved to the scene format's `locked`; each lock or unlock is one undo step.
- **The other floors, dimmed.** While an isometric floor is on show, the other isometric floors are drawn faintly above and below it, a storey apart, so the building reads as a stack. They cannot be clicked, are never exported, and the eye button in the floor switcher hides them.

### Fixed

- An invalid `loadModel()` payload is reported to `onValidationError`, as documented. It only reached the console.
- The `UPDATE_VIEW` reducer changed nothing: it reassigned the lookup's `value` instead of the view in the draft.

## [0.4.0] - 2026-09-30

### Changed (breaking)

- **The package is `@reticulyne/editor`, on the public npm registry**, installed with no token. It was `@qant-au/reticulyne` on GitHub Packages up to 0.3.0: change the dependency and the imports.
- **An ES module build** (`dist/esm/`, the `import` condition) beside the CommonJS one. In an ESM bundler such as Vite, `import Reticulyne from` the CommonJS build gave the whole module object, not the component.
- **The file format is now the [Accurona scene format](https://github.com/qant-au/accurona/blob/main/docs/scene-format.md)**, shared with Axonometra: one JSON document of objects and the views that place them. Reticulyne draws its `iso` and `schematic` views and, on save, merges the edited diagram into the scene it opened, so plan views, unplaced objects, connections, object `props` / `ports` / `links`, layers and a connector's `connection` are kept.
  - `onSave` receives a validated `Scene`, not a `Model` (the Save entry, Retry and auto-save).
  - **Export as JSON** downloads a scene file (same file names).
  - The Docker editor stores diagrams in `localStorage` as scenes; diagrams stored as models by older versions still open.
  - Reticulyne models are **read, never written**: `initialData`, `useReticulyne().loadModel` and Open accept a scene or a legacy model, which is converted to a scene (one `iso` view per Reticulyne view; ids outside the scene id rule are remapped and colours normalised to `#rrggbb`). There is no way to save a model.
  - Open parses files with a reviver that drops `__proto__`, `constructor` and `prototype` keys.
  - `onModelUpdated` is unchanged: a live-state notification with the `Model`, not a save. Persist with `onSave` or `getScene()`.

### Changed

- The theme, toolbar buttons, main menu, context menu, properties panels and dialogs now come from [Accurona](https://github.com/qant-au/accurona)'s shared UI (`@accurona/ui`, vendored into `src/vendor/accurona-ui/` by `scripts/sync-accurona.mjs`), the same components Axonometra uses, so the two tools look and behave alike. The main menu is no longer modal: a click outside closes it and still reaches the canvas. Every dialog has a titled header with a Close button.

### Removed

- **Publishing to GitHub Packages.** Releases no longer publish the package, and the
  repository no longer carries a registry `.npmrc`. Versions already published there are
  left in place. Install from the public npm registry instead
  ([Installation](docs/installation.md)).

### Removed (breaking)

- **`useReticulyne().Model` and `.uiState`**. The raw
  zustand escape hatches are gone. Write through `applyPatch`, `setTitle` or
  `loadModel`; read through `getModel`, `getNode`, `getViewport` and
  `getSelection`; drive the view and selection with the methods below.

### Added

- `useReticulyne().getScene()` returns the diagram as a scene. `loadModel(data, { fitToView?, view? })` takes view hints for a scene.
- The package exports the `Scene` and `SceneResult` types, `validateScene`, `parseScene` and `serializeScene` (from `@accurona/core`, vendored into `src/vendor/accurona-core/`), and `legacyModelToScene`.
- **Groups**. `Ctrl/Cmd+G` groups the selection and
  `Ctrl/Cmd+Shift+G` ungroups it. A click selects the whole group, dragging
  moves it as one, and double-click works inside it. Groups can be named,
  coloured and nested. Schema: `groups` on a view, and `parentGroupId` on view
  items, rectangles, text boxes and groups. Additive: existing diagrams load
  unchanged.
- **Docker editor: install and offline** (APP-02). A web app manifest,
  icons and a service worker: the editor installs as an app and opens
  offline after one visit.
- **Docker editor: saved diagrams** (APP-01). A Diagrams menu creates,
  imports, switches and deletes diagrams kept in the browser's localStorage;
  Save and auto-save (every 5 s once named) use the editor's save support.
- **Starter templates**. **New from template** in the main
  menu (`ACTION.NEW_FROM_TEMPLATE`, on by default) opens a picker with
  previews; `templates` replaces the bundled five.

- **Upload icons**. `onIconUpload` adds an Upload
  button to the icon picker; uploads join a **My icons** collection saved in
  the diagram. `readIconAsDataUrl` embeds the file with no server, and the
  Docker editor uses it.
- **Live updates that keep UI state**. `useReticulyne().applyPatch`
  changes nodes, connectors, rectangles and text boxes by id without touching
  the selection, zoom or pan; waits out a drag or draw in progress; skips ids
  that no longer exist; stays off the undo stack unless `pushToUndo`.
  `updateNode` and `setConnectorRate` are shorthands for it.
- **Typed imperative API**. `getNode`, `getViewport`,
  `getSelection`, `focusNode`, `fitToView`, `select`, `clearSelection`,
  and the events `onNodeClick`, `onConnectorClick`, `onSelectionChange`
  and `onViewportChange`. `setZoom` now clamps to the editor range.

- **Icon library panel**. A toolbar toggle opens the icon
  picker as a persistent right-hand panel; drag icons straight onto tiles.

- **Find**. `Ctrl/Cmd+F` opens a find bar; matches (by name,
  then description, then icon name) are outlined on the canvas, and
  `Enter` / `Shift+Enter` select each one and bring it to the centre.
- **Mini-map**. An overview bottom-right with the visible area
  outlined; click or drag to move the view. `showMiniMap` prop; shown by
  default only when editable.
- **Alignment guides**. While dragging, a line to the nearest
  item on the same tile line. `showAlignmentGuides` prop, default on.

- **Align and distribute**. Align X / Y and Distribute X / Y
  for a multi-selection, along the tile axes, one undo step; a move that
  would stack two nodes is disabled.
- **Hover tooltip**. A node's name and description snippet
  after a short rest, in any editor mode.

- **Excalidraw parity** (UXA-02, -03, -05, -08). Hold `Space` and drag to pan
  from any tool; `Alt`+drag drags a copy; `Alt+Shift+D` flips light / dark
  for the session; the `?` dialog lists the pointer gestures and says what
  Excalidraw has that this editor leaves out on purpose.
- **Pinch to zoom** on touch screens. The renderer sets
  `touch-action: none` so the browser no longer takes the gesture.

- **Multi-item clipboard.** `Ctrl/Cmd+C`, `X` and `V` act on the whole
  selection; a paste keeps the items' spacing, is one undo step, and selects
  the pasted group. Connectors are still not copied. Duplicate stays
  single-item.
- **Bulk colour.** The multi-select panel gains a Colour row that recolours
  every connector and rectangle in the selection in one undo step.

- **Drag from a port to connect**. With the ordinary cursor, a
  node shows its ports on hover; dragging from one to another node draws a
  connector, and releasing elsewhere cancels. Dragging from a node's centre
  still moves it. Ports shrink their capture area when zoomed out so they
  never swallow the whole node.

- **Save status and dirty state**. With `onSave` supplied, the
  title bar shows Unsaved changes / Saving… / Saved / Save failed with Retry,
  and the browser asks before closing a tab with unsaved changes. `onSave` may
  now return a Promise. New `autoSaveDebounce` prop, off by default.

- **Double-click to add**. Double-clicking an empty tile opens
  the icon picker for that tile, and picking an icon places it there at once.
  Double-clicking an item opens its inspector. `EDITABLE` only.
- **Connector hotspots**. In connector mode, the node under the
  pointer shows a port on each tile edge, so it is clear where a connector will
  attach.

- **Diagram title**. A "Rename diagram" main-menu action
  (`'ACTION.RENAME'`, on by default), `useReticulyne().getTitle()` /
  `setTitle()`, and a JSON export named after the title. `title` is now
  optional in `initialData` and `loadModel()`; a model without one is
  `'Untitled'`.

- **Layer ordering for connectors and text boxes, not just rectangles**.
  Front / Forward / Backward / Back buttons in each inspector
  and in the multi-select panel, the right-click menu on connectors and text
  boxes, and Excalidraw's hotkeys: `Ctrl/Cmd+]` / `[`, with `Shift` for
  to-front / to-back (UXA-06). A multi-selection moves as one block in one
  undo step; previously the multi-select panel moved rectangles one at a
  time, which reversed their relative order and cost one undo per item.
  Nodes keep their isometric depth order and are never moved.

- **`useReticulyne().setView(viewId)`** shows another view (floor) of the
  model. The editor has no view switcher of its own, so this is how a host
  offers one. Allowed in every editor mode; clears the selection; warns and
  does nothing for an unknown id (FEA-06).
- **Option maps as runtime values.** `EditorModeEnum`, `MainMenuOptionsEnum`,
  `ProjectionOrientationEnum`, `AnchorPositionOptions`, `DialogTypeEnum`,
  `LayerOrderingActionOptions`, `tileOriginOptions` and
  `ItemReferenceTypeOptions` are exported from the main entry and the
  `/standalone` subpath (FEA-05).

### Changed

- Colour swatches have accessible names ("Colour #dd3333") and
  `aria-pressed`, and the active swatch is shown enlarged; its styling was
  never applied before.
- The right-click menu no longer opens in read-only editor modes; every
  entry in it edits the diagram.
- `file-saver` is gone from the runtime dependencies. Downloads go through
  an inline blob-URL helper; the file names and contents are unchanged
  (DEP-01).
- The standalone Docker image sends `Referrer-Policy:
  strict-origin-when-cross-origin` and `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Resource-Policy: same-origin` (SEC-08, SEC-09).

### Fixed

- Drawing a connector or rectangle no longer throws when the diagram lists no colours.
- The published type declarations resolve the vendored Accurona types (they imported a path missing from `dist`).
- **Clicking the exact centre of a node could do nothing.** The dotted line
  from a node up to its label took the press.
- **Docker images kept returning users on an old build.** Their bundles were
  named `main.js` while nginx served `.js` as immutable for a year; bundle
  names now carry a content hash.
- **Connectors to nodes inside a rectangle were invisible.** Rectangles were
  routing obstacles, so a node inside one had no route out. A rectangle that
  holds either end is no longer an obstacle, and an unroutable connector now
  takes the direct route instead of drawing nothing.

- The first click on an item after using the main menu (for example after
  Export as JSON) could do nothing: the closing menu still covered the page.
  And every pointer handler ran one event behind, so pan lagged the pointer
  and a click straight after a jump was tested against the old position.
- `docs/embedding.md` no longer recommends calling `setEditorMode('EDITABLE')`
  and `loadModel()` in the same tick; `loadModel` refuses that (DOC-03).

## [0.3.0] - 2026-09-27

### Added — real multi-select

Selection is no longer one item at a time.

- **`Shift`+click** adds an item to the selection, or removes it if already in.
- **Marquee drag** on empty canvas selects everything the band touches;
  `Shift`+drag unions with the existing selection. Intersection, not
  containment — a band crossing a large rectangle catches it.
- **`Ctrl/Cmd+A`** selects every item, text box, connector and rectangle on
  the view. Connector anchors are excluded; they are sub-parts, selected only
  by dragging one directly.
- **Delete, nudge and drag** apply to the whole selection. A dragged or nudged
  group keeps its internal spacing.
- **Multi-edit inspector panel** when more than one item is selected: type
  breakdown, Delete, and layer order. Layer order acts on **rectangles only**
  — the reducer still throws for other kinds — and the panel
  says so when the selection is mixed.
- **`Shift+2`** fits the viewport to the selection (`Shift+1` / `F` still fit
  the whole diagram).

The selection lives in a new `selection: ItemReference[]` slice on the UI
store. `itemControls` is unchanged in shape and remains the single inspector
target; the store writes the two together so they cannot drift. Existing
consumers of `itemControls` needed no changes.

`Ctrl/Cmd+C`, `Ctrl/Cmd+X` and `Ctrl/Cmd+D` deliberately stay **single-item**,
acting on the most recently selected item: the clipboard slice holds one entry
by construction. The `?` dialog labels them "active item" rather than implying
they cover the selection.

### Changed — tool hotkeys realigned onto Excalidraw's (UXA-01)

**Breaking for anyone with the old keys in muscle memory or in their own
docs.** An operator moving between an Excalidraw canvas and this one should
not be retrained, so the tool layer now matches Excalidraw's, letter and
number alike.

| Action | Was | Now |
|---|---|---|
| Connector | `C` | `A`, `C`, `5` |
| Add item | `A` | `I`, `9` |
| Select | `V`, `S` | `V`, `S`, `1` |
| Rectangle | `R` | `R`, `2` |
| Text | `T` | `T`, `8` |
| Reset zoom | bare `0` or `1` | `Ctrl/Cmd+0` |
| Fit to view | `F` | `F`, `Shift+1` |
| Toggle item highlighting | `I` | `Alt+I` |

Bare `0` and `1` are no longer zoom keys — they belong to Excalidraw's tool
row, and that collision was the single worst source of friction. `Ctrl/Cmd+=`
and `Ctrl/Cmd+-` join the existing bare `=` / `-` as zoom aliases.
`Ctrl/Cmd+X` (cut) is new (UXA-04).

Excalidraw's `D` / `O` / `L` / `P` / `E` (diamond, ellipse, line, freedraw,
eraser) stay unbound: free-form vector tools with no meaning on a tile-based
isometric grid.

### Fixed — dragging, panning and rectangle-drawing were silently dead

`getMouse` switched on the legacy `mousedown` / `mousemove` event names, but
the editor migrated to the Pointer Events API in FEA10-01 and dispatches
`pointerdown` / `pointermove` / `pointerup`. Every event fell through to the
`default` branch, so `mouse.mousedown` was pinned at `null` and every code
path guarding on it did nothing: `DragItems`, `Pan`, `DrawRectangle` — and,
once written, the new marquee. Found while building 1.4, which cannot work
without it. No test covered it because none dispatched real pointer events at
`getMouse`; `src/utils/__tests__/coordinates.pointer.test.ts` now does.

### Security

- **TipTap 3.31.3 (DEP-10).** Clears GHSA-cp6q-959q-f8rh (`mergeAttributes()`
  turns an own `__proto__` key into executable DOM attributes) and
  GHSA-j95f-988m-3j2f (Markdown attribute ReDoS). Every `@tiptap/*` range is
  now `^3.31.3`; the family pins `@tiptap/core` exactly, so it moves as one.
- **dompurify `^3.4.16` (DEP-09).** Clears GHSA-55q2-fjhq-7xh7 on the copy
  `jspdf` pulls in for PNG/PDF export.
- **Dev toolchain (DEP-11).** 17 transitive dev-only advisories cleared;
  `npm audit` reports 0 with and without `--omit=dev`. See SECURITY.md.

## [0.2.0] - 2026-07-06

### Changed — rich-text editor moved from Quill to TipTap

The node-description editor now runs on TipTap v3 instead of
`react-quill-new` / `quill` (DEP-04 follow-up). `quill` leaves the dependency
tree, closing the GHSA-v3m3-f69x-jf25 XSS advisory, and the ProseMirror schema
sanitises descriptions on both parse-in and serialize-out. The public props
API and the stored HTML format are unchanged.

### Fixed

- A production-only crash when mounting the editable description editor
  (DEP-05-09), with an e2e regression guard.
- MUI v9 `.mjs` modules failed webpack's `fullySpecified` resolution, which
  broke the dev and Docker bundling builds (BLD-09).

### Security

- `dompurify` overridden to `^3.4.11` and `http-proxy-middleware` to
  `^2.0.10` (DEP-06).

## [0.1.2] - 2026-06-17

Re-cut of 0.1.1 with fixed publish authentication. No code changes.

## [0.1.1] - 2026-06-17

### Security

- `js-yaml` security fix (GHSA-h67p-54hq-rp68).
- **Icon URL scheme allowlist (SEC-01).** `iconSchema.url` now rejects schemes
  other than `http(s):`, `blob:`, relative paths, and image-only `data:` URIs
  (`png`/`jpeg`/`gif`/`webp`/`svg+xml`). Models carrying `javascript:`, `file:`,
  or non-image `data:` icon URLs that previously validated will now fail schema
  validation (routed to `onValidationError`). SVG icons inlined during SVG export
  are additionally stripped of `<script>`, `<foreignObject>`, and `on*` handlers.
  This is a 0.x-permitted breaking change (see the versioning policy above).

## [0.1.0] - 2026-06-09

The renamed identity. This is **a naming reset, not a content reset** — the
codebase that shipped through `@qant-au/isoflow` v1.x–v4.7.0 continues here as
Reticulyne v0.1.0. The technical lineage is unbroken; the semantic-version
line restarts because the package name did.

### Renamed

- **Package**: `@qant-au/isoflow` → `@qant-au/reticulyne` (GitHub Packages).
- **Component**: `Isoflow` → `Reticulyne` (named + default export). Public
  imports change: `import Reticulyne from '@qant-au/reticulyne'`.
- **Hook**: `useIsoflow` → `useReticulyne` — same return shape and semantics.
  This is a clean rename with **no back-compat alias**: `useIsoflow` is not
  re-exported, so every call site raises a TypeScript error until you rename the
  import. Update `import { useIsoflow }` → `import { useReticulyne }`.
- **Props interface**: `IsoflowProps` → `ReticulyneProps`. Same fields.
- **Error boundary**: `IsoflowErrorBoundary` → `ReticulyneErrorBoundary`
  (file + directory + class rename).
- **Browser globals**: `window.Isoflow` → `window.Reticulyne` (the Docker SPA's
  imperative helper); `window.__ISOFLOW_E2E__` → `window.__RETICULYNE_E2E__`
  (Playwright harness only).
- **Docker containers**: `isoflow` / `isoflow-examples` → `reticulyne` /
  `reticulyne-examples`. Host ports (2222 / 2223) unchanged.
- **CSP `img-src`**: removed `https://isoflow.io` and
  `https://static.isoflow.io` from `docker/nginx.conf`. The two demo
  fixtures that previously referenced those URLs are now inline
  `data:image/svg+xml` SVGs. Embedders shipping icon collections that
  reference those external origins must self-host or migrate to
  `data:`/`blob:` URIs in their `iconCollections` payload.

### Reset

- **Version**: `4.7.0` (under prior name) → `0.1.0` (under new name).
  The v4 modernisation arc is preserved in the README's "Pre-rename
  development history" section and remains queryable in `git log`.

### Preserved

- **Fork attribution**: Mark Mankarious's MIT copyright stays in `LICENSE`;
  the README's "Succession from Isoflow" section retains the upstream link.
- **`src/vendor/isopacks/isoflow.js`**: the vendored upstream icon pack
  (parallel to AWS / Azure / GCP / Kubernetes) keeps its name and pack-ID
  so existing diagrams that reference `iconCollection: 'isoflow'` continue
  to render.

### Notes

Rationale for the rename and the framing as **succession, not forking** lives
in the README's "Succession from Isoflow" section. The commit-level audit
trail is `git log --grep '^[a-z]*(RNM-' main` — the full chain runs
`RNM-01` through `RNM-09`, one commit per task ID, no rewrites or amends.
The package is published to GitHub Packages
(`registry: https://npm.pkg.github.com/`).

**Note on deprecation of the prior name.** GitHub Packages' npm registry
does not currently support `npm deprecate` — the `PUT` to update the
packument returns `400 Bad Request: version.ID cannot be empty`. Consumers
still installing `@qant-au/isoflow` are redirected via the package's
`repository.url` (which now points at `qant-au/reticulyne`) and via this
release's GitHub Releases entry. A registry-level deprecation marker will
be revisited if GitHub Packages adds support, or if the package migrates
to the public npm registry.

## Pre-rename history

This project shipped as `@qant-au/isoflow` from v1.0.0 through v4.7.0. The v4
modernisation arc (test surface, security hardening, dark-mode pass, SVG/PDF
export, per-rectangle styling, 8-directional routing, embedding isolation) is in
`git log`; the README section that once summarised it has since been removed.
The pre-rename git tags (`v4.0.0` to `v4.6.0`) remain on this repository as
historical pointers.
