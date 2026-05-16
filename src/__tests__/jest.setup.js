// Webpack DefinePlugin replaces these at build time. Jest doesn't run
// through webpack, so define them on globalThis here.
const pkg = require('../../package.json');
globalThis.PACKAGE_VERSION = pkg.version;
globalThis.REPOSITORY_URL = pkg.repository ? pkg.repository.url : '';
