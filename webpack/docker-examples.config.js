// Standalone Docker SPA — examples-picker variant. Built by
// `npm run docker:examples:build`; used by docker/Dockerfile to
// produce the `reticulyne-examples` nginx image (port 2223 on the host
// via restart.sh).
//
// Entry point is src/index.tsx, the full editor UI with the
// BasicEditor / DebugTools / ReadonlyMode menu. Mirrors
// docker.config.js but switches entry + output dir so the two
// standalone containers can ship side-by-side. No source maps — see
// the rationale in prod.config.js.

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { merge } = require('webpack-merge');
const base = require('./base.config.js');

module.exports = merge(base, {
  mode: 'production',
  // The examples app, plus two pages of their own: viewer.html, the
  // read-only viewer with no React (src/viewer/demo), and parity.html, the
  // editor's read-only render that e2e/viewer-parity.spec.ts compares it to.
  entry: {
    main: './src/index.tsx',
    viewer: './src/viewer/demo/viewerPage.ts',
    parity: './src/examples/parity/parityPage.tsx'
  },
  output: {
    path: path.resolve(__dirname, '../dist-docker-examples'),
    // Content-hashed, as in docker.config.js: nginx caches .js as immutable.
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js'
  },
  plugins: [
    new HtmlWebPackPlugin({
      title: 'Examples | Reticulyne',
      template: path.resolve(__dirname, '../src/index.html'),
      chunks: ['main']
    }),
    new HtmlWebPackPlugin({
      title: 'Viewer | Reticulyne',
      filename: 'viewer.html',
      template: path.resolve(__dirname, '../src/viewer/demo/viewer.html'),
      chunks: ['viewer']
    }),
    new HtmlWebPackPlugin({
      title: 'Parity | Reticulyne',
      filename: 'parity.html',
      template: path.resolve(__dirname, '../src/index.html'),
      chunks: ['parity']
    })
  ]
});
