# Security policy

## Reporting a vulnerability

Please open a private security advisory on the [GitHub repository](https://github.com/qant-au/reticulyne) (Security → Advisories → "Report a vulnerability"). Do not file a public issue for security reports.

## Known accepted residual advisories

The following `npm audit` advisories are knowingly carried in the published package. Each entry records the advisory, the mitigation in source, and the conditions under which the entry can be closed.

### `GHSA-v3m3-f69x-jf25` — `quill@2.0.3` XSS via HTML export

- **Severity (audit):** low.
- **Was reachable via:** `react-quill-new ^3.8.3 → quill ^2.0.3`, the former rich-text editor for node descriptions.
- **Status:** **closed by `DEP-04-follow-up`.** The editor was migrated from Quill to **TipTap** (`@tiptap/react` v3 with a minimal primitive set — Document/Paragraph/Text + Bold/Italic/Underline/Strike/Link). `react-quill-new` and its transitive `quill` are gone from the dependency tree, so `npm audit` no longer reports this advisory. Kept in this ledger as a historical entry.
- **Why the migration is a net security improvement, not just a version bump.** Quill's old mitigation was a *paste-time* format allowlist: it filtered `<img>`/`<iframe>`/`<script>`/`<style>` on clipboard paste but could still let markup embedded directly in a `description` *value* survive to the DOM (hence the consumer-side DOMPurify recommendation). TipTap is schema-based, and the schema is the boundary. Registering only the five inline marks means:
  1. **Parse-in (`generateJSON`, the `value` prop, editor content).** Incoming HTML is parsed against a ProseMirror schema built solely from the registered nodes/marks. Any tag with no parse rule (`<script>`, `<iframe>`, `<svg>`, `<img>`, `<style>`, `<form>`) is dropped, and any attribute not declared by an extension (`onerror`, `onload`, `srcdoc`, `style`) never enters the document. Unlike Quill this runs on the way *in*, so untrusted `initialData` HTML is neutralised before it can render.
  2. **Serialize-out (`generateHTML`, read-only display).** Output is regenerated purely from the schema, so it can only contain `<p>/<strong>/<em>/<u>/<s>/<a href>`.
  3. **Links.** `sanitizeLinkUrl.ts` is retained and wired into a `SafeLink` extension (`MarkdownEditor.tsx`) that routes every `href` through it on both parse and render, rejecting `javascript:`/`data:`/`vbscript:`/`file:`/`blob:` (and percent-encoded variants). Unlike the old Quill `Link` blot override, this is a per-editor extension with **no global module-load side effect**.
- **Load-bearing invariant (unchanged in spirit):** the extension set in `EDITOR_EXTENSIONS` is the containment boundary. Adding an image, raw-HTML, or `iframe` extension reopens vectors this design closes and must be paired with a re-assessment.
- **Consumer impact:** DOMPurifying the `description` field before passing `initialData` is now **optional hardening** rather than required, because the editor re-parses the value through the schema before rendering. Descriptions rendered *outside* Reticulyne remain the consumer's responsibility. See [`docs/embedding.md`](docs/embedding.md#security-model) and [`README.md`](README.md#security).

### `webpack-dev-server` — XSS source-code disclosure

- **Severity (audit):** moderate, **dev-only** (`devDependencies` chain).
- **Status:** **closed by `DEP3-03`** (third-pass). `webpack-dev-server@^5` resolves GHSA-9jgg-88mc-972h and GHSA-4v9v-hfq4-rm2v. Kept here as a historical entry; `npm audit` no longer reports it.

### `jsdom@<24` chain — `@tootallnate/once`, `http-proxy-agent`

- **Severity (audit):** low, **dev-only** (`jest-environment-jsdom → jsdom`).
- **Status:** **closed by `DEP3-02`** (third-pass). `jest@^30`, `jest-environment-jsdom@^30`, and `jsdom@^29` now resolve the advisory chain. Kept in this ledger as a historical entry; `npm audit` no longer reports it.

### `pathfinding@0.4.18` — unmaintained pre-1.0 dependency

- **Severity (audit):** none reported, but pre-1.0 and no upstream release since 2022 — any future advisory has no patch path.
- **Status:** **closed by `SEC-04`.** Replaced by an in-tree A* implementation at `src/vendor/pathfinder/` with the minimal subset Reticulyne exercised (Grid + Manhattan A* with 8-directional movement). Provenance and closure criterion are recorded in [`src/vendor/pathfinder/VENDOR.md`](src/vendor/pathfinder/VENDOR.md). The `@types/pathfinding` typing dep and the dedicated `pathfindingMock.js` Jest shim — only there to paper over the package's CommonJS interop — were removed at the same time.

## Standalone Docker image — accepted CSP trade-offs

The standalone Docker image (built from this repository, served by nginx — see [`docker/nginx.conf`](docker/nginx.conf)) ships with a Content-Security-Policy header. Two clauses are knowingly relaxed; the others are tight. This section exists so the trade-off survives future edits to the nginx config.

### `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`

- **Why `'unsafe-inline'`?** Reticulyne's styling stack is Emotion + MUI v9, both of which inject `<style>` tags at runtime as components mount. A strict `style-src 'self'` would block every Emotion-injected rule and the editor would render unstyled. A nonce-based policy is in principle possible but is not supported out of the box by Emotion's runtime injector.
- **Why is the risk contained?** Inline *styles* cannot execute script. The CSS-injection surface lets an attacker re-skin the page (or, with a carefully-crafted CSS-leak primitive, exfiltrate measurable state from the same origin), but not break out of CSS into JavaScript. The XSS-execution path that would matter — inline `<script>` — is still closed by `script-src 'self'`.
- **Why `https://fonts.googleapis.com`?** The standalone editor uses Google Fonts (Roboto). The corresponding font-file fetch is allowed by `font-src https://fonts.gstatic.com data:`.
- **Closes when:** Emotion (or whichever CSS-in-JS layer we use at the time) supports nonce- or hash-based style injection out of the box, *and* MUI's emit path follows. Until then, this clause stays.

### `script-src 'self'`

Tight by design. No inline scripts, no `eval`, no third-party CDN. It is defense-in-depth over the editor's own schema-based sanitisation (see the `quill`→TipTap entry above): even in the unlikely event a payload reached a `description` field and rendered into the DOM, it could not fetch or execute anything from off-origin.

### `img-src 'self' data: blob:`

- `data:` and `blob:` are required for the in-bundle SVG icon packs and for the export-to-PNG path (which renders into a `blob:` URL before downloading).
- **Icon URL hardening (SEC-01):** independent of the CSP, `iconSchema.url` is scheme-restricted at validation time to `http(s):`, `blob:`, relative paths, and image-only `data:` URIs — `javascript:`, `file:`, and `data:text/html` are rejected. SVG icons inlined during SVG export are stripped of `<script>`, `<foreignObject>`, and `on*` handlers so an exported file opened from a `file:` origin can't execute embedded content.
- **History:** through the prior `@qant-au/isoflow` line the allowlist also included `https://isoflow.io` and `https://static.isoflow.io` — the upstream hosting origins for the original icon-pack image assets. Those origins were removed during the Reticulyne v0.1.0 rename (RNM-04). The in-repo demo fixtures that previously referenced those URLs were rewritten to inline `data:` SVGs. Embedders who shipped icon collections referencing those external origins must self-host or migrate to `data:`/`blob:` URIs in their `iconCollections` payload.

### `Strict-Transport-Security` (SEC-07)

The image sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on every response. **This header assumes HTTPS-only ingress** — the image is designed to run behind a TLS-terminating reverse proxy. If you knowingly serve the container over plain HTTP (e.g. a purely-internal deployment with no TLS anywhere), drop this header from [`docker/nginx.conf`](docker/nginx.conf), because once a browser has seen it, it will refuse plain-HTTP connections to that host for the `max-age` window. Because nginx replaces (does not merge) `add_header` inside a `location` block, the directive is repeated in the asset and `/index.html` blocks alongside the other security headers.

### Embedders inheriting a strict CSP

The CSP above is only applied by the standalone Docker image. A consumer embedding `<Reticulyne>` inside another React app inherits *that app's* CSP. Because Emotion injects styles at runtime, the host policy must permit it — typically `style-src 'self' 'unsafe-inline'` (or a nonce equivalent). The `script-src` clause can stay as strict as the rest of your app needs.

## Versioning of these notes

This file is updated in lockstep with `npm audit`. After every dependency bump, re-run `npm audit --omit=dev` and update the residual list accordingly.

Current counts (post-DEP-04-follow-up):
- `npm audit --omit=dev`: 1 moderate — `dompurify@3.4.10` via `jspdf` ([`GHSA-cmwh-pvxp-8882`](https://github.com/advisories/GHSA-cmwh-pvxp-8882)), disclosed after the TipTap migration and unrelated to it (jspdf powers PDF export, not the editor). Not yet triaged; tracked separately as **DEP-06**. The two low-severity `quill` entries are **resolved** — the editor was migrated off Quill (see the entry above).
- `npm audit` (including dev): 2 moderate — the `dompurify` entry above plus `http-proxy-middleware` ([`GHSA-64mm-vxmg-q3vj`](https://github.com/advisories/GHSA-64mm-vxmg-q3vj)) in the dev-only `webpack-dev-server` chain.
- **CI note:** the pipeline gates on `npm audit --omit=dev --audit-level=moderate`. The new `dompurify` moderate sits **at** that threshold and will trip the gate until DEP-06 lands (e.g. a `dompurify` override to the patched `3.4.11`); it must be resolved separately from this migration, not folded into it.

### `SEC6-01` — overrode transitive `uuid` to clear `GHSA-w5hq-g745-h8pq`

`webpack-dev-server@5.2.4 → sockjs@0.3.24` pinned `uuid@8.3.2`, which is in the vulnerable range (`< 11.1.1`) of `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` (silent partial buffer writes in `v3()/v5()/v6()` when caller-supplied `buf` is undersized or `offset` overflows). The advisory is **dev-only** (the chain isn't reachable from the published `dist/`) and sockjs only ever calls `v4()` (`node_modules/sockjs/lib/transport.js:9`), so the vulnerable code path isn't even exercised in practice — but Dependabot kept the alert open. Added a top-level `"overrides": { "uuid": "^11.1.1" }` block in `package.json` so the transitive copy dedupes onto our already-patched direct dependency. `npm ls uuid` now returns a single `uuid@11.1.1` entry and the Dependabot alert auto-closes once the lockfile lands on `main`.

### `SEC7-01` — overrode transitive `qs` to clear `GHSA-q8mj-m7cp-5q26`

`webpack-dev-server@5.2.4 → express@4.22.2 → qs@6.15.1` pinned a version in the vulnerable range (`>=6.11.1 <=6.15.1`) of `GHSA-q8mj-m7cp-5q26` / `CVE-2026-8723` (a `TypeError` in `qs.stringify` when called with `arrayFormat: 'comma'` + `encodeValuesOnly: true` on arrays containing `null`/`undefined`). The advisory is **dev-only** (the chain isn't reachable from the published `dist/`) and Express only uses `qs` for query *parsing* — the vulnerable *stringify* path with that exact options combination is never invoked in practice — but Dependabot kept re-opening the alert after every routine dep bump that nudged the lockfile back onto `6.15.1`. Added `"qs": "^6.15.2"` to the existing top-level `overrides` block in `package.json` so every transitive `qs` resolution dedupes onto `6.15.2` (the upstream-patched release). `npm ls qs` now returns a single `qs@6.15.2` entry under both Express paths, `npm audit` no longer reports the advisory, and the Dependabot alert auto-closes once the lockfile lands on `main`. The `^6.15.2` shape (matching the existing `uuid` override) also means any future qs patch within the 6.x line is picked up automatically on the next `npm install`, so this entry should stay closed.
