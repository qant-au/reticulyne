# Security policy

## Reporting a vulnerability

Please open a private security advisory on the [GitHub repository](https://github.com/qant-au/isoflow) (Security → Advisories → "Report a vulnerability"). Do not file a public issue for security reports.

## Known accepted residual advisories

The following `npm audit` advisories are knowingly carried in the published package. Each entry records the advisory, the mitigation in source, and the conditions under which the entry can be closed.

### `GHSA-v3m3-f69x-jf25` — `quill@2.0.3` XSS via HTML export

- **Severity (audit):** low.
- **Reachable via:** `react-quill-new ^3.8.3 → quill ^2.0.3`. `react-quill-new` is the rich-text editor used for node descriptions.
- **Status upstream:** unpatched. The latest published `quill` is `2.0.3`. The advisory's "fix" path downgrades to `react-quill-new@3.7.0` (Quill 1.x), which is a breaking API change and re-introduces other classes of known-vulnerable code.
- **Mitigation in source:** `src/components/MarkdownEditor/sanitizeLinkUrl.ts` overrides Quill's `Link.sanitize` at module load to reject `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URL protocols (including percent-encoded variants). The override runs on both user-typed links and any value-prop-supplied HTML, since Quill's `clipboard.convert` parses incoming HTML through the same Blot registration.
- **Residual risk:** the advisory's exploit path is HTML clipboard pasting that constructs an XSS payload outside the `<a>` blot, e.g. via `<iframe>` or `<svg>` namespaces. Consumers loading `initialData` from untrusted sources should sanitise the `description` field of every model item with DOMPurify (or equivalent) before passing it in. This contract is documented in [`docs/embedding.md`](docs/embedding.md) once the embedding guide lands.
- **Closes when:** an upstream `quill@>=2.0.4` ships with the patch, or this fork moves to a different rich-text editor (e.g. TipTap or Lexical). Tracked as **DEP-04 / DEP-04-follow-up** in the productionisation plan.

### `webpack-dev-server` — XSS source-code disclosure

- **Severity (audit):** moderate, **dev-only** (`devDependencies` chain).
- **Reachable in:** `npm start` development server only. Not shipped in `dist/` or the Docker image.
- **Mitigation:** not relevant to consumers — the published package contains no dev-server code. Developers running `npm start` should not point untrusted browsers at the resulting localhost port.
- **Closes when:** the Webpack 5 / dev-server stack is upgraded in a future Stage 3 dependency pass.

### `jsdom@<24` chain — `@tootallnate/once`, `http-proxy-agent`

- **Severity (audit):** low, **dev-only** (`jest-environment-jsdom → jsdom`).
- **Reachable in:** Jest tests only.
- **Mitigation:** N/A in production. The fix path is a major jest-environment-jsdom upgrade, picked up alongside the Jest / Testing-Library currency pass.

## Versioning of these notes

This file is updated in lockstep with `npm audit`. After every dependency bump, re-run `npm audit --omit=dev` and update the residual list accordingly.
