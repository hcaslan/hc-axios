import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachAuthInterceptor } from '../../../lib/interceptors/auth.js';

/**
 * Tests for auth interceptor
 * 
 * Note: These tests are written to match the current implementation behavior,
 * including limitations like:
 * - Not supporting async token getter functions
 * - Mutating the original config object
 */
describe('Auth Interceptor', () => {
  let mockInstance;
  let interceptorHandler;
  let errorHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn()
        }
      }
    };

    // Mock the interceptor registration
    mockInstance.interceptors.request.use.mockImplementation((onFulfilled, onRejected) => {
      interceptorHandler = onFulfilled;
      errorHandler = onRejected;
      return 123; // Return interceptor ID
    });
  });

  describe('attachAuthInterceptor', () => {
    test('should attach interceptor and return interceptor ID', () => {
      const getTokenFn = jest.fn();
      const interceptorId = attachAuthInterceptor(mockInstance, getTokenFn);

      expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mockInstance.interceptors.request.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
      expect(interceptorId).toBe(123);
    });

    test('should pass error handler that rejects', async () => {
      attachAuthInterceptor(mockInstance, jest.fn());
      
      const error = new Error('Request error');
      await expect(errorHandler(error)).rejects.toBe(error);
    });
  });

  describe('request interception', () => {
    let getTokenFn;

    beforeEach(() => {
      getTokenFn = jest.fn();
      attachAuthInterceptor(mockInstance, getTokenFn);
    });

    test('should add Authorization header when token is present', () => {
      const token = 'test-token-123';
      getTokenFn.mockReturnValue(token);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(getTokenFn).toHaveBeenCalledTimes(1);
      expect(result.headers).toBeDefined();
      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    test('should preserve existing headers', () => {
      const token = 'test-token-456';
      getTokenFn.mockReturnValue(token);

      const config = {
        url: '/api/test',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        }
      };

      const result = interceptorHandler(config);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['X-Custom-Header']).toBe('custom-value');
      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    test('should not add Authorization header when token is null', () => {
      getTokenFn.mockReturnValue(null);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(getTokenFn).toHaveBeenCalledTimes(1);
      expect(result.headers?.Authorization).toBeUndefined();
    });

    test('should not add Authorization header when token is undefined', () => {
      getTokenFn.mockReturnValue(undefined);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(getTokenFn).toHaveBeenCalledTimes(1);
      expect(result.headers?.Authorization).toBeUndefined();
    });

    test('should not add Authorization header when token is empty string', () => {
      getTokenFn.mockReturnValue('');

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(getTokenFn).toHaveBeenCalledTimes(1);
      expect(result.headers?.Authorization).toBeUndefined();
    });

    test('should handle getTokenFn that throws error', () => {
      getTokenFn.mockImplementation(() => {
        throw new Error('Token retrieval failed');
      });

      const config = { url: '/api/test' };

      expect(() => interceptorHandler(config)).toThrow('Token retrieval failed');
    });

    test('should not handle async getTokenFn (returns promise object)', () => {
      // Note: Current implementation doesn't support async token functions
      // Consider awaiting the token before passing it for async token retrieval
      const asyncGetTokenFn = jest.fn().mockResolvedValue('async-token');
      attachAuthInterceptor(mockInstance, asyncGetTokenFn);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(asyncGetTokenFn).toHaveBeenCalledTimes(1);
      // The current implementation would add the Promise object as the token
      expect(result.headers.Authorization).toBe('Bearer [object Promise]');
    });

    test('should handle getTokenFn being null/undefined', () => {
      // Test with null
      attachAuthInterceptor(mockInstance, null);
      const config1 = { url: '/api/test' };
      const result1 = interceptorHandler(config1);
      expect(result1.headers?.Authorization).toBeUndefined();

      // Test with undefined
      attachAuthInterceptor(mockInstance, undefined);
      const config2 = { url: '/api/test' };
      const result2 = interceptorHandler(config2);
      expect(result2.headers?.Authorization).toBeUndefined();
    });

    test('should create headers object if not present', () => {
      getTokenFn.mockReturnValue('test-token');

      const config = { 
        url: '/api/test',
        headers: undefined 
      };

      const result = interceptorHandler(config);

      expect(result.headers).toBeDefined();
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    test('should modify original config object (current implementation behavior)', () => {
      // Note: The current implementation mutates the config object directly
      // This is consistent with how axios interceptors typically work
      getTokenFn.mockReturnValue('test-token');

      const originalConfig = { 
        url: '/api/test',
        headers: { 'X-Test': 'value' }
      };

      const result = interceptorHandler(originalConfig);

      // Current implementation modifies the original config
      expect(originalConfig.headers.Authorization).toBe('Bearer test-token');
      expect(result).toBe(originalConfig); // Returns the same object
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('edge cases', () => {
    test('should handle special characters in token', () => {
      const specialToken = 'Bearer-Token!@#$%^&*()_+{}|:"<>?[]\\;\',./-=';
      const getTokenFn = jest.fn().mockReturnValue(specialToken);
      
      attachAuthInterceptor(mockInstance, getTokenFn);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(result.headers.Authorization).toBe(`Bearer ${specialToken}`);
    });

    test('should handle very long tokens', () => {
      const longToken = 'a'.repeat(1000);
      const getTokenFn = jest.fn().mockReturnValue(longToken);
      
      attachAuthInterceptor(mockInstance, getTokenFn);

      const config = { url: '/api/test' };
      const result = interceptorHandler(config);

      expect(result.headers.Authorization).toBe(`Bearer ${longToken}`);
    });

    test('should handle config without url', () => {
      const getTokenFn = jest.fn().mockReturnValue('test-token');
      attachAuthInterceptor(mockInstance, getTokenFn);

      const config = {}; // No URL
      const result = interceptorHandler(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('integration scenarios', () => {
    test('should work with multiple sequential calls', () => {
      const tokens = ['token1', 'token2', 'token3'];
      let tokenIndex = 0;
      const getTokenFn = jest.fn(() => tokens[tokenIndex++]);

      attachAuthInterceptor(mockInstance, getTokenFn);

      const config = { url: '/api/test' };

      // First call
      let result = interceptorHandler(config);
      expect(result.headers.Authorization).toBe('Bearer token1');

      // Second call
      result = interceptorHandler(config);
      expect(result.headers.Authorization).toBe('Bearer token2');

      // Third call
      result = interceptorHandler(config);
      expect(result.headers.Authorization).toBe('Bearer token3');

      expect(getTokenFn).toHaveBeenCalledTimes(3);
    });

    test('should handle token refresh scenario', () => {
      let currentToken = 'old-token';
      const getTokenFn = jest.fn(() => currentToken);

      attachAuthInterceptor(mockInstance, getTokenFn);

      const config = { url: '/api/test' };

      // First request with old token
      let result = interceptorHandler(config);
      expect(result.headers.Authorization).toBe('Bearer old-token');

      // Token gets refreshed
      currentToken = 'new-token';

      // Next request should use new token
      result = interceptorHandler(config);
      expect(result.headers.Authorization).toBe('Bearer new-token');
    });

    test('should work with different config structures', () => {
      const getTokenFn = jest.fn().mockReturnValue('test-token');
      attachAuthInterceptor(mockInstance, getTokenFn);

      // Test with various config structures
      const configs = [
        { url: '/api/test' },
        { url: '/api/test', method: 'POST' },
        { url: '/api/test', data: { foo: 'bar' } },
        { url: '/api/test', params: { id: 123 } },
        { baseURL: 'https://api.com', url: '/test' }
      ];

      configs.forEach(config => {
        const result = interceptorHandler(config);
        expect(result.headers.Authorization).toBe('Bearer test-token');
      });
    });
  });
});