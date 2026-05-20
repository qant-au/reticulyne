# Isoflow

A React component for drawing network diagrams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Fork note:** This is a maintained community fork of [isoflow](https://github.com/markmanx/isoflow) by Mark Mankarious, which is no longer actively maintained. Maintained by QANT Pty Ltd under the same MIT license.

> **Development status:** This project is currently under active development. We are working through a period of significant modernisation — upgrading dependencies, improving build tooling, hardening security, and expanding the feature set. Things may change rapidly between releases during this phase. We intend to stabilise the codebase and open the project up to normal community contribution once that foundational work is complete.

## v4.x development history

High-level overview of what landed during the v4 modernisation work (full detail in `git log` under the `SEC4`, `QUA4`, `BLD4`, `BUG4`, `DOC4`, `FEA4`, `FEA5`, `BUG5`, `SEC5`, and `QUA5` task-ID prefixes):

- **Security & supply-chain.** Embedder-side sanitisation contract documented in full ([Security](#security) section below and [docs/embedding.md](docs/embedding.md)). CI gated on `npm audit --omit=dev --audit-level=moderate`. nginx CSP trade-offs captured in [SECURITY.md](SECURITY.md).
- **Test surface.** Grew from 13 suites / 83 cases to **31 suites / 217 cases**. The hook layer, every interaction-mode handler, the connector coordinate system, the PDF export, and the schema bounds are now covered.
- **Refactors.** Split the 777-line `src/utils/renderer.ts` into seven concern-focused modules; consolidated three Zustand stores behind a `createContextualStore<T>` factory; reshaped `UiOverlay` into four focused children; extracted three hooks out of `MainMenu`.
- **Bug fixes.** Corrected the connector path coordinate system at source (removing a self-flagged `transform: scale(-1, 1)` CSS hack), fixed a `deleteModelItem` reducer that left sparse-array holes, and (5th-pass) closed scene-cache leaks in `deleteConnector` / `deleteTextBox`, a dead dedupe guard in `useInitialDataManager`, a stuck-drag after mouseup outside the renderer, render-time throws on sparse `colors` / dangling icon refs, silent JSON-import failures, an ignored runtime `iconCollections` prop change, a stray-icon-on-toolbar bug in `PlaceIcon`, a debounce-timer leak in the export-image dialog, an embedder wheel-scroll leak, and a `useResizeObserver` cleanup gap — BUG5-01..09, QUA5-01.
- **Security hardening (5th-pass).** Bounded tile coordinates in the schema to cap the pathfinder grid (SEC5-01) and added per-array + per-string caps across every input schema as defence-in-depth against host-side DoS via crafted `initialData` (SEC5-02).
- **New features.**
  - Title banners on every inspector panel ("Edit object" / "Edit line" / etc.) — FEA4-01.
  - Connector direction arrows with four states (start→end / end→start / both / none) — FEA4-02.
  - Branding polish — Discord link removed, GitHub link defaulted on, menu vocabulary tidied (`Export as Image` / `Clear`), v4.0.0 bump — FEA4-03.
  - Client-side **Export as PDF** via jsPDF — FEA4-04.
  - `showTitleBar` prop to override title-bar visibility — FEA5-01.
  - `iconCollections` allow/deny filter prop for bundled icon packs — FEA5-02.
  - `onSave` callback + `'ACTION.SAVE'` main-menu entry for host-managed save — FEA5-03 (v4.1.0).

The forward-looking FEA5 roadmap has now landed in full — see the `Controlling UI visibility` and `Host-managed save` sections in [docs/embedding.md](docs/embedding.md) for the contracts.

## Documentation

Reference material lives under [`docs/`](docs/README.md):

- [Installation](docs/installation.md) — install from GitHub Packages.
- [Quick start](docs/quickstart.md) — minimal embed example.
- [API reference](docs/api.md) — props and the `useIsoflow()` imperative hook.
- [Embedding contract](docs/embedding.md) — modes, sizing, callback identity, security model.
- [Isopacks](docs/isopacks.md) — icon collections.
- [Standalone Docker](docs/docker.md) — run the editor as a self-hosted SPA.
- [Contributing](docs/contributing.md) — dev setup, test surface, branch conventions (when contributions reopen).

## Key features

- **Drag-and-drop editor** — Express your architecture with icons, regions and connectors.
- **Extensible icon system** — Bring your own collections via the `ProcessedCollection` interface; see [docs/isopacks.md](docs/isopacks.md) for the contract. The standalone Docker container ships with the AWS, Azure, GCP, Kubernetes, and Isoflow icon collections pre-loaded.
- **Editor modes** — Editable, explorable-readonly, and non-interactive modes for embedding in viewers, dashboards, or full editors.
- **Export options** — Export diagrams as JSON, PNG, or PDF from the main menu. PDF generation is client-side via jsPDF (no network call).

## Requirements

- **React** 18 or 19 (peer dependency) and a matching `react-dom`.
- **MUI v9**, **Emotion**, and **Zustand** as peer dependencies (v3 onwards — see [Installation](#installation)). v1 bundled MUI/Emotion/Zustand internally; v2 externalised them as peer-deps at MUI v5; v3 bumps the peer-dep range to MUI v9.
- **Node.js** 22 LTS for development against this repository (`.nvmrc`). Consumers are not subject to this — the published package is browser-targeted.
- A bundler that can consume CommonJS or ESM (webpack, Vite, Rollup, Parcel, esbuild, Next.js).
- Authentication to **GitHub Packages** to install — see [docs/installation.md](docs/installation.md).

## Installation

This package is published to GitHub Packages, not the public npm registry. Full setup (including `.npmrc` and token configuration) is in [docs/installation.md](docs/installation.md). The quick version:

```bash
# After configuring .npmrc and exporting $GITHUB_TOKEN:
npm install \
  @qant-au/isoflow \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

## Security

**Read this if you ever pass user-influenced data into `initialData`.**

Isoflow renders node and connector `description` fields as HTML through a Quill-based rich-text editor. The library ships with an in-source mitigation for the `quill@2.0.3` XSS advisory ([`GHSA-v3m3-f69x-jf25`](https://github.com/advisories/GHSA-v3m3-f69x-jf25)) — but it is **narrow** and consumer responsibility starts where it ends:

- ✅ **What the library does for you.** A module-load override of Quill's `Link` blot rejects `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URL protocols (including percent-encoded variants) on every `<a href>` Quill touches. This covers both user-typed links and `value`-prop HTML re-parsed through Quill's clipboard converter. The editor is also locked to a small `formats` allowlist (`bold`, `italic`, `underline`, `strike`, `link`) — Quill drops unknown tags it sees during paste.
- ❌ **What the library does NOT do for you.** It does not strip arbitrary HTML elements from the `description` string before that string ever reaches Quill. If your application hydrates `initialData` from an untrusted source (consumer-uploaded JSON, third-party API, a database row originally populated by an end user), constructs like `<iframe srcdoc="...">`, `<svg onload="...">`, `<img src=x onerror="...">`, or `<style>` injections can land in the DOM.

**The rule:** treat every `items[].description` you pass into `<Isoflow initialData={...} />` (and every description that comes back through `onModelUpdated`, before rendering it anywhere else) the way you'd treat any other user-provided HTML. The standard remediation is [DOMPurify](https://github.com/cure53/DOMPurify):

```tsx
import DOMPurify from 'dompurify';

const safeInitialData = {
  ...rawInitialData,
  items: rawInitialData.items.map((item) => {
    return {
      ...item,
      description: DOMPurify.sanitize(item.description ?? '')
    };
  })
};

<Isoflow initialData={safeInitialData} />;
```

The full embed-side contract — including read/write asymmetry and the `onModelUpdated` round-trip — is in [docs/embedding.md](docs/embedding.md#security-model). The residual-advisory ledger lives in [SECURITY.md](SECURITY.md).

## Project maintainer

Contact information to follow.

## Contributing and support

The issue tracker and pull requests are closed while the project is in its initial modernisation phase. This isn't permanent — once the codebase has stabilised we plan to open both up and maintain the project as a normal open-source project.

If you're interested in contributing or would like to get in touch in the meantime, feel free to reach out via GitHub. Dev setup and conventions, for when contributions reopen, are documented in [docs/contributing.md](docs/contributing.md).

## License

MIT — see [LICENSE](./LICENSE).
