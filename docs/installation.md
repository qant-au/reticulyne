# Installation

`@qant-au/isoflow` is published to **GitHub Packages**, not the public npm registry. To install
you need to point your package manager at the scoped registry and authenticate with a GitHub
token.

## 1. Create a personal access token

Create a [personal access token](https://github.com/settings/tokens) (classic) with the
`read:packages` scope. If you publish from CI, use the workflow's built-in `GITHUB_TOKEN`
instead — it already has the right scope for package reads.

## 2. Configure your registry

Add the following to a `.npmrc` file at the root of your consuming project (or `~/.npmrc`
globally):

```ini
@qant-au:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The `${GITHUB_TOKEN}` syntax expands from your environment at install time — **do not commit
the token into source**.

## 3. Export the token

```bash
export GITHUB_TOKEN=ghp_yourtokenhere
```

In CI, set `GITHUB_TOKEN` as a secret on the workflow instead of writing it into `.npmrc`.

## 4. Install

```bash
npm install @qant-au/isoflow
```

Yarn / pnpm work the same way:

```bash
yarn add @qant-au/isoflow
pnpm add @qant-au/isoflow
```

## Peer dependencies

`@qant-au/isoflow@2` externalises its UI / state / theming stack so consumers can share a
single copy with their own app instead of bundling duplicates. You need to install these
yourself alongside the library:

```bash
npm install \
  @qant-au/isoflow \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

| Peer | Range | Notes |
|---|---|---|
| `react` | `>=18` | Tested against React 19. |
| `react-dom` | `>=18` | Tested against React 19. |
| `@mui/material` | `^5.18.0` | MUI v5 line. A future fork release will move to MUI v9. |
| `@mui/icons-material` | `^5.18.0` | Same major as `@mui/material`. |
| `@emotion/react` | `^11.14.0` | Required by MUI's CSS-in-JS engine. |
| `@emotion/styled` | `^11.14.1` | Required by MUI's CSS-in-JS engine. |
| `zustand` | `^5.0.13` | Used internally by the library; sharing a copy with the consumer's own zustand store is supported. |

npm 7+ auto-installs declared peer deps, so a fresh `npm install @qant-au/isoflow` will pull
them in. If you're on npm 6 or you want explicit lockfile entries, install them directly.

No CSS imports are required — styles are injected at runtime by Emotion.

## Migrating from v1

If you were on `@qant-au/isoflow@1.x` (which bundled MUI / Emotion / Zustand internally),
the upgrade to v2 is:

1. `npm install @mui/material @mui/icons-material @emotion/react @emotion/styled zustand`
   in your application (the version ranges above are the tested baselines).
2. If your application was already using any of these — congratulations, you now share a
   single copy and your bundle drops by ~270 KB.
3. If your application was *not* using these and you pinned different versions, ensure
   the versions you install fall within the ranges above. Mismatched MUI majors will
   error at provider context lookup.

## Bundler

Any modern bundler can consume the package: webpack, Vite, Rollup, Parcel, esbuild, Next.js.
The package ships both CJS and ESM entries from the same file (webpack-built UMD). A
dedicated ESM build is a planned follow-up.

## Verify

Render the component in your app and confirm it mounts — see [quickstart.md](quickstart.md)
for the worked example.

## Troubleshooting

**`E401 Unable to authenticate`** — the token is missing or has the wrong scope. Confirm:
- `$GITHUB_TOKEN` is exported in the shell where you ran `npm install`.
- The token has `read:packages`.
- The `.npmrc` registry line is at the project root, not a stale entry elsewhere on the
  filesystem (`npm config get registry --location=project` to inspect).

**`E404 Not Found` for `@qant-au/isoflow`** — `@qant-au` is not pointed at GitHub Packages.
Re-check the `@qant-au:registry=...` line in `.npmrc`. The default registry is public npm,
which doesn't host this package.

**Working in a monorepo?** Each workspace that imports `@qant-au/isoflow` needs the registry
configuration in scope. The easiest pattern is a single `.npmrc` at the monorepo root.

## Next steps

- [Quick start](quickstart.md) — render the component.
- [API reference](api.md) — every prop and the imperative hook.
- [Embedding contract](embedding.md) — read-only mode, container sizing, callback identity.
