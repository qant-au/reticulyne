// Standalone Docker SPA — main editor variant. Built by
// `npm run docker:build`; used by docker/Dockerfile to produce the
// `reticulyne` nginx image (port 2222 on the host via restart.sh).
//
// Entry point is src/index-docker.tsx, which mounts a full-screen
// <Reticulyne> with no examples picker. No source maps — see the
// rationale in prod.config.js.

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { merge } = require('webpack-merge');
const base = require('./base.config.js');
const { PwaPlugin } = require('./pwa-plugin.js');

module.exports = merge(base, {
  mode: 'production',
  entry: './src/index-docker.tsx',
  output: {
    path: path.resolve(__dirname, '../dist-docker'),
    // Content-hashed: nginx serves .js as immutable for a year, so a
    // fixed name like main.js kept returning users on the old build.
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js'
  },
  plugins: [
    new HtmlWebPackPlugin({
      title: 'Reticulyne',
      template: path.resolve(__dirname, '../src/index.html')
    }),
    // APP-02: manifest, icons and service worker.
    new PwaPlugin()
  ]
});
