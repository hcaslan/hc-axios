import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachInterceptorMethods } from '../../../lib/core/interceptorMethods.js';

describe('InterceptorMethods', () => {
  let mockInstance;
  let interceptorIds;
  let mockAttachers;

  beforeEach(() => {
    interceptorIds = {
      auth: null,
      refresh: null,
      retry: null,
      logging: { request: null, response: null },
      upload: { request: null, response: null },
      cache: { request: null, response: null },
      timeout: { request: null, response: null },
      rateLimit: null
    };

    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn().mockReturnValue(1),
          eject: jest.fn()
        },
        response: {
          use: jest.fn().mockReturnValue(2),
          eject: jest.fn()
        }
      }
    };

    mockAttachers = {
      attachAuthInterceptor: jest.fn().mockReturnValue(1),
      attachRefreshInterceptor: jest.fn().mockReturnValue(2),
      attachRetryInterceptor: jest.fn().mockReturnValue(3),
      attachLoggingInterceptor: jest.fn().mockReturnValue({ request: 4, response: 5 }),
      attachUploadInterceptor: jest.fn().mockReturnValue({ request: 6, response: 7 }),
      attachCacheInterceptor: jest.fn().mockReturnValue({ request: 8, response: 9 }),
      attachTimeoutInterceptor: jest.fn().mockReturnValue({ request: 10, response: 11 }),
      attachRateLimitInterceptor: jest.fn().mockReturnValue(12)
    };
  });

  test('should attach all interceptor methods', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    expect(mockInstance.useAuth).toBeDefined();
    expect(mockInstance.useRefreshToken).toBeDefined();
    expect(mockInstance.useRetry).toBeDefined();
    expect(mockInstance.useLogging).toBeDefined();
    expect(mockInstance.useUploadProgress).toBeDefined();
    expect(mockInstance.useCache).toBeDefined();
    expect(mockInstance.useSmartTimeout).toBeDefined();
    expect(mockInstance.useRateLimit).toBeDefined();
  });

  test('should attach auth interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const getToken = () => 'token';
    mockInstance.useAuth(getToken);

    expect(mockAttachers.attachAuthInterceptor).toHaveBeenCalledWith(mockInstance, getToken);
    expect(interceptorIds.auth).toBe(1);
  });

  test('should remove existing interceptor before adding new one', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.auth = 999;
    mockInstance.useAuth(() => 'token');

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
  });

  test('should remove interceptors', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.auth = 123;
    mockInstance.removeAuth();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(123);
    expect(interceptorIds.auth).toBeNull();
  });

   test('should attach refresh token interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { refreshUrl: '/auth/refresh' };
    mockInstance.useRefreshToken(options);

    expect(mockAttachers.attachRefreshInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.refresh).toBe(2);
  });

  test('should remove existing refresh interceptor before adding new one', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.refresh = 999;
    mockInstance.useRefreshToken({ refreshUrl: '/refresh' });

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(999);
  });

  test('should attach retry interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { retries: 5, retryDelay: 2000 };
    mockInstance.useRetry(options);

    expect(mockAttachers.attachRetryInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.retry).toBe(3);
  });

  test('should remove existing retry interceptor before adding new one', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.retry = 888;
    mockInstance.useRetry({ retries: 3 });

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
  });

  test('should attach logging interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { logRequests: true, logResponses: false };
    mockInstance.useLogging(options);

    expect(mockAttachers.attachLoggingInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.logging).toEqual({ request: 4, response: 5 });
  });

  test('should remove existing logging interceptors before adding new ones', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.logging = { request: 111, response: 222 };
    mockInstance.useLogging({ logRequests: true });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(111);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(222);
  });

  test('should attach upload progress interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { onProgress: jest.fn(), onComplete: jest.fn() };
    mockInstance.useUploadProgress(options);

    expect(mockAttachers.attachUploadInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.upload).toEqual({ request: 6, response: 7 });
  });

  test('should remove existing upload interceptors before adding new ones', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.upload = { request: 333, response: 444 };
    mockInstance.useUploadProgress({ onProgress: jest.fn() });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(333);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(444);
  });

  test('should attach cache interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { ttl: 300000, maxAge: 600000 };
    mockInstance.useCache(options);

    expect(mockAttachers.attachCacheInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.cache).toEqual({ request: 8, response: 9 });
  });

  test('should remove existing cache interceptors before adding new ones', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.cache = { request: 555, response: 666 };
    mockInstance.useCache({ ttl: 60000 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(555);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(666);
  });

  test('should attach smart timeout interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { timeout: 10000, adaptive: true };
    mockInstance.useSmartTimeout(options);

    expect(mockAttachers.attachTimeoutInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.timeout).toEqual({ request: 10, response: 11 });
  });

  test('should remove existing timeout interceptors before adding new ones', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.timeout = { request: 777, response: 888 };
    mockInstance.useSmartTimeout({ timeout: 5000 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(777);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
  });

  test('should attach rate limit interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    const options = { maxRequests: 10, windowMs: 60000 };
    mockInstance.useRateLimit(options);

    expect(mockAttachers.attachRateLimitInterceptor).toHaveBeenCalledWith(mockInstance, options);
    expect(interceptorIds.rateLimit).toBe(12);
  });

  test('should remove existing rate limit interceptor before adding new one', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.rateLimit = 999;
    mockInstance.useRateLimit({ maxRequests: 5 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
  });

  // === MISSING REMOVE METHOD TESTS ===

  test('should remove refresh token interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.refresh = 456;
    mockInstance.removeRefreshToken();

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(456);
    expect(interceptorIds.refresh).toBeNull();
  });

  test('should remove retry interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.retry = 789;
    mockInstance.removeRetry();

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(789);
    expect(interceptorIds.retry).toBeNull();
  });

  test('should remove logging interceptors', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.logging = { request: 111, response: 222 };
    mockInstance.removeLogging();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(111);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(222);
    expect(interceptorIds.logging).toEqual({ request: null, response: null });
  });

  test('should remove upload progress interceptors', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.upload = { request: 333, response: 444 };
    mockInstance.removeUploadProgress();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(333);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(444);
    expect(interceptorIds.upload).toEqual({ request: null, response: null });
  });

  test('should remove cache interceptors', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.cache = { request: 555, response: 666 };
    mockInstance.removeCache();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(555);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(666);
    expect(interceptorIds.cache).toEqual({ request: null, response: null });
  });

  test('should remove smart timeout interceptors', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.timeout = { request: 777, response: 888 };
    mockInstance.removeSmartTimeout();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(777);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
    expect(interceptorIds.timeout).toEqual({ request: null, response: null });
  });

  test('should remove rate limit interceptor', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.rateLimit = 999;
    mockInstance.removeRateLimit();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
    expect(interceptorIds.rateLimit).toBeNull();
  });

  // === EDGE CASES AND ERROR HANDLING ===

  test('should handle null interceptor IDs when removing', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    // Test removing when ID is already null
    interceptorIds.auth = null;
    mockInstance.removeAuth();

    // Should not call eject when ID is null
    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(interceptorIds.auth).toBeNull();
  });

  test('should handle null logging interceptor IDs when removing', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.logging = { request: null, response: 222 };
    mockInstance.removeLogging();

    // Should only eject the non-null interceptor
    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(222);
  });

  test('should handle null upload interceptor IDs when removing', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.upload = { request: 333, response: null };
    mockInstance.removeUploadProgress();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(333);
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
  });

  test('should handle null cache interceptor IDs when removing', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.cache = { request: null, response: null };
    mockInstance.removeCache();

    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
  });

  test('should handle null timeout interceptor IDs when removing', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    interceptorIds.timeout = { request: null, response: null };
    mockInstance.removeSmartTimeout();

    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
  });

  test('should use default options when none provided', () => {
    attachInterceptorMethods(mockInstance, interceptorIds, mockAttachers);

    // Test defaults for methods that accept options
    mockInstance.useRetry();
    expect(mockAttachers.attachRetryInterceptor).toHaveBeenCalledWith(mockInstance, {});

    mockInstance.useLogging();
    expect(mockAttachers.attachLoggingInterceptor).toHaveBeenCalledWith(mockInstance, {});
  });
});