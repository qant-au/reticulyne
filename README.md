# Isoflow

A React component for drawing network diagrams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Fork note:** This is a maintained community fork of [isoflow](https://github.com/markmanx/isoflow) by Mark Mankarious, which is no longer actively maintained. Maintained by QANT Pty Ltd under the same MIT license.

> **Development status:** This project is currently under active development. We are working through a period of significant modernisation — upgrading dependencies, improving build tooling, hardening security, and expanding the feature set. Things may change rapidly between releases during this phase. We intend to stabilise the codebase and open the project up to normal community contribution once that foundational work is complete.

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

## Tests

The repo runs two test surfaces:

| Suite | Runner | Command |
|---|---|---|
| Unit + component | Jest (jsdom) | `npm test` |
| End-to-end (browser) | Playwright (Chromium) | `npm run test:e2e` |

Playwright drives a real browser against the standalone Docker container served by `bash restart.sh`. First-time setup on a fresh clone:

```bash
npm ci                          # installs @playwright/test
npm run test:e2e:install        # one-time Chromium binary download (~100MB)
bash restart.sh                 # start the container at http://localhost:2222
npm run test:e2e                # run e2e specs
```

Override the target URL with `PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e`. Specs live under `e2e/`; Playwright outputs (traces, videos, HTML reports) are written to `playwright-out/` and `playwright-report/`, both gitignored.

## Knowledge graph (Graphify)

[Graphify](https://github.com/safishamsi/graphify) builds an interactive knowledge graph of this repo for coding-assistant integrations (Claude Code, Cursor, Gemini). Optional — `bash restart.sh` runs it if installed, skips with a clear message if not.

One-time install:

```bash
uv tool install graphifyy        # recommended
# or: pipx install graphifyy
# or: pip install graphifyy
```

`restart.sh` then runs `graphify update .` (incremental) and spawns `graphify watch .` in the background (logs to `graphify-out/watch.log`, PID in `graphify-out/watch.pid`). All Graphify output is written to `graphify-out/` and is gitignored. The `.graphifyignore` file controls what gets indexed — edit it the same way you'd edit `.gitignore`.

To skip Graphify on a single invocation: `NO_GRAPHIFY=1 bash restart.sh`.

## Security model

Isoflow renders node and connector **descriptions** as HTML. The bundled rich-text editor sanitises URL protocols at write time (`http`, `https`, `mailto`, `tel` only; everything else is replaced with `about:blank`), but it does **not** strip arbitrary HTML elements.

Two implications for consumers:

- **`initialData` is trusted input.** If your application loads diagrams from an untrusted source (user-uploaded JSON, third-party API, content stored before this fork's protocol-sanitisation landed), sanitise every item's `description` field with DOMPurify (or equivalent) **before** passing it into `<Isoflow initialData={...} />`. The editor does not re-sanitise existing HTML on hydration.
- **`onModelUpdated` emits HTML, not Markdown.** The payload includes raw rich-text HTML for descriptions. If you persist the model to a backend and later display it outside Isoflow (in a list view, an email digest, etc.), apply the same sanitisation policy your trust boundary requires for any user-generated HTML.

The full list of known security advisories carried by this package — and the in-source mitigations applied to each — is in [`SECURITY.md`](./SECURITY.md).

## Project maintainer

Contact information to follow.

## Contributing and support

The issue tracker and pull requests are closed while the project is in its initial modernisation phase. This isn't permanent — once the codebase has stabilised we plan to open both up and maintain the project as a normal open-source project.

If you're interested in contributing or would like to get in touch in the meantime, feel free to reach out via GitHub.

## License

MIT — see [LICENSE](./LICENSE).
