// Shared webpack base config.
//
// Every environment-specific config (dev, prod, docker, docker-examples)
// shares the same TypeScript / CSS / SVG loader setup, the same module
// resolution (TsconfigPaths so `src/*` imports work), and the same
// DefinePlugin substitutions for PACKAGE_VERSION + REPOSITORY_URL.
//
// Previously those four blocks were copy-pasted across the four configs,
// which meant a loader change had to land in four places (e.g. when the
// SVG rule was tweaked during a Webpack-5 migration only three of the
// four configs were updated — the prod one ended up with a case-
// sensitive `/\.svg$/` regex while the other three carried the
// case-insensitive `/\.svg$/i` variant). Concentrating the shared
// pieces here removes that drift surface — each per-environment config
// now ONLY declares what's actually different (mode, entry, output,
// devtool, devServer, externals, html-webpack-plugin, etc.) and
// `webpack-merge` stitches them together.

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');

const pkg = require('../package.json');

module.exports = {
  target: 'web',
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.svg$/i,
        type: 'asset/inline'
      },
      {
        // MUI v9 ships ESM `.mjs` internals whose relative/bare imports omit
        // the file extension (e.g. `@mui/material/internal/Transition.mjs`
        // imports `react-transition-group/TransitionGroupContext`). Webpack 5
        // treats imports from `.mjs` (and `"type":"module"` files) as
        // "fully specified", so an extensionless request fails to resolve when
        // MUI is bundled (dev / docker / docker-examples). The prod library
        // build externalises MUI so it never hits this. Relaxing
        // fullySpecified for JS modules restores Node-style extension
        // resolution and is the documented fix for this MUI+webpack combo.
        test: /\.m?js$/,
        resolve: { fullySpecified: false }
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin({ extensions: ['.tsx', '.ts', '.js'] })
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      PACKAGE_VERSION: JSON.stringify(pkg.version),
      REPOSITORY_URL: JSON.stringify(pkg.repository.url)
    })
  ]
};
