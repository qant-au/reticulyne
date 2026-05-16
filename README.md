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

## Installation

This package is published to **GitHub Packages**, not the public npm registry. Consumers need to point their package manager at the scoped registry and authenticate with a GitHub token.

1. Create a [personal access token](https://github.com/settings/tokens) (classic) with the `read:packages` scope. If you publish from CI, use the workflow's `GITHUB_TOKEN` instead.
2. Add the following to a `.npmrc` file in your project (or `~/.npmrc` globally):

   ```ini
   @qant-au:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

3. Export the token in your shell (`export GITHUB_TOKEN=ghp_...`) or set it as a CI secret. Do **not** commit the token to source.
4. Install:

   ```bash
   npm install @qant-au/isoflow
   ```

> **Note on icons:** Icon collections (AWS, Azure, GCP, Kubernetes, Isoflow) are now bundled directly in this package. The `@isoflow/isopacks` npm dependency is no longer required. If you were previously passing collections from `@isoflow/isopacks`, you can remove that dependency — or continue using it alongside your own custom collections, as the plugin system remains fully supported.

## Project maintainer

Contact information to follow.

## Found a bug or need support?

Please open an issue in this repository.

## License

MIT — see [LICENSE](./LICENSE).
