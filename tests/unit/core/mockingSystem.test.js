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

  test('should mock error responses', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/error',
      error: {
        message: 'Custom validation error',
        status: 400,
        statusText: 'Bad Request',
        code: 'VALIDATION_ERROR',
        data: { field: 'email', message: 'Invalid email format' },
        headers: { 'X-Error-Type': 'validation' }
      }
    });

    try {
      await mockInstance.request({ url: '/api/error' });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Custom validation error');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.response.status).toBe(400);
      expect(error.response.statusText).toBe('Bad Request');
      expect(error.response.data).toEqual({ field: 'email', message: 'Invalid email format' });
      expect(error.response.headers['X-Error-Type']).toBe('validation');
      expect(error.config).toBeDefined();
    }
  });

  test('should mock error with default values', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/simple-error',
      error: {
        message: 'Simple error'
      }
    });

    try {
      await mockInstance.request({ url: '/api/simple-error' });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Simple error');
      expect(error.code).toBe('EMOCKED');
      expect(error.response.status).toBe(500);
      expect(error.response.statusText).toBe('Internal Server Error');
      expect(error.response.data).toEqual({});
      expect(error.response.headers).toEqual({});
    }
  });

  test('should mock error with minimal config', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/minimal-error',
      error: {}
    });

    try {
      await mockInstance.request({ url: '/api/minimal-error' });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Mocked error');
      expect(error.code).toBe('EMOCKED');
      expect(error.response.status).toBe(500);
    }
  });

  test('should support function-based URL matching', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: (url, config) => url.includes('dynamic') && config.method === 'post',
      method: 'post',
      response: { matched: 'function-based' }
    });

    // Should match
    const response1 = await mockInstance.request({
      method: 'post',
      url: '/api/dynamic/123'
    });
    expect(response1.data).toEqual({ matched: 'function-based' });

    // Should not match (wrong method)
    const response2 = await mockInstance.request({
      method: 'get',
      url: '/api/dynamic/123'
    });
    expect(response2.data).toBe('real');

    // Should not match (wrong URL)
    const response3 = await mockInstance.request({
      method: 'post',
      url: '/api/static/123'
    });
    expect(response3.data).toBe('real');
  });

  test('should support RegExp URL matching', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: /^\/api\/users\/\d+$/,
      response: { matched: 'regex', userId: 'extracted' }
    });

    // Should match
    const response1 = await mockInstance.request({
      url: '/api/users/123'
    });
    expect(response1.data).toEqual({ matched: 'regex', userId: 'extracted' });

    // Should not match
    const response2 = await mockInstance.request({
      url: '/api/users/abc'
    });
    expect(response2.data).toBe('real');
  });

  test('should support function-based response generation', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/dynamic-response',
      response: (config) => ({
        method: config.method,
        url: config.url,
        data: config.data,
        timestamp: 1234567890
      })
    });

    const response = await mockInstance.request({
      method: 'post',
      url: '/api/dynamic-response',
      data: { test: 'data' }
    });

    expect(response.data.method).toBe('post');
    expect(response.data.url).toBe('/api/dynamic-response');
    expect(response.data.data).toEqual({ test: 'data' });
    expect(response.data.timestamp).toBe(1234567890);
  });

  test('should support async function-based response generation', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/async-response',
      response: async (config) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { async: true, url: config.url };
      }
    });

    const response = await mockInstance.request({
      url: '/api/async-response'
    });

    expect(response.data).toEqual({ async: true, url: '/api/async-response' });
  });

  test('should support custom status and headers', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/custom',
      response: { message: 'created' },
      status: 201,
      statusText: 'Created',
      headers: {
        'X-Custom': 'header-value',
        'Location': '/api/custom/123',
        'Cache-Control': 'no-cache'
      }
    });

    const response = await mockInstance.request({ url: '/api/custom' });

    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
    expect(response.headers['X-Custom']).toBe('header-value');
    expect(response.headers['Location']).toBe('/api/custom/123');
    expect(response.headers['Cache-Control']).toBe('no-cache');
    expect(response.data).toEqual({ message: 'created' });
  });

  test('should remove specific mocks', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/test',
      method: 'get',
      response: { message: 'get response' }
    });

    mockInstance.mock({
      url: '/api/test',
      method: 'post',
      response: { message: 'post response' }
    });

    // Remove GET mock
    mockInstance.removeMock('/api/test', 'get');

    // GET should now go to real endpoint
    const getResponse = await mockInstance.request({ 
      method: 'get', 
      url: '/api/test' 
    });
    expect(getResponse.data).toBe('real');

    // POST should still be mocked
    const postResponse = await mockInstance.request({ 
      method: 'post', 
      url: '/api/test' 
    });
    expect(postResponse.data).toEqual({ message: 'post response' });
  });

  test('should remove mock with default method', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/default',
      response: { message: 'default get' }
    });

    mockInstance.removeMock('/api/default'); // Should default to 'get'

    const response = await mockInstance.request({ url: '/api/default' });
    expect(response.data).toBe('real');
  });

  test('should get active mocks', () => {
    attachMockingSystem(mockInstance);

    const mock1 = { url: '/api/test1', response: { data: '1' } };
    const mock2 = { url: '/api/test2', response: { data: '2' } };

    mockInstance.mock([mock1, mock2]);

    const activeMocks = mockInstance.getMocks();
    expect(activeMocks).toEqual([mock1, mock2]);
  });

  test('should return empty array when no mocks are active', () => {
    attachMockingSystem(mockInstance);

    const activeMocks = mockInstance.getMocks();
    expect(activeMocks).toEqual([]);
  });

  test('should match any method with wildcard', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/any-method',
      method: '*',
      response: { matched: 'any method' }
    });

    const getResponse = await mockInstance.request({ 
      method: 'get', 
      url: '/api/any-method' 
    });
    expect(getResponse.data).toEqual({ matched: 'any method' });

    const postResponse = await mockInstance.request({ 
      method: 'post', 
      url: '/api/any-method' 
    });
    expect(postResponse.data).toEqual({ matched: 'any method' });

    const putResponse = await mockInstance.request({ 
      method: 'put', 
      url: '/api/any-method' 
    });
    expect(putResponse.data).toEqual({ matched: 'any method' });
  });

  test('should match any URL with wildcard', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '*',
      response: { matched: 'everything' }
    });

    const response1 = await mockInstance.request({ url: '/api/anything' });
    expect(response1.data).toEqual({ matched: 'everything' });

    const response2 = await mockInstance.request({ url: '/totally/different' });
    expect(response2.data).toEqual({ matched: 'everything' });
  });

  test('should clear mocks when removing last mock', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/single',
      response: { message: 'mocked' }
    });

    // Verify mock is working
    let response = await mockInstance.request({ url: '/api/single' });
    expect(response.data).toEqual({ message: 'mocked' });

    // Remove the only mock
    mockInstance.removeMock('/api/single');

    // Should restore original request method
    expect(mockInstance._originalRequest).toBeUndefined();
    
    response = await mockInstance.request({ url: '/api/single' });
    expect(response.data).toBe('real');
  });

  test('should handle case-insensitive method matching', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/case-test',
      method: 'POST',
      response: { matched: 'uppercase' }
    });

    const response = await mockInstance.request({ 
      method: 'post', // lowercase
      url: '/api/case-test' 
    });
    expect(response.data).toEqual({ matched: 'uppercase' });
  });

  test('should handle mock removal with case-insensitive method', async () => {
    attachMockingSystem(mockInstance);

    mockInstance.mock({
      url: '/api/case-remove',
      method: 'POST',
      response: { message: 'will be removed' }
    });

    mockInstance.removeMock('/api/case-remove', 'post'); // lowercase

    const response = await mockInstance.request({ 
      method: 'post', 
      url: '/api/case-remove' 
    });
    expect(response.data).toBe('real');
  });

  test('should preserve original request when no mocks defined', async () => {
    attachMockingSystem(mockInstance);

    // No mocks added
    const response = await mockInstance.request({ url: '/api/nomock' });
    expect(response.data).toBe('real');
    expect(mockInstance._originalRequest).toBeUndefined();
  });

  test('should chain method calls', () => {
    attachMockingSystem(mockInstance);

    const result1 = mockInstance.mock({ url: '/test', response: {} });
    expect(result1).toBe(mockInstance);

    const result2 = mockInstance.clearMocks();
    expect(result2).toBe(mockInstance);

    const result3 = mockInstance.removeMock('/test');
    expect(result3).toBe(mockInstance);
  });
});