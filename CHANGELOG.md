# Changelog

All notable changes to `@qant-au/reticulyne` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Versioning policy (0.x).** While the package is on a `0.x` line, minor
releases may include breaking changes to props, the `useReticulyne()` return
shape, or exported types — this is permitted by SemVer for pre-1.0 versions.
`v1.0.0` will mark API stabilisation. Until then, treat every minor release as
potentially breaking and read the release notes before upgrading.

## [Unreleased]

### Security

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

This project shipped as `@qant-au/isoflow` from v1.0.0 through v4.7.0 — see
the README's **"Pre-rename development history"** section for the v4
modernisation arc (test surface, security hardening, dark-mode pass, SVG/PDF
export, per-rectangle styling, 8-directional routing, embedding isolation).
The pre-rename git tags (`v4.1.0`–`v4.6.0`) remain on this repository as
historical pointers.
