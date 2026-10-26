# Documentation

Reference material for embedding and running `@reticulyne/editor`. The README at the project root
covers the quick highlights; everything below is the depth.

## Getting started

- [Installation](installation.md) â install from npm, peer dependencies, migration notes.
- [Quick start](quickstart.md) â minimal embed example, container sizing, Next.js note.

## Core reference

- [API reference](api.md) â every prop on `<Reticulyne>`, plus the `useReticulyne()` imperative hook.
- [Embedding contract](embedding.md) â deeper notes on editor modes, container sizing, callback identity, security model, host-managed save, and side effects on import.
- [Icon packs](icon-packs.md) â the icon and pack shapes (an isometric and a flat drawing per icon), the built-in pack, and how to bring your own.
- [Catalogue](catalogue.md) - specification: items, ports as connector + medium + protocol, each medium's topology, virtual items, and the drawings items draw with.
- [Mermaid](mermaid.md): flowcharts in and out, with the shape table, links, subgraphs, the import layout, and every error and warning code.
- [Keyboard shortcuts](keymap.md) â the full keymap, and how it lines up with Excalidraw's.

## Deployment

- [Standalone Docker](docker.md) â run the editor as an nginx-served SPA on its own port (built-in `restart.sh` helper).

## Demos

- [Demos](../demos/README.md) â the recordings on the project README: how they are made, and how to re-record and encode them.

## Project

- [Contributing](../CONTRIBUTING.md) â how to report bugs, request features and send pull requests; dev setup and tests.
- [Security policy](../SECURITY.md) â reporting and the residual-advisory ledger.
