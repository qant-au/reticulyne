# Isoflow

A React component for drawing network diagrams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Fork note:** This is a maintained community fork of [isoflow](https://github.com/markmanx/isoflow) by Mark Mankarious, which is no longer actively maintained. Maintained by QANT Pty Ltd under the same MIT license.

## Key features

- **Drag-and-drop editor** — Express your architecture with icons, regions and connectors.
- **Bundled icon collections** — AWS, Azure, GCP, Kubernetes, and Isoflow icons are included out of the box. No separate icon package required.
- **Extensible icon system** — Bring your own icons by passing any collection that conforms to the `ProcessedCollection` interface. The plugin architecture is preserved and open for community use.
- **Export options** — Export diagrams as code or images.

## Requirements

- **React** 17, 18, or 19 (declared as a peer dependency) and a matching `react-dom`.
- **Node.js** 22 LTS for development against this repository (see `.nvmrc`). Consumers are not subject to this — the published package is browser-targeted.
- A bundler that can consume CommonJS or ESM (Webpack, Vite, Rollup, Parcel, esbuild, Next.js, etc.).
- Authentication to **GitHub Packages** in order to install — see *Installation* below.

## Quick start

```bash
npm install @qant-au/isoflow
```

This package is published to GitHub Packages, not the public npm registry. See **Installation** below for the `.npmrc` configuration consumers need.

> **Note on icons:** Icon collections (AWS, Azure, GCP, Kubernetes, Isoflow) are now bundled directly in this package. The `@isoflow/isopacks` npm dependency is no longer required. If you were previously passing collections from `@isoflow/isopacks`, you can remove that dependency — or continue using it alongside your own custom collections, as the plugin system remains fully supported.

## Project maintainer

Contact information to follow.

## Found a bug or need support?

Please open an issue in this repository.

## License

MIT — see [LICENSE](./LICENSE).
