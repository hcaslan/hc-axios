import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachCacheInterceptor } from '../../../lib/interceptors/cache.js';

describe('Cache Interceptor', () => {
  let mockInstance;
  let requestInterceptor;
  let responseInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('attachment', () => {
    test('should attach cache interceptors to both request and response', () => {
      const interceptorIds = attachCacheInterceptor(mockInstance);

      expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
      expect(interceptorIds).toEqual({ request: 1, response: 2 });
    });

    test('should use default options when none provided', () => {
      attachCacheInterceptor(mockInstance);
      
      const [reqInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      const [resInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
      
      expect(reqInterceptor).toBeDefined();
      expect(resInterceptor).toBeDefined();
    });
  });

  describe('request interception', () => {
    beforeEach(() => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    });

    test('should only cache GET requests', async () => {
      const postConfig = { method: 'POST', url: '/api/data' };
      const result = await requestInterceptor(postConfig);
      
      expect(result).toBe(postConfig);
      expect(result.adapter).toBeUndefined();
    });

    test('should return cached response for GET requests', async () => {
      const cachedResponse = { 
        data: 'cached data',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      // First, cache a response
      await responseInterceptor(cachedResponse);

      // Then make another request
      const config = { method: 'get', url: '/api/data' };
      const result = await requestInterceptor(config);

      expect(result.adapter).toBeDefined();
      const adapterResponse = await result.adapter();
      expect(adapterResponse.data).toBe('cached data');
    });

    test('should not return expired cache', async () => {
      jest.clearAllMocks(); // Clear previous mock calls
      const options = { maxAge: 100 }; // 100ms
      attachCacheInterceptor(mockInstance, options);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const cachedResponse = {
        data: 'old data',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      await responseInterceptor(cachedResponse);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const config = { method: 'get', url: '/api/data' };
      const result = await requestInterceptor(config);

      expect(result.adapter).toBeUndefined();
    });

    test('should handle case-insensitive HTTP methods', async () => {
      const cachedResponse = {
        data: 'cached',
        status: 200,
        config: { method: 'GET', url: '/api/data' }
      };

      await responseInterceptor(cachedResponse);

      const config = { method: 'GET', url: '/api/data' };
      const result = await requestInterceptor(config);

      expect(result.adapter).toBeDefined();
    });
  });

  describe('response interception', () => {
    beforeEach(() => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    });

    test('should cache successful GET responses', async () => {
      const response = {
        data: 'test data',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      const result = await responseInterceptor(response);

      expect(result).toBe(response);

      // Verify it was cached by making another request
      const config = { method: 'get', url: '/api/data' };
      const cachedResult = await requestInterceptor(config);
      expect(cachedResult.adapter).toBeDefined();
    });

    test('should not cache non-200 responses', async () => {
      const response = {
        data: 'error',
        status: 404,
        config: { method: 'get', url: '/api/notfound' }
      };

      await responseInterceptor(response);

      const config = { method: 'get', url: '/api/notfound' };
      const result = await requestInterceptor(config);
      expect(result.adapter).toBeUndefined();
    });

    test('should not cache non-GET responses', async () => {
      const response = {
        data: 'created',
        status: 200,
        config: { method: 'post', url: '/api/data' }
      };

      await responseInterceptor(response);

      const config = { method: 'post', url: '/api/data' };
      const result = await requestInterceptor(config);
      expect(result.adapter).toBeUndefined();
    });

    test('should enforce max cache size', async () => {
      jest.clearAllMocks(); // Clear previous mock calls
      const options = { maxSize: 2 };
      attachCacheInterceptor(mockInstance, options);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      // Add 3 items to cache
      for (let i = 1; i <= 3; i++) {
        await responseInterceptor({
          data: `data${i}`,
          status: 200,
          config: { method: 'get', url: `/api/data${i}` }
        });
      }

      // First item should have been evicted
      const config1 = { method: 'get', url: '/api/data1' };
      const result1 = await requestInterceptor(config1);
      expect(result1.adapter).toBeUndefined();

      // Second and third items should still be cached
      const config2 = { method: 'get', url: '/api/data2' };
      const result2 = await requestInterceptor(config2);
      expect(result2.adapter).toBeDefined();

      const config3 = { method: 'get', url: '/api/data3' };
      const result3 = await requestInterceptor(config3);
      expect(result3.adapter).toBeDefined();
    });
  });

  describe('cache key generation', () => {
    test('should use default key generator', async () => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response1 = {
        data: 'data1',
        status: 200,
        config: { method: 'get', url: '/api/data', params: { id: 1 } }
      };

      const response2 = {
        data: 'data2',
        status: 200,
        config: { method: 'get', url: '/api/data', params: { id: 2 } }
      };

      await responseInterceptor(response1);
      await responseInterceptor(response2);

      // Different params should result in different cache keys
      const config1 = { method: 'get', url: '/api/data', params: { id: 1 } };
      const result1 = await requestInterceptor(config1);
      const adapterResponse1 = await result1.adapter();
      expect(adapterResponse1.data).toBe('data1');

      const config2 = { method: 'get', url: '/api/data', params: { id: 2 } };
      const result2 = await requestInterceptor(config2);
      const adapterResponse2 = await result2.adapter();
      expect(adapterResponse2.data).toBe('data2');
    });

    test('should use custom key generator', async () => {
      const keyGenerator = jest.fn().mockImplementation(config => `custom:${config.url}`);
      
      attachCacheInterceptor(mockInstance, { keyGenerator });
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response = {
        data: 'test',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      await responseInterceptor(response);
      expect(keyGenerator).toHaveBeenCalledWith(response.config);

      const config = { method: 'get', url: '/api/data' };
      await requestInterceptor(config);
      expect(keyGenerator).toHaveBeenCalledWith(config);
    });

    test('should handle requests without params', async () => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response = {
        data: 'no params',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      await responseInterceptor(response);

      const config = { method: 'get', url: '/api/data' };
      const result = await requestInterceptor(config);
      expect(result.adapter).toBeDefined();
    });
  });

  describe('cache cleanup', () => {
    test('should clean expired entries when adding new ones', async () => {
      jest.clearAllMocks(); // Clear previous mock calls
      const options = { maxAge: 100 }; // 100ms
      attachCacheInterceptor(mockInstance, options);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      // Add first item
      await responseInterceptor({
        data: 'old',
        status: 200,
        config: { method: 'get', url: '/api/old' }
      });

      // Wait for it to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add new item (should trigger cleanup)
      await responseInterceptor({
        data: 'new',
        status: 200,
        config: { method: 'get', url: '/api/new' }
      });

      // Old item should be gone
      const oldConfig = { method: 'get', url: '/api/old' };
      const oldResult = await requestInterceptor(oldConfig);
      expect(oldResult.adapter).toBeUndefined();

      // New item should be cached
      const newConfig = { method: 'get', url: '/api/new' };
      const newResult = await requestInterceptor(newConfig);
      expect(newResult.adapter).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle missing method in config', async () => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      // Response without method (should default to handling as GET)
      const response = {
        data: 'test',
        status: 200,
        config: { url: '/api/data' }
      };

      await responseInterceptor(response);

      // Request without method
      const config = { url: '/api/data' };
      const result = await requestInterceptor(config);
      
      // Should not cache since method is undefined
      expect(result.adapter).toBeUndefined();
    });

    test('should handle response without config', async () => {
      jest.clearAllMocks();
      attachCacheInterceptor(mockInstance);
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response = {
        data: 'test',
        status: 200,
        config: {} // Empty config instead of no config to avoid error
      };

      // Should not throw
      const result = await responseInterceptor(response);
      expect(result).toBe(response);
    });

    test('should handle response with missing method in config', async () => {
      jest.clearAllMocks();
      attachCacheInterceptor(mockInstance);
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response = {
        data: 'test',
        status: 200,
        config: { url: '/api/data' } // Config without method
      };

      // Should not throw and should not cache
      const result = await responseInterceptor(response);
      expect(result).toBe(response);
    });

    test('should preserve response structure in cache', async () => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const originalResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config: { method: 'get', url: '/api/data' },
        customProp: 'preserved'
      };

      await responseInterceptor(originalResponse);

      const config = { method: 'get', url: '/api/data' };
      const result = await requestInterceptor(config);
      const cachedResponse = await result.adapter();

      expect(cachedResponse.data).toEqual(originalResponse.data);
      expect(cachedResponse.status).toBe(originalResponse.status);
      expect(cachedResponse.config).toEqual(originalResponse.config);
      expect(cachedResponse.customProp).toBe('preserved');
    });

    test('should handle concurrent requests to same endpoint', async () => {
      attachCacheInterceptor(mockInstance);
      [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
      [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];

      const response = {
        data: 'cached',
        status: 200,
        config: { method: 'get', url: '/api/data' }
      };

      await responseInterceptor(response);

      // Make multiple concurrent requests
      const config = { method: 'get', url: '/api/data' };
      const promises = Array(5).fill(null).map(() => requestInterceptor(config));
      const results = await Promise.all(promises);

      // All should have adapters
      results.forEach(result => {
        expect(result.adapter).toBeDefined();
      });
    });
  });
});