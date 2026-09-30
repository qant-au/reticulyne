// The ES module build: `npm run build` emits it beside the CommonJS one
// (prod.config.js) under dist/esm/, and package.json's "import" condition
// points at it. An ESM bundler (Vite, Rollup, esbuild) importing the CommonJS
// build turned `import Reticulyne from '@reticulyne/editor'` into the whole
// module object instead of the component; this build has real exports.

const path = require('path');
const { merge } = require('webpack-merge');
const base = require('./base.config.js');

// The same packages prod.config.js leaves to the host: React (and its
// subpaths, such as the JSX runtime), MUI, Emotion and Zustand.
const shared = (request) =>
  /^react(-dom)?(\/.*)?$/.test(request) ||
  /^@mui\//.test(request) ||
  /^@emotion\//.test(request) ||
  /^zustand(\/.*)?$/.test(request);

module.exports = merge(base, {
  mode: 'production',
  entry: {
    index: './src/Reticulyne.tsx',
    standaloneExports: './src/standaloneExports.ts'
  },
  devtool: 'source-map',
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, '../dist/esm'),
    filename: '[name].mjs',
    chunkFilename: '[id].mjs',
    library: { type: 'module' },
    module: true
  },
  externalsType: 'module',
  externals: [
    ({ request }, callback) => {
      if (shared(request)) return callback(null, 'module ' + request);
      callback();
    }
  ]
});
