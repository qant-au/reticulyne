// Dev server (webpack-dev-server). Used by `npm start`. Serves the
// examples-picker SPA (src/index.tsx) on port 3000 with eval-cheap-
// source-map for fast incremental rebuilds.

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { merge } = require('webpack-merge');
const base = require('./base.config.js');

module.exports = merge(base, {
  mode: 'development',
  entry: './src/index.tsx',
  devtool: 'eval-cheap-source-map',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build')
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'build')
    },
    allowedHosts: [
      '.csb.app', // So Codesandbox.io can run the dev server
      '.ngrok-free.app'
    ],
    port: 3000
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, '../src/index.html')
    })
  ]
});
