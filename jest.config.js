/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  modulePaths: ['node_modules', '<rootDir>', '<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/dist-docker/'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/__tests__/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/mocks/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__tests__/mocks/fileMock.js',
    '^react-quill-new$': '<rootDir>/src/__tests__/mocks/reactQuillMock.js',
    '^chroma-js$': '<rootDir>/src/__tests__/mocks/chromaJsMock.js'
  }
};
