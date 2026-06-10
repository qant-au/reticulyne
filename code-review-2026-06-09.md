# Reticulyne Code Review — 2026-06-09

**Reviewer:** Claude Opus
**Date:** 2026-06-09
**Scope:** Full repository — `/Users/adam/Projects/reticulyne/`
**Commit reviewed:** `be36b38`
**Prior reviews consulted:** None — this is the first review under the Reticulyne name. (Prior `@qant-au/isoflow` reviews referenced by `SEC4`/`QUA4`/`BUG4`/`DOC4`/`FEA4`/`SEC5`/`BUG5` task-ID prefixes in git history are not present as `code-review-*.md` files in the repository.)

---

## Executive Summary

**Reticulyne is in unusually good shape.** This is a healthy, well-maintained codebase, and the v4 → v0.1.0 rename sweep (RNM-01..09) was executed cleanly: there are no broken back-compat shims, no `localStorage` namespace bombs, no orphaned `Isoflow`-named storage keys or globals. `npm run lint` exits clean (zero diagnostics) under a strict ESLint config that promotes the React-19-Compiler rules (`react-hooks/refs`, `set-state-in-effect`, `set-state-in-render`, `exhaustive-deps`) to **error**. The code review instructions themselves are slightly out-of-date about this — they describe those rules as still being at warning level. The codebase contains zero `: any` types in `src/`, three TODO markers total (all benign), and rigorous test coverage across schemas, reducers, interaction modes, and the Quill XSS sanitizer.

**No Critical findings.** There are no exploitable vulnerabilities in `dist/` or in the standalone Docker SPA's CSP. The Quill XSS residual (`GHSA-v3m3-f69x-jf25`) is correctly mitigated by the documented two-layer defence (`sanitizeLinkUrl.ts` link-blot override loaded at module-init time + a load-bearing `formats` allowlist in `MarkdownEditor.tsx`). The `uuid`/`qs` Dependabot overrides are in place and traceable in git history (SEC6-01, SEC7-01). `script-src 'self'` in the nginx CSP is tight, and source maps are correctly disabled in the Docker builds (only the npm tarball ships them, intentionally).

**The High-severity findings cluster in three themes.** First, **public-API hygiene** for the upcoming v1 stabilisation: the `useReticulyne()` hook's returned methods lack TSDoc (so IDE hover gives embedders nothing); the `Model` / `uiState` escape hatches aren't `@deprecated`-marked; `ModelStore` / `UiStateStore` / `SceneStore` Zustand-shaped types leak through the public type surface via `standaloneExports.ts → src/types/model`; `docs/api.md`'s prop table is missing nine props (including the breaking-default-change `themeMode`); a `useIsoflow` back-compat alias is missing despite the CHANGELOG implying continuity; and there is no stated SemVer policy for the 0.x line. Second, **two supply-chain hard-ends**: `pathfinding@0.4.18` (last release 2022, no maintenance path), and a live `MOONSHOT_API_KEY` sitting plaintext in `.env.graphify` (gitignored — not committed — but rotatable if the value is active). Third, **performance hot paths** in `useInteractionManager` and `useKeyboardShortcuts`: both subscribe to whole-store via `(state) => state`, causing `window.addEventListener` rebinds on every `pointermove` event for `pointerdown`/`pointermove`/`pointerup`/`contextmenu`/`wheel`/`keydown`. On a 120 Hz pointer device this is thousands of listener rebinds per second of mouse motion.

**Medium-severity findings are clustered around documentation/code drift** from the rename and from feature evolution. `docs/docker.md` documents a CSP that includes `https://reticulyne.io` and `https://static.reticulyne.io` origins — the actual `docker/nginx.conf` (correctly, per CHANGELOG RNM-04) does **not** include them. `docs/quickstart.md` still teaches the old `window.alert` behaviour for invalid `initialData` (replaced by `onValidationError` callback contract long ago). `docs/isopacks.md` documents a `ProcessedCollection` interface that doesn't exist in the published types and names the bundled pack as `reticulyne` when the actual pack-id is `isoflow` (preserved deliberately for diagram back-compat). `docs/api.md:71` has an over-eager renamer artefact (`markmanx/reticulyne` — should read `markmanx/isoflow`). `SECURITY.md`'s "Current counts (v4.5.0)" snapshot tag predates the rename. `TODO.md` is empty despite several source comments referring to "follow-ups tracked in TODO.md".

**The standalone Docker surface is hardened but two cheap defence-in-depth wins remain:** no HSTS header (image is intended for TLS-terminating-proxy deployment but should emit HSTS from origin), and `.dockerignore` omits `.env*`, `testing/`, and the editor-config / planning-doc tail (`CLAUDE.md`, `ROADMAP.md`, etc.) — these don't leak into the final image due to multi-stage discard, but they bloat the build context and create a footgun if an intermediate layer is ever pushed.

**The accessibility surface is the next visible gap.** Canvas editors are genuinely hard to make screen-reader accessible and the ROADMAP correctly defers full a11y to a separate initiative. But three cheap wins exist today: every `IconButton` in the toolbar — Select, Pan, Add-item, Rectangle, Connector, Text, the menu button, zoom controls — is rendered with `<Tooltip title={name}>` only, with no `aria-label` on the underlying button, so screen readers read the toolbar as a row of unlabelled buttons. Adding `aria-label={name}` in `IconButton.tsx:1-80` is a single change with repo-wide effect. The canvas root has no `role="application"`. And `useKeyboardShortcuts` attaches its `keydown` listener to `window`, which means pressing `V`, `H`, `R`, `C`, `T`, `+`, `-`, `0`, `1`, `F`, or `?` anywhere on an embedder's host page activates Reticulyne tools even when the canvas is not focused — hostile to multi-widget embedder UIs. A symmetric `enableGlobalKeyboardShortcuts` opt-out (mirroring FEA10-01's `enableGlobalDragHandlers`) would close this.

**Build and CI are strong but the release workflow lags.** `.github/workflows/ci.yml` is tight: it gates on `npm audit --omit=dev --audit-level=moderate`, lint, unit tests, build, and a bespoke pack-contents check. `.github/workflows/release.yml`, by contrast, runs only `npm ci → npm test → build → publish` — no lint, no audit, no pack-contents verification, no tag-matches-version assertion, no CHANGELOG-mentions-version gate. The same workflows pin GitHub Actions to floating tags (`@v4`) rather than SHAs, which is a known supply-chain risk in any workflow that holds `packages: write`. Lockfile is also slightly behind manifest ranges (12+ in-range bumps available — `react 19.2.6 → 19.2.7`, `@mui/material 9.0.1 → 9.1.0`, `zustand 5.0.13 → 5.0.14`, etc.); a single `npm update` clears the noise.

**Bottom line:** Reticulyne can ship today. The Critical/High count is dominated by API-stabilisation work (TSDoc, type-leak narrowing, doc parity) that the ROADMAP already calls out as Tier 1.6 — none of it blocks function, all of it raises the bar for v1.0. The two genuine "do now" items are: (a) rotate the `MOONSHOT_API_KEY` if it's still active, and (b) scope the keyboard-shortcut listener so embedders aren't hijacked.

---

## Section 1: Repository Minimum File Audit

| File | Present | Notes |
|------|---------|-------|
| `README.md` | ✓ | Up-to-date with rename; security model clearly summarised; GitHub Packages auth pointer present. |
| `LICENSE` | ✓ | MIT, Mark Mankarious attribution preserved (CHANGELOG L46). |
| `SECURITY.md` | ✓ | Residual-advisory ledger present; mitigations verifiable in source. Snapshot tag still reads `v4.5.0` — see D6-03. |
| `TODO.md` | ✓ (header only) | Frontmatter present but zero tasks. Several source comments reference "tracked in TODO.md" — see D6-17. |
| `ROADMAP.md` | ✓ | Large and current; Tier 1/2/3 + UXA Excalidraw-alignment work. One minor "see prior versions" reference (D6-16). |
| `CHANGELOG.md` | ✓ | Keep-a-Changelog format; v0.1.0 entry documents rename and reset. |
| `CLAUDE.md` | ✓ | Graphify-first guidance, docker URLs, commit conventions — all consistent with actual repo state. |
| `docs/embedding.md` | ✓ | Comprehensive; security model section is the strongest doc in the repo. Two minor issues (worked example, view-switching gap). |
| `docs/docker.md` | ✓ | Both image variants documented; CSP description out of sync with `docker/nginx.conf` — see D6-04. |
| `docs/installation.md` | ✓ | GH Packages auth flow clear. |
| `docs/quickstart.md` | ✓ | Stale `window.alert` claim for invalid data — see D6-06. |
| `docs/api.md` | ✓ | Prop table missing 9 props — see S5-03. |
| `docs/isopacks.md` | ✓ | References non-existent `ProcessedCollection` type and wrong bundled-pack name — see D6-08/D6-09. |
| `docs/contributing.md` | ✓ | Current and consistent with `CLAUDE.md`. No rollback procedure — see 8.6. |
| `docs/README.md` | ✓ | Index doc; all six links reachable. |
| `graphify-out/` | ✓ | Knowledge graph + manifest + watch.pid present. |
| `.gitignore` | ✓ | Comprehensive; excludes `dist*`, `node_modules`, `.env*`, planning files, IDE state. |
| `.dockerignore` | ✓ | Present but missing `.env*`, `testing/`, planning docs — see 8.10. |
| `eslint.config.js` | ✓ | React-19-Compiler rules promoted to **error**. Lint exits clean. |
| `tsconfig.json` | ✓ | `strict: true`, `noImplicitAny: true`, `noUnusedLocals/Parameters: true`. |
| `tsconfig.build.json` | ✓ | Declaration-only emit; excludes examples/fixtures/vendor/tests from `.d.ts` output. |
| `jest.config.js` | ✓ | jsdom env, ts-jest, pathfinding mock wired. |
| `playwright.config.ts` | ✓ | Targets http://localhost:2222; retries on CI; trace on first retry. |
| `.github/workflows/ci.yml` | ✓ | Lint + test + audit + pack-contents check gated. |
| `.github/workflows/release.yml` | ✓ (but gaps) | Missing lint, audit, pack-contents, tag-version check, CHANGELOG gate — see 8.2/8.3/8.4. |
| `package.json` | ✓ | `engines.node >=22.0.0`, `files` allowlist tight, `exports` map correct, `sideEffects` correct. |
| `.npmrc` | ✓ | Routes auth through `${GITHUB_TOKEN}` env var. |
| `.nvmrc` | ✓ | Node 22 (aligned with `engines` + Dockerfile FROM). |

**Summary:** No file is missing. All minimum-file gates pass. Quality gaps are in **content**, not presence — `TODO.md` is empty despite being referenced as a tracker (D6-17), `docs/docker.md` has stale CSP origins (D6-04), `SECURITY.md` snapshot tag still reads v4.5.0 (D6-03).

---

## Section 2: Security

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### 2a. XSS & Injection in Rendered Diagram Content

**[2a] — Icon URL schema accepts any string with no protocol allowlist**
Severity: 🟡 Medium
Location: `src/schemas/icons.ts:13`, `src/schemas/common.ts:53`, `src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon.tsx:28`, `NonIsometricIcon.tsx:24`, `src/utils/exportOptions.ts:259`
Description: `iconSchema.url` is `z.string().max(SCHEMA_LIMITS.ICON_URL_MAX)` with no protocol restriction. It flows directly into `<img src={icon.url}>` (browser-blocked from executing JS in `<img>` contexts) **but** the same URL is later fed into `exportAsVectorSvg` → `fetchAsDataUri()`, which inlines the icon into an exported SVG. If the user double-clicks the exported `.svg` to preview it under the `file:` origin, embedded `<script>` / `<foreignObject>` / event-handler attributes execute. There is also no defence against `data:image/svg+xml,...<script>...</script>` in the schema layer.
Recommendation: Tighten `iconSchema.url` to allow only `https:`, `http:`, `data:image/{png,jpeg,gif,webp,svg+xml}`, and `blob:`. When inlining an SVG via `fetchAsDataUri`, run it through a minimal sanitizer that strips `<script>`, `<foreignObject>`, and `on*` attributes. Document the constraint in `docs/embedding.md` alongside the existing DOMPurify guidance for `description`.
Suggested commit ID: `SEC-01`
Status: New

**[2a] — MarkdownEditor sanitizer is correctly module-level loaded (verification)**
Severity: 🟢 Informational
Location: `src/components/MarkdownEditor/MarkdownEditor.tsx:11-20`, `sanitizeLinkUrl.ts`
Description: `sanitizeLinkUrl.ts` overrides Quill's `Link.sanitize` at module import time (before any `<MarkdownEditor>` mounts) and rejects `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` plus URL-encoded variants. `formats` allowlist on line 78 still matches the documented set (`['bold', 'italic', 'underline', 'strike', 'link']`). Verified end-to-end against SECURITY.md ledger.
Recommendation: No action — this is a verification record.
Status: New

**[2a] — No `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, or string-form `setTimeout`/`setInterval` in `src/` (including vendored code)**
Severity: 🟢 Informational
Description: grep across `src/` and `src/vendor/` returns zero hits for these sinks.
Status: New

---

### 2b. Embedder-Supplied Prop Trust Boundary

**[2b] — `useReticulyne().Model.set` escape hatch bypasses Zod schema validation**
Severity: 🟡 Medium
Location: `src/Reticulyne.tsx:250-270` (gatedSet inside `Model`)
Description: `Model.set(...)` gates on `editorMode !== 'EDITABLE'` but never runs the payload through `initialDataSchema.safeParse`. The documented `loadModel()` validates; `Model.set` does not. The in-source comment labels this as an "escape hatch" but the consequence isn't proportional to the warning. A host wiring `Model.set` to a remote payload (websocket, broker, third-party iframe message) inherits the validation surface and may not realise it.
Recommendation: Either (a) validate the payload through `initialDataSchema.safeParse` inside `gatedSet`, falling back to `onValidationError`, or (b) add explicit prose in `docs/embedding.md` stating that `Model.set` is unvalidated and the host MUST validate before calling. Pairs naturally with ROADMAP 1.6 (drop the escape hatch entirely).
Suggested commit ID: `SEC-02`
Status: New

**[2b] — `useReticulyne().Connector.update` patch is not validated**
Severity: 🟡 Medium
Location: `src/Reticulyne.tsx:325-372`
Description: `Connector.update(id, patch)` accepts `Partial<Pick<...>>` and passes it directly to `reducers.view({ action: 'UPDATE_CONNECTOR', payload: { id, ...patch } })` without per-field validation against `connectorSchema`. A host driving this from untrusted live-data could push out-of-enum `direction`, oversized `color` strings, or other contract violations into the store. Renderer is mostly switch-cased so immediate exploitation surface is small, but the contract is real.
Recommendation: Validate `patch` against a partial of `connectorSchema` inside `Connector.update`.
Suggested commit ID: `SEC-03`
Status: New

**[2b] — No `localStorage`/`sessionStorage` usage in `src/` (verification)**
Severity: 🟢 Informational
Description: grep `localStorage`/`sessionStorage` across `src/` returns zero hits. No legacy `isoflow-` storage keys to migrate. Persistence is host-driven via `onSave`.
Status: New

**[2b] — Zero `: any` types in `src/Reticulyne.tsx`, `src/standaloneExports.ts`, `src/types/` (verification)**
Severity: 🟢 Informational
Description: Public API is strictly typed end-to-end.
Status: New

---

### 2c. Supply Chain — npm Dependencies

**[2c] — `quill@2.0.3` XSS (`GHSA-v3m3-f69x-jf25`) — known and accepted**
Severity: 🟢 Low (already in ledger)
Location: transitive via `react-quill-new ^3.8.3 → quill ^2.0.3`
Description: Documented in `SECURITY.md` with two-layer mitigation (link-blot sanitizer + formats allowlist). `react-quill-new@3.8.3` is the latest published. No upstream patch path; ROADMAP 2.10 tracks the eventual swap to TipTap.
Recommendation: No action; cross-references the existing ledger.
Status: Recurring (residual ledger — `SECURITY.md`)

**[2c] — `pathfinding@0.4.18` is unmaintained (last release ~2022)**
Severity: 🟠 High
Location: `package.json:111` — `"pathfinding": "^0.4.18"`; used at `src/utils/pathfinder.ts:1`; mock at `src/__tests__/mocks/pathfindingMock.js`
Description: `npm view pathfinding` shows `time.modified ≈ 2022-07-13`, pinned at `0.4.18`. No upstream advisories presently, but no maintenance channel and a CommonJS-interop pain point (the dedicated `pathfindingMock.js` exists because `import PF from 'pathfinding'` resolves to `undefined`). The schema-side mitigation (`TILE_COORD_MAX = 1000` in `src/schemas/common.ts:13`) caps grid allocation as defence-in-depth, but any future advisory has no upstream patch path. `@types/pathfinding@0.0.6` is also frozen — 0.1.0 is now available.
Recommendation: Either (a) vendor the small A* / BFS subset that the editor actually uses (the algorithm is ~200 LOC), (b) fork-and-pin under `@qant-au/pathfinding`, or (c) replace with `ngraph.path`. Bump `@types/pathfinding` to `0.1.0` in either case. Document the decision in `SECURITY.md` alongside other residuals.
Suggested commit ID: `SEC-04`
Status: New
See also: ROADMAP cross-cutting design — "Treat the model as externally driven" (pathfinder is on the live-dashboard hot path).

**[2c] — Source maps shipped in published tarball**
Severity: 🟢 Low
Location: `dist/*.js.map` (5 files); `webpack/prod.config.js:27` (`devtool: 'source-map'`)
Description: `dist/index.js.map` etc. embed `sourcesContent` — full TypeScript source. Intentional per the inline comment in `webpack/prod.config.js:18-26` (OSS library, debugging convenience). Docker builds correctly disable source maps. The CI pack-contents check at `.github/workflows/ci.yml:35-49` validates top-level roots; any future webpack misconfig emitting maps outside `dist/` would not be caught.
Recommendation: If full disclosure is intentional (it is for a published MIT library), no change. Optionally tighten the pack-contents check to assert allowed file extensions inside `dist/`.
Suggested commit ID: `SEC-05`
Status: New

**[2c] — `dompurify@3.4.3` (transitive via `jspdf`) is several patches behind the 3.4 line**
Severity: 🟢 Low
Location: `npm ls dompurify` → `jspdf@4.2.1 → dompurify@3.4.3`; latest 3.4 is 3.4.8
Description: No present advisory on 3.4.3, but the 3.4 line received four patches. Drift is jspdf's responsibility, not Reticulyne's directly.
Recommendation: Watch for a `jspdf` bump; monitor GitHub Advisory Database for DOMPurify 3.4.x entries.
Status: New

**[2c] — `file-saver@2.0.5` stale (effectively unmaintained since 2020)**
Severity: 🟢 Low
Location: `package.json:106`; used at `src/utils/exportOptions.ts:2,37`; `src/components/MainMenu/useExportJson.ts:3`
Description: ~150-LOC `Blob`+`<a download>` wrapper; trivially replaceable with modern DOM APIs (`URL.createObjectURL` + `<a download>` + `revokeObjectURL`). Very low attack surface.
Recommendation: Either accept and document, or inline a ~20-LOC `saveAs` helper and drop both `file-saver` and `@types/file-saver`.
Suggested commit ID: `DEP-01`
Status: New

**[2c] — Verifications (informational)**
- `npm audit --omit=dev`: 2 low, both quill chain (documented). ✅
- peerDependencies correctly carry `react`, `react-dom`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `zustand`. ✅
- `overrides` block for `uuid ^11.1.1` (SEC6-01) and `qs ^6.15.2` (SEC7-01) present, traceable in git history. ✅

---

### 2d. Supply Chain — Vendored Code (`src/vendor/`)

**[2d] — Vendored isopacks have no provenance metadata**
Severity: 🟡 Medium
Location: `src/vendor/isopacks/` — `aws.js`, `azure.js`, `gcp.js`, `isoflow.js`, `kubernetes.js`, `utils/index.js` (each with sibling `.d.ts` shims)
Description: No `VERSION`, `README`, `PATCHES`, `CHANGELOG`, or source-of-truth manifest. Only git history is a single `chore: vendor @isoflow/isopacks into src/vendor/isopacks` commit. Upstream package is `@isoflow/isopacks` from the defunct upstream project. No pinned upstream version recorded, no documented sync procedure, no diff-against-upstream record. A future maintainer has no basis to evaluate whether to bump or whether a hypothetical CVE applies.
Recommendation: Add `src/vendor/isopacks/VENDOR.md` recording: (a) upstream source URL + git SHA / npm version, (b) sync date, (c) any local modifications, (d) closure criterion ("we can stop vendoring when…").
Suggested commit ID: `SEC-06`
Status: New

**[2d] — Vendor files contain no executable-content sinks (verification)**
Severity: 🟢 Informational
Description: Zero occurrences of `eval(`, `new Function(`, `dangerouslySetInnerHTML`. Payload is data: SVG icons base64-encoded inside webpack-emitted IIFE wrappers — inert static data.
Status: New

---

### 2e. Published Package Surface (`dist/`)

**[2e] — `package.json` lacks a `prepublishOnly` script to ensure `dist/` is fresh before publish**
Severity: 🟢 Low
Location: `package.json:44-56`
Description: A stale `dist/` could be published if the maintainer forgets `npm run build` before `npm publish`. The CI release workflow currently builds (`release.yml:28`), but the safety net is workflow-only. Belt-and-braces.
Recommendation: Add `"prepublishOnly": "npm run lint && npm test && npm run build"` to scripts. Catches local-publish footguns.
Suggested commit ID: `BLD-01`
Status: New

**[2e] — Verifications (informational)**
- No `.env`, fixture, test data, or dev-only files in `dist/` (8.2 MB total, all expected). ✅
- `files` allowlist tight: `["dist","README.md","LICENSE"]`. ✅
- CI pack-contents check enforces it (`.github/workflows/ci.yml:35-49`). ✅
- `exports` map exposes only `.`, `./standalone`, `./package.json`. ✅
- `sideEffects: ["*.css", "**/GlobalStyles.*"]` is correct for Emotion/MUI runtime style injection. ✅
- `tsconfig.build.json` correctly excludes `index.tsx`, `index-docker.tsx`, examples, fixtures, vendor, tests, e2e from `.d.ts` emit. ✅

---

### 2f. Docker / nginx Surface

**[2f] — No `Strict-Transport-Security` header**
Severity: 🟡 Medium
Location: `docker/nginx.conf` (server block and `location = /index.html`)
Description: HSTS not set. Image is intended for deployment behind a TLS-terminating reverse proxy in production. Without HSTS, a downgrade-attacker on the same network as a client can MITM the first request before TLS is forced. Standard belt-and-braces.
Recommendation: `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;` in both blocks. Note in `SECURITY.md` that the header assumes deployment behind HTTPS-only ingress.
Suggested commit ID: `SEC-07`
Status: New

**[2f] — `.dockerignore` does not exclude `.env*`, planning docs, `testing/`, or `.idea/`**
Severity: 🟢 Low
Location: `.dockerignore` (current 28 lines)
Description: Build context includes `.env.graphify`, `testing/`, `code-review-instructions.md`, `ROADMAP.md`, `TODO.md`, `CLAUDE.md`, `SECURITY.md`, `CHANGELOG.md`, `.idea/`. Multi-stage Dockerfile discards them (only `${DIST_DIR}` is copied to the nginx stage), so **the runtime image is unaffected**. However:
- Build context upload to the Docker daemon is unnecessarily large.
- Build-stage layer cache can leak if pushed to a registry that retains intermediate layers (some CI builders do this for debugging).
- A future `git add .` after creating a real `.env` would not be caught by `.dockerignore`.
Recommendation: Add `.env*`, `testing/`, `code-review-instructions.md`, `ROADMAP.md`, `TODO.md`, `CLAUDE.md`, `SECURITY.md`, `CHANGELOG.md`, `.idea/` to `.dockerignore`.
Suggested commit ID: `BLD-02`
Status: New

**[2f] — `Referrer-Policy: no-referrer-when-downgrade` is the weakest acceptable policy**
Severity: 🟢 Low
Location: `docker/nginx.conf:43`
Description: Leaks full URL on same-protocol navigations. `strict-origin-when-cross-origin` (modern default) is equally compatible with Google Fonts and leaks less.
Recommendation: Tighten to `strict-origin-when-cross-origin`.
Suggested commit ID: `SEC-08`
Status: New

**[2f] — No `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`**
Severity: 🟢 Low
Location: `docker/nginx.conf`
Description: Not strictly required (editor doesn't use `SharedArrayBuffer`) but cheap defence-in-depth against Spectre-class side channels and cross-origin leaks.
Recommendation: Add `Cross-Origin-Opener-Policy "same-origin"` and `Cross-Origin-Resource-Policy "same-origin"` for static assets. Defer COEP until cross-origin isolation is needed.
Suggested commit ID: `SEC-09`
Status: New

**[2f] — Verifications (informational)**
- `restart.sh` makes no remote fetches except localhost healthchecks. ✅
- CSP `script-src 'self'` is tight; no `unsafe-eval`. ✅
- `style-src 'unsafe-inline'` is documented in SECURITY.md and structurally required by Emotion/MUI. ✅
- Docker builds disable source maps; nginx will not serve TypeScript to standalone-image visitors. ✅
- `nginxinc/nginx-unprivileged:1.30-alpine`, nginx user (uid 101), `EXPOSE 8080`, `HEALTHCHECK` present. ✅
- `client_max_body_size` is nginx default (1MB). SPA receives no POST bodies. Acceptable. ✅

---

### 2g. Secrets & Credential Exposure

**[2g] — Live `MOONSHOT_API_KEY` in `.env.graphify` on disk**
Severity: 🟠 High
Location: `/Users/adam/Projects/reticulyne/.env.graphify`
Description: The file contains an active `sk-...` value, not a placeholder. The file IS gitignored (`/.env.graphify` at `.gitignore:38`) and verified not in git history. **However:**
- Plaintext on local disk; any local-malware threat model captures it instantly.
- Not in `.dockerignore` (see [2f]) — leaks into Docker build context.
- Format starts with `sk-...`, consistent with a Moonshot AI (Kimi) API key. If billing is attached, anyone with disk read access can rack up charges.
Recommendation: Confirm whether the key is still active and rotate it. Move secrets to a system keyring or `direnv`/`1password-cli`/`op` lookup at runtime rather than a plaintext dotfile. At minimum, add `.env*` to `.dockerignore` (covered in [2f]).
Suggested commit ID: `SEC-10`
Status: New

**[2g] — Verifications (informational)**
- No real secrets in `src/`, `docs/`, `webpack/`, `docker/`. Keyword matches are documentation comments and base64 SVG payloads in vendored isopacks (the literal substring `xlink` and similar).
- `git log --all --diff-filter=A` for `.env`/`*.pem`/`*.key`/`*.p12`/`*.pfx` returns empty — no secret files ever committed.
- `.npmrc` correctly routes auth through `${GITHUB_TOKEN}`.

---

### 2h. Network Egress from the Browser

**[2h] — `exportAsVectorSvg` fetches arbitrary icon URLs subject to embedder's CSP `connect-src`**
Severity: 🟡 Medium
Location: `src/utils/exportOptions.ts:142` (`const res = await fetch(src);` inside `fetchAsDataUri`)
Description: When the user clicks "Export as vector SVG", `fetchAsDataUri` walks every `<img>` in the live DOM and `fetch()`es `imgEl.src`, which is `icon.url` from the model. With the standalone Docker image's CSP `connect-src 'self'`, cross-origin fetches are blocked. For embedders inheriting a permissive host CSP, an attacker who can poison `initialData.icons[*].url` can force the user's browser to issue arbitrary cross-origin GETs at export time. The response body is inlined into the export file — never sent off-machine — so this is **not** an exfil primitive, but it is a "use the user's session cookies to probe an internal HTTP service" primitive when the host CSP doesn't block it.
Recommendation: In `fetchAsDataUri`, validate `src` against an allowlist of safe schemes (`https:`, `data:`, `blob:`, and same-origin `http:` / relative URLs) before issuing the fetch. Document this constraint in `docs/embedding.md`. Pairs with [2a] (icon URL schema tightening).
Suggested commit ID: `SEC-11`
Status: New

**[2h] — Verifications (informational)**
- No `axios`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`, or `EventSource` usage in `src/`. ✅
- Only `new Image()` (`src/utils/exportOptions.ts:94`) is for measuring rendered-PNG dimensions in `exportAsPdf`, uses a local data URL — no network. ✅
- No telemetry / analytics / error-reporting beacons. ✅

---

## Section 3: Performance

Use `PRF-NN` for suggested commit IDs.

### 3a. Render Hot Paths

**[3a] — `useInteractionManager` subscribes to whole-store via `(state) => state` and rebinds 4 `window` listeners per pointermove**
Severity: 🔴 Critical (impact) / 🟠 High (severity given canvas-editor expectations)
Location: `src/interaction/useInteractionManager.ts:46-51,55,73,125`
Description:
```ts
const uiState = useUiStateStore((state) => { return state; });
const model = useModelStore((state) => { return state; });
```
Both selectors return the whole store object. `onMouseEvent` calls `uiState.actions.setMouse(nextMouse)` on every pointermove, mutating the store and changing the `uiState` reference. The `useCallback` for `onMouseEvent` has `[model, scene, uiState, rendererSize]` deps — invalidated each move. The big `useEffect` at line 125 then re-binds `window.addEventListener('pointermove', ...)` + `pointerdown` + `pointerup` + `contextmenu` + `wheel` listeners on every move. On a 120 Hz pointer (modern macOS / gaming mice), this is hundreds-to-thousands of listener add/remove cycles per second.
Recommendation: Narrow selectors — `useUiStateStore(s => s.mode)`, `s => s.actions`, `s => s.rendererEl` etc. separately. Stash live `uiState` / `model` references in `useRef`s updated in a tiny effect; `onMouseEvent` reads from the ref so it doesn't depend on changing references.
Suggested commit ID: `PRF-01`
Status: New

**[3a] — `useKeyboardShortcuts` re-binds `keydown` listener on every pointermove**
Severity: 🟠 High
Location: `src/interaction/useKeyboardShortcuts.ts:45-47, 372-393`
Description: `mousePosition` (used only as the `tile:` payload for the `T` textbox tool) is in the effect's dep array. Every pointermove tick changes `mousePosition.tile`, invalidates the effect, removes + re-adds `window.addEventListener('keydown', ...)`. `currentView` (which changes per model mutation, i.e. per-drag-frame) is similarly in deps.
Recommendation: Read `mousePosition` / `currentView` from a `useRef` synced via a separate effect, OR call `useUiStateStore.getState()` at handler-fire time. The `onKeyDown` body is the sole consumer.
Suggested commit ID: `PRF-02`
Status: New

**[3a] — `useScene` subscribes to whole `model` and `scene` stores; consumers re-render on every mutation**
Severity: 🟠 High
Location: `src/hooks/useScene.ts:27-29, 39-82`
Description: `const model = useModelStore((state) => state)` and `const scene = useSceneStore((state) => state)` subscribe to entire stores. Every model mutation re-runs the hook. The `useMemo` blocks at 39-82 merge `{ ...CONNECTOR_DEFAULTS, ...connector, ...sceneConnector }` per connector on each re-render — fresh object identity per item per render, defeating any downstream `React.memo`. Same for `rectangles` and `textBoxes`.
Recommendation: Split `useScene` into narrow hooks (`useSceneConnectorsList`, `useSceneItemsList`, …) each component subscribes to itself; or memoize per-id via a `useMemo`-tracked `Map`. Pair with React.memo on leaf list components (`Connector`, `Node`, `Rectangle`, `TextBox`).
Suggested commit ID: `PRF-03`
Status: New

**[3a] — `Renderer.tsx` cascades whole-scene re-renders to every layer; no `React.memo` on SceneLayers leaves**
Severity: 🟠 High
Location: `src/components/Renderer/Renderer.tsx:41`; `src/components/SceneLayers/Connectors/Connectors.tsx:35`; `Nodes.tsx:14`; `Rectangles.tsx:15`
Description: `Renderer` calls `useScene()` and passes fresh `items`/`connectors`/`rectangles`/`textBoxes` references on every model mutation. Child list components then call `[...connectors].reverse()` / `[...nodes].reverse()` / `[...rectangles].sort().reverse()` per render — O(n) lists rebuilt each tick. No `React.memo` anywhere in the SceneLayers directory.
Recommendation: Wrap `Connectors`, `Nodes`, `Rectangles`, `TextBoxes` parents in `React.memo`. Move `.reverse()`/`.sort()` into `useMemo`s keyed on the underlying list reference.
Suggested commit ID: `PRF-04`
Status: New

**[3a] — Pathfinder runs on every pointermove during CONNECTOR draw mode**
Severity: 🟡 Medium (Confidence: Low — depends on diagram size)
Location: `src/interaction/modes/Connector.ts:18-51`; `src/stores/reducers/connector.ts:22-52`; `src/utils/pathfinder.ts`
Description: Connector mousemove → `scene.updateConnector(...)` → reducer → `syncConnector` → `getConnectorPath` → `findPath` (A* over `collectObstacleTiles` of all items + every tile of every rectangle). Per-move cost O(N + R·A) before A*. Acceptable on slow movements; stacks on fast drags. `getAllAnchors` (full scan of all connectors) is constructed inside `syncConnector` even when only one anchor moved.
Recommendation: Memoize obstacle tiles keyed on model+view reference (rebuild only when items/rectangles change). Skip `findPath` when the dragged anchor's *tile* (not pixel) is unchanged. Throttle pointermove to rAF.
Suggested commit ID: `PRF-05`
Status: New

**[3a] — `DragItems` writes through `recordPriorState` on every pointermove**
Severity: 🟡 Medium
Location: `src/interaction/modes/DragItems.ts:89-114`; `src/hooks/useScene.ts:101-118`
Description: Every drag tick calls `updateViewItem`/`updateRectangle`/`updateTextBox`/`updateConnector` → `setState` → `historyStore.actions.recordPriorState({...})`. Even though the prior-state capture is conceptually "first mutation of burst", the function still calls `clearTimeout`+`setTimeout`+`set({...})` on the history store on **every** mousemove, firing a notification to every history-store subscriber (e.g. undo-button enable check) per move.
Recommendation: Make `recordPriorState` a true no-op after the first burst-call until the debounce fires. Skip `set` if `pendingPrior` is already populated.
Suggested commit ID: `PRF-06`
Status: New

**[3a] — `useScene.setState` callback re-creates on every history-store mutation**
Severity: 🟡 Medium
Location: `src/hooks/useScene.ts:91-93, 101-118`
Description: `const historyStore = useHistoryStore(state => state)` — subscribes to whole store. `setState`'s `useCallback` has `[model.actions, scene.actions, historyStore.isApplying, historyStore.actions]` deps; `historyStore.isApplying` lives behind a wider subscription that fires on every `pendingPrior` / `commitTimer` / `past` / `future` change. Per-drag-frame this invalidates `setState`, cascading invalidations through every callback (`createModelItem`, `updateViewItem`, …).
Recommendation: Use two separate selectors — `useHistoryStore(s => s.isApplying)` and `useHistoryStore(s => s.actions)` (the latter is stable). Do not subscribe to the full history store.
Suggested commit ID: `PRF-07`
Status: New

**[3a] — `SceneLayer` runs GSAP tween per layer on every pan/zoom**
Severity: 🟡 Medium (Confidence: Low — would need profile to confirm)
Location: `src/components/SceneLayer/SceneLayer.tsx:29-40`
Description: Each of ~7 `<SceneLayer>` instances installs `gsap.to(...)` in a useEffect dep'd on `[zoom, scroll]`. A pan/wheel tick triggers 7 simultaneous tweens. GSAP coalesces, but the JS bookkeeping isn't free.
Recommendation: Hoist a single transformed parent that all SceneLayers nest inside; animate once.
Suggested commit ID: `PRF-08`
Status: New

**[3a] — `Cursor` re-renders per pointer event with non-memoized chroma alpha computation**
Severity: 🟢 Low
Location: `src/components/Cursor/Cursor.tsx:8-13`
Description: `chroma(theme.palette.primary.main).alpha(0.5).css()` is recomputed every render. The cursor reads `state.mouse.position.tile` which is necessarily fresh per move; but the fill expression and `IsoTileArea` are stable inputs.
Recommendation: `useMemo` the fill expression on theme; consider memoizing `IsoTileArea` itself.
Suggested commit ID: `PRF-09`
Status: New

**[3a] — Lint check (verification)**
Severity: 🟢 Informational
Description: `npm run lint` exits clean. `react-hooks/exhaustive-deps`, `refs`, `set-state-in-effect`, `set-state-in-render` all pass at **error** level.

---

### 3b. Bundle Size

**[3b] — MUI icon barrel imports in 10+ files (consumer tree-shake liability)**
Severity: 🟠 High (downstream consumer footprint)
Location: `src/components/ZoomControls/ZoomControls.tsx:5`; `MainMenu/MainMenu.tsx:19`; `ItemControls/NodeControls/NodeControls.tsx:6`; `ItemControls/IconSelectionControls/IconCollection.tsx:6`; `Label/ExpandButton.tsx:5`; `HelpButton/HelpButton.tsx:1`; `UiOverlay/TitleBar.tsx:8`; `ItemControls/components/DeleteButton.tsx:1`; `ItemControls/IconSelectionControls/Searchbox.tsx:2`; `ItemControls/TextBoxControls/TextBoxControls.tsx:9`
Description: All use the barrel form `from '@mui/icons-material'`. MUI's package barrel IS tree-shakable in modern bundlers with sideEffects awareness; the Reticulyne prod config externalises `^@mui\//` so it doesn't get bundled here — meaning the consumer's bundler does the tree-shake. A consumer using CommonJS or a non-tree-shaking bundler ends up shipping the entire ~6 MB icon barrel.
Recommendation: Switch all to per-icon imports: `from '@mui/icons-material/Search'` etc. The single existing example at `src/examples/ExamplesSidebar.tsx:14-15` shows the right pattern.
Suggested commit ID: `PRF-10`
Status: New

**[3b] — No code splitting / dynamic imports in the library**
Severity: 🟠 High
Location: `dist/index.js` (1.0 MB); zero `import()` calls in production code paths
Description: Heavy MUI components (`ExportImageDialog`, `ExportSvgDialog`, `KeyboardShortcutsDialog`, `MarkdownEditor`/Quill) are all statically imported into the main `index.js`. A "diagram viewer" consumer who never opens export dialogs ships ~1 MB of code they'll never execute.
Recommendation: Lazy-load `ExportImageDialog`, `ExportSvgDialog`, `KeyboardShortcutsDialog`, `MarkdownEditor` via `React.lazy()`. Quill is the heaviest single chunk.
Suggested commit ID: `PRF-11`
Status: New

**[3b] — Isopacks (2.5 MB) bundled only into the examples Docker image, not the npm tarball (verification)**
Severity: 🟢 Informational
Description: `src/vendor/isopacks/*` (azure 1.0M, aws 740K, isoflow 344K, gcp 272K, kubernetes 124K) are imported only by `src/examples/initialData.ts`. Webpack tree-shakes them from the library `index.js`. `files: ["dist", …]` keeps them out of the published tarball. The docker examples image (port 2223) carries the +2.5 MB — acceptable for a demo.
Recommendation: No action for the library; optionally lazy-load per-pack in the examples container.
Status: New

**[3b] — SVG inlined as data URLs via `asset/inline` loader**
Severity: 🟢 Low
Location: `webpack/base.config.js:37-41`
Description: Every `.svg` import becomes a base64 data URL embedded in JS. Currently only one project SVG (`src/assets/grid-tile-bg.svg`, 4 KB, and `Grid` now generates inline anyway). Future SVG assets will bloat the JS.
Recommendation: Use `asset/resource` (or `asset` with a size threshold) for >4 KB SVGs.
Suggested commit ID: `PRF-12`
Status: New

---

### 3c. Asset & Image Handling

**[3c] — No `loading="lazy"` on icon `<img>` elements**
Severity: 🟡 Medium
Location: `src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon.tsx:23`; `NonIsometricIcon.tsx`
Description: Each diagram node renders an `<img>` for its icon. For diagrams with hundreds of nodes — especially zoomed out — every icon is fetched and decoded eagerly. URLs are commonly `data:` (no network) but decoding still happens.
Recommendation: Add `loading="lazy"` to both icon-type components. Free win for large diagrams.
Suggested commit ID: `PRF-13`
Status: New

**[3c] — `src/assets/grid-tile-bg.svg` may be dead asset**
Severity: 🟢 Low (Confidence: Low)
Location: `src/assets/grid-tile-bg.svg`
Description: The Grid generates the SVG inline at runtime (per `Grid.tsx:18-21`). The asset file may no longer be imported.
Recommendation: grep `grid-tile-bg` across `src/`; if no imports remain, delete.
Suggested commit ID: `QUA-01`
Status: New

---

### 3d. Store & Data Model

**[3d] — `useScene`'s connectors/rectangles/textBoxes memos spread defaults per item per render** (already covered above as PRF-03 — restated as a 3d pattern)
Severity: 🟠 High
Location: `src/hooks/useScene.ts:51-82`
Description: Even after memoization, `{ ...CONNECTOR_DEFAULTS, ...connector, ...sceneConnector }` rebuilds fresh references per item. Downstream `React.memo` doesn't help unless a custom equality is supplied.
Recommendation: Memoize per-id (`Map<id, merged>`) or move the defaults merge into the leaf component using a per-id selector.
Suggested commit ID: `PRF-03` (same item)
Status: New

**[3d] — `connectorOverlays` is mutated via copy-spread on every pulse**
Severity: 🟡 Medium (Confidence: Low — fine for sparse pulses, quadratic for dense)
Location: `src/Reticulyne.tsx:381-399`; `src/hooks/useScene.ts:278-303`
Description: `pulseConnector` does `{ ...current.connectorOverlays, [id]: {...} }` then schedules a delete + re-set. For dense live-dashboard pulse streams (many connectors pulsing concurrently), every pulse rebuilds the whole map.
Recommendation: Consider a flat `Map<id, OverlayState>` with `useSyncExternalStore` rather than re-spreading the dictionary.
Suggested commit ID: `PRF-14`
Status: New

**[3d] — Verifications (informational)**
- Immer is used selectively at reducer level via `produce(state, draft => {...})`. Zustand stores themselves don't use immer middleware — deliberate. ✅

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality

**[4a] — `console.log` of caught error in ExportImageDialog (inconsistent with house style)**
Severity: 🟠 High (style consistency)
Location: `src/components/ExportImageDialog/ExportImageDialog.tsx:89`
Description: Uses `console.log(err)` — not `.error`, no `[reticulyne]` prefix, sits next to `setExportError(true)` so the user already sees an `<Alert severity="error">` toast. Every other diagnostic in the codebase uses `console.error('[reticulyne] ...', err)` gated on `NODE_ENV` where appropriate.
Recommendation: Either delete (UI signal is sufficient) or upgrade to `console.error('[reticulyne] image export failed:', err)`.
Suggested commit ID: `QUA-02`
Status: New

**[4a] — `useImportFile` errors are console-only — no user-visible signal on parse failure**
Severity: 🟠 High (UX gap)
Location: `src/components/MainMenu/useImportFile.ts:31, 38, 73`
Description: When a user opens a malformed JSON file, the file picker closes and nothing happens in the UI. Schema-validation failures (post-parse) route through `onValidationError`, but parse failures bypass it (the cast on line 44 satisfies the signature, but a JSON parse error never reaches `safeParse`).
Recommendation: Route parse failures through `onValidationError` (synthesise a `ZodIssue`-shaped object), or extend the callback signature. At minimum, surface a toast.
Suggested commit ID: `BUG-01`
Status: New
See also: TODO.md — empty despite reference markers (D6-17)

**[4a] — `: any` / `as any` — zero hits (verification)**
Severity: 🟢 Informational
Description: `noImplicitAny: true` + `strict: true` in `tsconfig.json` enforce this. ✅

**[4a] — Lint clean (verification)**
Severity: 🟢 Informational
Description: `npm run lint` returns zero warnings, zero errors. ✅

**[4a] — Constants centralised in `src/config.ts` (verification)**
Severity: 🟢 Informational
Description: Every magic number lives here with derivation comments. The lone TODO at line 16 is about file organisation, not centralization. ✅

**[4a] — `ModelStore['actions']` Zustand internals leak via `standaloneExports`**
Severity: 🟡 Medium
Location: `src/standaloneExports.ts:8` (`export type * from 'src/types/model'`); `src/types/model.ts:56-61`, `src/types/scene.ts:78-83`, `src/types/ui.ts:194-231`
Description: `ModelStore = Model & { actions: { get: StoreApi<ModelStore>['getState']; set: StoreApi<ModelStore>['setState'] } }` exposes `zustand.StoreApi` in the published `.d.ts`. Same for `SceneStore`, `UiStateStore`. An embedder who imports `ModelStore` could start poking at `actions.set` directly, accidentally freezing the internal store shape as part of the public API.
Recommendation: Move `ModelStore`, `SceneStore`, `UiStateStore`, `UiStateActions`, `UiState`, `Scene`, `SceneConnector`, `SceneTextBox`, `SceneConnectorOverlay`, `Mouse`, `Scroll`, all `Mode` variants, `ItemControls`, `ContextMenu`, `IconCollectionState`, `ClipboardEntry` into an `src/types/internal.ts` not re-exported via `standaloneExports.ts` or main entry. ROADMAP 1.6 explicitly calls this out.
Suggested commit ID: `QUA-03`
Status: New

**[4a] — `ConnectorStyle = keyof typeof connectorStyleOptions` is a documented latent typing bug**
Severity: 🟡 Medium
Location: `src/types/model.ts:38-46`
Description: Author has explicitly flagged: produces `'0' | '1' | 'length' | …` rather than `'SOLID' | 'DOTTED' | 'DASHED'`. Comment says "tracked in TODO.md" — but TODO.md is empty (see D6-17).
Recommendation: One-line fix in place: `(typeof connectorStyleOptions)[number]['value']` or `keyof typeof connectorStyleOptionsByKey`. Whichever is intended.
Suggested commit ID: `QUA-04`
Status: New

**[4a] — TODO/FIXME density is exceptionally low (verification)**
Severity: 🟢 Informational
Description: Three TODO markers total in non-test `src/`: `src/config.ts:16` (organisation), `src/interaction/useInteractionManager.ts:21` (mode notation), `src/types/model.ts:45` (the latent typing bug above). No FIXME / XXX / HACK. Lower than typical for production codebases. ✅

---

### 4b. Naming Consistency (isoflow → reticulyne)

**The rename sweep is exceptionally clean. Remaining `isoflow` references in `src/`:**

| Location | Status |
|---|---|
| `src/vendor/isopacks/isoflow.js` | 🟢 Intentional — icon pack ID preserved per RNM-09 / CHANGELOG L48-51 |
| `src/examples/initialData.ts:3, 10` | 🟢 Imports the vendored pack by name |
| `src/schemas/__tests__/limits.test.ts:63, 65` | 🟢 Tests the bundled pack URL size |
| `src/schemas/common.ts:49` | 🟢 Comment referencing bundled isopack payload sizes |
| `src/config.ts:139` | 🟢 Comment explaining LINK.DISCORD removal historical context |

**[4b] — Stale `Isoflow` reference in e2e comment**
Severity: 🟡 Medium (trivial copy-fix)
Location: `e2e/examples-picker.spec.ts:148`
Description: `// ReadonlyMode uses the same Airport initialData but wraps Isoflow` — should read `Reticulyne`.
Recommendation: One-character-block fix.
Suggested commit ID: `QUA-05`
Status: New

**[4b] — Verifications (informational)**
- Zero `localStorage` references (no legacy `isoflow-` storage keys). ✅
- `window.Reticulyne` set; `window.__RETICULYNE_E2E__` consumed. No `window.Isoflow` / `window.__ISOFLOW_E2E__` remain. ✅
- No `IsoflowProps`, `IsoflowErrorBoundary`, `useIsoflow` back-compat exports. (Trade-off — see S5-04.) ✅
- All `console.*` log prefixes use `[reticulyne]`. ✅

---

### 4c. React 19 Migration State

**[4c] — Two `eslint-disable-next-line` escapes for the promoted rules — audit follow-up**
Severity: 🟡 Medium
Location: `src/Reticulyne.tsx:201` (`exhaustive-deps` on `modeAwareInitialData` memo); `src/components/ExportImageDialog/ExportImageDialog.tsx:133` (`set-state-in-effect` on cache invalidation)
Description: Both are justified by inline comments. The first is legitimate (intentional dep omission for theme-switching). The second is slightly smelly — could be restructured as a `useMemo` keyed on inputs returning an export key, with separately tracked image data.
Recommendation: Leave both, document in a follow-up audit pass (`QUA-NN`) so they're not forgotten when React's compiler-style rules tighten further.
Suggested commit ID: `QUA-06`
Status: New

**[4c] — React 19's new APIs not adopted anywhere**
Severity: 🟠 High (forward-looking) / 🟢 Low (not a defect)
Location: codebase-wide
Description: Zero hits for `useActionState`, `useFormStatus`, `<Suspense`, `React.use(`. Codebase is React-19-*compatible* (passes strict hook rules) but not React-19-*idiomatic*. Async work (file imports, image exports, deferred fit-to-view) still uses React 18 `useEffect` + ref-stash + `requestAnimationFrame` patterns.
Recommendation: Not a defect — migration was framed as "passes new rules". File a forward-looking FEA item if a future feature has natural Action / Suspense fit (e.g. `loadModel` could return a Promise consumers wrap in `<Suspense>`).
Suggested commit ID: `FEA-01` (forward-looking)
Status: New

**[4c] — Verification: lint clean for all four react-hooks rules at error level**
Severity: 🟢 Informational
Description: The eslint config promotes `react-hooks/refs`, `set-state-in-effect`, `set-state-in-render`, and `exhaustive-deps` to **error**. Codebase passes. The code-review-instructions document describes these rules as still being at warning level — outdated; eslint config is the authoritative state.

---

### 4d. Testing

**Overall coverage:** 45 Jest unit suites, 14 Playwright E2E specs, zero `it.skip` / `test.skip` / `xit` / `xtest`. Well-distributed across schemas, reducers, interaction modes, stores, and the Quill XSS sanitizer.

**[4d] — Thin coverage on `useReticulyne` Connector namespace**
Severity: 🟡 Medium
Location: `src/__tests__/Reticulyne.readonly.test.tsx` is the only test exercising the hook
Description: No direct test for `Connector.get`/`update`/`pulse`; no test for `loadModel` from the hook (only `initialData` prop is tested); no test for the `editorMode` gate on `Connector.update`'s `NON_INTERACTIVE` branch.
Recommendation: Add a `useReticulyne` Connector-namespace suite covering gates, pulse supersede semantics, and `update` validation (post-SEC-03).
Suggested commit ID: `QUA-07`
Status: New

**[4d] — No XSS test for the MarkdownEditor body (only for the link sanitizer)**
Severity: 🟡 Medium
Location: `src/components/MarkdownEditor/__tests__/`
Description: `sanitizeLinkUrl.test.ts` is thorough on the link blot. But Quill itself controls HTML body sanitization. No test asserts that an `<img onerror=alert(1)>` pasted into a node `description` gets stripped. Quill's formats allowlist is load-bearing per SECURITY.md but is not adversarially tested. `DOMPurify` is not imported anywhere in `src/` (verified via grep) — the library deliberately relies on host sanitization for `initialData.description`.
Recommendation: Add a Quill-body XSS test: set `description = '<img src=x onerror=alert(1)>'`, render, assert no `onerror` attribute survives.
Suggested commit ID: `QUA-08`
Status: New

**[4d] — No import → export round-trip test**
Severity: 🟡 Medium
Location: `src/__tests__/`
Description: `useImportFile.test.tsx` tests JSON parse failure paths; no test asserts `export → import` produces a byte-equal model.
Recommendation: Add a round-trip test via the `INITIAL_DATA → save → load` path.
Suggested commit ID: `QUA-09`
Status: New

**[4d] — Fixtures use realistic shapes (verification)**
Severity: 🟢 Informational
Description: `src/fixtures/{colors,icons,model,modelItems,views}.ts` used in tests. Spot-checked `Reticulyne.smoke.test.tsx` and `Reticulyne.save.test.tsx`: realistic data, not toy `[{ id: '1' }]`. ✅

---

### 4e. Configuration & Environment

**[4e] — Webpack configs are DRY (verification)**
Severity: 🟢 Informational
Description: `webpack/base.config.js` owns shared loaders + TsconfigPathsPlugin + DefinePlugin. The 17-line preamble cites a real prior bug (case-sensitive SVG regex drift between configs) as motivation. Each env-specific file is purely declarative. ✅

**[4e] — tsconfig.build.json is appropriately stricter than tsconfig.json (verification)**
Severity: 🟢 Informational
Description: Build adds `declaration: true`, `emitDeclarationOnly: true`, and excludes examples, fixtures, vendor, tests from `.d.ts` emit. Correct. ✅

**[4e] — Dev port 3000 hardcoded (minor)**
Severity: 🟢 Low
Location: `webpack/dev.config.js:25`
Description: Single place to change; only one consumer. Leave as-is unless a second consumer of the port emerges.
Status: New

---

### 4f. Logging & Observability

**[4f] — Top-level error boundary correctly wired (verification)**
Severity: 🟢 Informational
Description: `src/components/ReticulyneErrorBoundary/ReticulyneErrorBoundary.tsx` wraps `<App>` inside `<Reticulyne>` (Reticulyne.tsx:204). `componentDidCatch` calls `onError(error, info)` if supplied + `console.error` only in non-production. Render fallback is the host-supplied `fallback` ReactNode, otherwise an accessible MUI Box with `role="alert"`. ✅

**[4f] — User-facing errors are structured (verification)**
Severity: 🟢 Informational
Description: Schema validation → `onValidationError(ZodIssue[])` documented at `types/reticulyneProps.ts:56-67`. Render errors → `onError(Error, ErrorInfo)` on `<Reticulyne>`. Export failure → `setExportError(true)` → `<Alert>`. No `window.alert` anywhere. ✅

**[4f] — Import-error UX gap (cross-ref [4a] / BUG-01)**
Severity: 🟠 High (same item, restated)
Location: `src/components/MainMenu/useImportFile.ts:31, 38, 73`
Status: New (single finding, listed in 4a as `BUG-01`)

**[4f] — No fetch-based telemetry / analytics (verification)**
Severity: 🟢 Informational
Description: `fetch` calls in `src/` are limited to icon dataURI conversion in `exportOptions.ts`. No analytics beacon, no opt-out concern. ✅

---

## Section 5: Public API Stability & Embedding Contract

Use `FEA-NN` for code fixes, `DOC-NN` for documentation fixes.

**[S5] — `useReticulyne()`-returned methods have no TSDoc / JSDoc**
Severity: 🟠 High
Location: `src/Reticulyne.tsx:224-420`
Description: `ReticulyneProps` fields carry rich JSDoc surfaced in IDE hover. The hook's exports (`getModel`, `loadModel`, `setEditorMode`, `setZoom`, `incrementZoom`, `decrementZoom`, `rendererEl`, `Connector.get`, `Connector.update`, `Connector.pulse`) have inline `//` comments for maintainers but no `/** */` blocks — embedders calling `useReticulyne()` get nothing in VS Code hover. Behaviour gates ("no-op outside EDITABLE", "bypasses undo stack", "supersedes any in-flight pulse") live only in `docs/embedding.md`.
Recommendation: Convert each returned member's leading comment into a TSDoc block on the local `const`/`useMemo` so the `.d.ts` carries it. Bare minimum: `loadModel`, `setEditorMode`, `Connector.update`, `Connector.pulse`.
Suggested commit ID: `FEA-02`
Status: New
See also: ROADMAP 1.6.

**[S5] — `useReticulyne`'s `Model` / `uiState` escape hatches are not visibly `@deprecated`**
Severity: 🟠 High
Location: `src/Reticulyne.tsx:416-419`
Description: Documented as "escape hatches" only in `docs/embedding.md` (L335-336) and an in-source comment. IDE autocomplete shows them as siblings of `getModel`/`loadModel` etc., indistinguishable in rank. ROADMAP 1.6 plans to drop them in a breaking change.
Recommendation: `/** @deprecated Escape hatch — prefer the typed accessors above; will be removed before v1.0. */` on `Model` and `uiState` object-literal keys. TypeScript honours `@deprecated` on object members; most IDEs strike them through.
Suggested commit ID: `FEA-03`
Status: New

**[S5] — `docs/api.md` prop table missing 9 props including breaking-default-change `themeMode`**
Severity: 🟠 High
Location: `docs/api.md:24-37` vs `src/types/reticulyneProps.ts:27-176` vs `docs/embedding.md`
Description: `api.md` claims to be "every prop … contract" but stops at `onSave`. Missing: `enableAnimation`, `enableGlobalDragHandlers`, `themeMode` (breaking-change default), `exportTheme`, `nodeIndicatorComponent`, `connectorIndicatorComponent`, `highlightedItemId`, `iconCollections`, `showTitleBar`, `children`. The `useReticulyne` table at L108-119 also omits `Connector.get`/`update`/`pulse`.
Recommendation: Either bring `docs/api.md` up to parity with `docs/embedding.md` or restructure `api.md` as a thin index deferring to `embedding.md`. The current state lets an embedder reading only `api.md` miss `themeMode`'s breaking-change behaviour.
Suggested commit ID: `DOC-01`
Status: New

**[S5] — No `useIsoflow` back-compat alias despite CHANGELOG implying continuity**
Severity: 🟠 High
Location: `src/Reticulyne.tsx:422`; `CHANGELOG.md:22`
Description: CHANGELOG.md L22 says `useIsoflow` → `useReticulyne` "same return shape and semantics", but no `export { useReticulyne as useIsoflow }` shim exists. An embedder upgrading from `@qant-au/isoflow` and renaming the package finds `useIsoflow` referenced through their code breaks at TypeScript-error level with no soft-deprecation period. This is a defensible call for a 0.1.0 "reset" — but the docs should pick a side.
Recommendation: Either (a) add `export const useIsoflow = useReticulyne;` decorated with `/** @deprecated Renamed to useReticulyne. */` for one minor cycle, OR (b) add explicit "no back-compat shims; rename in your imports" wording to `CHANGELOG.md` and `docs/embedding.md`.
Suggested commit ID: `FEA-04`
Status: New

**[S5] — `ModelStore` / `UiStateStore` / `SceneStore` Zustand-shaped types leak through public types entry (same finding as 4a → QUA-03)**
Severity: 🟠 High
Location: `src/types/model.ts:56-61`; `src/types/scene.ts:78-83`; `src/types/ui.ts:194-231`; re-exported via `src/standaloneExports.ts:8`
Recommendation: Same as QUA-03 — move to `src/types/internal.ts`.
Suggested commit ID: `QUA-03` (same item)
Status: New

**[S5] — No SemVer commitment for 0.x stated anywhere**
Severity: 🟠 High
Location: `README.md`, `CHANGELOG.md` (no SemVer policy paragraph)
Description: CHANGELOG.md L7 cites SemVer adherence, but the 0.x SemVer contract is "anything may change in any minor". README's pre-rename retrospective references `v1.x → v4.7.0` as if mature; the rename to 0.1.0 framed as "naming reset, not content reset" creates ambiguity: stable (because content didn't change) or unstable (because version restarted)?
Recommendation: Add a short paragraph to `README.md` or `CHANGELOG.md`: "While on 0.x, minor releases may include breaking changes to props, hook return shape, or exported types. v1.0 will mark API stabilisation; until then, treat each minor as potentially breaking and read the release notes."
Suggested commit ID: `DOC-02`
Status: New

**[S5] — Standalone subpath omits enum object re-exports (`EditorModeEnum`, `MainMenuOptionsEnum`, etc.)**
Severity: 🟡 Medium
Location: `src/standaloneExports.ts`
Description: Standalone exports `INITIAL_DATA`, `INITIAL_SCENE_STATE`, schemas, reducers, but **not** `EditorModeEnum`, `MainMenuOptionsEnum`, `ProjectionOrientationEnum`, `DialogTypeEnum`, `LayerOrderingActionOptions`, `tileOriginOptions`, `ItemReferenceTypeOptions`, `AnchorPositionOptions`. Embedders writing a Node-side validator needing `EditorModeEnum` as a runtime value get nothing.
Recommendation: Add the enum const objects from `src/types/common.ts` to standaloneExports. Document which are runtime values vs which are types-only re-exports.
Suggested commit ID: `FEA-05`
Status: New

**[S5] — `useReticulyne()` worked example in `docs/embedding.md:340-371` is fragile under React 19 batching**
Severity: 🟡 Medium
Location: `docs/embedding.md:340-371`
Description: The round-trip example calls `setEditorMode('EDITABLE')` → `loadModel(data)` → `setEditorMode('EXPLORABLE_READONLY')` synchronously inside a `.then(...)`. Implementation reads `editorMode` from `editorModeRef.current`, which is only updated in a `useEffect` after the state lands (`Reticulyne.tsx:240-246`). Under React 19 automatic batching, `loadModel` reads the ref still pointing at `'EXPLORABLE_READONLY'` → logs the gate warning and returns.
Recommendation: Either restructure the example with `useEffect` chains across renders, or mount with `editorMode="EDITABLE"` from the start and transition. Verify with a real test before re-publishing.
Suggested commit ID: `DOC-03`
Status: New

**[S5] — `setView` only available via `uiState` escape hatch**
Severity: 🟡 Medium
Location: `src/types/ui.ts:195` vs `docs/embedding.md:323-336`
Description: `InitialData` accepts `view?: string` for initial activation; runtime view switching is only via `useReticulyne().uiState.setView(viewId)`. Not surfaced in the documented API.
Recommendation: Add `setView(viewId: string): void` to the documented surface, or document explicitly that view switching is escape-hatch only until v1.
Suggested commit ID: `FEA-06`
Status: New

**[S5] — Standalone subpath pulls in `zustand` at type-time**
Severity: 🟡 Medium (Confidence: Low — only matters for type-only Node consumers)
Location: `src/standaloneExports.ts:8`; `src/types/model.ts:21` (imports `StoreApi` from zustand)
Description: `docs/api.md:148-150` advertises the standalone subpath as "safe in Node environments (server-side validation, scripts)". At runtime that holds. But the **types** drag in `zustand`'s `StoreApi`. In a Node consumer running TypeScript validation, this is a transitive type dependency. Probably benign (zustand is a peerDep), but resolves cleanly if QUA-03 narrows the type surface.
Recommendation: Resolved by QUA-03 (move store types to internal).
Suggested commit ID: `QUA-03` (same item)
Status: New

**[S5] — Verifications (informational)**
- `EditorModeEnum` documented in `embedding.md` as the trio (`EDITABLE` / `EXPLORABLE_READONLY` / `NON_INTERACTIVE`). Embedders use literal strings in all examples; this is fine. ✅
- All cross-references between docs land on existing anchors. ✅

---

## Section 6: Documentation

Use `DOC-NN` for suggested commit IDs.

**[D6] — `docs/docker.md` documents a CSP that doesn't match `docker/nginx.conf`**
Severity: 🟠 High
Location: `docs/docker.md:85, 89` vs `docker/nginx.conf:54, 74`
Description: `docs/docker.md:85` documents CSP `img-src 'self' data: blob: https://reticulyne.io https://static.reticulyne.io`. Actual nginx.conf has `img-src 'self' data: blob:` (per RNM-04 the `reticulyne.io` origins were removed). L89 prose ("the CSP allows … `reticulyne.io` (vendored icon-pack image hosts)") is wrong.
Recommendation: Update `docs/docker.md:85` to remove `https://reticulyne.io https://static.reticulyne.io`, rewrite L89 to drop the claim.
Suggested commit ID: `DOC-04`
Status: New

**[D6] — `docs/quickstart.md:52` still teaches the removed `window.alert` behaviour**
Severity: 🟠 High
Location: `docs/quickstart.md:52`
Description: "Invalid data triggers an alert at mount and the editor renders empty." The `window.alert` was replaced by the `onValidationError` callback contract (or `console.error` fallback). `docs/embedding.md:61` already says so. quickstart.md teaches the old contract.
Recommendation: Replace with: "Invalid data is rejected by Zod; the editor renders empty and the failure is routed to `onValidationError` (or to `console.error` if you don't supply that prop)."
Suggested commit ID: `DOC-05`
Status: New

**[D6] — `docs/isopacks.md` references `ProcessedCollection` interface that isn't exported**
Severity: 🟠 High
Location: `docs/isopacks.md:25-30`; `README.md:62`
Description: Both docs cite `ProcessedCollection` as the contract. The type is **not exported** from `src/types/`, `src/standaloneExports.ts`, or `src/schemas/`. grep across source confirms it lives only in docs. The actual exported type is `Icons` (`Z.infer<typeof iconsSchema>`) and `Icon` from `src/types/model.ts`. Code flattens collections into `Icon[]` with optional `collection?: string` discriminator.
Recommendation: Either (a) actually export a `ProcessedCollection` type matching the documented shape + a `mergeCollections()` helper, OR (b) rewrite `isopacks.md` to describe the actual contract: `Icon[]` with optional `collection` field; show `{ id, name, icons }` grouping as a host-side convention. README L62's claim must follow.
Suggested commit ID: `DOC-06`
Status: New

**[D6] — `SECURITY.md` snapshot tag reads `v4.5.0` — stale**
Severity: 🟡 Medium
Location: `SECURITY.md:60`
Description: "Current counts (v4.5.0)" tag predates the rename to `@qant-au/reticulyne@0.1.0`.
Recommendation: Re-run `npm audit --omit=dev` and update to `Current counts (v0.1.0):` with refreshed numbers.
Suggested commit ID: `DOC-07`
Status: New

**[D6] — `docs/api.md:71` renamer artefact — `markmanx/reticulyne` should be `markmanx/isoflow`**
Severity: 🟡 Medium
Location: `docs/api.md:71`
Description: "The `'LINK.DISCORD'` identifier from earlier versions has been removed in v4.0.0 — it only ever pointed at upstream `markmanx/reticulyne`'s Discord." That repo doesn't exist; should read `markmanx/isoflow`.
Recommendation: Fix to `markmanx/isoflow`.
Suggested commit ID: `DOC-08`
Status: New

**[D6] — `docs/quickstart.md:41-49` `Model` example has `version: ''` and api.md disagrees with schema**
Severity: 🟡 Medium
Location: `docs/quickstart.md:41-49`; `docs/api.md:89-98`; `src/schemas/model.ts:11-19`
Description: Quickstart passes `version: ''`. Schema has `version: z.string().max(10).optional()`. api.md lists `version: string` as required. Three docs disagree.
Recommendation: Pick one and align: either drop `version` from `Model` in api.md and remove from quickstart, or document it as required-with-default.
Suggested commit ID: `DOC-09`
Status: New

**[D6] — `docs/isopacks.md:60-66` names bundled pack as `reticulyne` — actual id is `isoflow`**
Severity: 🟡 Medium
Location: `docs/isopacks.md:62`; `src/vendor/isopacks/isoflow.js`
Description: "**reticulyne** — general infrastructure icons" — but the vendored file is `isoflow.js` and the pack-id is `isoflow` (preserved deliberately per CHANGELOG L48-51 for diagram back-compat). README L62 correctly says "Isoflow icon collections". Embedders typing `iconCollections: { allow: ['reticulyne'] }` would match nothing.
Recommendation: Update L62 to `**isoflow** — general infrastructure icons`, add a footnote explaining back-compat naming.
Suggested commit ID: `DOC-10`
Status: New

**[D6] — `TODO.md` empty despite source comments claiming items are tracked there**
Severity: 🟡 Medium
Location: `TODO.md`
Description: File has frontmatter (`project`, `prefix: iso`) but no tasks. Source comments reference "tracked in TODO.md" — e.g. `src/types/model.ts:45` (the `ConnectorStyle` latent bug). "Tracking-by-source-comment" is not tracking.
Recommendation: Either add the referenced follow-up tasks (with `iso-NN` IDs per the prefix), or remove "tracked in TODO.md" claims from source.
Suggested commit ID: `DOC-11`
Status: New

**[D6] — `ROADMAP.md` references "prior ROADMAP versions" without inlining**
Severity: 🟢 Low
Location: `ROADMAP.md:51-52`
Description: "See the full enumeration in prior ROADMAP versions; the ten corrections remain valid and are not repeated here." Unhelpful for readers without git history at hand.
Recommendation: Inline the ten corrections or remove the reference.
Suggested commit ID: `DOC-12`
Status: New

**[D6] — `docs/embedding.md:540` grammar — "an Reticulyne dependency"**
Severity: 🟢 Low
Location: `docs/embedding.md:540`
Description: Should be "a Reticulyne dependency". Trivial copy-edit.
Recommendation: Fix.
Suggested commit ID: `DOC-13`
Status: New

**[D6] — Verifications (informational)**
- SECURITY.md mitigations verified end-to-end (sanitizeLinkUrl protocols, formats allowlist, uuid/qs overrides). ✅
- All cross-references between docs resolve correctly (spot-checked). ✅
- `docs/contributing.md`, `docs/installation.md`, `docs/docker.md` (apart from D6-04) match code state. ✅
- `docs/embedding.md` security model is the strongest doc — accurate and runnable. ✅
- `CLAUDE.md`, `docs/README.md` (index) consistent. ✅
- ROADMAP 2.12 description references legacy TouchEvent wiring that no longer exists post-FEA10-01 — see touch-02 in Section 9.

---

## Section 7: Dependency & Supply Chain Health

Use `DEP-NN` for suggested commit IDs.

**[7] — `npm outdated` shows ~12 in-range bumps blocked by lockfile drift**
Severity: 🟠 High
Location: `package.json` + `package-lock.json`
Description:
- `react / react-dom 19.2.6` → wanted `19.2.7` (in-range patch)
- `@mui/material / icons-material 9.0.1` → wanted `9.1.0` (in-range minor)
- `zustand 5.0.13` → wanted `5.0.14`
- `@typescript-eslint/* 8.59.3` → wanted `8.61.0`
- `webpack 5.106.2` → wanted `5.107.2`
- `webpack-merge 5.8.0` → wanted `5.10.0`
- `ts-jest 29.4.9` → wanted `29.4.11`
- `ts-loader 9.5.7` → wanted `9.6.0`
- `eslint-plugin-prettier 5.5.5` → wanted `5.5.6`
- `@types/react 19.2.14` → wanted `19.2.17`
All "Wanted ≠ Current" rows are within-range upgrades.
Recommendation: `npm update` and commit lockfile delta as a single `chore(DEP-NN): refresh in-range deps` commit.
Suggested commit ID: `DEP-02`
Status: New

**[7] — `@types/jest@29` mismatched against runtime `jest@30`**
Severity: 🟡 Medium
Location: `package.json:71` (`@types/jest`) vs `package.json:84` (`jest@^30.4.2`)
Description: Types lag runtime by a full major. Type completions / signatures will drift from real behaviour.
Recommendation: Bump `@types/jest` to `^30` immediately.
Suggested commit ID: `DEP-03`
Status: New

**[7] — Cross-major upgrades available — flag for explicit decision**
Severity: 🟡 Medium
Location: `package.json` various
Description: `eslint 9 → 10`, `typescript 5 → 6`, `webpack-cli 5 → 7`, `webpack-merge 5 → 6`, `@testing-library/jest-dom 5 → 6` (also listed as unused), `uuid` overridden at 11 (3 majors behind upstream — deliberate, see SEC6-01).
Recommendation: One task ID (`DEP-NN`) per major bump, separate PRs. Not auto-bump.
Suggested commit ID: `DEP-04` (placeholder; allocate per-package)
Status: New

**[7] — `depcheck` flags four likely truly unused devDependencies**
Severity: 🟡 Medium
Location: `package.json` devDependencies block
Description:
- `@testing-library/jest-dom` (`package.json:64`) — grep found zero `import '@testing-library/jest-dom'` or `jest-dom/extend-expect` usage in `src/`.
- `jsdom` (`package.json:86`) — direct devDep alongside `jest-environment-jsdom` which already pulls jsdom transitively. Likely duplicate.
- `@typescript-eslint/eslint-plugin` (`package.json:74`) + `@typescript-eslint/parser` (`package.json:75`) — superseded by the `typescript-eslint` meta-package (`package.json:97`). Flat config uses only the meta-package.
Recommendation: Remove the four, verify `npm run lint && npm test && npm run build` still pass.
Suggested commit ID: `DEP-05`
Status: New

**[7] — `react-quill-new@3.8.3` ships transitive Quill 1.x; verify and document**
Severity: 🟡 Medium
Location: `package.json:112`
Description: `react-quill-new` is a fork created because original `react-quill` wraps Quill 1.x and is unmaintained. The fork is active (last publish ~2026-02), but the underlying editor may still be Quill 1.x in most installs. Verify which Quill the lockfile resolves and note in `SECURITY.md`.
Recommendation: `npm ls quill` to confirm. ROADMAP 2.10 already tracks the eventual swap to TipTap.
Suggested commit ID: `DEP-06`
Status: New

**[7] — Verifications (informational)**
- No duplicate React / React-DOM / MUI / Zustand copies. ✅
- `engines.node >=22.0.0`, `.nvmrc 22.22.3`, `Dockerfile FROM node:22.22-alpine` — aligned. ✅
- `overrides` block used appropriately (uuid + qs both traceable to SEC6-01 / SEC7-01). ✅
- `package-lock.json` clean. ✅

---

## Section 8: Operational & Deployment Readiness

Use `BLD-NN` for suggested commit IDs.

**[8] — CI workflow actions pinned to floating tags, not commit SHAs**
Severity: 🟠 High
Location: `.github/workflows/ci.yml:18, 20, 82, 84, 92, 130`; `.github/workflows/release.yml:15, 17`
Description: All `uses:` lines reference `@v4` tag refs. A compromised maintainer or stolen PAT can repoint `v4` to malicious commits. `release.yml` is the higher-priority target — it holds `packages: write`.
Recommendation: Pin to 40-char SHAs (e.g. `actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1`). Enable Dependabot `github-actions` ecosystem in `.github/dependabot.yml` (a new file) with `pin-only` versioning strategy.
Suggested commit ID: `BLD-03`
Status: New

**[8] — `release.yml` does not gate on lint, audit, or pack-contents check**
Severity: 🟠 High
Location: `.github/workflows/release.yml:24-32`
Description: Runs `npm ci → npm test → npm run build → npm publish`. No `npm run lint`, no `npm audit --omit=dev --audit-level=moderate`, no pack-contents verification. A tag pushed from a branch that never saw `main` could publish a lint-failing or audit-failing build.
Recommendation: Either copy lint + audit + pack-contents steps into `release.yml` before `npm publish`, or restructure to trigger via `workflow_run` of a successful CI run gated on tag pattern.
Suggested commit ID: `BLD-04`
Status: New

**[8] — `release.yml` does not enforce tag matches `package.json` version**
Severity: 🟡 Medium
Location: `.github/workflows/release.yml:5-7, 30`
Description: A `v9.9.9` tag push would publish whatever `package.json:3` currently says.
Recommendation: Add a pre-publish guard:
```yaml
- run: node -e "const v=require('./package.json').version; if('v'+v!==process.env.GITHUB_REF_NAME){console.error('tag != package.json'); process.exit(1)}"
```
Suggested commit ID: `BLD-05`
Status: New

**[8] — No `CHANGELOG.md` update gate**
Severity: 🟡 Medium
Location: `.github/workflows/release.yml`
Description: Release workflow doesn't verify tag's version has a CHANGELOG section.
Recommendation: Add a publish-step guard that greps `CHANGELOG.md` for current version header.
Suggested commit ID: `BLD-06`
Status: New

**[8] — Docker images built locally but never published anywhere**
Severity: 🟡 Medium
Location: Dockerfile, restart.sh, `.github/workflows/`
Description: `docs/docker.md` documents two images (`reticulyne`, `reticulyne-examples`) as the recommended self-hosting path. No workflow pushes to GHCR or any registry. Consumers must build locally — no `docker pull ghcr.io/qant-au/reticulyne:0.1.0` path.
Recommendation: Either (a) add a `docker-publish.yml` workflow on tag that pushes to `ghcr.io/qant-au/reticulyne` and `ghcr.io/qant-au/reticulyne-examples`, or (b) explicitly document in `docs/docker.md` that local build is the only supported path.
Suggested commit ID: `BLD-07`
Status: New

**[8] — No documented rollback procedure for GitHub Packages**
Severity: 🟡 Medium
Location: `docs/contributing.md` (Release process section)
Description: Happy-path documented; rollback not. CHANGELOG.md does note "GitHub Packages doesn't support `npm deprecate`" (recent commit `be36b38`), but `docs/contributing.md` doesn't link there or describe the actual rollback (re-publish fixed patch; do not attempt deletion).
Recommendation: Add "Rollback" subsection to `docs/contributing.md`.
Suggested commit ID: `DOC-14`
Status: New

**[8] — E2E job opt-in via `[run e2e]` magic string — silent skip risk**
Severity: 🟡 Medium
Location: `.github/workflows/ci.yml:73-79`
Description: `if:` gate runs e2e only when commit message or PR title contains `[run e2e]`. A release touching editor interaction could ship without e2e ever running. `release.yml` also doesn't run e2e.
Recommendation: Either (a) make e2e mandatory on tag pushes in `release.yml`, or (b) auto-set `[run e2e]` when diff touches `src/components/**` or `e2e/**` via a paths filter.
Suggested commit ID: `BLD-08`
Status: New

**[8] — `.dockerignore` gaps (already covered as `[2f] BLD-02`)**
Severity: 🟢 Low (cross-ref)
Status: New (same item)

**[8] — Verifications (informational)**
- `restart.sh` is idempotent — verified. ✅
- Healthcheck wired; persistence model documented in `docs/docker.md`. ✅
- Webpack configs DRY via `webpack/base.config.js`. ✅
- `.gitignore` comprehensive. ✅
- `dist*/` correctly excluded from npm (`files`) and pack-contents check enforces. ✅
- CI gates on lint + unit tests + audit + pack-contents — strong. ✅

---

## Section 9: Reviewer's Discretion (Discretionary Findings)

Use `QUA-NN` / `FEA-NN` for suggested commit IDs depending on whether the fix is hygiene or feature.

### Accessibility (a11y)

**[9-a11y] — `IconButton` has no accessible name; toolbar reads as unlabelled buttons to AT**
Severity: 🟠 High
Location: `src/components/IconButton/IconButton.tsx:1-80`
Description: `IconButton` accepts a `name` prop and uses it as a MUI `<Tooltip title={name}>` only. The wrapped `<Button>` has icon SVG only, no text child, no `aria-label`, no `aria-labelledby`. Tooltips wire `aria-describedby` (a description, not a name). Screen readers read the entire toolbar (Select, Pan, Add-item, Rectangle, Connector, Text, menu, help, zoom controls in `ZoomControls.tsx:28, 53, 62`) as a row of unlabelled buttons. Single change fixes the canvas editor's primary control surface repo-wide.
Recommendation: Add `aria-label={name}` to the `<Button>` in `IconButton.tsx`. Add `aria-pressed={isActive}` for toggle semantics.
Suggested commit ID: `QUA-10`
Status: New

**[9-a11y] — Canvas root lacks `role="application"` and labelling**
Severity: 🟠 High
Location: `src/components/Renderer/Renderer.tsx:55-123`
Description: Renderer root `<Box>` (the `uiState.rendererEl`) is generic `<div>` — no role, no `aria-label`, no `tabIndex`, no `aria-roledescription`. ARIA Authoring Practices recommends `role="application"` + `aria-label` on graphical editor surfaces so AT users know the surface exists. The interactions overlay (line 107-116) similarly has no labelling.
Recommendation: Wrap in `role="application" aria-label="Diagram canvas" aria-roledescription="isometric diagram editor"`. Minimal fix — full canvas a11y is a separate roadmap-scale initiative (correctly deferred).
Suggested commit ID: `QUA-11`
Status: New

**[9-a11y] — Global keyboard shortcuts attach to `window` — embedder hostility**
Severity: 🟠 High
Location: `src/interaction/useKeyboardShortcuts.ts:368-371`
Description: Shortcuts attach to `window.addEventListener('keydown', ...)`. The codebase correctly guards via `isEditableFocus()` (line 12-18), but a host page mounting `<Reticulyne>` in a sidebar/modal preview has its global keystrokes hijacked when the diagram doesn't have focus. Pressing `V`, `H`, `R`, `C`, `T`, `+`, `-`, `0`, `1`, `F`, `?` anywhere on the host changes the canvas tool or zoom.
Recommendation: Attach listener to `uiState.rendererEl` or gate every shortcut on `document.activeElement` being inside the renderer subtree. Pairs with `enableGlobalDragHandlers` (FEA10-01) — add symmetric `enableGlobalKeyboardShortcuts` prop.
Suggested commit ID: `FEA-07`
Status: New

**[9-a11y] — No focus management anywhere in the codebase**
Severity: 🟡 Medium
Location: Repo-wide (zero hits for `tabIndex|autoFocus|focus()` in `src/`)
Description: No `tabIndex`, no dialog auto-focus, no return-to-trigger on close. MUI `<Menu>` / `<Dialog>` provide baseline traps, which carries custom dialogs (`ExportImageDialog` etc.). Once `aria-label` lands on `IconButton`, the toolbar becomes Tab-reachable; little else is urgent.
Recommendation: After QUA-10, no further action urgent.
Status: New

### Internationalisation (i18n)

**[9-i18n] — All UI strings hardcoded English; no i18n machinery present**
Severity: 🟢 Low (deferred per ROADMAP)
Location: `MainMenu.tsx:150-225, 250-288`; `ZoomControls.tsx:28, 53, 62`; `HelpButton.tsx:17`; etc.
Description: Strings inline. Shortcut hints (`"Select (V)"`) are also locale-insensitive — French AZERTY users pressing `V` don't get the same physical key. ROADMAP explicitly defers ("low ROI; defer until non-English demand appears").
Recommendation: Inventory captured for future planning. No action expected.
Status: New

### Browser Compatibility

**[9-browser] — README does not document minimum browser versions**
Severity: 🟢 Low
Location: `README.md` Requirements section
Description: Browserslist target is in `package.json` but no human-readable matrix in README/installation.md.
Recommendation: One line: "Chrome 90+, Firefox 90+, Safari 14+, Edge 90+" (translating the browserslist).
Suggested commit ID: `DOC-15`
Status: New

**[9-browser] — Verifications (informational)**
- `ResizeObserver`, PointerEvents — baseline-supported in production browserslist. No polyfills needed. ✅

### Touch / Pointer

**[9-touch] — ROADMAP 2.12 description is stale post-FEA10-01**
Severity: 🟡 Medium
Location: `ROADMAP.md` (section 2.12)
Description: ROADMAP claims "`onTouchStart` / `onTouchMove` / `onTouchEnd` are already wired in `useInteractionManager.ts` but only map single-touch to mouse events. Multi-touch pinch is the gap." Verified: there are no `onTouchStart` handlers in the codebase. Single-touch works only because Pointer Events synthesise `pointerdown` from the first touch automatically. The gap is real, but the implementation path is now via tracking multiple `pointerId`s, not the legacy TouchEvent API.
Recommendation: Update ROADMAP 2.12 wording — track two active `pointerId`s, compute inter-pointer distance.
Suggested commit ID: `DOC-16`
Status: New

**[9-touch] — Touchscreen users have no zoom path**
Severity: 🟡 Medium (ROADMAP-tracked as 2.12)
Location: `src/interaction/useInteractionManager.ts`
Description: Single-finger pan works; no pinch handler; keyboard shortcuts require a keyboard; `ZoomControls` UI is the only path. Touchscreen iPad / Surface users are stuck.
Recommendation: Already tracked in ROADMAP 2.12.
Status: New
See also: ROADMAP item 2.12

### CI/CD Hygiene (additional)

**[9-ci] — No CodeQL / `dependency-review-action` / SBOM workflow**
Severity: 🟡 Medium
Location: `.github/workflows/`
Description: Only `ci.yml` and `release.yml`. No `github/codeql-action`, no `dependency-review-action` on PR triggers, no SBOM generation. Given the embedder-side trust model, dependency-review is cheap defence-in-depth on PRs.
Recommendation: Add `dependency-review-action` on PR triggers. Optional: CodeQL on a weekly schedule.
Suggested commit ID: `BLD-09`
Status: New

### Linting & Formatting

**[9-lint] — No pre-commit hooks**
Severity: 🟡 Medium (discretionary)
Location: No `.husky/`, no `simple-git-hooks` / `pre-commit` / `lefthook` config in `package.json`
Description: Lint runs only in CI. Given `prettier/prettier` is at error severity, missed formatting manifests as CI failures on otherwise-trivial style changes.
Recommendation: Optional — add `husky` or `lefthook` with pre-commit `npm run lint`.
Suggested commit ID: `QUA-12`
Status: New

### Fork Divergence from Isoflow

**[9-fork] — No `upstream` remote configured**
Severity: 🟢 Low
Description: Only `origin` set. Given upstream maintenance "lapsed" (per README), low ROI to track.
Recommendation: Document the decision in `docs/contributing.md` if it ever opens to contributors. Otherwise leave.
Status: New

### Technical Debt

**[9-tech] — `src/hooks/useScene.ts` is the largest source file at 641 lines**
Severity: 🟡 Medium
Location: `src/hooks/useScene.ts`
Description: Largest non-test file. README's retrospective notes `src/utils/renderer.ts` was split into seven concern-focused modules; `useScene` is the next candidate. Test file `useScene.test.tsx` is 798 lines (largest test) — symptom of the broad API surface.
Recommendation: Split candidates: `useSceneItems`, `useSceneConnectors`, `useSceneRectangles`, `useSceneTextBoxes`, `useSceneClipboard`, `useSceneHistory`. Existing reducer split (`src/stores/reducers/`) is the right boundary — the hook just routes to them.
Suggested commit ID: `QUA-13`
Status: New

**[9-tech] — `src/utils/` is well-modularized (verification)**
Severity: 🟢 Informational
Description: README's claim of post-renderer-split modularization verified — `src/utils/index.ts` re-exports from `projection`, `coordinates`, `geometry`, `connector`, `textBox`, `hitTest`, `fitToView`, `exportOptions`, `model`, `editorModeMapping`. ✅

---

## Appendix: Finding Summary Table

| # | Section | Severity | Title | Suggested ID | Status |
|---|---------|----------|-------|--------------|--------|
| 1 | 2c | 🟠 High | `pathfinding@0.4.18` unmaintained | SEC-04 | New |
| 2 | 2g | 🟠 High | Live MOONSHOT_API_KEY in `.env.graphify` on disk | SEC-10 | New |
| 3 | 3a | 🟠 High | `useInteractionManager` rebinds 4 window listeners per pointermove | PRF-01 | New |
| 4 | 3a | 🟠 High | `useKeyboardShortcuts` rebinds keydown on every pointermove | PRF-02 | New |
| 5 | 3a | 🟠 High | `useScene` subscribes to whole stores; consumers re-render per mutation | PRF-03 | New |
| 6 | 3a | 🟠 High | Renderer cascades whole-scene re-renders; no React.memo on SceneLayers | PRF-04 | New |
| 7 | 3b | 🟠 High | MUI icon barrel imports in 10+ files (consumer tree-shake liability) | PRF-10 | New |
| 8 | 3b | 🟠 High | No code splitting / dynamic imports in the library | PRF-11 | New |
| 9 | 4a | 🟠 High | `console.log` of caught error in ExportImageDialog | QUA-02 | New |
| 10 | 4a / 4f | 🟠 High | Import-error UX gap — parse failures bypass onValidationError | BUG-01 | New |
| 11 | 4c | 🟠 High | React 19 new APIs (Suspense / use / Actions) not adopted | FEA-01 | New |
| 12 | 5 | 🟠 High | `useReticulyne()` returned methods have no TSDoc | FEA-02 | New |
| 13 | 5 | 🟠 High | `Model`/`uiState` escape hatches not `@deprecated` | FEA-03 | New |
| 14 | 5 / 6 | 🟠 High | `docs/api.md` prop table missing 9 props inc. breaking `themeMode` | DOC-01 | New |
| 15 | 5 | 🟠 High | No `useIsoflow` back-compat alias; CHANGELOG silent on the trade | FEA-04 | New |
| 16 | 5 / 4a | 🟠 High | `ModelStore`/`UiStateStore`/`SceneStore` types leak through public surface | QUA-03 | New |
| 17 | 5 / 6 | 🟠 High | No SemVer policy for 0.x stated | DOC-02 | New |
| 18 | 6 | 🟠 High | `docs/docker.md` documents CSP with `reticulyne.io` origins not in nginx.conf | DOC-04 | New |
| 19 | 6 | 🟠 High | `docs/quickstart.md` teaches removed `window.alert` behaviour | DOC-05 | New |
| 20 | 6 | 🟠 High | `docs/isopacks.md` cites non-exported `ProcessedCollection` interface | DOC-06 | New |
| 21 | 7 | 🟠 High | npm outdated — 12 in-range bumps blocked by lockfile drift | DEP-02 | New |
| 22 | 8 | 🟠 High | CI actions pinned to floating tags, not SHAs | BLD-03 | New |
| 23 | 8 | 🟠 High | `release.yml` does not gate on lint / audit / pack-contents | BLD-04 | New |
| 24 | 9 (a11y) | 🟠 High | IconButton has no `aria-label` — toolbar unlabelled to AT | QUA-10 | New |
| 25 | 9 (a11y) | 🟠 High | Canvas root lacks `role="application"` + labelling | QUA-11 | New |
| 26 | 9 (a11y) | 🟠 High | Global keyboard shortcuts attach to `window` — embedder hostility | FEA-07 | New |
| 27 | 2a | 🟡 Medium | Icon URL schema accepts any string — no protocol allowlist | SEC-01 | New |
| 28 | 2b | 🟡 Medium | `Model.set` escape hatch bypasses schema validation | SEC-02 | New |
| 29 | 2b | 🟡 Medium | `Connector.update` patch not validated | SEC-03 | New |
| 30 | 2d | 🟡 Medium | Vendored isopacks have no provenance metadata | SEC-06 | New |
| 31 | 2f | 🟡 Medium | No `Strict-Transport-Security` header in nginx.conf | SEC-07 | New |
| 32 | 2h | 🟡 Medium | `exportAsVectorSvg` fetches arbitrary URLs per embedder CSP | SEC-11 | New |
| 33 | 3a | 🟡 Medium | Pathfinder runs on every pointermove during CONNECTOR mode | PRF-05 | New |
| 34 | 3a | 🟡 Medium | `DragItems` writes through `recordPriorState` on every move | PRF-06 | New |
| 35 | 3a | 🟡 Medium | `useScene.setState` callback re-creates on every history mutation | PRF-07 | New |
| 36 | 3a | 🟡 Medium | `SceneLayer` runs GSAP tween per layer on every pan/zoom | PRF-08 | New |
| 37 | 3c | 🟡 Medium | No `loading="lazy"` on icon `<img>` elements | PRF-13 | New |
| 38 | 3d | 🟡 Medium | `connectorOverlays` re-spread per pulse — dense streams quadratic | PRF-14 | New |
| 39 | 4a | 🟡 Medium | `ConnectorStyle` documented latent typing bug | QUA-04 | New |
| 40 | 4b | 🟡 Medium | Stale `Isoflow` reference in e2e comment | QUA-05 | New |
| 41 | 4c | 🟡 Medium | Two `eslint-disable-next-line` escapes need audit follow-up | QUA-06 | New |
| 42 | 4d | 🟡 Medium | Thin `useReticulyne` Connector-namespace test coverage | QUA-07 | New |
| 43 | 4d | 🟡 Medium | No XSS test for MarkdownEditor body content | QUA-08 | New |
| 44 | 4d | 🟡 Medium | No import → export round-trip test | QUA-09 | New |
| 45 | 5 | 🟡 Medium | Standalone subpath omits enum object re-exports | FEA-05 | New |
| 46 | 5 | 🟡 Medium | `useReticulyne()` worked example fragile under React 19 batching | DOC-03 | New |
| 47 | 5 | 🟡 Medium | `setView` only available via escape hatch | FEA-06 | New |
| 48 | 6 | 🟡 Medium | `SECURITY.md` snapshot tag still reads v4.5.0 | DOC-07 | New |
| 49 | 6 | 🟡 Medium | `docs/api.md:71` `markmanx/reticulyne` typo — should be `markmanx/isoflow` | DOC-08 | New |
| 50 | 6 | 🟡 Medium | Model `version` field inconsistent across docs | DOC-09 | New |
| 51 | 6 | 🟡 Medium | `docs/isopacks.md` names bundled pack `reticulyne` — actual id is `isoflow` | DOC-10 | New |
| 52 | 6 | 🟡 Medium | `TODO.md` empty despite source comments claiming items are tracked there | DOC-11 | New |
| 53 | 7 | 🟡 Medium | `@types/jest@29` mismatched against runtime `jest@30` | DEP-03 | New |
| 54 | 7 | 🟡 Medium | Cross-major upgrades available — explicit decision needed | DEP-04 | New |
| 55 | 7 | 🟡 Medium | `depcheck` flags four likely-unused devDependencies | DEP-05 | New |
| 56 | 7 | 🟡 Medium | `react-quill-new` transitive Quill version unverified | DEP-06 | New |
| 57 | 8 | 🟡 Medium | `release.yml` does not enforce tag matches package.json version | BLD-05 | New |
| 58 | 8 | 🟡 Medium | No CHANGELOG.md update gate in release workflow | BLD-06 | New |
| 59 | 8 | 🟡 Medium | Docker images never published anywhere | BLD-07 | New |
| 60 | 8 | 🟡 Medium | No documented GitHub Packages rollback procedure | DOC-14 | New |
| 61 | 8 | 🟡 Medium | E2E job opt-in via `[run e2e]` magic string — silent skip risk | BLD-08 | New |
| 62 | 9 (a11y) | 🟡 Medium | No focus management anywhere in codebase | — | New |
| 63 | 9 (touch) | 🟡 Medium | ROADMAP 2.12 description stale post-FEA10-01 | DOC-16 | New |
| 64 | 9 (touch) | 🟡 Medium | Touchscreen users have no zoom path (ROADMAP 2.12) | — | New |
| 65 | 9 (ci) | 🟡 Medium | No CodeQL / dependency-review / SBOM workflow | BLD-09 | New |
| 66 | 9 (lint) | 🟡 Medium | No pre-commit hooks | QUA-12 | New |
| 67 | 9 (tech) | 🟡 Medium | `src/hooks/useScene.ts` is 641 lines — split candidate | QUA-13 | New |
| 68 | 2c | 🟢 Low | `quill@2.0.3` XSS — known and accepted | — | Recurring (SECURITY.md) |
| 69 | 2c | 🟢 Low | Source maps shipped in published tarball — intentional | SEC-05 | New |
| 70 | 2c | 🟢 Low | `dompurify@3.4.3` transitive via jspdf — behind 3.4 line | — | New |
| 71 | 2c | 🟢 Low | `file-saver@2.0.5` stale; trivial DOM-API replacement | DEP-01 | New |
| 72 | 2e | 🟢 Low | No `prepublishOnly` script — local-publish footgun | BLD-01 | New |
| 73 | 2f | 🟢 Low | `.dockerignore` missing `.env*`, planning docs, testing/ | BLD-02 | New |
| 74 | 2f | 🟢 Low | `Referrer-Policy` is weakest acceptable — tighten to `strict-origin-when-cross-origin` | SEC-08 | New |
| 75 | 2f | 🟢 Low | No COOP / CORP headers — cheap defence-in-depth | SEC-09 | New |
| 76 | 3a | 🟢 Low | Cursor re-renders per pointer event with non-memoized chroma alpha | PRF-09 | New |
| 77 | 3b | 🟢 Low | SVG asset/inline loader — fine today, will bloat for >4KB assets | PRF-12 | New |
| 78 | 3c | 🟢 Low | `src/assets/grid-tile-bg.svg` may be dead asset | QUA-01 | New |
| 79 | 4e | 🟢 Low | Dev port 3000 hardcoded — single consumer, leave as-is | — | New |
| 80 | 6 | 🟢 Low | `docs/embedding.md:540` grammar — "an Reticulyne dependency" | DOC-13 | New |
| 81 | 6 | 🟢 Low | `ROADMAP.md:51-52` references "prior ROADMAP versions" without inlining | DOC-12 | New |
| 82 | 9 (i18n) | 🟢 Low | All UI strings hardcoded English — deferred per ROADMAP | — | New |
| 83 | 9 (browser) | 🟢 Low | README does not document minimum browser versions | DOC-15 | New |
| 84 | 9 (fork) | 🟢 Low | No `upstream` remote configured — likely correct given upstream unmaintained | — | New |

**Total findings:** 84 (Critical: 0, High: 26, Medium: 41, Low: 17)

---

*End of review. Action items derived from this document live in `action-items-2026-06-09.md`.*
