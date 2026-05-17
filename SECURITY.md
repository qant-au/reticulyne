# Security policy

## Reporting a vulnerability

Please open a private security advisory on the [GitHub repository](https://github.com/qant-au/isoflow) (Security → Advisories → "Report a vulnerability"). Do not file a public issue for security reports.

## Known accepted residual advisories

The following `npm audit` advisories are knowingly carried in the published package. Each entry records the advisory, the mitigation in source, and the conditions under which the entry can be closed.

### `GHSA-v3m3-f69x-jf25` — `quill@2.0.3` XSS via HTML export

- **Severity (audit):** low.
- **Reachable via:** `react-quill-new ^3.8.3 → quill ^2.0.3`. `react-quill-new` is the rich-text editor used for node descriptions.
- **Status upstream:** unpatched. The latest published `quill` is `2.0.3`. `npm audit` suggests the "fix" is to downgrade `react-quill-new` to `3.7.0`, but that release predates the advisory disclosure and ships Quill 1.x — a breaking API change that re-introduces other classes of known-vulnerable code. The downgrade is not a viable mitigation; staying on `^3.8.3` with the in-source link-blot override is the better trade.
- **Mitigation in source:** `src/components/MarkdownEditor/sanitizeLinkUrl.ts` overrides Quill's `Link.sanitize` at module load to reject `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URL protocols (including percent-encoded variants). The override runs on both user-typed links and any value-prop-supplied HTML, since Quill's `clipboard.convert` parses incoming HTML through the same Blot registration.
- **Residual risk:** the advisory's exploit path is HTML clipboard pasting that constructs an XSS payload outside the `<a>` blot, e.g. via `<iframe>` or `<svg>` namespaces. Consumers loading `initialData` from untrusted sources should sanitise the `description` field of every model item with DOMPurify (or equivalent) before passing it in. This contract is documented in [`docs/embedding.md`](docs/embedding.md) once the embedding guide lands.
- **Closes when:** an upstream `quill@>=2.0.4` ships with the patch, or this fork moves to a different rich-text editor (e.g. TipTap or Lexical). Tracked as **DEP-04 / DEP-04-follow-up** in the productionisation plan.

### `webpack-dev-server` — XSS source-code disclosure

- **Severity (audit):** moderate, **dev-only** (`devDependencies` chain).
- **Status:** **closed by `DEP3-03`** (third-pass). `webpack-dev-server@^5` resolves GHSA-9jgg-88mc-972h and GHSA-4v9v-hfq4-rm2v. Kept here as a historical entry; `npm audit` no longer reports it.

### `jsdom@<24` chain — `@tootallnate/once`, `http-proxy-agent`

- **Severity (audit):** low, **dev-only** (`jest-environment-jsdom → jsdom`).
- **Status:** **closed by `DEP3-02`** (third-pass). `jest@^30`, `jest-environment-jsdom@^30`, and `jsdom@^29` now resolve the advisory chain. Kept in this ledger as a historical entry; `npm audit` no longer reports it.

## Versioning of these notes

This file is updated in lockstep with `npm audit`. After every dependency bump, re-run `npm audit --omit=dev` and update the residual list accordingly.

Current counts (third-pass review, `jaunty-whisper`):
- `npm audit --omit=dev`: 2 low — both in the `quill` chain documented above.
- `npm audit` (including dev): 7 — the 2 above plus the `webpack-dev-server` moderate and the `jsdom`-chain low (4 entries: `@tootallnate/once`, `http-proxy-agent`, `jsdom`, `jest-environment-jsdom`). The dev-only entries will be closed by the Stage 3 dep bumps tracked as `DEP3-02` (jest stack) and `DEP3-03` (webpack-dev-server).
