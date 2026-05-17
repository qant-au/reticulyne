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
