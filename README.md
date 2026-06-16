# Reticulyne

> Part of [Projects](../README.md)

A React component for drawing network diagrams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About Reticulyne

Reticulyne is an embeddable, isometric network-diagram editor for React. The project home is **[reticulyne.com](https://reticulyne.com)**; source lives at **[github.com/qant-au/reticulyne](https://github.com/qant-au/reticulyne)**. The library ships as a React component for embedding inside other applications, and as a standalone Docker image for self-hosted editor deployments.

The name *Reticulyne* derives from *reticulum* — the Latin word for a network of fibres — with a designed `-lyne` orthography that names the product's job: networks, drawn.

### Succession from Isoflow

Reticulyne is the modern successor to [isoflow](https://github.com/markmanx/isoflow) by Mark Mankarious. The project began life as `@qant-au/isoflow`, a maintained community fork of the original after upstream maintenance lapsed. Over the v1.x–v4.x line the codebase diverged substantially from upstream — every feature shipping today was built here rather than ported from upstream — and the fork framing had stopped describing the actual relationship. The rename acknowledges that. Mark's original MIT-licensed work remains attributed in [`LICENSE`](./LICENSE); Reticulyne continues under the same MIT license.

Reticulyne v0.1.0 marks the renamed identity. It is a *naming* reset, not a *content* reset — the technical lineage summarised below is unbroken.

> **Development status:** This project is currently under active development. We are working through a period of significant modernisation — upgrading dependencies, improving build tooling, hardening security, and expanding the feature set. Things may change rapidly between releases during this phase. We intend to stabilise the codebase and open the project up to normal community contribution once that foundational work is complete.

## Pre-rename development history (as `@qant-au/isoflow` v1.x → v4.7.0)

High-level overview of what landed during the v4 modernisation work (full detail in `git log` under the `SEC4`, `QUA4`, `BLD4`, `BUG4`, `DOC4`, `FEA4`, `FEA5`, `BUG5`, `SEC5`, `QUA5`, and `FEA9` task-ID prefixes):

- **Security & supply-chain.** Embedder-side sanitisation contract documented in full ([Security](#security) section below and [docs/embedding.md](docs/embedding.md)). CI gated on `npm audit --omit=dev --audit-level=moderate`. nginx CSP trade-offs captured in [SECURITY.md](SECURITY.md).
- **Test surface.** Grew from 13 suites / 83 cases to **45 suites / 353 cases**. The hook layer, every interaction-mode handler, the connector coordinate system, the PDF export, and the schema bounds are now covered.
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
  - **Dark mode audit pass** (FEA9-01): `themeMode` default changed from `'light'` to `'auto'` (follows OS colour-scheme preference) — **breaking change**: embedders that relied on the implicit light default must now pass `themeMode="light"` explicitly. New `exportTheme` prop (`'light'` | `'dark'`, default `'light'`) controls the initial background colour in the export dialog. Fixes: connector glyph colours in dark mode, label colours on dark backgrounds, and export dialog background seeding.
  - **Embedding isolation** *(opt-in via `enableGlobalDragHandlers={false}`)* — Pointer event listeners attach to the renderer element rather than `window` when the prop is `false`, preventing drag events from leaking into host-page sibling widgets. Simultaneously migrates from the split mouse/touch event pair to the unified Pointer Events API (`pointerdown` / `pointermove` / `pointerup`) for consistent mouse, touch, and stylus handling. Pointer capture ensures drag tracking continues even when the pointer leaves the renderer bounds mid-drag — FEA10-01.
  - **Per-rectangle custom styling** — `colorValue` (direct hex fill), `outlineColor` (border stroke), `transparency` (fill alpha 0–1), and `zIndex` (z-order override) added as optional fields to the rectangle schema. Embedders can push status colours from external sources without pre-registering palette entries — useful for alerting-region overlays and live-dashboard VPC boundaries. Editor controls added to the rectangle inspector panel — FEA11-01.
  - **8-directional connector routing** — `DiagonalMovement.Always` confirmed active from the original codebase; connectors route via N/S/E/W plus all four 45° diagonals. Dedicated test coverage added — FEA8-01 (v4.7.0).

The forward-looking FEA5 roadmap has now landed in full — see the `Controlling UI visibility` and `Host-managed save` sections in [docs/embedding.md](docs/embedding.md) for the contracts.

## Documentation

Reference material lives under [`docs/`](docs/README.md):

- [Installation](docs/installation.md) — install from GitHub Packages.
- [Quick start](docs/quickstart.md) — minimal embed example.
- [API reference](docs/api.md) — props and the `useReticulyne()` imperative hook.
- [Embedding contract](docs/embedding.md) — modes, sizing, callback identity, security model.
- [Isopacks](docs/isopacks.md) — icon collections.
- [Standalone Docker](docs/docker.md) — run the editor as a self-hosted SPA.
- [Contributing](docs/contributing.md) — dev setup, test surface, branch conventions (when contributions reopen).

## Key features

- **Drag-and-drop editor** — Express your architecture with icons, regions and connectors.
- **Extensible icon system** — Bring your own icons as a flat `Icon[]` (exported as the `Icons` type); see [docs/isopacks.md](docs/isopacks.md) for the contract. The standalone Docker container ships with the AWS, Azure, GCP, Kubernetes, and Isoflow icon collections pre-loaded.
- **Editor modes** — Editable, explorable-readonly, and non-interactive modes for embedding in viewers, dashboards, or full editors.
- **Export options** — Export diagrams as JSON, PNG, PDF, or SVG from the main menu. PDF generation is client-side via jsPDF; SVG export offers two formats: a true-flat vector SVG (Illustrator/Inkscape/Figma) and a foreignObject universal SVG (full-fidelity in browsers and Figma). All exports are client-side with no network calls.
- **8-directional connector routing** — A* pathfinder uses diagonal movement (N/S/E/W plus all four 45° diagonals), producing shorter, less cluttered paths especially in densely connected diagrams.
- **Live dashboards** *(opt-in via `enableAnimation`)* — Animate connectors, fire signal pulses (`useReticulyne().Connector.pulse`) and decorate nodes with host-supplied gauges (`nodeIndicatorComponent`) to drive the diagram from a poller / websocket. See [Live dashboards in the embedding docs](docs/embedding.md#live-dashboards) and the runnable [`LiveDashboard` example](src/examples/LiveDashboard/LiveDashboard.tsx).

## Planned features

The items below are ordered by two rules applied in combination: **dependencies first** (an item that unblocks or is required by another item precedes it, even when its own user-visible benefit is modest), and **schema / API changes that are cheapest to do early come before features that would require the same migration later**. Items that deliver immediate UX value without blocking anything else are slotted in their natural place within those constraints.

---

### Selection dimming *(item highlighting)*

When exactly one item is selected, all other items fade to reduced opacity with a CSS transition (`opacity: 0.2`, `transition: opacity 0.3s`). Ports `nuno-andre/isoflow`'s implementation, extended to all item types (nodes, connectors, rectangles — the upstream only dims nodes) and exposed as a `highlightedItemId` prop so a host can drive focus externally without touching interaction state.

Connects to the existing `nodeIndicatorComponent` pattern — "host drives visual state" — applied to selection context.

*Prioritised third because:* the `highlightedItemId` prop is a new public API surface that should be locked down before stabilisation. Also a hard dependency of multi-floor management (below), where the same dimming mechanism is applied at floor scope.

---

### SVG export *(shipped in FEA13-01)*

A new "Export as SVG" option alongside the existing PNG and PDF entries in the main menu. The output is a resolution-independent vector file that opens in Illustrator, Figma, Inkscape, or any presentation tool at any scale — the natural highest-quality export format since the canvas is already SVG-DOM. Icons inline as `data:` URIs for portability; animated connectors export as static (documented caveat). Export policy: light theme by default; `exportTheme` prop override for embedders who need dark exports.

*Prioritised fourth because:* no schema change and no dependency on items above. SVG export is placed before Diagram layers because the render pass it introduces — which must respect layer visibility to produce correct output — establishes the layer-filtering predicate that the Diagram layers / Redacted feature relies on. The export components are touched once here rather than separately for SVG and again for layer-awareness.

---

### Diagram layers with per-layer visibility toggle

Items are assigned to named layers (e.g. "Topology", "Detail", "Annotations"). Each layer has a visibility toggle. Turning off "Detail" hides IP addresses, connection labels, and port numbers while leaving the base topology intact; turning off "Annotations" hides text boxes and status indicators without removing nodes or connectors. One diagram serves multiple audiences with a single toggle in the toolbar or via `iso.setLayerVisible('detail', false)` in the imperative API.

Distinct from multi-view (separate complete canvases) and from grouping (spatial organisation). Layers cut across both.

#### Redacted layer — export-time suppression

A reserved built-in layer named **Redacted** serves a specific purpose beyond visibility: items on it are visible in the editor (so the diagram remains complete and navigable) but are **excluded from all exports** (PNG, PDF, SVG) unless the export dialog's **"Include redacted content"** checkbox is explicitly checked.

The intended use is annotation-based. IP addresses, service identifiers, internal port numbers, and similar sensitive text live in TextBox items (or connector description labels) placed on the Redacted layer. When the diagram is shared externally those annotations are silently omitted — the structural topology (nodes, connectors, rectangles) is always preserved. Removing structural objects is the job of the ordinary visibility toggle; redaction is purely an export gate.

If a diagram has no items on the Redacted layer, export behaviour is identical to today — the "Include redacted content" checkbox does not appear and nothing changes for the user.

**Why this pairs naturally with layers.** The export pipeline (PNG, PDF, and SVG once that lands) already needs to be updated to respect layer visibility when rendering. Adding a redaction predicate in the same pass — skip any item whose layer is Redacted unless the export option opts in — is marginal incremental work. Building both together avoids a second pass through the export components later.

*Prioritised fifth because:* layers add a `layerId` metadata field to the item schema. Landing this before multi-floor management avoids touching item metadata twice — if floors land first, layers would need to be retrofitted alongside an already complex floor model. The Redacted sub-feature is included here rather than as a separate item because the export pipeline is already layer-aware from SVG export (above).

---

### Multi-floor management *(new)*

Extends the diagram model along the z-axis, allowing a single canvas to represent a multi-storey building, a multi-tier network stack, or any environment where vertical layering has semantic meaning (Floor 1 / Floor 2 / Roof Plant; L2 / L3 / application tier; web / app / database).

- **Floors are independent canvases.** Each floor edits and navigates exactly as the current canvas does — a floor is not a filtered view, it is a full peer diagram.
- **Cross-floor connectors.** Links between items on different floors are fully supported. Each cross-floor connection renders as a stub on each floor, terminating at a floor-transition marker (keeping the isometric projection unambiguous). The stub clearly labels the remote floor and remote endpoint.
- **Active / inactive dimming.** The active floor renders at full opacity. All other floors are rendered at reduced opacity — enough to read the topology, not enough to compete with the active plane. This is the dimming mechanism from selection dimming (above), applied at floor scope rather than item scope.
- **Tab-strip navigation.** Floors are user-named and reordered; a tab strip (or keyboard Alt+Up/Down) switches the active floor.

The concept synthesises two independent community contributions: `bgrewell/isoflow`'s vertical z-offset stacking of node groups gives the depth model; `nuno-andre/isoflow`'s selection dimming gives the visual vocabulary. Together they compose into a navigation paradigm where depth is physically meaningful rather than purely organisational.

*Depends on: selection dimming and per-rectangle transparency / z-index (both above). Benefits from diagram layers (above) being settled first so item metadata is not migrated twice, and from SVG export (above) having already established the layer-aware export pipeline.*

---

### WebGL connector renderer *(future architectural direction)*

An optional Three.js layer for connector rendering, complementing the existing SVG layer. The SVG layer is efficient up to ~50 animated connectors; beyond that, `strokeDashoffset` animation triggers per-frame style recalculation across many SVG nodes. A WebGL overlay decouples animation frame rate from the DOM layout pipeline entirely. Architectural signal from `a876691666/Visoflow` (a Vue 3 reimplementation — not directly portable, but the direction is clear). Noted as the path to take when connector animation becomes a measured performance bottleneck at scale, not a near-term pick-up.

---

## Requirements

- **React** 18 or 19 (peer dependency) and a matching `react-dom`.
- **MUI v9**, **Emotion**, and **Zustand** as peer dependencies (v3 onwards — see [Installation](#installation)). v1 bundled MUI/Emotion/Zustand internally; v2 externalised them as peer-deps at MUI v5; v3 bumps the peer-dep range to MUI v9.
- **Node.js** 22 LTS for development against this repository (`.nvmrc`). Consumers are not subject to this — the published package is browser-targeted.
- A bundler that can consume CommonJS or ESM (webpack, Vite, Rollup, Parcel, esbuild, Next.js).
- Authentication to **GitHub Packages** to install — see [docs/installation.md](docs/installation.md).

## Installation

This package is published to GitHub Packages as `@qant-au/reticulyne`, not the public npm registry. Full setup (including `.npmrc` and token configuration) is in [docs/installation.md](docs/installation.md). The quick version:

```bash
# After configuring .npmrc and exporting $GITHUB_TOKEN:
npm install \
  @qant-au/reticulyne \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

## Security

**Read this if you ever pass user-influenced data into `initialData`.**

Reticulyne renders node and connector `description` fields as HTML through a Quill-based rich-text editor. The library ships with an in-source mitigation for the `quill@2.0.3` XSS advisory ([`GHSA-v3m3-f69x-jf25`](https://github.com/advisories/GHSA-v3m3-f69x-jf25)) — but it is **narrow** and consumer responsibility starts where it ends:

- ✅ **What the library does for you.** A module-load override of Quill's `Link` blot rejects `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URL protocols (including percent-encoded variants) on every `<a href>` Quill touches. This covers both user-typed links and `value`-prop HTML re-parsed through Quill's clipboard converter. The editor is also locked to a small `formats` allowlist (`bold`, `italic`, `underline`, `strike`, `link`) — Quill drops unknown tags it sees during paste.
- ❌ **What the library does NOT do for you.** It does not strip arbitrary HTML elements from the `description` string before that string ever reaches Quill. If your application hydrates `initialData` from an untrusted source (consumer-uploaded JSON, third-party API, a database row originally populated by an end user), constructs like `<iframe srcdoc="...">`, `<svg onload="...">`, `<img src=x onerror="...">`, or `<style>` injections can land in the DOM.

**The rule:** treat every `items[].description` you pass into `<Reticulyne initialData={...} />` (and every description that comes back through `onModelUpdated`, before rendering it anywhere else) the way you'd treat any other user-provided HTML. The standard remediation is [DOMPurify](https://github.com/cure53/DOMPurify):

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

<Reticulyne initialData={safeInitialData} />;
```

The full embed-side contract — including read/write asymmetry and the `onModelUpdated` round-trip — is in [docs/embedding.md](docs/embedding.md#security-model). The residual-advisory ledger lives in [SECURITY.md](SECURITY.md).

## Project maintainer

Reticulyne is maintained by **Adam Burgess** ([adamburgess.me](https://adamburgess.me)) under QANT Pty Ltd. The project home is [reticulyne.com](https://reticulyne.com); source lives at [github.com/qant-au/reticulyne](https://github.com/qant-au/reticulyne).

## Contributing and support

The issue tracker and pull requests are closed while the project is in its initial modernisation phase. This isn't permanent — once the codebase has stabilised we plan to open both up and maintain the project as a normal open-source project.

If you're interested in contributing or would like to get in touch in the meantime, feel free to reach out via GitHub. Dev setup and conventions, for when contributions reopen, are documented in [docs/contributing.md](docs/contributing.md).

## License

MIT — see [LICENSE](./LICENSE).
