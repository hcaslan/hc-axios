export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-setup.js'],
  collectCoverageFrom: ['lib/**/*.js'],
  transform: {},
  clearMocks: true,
  testTimeout: 10000
};