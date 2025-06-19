// tests/setup/test-setup.js
import { jest } from '@jest/globals';

global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

global.testTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));