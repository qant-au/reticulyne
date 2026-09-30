# Installation

Reticulyne is on npm as [`@reticulyne/editor`](https://www.npmjs.com/package/@reticulyne/editor).
No token or registry setup is needed:

```bash
npm install @reticulyne/editor
```

It was published as `@qant-au/reticulyne` on GitHub Packages up to 0.3.0. Moving from
there, change the dependency and the imports to `@reticulyne/editor`; the API is the one
described in the [changelog](../CHANGELOG.md) for 0.4.0.

To run the editor on its own instead, see [Standalone Docker](docker.md).

## Peer dependencies

`@reticulyne/editor` externalises its UI / state / theming stack so consumers can share a
single copy with their own app instead of bundling duplicates. You need to install these
yourself alongside the library:

```bash
npm install \
  react react-dom \
  @mui/material @mui/icons-material \
  @emotion/react @emotion/styled \
  zustand
```

| Peer | Range | Notes |
|---|---|---|
| `react` | `>=19` | React 18 is not supported. |
| `react-dom` | `>=19` | Same as `react`. |
| `@mui/material` | `^9.0.0` | MUI v9 (`^5` for `@qant-au/reticulyne@2`). |
| `@mui/icons-material` | `^9.0.0` | Same major as `@mui/material`. |
| `@emotion/react` | `^11.14.0` | Required by MUI's CSS-in-JS engine. |
| `@emotion/styled` | `^11.14.1` | Required by MUI's CSS-in-JS engine. |
| `zustand` | `^5.0.13` | Used internally by the library; sharing a copy with the consumer's own zustand store is supported. |

npm 7+ auto-installs declared peer deps, so a fresh `npm install @reticulyne/editor` will pull
them in. If you're on npm 6 or you want explicit lockfile entries, install them directly.

No CSS imports are required — styles are injected at runtime by Emotion.

## Migrating from v2 (MUI v5 → v9)

If you were on `@qant-au/reticulyne@2.x` (which had `@mui/material ^5.18.0` as a peer-dep),
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

If you were on `@qant-au/reticulyne@1.x` (which bundled MUI / Emotion / Zustand internally),
follow the v2 install snippet above first to install all peer-deps, then follow the
v2 → v3 migration above.

## Bundler

Any modern bundler can consume the package: webpack, Vite, Rollup, Parcel, esbuild, Next.js.
The package ships both CJS and ESM entries from the same file (webpack-built UMD). A
dedicated ESM build is a planned follow-up.

## Browser support

The published bundle is compiled against the `browserslist` declared in `package.json`:

```json
"production": [">0.2%", "not dead", "not op_mini all"]
```

Practically that's the current and previous major of every evergreen browser — recent
Chrome / Edge / Firefox / Safari (including iOS Safari 14+ and Android Chrome on modern
versions of the platform). Internet Explorer, Opera Mini, and any vendor-discontinued
browser are excluded.

If your application needs to target older browsers, transpile the package output yourself
in your consuming build (e.g. run Babel against `node_modules/@reticulyne/editor/dist`).
Most consumers don't need to — the targets above cover ~99% of global traffic.

## Verify

Render the component in your app and confirm it mounts — see [quickstart.md](quickstart.md)
for the worked example.

## Next steps

- [Quick start](quickstart.md) — render the component.
- [API reference](api.md) — every prop and the imperative hook.
- [Embedding contract](embedding.md) — read-only mode, container sizing, callback identity.
