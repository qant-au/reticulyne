# Claude Code instructions for `@reticulyne/core`

> Part of [Projects](../README.md)

These are project-wide instructions read automatically by Claude Code at the start of any session in this repository.

## Always start with Graphify

**Before doing any work — exploration, planning, code changes, reviews — consult the [Graphify](https://github.com/safishamsi/graphify) knowledge graph first.** It is regenerated continuously by `bash restart.sh` (which calls `graphify update .` once, then spawns `graphify watch .` in the background) so the graph is always current with the working tree.

Read in this order:

1. **`graphify-out/GRAPH_REPORT.md`** — natural-language summary of the codebase's key concepts, modules, and relationships. **Read first** for orientation. This is faster than reading individual files when you only need a structural map of the repo.
2. **`graphify-out/graph.json`** — the queryable knowledge graph (nodes, edges, communities). Use it when you need to ask "what depends on X" or "what reaches Y" before doing a grep walk. The JSON includes module / function / class entries with their incoming and outgoing edges.
3. **`graphify-out/graph.html`** — interactive visualisation, openable in a browser. Useful for spatial exploration of related clusters when text is not enough.

The graph regenerates automatically as files change, so it always reflects the current state of the working tree. Treat it as a **first-pass orientation layer** that complements (not replaces) reading the actual source. It is significantly faster than blind grep for understanding what is connected to what — particularly when you are about to touch unfamiliar code.

If `graphify-out/` is missing or stale (e.g. on a freshly-cloned worktree):

```bash
bash restart.sh           # rebuilds + serves both containers and (re-)spawns graphify watch
# or, if you just want the graph and not the containers:
graphify update .
graphify watch .  &
```

If `graphify` itself is not on PATH: `uv tool install graphifyy` (recommended), or `pipx install graphifyy`, or `pip install graphifyy`.

## Running the editor locally

Two side-by-side standalone Docker images come up via `bash restart.sh`:

| URL | Container | What it serves |
|---|---|---|
| http://localhost:2222 | `reticulyne` | Single full-screen editor (`<Reticulyne>` component only — `src/index-docker.tsx`) |
| http://localhost:2223 | `reticulyne-examples` | Examples-picker UI with the BasicEditor / DebugTools / ReadonlyMode menu (`src/index.tsx`) |

`bash restart.sh` rebuilds both images, stops any prior containers, starts the new ones, waits for HTTP 200 on each, and refreshes Graphify. Knobs documented in [`docs/docker.md`](docs/docker.md).

## Test surface

- **Unit + component**: `npm test` (Jest under jsdom). Suites live next to the code in `src/**/__tests__/`.
- **End-to-end (browser)**: `npm run test:e2e` (Playwright + Chromium against the live `reticulyne` container on port 2222). First run needs `npm run test:e2e:install` for the Chromium binary.
- **Linting**: `npm run lint` (runs `tsc --noEmit` then `eslint ./src`). The repo's react-hooks rules `refs`, `set-state-in-effect`, and `set-state-in-render` are intentionally downgraded from error to warning — see the comment in `eslint.config.js` for the React-19-migration rationale.
- **Pack-contents check**: CI asserts only `dist/`, `README.md`, `LICENSE`, `package.json` roots ship in the published tarball; see `.github/workflows/ci.yml`.

## Documentation map

- **[README.md](README.md)** — install, requirements, GitHub Packages auth, test surface, knowledge-graph note, security model.
- **[docs/embedding.md](docs/embedding.md)** — embedding `@reticulyne/core` as a React component (full props/API contract, editor-mode semantics, `useReticulyne()` imperative API, worked example).
- **[docs/docker.md](docs/docker.md)** — standalone Docker deployment (build, run, nginx headers, HEALTHCHECK, persistence model, troubleshooting).
- **[SECURITY.md](SECURITY.md)** — vulnerability reporting + the residual-advisory ledger (each accepted advisory carries an in-source mitigation note).

## Commit conventions

- When working on a structured review/audit, **one commit per task ID** with the ID in the subject line as `<type>(<id>): <subject>` (e.g. `fix(SEC-01): bump zod to patch DoS advisory`). Task IDs follow `<TYPE>-NN` where TYPE is one of `SEC`, `BLD`, `DEP`, `QUA`, `BUG`, `PRF`, `FEA`, `DOC`. Subsequent review passes append a digit to the type to avoid collision in `git log` (e.g. `SEC3-01` for the third pass).
- **Do not rebase, force-push, or amend earlier commits.** Each commit stands as evidence of one task's verification state.
- **Do not push to the remote** unless explicitly asked.
