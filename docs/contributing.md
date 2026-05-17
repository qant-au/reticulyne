# Contributing

## Current status

This project is in a heavy-development phase. **The issue tracker and pull requests are
closed** while we work through dependency upgrades, build modernisation, and security
hardening. See the README's [Contributing and support](../README.md#contributing-and-support)
section for the up-to-date stance.

This isn't permanent — the project will reopen for standard open-source contribution once
the foundational work is complete. Until then, please refrain from filing issues, feature
requests, or pull requests. If you'd like to get in touch in the meantime, reach out via
GitHub.

The remainder of this page documents the development workflow for when contributions
reopen, and for maintainers working on the project today.

## Development setup

```bash
git clone https://github.com/qant-au/isoflow.git
cd isoflow
nvm use            # picks up .nvmrc (Node 22 LTS)
npm ci             # install — uses package-lock.json
```

The repo expects Node 22 LTS (declared in `.nvmrc`, the Dockerfile base image, and the
`engines.node` field of `package.json`).

## Run the editor locally

Two standalone Docker images come up via `restart.sh`:

```bash
bash restart.sh
# http://localhost:2222 — single full-screen editor (src/index-docker.tsx)
# http://localhost:2223 — examples-picker UI (src/index.tsx)
```

Full details, including override env-vars, in [docker.md](docker.md).

## Test surface

| Suite | Runner | Command |
|---|---|---|
| Unit + component | Jest (jsdom) | `npm test` |
| End-to-end (browser) | Playwright (Chromium) | `npm run test:e2e` |
| Lint | `tsc --noEmit` + `eslint ./src` | `npm run lint` |

Playwright drives a real browser against the standalone container served by `restart.sh`.
First-time setup on a fresh clone:

```bash
npm ci                          # installs @playwright/test
npm run test:e2e:install        # one-time Chromium binary download (~100MB)
bash restart.sh                 # start the container at http://localhost:2222
npm run test:e2e                # run e2e specs
```

Override the target URL with `PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e`.
Specs live under `e2e/`; outputs (traces, videos, HTML reports) land in `playwright-out/` and
`playwright-report/` and are gitignored.

## Branch and commit conventions

For maintainers landing changes (and contributors when the project reopens):

- **Branch prefixes** — `feature/` for new functionality, `fix/` for bug fixes, `chore/`
  for refactors and non-functional changes, `docs/` for documentation-only changes.
- **One concern per PR** — focused, reviewable, easy to revert.
- **Commit messages** — conventional-style subject (`<type>(<scope>): <subject>`). When
  landing a structured audit pass, the scope is the task ID (e.g. `fix(SEC-01): bump zod`).
- **No force-push, no rebase, no amend** of already-pushed commits. Each commit stands as
  evidence of a verification state.
- **No `--no-verify` or signing bypass** unless explicitly agreed.

## Release process

Releases are cut manually by the maintainer:

1. `npm version patch` (or `minor` / `major` as appropriate).
2. `git push && git push --tags`.

GitHub Actions picks up the tag and publishes the package to GitHub Packages. The CI
workflow asserts the tarball contents (only `dist/`, `README.md`, `LICENSE`,
`package.json` ship) before publishing.

## Knowledge graph (Graphify)

The repo uses [Graphify](https://github.com/safishamsi/graphify) to build a queryable
knowledge graph of the codebase. `restart.sh` runs `graphify update .` (incremental) and
spawns `graphify watch .` in the background if Graphify is installed; otherwise it skips
with a clear message. One-time install:

```bash
uv tool install graphifyy        # recommended
# or: pipx install graphifyy
# or: pip install graphifyy
```

Output lands in `graphify-out/` (gitignored). The `.graphifyignore` file controls what gets
indexed — edit it the same way you'd edit `.gitignore`. Skip Graphify on a single
invocation with `NO_GRAPHIFY=1 bash restart.sh`.

**Where to start when working on unfamiliar code.** Both maintainers and any
AI-assistant agents should consult these in order before grep-walking the
tree:

1. `graphify-out/GRAPH_REPORT.md` — natural-language overview of modules,
   communities, and god nodes. Fastest way to get oriented.
2. `graphify-out/graph.json` — the queryable graph (nodes / edges /
   communities). Use it to answer "what reaches X" / "what depends on Y"
   before doing a blind grep.
3. `graphify-out/graph.html` — interactive visualisation. Open in a
   browser when text-only reading isn't enough.

The Graphify-first workflow is also codified in [CLAUDE.md](../CLAUDE.md)
at the repo root, which is auto-loaded by Claude Code sessions.

## License

MIT — copyright QANT Pty Ltd. See [LICENSE](../LICENSE).
