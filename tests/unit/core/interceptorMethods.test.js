import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { attachInterceptorMethods } from "../../../lib/core/interceptorMethods.js";

describe("InterceptorMethods", () => {
  let mockInstance;
  let interceptorIds;
  let mockAttachers;
  let interceptorStatus;
  let interceptorEvents;

  beforeEach(() => {
    interceptorIds = {
      auth: null,
      refresh: null,
      retry: null,
      logging: { request: null, response: null },
      upload: { request: null, response: null },
      cache: { request: null, response: null },
      timeout: { request: null, response: null },
      rateLimit: null,
    };

    // Initialize interceptor status tracking
    interceptorStatus = {
      auth: { enabled: false, lastEnabled: null, config: null },
      refresh: { enabled: false, lastEnabled: null, config: null },
      retry: { enabled: false, lastEnabled: null, config: null },
      logging: { enabled: false, lastEnabled: null, config: null },
      upload: { enabled: false, lastEnabled: null, config: null },
      cache: { enabled: false, lastEnabled: null, config: null },
      timeout: { enabled: false, lastEnabled: null, config: null },
      rateLimit: { enabled: false, lastEnabled: null, config: null },
    };

    // Initialize event emitter
    interceptorEvents = {
      listeners: {
        "interceptor:enabled": [],
        "interceptor:removed": [],
        "interceptor:error": [],
      },
      emit: jest.fn((event, data) => {
        if (interceptorEvents.listeners[event]) {
          interceptorEvents.listeners[event].forEach((listener) => {
            listener(data);
          });
        }
      }),
      on: jest.fn((event, listener) => {
        if (interceptorEvents.listeners[event]) {
          interceptorEvents.listeners[event].push(listener);
        }
      }),
      off: jest.fn((event, listener) => {
        if (interceptorEvents.listeners[event]) {
          const index = interceptorEvents.listeners[event].indexOf(listener);
          if (index > -1) {
            interceptorEvents.listeners[event].splice(index, 1);
          }
        }
      }),
    };

    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn().mockReturnValue(1),
          eject: jest.fn(),
        },
        response: {
          use: jest.fn().mockReturnValue(2),
          eject: jest.fn(),
        },
      },
    };

    mockAttachers = {
      attachAuthInterceptor: jest.fn().mockReturnValue(1),
      attachRefreshInterceptor: jest.fn().mockReturnValue(2),
      attachRetryInterceptor: jest.fn().mockReturnValue(3),
      attachLoggingInterceptor: jest
        .fn()
        .mockReturnValue({ request: 4, response: 5 }),
      attachUploadInterceptor: jest
        .fn()
        .mockReturnValue({ request: 6, response: 7 }),
      attachCacheInterceptor: jest
        .fn()
        .mockReturnValue({ request: 8, response: 9 }),
      attachTimeoutInterceptor: jest
        .fn()
        .mockReturnValue({ request: 10, response: 11 }),
      attachRateLimitInterceptor: jest.fn().mockReturnValue(12),
    };
  });

  test("should attach all interceptor methods", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    expect(mockInstance.useAuth).toBeDefined();
    expect(mockInstance.useRefreshToken).toBeDefined();
    expect(mockInstance.useRetry).toBeDefined();
    expect(mockInstance.useLogging).toBeDefined();
    expect(mockInstance.useUploadProgress).toBeDefined();
    expect(mockInstance.useCache).toBeDefined();
    expect(mockInstance.useSmartTimeout).toBeDefined();
    expect(mockInstance.useRateLimit).toBeDefined();
  });

  test("should attach auth interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const getToken = () => "token";
    mockInstance.useAuth(getToken);

    expect(mockAttachers.attachAuthInterceptor).toHaveBeenCalledWith(
      mockInstance,
      getToken
    );
    expect(interceptorIds.auth).toBe(1);
    expect(interceptorStatus.auth.enabled).toBe(true);
    expect(interceptorStatus.auth.config).toBe(getToken);
    expect(interceptorEvents.emit).toHaveBeenCalledWith("interceptor:enabled", {
      name: "auth",
      config: getToken,
      timestamp: expect.any(Date),
    });
  });

  test("should remove existing interceptor before adding new one", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.auth = 999;
    mockInstance.useAuth(() => "token");

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
  });

  test("should remove interceptors", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.auth = 123;
    interceptorStatus.auth.enabled = true;
    interceptorStatus.auth.lastEnabled = new Date();

    mockInstance.removeAuth();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(123);
    expect(interceptorIds.auth).toBeNull();
    expect(interceptorStatus.auth.enabled).toBe(false);
    expect(interceptorEvents.emit).toHaveBeenCalledWith("interceptor:removed", {
      name: "auth",
      timestamp: expect.any(Date),
    });
  });

  test("should attach refresh token interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { refreshUrl: "/auth/refresh" };
    mockInstance.useRefreshToken(options);

    expect(mockAttachers.attachRefreshInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.refresh).toBe(2);
    expect(interceptorStatus.refresh.enabled).toBe(true);
    expect(interceptorStatus.refresh.config).toBe(options);
  });

  test("should remove existing refresh interceptor before adding new one", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.refresh = 999;
    mockInstance.useRefreshToken({ refreshUrl: "/refresh" });

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(999);
  });

  test("should attach retry interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { retries: 5, retryDelay: 2000 };
    mockInstance.useRetry(options);

    expect(mockAttachers.attachRetryInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.retry).toBe(3);
    expect(interceptorStatus.retry.enabled).toBe(true);
  });

  test("should remove existing retry interceptor before adding new one", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.retry = 888;
    mockInstance.useRetry({ retries: 3 });

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
  });

  test("should attach logging interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { logRequests: true, logResponses: false };
    mockInstance.useLogging(options);

    expect(mockAttachers.attachLoggingInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.logging).toEqual({ request: 4, response: 5 });
    expect(interceptorStatus.logging.enabled).toBe(true);
  });

  test("should remove existing logging interceptors before adding new ones", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.logging = { request: 777, response: 888 };
    mockInstance.useLogging({ logLevel: "debug" });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(777);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
  });

  test("should attach upload progress interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { onProgress: jest.fn() };
    mockInstance.useUploadProgress(options);

    expect(mockAttachers.attachUploadInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.upload).toEqual({ request: 6, response: 7 });
    expect(interceptorStatus.upload.enabled).toBe(true);
  });

  test("should remove existing upload interceptors before adding new ones", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.upload = { request: 666, response: 777 };
    mockInstance.useUploadProgress({ onProgress: jest.fn() });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(666);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(777);
  });

  test("should attach cache interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { ttl: 60000 };
    mockInstance.useCache(options);

    expect(mockAttachers.attachCacheInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.cache).toEqual({ request: 8, response: 9 });
    expect(interceptorStatus.cache.enabled).toBe(true);
  });

  test("should remove existing cache interceptors before adding new ones", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.cache = { request: 555, response: 666 };
    mockInstance.useCache({ ttl: 30000 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(555);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(666);
  });

  test("should attach smart timeout interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { timeout: 10000, adaptive: true };
    mockInstance.useSmartTimeout(options);

    expect(mockAttachers.attachTimeoutInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.timeout).toEqual({ request: 10, response: 11 });
    expect(interceptorStatus.timeout.enabled).toBe(true);
  });

  test("should remove existing timeout interceptors before adding new ones", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.timeout = { request: 777, response: 888 };
    mockInstance.useSmartTimeout({ timeout: 5000 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(777);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
  });

  test("should attach rate limit interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const options = { maxRequests: 10, windowMs: 60000 };
    mockInstance.useRateLimit(options);

    expect(mockAttachers.attachRateLimitInterceptor).toHaveBeenCalledWith(
      mockInstance,
      options
    );
    expect(interceptorIds.rateLimit).toBe(12);
    expect(interceptorStatus.rateLimit.enabled).toBe(true);
  });

  test("should remove existing rate limit interceptor before adding new one", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.rateLimit = 999;
    mockInstance.useRateLimit({ maxRequests: 5 });

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
  });

  // === REMOVAL METHOD TESTS ===

  test("should remove refresh token interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.refresh = 456;
    interceptorStatus.refresh.enabled = true;

    mockInstance.removeRefreshToken();

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(456);
    expect(interceptorIds.refresh).toBeNull();
    expect(interceptorStatus.refresh.enabled).toBe(false);
    expect(interceptorEvents.emit).toHaveBeenCalledWith("interceptor:removed", {
      name: "refresh",
      timestamp: expect.any(Date),
    });
  });

  test("should remove retry interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.retry = 789;
    interceptorStatus.retry.enabled = true;

    mockInstance.removeRetry();

    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(789);
    expect(interceptorIds.retry).toBeNull();
    expect(interceptorStatus.retry.enabled).toBe(false);
  });

  test("should remove logging interceptors", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.logging = { request: 111, response: 222 };
    interceptorStatus.logging.enabled = true;

    mockInstance.removeLogging();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(111);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(222);
    expect(interceptorIds.logging.request).toBeNull();
    expect(interceptorIds.logging.response).toBeNull();
    expect(interceptorStatus.logging.enabled).toBe(false);
  });

  test("should remove upload progress interceptors", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.upload = { request: 333, response: 444 };
    interceptorStatus.upload.enabled = true;

    mockInstance.removeUploadProgress();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(333);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(444);
    expect(interceptorIds.upload.request).toBeNull();
    expect(interceptorIds.upload.response).toBeNull();
    expect(interceptorStatus.upload.enabled).toBe(false);
  });

  test("should remove cache interceptors", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.cache = { request: 555, response: 666 };
    interceptorStatus.cache.enabled = true;

    mockInstance.removeCache();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(555);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(666);
    expect(interceptorIds.cache.request).toBeNull();
    expect(interceptorIds.cache.response).toBeNull();
    expect(interceptorStatus.cache.enabled).toBe(false);
  });

  test("should remove smart timeout interceptors", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.timeout = { request: 777, response: 888 };
    interceptorStatus.timeout.enabled = true;

    mockInstance.removeSmartTimeout();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(777);
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(888);
    expect(interceptorIds.timeout.request).toBeNull();
    expect(interceptorIds.timeout.response).toBeNull();
    expect(interceptorStatus.timeout.enabled).toBe(false);
  });

  test("should remove rate limit interceptor", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.rateLimit = 999;
    interceptorStatus.rateLimit.enabled = true;

    mockInstance.removeRateLimit();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(999);
    expect(interceptorIds.rateLimit).toBeNull();
    expect(interceptorStatus.rateLimit.enabled).toBe(false);
  });

  // === NULL INTERCEPTOR ID HANDLING ===

  test("should handle null auth interceptor ID when removing", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.auth = null;
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    mockInstance.removeAuth();

    // Should not call eject when ID is null
    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(interceptorIds.auth).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[hc-axios] Auth interceptor is not currently active"
    );

    consoleSpy.mockRestore();
  });

  test("should handle null logging interceptor IDs when removing", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.logging = { request: null, response: 222 };
    mockInstance.removeLogging();

    // Should only eject the non-null interceptor
    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).toHaveBeenCalledWith(222);
  });

  test("should handle null upload interceptor IDs when removing", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.upload = { request: 333, response: null };
    mockInstance.removeUploadProgress();

    expect(mockInstance.interceptors.request.eject).toHaveBeenCalledWith(333);
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
  });

  test("should handle null cache interceptor IDs when removing", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.cache = { request: null, response: null };
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    mockInstance.removeCache();

    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[hc-axios] Cache interceptors are not currently active"
    );

    consoleSpy.mockRestore();
  });

  test("should handle null timeout interceptor IDs when removing", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.timeout = { request: null, response: null };
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    mockInstance.removeSmartTimeout();

    expect(mockInstance.interceptors.request.eject).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.eject).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[hc-axios] Smart timeout interceptors are not currently active"
    );

    consoleSpy.mockRestore();
  });

  test("should use default options when none provided", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    // Test defaults for methods that accept options
    mockInstance.useRetry();
    expect(mockAttachers.attachRetryInterceptor).toHaveBeenCalledWith(
      mockInstance,
      {}
    );

    mockInstance.useLogging();
    expect(mockAttachers.attachLoggingInterceptor).toHaveBeenCalledWith(
      mockInstance,
      {}
    );
  });

  // === ERROR HANDLING ===

  test("should handle errors during removal", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    interceptorIds.auth = 123;
    mockInstance.interceptors.request.eject.mockImplementation(() => {
      throw new Error("Eject failed");
    });

    expect(() => mockInstance.removeAuth()).toThrow(
      "Failed to remove auth interceptor: Eject failed"
    );
    expect(interceptorEvents.emit).toHaveBeenCalledWith("interceptor:error", {
      name: "auth",
      operation: "remove",
      error: "Eject failed",
      timestamp: expect.any(Date),
    });
  });

  // === STATE CLEANUP ===

  test("should clean up auth-specific state", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    // Add some auth state
    mockInstance._authTokenProvider = jest.fn();
    mockInstance._authCache = new Map();

    interceptorIds.auth = 123;
    mockInstance.removeAuth();

    expect(mockInstance._authTokenProvider).toBeUndefined();
    expect(mockInstance._authCache).toBeUndefined();
  });

  test("should clean up cache state and call clear", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const mockClear = jest.fn();
    mockInstance._cache = { clear: mockClear };
    mockInstance._cacheKeyGenerator = jest.fn();

    interceptorIds.cache = { request: 1, response: 2 };
    mockInstance.removeCache();

    expect(mockClear).toHaveBeenCalled();
    expect(mockInstance._cache).toBeUndefined();
    expect(mockInstance._cacheKeyGenerator).toBeUndefined();
  });

  test("should clean up timeout handlers", () => {
    attachInterceptorMethods(
      mockInstance,
      interceptorIds,
      mockAttachers,
      interceptorStatus,
      interceptorEvents
    );

    const mockHandler = { clear: jest.fn() };
    mockInstance._timeoutHandlers = new Map([
      ["req1", mockHandler],
      ["req2", { clear: jest.fn() }],
    ]);

    interceptorIds.timeout = { request: 1, response: 2 };
    mockInstance.removeSmartTimeout();

    expect(mockHandler.clear).toHaveBeenCalled();
    expect(mockInstance._timeoutHandlers).toBeUndefined();
  });
});
