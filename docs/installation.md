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

You need React and react-dom in your application. The package declares peers `react >= 17`
and `react-dom >= 17`. It is tested against React 18.3; React 19 is on the roadmap.

```bash
npm install react react-dom
```

No CSS imports are required — styles are injected at runtime by Emotion.

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
