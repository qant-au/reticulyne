const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: {
    'index': './src/Isoflow.tsx',
    '/standaloneExports': './src/standaloneExports.ts',
  },
  // Emit separate `.map` files alongside the bundle.  Webpack appends a
  // `//# sourceMappingURL=...` comment to each emitted .js, so a
  // consumer that imports `@qant-au/isoflow` and triggers an error
  // gets a readable stack pointing at TypeScript source rather than
  // the minified bundle.  The .map files ship inside `dist/` (which
  // is already in the `files` allowlist in package.json) and are
  // covered by the pack-contents CI check at .github/workflows/ci.yml.
  //
  // The Docker SPA builds (docker.config.js / docker-examples.config.js)
  // deliberately do NOT enable this — those bundles are served by
  // nginx and a sourceMappingURL there would let any visitor of the
  // deployed editor inspect the entire TypeScript source.
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
    library: {
      type: 'commonjs2'
    }
  },
  externals: [
    // Explicit object form for React + ReactDOM keeps the UMD/AMD
    // global names (`React`, `ReactDOM`) for any consumer that loads
    // the bundle as a script tag.
    {
      react: {
        commonjs: 'react',
        commonjs2: 'react',
        amd: 'React',
        root: 'React'
      },
      'react-dom': {
        commonjs: 'react-dom',
        commonjs2: 'react-dom',
        amd: 'ReactDOM',
        root: 'ReactDOM'
      }
    },
    // Function form to match every subpath of MUI / Emotion / Zustand
    // (e.g. `@mui/material/styles`, `@emotion/styled/base`,
    // `zustand/shallow`) without enumerating each one. Externalising
    // these — they're declared as peer-deps in package.json — keeps
    // the bundle small and lets the consumer share a single copy with
    // their own app. See PRF3-01 + docs/embedding.md.
    ({ request }, callback) => {
      if (
        /^@mui\//.test(request) ||
        /^@emotion\//.test(request) ||
        /^zustand(\/.*)?$/.test(request)
      ) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
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
        test: /\.svg$/,
        type: 'asset/inline'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      PACKAGE_VERSION: JSON.stringify(require("../package.json").version),
      REPOSITORY_URL: JSON.stringify(require("../package.json").repository.url),
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ extensions: ['.tsx', '.ts', '.js'] })]
  }
};
