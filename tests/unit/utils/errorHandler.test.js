import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ErrorHandler } from '../../../lib/utils/errorHandler.js';

describe('ErrorHandler', () => {
  let errorHandler;
  let mockLogger;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      errorHandler = new ErrorHandler();

      expect(errorHandler.handlers).toBeInstanceOf(Map);
      expect(errorHandler.handlers.size).toBe(0);
      expect(errorHandler.globalHandler).toBeUndefined();
      expect(errorHandler.logger).toBe(console);
    });

    test('should initialize with custom options', () => {
      const globalHandler = jest.fn();
      errorHandler = new ErrorHandler({
        globalHandler,
        logger: mockLogger
      });

      expect(errorHandler.globalHandler).toBe(globalHandler);
      expect(errorHandler.logger).toBe(mockLogger);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler({ logger: mockLogger });
    });

    test('should register error handler for specific type', () => {
      const handler = jest.fn();
      errorHandler.register('NETWORK', handler);

      expect(errorHandler.handlers.has('NETWORK')).toBe(true);
      expect(errorHandler.handlers.get('NETWORK')).toBe(handler);
    });

    test('should overwrite existing handler for same type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      errorHandler.register('TIMEOUT', handler1);
      errorHandler.register('TIMEOUT', handler2);

      expect(errorHandler.handlers.get('TIMEOUT')).toBe(handler2);
    });

    test('should register multiple handlers for different types', () => {
      const networkHandler = jest.fn();
      const authHandler = jest.fn();
      const serverHandler = jest.fn();

      errorHandler.register('NETWORK', networkHandler);
      errorHandler.register('UNAUTHORIZED', authHandler);
      errorHandler.register('SERVER_ERROR', serverHandler);

      expect(errorHandler.handlers.size).toBe(3);
      expect(errorHandler.handlers.get('NETWORK')).toBe(networkHandler);
      expect(errorHandler.handlers.get('UNAUTHORIZED')).toBe(authHandler);
      expect(errorHandler.handlers.get('SERVER_ERROR')).toBe(serverHandler);
    });
  });

  describe('getErrorType', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler();
    });

    test('should identify TIMEOUT error', () => {
      const error = new Error('Connection timeout');
      error.code = 'ECONNABORTED';

      expect(errorHandler.getErrorType(error)).toBe('TIMEOUT');
    });

    test('should identify NETWORK error', () => {
      const error = new Error('Network error');
      error.code = 'NETWORK_ERROR';

      expect(errorHandler.getErrorType(error)).toBe('NETWORK');
    });

    test('should identify UNAUTHORIZED error', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };

      expect(errorHandler.getErrorType(error)).toBe('UNAUTHORIZED');
    });

    test('should identify FORBIDDEN error', () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };

      expect(errorHandler.getErrorType(error)).toBe('FORBIDDEN');
    });

    test('should identify NOT_FOUND error', () => {
      const error = new Error('Not found');
      error.response = { status: 404 };

      expect(errorHandler.getErrorType(error)).toBe('NOT_FOUND');
    });

    test('should identify SERVER_ERROR for 5xx status codes', () => {
      const testCases = [500, 501, 502, 503, 504];

      testCases.forEach(status => {
        const error = new Error(`Server error ${status}`);
        error.response = { status };

        expect(errorHandler.getErrorType(error)).toBe('SERVER_ERROR');
      });
    });

    test('should identify CLIENT_ERROR for 4xx status codes', () => {
      const testCases = [400, 405, 406, 422, 429];

      testCases.forEach(status => {
        const error = new Error(`Client error ${status}`);
        error.response = { status };

        expect(errorHandler.getErrorType(error)).toBe('CLIENT_ERROR');
      });
    });

    test('should return UNKNOWN for unrecognized errors', () => {
      const error = new Error('Unknown error');
      expect(errorHandler.getErrorType(error)).toBe('UNKNOWN');
    });

    test('should handle error without response property', () => {
      const error = new Error('No response');
      expect(errorHandler.getErrorType(error)).toBe('UNKNOWN');
    });
  });

  describe('handle', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler({ logger: mockLogger });
    });

    test('should use registered handler for specific error type', async () => {
      const handler = jest.fn().mockResolvedValue('handled');
      errorHandler.register('NETWORK', handler);

      const error = new Error('Network error');
      error.code = 'NETWORK_ERROR';

      const result = await errorHandler.handle(error);

      expect(handler).toHaveBeenCalledWith(error);
      expect(result).toBe('handled');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should use global handler when no specific handler exists', async () => {
      const globalHandler = jest.fn().mockResolvedValue('globally handled');
      errorHandler = new ErrorHandler({ 
        globalHandler,
        logger: mockLogger 
      });

      const error = new Error('Some error');

      const result = await errorHandler.handle(error);

      expect(globalHandler).toHaveBeenCalledWith(error);
      expect(result).toBe('globally handled');
    });

    test('should throw error when no handler is available', async () => {
      const error = new Error('Unhandled error');

      await expect(errorHandler.handle(error)).rejects.toThrow('Unhandled error');
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error:', error);
    });

    test('should handle handler errors gracefully', async () => {
      const handlerError = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(handlerError);
      errorHandler.register('NETWORK', handler);

      const error = new Error('Network error');
      error.code = 'NETWORK_ERROR';

      await expect(errorHandler.handle(error)).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error handler failed:', handlerError);
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error:', error);
    });

    test('should handle async handlers properly', async () => {
      const handler = jest.fn().mockImplementation(async (error) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async handled';
      });
      errorHandler.register('SERVER_ERROR', handler);

      const error = new Error('Server error');
      error.response = { status: 500 };

      const result = await errorHandler.handle(error);

      expect(result).toBe('async handled');
    });

    test('should handle sync handlers properly', async () => {
      const handler = jest.fn().mockReturnValue('sync handled');
      errorHandler.register('CLIENT_ERROR', handler);

      const error = new Error('Bad request');
      error.response = { status: 400 };

      const result = await errorHandler.handle(error);

      expect(result).toBe('sync handled');
    });

    test('should prioritize specific handler over global handler', async () => {
      const specificHandler = jest.fn().mockResolvedValue('specific');
      const globalHandler = jest.fn().mockResolvedValue('global');

      errorHandler = new ErrorHandler({ 
        globalHandler,
        logger: mockLogger 
      });
      errorHandler.register('UNAUTHORIZED', specificHandler);

      const error = new Error('Unauthorized');
      error.response = { status: 401 };

      const result = await errorHandler.handle(error);

      expect(specificHandler).toHaveBeenCalledWith(error);
      expect(globalHandler).not.toHaveBeenCalled();
      expect(result).toBe('specific');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler({ logger: mockLogger });
    });

    test('should handle multiple error types with different handlers', async () => {
      const networkHandler = jest.fn().mockResolvedValue('network handled');
      const authHandler = jest.fn().mockResolvedValue('auth handled');
      const serverHandler = jest.fn().mockResolvedValue('server handled');

      errorHandler.register('NETWORK', networkHandler);
      errorHandler.register('UNAUTHORIZED', authHandler);
      errorHandler.register('SERVER_ERROR', serverHandler);

      // Test network error
      const networkError = new Error('Network');
      networkError.code = 'NETWORK_ERROR';
      await expect(errorHandler.handle(networkError)).resolves.toBe('network handled');

      // Test auth error
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      await expect(errorHandler.handle(authError)).resolves.toBe('auth handled');

      // Test server error
      const serverError = new Error('Server');
      serverError.response = { status: 503 };
      await expect(errorHandler.handle(serverError)).resolves.toBe('server handled');
    });

    test('should handle error transformation in handler', async () => {
      const handler = jest.fn().mockImplementation((error) => {
        return {
          handled: true,
          originalMessage: error.message,
          transformedAt: new Date().toISOString()
        };
      });
      errorHandler.register('CLIENT_ERROR', handler);

      const error = new Error('Bad request');
      error.response = { status: 400 };

      const result = await errorHandler.handle(error);

      expect(result).toMatchObject({
        handled: true,
        originalMessage: 'Bad request'
      });
      expect(result.transformedAt).toBeDefined();
    });

    test('should handle chained error handling', async () => {
      const globalHandler = jest.fn().mockImplementation(async (error) => {
        // Simulate rethrowing with additional context
        const enhancedError = new Error(`Enhanced: ${error.message}`);
        enhancedError.originalError = error;
        throw enhancedError;
      });

      errorHandler = new ErrorHandler({ 
        globalHandler,
        logger: mockLogger 
      });

      const error = new Error('Original error');

      await expect(errorHandler.handle(error)).rejects.toThrow('Original error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handler failed:',
        expect.objectContaining({ message: 'Enhanced: Original error' })
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler({ logger: mockLogger });
    });

    test('should handle null error', async () => {
      await expect(errorHandler.handle(null)).rejects.toBe(null);
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error:', null);
    });

    test('should handle undefined error', async () => {
      await expect(errorHandler.handle(undefined)).rejects.toBe(undefined);
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error:', undefined);
    });

    test('should handle error with circular reference', async () => {
      const error = new Error('Circular');
      error.self = error; // Create circular reference

      const handler = jest.fn().mockResolvedValue('handled circular');
      errorHandler.register('UNKNOWN', handler);

      const result = await errorHandler.handle(error);

      expect(handler).toHaveBeenCalledWith(error);
      expect(result).toBe('handled circular');
    });

    test('should handle handler that returns undefined', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      errorHandler.register('NETWORK', handler);

      const error = new Error('Network');
      error.code = 'NETWORK_ERROR';

      const result = await errorHandler.handle(error);

      expect(result).toBeUndefined();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should handle handler that throws non-Error object', async () => {
      const handler = jest.fn().mockRejectedValue('string error');
      errorHandler.register('TIMEOUT', handler);

      const error = new Error('Timeout');
      error.code = 'ECONNABORTED';

      await expect(errorHandler.handle(error)).rejects.toThrow('Timeout');
      expect(mockLogger.error).toHaveBeenCalledWith('Error handler failed:', 'string error');
    });
  });
});