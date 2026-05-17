// Standalone Docker SPA — examples-picker variant. Built by
// `npm run docker:examples:build`; used by docker/Dockerfile to
// produce the `isoflow-examples` nginx image (port 2223 on the host
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
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist-docker-examples'),
    filename: 'main.js'
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, '../src/index.html')
    })
  ]
});
