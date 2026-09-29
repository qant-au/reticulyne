/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  modulePaths: ['node_modules', '<rootDir>', '<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/dist-docker/'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/__tests__/jest.setup.js'],
  // Accurona's packages are vendored as ES modules (scripts/sync-accurona.mjs);
  // ts-jest turns them into CommonJS like the TypeScript sources.
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '/src/vendor/accurona-[^/]+/.+\\.js$': 'ts-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/mocks/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__tests__/mocks/fileMock.js',
    '^chroma-js$': '<rootDir>/src/__tests__/mocks/chromaJsMock.js',
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuidMock.js'
  }
};
