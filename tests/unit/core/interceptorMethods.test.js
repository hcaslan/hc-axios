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
});