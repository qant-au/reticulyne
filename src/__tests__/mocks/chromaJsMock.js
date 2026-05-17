// Jest module mock for `chroma-js`.
//
// Why this exists: chroma-js@3 is published as pure ESM
// (`"type": "module"` in its package.json). ts-jest's default
// CommonJS transpilation does not handle pure-ESM npm packages
// without `transformIgnorePatterns` + `extensionsToTreatAsEsm`
// reconfiguration, which would ripple through the rest of the
// Jest pipeline. The mock sidesteps that: production / webpack
// builds load the real chroma-js, the Jest pipeline loads this
// stub via `moduleNameMapper` (see jest.config.js:14).
//
// Behaviour: the mock returns a chainable instance whose methods
// (`alpha`, `brighten`, `darken`, `saturate`, `desaturate`, `mix`,
// `scale`) all return the same instance, and whose terminal
// accessors (`css`, `hex`, `rgba`, `rgb`, `luminance`) return
// constant placeholders. This is enough for any caller that
// composes a colour expression then renders the result through
// React, which is the whole shape of chroma's usage in the
// codebase (see grep for `chroma(` and `getColorVariant`).
// Tests that care about specific colour output should mock more
// specifically via `jest.doMock` per suite — none currently do.

const chromaInstance = (_input) => {
  const instance = {
    alpha: () => instance,
    brighten: () => instance,
    darken: () => instance,
    saturate: () => instance,
    desaturate: () => instance,
    luminance: () => 0.5,
    css: () => 'rgba(0,0,0,0.5)',
    hex: () => '#000000',
    rgba: () => [0, 0, 0, 0.5],
    rgb: () => [0, 0, 0]
  };
  return instance;
};
chromaInstance.scale = () => chromaInstance;
chromaInstance.contrast = () => 1;
chromaInstance.mix = () => chromaInstance();

module.exports = chromaInstance;
module.exports.default = chromaInstance;
