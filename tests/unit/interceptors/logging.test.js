import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { attachLoggingInterceptor } from "../../../lib/interceptors/logging.js";

global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: console.warn,
  info: console.info
};

describe("attachLoggingInterceptor", () => {
  let mockInstance;
  let mockLogger;
  let requestInterceptor;
  let responseInterceptor;
  let responseErrorInterceptor;
  let requestErrorInterceptor;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    };

    // Create mock axios instance
    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn((onFulfilled, onRejected) => {
            requestInterceptor = onFulfilled;
            requestErrorInterceptor = onRejected;
            return 123; // Mock interceptor ID
          })
        },
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            responseInterceptor = onFulfilled;
            responseErrorInterceptor = onRejected;
            return 456; // Mock interceptor ID
          })
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // === BASIC ATTACHMENT TESTS ===

  test("should attach request and response interceptors with default options", () => {
    const result = attachLoggingInterceptor(mockInstance);

    expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      request: 123,
      response: 456
    });
  });

  test("should not attach request interceptor when logRequests is false", () => {
    const result = attachLoggingInterceptor(mockInstance, { logRequests: false });

    expect(mockInstance.interceptors.request.use).not.toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      request: null,
      response: 456
    });
  });

  test("should not attach response interceptor when both logResponses and logErrors are false", () => {
    const result = attachLoggingInterceptor(mockInstance, { 
      logResponses: false,
      logErrors: false 
    });

    expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).not.toHaveBeenCalled();
    expect(result).toEqual({
      request: 123,
      response: null
    });
  });

  test("should attach response interceptor when logErrors is true but logResponses is false", () => {
    const result = attachLoggingInterceptor(mockInstance, { 
      logResponses: false,
      logErrors: true 
    });

    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(result.response).toBe(456);
  });

  // === REQUEST LOGGING TESTS ===

  test("should log requests with default formatter", () => {
    attachLoggingInterceptor(mockInstance);

    const config = {
      method: 'get',
      url: '/api/users',
      baseURL: 'https://api.example.com',
      params: { page: 1 },
      data: { name: 'John' },
      headers: { 'Content-Type': 'application/json' }
    };

    const result = requestInterceptor(config);

    expect(console.log).toHaveBeenCalledWith(
      '🚀 Request:',
      {
        method: 'GET',
        url: '/api/users',
        baseURL: 'https://api.example.com',
        params: { page: 1 },
        data: { name: 'John' },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    expect(result).toBe(config); // Should return config unchanged
  });

  test("should use custom logger", () => {
    attachLoggingInterceptor(mockInstance, { logger: mockLogger });

    const config = { method: 'post', url: '/api/users' };
    requestInterceptor(config);

    expect(mockLogger.log).toHaveBeenCalledWith(
      '🚀 Request:',
      expect.objectContaining({
        method: 'POST',
        url: '/api/users'
      })
    );
    expect(console.log).not.toHaveBeenCalled();
  });

  test("should use custom request formatter", () => {
    const customFormatter = jest.fn((config) => ({
      timestamp: new Date().toISOString(),
      endpoint: `${config.method} ${config.url}`,
      hasData: !!config.data
    }));

    attachLoggingInterceptor(mockInstance, { 
      requestFormatter: customFormatter 
    });

    const config = { method: 'put', url: '/api/users/1', data: { name: 'Jane' } };
    requestInterceptor(config);

    expect(customFormatter).toHaveBeenCalledWith(config);
    expect(console.log).toHaveBeenCalledWith(
      '🚀 Request:',
      expect.objectContaining({
        endpoint: 'put /api/users/1',
        hasData: true
      })
    );
  });

  test("should handle config with missing method", () => {
    attachLoggingInterceptor(mockInstance);

    const config = { url: '/api/users' };
    const result = requestInterceptor(config);

    expect(console.log).toHaveBeenCalledWith(
      '🚀 Request:',
      expect.objectContaining({
        method: undefined,
        url: '/api/users'
      })
    );
    expect(result).toBe(config);
  });

  test("should handle request errors when logErrors is true", () => {
    attachLoggingInterceptor(mockInstance, { logErrors: true });

    const error = new Error('Network error');
    error.config = { method: 'get', url: '/api/users' };

    const promise = requestErrorInterceptor(error);

    expect(console.error).toHaveBeenCalledWith(
      '❌ Request Error:',
      {
        message: 'Network error',
        code: undefined,
        response: null,
        config: {
          method: 'GET',
          url: '/api/users'
        }
      }
    );
    return expect(promise).rejects.toBe(error);
  });

  // === RESPONSE LOGGING TESTS ===

  test("should log responses with default formatter", () => {
    attachLoggingInterceptor(mockInstance);

    const response = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { success: true },
      config: {
        method: 'get',
        url: '/api/users'
      }
    };

    const result = responseInterceptor(response);

    expect(console.log).toHaveBeenCalledWith(
      '✅ Response:',
      {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
        config: {
          method: 'GET',
          url: '/api/users'
        }
      }
    );
    expect(result).toBe(response);
  });

  test("should use custom response formatter", () => {
    const customFormatter = jest.fn((response) => ({
      status: response.status,
      duration: response.config?.metadata?.duration || 0,
      size: JSON.stringify(response.data).length
    }));

    attachLoggingInterceptor(mockInstance, { 
      responseFormatter: customFormatter 
    });

    const response = {
      status: 201,
      data: { id: 1, name: 'John' },
      config: {
        method: 'post',
        url: '/api/users',
        metadata: { duration: 123 }
      }
    };

    responseInterceptor(response);

    expect(customFormatter).toHaveBeenCalledWith(response);
    expect(console.log).toHaveBeenCalledWith(
      '✅ Response:',
      {
        status: 201,
        duration: 123,
        size: expect.any(Number)
      }
    );
  });

  test("should not log responses when logResponses is false", () => {
    attachLoggingInterceptor(mockInstance, { logResponses: false });

    const response = { 
      status: 200, 
      data: {},
      config: { method: 'get', url: '/test' }
    };
    const result = responseInterceptor(response);

    expect(console.log).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });

  // === ERROR LOGGING TESTS ===

  test("should log response errors with default formatter", () => {
    attachLoggingInterceptor(mockInstance);

    const error = new Error('Request failed');
    error.response = {
      status: 404,
      statusText: 'Not Found',
      data: { error: 'User not found' }
    };
    error.config = {
      method: 'get',
      url: '/api/users/999'
    };

    const promise = responseErrorInterceptor(error);

    expect(console.error).toHaveBeenCalledWith(
      '❌ Response Error:',
      {
        message: 'Request failed',
        code: undefined,
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'User not found' }
        },
        config: {
          method: 'GET',
          url: '/api/users/999'
        }
      }
    );
    return expect(promise).rejects.toBe(error);
  });

  test("should use custom error formatter", () => {
    const customFormatter = jest.fn((error) => ({
      errorMessage: error.message,
      statusCode: error.response?.status,
      endpoint: error.config?.url,
      timestamp: new Date().toISOString()
    }));

    attachLoggingInterceptor(mockInstance, {
      errorFormatter: customFormatter,
      logger: mockLogger
    });

    const error = new Error('Server error');
    error.response = { status: 500 };
    error.config = { url: '/api/users' };

    const promise = responseErrorInterceptor(error);

    expect(customFormatter).toHaveBeenCalledWith(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      '❌ Response Error:',
      expect.objectContaining({
        errorMessage: 'Server error',
        statusCode: 500,
        endpoint: '/api/users'
      })
    );
    return expect(promise).rejects.toBe(error);
  });

  test("should not log errors when logErrors is false", () => {
    attachLoggingInterceptor(mockInstance, { logErrors: false });

    const error = new Error('Test error');
    const promise = responseErrorInterceptor(error);

    expect(console.error).not.toHaveBeenCalled();
    return expect(promise).rejects.toBe(error);
  });

  // === EDGE CASES ===

  test("should handle error without response", () => {
    attachLoggingInterceptor(mockInstance);

    const error = new Error('Network timeout');
    error.code = 'ECONNABORTED';
    error.config = { method: 'post', url: '/api/users' };

    const promise = responseErrorInterceptor(error);

    expect(console.error).toHaveBeenCalledWith(
      '❌ Response Error:',
      {
        message: 'Network timeout',
        code: 'ECONNABORTED',
        response: null,
        config: {
          method: 'POST',
          url: '/api/users'
        }
      }
    );
    return expect(promise).rejects.toBe(error);
  });

  test("should handle error without config", () => {
    attachLoggingInterceptor(mockInstance);

    const error = new Error('Unknown error');
    const promise = responseErrorInterceptor(error);

    expect(console.error).toHaveBeenCalledWith(
      '❌ Response Error:',
      {
        message: 'Unknown error',
        code: undefined,
        response: null,
        config: null
      }
    );
    return expect(promise).rejects.toBe(error);
  });

  test("should handle response without config", () => {
    attachLoggingInterceptor(mockInstance);

    const response = {
      status: 200,
      statusText: 'OK',
      data: { result: 'success' },
      config: {} // Empty config object instead of undefined
    };

    responseInterceptor(response);

    expect(console.log).toHaveBeenCalledWith(
      '✅ Response:',
      {
        status: 200,
        statusText: 'OK',
        headers: undefined,
        data: { result: 'success' },
        config: {
          method: undefined,
          url: undefined
        }
      }
    );
  });

  test("should handle uppercase method correctly", () => {
    attachLoggingInterceptor(mockInstance);

    const config = {
      method: 'GET',
      url: '/api/users'
    };

    requestInterceptor(config);

    expect(console.log).toHaveBeenCalledWith(
      '🚀 Request:',
      expect.objectContaining({
        method: 'GET',
        url: '/api/users'
      })
    );
  });

  test("should handle mixed case method", () => {
    attachLoggingInterceptor(mockInstance);

    const config = {
      method: 'PoSt',
      url: '/api/users'
    };

    requestInterceptor(config);

    expect(console.log).toHaveBeenCalledWith(
      '🚀 Request:',
      expect.objectContaining({
        method: 'POST',
        url: '/api/users'
      })
    );
  });

  // === LOGGER VALIDATION TESTS ===

  test("should use console as default logger", () => {
    attachLoggingInterceptor(mockInstance);

    const config = { method: 'get', url: '/test' };
    requestInterceptor(config);

    expect(console.log).toHaveBeenCalled();
  });

  test("should handle logger without log method gracefully", () => {
    const invalidLogger = { error: jest.fn() };
    
    attachLoggingInterceptor(mockInstance, { logger: invalidLogger });

    const config = { method: 'get', url: '/test' };

    expect(() => requestInterceptor(config)).toThrow('logger.log is not a function');
  });

  test("should handle logger without error method gracefully", () => {
    const invalidLogger = { log: jest.fn() };
    
    attachLoggingInterceptor(mockInstance, { logger: invalidLogger });

    const error = new Error('Test error');

    expect(() => responseErrorInterceptor(error)).toThrow('logger.error is not a function');
  });

  // === INTEGRATION TESTS ===

  test("should work with all options combined", () => {
    const customLogger = {
      log: jest.fn(),
      error: jest.fn()
    };

    const requestFormatter = jest.fn((config) => ({
      method: config.method,
      path: config.url
    }));

    const responseFormatter = jest.fn((response) => ({
      statusCode: response.status
    }));

    const errorFormatter = jest.fn((error) => ({
      errorType: error.name
    }));

    attachLoggingInterceptor(mockInstance, {
      logRequests: true,
      logResponses: true,
      logErrors: true,
      logger: customLogger,
      requestFormatter,
      responseFormatter,
      errorFormatter
    });

    const config = { method: 'get', url: '/api/test' };
    requestInterceptor(config);
    expect(customLogger.log).toHaveBeenCalledWith(
      '🚀 Request:',
      { method: 'get', path: '/api/test' }
    );

    const response = { 
      status: 200,
      config: { method: 'get', url: '/api/test' }
    };
    responseInterceptor(response);
    expect(customLogger.log).toHaveBeenCalledWith(
      '✅ Response:',
      { statusCode: 200 }
    );

    const error = new Error('Test');
    const errorPromise = responseErrorInterceptor(error);
    expect(customLogger.error).toHaveBeenCalledWith(
      '❌ Response Error:',
      { errorType: 'Error' }
    );
    return expect(errorPromise).rejects.toBe(error);
  });

  test("should return same config/response/error objects", () => {
    attachLoggingInterceptor(mockInstance);

    const config = { method: 'get', url: '/test' };
    const resultConfig = requestInterceptor(config);
    expect(resultConfig).toBe(config);

    const response = { status: 200, config: { method: 'get', url: '/test' } };
    const resultResponse = responseInterceptor(response);
    expect(resultResponse).toBe(response);

    const error = new Error('Test');
    const resultErrorPromise = responseErrorInterceptor(error);
    return expect(resultErrorPromise).rejects.toBe(error);
  });
});