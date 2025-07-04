import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { attachRateLimitInterceptor } from '../../../lib/interceptors/rateLimit.js';

describe('RateLimit Interceptor', () => {
  let mockInstance;
  let requestInterceptor;

  beforeEach(() => {
    // Create mock axios instance
    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn()
        }
      }
    };

    // Mock the interceptor attachment
    mockInstance.interceptors.request.use.mockImplementation((onFulfilled) => {
      requestInterceptor = onFulfilled;
      return 1;
    });

    // Use fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should attach rate limit interceptor to request', () => {
    const interceptorId = attachRateLimitInterceptor(mockInstance);

    expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.request.use).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(interceptorId).toBe(1);
  });

  test('should allow requests within rate limit', async () => {
    const options = { maxRequests: 3, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First 3 requests should pass
    const result1 = await requestInterceptor(config);
    expect(result1).toEqual(config);

    const result2 = await requestInterceptor(config);
    expect(result2).toEqual(config);

    const result3 = await requestInterceptor(config);
    expect(result3).toEqual(config);
  });

  test('should reject request when rate limit exceeded', async () => {
    const options = { maxRequests: 2, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First 2 requests should pass
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Third request should fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should call onLimit callback when rate limit exceeded', async () => {
    const onLimit = jest.fn();
    const options = { maxRequests: 1, windowMs: 1000, onLimit };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First request passes
    await requestInterceptor(config);

    // Second request should trigger rate limit
    try {
      await requestInterceptor(config);
    } catch (error) {
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(onLimit).toHaveBeenCalledWith(error, config);
    }
  });

  test('should reset rate limit after time window', async () => {
    const options = { maxRequests: 2, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Use up the rate limit
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Should reject immediately
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');

    // Advance time past the window
    jest.advanceTimersByTime(1001);

    // Should allow new requests
    const result = await requestInterceptor(config);
    expect(result).toEqual(config);
  });

  test('should use default values when no options provided', async () => {
    attachRateLimitInterceptor(mockInstance);

    const config = { url: '/api/data' };

    // Default is 100 requests per 60000ms (1 minute)
    // Make 100 requests - all should pass
    for (let i = 0; i < 100; i++) {
      const result = await requestInterceptor(config);
      expect(result).toEqual(config);
    }

    // 101st request should fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should handle sliding window correctly', async () => {
    const options = { maxRequests: 3, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Make 2 requests
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Wait half the window
    jest.advanceTimersByTime(500);

    // Make 1 more request (total 3 in window)
    await requestInterceptor(config);

    // Should reject 4th request
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');

    // Wait until first request is outside window
    jest.advanceTimersByTime(501);

    // Should allow new request (only 2 in window now)
    const result = await requestInterceptor(config);
    expect(result).toEqual(config);
  });

  test('should track requests independently per interceptor instance', async () => {
    const options1 = { maxRequests: 1, windowMs: 1000 };
    const options2 = { maxRequests: 2, windowMs: 1000 };

    // Create two instances with different rate limits
    const mockInstance2 = {
      interceptors: {
        request: {
          use: jest.fn()
        }
      }
    };

    let requestInterceptor2;
    mockInstance2.interceptors.request.use.mockImplementation((onFulfilled) => {
      requestInterceptor2 = onFulfilled;
      return 2;
    });

    attachRateLimitInterceptor(mockInstance, options1);
    attachRateLimitInterceptor(mockInstance2, options2);

    const config = { url: '/api/data' };

    // First instance allows 1 request
    await requestInterceptor(config);
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');

    // Second instance allows 2 requests
    await requestInterceptor2(config);
    await requestInterceptor2(config);
    await expect(requestInterceptor2(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should handle rapid succession of requests', async () => {
    const options = { maxRequests: 5, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Fire 10 requests rapidly
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(requestInterceptor(config).catch(err => err));
    }

    const results = await Promise.all(promises);

    // First 5 should succeed, last 5 should fail
    const successes = results.filter(r => r.url === '/api/data').length;
    const failures = results.filter(r => r.message === 'Rate limit exceeded').length;

    expect(successes).toBe(5);
    expect(failures).toBe(5);
  });

  test('should properly clean up old requests from tracking', async () => {
    const options = { maxRequests: 3, windowMs: 100 }; // Short window for testing
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Make 3 requests
    await requestInterceptor(config);
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Wait for window to expire
    jest.advanceTimersByTime(101);

    // Make 3 more requests - all should pass
    await requestInterceptor(config);
    await requestInterceptor(config);
    await requestInterceptor(config);

    // 4th request should fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should handle empty config object', async () => {
    const options = { maxRequests: 1, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = {}; // Empty config

    // Should still work
    const result = await requestInterceptor(config);
    expect(result).toEqual(config);

    // Second request should fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should preserve error properties', async () => {
    const options = { maxRequests: 0, windowMs: 1000 }; // No requests allowed
    attachRateLimitInterceptor(mockInstance, options);

    const config = { 
      url: '/api/data',
      method: 'GET',
      headers: { 'X-Custom': 'header' }
    };

    try {
      await requestInterceptor(config);
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  test('should handle very large time windows', async () => {
    const options = { 
      maxRequests: 2, 
      windowMs: 24 * 60 * 60 * 1000 // 24 hours
    };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Use up the limit
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Should still be rate limited after 23 hours
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');

    // Should reset after 24 hours
    jest.advanceTimersByTime(60 * 60 * 1000 + 1);
    const result = await requestInterceptor(config);
    expect(result).toEqual(config);
  });

  test('should handle zero window time', async () => {
    const options = { maxRequests: 1, windowMs: 0 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First request should pass
    await requestInterceptor(config);
    
    // With 0ms window, cleanup happens but only AFTER checking the limit
    // The check `requests.length >= maxRequests` happens before cleanup
    // So second request will fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
    
    // However, if we advance time by any amount, cleanup will occur
    jest.advanceTimersByTime(1);
    
    // Now it should work again because old requests are cleaned up
    await requestInterceptor(config);
  });

  test('should handle negative window time', async () => {
    const options = { maxRequests: 1, windowMs: -1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // With negative window, the condition (now - requests[0] > windowMs) is always true
    // because (now - requests[0]) is positive and windowMs is negative
    // This means all requests are immediately considered "old" and removed
    // So no rate limiting occurs
    await requestInterceptor(config);
    await requestInterceptor(config);
    await requestInterceptor(config);
    
    // All requests should pass
    expect(true).toBe(true);
  });

  test('should handle very high max requests', async () => {
    const options = { maxRequests: Number.MAX_SAFE_INTEGER, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Should never hit rate limit in practice
    for (let i = 0; i < 1000; i++) {
      const result = await requestInterceptor(config);
      expect(result).toEqual(config);
    }
  });

  test('should maintain request order in tracking array', async () => {
    const options = { maxRequests: 3, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Make requests at different times
    await requestInterceptor(config);
    jest.advanceTimersByTime(100);
    
    await requestInterceptor(config);
    jest.advanceTimersByTime(100);
    
    await requestInterceptor(config);
    
    // Should reject 4th request
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
    
    // Advance to just after first request expires
    jest.advanceTimersByTime(801);
    
    // Should allow one more request
    await requestInterceptor(config);
    
    // But not a second one
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should not leak memory with many expired requests', async () => {
    const options = { maxRequests: 3, windowMs: 100 };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // Simulate many requests over a long period
    // Each batch fills the limit, then we wait for expiration
    for (let batch = 0; batch < 10; batch++) {
      // Fill up the rate limit
      for (let i = 0; i < 3; i++) {
        await requestInterceptor(config);
      }
      
      // 4th request should fail
      await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
      
      // Wait for window to expire completely
      jest.advanceTimersByTime(101);
    }

    // After 10 batches (30 successful requests), we should still be able to make exactly 3 requests
    // This proves old requests were cleaned up and not accumulating in memory
    for (let i = 0; i < 3; i++) {
      await requestInterceptor(config);
    }

    // And the 4th should still fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
  });

  test('should handle requests with different configs independently', async () => {
    const options = { maxRequests: 2, windowMs: 1000 };
    attachRateLimitInterceptor(mockInstance, options);

    // All requests count towards the same limit regardless of config differences
    await requestInterceptor({ url: '/api/users' });
    await requestInterceptor({ url: '/api/posts', method: 'POST' });
    
    // Third request should fail regardless of endpoint
    await expect(requestInterceptor({ url: '/api/comments' }))
      .rejects.toThrow('Rate limit exceeded');
  });

  test('should throw callback error if onLimit callback throws', async () => {
    const onLimit = jest.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });
    
    const options = { maxRequests: 1, windowMs: 1000, onLimit };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First request passes
    await requestInterceptor(config);

    // Second request should throw the callback error
    await expect(requestInterceptor(config)).rejects.toThrow('Callback error');
    expect(onLimit).toHaveBeenCalled();
  });

  test('should work with async onLimit callback', async () => {
    const onLimit = jest.fn().mockResolvedValue('handled');
    const options = { maxRequests: 1, windowMs: 1000, onLimit };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    await requestInterceptor(config);
    
    try {
      await requestInterceptor(config);
    } catch (error) {
      expect(error.message).toBe('Rate limit exceeded');
      expect(onLimit).toHaveBeenCalled();
    }
  });

  test('should continue to throw rate limit error after onLimit success', async () => {
    let limitReached = false;
    const onLimit = jest.fn((error, config) => {
      limitReached = true;
    });
    
    const options = { maxRequests: 2, windowMs: 1000, onLimit };
    attachRateLimitInterceptor(mockInstance, options);

    const config = { url: '/api/data' };

    // First two requests pass
    await requestInterceptor(config);
    await requestInterceptor(config);

    // Third request should trigger rate limit
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
    expect(onLimit).toHaveBeenCalledTimes(1);
    expect(limitReached).toBe(true);

    // Fourth request should also fail
    await expect(requestInterceptor(config)).rejects.toThrow('Rate limit exceeded');
    expect(onLimit).toHaveBeenCalledTimes(2);
  });
});