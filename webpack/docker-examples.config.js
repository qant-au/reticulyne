// Examples-picker SPA build (the full editor UI with the
// BasicEditor / DebugTools / ReadonlyMode menu — i.e., src/index.tsx).
// Mirrors webpack/docker.config.js but switches entry + output dir so
// the two standalone containers can ship side-by-side.
const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  target: 'web',
  output: {
    path: path.resolve(__dirname, '../dist-docker-examples'),
    filename: 'main.js'
  },
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
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, '../src/index.html')
    }),
    new webpack.DefinePlugin({
      PACKAGE_VERSION: JSON.stringify(require('../package.json').version),
      REPOSITORY_URL: JSON.stringify(require('../package.json').repository.url)
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ extensions: ['.tsx', '.ts', '.js'] })]
  }
};
