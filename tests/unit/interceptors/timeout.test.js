import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachTimeoutInterceptor } from '../../../lib/interceptors/timeout.js';

describe('Timeout Interceptor', () => {
  let mockInstance;

  beforeEach(() => {
    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn().mockReturnValue(1)
        },
        response: {
          use: jest.fn().mockReturnValue(2)
        }
      }
    };
  });

  test('should attach timeout interceptors to both request and response', () => {
    const interceptorIds = attachTimeoutInterceptor(mockInstance);

    expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(interceptorIds).toEqual({ request: 1, response: 2 });
  });

  test('should set default timeout', async () => {
    const options = { defaultTimeout: 5000 };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = { url: '/api/data' };
    const result = await requestInterceptor(config);
    
    expect(result.timeout).toBe(5000);
  });

  test('should not override existing timeout', async () => {
    const options = { defaultTimeout: 5000 };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = { 
      url: '/api/data',
      timeout: 10000
    };
    const result = await requestInterceptor(config);
    
    expect(result.timeout).toBe(10000);
  });

  test('should use endpoint-specific timeouts by URL', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        '/api/slow': 30000,
        '/api/fast': 1000
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    // Slow endpoint
    let config = { url: '/api/slow' };
    let result = await requestInterceptor(config);
    expect(result.timeout).toBe(30000);
    
    // Fast endpoint
    config = { url: '/api/fast' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(1000);
    
    // Default
    config = { url: '/api/other' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(5000);
  });

  test('should use endpoint-specific timeouts by METHOD and URL', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'GET /api/data': 3000,
        'POST /api/data': 10000,
        '/api/data': 7000 // Fallback for any method
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    // GET request - should use method-specific timeout
    let config = { method: 'get', url: '/api/data' };
    let result = await requestInterceptor(config);
    expect(result.timeout).toBe(3000);
    
    // POST request - should use method-specific timeout
    config = { method: 'post', url: '/api/data' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(10000);
    
    // PUT request - should fall back to URL-only timeout
    config = { method: 'put', url: '/api/data' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(7000);
    
    // DELETE request with no specific config - should use default
    config = { method: 'delete', url: '/api/other' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(5000);
  });

  test('should handle uppercase method names', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'POST /api/data': 10000
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    // Lowercase method should still match uppercase key
    const config = { method: 'post', url: '/api/data' };
    const result = await requestInterceptor(config);
    expect(result.timeout).toBe(10000);
  });

  test('should call onTimeout callback for timeout errors', async () => {
    const onTimeout = jest.fn();
    const options = { 
      defaultTimeout: 1000,
      onTimeout
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [, responseErrorInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const error = {
      code: 'ECONNABORTED',
      message: 'timeout of 1000ms exceeded',
      config: { 
        url: '/api/data',
        timeout: 1000
      }
    };
    
    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    
    expect(onTimeout).toHaveBeenCalledWith(error, error.config);
  });

  test('should not call onTimeout for non-timeout errors', async () => {
    const onTimeout = jest.fn();
    const options = { onTimeout };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [, responseErrorInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    // Network error (not timeout)
    const error = {
      code: 'ECONNREFUSED',
      message: 'Network Error',
      config: { url: '/api/data' }
    };
    
    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('should pass through successful responses', async () => {
    attachTimeoutInterceptor(mockInstance);
    
    const [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const response = {
      config: { url: '/api/data' },
      status: 200,
      data: { result: 'success' }
    };
    
    const result = await responseInterceptor(response);
    expect(result).toEqual(response);
  });

  test('should handle missing url in config', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'GET ': 3000  // Note the space after GET
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = { method: 'get' }; // No URL
    const result = await requestInterceptor(config);
    
    // Should use 'GET ' as key (with trailing space)
    expect(result.timeout).toBe(3000);
  });

  test('should handle missing method in config', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'GET /api/data': 3000,
        '/api/data': 7000
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = { url: '/api/data' }; // No method (defaults to GET)
    const result = await requestInterceptor(config);
    
    // Should construct 'GET /api/data' as key
    expect(result.timeout).toBe(3000);
  });

  test('should handle empty URL fallback', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'GET ': 3000,
        '': 4000  // Fallback for empty URL
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    // Test with method but no URL - should match 'GET '
    let config = { method: 'get' };
    let result = await requestInterceptor(config);
    expect(result.timeout).toBe(3000);
    
    // Test with POST and no URL - should fall back to '' key
    config = { method: 'post' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(4000);
  });

  test('should work with default parameters', () => {
    // Should not throw with no options
    expect(() => {
      attachTimeoutInterceptor(mockInstance);
    }).not.toThrow();
    
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });

  test('should use default timeout when no options provided', async () => {
    attachTimeoutInterceptor(mockInstance);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = { url: '/api/data' };
    const result = await requestInterceptor(config);
    
    expect(result.timeout).toBe(5000); // Default is 5000ms
  });

  test('should handle timeout error without "timeout" in message', async () => {
    const onTimeout = jest.fn();
    const options = { onTimeout };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [, responseErrorInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    // ECONNABORTED but message doesn't include "timeout"
    const error = {
      code: 'ECONNABORTED',
      message: 'Request aborted',
      config: { url: '/api/data' }
    };
    
    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('should handle complex endpoint keys', async () => {
    const options = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'POST /api/users/:id/profile': 15000,
        'GET /api/search?q=*': 20000
      }
    };
    attachTimeoutInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    // These should not match the patterns (exact match only)
    let config = { method: 'post', url: '/api/users/123/profile' };
    let result = await requestInterceptor(config);
    expect(result.timeout).toBe(5000); // Falls back to default
    
    config = { method: 'get', url: '/api/search?q=test' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(5000); // Falls back to default
    
    // Exact matches should work
    config = { method: 'post', url: '/api/users/:id/profile' };
    result = await requestInterceptor(config);
    expect(result.timeout).toBe(15000);
  });
});