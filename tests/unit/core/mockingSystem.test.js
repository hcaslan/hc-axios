import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { attachMockingSystem } from '../../../lib/core/mockingSystem.js';

describe('MockingSystem', () => {
  let mockInstance;

  beforeEach(() => {
    mockInstance = {
      request: jest.fn().mockResolvedValue({ data: 'real' }),
      _mocks: undefined,
      _originalRequest: undefined
    };
  });

  test('should intercept and mock matching requests', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/test',
      method: 'get',
      response: { message: 'mocked' }
    });

    const response = await mockInstance.request({
      method: 'get',
      url: '/api/test'
    });

    expect(response.data).toEqual({ message: 'mocked' });
    expect(response.status).toBe(200);
  });

  test('should support wildcard URL matching', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/*',
      response: { message: 'wildcard match' }
    });

    const response = await mockInstance.request({
      url: '/api/users/123'
    });

    expect(response.data).toEqual({ message: 'wildcard match' });
  });

  test('should simulate network delay', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/slow',
      response: { data: 'slow response' },
      delay: 100
    });

    const startTime = Date.now();
    await mockInstance.request({ url: '/api/slow' });
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  test('should clear all mocks', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/test',
      response: { message: 'mocked' }
    });

    mockInstance.clearMocks();

    const response = await mockInstance.request({ url: '/api/test' });
    expect(response.data).toBe('real');
  });
});