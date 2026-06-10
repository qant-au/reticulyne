# Reticulyne Comprehensive Code Review

You are performing a deep, comprehensive code review of the Reticulyne repository — a single-project React/TypeScript component library at `/Users/adam/Projects/reticulyne/`. The package is published to GitHub Packages as `@qant-au/reticulyne` and is also shipped as two standalone Docker images (single-editor on :2222, examples-picker on :2223). The codebase is a fork of `isoflow`; many internal symbols still carry the old name. The product is a network/isometric diagram editor used as both an embedded React component and a standalone editor.

You are running as Claude Opus. Token budget is not a concern. Accuracy and completeness are the only constraints. Do not summarise or truncate. Report everything you find.

---

## Output Instructions

Save your complete review output as **two separate files**:

1. `/Users/adam/Projects/reticulyne/code-review-YYYY-MM-DD.md` — the full review (see Output Format below)
2. `/Users/adam/Projects/reticulyne/action-items-YYYY-MM-DD.md` — the distilled action items list (see Action Items Format below)

replacing YYYY-MM-DD with today's date (use the `date +%Y-%m-%d` command to confirm).

Save the review file first, then derive the action items file from it. Both files must be written in full in a single operation — do not write incrementally.

**Do not `git add` or commit either file.** The user will add/commit them manually if and when they want to. `.gitignore` does not currently exclude these patterns, so they will appear as untracked in `git status`. That is expected.

BEFORE beginning the review, check whether any files matching the pattern `code-review-*.md` exist in the root directory:

    ls /Users/adam/Projects/reticulyne/code-review-*.md 2>/dev/null

If prior reviews exist, read each one. When a current finding was already identified in a prior review, mark it as:

    Status: Recurring (previously identified — code-review-YYYY-MM-DD.md)

New findings not previously identified should be marked:

    Status: New

This allows trends to be tracked across reviews over time.

Also read `SECURITY.md` before beginning Section 2. It carries a residual-advisory ledger: each accepted advisory has an in-source mitigation note. If a finding overlaps with an entry in that ledger, cross-reference it rather than re-raising it as new.

---

## Repository Map

This is a single repository. There are no sub-projects to tier. Allocate depth roughly as follows:

| Area | Priority | What lives here |
|---|---|---|
| `src/Reticulyne.tsx` + `src/standaloneExports.ts` + `src/index*.tsx` | Highest | Public entry points — embedded component, standalone exports, dev/docker entry shims |
| `src/stores/`, `src/hooks/`, `src/interaction/` | Highest | Core state engine (Zustand stores), imperative API hooks, interaction-mode state machine |
| `src/schemas/` | High | Zod / runtime validation surface — anything imported or pasted in by an embedder lands here first |
| `src/components/` | High | Renderer, UI panels, item editors |
| `src/utils/`, `src/config.ts`, `src/styles/`, `src/types/` | Medium | Pure utilities, theme, types |
| `src/vendor/`, `src/fixtures/`, `src/assets/`, `src/examples/` | Medium | Third-party vendored code, demo data, icon packs — vendored code carries elevated supply-chain risk |
| `docker/nginx.conf`, `Dockerfile`, `restart.sh`, `webpack/docker*.config.js` | High | Standalone deployment surface — the two public Docker images |
| `webpack/`, `tsconfig*.json`, `eslint.config.js`, `jest.config.js`, `playwright.config.ts` | Medium | Build, type, lint, test configuration |
| `docs/`, `README.md`, `ROADMAP.md`, `SECURITY.md`, `TODO.md`, `CLAUDE.md` | Medium | Documentation and project-state surface |
| `e2e/`, `src/**/__tests__/` | High (for coverage assessment) | Test surface — Playwright E2E and Jest unit/component |
| `dist/`, `dist-docker/`, `dist-docker-examples/`, `graphify-out/`, `playwright-out/` | Skip | Build artefacts — do not review |

### Notable platform facts

- **React 19** is the target. `eslint.config.js` intentionally downgrades the `react-hooks` rules `refs`, `set-state-in-effect`, and `set-state-in-render` from error to warning during the React-19 migration. Findings that lean on these rules must take the migration context into account.
- **Embedding contract**: `@qant-au/reticulyne` is a published library. Its props, `useReticulyne()` imperative API, exported types, and the `./standalone` subpath export are the public surface. Breaking changes there cascade to embedders.
- **Pack contents** are CI-asserted to be only `dist/`, `README.md`, `LICENSE`, `package.json` in the published tarball (`.github/workflows/ci.yml`).
- **Two Docker images** are public-facing: the single-editor (`src/index-docker.tsx`) on `:2222` and the examples-picker (`src/index.tsx`) on `:2223`. Both are nginx-served static SPAs.
- **Fork heritage**: the package was renamed from `isoflow` to `reticulyne` but many internal identifiers, component names, hook names (`useIsoflow`, `<Isoflow>`), CSS classes, and storage keys may still say `isoflow`. Naming consistency is its own review surface.

---

## Review Methodology

Use all tools at your disposal:
- File reads — read key files in full, do not skim
- grep / ripgrep for pattern searches across the codebase
- Directory listings to understand structure
- Shell commands for dependency audits, git history scans, etc.
- graphify queries for semantic architectural questions: `graphify query "your question here"` from the repo root (index at `graphify-out/graph.json`)

Sequence:

1. Read `CLAUDE.md`, `README.md`, `SECURITY.md`, `ROADMAP.md`, `TODO.md`, `docs/embedding.md`, `docs/docker.md` in full first — they establish intent and contract.
2. Read entry points in full: `src/Reticulyne.tsx`, `src/index.tsx`, `src/index-docker.tsx`, `src/standaloneExports.ts`.
3. Read store definitions and the imperative `useReticulyne` / `useIsoflow` hook in full.
4. Read schemas in `src/schemas/` in full — this is the validation boundary for embedder/import data.
5. Read `Dockerfile`, `docker/nginx.conf`, `restart.sh` in full.
6. Read `package.json`, `package-lock.json` summary, `webpack/*.config.js` for build config.
7. Scan the rest of `src/` for the categories below.
8. Cross-reference findings against `TODO.md` (Section 9).

Read files in full unless they are clearly mechanical (long generated type files, large icon JSON fixtures). When skipping, say so explicitly.

---

## Section 1: Repository Minimum File Audit

The repo must have, at minimum:

- `README.md` — purpose, install, requirements, GitHub Packages auth, test surface
- `LICENSE`
- `SECURITY.md` — reporting + residual-advisory ledger
- `TODO.md` — outstanding tasks
- `ROADMAP.md` — direction
- `CLAUDE.md` — Claude Code project instructions
- `docs/embedding.md` — the embedding contract
- `docs/docker.md` — standalone Docker deployment
- `graphify-out/` — knowledge-graph index (regenerated by `restart.sh`)
- `.gitignore`, `.dockerignore`
- `eslint.config.js`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.js`, `playwright.config.ts`
- `.github/workflows/` — at least one CI workflow including the pack-contents check
- `package.json` with `engines.node`, `files`, and `exports` populated

Produce a table:

| File | Present | Notes |
|------|---------|-------|
| README.md | ✓ | Up to date with rename |
| SECURITY.md | ✓ | Residual ledger present |

Flag missing items as findings (severity: Medium for documentation gaps, High for missing CI / pack-contents check / `.dockerignore`, High for missing `SECURITY.md`).

---

## Section 2: Security

This is a frontend component library and an nginx-served SPA. There is no server, no database, no auth in the traditional sense. The security surface is therefore:

1. **XSS** through user-supplied diagram data, embedder-supplied props, imported JSON, or item labels rendered into the DOM.
2. **Supply chain** of npm dependencies (the package both consumes and ships transitively).
3. **The published tarball** — anything that lands in `dist/` is shipped to every embedder. Source-map and dev-only leakage must not enter `dist/`.
4. **The two Docker images** — nginx config, HTTP headers, CSP, the SPA's exposure surface.
5. **The vendored code under `src/vendor/`** — vendored libraries do not receive automated dependency-scanner attention.
6. The **residual-advisory ledger in `SECURITY.md`** — items accepted there must have an in-source mitigation. Verify the mitigation still exists where the ledger says it does.

Severity scale:
- 🔴 Critical — exploitable vulnerability with significant impact; fix immediately
- 🟠 High — serious risk; fix before next release
- 🟡 Medium — real issue but not immediately exploitable; fix in current sprint
- 🟢 Low — improvement; fix when convenient

### 2a. XSS & Injection in Rendered Diagram Content

The diagram model is user-supplied: labels, descriptions, item names, connector text, view names, model-file imports. Any path that puts that content into the DOM is an XSS surface.

- Are any labels or user-supplied strings rendered through `dangerouslySetInnerHTML`? If so, what sanitises the content?
- Are SVG attributes (`xlink:href`, `href`, `style`) ever computed from user input? `javascript:` and `data:` URLs in those attributes are a known XSS sink.
- Are item icons / isopacks loaded from arbitrary URLs? If a user can paste an isopack URL, that becomes both an XSS and SSRF vector at import time.
- Are imported model JSON files validated through the Zod schemas in `src/schemas/` **before** any field reaches a render path? Identify any code path where imported JSON skips schema validation.
- Is `eval`, `new Function`, `setTimeout(string, …)`, or `setInterval(string, …)` used anywhere — including in vendored code under `src/vendor/`?
- Is `document.write` used anywhere?
- Are any DOM event handlers attached via string attributes computed from user input?

### 2b. Embedder-Supplied Prop Trust Boundary

The embedded `<Reticulyne>` component receives props from the host application. The library should be defensive about what it accepts, but not so paranoid that it duplicates host-side validation.

- Are required props validated? Are they typed strictly, or is there `any` in the public types?
- Does the `useReticulyne()` imperative API expose any setter that can be called with arbitrary input that then bypasses schema validation?
- Are storage keys (localStorage, IndexedDB, sessionStorage — including legacy keys that still say `isoflow`) namespaced enough that two embedders on the same origin don't trample each other?
- Are stored values trusted on read? `localStorage` is attacker-mutable in an XSS scenario — any stored value used in a security decision must be revalidated.

### 2c. Supply Chain — npm Dependencies

- Run `npm audit --audit-level=moderate --omit=dev` and `npm audit --audit-level=moderate` (with dev). Report unmitigated findings.
- Cross-reference any audit findings against `SECURITY.md`'s residual-advisory ledger. If the ledger accepts the advisory, confirm the in-source mitigation it cites still exists at the cited location.
- Are dependency versions pinned (caret/tilde acceptable for a library; exact pins acceptable for an application — note which model this repo follows and call out inconsistencies)?
- Are there packages with no commits in the last 24 months that should be replaced?
- Are `devDependencies` correctly classified? Anything imported from `src/` that ships in `dist/` must be in `dependencies` (or `peerDependencies`), not `devDependencies`.
- Are React / React-DOM / MUI / Emotion correctly placed in `peerDependencies` (so embedders bring their own)? Or are they bundled into `dist/` — and if so, is that intentional?

### 2d. Supply Chain — Vendored Code (`src/vendor/`)

- List every directory under `src/vendor/`. For each: what is the upstream source, what version was vendored, and when was it last synced?
- Are there local modifications? If so, are they documented in a `PATCHES.md`-style file or as in-source comments?
- Are vendored libraries themselves carrying any of the patterns flagged in 2a (eval, dangerouslySetInnerHTML, etc.)?
- Are there published CVEs against the vendored versions?

### 2e. Published Package Surface (`dist/`)

The published tarball is what every embedder ships in their bundle. Treat it as a public attack surface.

- Confirm the CI pack-contents check (in `.github/workflows/ci.yml`) actually enforces the documented allowlist (`dist/`, `README.md`, `LICENSE`, `package.json` at root).
- Are source maps shipped in `dist/`? If so, are they intentional? Source maps containing absolute build-host paths or comments leak internal information.
- Does `dist/` contain any `.env`, fixture, test data, or development-only file?
- Is the `exports` map in `package.json` correctly subpath-restricted, or does it leak access to internals?
- Are `sideEffects` declared correctly so tree-shaking actually drops unused code?
- Is the `types` field pointing at the right `.d.ts`, and does it cover the full public surface (including `./standalone`)?

### 2f. Docker / nginx Surface

The two standalone Docker images expose SPAs to whoever can reach the container.

Review `Dockerfile`, `docker/nginx.conf`, `restart.sh`, and `webpack/docker*.config.js`:

- Does the nginx config set: `Strict-Transport-Security` (only if the container is fronted by TLS — note if not), `X-Content-Type-Options: nosniff`, `X-Frame-Options` or a CSP `frame-ancestors`, `Referrer-Policy`, and a `Content-Security-Policy` that meaningfully restricts what the SPA can load?
- Is the CSP strict enough to mitigate XSS? `unsafe-inline` and `unsafe-eval` in `script-src` defeat much of CSP's purpose — flag those.
- Are upload size limits set (`client_max_body_size`)?
- Does the image run as a non-root user?
- Is the base image pinned to a specific tag and ideally a digest? Is it a slim/distroless variant?
- Are dev dependencies installed in the final image stage, or only in a builder stage?
- Is `.dockerignore` present and excluding `node_modules/`, `dist*/`, `playwright-out/`, `graphify-out/`, `.git/`, `.env*`?
- Does the image expose a meaningful `HEALTHCHECK`?
- Does `restart.sh` blindly trust the local working tree (it should, that's its job) — but does it ever fetch remote code or run unverified shell pipes?

### 2g. Secrets & Credential Exposure

- Search for hardcoded secrets across all files (including `src/vendor/`, `src/fixtures/`, `src/examples/`):
  - `rg -i "sk-|AIza|Bearer |password|secret|api_key|api-key|private_key" src/ docs/ webpack/ docker/`
- Are `.env` files excluded by `.gitignore`?
- Is there a `.env.example` or equivalent documenting expected variables?
- Scan git history for accidentally committed secrets:
  - `git log --all --full-history -- "*.env" "**/.env" "*.pem" "*.key" "*.p12" "*.pfx"`
- Are GitHub Packages auth tokens documented (in `README.md` / `docs/installation.md`) without being committed?

### 2h. Network Egress from the Browser

The library may issue outbound requests (icon fetches, isopack downloads, telemetry).

- Identify every `fetch`, `XMLHttpRequest`, `axios`, or `<img src>` / `<link href>` call whose URL is computed from runtime data.
- Are URL targets validated against an allowlist, or constrained to specific origins?
- Is there any telemetry / analytics call that the embedder has not opted into? Telemetry without explicit consent is a privacy issue in addition to a trust issue.

---

## Section 3: Performance

The product is a canvas-style editor. The performance budget is dominated by render frequency under interaction (drag, hover, scroll, pan, zoom) and by import/load time for large diagrams.

### 3a. Render Hot Paths

- Are `useMemo` / `useCallback` used where prop identity matters for memoised children, and avoided where they only add overhead?
- Are large lists of items / connectors / labels rendered without windowing or virtualisation where the count could realistically exceed a few hundred?
- Are Zustand store subscriptions narrowed with selectors, or do components subscribe to the entire store and re-render on unrelated state changes?
- Are heavy computations (path-finding via `pathfinding`, layout, snapping) re-run on every render instead of memoised against their actual inputs?
- Are interaction-mode state machines (`src/interaction/`) re-creating handler closures on every pointer event?
- Are SVG / canvas elements being re-mounted (key change, conditional render at the wrong level) when they should be updated in place?

### 3b. Bundle Size

The published `dist/` ships to every embedder; the Docker SPA bundle ships to every browser hitting it.

- Run `npm run build` (or read `webpack/prod.config.js`) and inspect the output. Are MUI, Emotion, `chroma-js`, `pathfinding`, icon packs, and any large dependencies being tree-shaken?
- Are icon packs imported as a whole (`@mui/icons-material`) when only a handful are used? Per-icon imports are dramatically smaller.
- Are isopack fixtures (`src/fixtures/`, `src/assets/`) bundled into the library tarball, or are they Docker-image-only? They should not ship in the npm package unless deliberately part of the API.
- Are large vendored libraries under `src/vendor/` actually used, or is dead vendored code shipping?
- Are dynamic imports used for editor panels / dialogs that are not part of the initial render path?

### 3c. Asset & Image Handling

- Are isometric tile / item images loaded with appropriate `loading="lazy"` where they are off-screen?
- Are SVG icons inlined (lower request count, larger HTML/JS) or external (cacheable, more requests) — which is appropriate per use case, and is the choice consistent?
- Are images sized correctly, or are large originals being scaled down by the browser?

### 3d. Store & Data Model

- Are Zustand stores keeping immutable references, or do they mutate state in place (breaking shallow comparison)?
- Are there derived selectors that recompute O(n) over the whole model on every read? Could they be memoised with `reselect`-style caching?
- Are there subscriptions that fire for every transient interaction-state change (e.g. cursor position) that drive expensive renders?

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality

- Code duplication: are the same patterns (geometry, coordinate transforms, store-update helpers) duplicated across components?
- Dead code: are there exported symbols, components, hooks, or routes (in the examples app) that are never imported?
- Overly complex functions: flag anything with high cyclomatic complexity that is difficult to reason about.
- Inconsistent error handling in the imperative API and the import path — are errors thrown, returned, swallowed?
- Type safety: are there `any`, `unknown` without narrowing, `as` casts that bypass the type system? Are public-API types complete and accurate?
- Magic numbers/strings: timeouts, z-indexes, storage keys, mode names — should be named constants.
- Commented-out code that should be removed.

### 4b. Naming Consistency (isoflow → reticulyne rename)

The package was renamed but many internal identifiers may still carry the old name. Catalogue what remains:

- Symbols: `Isoflow`, `useIsoflow`, `IsoflowProps`, `IsoflowState`, etc.
- CSS class prefixes / data attributes
- localStorage / sessionStorage keys
- Internal event names, custom-element names
- File and directory names under `src/`
- Comments, error messages, log strings
- Public re-exports (the npm API may still export `Isoflow` for backwards compatibility — that is a deliberate decision; flag whether it's still intentional or vestigial)

Per the residual-advisory model: a deliberate kept-name should be commented in source as such. Undocumented retention is a finding.

### 4c. React 19 Migration State

`eslint.config.js` downgrades `react-hooks/refs`, `react-hooks/set-state-in-effect`, and `react-hooks/set-state-in-render` from error to warning for the React 19 migration. Audit:

- How many warnings does `npm run lint` actually emit for those three rules?
- Are the warnings concentrated (suggesting one or two components need attention) or diffuse?
- Are any of the warning sites genuinely buggy (state updates in render paths that cause double-renders or loops)?
- Is there a tracking issue / TODO entry for re-promoting these rules to error?
- Are React 19 `use()` / Suspense / actions patterns being adopted, or is the code still React 18 idiomatic?

### 4d. Testing

- Jest (`npm test`, jsdom): which areas of `src/` have meaningful coverage? Which have none?
- Playwright (`npm run test:e2e`): what user flows are covered? Are the E2E tests stable, or are they marked `.skip` / flaky?
- Are critical paths covered: import/export, schema validation rejection of malformed data, undo/redo, basic editing, mode transitions, embedded-vs-standalone differences?
- Are tests using realistic data (fixtures from `src/fixtures/`) or trivial inline data?
- Are there `xit`, `it.skip`, `test.skip`, or `// TODO: enable this test` markers? Each is a finding unless accompanied by an explanation.
- Is there snapshot abuse — large snapshots that nobody reads when they break?

### 4e. Configuration & Environment

- Is configuration centralised (`src/config.ts`) or sprinkled?
- Are environment-dependent values (e.g. dev server port, docker port, public asset paths) consistently sourced from one place?
- Are webpack configs (`dev`, `prod`, `docker`, `docker-examples`) DRY where they should be, or do they duplicate non-trivial logic?
- Is `tsconfig.json` vs `tsconfig.build.json` split correctly — strictness should be at least as strict in build as in dev.

### 4f. Logging & Observability

A library should be quiet by default. A standalone SPA can be slightly more verbose.

- Are there `console.log` / `console.warn` / `console.error` calls left in production code that should be removed or gated on a debug flag?
- Are user-facing errors surfaced through a structured channel (toast, error boundary, onError callback prop) rather than `console.error`?
- Are React error boundaries placed around the editor root so a render error doesn't crash the embedder's app?
- Are warnings about deprecated props / APIs emitted to console at most once per call site?

---

## Section 5: Public API Stability & Embedding Contract

This section is unique to a published component library.

- Is every exported symbol from the main entry (`./`) and the standalone subpath (`./standalone`) documented in `docs/embedding.md`?
- Are the prop types exhaustive — every prop has a TypeScript type, every prop is described in `docs/embedding.md` with default, required/optional status, and a one-line semantic?
- Are imperative API methods (`useReticulyne()` / `useIsoflow()`) covered with examples?
- Is the editor-mode contract documented (read-only vs. interactive vs. debug)?
- Are there exported types that leak internal implementation (e.g. types referencing Zustand store internals)? Internal types should not be in the public surface.
- Is the SemVer commitment articulated? `0.x.x` allows breaking changes between minor versions; `1.x.x` does not. Reticulyne is at `0.1.0` — flag if any docs imply stability beyond that.
- Is there a migration note for embedders moving from `isoflow` to `reticulyne` (renamed exports, changed prop names)?

---

## Section 6: Documentation

For each documentation file, assess:

**`README.md`:**
- Clear statement of what the library is and its target user (embedder vs. end-user)?
- Install instructions including GitHub Packages auth?
- Minimum requirements (Node, React versions)?
- Pointer to `docs/embedding.md`, `docs/docker.md`, `SECURITY.md`?
- Current with the rename?

**`docs/embedding.md`:**
- Full props/API contract?
- Editor-mode semantics?
- Worked example that compiles?

**`docs/docker.md`:**
- Build / run / persistence / troubleshooting?
- Both image variants documented?
- nginx header behaviour documented?

**`docs/installation.md` / `docs/quickstart.md` / `docs/api.md` / `docs/contributing.md` / `docs/isopacks.md`:**
- Are these current?
- Any references to old paths, old names, or removed features?

**`SECURITY.md`:**
- Reporting channel present?
- Residual-advisory ledger entries each cite an in-source mitigation that actually exists?

**`ROADMAP.md` / `TODO.md`:**
- Are they current, or are they listing items that have been completed or abandoned?

**In-source documentation:**
- Are complex hooks (interaction state machine, store wiring, coordinate transforms) explained?
- Are workarounds / known limitations commented at the call site?
- Are public-API JSDoc comments present where they would appear in IDE hover for embedders?

---

## Section 7: Dependency & Supply Chain Health

(Distinct from Security 2c/2d — that section is about exploitable issues; this section is about hygiene.)

- Is `package-lock.json` committed and current?
- Are `engines.node` (currently `>=22.0.0`) and any `engines.npm` consistent with what CI uses and what `restart.sh` / Dockerfile use?
- Are there unused dependencies? `npx depcheck` or manual scan.
- Are there duplicated dependencies (multiple major versions of the same package pulled in via transitive deps)? `npm ls <pkg>` to verify.
- Are MUI v9, Emotion v11, React 19 mutually compatible at the pinned versions?
- Are peer-dependency ranges wide enough that embedders on the previous React major can still install?
- Are dev tooling versions (Playwright, Jest, TypeScript, ESLint, webpack) current and consistent? Any tool more than two majors behind upstream is a finding.

---

## Section 8: Operational & Deployment Readiness

- Is `bash restart.sh` idempotent and safe to run repeatedly? Does it actually clean up prior containers?
- Are the two Docker images published anywhere, or only built locally?
- Does CI build and test on every PR? Does it publish on tag?
- Are CI workflows pinned to specific action SHAs, or floating tags (`@v3`)?
- Is the GitHub Packages publish step gated on the pack-contents check?
- Is there a release / versioning process documented?
- For the standalone Docker images: is there a documented persistence model? (For an SPA, "persistence" likely means localStorage or downloaded files — the user should know what survives a container restart.)
- Are there documented rollback steps if a bad version is published to GitHub Packages?

---

## Section 9: TODO & Commit-Convention Cross-Reference

Read `TODO.md` before completing the review. When a finding overlaps with a TODO item, cross-reference inline:

    See also: TODO.md — "relevant TODO item text"

Do not enumerate TODO items in the output. Only surface them when they map to a finding you have made independently.

Cross-reference the commit convention from `CLAUDE.md`:

- Commits use `<type>(<id>): <subject>` with `id` from `{SEC, BLD, DEP, QUA, BUG, PRF, FEA, DOC}-NN` (and digit-suffixed types for subsequent passes).
- When you generate action items, suggest the matching task ID prefix for each so the user can adopt them directly into commit messages.

---

## Section 10: Reviewer's Discretion

Use your judgment to add any additional sections or findings not covered above. If you identify a pattern, risk, or opportunity that does not fit the categories above, create a new section for it.

Consider these additional areas (not exhaustive — use your judgment):

- **Accessibility (a11y)** — keyboard navigation, focus management, ARIA roles on the canvas / panels, contrast, screen-reader fallback for a primarily-visual editor (this is genuinely hard for canvas editors — flag the gap honestly without demanding the impossible).
- **Internationalisation** — is text localisable, or is English hardcoded everywhere?
- **Browser compatibility** — what is the minimum supported browser, and is it documented?
- **Touch / pointer handling** — does the editor work on touch devices, or is mouse-only assumed?
- **CI/CD pipeline health** — are workflows current, fast, and actually gating merges?
- **Linting & formatting** — does `npm run lint` pass clean? Are pre-commit hooks in place? Is there formatter drift (`prettier`)?
- **Fork divergence** — how far has Reticulyne diverged from upstream `isoflow`? Is there value in upstreaming or pulling fixes? Are there upstream fixes we have missed?
- **Technical debt** — patterns creating compounding debt that should be addressed proactively.

---

## Output Format

Structure the saved review file as follows. Use this exact structure.

---

# Reticulyne Code Review — YYYY-MM-DD

**Reviewer:** Claude Opus
**Date:** YYYY-MM-DD
**Scope:** Full repository — /Users/adam/Projects/reticulyne/
**Commit reviewed:** [output of `git rev-parse --short HEAD`]
**Prior reviews consulted:** [List any found, or "None — this is the first review"]

---

## Executive Summary

[5–8 paragraphs giving an honest overall assessment of repo health. Lead with the most critical security findings. Summarise the key themes across all categories. Be direct — if something is in poor shape, say so. Do not pad this section.]

---

## Section 1: Repository Minimum File Audit

[Table as specified above]

**Summary:** [Highest-priority gaps, if any.]

---

## Section 2: Security

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### 2a. XSS & Injection in Rendered Diagram Content
### 2b. Embedder-Supplied Prop Trust Boundary
### 2c. Supply Chain — npm Dependencies
### 2d. Supply Chain — Vendored Code
### 2e. Published Package Surface (`dist/`)
### 2f. Docker / nginx Surface
### 2g. Secrets & Credential Exposure
### 2h. Network Egress from the Browser

For each finding use this format:

**[Area] — Brief title of finding**
Severity: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
Location: `path/to/file.tsx:line_number` (omit if not file-specific)
Description: What the issue is and why it matters in concrete terms.
Recommendation: Specific, actionable steps to fix it.
Suggested commit ID: `SEC-NN` (or `SEC2-NN` for second-pass items, per the commit convention)
Status: New | Recurring (code-review-YYYY-MM-DD.md)
See also: TODO.md — "todo item text" (only if applicable)

---

## Section 3: Performance

### 3a. Render Hot Paths
### 3b. Bundle Size
### 3c. Asset & Image Handling
### 3d. Store & Data Model

[Same finding format as Section 2 — use `PRF-NN` for suggested commit IDs]

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality                  → `QUA-NN`
### 4b. Naming Consistency            → `QUA-NN`
### 4c. React 19 Migration State      → `QUA-NN` or `BUG-NN`
### 4d. Testing                       → `QUA-NN`
### 4e. Configuration & Environment   → `BLD-NN`
### 4f. Logging & Observability       → `QUA-NN`

---

## Section 5: Public API Stability & Embedding Contract

[Use `FEA-NN` or `DOC-NN` depending on whether the fix is code or documentation]

---

## Section 6: Documentation

[Use `DOC-NN`]

---

## Section 7: Dependency & Supply Chain Health

[Use `DEP-NN`]

---

## Section 8: Operational & Deployment Readiness

[Use `BLD-NN`]

---

## Section 9: [Additional sections at reviewer's discretion]

---

## Appendix: Finding Summary Table

Complete list of all findings across all sections, sorted by Severity (Critical to Low) then Section.

| # | Section | Severity | Title | Suggested ID | Status |
|---|---------|----------|-------|--------------|--------|
| 1 | 2a | 🔴 Critical | … | SEC-01 | New |

**Total findings:** X (Critical: N, High: N, Medium: N, Low: N)

---

## Action Items Format

After saving the review file, create a second file `action-items-YYYY-MM-DD.md` at the same location. This file distils every finding in the review into independently-actionable work items, ordered by execution priority: Critical first, then High, then Medium (grouped by theme: Security hardening, Performance, Code health, Testing, API & embedding, Documentation, Build & deployment, Dependency hygiene), then Low. Omit any finding that is purely informational and produces no action.

Use this exact structure:

---

# Reticulyne Action Items — YYYY-MM-DD

Derived from [code-review-YYYY-MM-DD.md](./code-review-YYYY-MM-DD.md). Items are listed in execution order: Critical first, then High, then Medium grouped by theme, then Low. Each item is independently actionable and references its finding in the review by appendix number (e.g. `#4` → row 4 of the Appendix Finding Summary Table) and originating section.

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical (do first)

### 1. [Brief title] — `SEC-01`
- **Why:** [Concrete reason — what breaks or what risk exists without this fix]
- **What:** [Specific, actionable steps to resolve]
- **Where:** `path/to/file.tsx:line_number` (omit if not file-specific)
- **Refs:** Review #N (Section X.y)

[Repeat for each Critical finding]

---

## 🟠 High (do before next release)

### N. [Brief title] — `<ID>`
- **Why:** …
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

---

## 🟡 Medium — [Theme group name]

### N. [Brief title] — `<ID>`
- **Why:** …
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

[Repeat for each Medium theme group]

---

## 🟢 Low (do when convenient)

### N. [Brief title] — `<ID>`
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

---

*End of action items. See [code-review-YYYY-MM-DD.md](./code-review-YYYY-MM-DD.md) for full context, severity definitions, and the executive summary.*

---

Rules for writing action items:

- **Every finding with a Recommendation becomes one action item.** Do not merge unrelated findings into one item. Do not split a single finding into multiple items unless the finding explicitly identifies separable independent steps.
- **Ordering within a priority band:** by section number, then by finding order within that section.
- **Why is mandatory** on Critical and High items. For Medium and Low it may be omitted when the title is self-explanatory.
- **Where** should include the most specific location available: file path + line number from the finding. If the finding spans multiple files, list them all. If no specific file was identified, omit the field entirely.
- **Refs** must include the appendix row number (`#N`) and the section code (e.g. `Section 2a`, `Section 3b`). If a finding has a TODO cross-reference from Section 9, include it here too.
- **Suggested commit ID** is part of the title, in backticks. The next review pass will use suffixed types (`SEC2-NN`, `QUA2-NN`, etc.) per the convention in `CLAUDE.md`.
- **Recurring findings** (Status: Recurring in the review) should be flagged with a parenthetical: `(recurring — first seen code-review-YYYY-MM-DD.md)` appended to the Refs line.
- **Confidence: Low findings** from the review should be included but annotated: add `_Confidence: Low — [reason from review]_` as a final line in the item.
- The action items file is a separate deliverable from the review. Do not reproduce the full finding text — only the information needed to act on it.

---

## Final Instructions

- Be thorough. Read files in full. Do not skim and assume.
- Be specific. File paths and line numbers wherever possible.
- Be honest. If the repo is in excellent shape, say so clearly. If it is poorly maintained, say that too.
- Do not pad findings. Only include real issues — not hypothetical risks or trivial style preferences.
- When uncertain whether something is a genuine issue, include it clearly marked as: Confidence: Low — explain why you are uncertain, and what would need to be confirmed to resolve the uncertainty.
- Cross-reference `SECURITY.md`'s residual-advisory ledger before raising any dependency-CVE finding as new — the team may have already accepted it with documented mitigation.
- The output file is the authoritative record of this review. Future reviews will reference it. Make it worth reading.
- Save both files when you have completed all sections. Do not save either file incrementally. Write each file in a single operation at the end. Save the review file first, then the action items file.
- **Do not `git add` or commit the output files.** The user will handle that manually if and when they want to.
