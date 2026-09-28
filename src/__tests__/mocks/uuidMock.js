// Jest module mock for `uuid`.
//
// Why this exists: uuid@12+ is published as pure ESM, which ts-jest's
// CommonJS pipeline cannot load (same reason as chromaJsMock.js).
// Production / webpack builds load the real uuid; Jest loads this via
// `moduleNameMapper` (see jest.config.js). Only `v4` is used in src.
const { randomUUID } = require('crypto');

module.exports = { v4: () => randomUUID() };
