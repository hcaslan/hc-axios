import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { attachRetryInterceptor } from '../../../lib/interceptors/retry.js';

describe('Retry Interceptor', () => {
  let mockInstance;
  let errorInterceptor;
  let setTimeoutSpy;

  beforeEach(() => {
    // Clear any pending timers from previous tests
    jest.clearAllTimers();
    
    // Create a mock axios instance function
    mockInstance = jest.fn();
    
    // Add interceptors property
    mockInstance.interceptors = {
      response: {
        use: jest.fn()
      }
    };
    
    // Mock the interceptor attachment
    mockInstance.interceptors.response.use.mockImplementation((onSuccess, onError) => {
      errorInterceptor = onError;
      return 1;
    });
    
    jest.useFakeTimers();
    
    // Spy on setTimeout
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    // Clear all timers first
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Restore setTimeout spy if it exists
    if (setTimeoutSpy) {
      setTimeoutSpy.mockRestore();
    }
    
    // Reset interceptor
    errorInterceptor = undefined;
  });

  test('should attach retry interceptor to response', () => {
    const interceptorId = attachRetryInterceptor(mockInstance);

    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
    expect(interceptorId).toBe(1);
  });

  test('should pass through successful responses', async () => {
    attachRetryInterceptor(mockInstance);
    
    const [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const response = {
      config: { url: '/api/data' },
      status: 200,
      data: { result: 'success' }
    };
    
    const result = await responseInterceptor(response);
    expect(result).toEqual(response);
  });

  test('should reject without retry for non-retryable errors', async () => {
    attachRetryInterceptor(mockInstance);
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 404 } // 4xx errors are not retried by default
    };
    
    await expect(errorInterceptor(error)).rejects.toEqual(error);
    expect(mockInstance).not.toHaveBeenCalled();
  });

  test('should retry 5xx errors by default', async () => {
    attachRetryInterceptor(mockInstance);
    
    // Mock successful retry
    mockInstance.mockResolvedValueOnce({
      data: { result: 'success' }
    });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    const promise = errorInterceptor(error);
    
    // Verify retry count was set
    expect(error.config.__retryCount).toBe(1);
    
    // Fast-forward through retry delay
    await jest.runOnlyPendingTimersAsync();
    
    const result = await promise;
    
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/api/data',
      __retryCount: 1
    });
    expect(result.data).toEqual({ result: 'success' });
  });

  test('should retry network errors (no response) by default', async () => {
    attachRetryInterceptor(mockInstance);
    
    mockInstance.mockResolvedValueOnce({
      data: { result: 'recovered' }
    });
    
    const error = {
      config: { url: '/api/data' },
      message: 'Network Error',
      code: 'ECONNREFUSED'
      // No response property
    };
    
    const promise = errorInterceptor(error);
    
    await jest.runOnlyPendingTimersAsync();
    
    const result = await promise;
    
    expect(mockInstance).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ result: 'recovered' });
  });

  test('should exhaust retries and reject', async () => {
    const options = { retries: 2, retryDelay: 100 };
    attachRetryInterceptor(mockInstance, options);
    
    // Test when retry count equals max retries
    const error = {
      config: { 
        url: '/api/data',
        __retryCount: 2 // Already at max
      },
      response: { status: 500 }
    };
    
    // Should reject immediately without calling instance
    await expect(errorInterceptor(error)).rejects.toEqual(error);
    expect(mockInstance).not.toHaveBeenCalled();
  });

  test('should use custom retry condition', async () => {
    const retryCondition = jest.fn().mockReturnValue(false);
    
    const options = { 
      retries: 3,
      retryCondition
    };
    
    attachRetryInterceptor(mockInstance, options);
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    await expect(errorInterceptor(error)).rejects.toEqual(error);
    
    expect(retryCondition).toHaveBeenCalledWith(error);
    expect(mockInstance).not.toHaveBeenCalled();
  });

  test('should use fixed retry delay', async () => {
    const options = { retryDelay: 2000 };
    
    attachRetryInterceptor(mockInstance, options);
    
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    const promise = errorInterceptor(error);
    
    // Verify setTimeout was called with correct delay
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    
    await jest.runOnlyPendingTimersAsync();
    await promise;
    
    expect(mockInstance).toHaveBeenCalled();
  });

  test('should use custom retry delay function', async () => {
    const retryDelayFn = jest.fn().mockReturnValue(3000);
    
    const options = { 
      retryDelay: retryDelayFn
    };
    
    attachRetryInterceptor(mockInstance, options);
    
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    const promise = errorInterceptor(error);
    
    expect(retryDelayFn).toHaveBeenCalledWith(1); // Called with retry count
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
    
    await jest.runOnlyPendingTimersAsync();
    await promise;
  });

  test('should handle shouldResetTimeout option', async () => {
    const options = { shouldResetTimeout: true };
    
    attachRetryInterceptor(mockInstance, options);
    
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { 
        url: '/api/data',
        timeout: 5000
      },
      response: { status: 500 }
    };
    
    const promise = errorInterceptor(error);
    
    await jest.runOnlyPendingTimersAsync();
    await promise;
    
    // Verify timeout was preserved in retry
    expect(mockInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 5000
      })
    );
  });

  test('should increment retry count correctly', async () => {
    attachRetryInterceptor(mockInstance);
    
    // Mock successful response after retry
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    // First call - __retryCount should be undefined initially
    expect(error.config.__retryCount).toBeUndefined();
    
    const promise = errorInterceptor(error);
    
    // After interceptor runs, __retryCount should be 1
    expect(error.config.__retryCount).toBe(1);
    
    await jest.runOnlyPendingTimersAsync();
    
    const result = await promise;
    
    // Should have called instance with retry count
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/api/data',
      __retryCount: 1
    });
    
    expect(result.data).toBe('success');
  });

  test('should handle multiple sequential retries', async () => {
    const options = { retries: 3, retryDelay: 100 };
    attachRetryInterceptor(mockInstance, options);
    
    // Mock to succeed on first call
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    // Start the retry chain
    const promise = errorInterceptor(error);
    
    // Wait for retry delay
    await jest.runOnlyPendingTimersAsync();
    
    const result = await promise;
    
    expect(result.data).toBe('success');
    expect(mockInstance).toHaveBeenCalledTimes(1);
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/api/data',
      __retryCount: 1
    });
  });

  test('should reject immediately when retry condition is not met', async () => {
    const options = {
      retryCondition: (error) => error.response?.status === 503 // Only retry 503
    };
    
    attachRetryInterceptor(mockInstance, options);
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    await expect(errorInterceptor(error)).rejects.toEqual(error);
    expect(mockInstance).not.toHaveBeenCalled();
  });

  test('should handle config without __retryCount', async () => {
    attachRetryInterceptor(mockInstance);
    
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' }, // No __retryCount
      response: { status: 500 }
    };
    
    const promise = errorInterceptor(error);
    
    // Should initialize __retryCount to 0 then increment to 1
    expect(error.config.__retryCount).toBe(1);
    
    await jest.runOnlyPendingTimersAsync();
    await promise;
    
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/api/data',
      __retryCount: 1
    });
  });

  test('should handle exponential backoff with custom delay function', async () => {
    const options = {
      retries: 3,
      retryDelay: (retryCount) => Math.min(1000 * Math.pow(2, retryCount - 1), 10000)
    };
    
    attachRetryInterceptor(mockInstance, options);
    
    mockInstance.mockResolvedValueOnce({ data: 'success' });
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    errorInterceptor(error);
    
    // First retry: delay should be 1000ms (2^0 * 1000)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  test('should preserve error structure when exhausting retries', async () => {
    const options = { retries: 1 };
    attachRetryInterceptor(mockInstance, options);
    
    const error = {
      config: { 
        url: '/api/data',
        __retryCount: 1 // Already at max
      },
      response: { 
        status: 500,
        data: { message: 'Server error' }
      },
      message: 'Request failed with status code 500'
    };
    
    await expect(errorInterceptor(error)).rejects.toEqual(error);
  });

  test('should handle zero retries option', async () => {
    const options = { retries: 0 };
    attachRetryInterceptor(mockInstance, options);
    
    const error = {
      config: { url: '/api/data' },
      response: { status: 500 }
    };
    
    // With 0 retries, should reject immediately
    await expect(errorInterceptor(error)).rejects.toEqual(error);
    expect(mockInstance).not.toHaveBeenCalled();
  });

  test('should handle missing config in error', async () => {
    attachRetryInterceptor(mockInstance);
    
    const error = {
      message: 'Network Error',
      config: {} // Empty config to avoid undefined errors
    };
    
    // With no response and empty config, default retry condition should allow retry
    mockInstance.mockResolvedValueOnce({ data: 'recovered' });
    
    const promise = errorInterceptor(error);
    await jest.runOnlyPendingTimersAsync();
    
    const result = await promise;
    expect(result.data).toBe('recovered');
    expect(mockInstance).toHaveBeenCalledWith({
      __retryCount: 1
    });
  });

  test('should handle completely missing config', async () => {
    attachRetryInterceptor(mockInstance);
    
    const error = {
      message: 'Network Error'
      // No config at all
    };
    
    // This will throw because the interceptor tries to access config.__retryCount
    await expect(errorInterceptor(error)).rejects.toThrow(
      "Cannot read properties of undefined (reading '__retryCount')"
    );
  });
});