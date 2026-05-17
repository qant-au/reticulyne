// Standalone Docker SPA — main editor variant. Built by
// `npm run docker:build`; used by docker/Dockerfile to produce the
// `isoflow` nginx image (port 2222 on the host via restart.sh).
//
// Entry point is src/index-docker.tsx, which mounts a full-screen
// <Isoflow> with no examples picker. No source maps — see the
// rationale in prod.config.js.

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { merge } = require('webpack-merge');
const base = require('./base.config.js');

module.exports = merge(base, {
  mode: 'production',
  entry: './src/index-docker.tsx',
  output: {
    path: path.resolve(__dirname, '../dist-docker'),
    filename: 'main.js'
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, '../src/index.html')
    })
  ]
});
