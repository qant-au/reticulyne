// Webpack DefinePlugin replaces these at build time. Jest doesn't run
// through webpack, so define them on globalThis here.
const pkg = require('../../package.json');
globalThis.PACKAGE_VERSION = pkg.version;
globalThis.REPOSITORY_URL = pkg.repository ? pkg.repository.url : '';

// jsPDF (introduced under FEA4-04 for the client-side Export-as-PDF
// feature) reaches for `TextEncoder` at module-import time. jsdom
// doesn't expose Node's `util` polyfills on globalThis, so any test
// that transitively imports `src/utils/exportOptions.ts` blows up on
// load before any test code runs. Polyfilling here makes the standard
// Web-API types available in the test environment — these are the
// same implementations browsers ship, exposed by Node via `util`.
const { TextEncoder, TextDecoder } = require('util');
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}
