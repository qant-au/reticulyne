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

`@qant-au/isoflow@3` externalises its UI / state / theming stack so consumers can share a
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
| `@mui/material` | `^9.0.0` | MUI v9 (`^5` for `@qant-au/isoflow@2`). |
| `@mui/icons-material` | `^9.0.0` | Same major as `@mui/material`. |
| `@emotion/react` | `^11.14.0` | Required by MUI's CSS-in-JS engine. |
| `@emotion/styled` | `^11.14.1` | Required by MUI's CSS-in-JS engine. |
| `zustand` | `^5.0.13` | Used internally by the library; sharing a copy with the consumer's own zustand store is supported. |

npm 7+ auto-installs declared peer deps, so a fresh `npm install @qant-au/isoflow` will pull
them in. If you're on npm 6 or you want explicit lockfile entries, install them directly.

No CSS imports are required — styles are injected at runtime by Emotion.

## Migrating from v2 (MUI v5 → v9)

If you were on `@qant-au/isoflow@2.x` (which had `@mui/material ^5.18.0` as a peer-dep),
the upgrade to v3 requires bumping your MUI install too:

1. `npm install @mui/material@^9 @mui/icons-material@^9` in your application.
2. Run MUI's own codemods against your application source:
   ```bash
   npx @mui/codemod@latest v6.0.0/grid-v2-props src
   npx @mui/codemod@latest v7.0.0/grid-props src
   npx @mui/codemod@latest deprecations/all src
   npx @mui/codemod@latest v9.0.0/system-props src
   ```
   Apply in that order — codemods are major-specific and not auto-chained.
3. Hand-fix the two patterns no codemod ships for: `DeleteOutline` → `DeleteOutlined`
   (and any other deprecated `*Outline` icon aliases — v9 removed 23 of them), and
   `<Grid item xs={N}>` → `<Grid size={N}>` (the codemod above usually does this).
4. See MUI's [upgrade-to-v9 guide](https://mui.com/material-ui/migration/upgrade-to-v9/)
   for the full list of consumer-side breaking changes (slot/slotProps overhaul,
   removed `components`/`componentsProps` props, browser support narrowed to Chrome 117+,
   Firefox 121+, Safari 17.0+).

## Migrating from v1

If you were on `@qant-au/isoflow@1.x` (which bundled MUI / Emotion / Zustand internally),
follow the v2 install snippet above first to install all peer-deps, then follow the
v2 → v3 migration above.

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
