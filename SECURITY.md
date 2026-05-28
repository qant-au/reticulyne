# Security policy

## Reporting a vulnerability

Please open a private security advisory on the [GitHub repository](https://github.com/qant-au/isoflow) (Security → Advisories → "Report a vulnerability"). Do not file a public issue for security reports.

## Known accepted residual advisories

The following `npm audit` advisories are knowingly carried in the published package. Each entry records the advisory, the mitigation in source, and the conditions under which the entry can be closed.

### `GHSA-v3m3-f69x-jf25` — `quill@2.0.3` XSS via HTML export

- **Severity (audit):** low.
- **Reachable via:** `react-quill-new ^3.8.3 → quill ^2.0.3`. `react-quill-new` is the rich-text editor used for node descriptions.
- **Status upstream:** unpatched. The latest published `quill` is `2.0.3`. `npm audit` suggests the "fix" is to downgrade `react-quill-new` to `3.7.0`, but that release predates the advisory disclosure and ships Quill 1.x — a breaking API change that re-introduces other classes of known-vulnerable code. The downgrade is not a viable mitigation; staying on `^3.8.3` with the in-source link-blot override is the better trade.
- **Mitigation in source:** two layered defences, both inside `src/components/MarkdownEditor/`:
  1. `sanitizeLinkUrl.ts` overrides Quill's `Link.sanitize` at module load to reject `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URL protocols (including percent-encoded variants). The override runs on both user-typed links and any value-prop-supplied HTML, since Quill's `clipboard.convert` parses incoming HTML through the same Blot registration.
  2. `MarkdownEditor.tsx` configures the editor with `formats={['bold', 'italic', 'underline', 'strike', 'link']}`. Quill drops formats it doesn't recognise during clipboard paste, so a pasted `<img>`, `<iframe>`, `<script>`, or `<style>` is stripped on its way in. **This allowlist is load-bearing for the mitigation.** Widening it (e.g. adding `'image'` or `'video'`) reopens vectors the current design closes and must be paired with a re-assessment of this advisory.
- **Residual risk:** the advisory's exploit path is HTML clipboard pasting that constructs an XSS payload outside the `<a>` blot, e.g. via `<iframe>` or `<svg>` namespaces. Consumers loading `initialData` from untrusted sources should sanitise the `description` field of every model item with DOMPurify (or equivalent) before passing it in. The full embedder contract — including a runnable DOMPurify example — is in [`docs/embedding.md`](docs/embedding.md#security-model), and the consumer-facing summary is in [`README.md`](README.md#security).
- **Closes when:** an upstream `quill@>=2.0.4` ships with the patch, or this fork moves to a different rich-text editor (e.g. TipTap or Lexical). Tracked as **DEP-04 / DEP-04-follow-up** in the productionisation plan.

### `webpack-dev-server` — XSS source-code disclosure

- **Severity (audit):** moderate, **dev-only** (`devDependencies` chain).
- **Status:** **closed by `DEP3-03`** (third-pass). `webpack-dev-server@^5` resolves GHSA-9jgg-88mc-972h and GHSA-4v9v-hfq4-rm2v. Kept here as a historical entry; `npm audit` no longer reports it.

### `jsdom@<24` chain — `@tootallnate/once`, `http-proxy-agent`

- **Severity (audit):** low, **dev-only** (`jest-environment-jsdom → jsdom`).
- **Status:** **closed by `DEP3-02`** (third-pass). `jest@^30`, `jest-environment-jsdom@^30`, and `jsdom@^29` now resolve the advisory chain. Kept in this ledger as a historical entry; `npm audit` no longer reports it.

## Standalone Docker image — accepted CSP trade-offs

The standalone Docker image (built from this repository, served by nginx — see [`docker/nginx.conf`](docker/nginx.conf)) ships with a Content-Security-Policy header. Two clauses are knowingly relaxed; the others are tight. This section exists so the trade-off survives future edits to the nginx config.

### `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`

- **Why `'unsafe-inline'`?** Isoflow's styling stack is Emotion + MUI v9, both of which inject `<style>` tags at runtime as components mount. A strict `style-src 'self'` would block every Emotion-injected rule and the editor would render unstyled. A nonce-based policy is in principle possible but is not supported out of the box by Emotion's runtime injector.
- **Why is the risk contained?** Inline *styles* cannot execute script. The CSS-injection surface lets an attacker re-skin the page (or, with a carefully-crafted CSS-leak primitive, exfiltrate measurable state from the same origin), but not break out of CSS into JavaScript. The XSS-execution path that would matter — inline `<script>` — is still closed by `script-src 'self'`.
- **Why `https://fonts.googleapis.com`?** The standalone editor uses Google Fonts (Roboto). The corresponding font-file fetch is allowed by `font-src https://fonts.gstatic.com data:`.
- **Closes when:** Emotion (or whichever CSS-in-JS layer we use at the time) supports nonce- or hash-based style injection out of the box, *and* MUI's emit path follows. Until then, this clause stays.

### `script-src 'self'`

Tight by design. No inline scripts, no `eval`, no third-party CDN. This is the clause that contains the residual XSS risk from the `quill` advisory above: even if a payload lands in a `description` field and renders into the DOM, it cannot fetch or execute anything from off-origin.

### `img-src 'self' data: blob: https://isoflow.io https://static.isoflow.io`

- `data:` and `blob:` are required for the in-bundle SVG icon packs and for the export-to-PNG path (which renders into a `blob:` URL before downloading).
- `https://isoflow.io` / `https://static.isoflow.io` are the historical hosting origins for the icon-pack image assets. They remain in the allowlist for upstream-icon compatibility; removing them would break any external icon collection that references them.

### Embedders inheriting a strict CSP

The CSP above is only applied by the standalone Docker image. A consumer embedding `<Isoflow>` inside another React app inherits *that app's* CSP. Because Emotion injects styles at runtime, the host policy must permit it — typically `style-src 'self' 'unsafe-inline'` (or a nonce equivalent). The `script-src` clause can stay as strict as the rest of your app needs.

## Versioning of these notes

This file is updated in lockstep with `npm audit`. After every dependency bump, re-run `npm audit --omit=dev` and update the residual list accordingly.

Current counts (v4.5.0):
- `npm audit --omit=dev`: 2 low — both in the `quill` chain documented above.
- `npm audit` (including dev): 2 low — same two entries; no dev-only advisories remain. The CI pipeline gates on `npm audit --omit=dev --audit-level=moderate`; the two low-severity entries above are below the threshold by design.

### `SEC6-01` — overrode transitive `uuid` to clear `GHSA-w5hq-g745-h8pq`

`webpack-dev-server@5.2.4 → sockjs@0.3.24` pinned `uuid@8.3.2`, which is in the vulnerable range (`< 11.1.1`) of `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` (silent partial buffer writes in `v3()/v5()/v6()` when caller-supplied `buf` is undersized or `offset` overflows). The advisory is **dev-only** (the chain isn't reachable from the published `dist/`) and sockjs only ever calls `v4()` (`node_modules/sockjs/lib/transport.js:9`), so the vulnerable code path isn't even exercised in practice — but Dependabot kept the alert open. Added a top-level `"overrides": { "uuid": "^11.1.1" }` block in `package.json` so the transitive copy dedupes onto our already-patched direct dependency. `npm ls uuid` now returns a single `uuid@11.1.1` entry and the Dependabot alert auto-closes once the lockfile lands on `main`.

### `SEC7-01` — overrode transitive `qs` to clear `GHSA-q8mj-m7cp-5q26`

`webpack-dev-server@5.2.4 → express@4.22.2 → qs@6.15.1` pinned a version in the vulnerable range (`>=6.11.1 <=6.15.1`) of `GHSA-q8mj-m7cp-5q26` / `CVE-2026-8723` (a `TypeError` in `qs.stringify` when called with `arrayFormat: 'comma'` + `encodeValuesOnly: true` on arrays containing `null`/`undefined`). The advisory is **dev-only** (the chain isn't reachable from the published `dist/`) and Express only uses `qs` for query *parsing* — the vulnerable *stringify* path with that exact options combination is never invoked in practice — but Dependabot kept re-opening the alert after every routine dep bump that nudged the lockfile back onto `6.15.1`. Added `"qs": "^6.15.2"` to the existing top-level `overrides` block in `package.json` so every transitive `qs` resolution dedupes onto `6.15.2` (the upstream-patched release). `npm ls qs` now returns a single `qs@6.15.2` entry under both Express paths, `npm audit` no longer reports the advisory, and the Dependabot alert auto-closes once the lockfile lands on `main`. The `^6.15.2` shape (matching the existing `uuid` override) also means any future qs patch within the 6.x line is picked up automatically on the next `npm install`, so this entry should stay closed.
