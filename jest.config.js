/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  modulePaths: ['node_modules', '<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/dist-docker/'],
  roots: ['<rootDir>/src']
};
