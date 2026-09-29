# Contributing to Reticulyne

Thanks for your interest in Reticulyne, an open-source React component for drawing isometric network diagrams. It is pre-1.0, so expect breaking
changes between minor versions.

## Ground rules

- Be civil. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- Security issues go to private vulnerability reporting, never a public issue. See
  [SECURITY.md](SECURITY.md).
- Everything else goes in [issues](https://github.com/qant-au/reticulyne/issues): bug reports,
  feature requests and questions alike.
- For anything substantial, open an issue first so we can agree on the scope before you
  write code.

## Development setup

```bash
git clone https://github.com/qant-au/reticulyne.git
cd reticulyne
nvm use            # Node 22 LTS, from .nvmrc
npm ci
```

Run the editor in Docker (the same images the end-to-end tests use):

```bash
bash restart.sh
# http://localhost:2222 - the full-screen editor
# http://localhost:2223 - the examples picker
```

Options and troubleshooting are in [docs/docker.md](docs/docker.md).

## Checks before opening a pull request

```bash
npm run lint         # tsc --noEmit + ESLint
npm test             # Jest unit and component tests
```

For changes to interaction, rendering or the Docker images, also run the Playwright
suite against the running container:

```bash
npm run test:e2e:install   # once: downloads Chromium
bash restart.sh            # start the containers
npm run test:e2e
```

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/),
`<type>(<scope>): <subject>`, where the scope is the area of the code you changed:

```
fix(connectors): keep waypoints when both ends move
feat(export): add a flat SVG export
docs(embedding): document onSave
```

Keep each commit to one logical change.

## Pull request process

1. Fork the repo and branch off `main` (`feature/`, `fix/`, `docs/` or `chore/`).
2. Make your change, with tests where it makes sense.
3. Run the checks above.
4. Open the pull request and link the issue it addresses (`Closes #123`).
5. Expect at least one round of review.
6. Pull requests are squash-merged, with a Conventional Commits message.

## Where things live

- `src/` - the component: `components/`, `interaction/` (modes and shortcuts), `stores/`, `schemas/`, `utils/`.
- `src/examples/` - the examples picker served on port 2223.
- `e2e/` - Playwright specs; `src/**/__tests__/` - Jest tests.
- `docs/` - the embedding and API documentation.
- `Dockerfile`, `docker/`, `webpack/` - the standalone images and build.

## Releases (maintainers)

1. Move the `## [Unreleased]` entries in `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`.
2. `npm version x.y.z --no-git-tag-version`, commit, then `git tag -a vx.y.z`.
3. `git push && git push origin vx.y.z`.

The tag runs `release.yml`, which publishes only if the tag matches `package.json`, the
changelog has that version, the full CI (end-to-end tests included) passes, and the
production `npm audit` and tarball-contents checks pass. A published version cannot be
withdrawn, so a bad release is fixed forward with the next patch, and the changelog
says which version to avoid.

## Licence

MIT. See [LICENSE](LICENSE).
