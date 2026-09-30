# Reticulyne

An open-source React component for drawing isometric network diagrams: software
architecture, infrastructure topologies, comms rooms, and any system best read on an
isometric grid. Embed it in your own application, or run it on its own as a
self-hosted editor.

**Project site:** [reticulyne.com](https://reticulyne.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Status

Pre-1.0 (currently v0.3). The public API is settling, and breaking changes are still
possible between minor versions; each one is recorded in [CHANGELOG.md](CHANGELOG.md).

## Features

- **Drag-and-drop editor.** Lay out icons, regions (rectangles) and connectors on an
  isometric grid.
- **Isometric or flat 2D, per view.** The same diagram drawn isometrically or as a
  flat, Visio-style schematic. The toolbar switches the current view between the two;
  nothing moves, because both draw the same tiles. The flat view draws catalogue items
  with their 2D symbols.
- **Floors.** A diagram's views are its floors, switched from the title bar or with
  `Alt` + `Up` / `Down`. The other floors are drawn faintly above and below the one on
  show, and a link between items on different floors is drawn on each as a stub that
  names the other floor and takes you there.
- **Bring your own icons.** Icon collections are plain `Icon[]` arrays
  ([isopacks](docs/isopacks.md)). The component ships no icons of its own; the
  standalone editor comes with AWS, Azure, GCP and Kubernetes collections plus the
  original Isoflow set.
- **Editor modes.** Fully editable, explore-only, or non-interactive, for editors,
  viewers and dashboards.
- **One file format, shared with Axonometra.** Diagrams open and save as the
  [Accurona scene format](https://github.com/qant-au/accurona/blob/main/docs/scene-format.md): one JSON document of objects and the views that
  place them. Reticulyne draws the isometric and schematic views, and keeps the floor
  plans, connections and object details it does not show when it saves. Files saved by
  older versions (Reticulyne models) still open, and are saved as scenes.
- **Export.** JSON (the scene file), PNG, PDF and SVG (a flat vector SVG for Illustrator,
  Inkscape and Figma, or a full-fidelity browser SVG). Every export runs in the browser;
  nothing is sent anywhere.
- **8-directional connector routing.** Connectors route along the grid and its 45°
  diagonals, giving shorter, less cluttered paths.
- **Selection dimming.** When one item is selected everything else fades, and a host
  can set the focus itself.
- **Live dashboards** (opt-in). Animate connectors, fire signal pulses and decorate
  nodes with your own gauges, driven from a poller or websocket. See
  [Live dashboards](docs/embedding.md#live-dashboards).

## Getting started

```bash
npm install @reticulyne/editor react react-dom \
  @mui/material @mui/icons-material @emotion/react @emotion/styled zustand
```

```tsx
import Reticulyne from '@reticulyne/editor';

export function Diagram() {
  return (
    <div style={{ width: '100%', height: 600 }}>
      <Reticulyne />
    </div>
  );
}
```

It is on npm as [`@reticulyne/editor`](https://www.npmjs.com/package/@reticulyne/editor), with
no token needed; see [Installation](docs/installation.md). To run the editor on its own
instead, see [Standalone Docker](docs/docker.md).

**Requirements:** React 18 or 19, MUI v9, Emotion and Zustand as peer dependencies.
Supported browsers follow MUI v9: Chrome 117+, Edge 121+, Firefox 121+, Safari 17+.

## Documentation

- [Quick start](docs/quickstart.md) - a minimal embed, container sizing, Next.js notes
- [API reference](docs/api.md) - every prop, plus the `useReticulyne()` imperative hook
- [Embedding contract](docs/embedding.md) - modes, host-managed save, callbacks, the security model
- [Isopacks](docs/isopacks.md) - icon collections, bundled and your own
- [Standalone Docker](docs/docker.md) - run the editor as a self-hosted app

## Security

Node descriptions are rich text, and Reticulyne parses every description (typed, pasted
or passed in through `initialData`) through a schema that allows only bold, italic,
underline, strikethrough and safe links. Scripts, frames, event handlers and unsafe URLs
are dropped before anything renders. If you take descriptions out of Reticulyne and
render them somewhere else, sanitise them there as you would any user data. The full
model is in [Embedding: security model](docs/embedding.md#security-model).

To report a vulnerability, see [SECURITY.md](SECURITY.md). Please do not open a public
issue for security reports.

## A sibling project: Axonometra

Reticulyne has a sibling, [Axonometra](https://github.com/qant-au/axonometra), an
open-source floor planner with a 3D view. They are built to be used together:

- **Axonometra** lays out physical space at true scale: rooms, racks, cameras, access
  points and furniture.
- **Reticulyne** draws how those things connect.

Both draw their equipment from one shared element library, so a rack is the same rack,
at the same size and in the same colours, in a floor plan and in a network diagram.

## Contributing

Issues and pull requests are welcome.

- **Found a bug, or have an idea or a question?**
  [Open an issue](https://github.com/qant-au/reticulyne/issues/new/choose). For anything
  substantial, open the issue before writing code so we can agree on the scope.
- **Sending a pull request?** Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks
  and conventions.
- **Found a security problem?** Report it privately, as described in
  [SECURITY.md](SECURITY.md).

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Author

Created and maintained by **Adam Burgess** ([adamburgess.me](https://adamburgess.me)).
Adam is available for customer implementation work through
[QANT Pty Ltd](https://qant.au).

## Origins and license

Reticulyne started as a fork of [Isoflow](https://github.com/markmanx/isoflow) by Mark
Mankarious. Released under the [MIT License](LICENSE), which carries both copyright
notices.
