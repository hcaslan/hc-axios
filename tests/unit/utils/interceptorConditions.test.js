import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { InterceptorConditions, CommonConditions } from '../../../lib/utils/interceptorConditions.js';

// Mock Blob if not available in test environment
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options = {}) {
      this.size = parts.reduce((acc, part) => {
        if (typeof part === 'string') {
          return acc + part.length;
        }
        return acc + (part.size || part.length || 0);
      }, 0);
      this.type = options.type || '';
    }
  };
}

// Mock File if not available in test environment
if (typeof File === 'undefined') {
  global.File = class File extends global.Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// Mock FormData if not available in test environment
if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    append(key, value) {
      this._data.set(key, value);
    }
    has(key) {
      return this._data.has(key);
    }
    entries() {
      return this._data.entries();
    }
  };
}

// Mock AbortSignal if not available
if (typeof AbortSignal === 'undefined') {
  global.AbortSignal = class AbortSignal {
    constructor() {
      this.aborted = false;
    }
  };
}

describe('InterceptorConditions', () => {
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('urlMatches', () => {
    test('should match string pattern', () => {
      const condition = InterceptorConditions.urlMatches('/api/');
      
      expect(condition({ url: '/api/users' })).toBe(true);
      expect(condition({ url: '/api/posts/123' })).toBe(true);
      expect(condition({ url: '/auth/login' })).toBe(false);
    });

    test('should match regex pattern', () => {
      const condition = InterceptorConditions.urlMatches(/^\/api\/v\d+/);
      
      expect(condition({ url: '/api/v1/users' })).toBe(true);
      expect(condition({ url: '/api/v2/posts' })).toBe(true);
      expect(condition({ url: '/api/users' })).toBe(false);
    });

    test('should match wildcard pattern', () => {
      const condition = InterceptorConditions.urlMatches('/api/*/posts');
      
      expect(condition({ url: '/api/v1/posts' })).toBe(true);
      expect(condition({ url: '/api/users/123/posts' })).toBe(true);
      expect(condition({ url: '/api/posts' })).toBe(false);
    });

    test('should match array of patterns', () => {
      const condition = InterceptorConditions.urlMatches(['/api/', '/auth/', /^\/public/]);
      
      expect(condition({ url: '/api/users' })).toBe(true);
      expect(condition({ url: '/auth/login' })).toBe(true);
      expect(condition({ url: '/public/assets' })).toBe(true);
      expect(condition({ url: '/private/data' })).toBe(false);
    });

    test('should handle empty url', () => {
      const condition = InterceptorConditions.urlMatches('/api/');
      
      expect(condition({})).toBe(false);
      expect(condition({ url: '' })).toBe(false);
      expect(condition({ url: null })).toBe(false);
    });

    test('should handle invalid pattern types', () => {
      const condition = InterceptorConditions.urlMatches([123, null, undefined]);
      
      expect(condition({ url: '/api/test' })).toBe(false);
    });
  });

  describe('methodMatches', () => {
    test('should match single method case-insensitive', () => {
      const condition = InterceptorConditions.methodMatches('GET');
      
      expect(condition({ method: 'get' })).toBe(true);
      expect(condition({ method: 'GET' })).toBe(true);
      expect(condition({ method: 'post' })).toBe(false);
    });

    test('should match array of methods', () => {
      const condition = InterceptorConditions.methodMatches(['POST', 'PUT', 'PATCH']);
      
      expect(condition({ method: 'post' })).toBe(true);
      expect(condition({ method: 'PUT' })).toBe(true);
      expect(condition({ method: 'patch' })).toBe(true);
      expect(condition({ method: 'get' })).toBe(false);
      expect(condition({ method: 'delete' })).toBe(false);
    });

    test('should default to GET when method not specified', () => {
      const condition = InterceptorConditions.methodMatches('get');
      
      expect(condition({})).toBe(true);
      expect(condition({ method: undefined })).toBe(true);
      expect(condition({ method: null })).toBe(true);
    });
  });

  describe('environmentMatches', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    test('should match current environment', () => {
      process.env.NODE_ENV = 'production';
      const condition = InterceptorConditions.environmentMatches('production');
      
      expect(condition()).toBe(true);
    });

    test('should match array of environments', () => {
      process.env.NODE_ENV = 'staging';
      const condition = InterceptorConditions.environmentMatches(['production', 'staging']);
      
      expect(condition()).toBe(true);
    });

    test('should default to development when NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      const condition = InterceptorConditions.environmentMatches('development');
      
      expect(condition()).toBe(true);
    });

    test('should handle browser environment without process.env', () => {
      const originalProcess = global.process;
      delete global.process;
      
      const condition = InterceptorConditions.environmentMatches('development');
      expect(condition()).toBe(true);
      
      global.process = originalProcess;
    });

    test('should handle environment with process but no env', () => {
      const originalProcess = global.process;
      global.process = {}; // process exists but no env property
      
      const condition = InterceptorConditions.environmentMatches('development');
      expect(condition()).toBe(true);
      
      global.process = originalProcess;
    });
  });

  describe('headerMatches', () => {
    test('should match exact header value', () => {
      const condition = InterceptorConditions.headerMatches({
        'Content-Type': 'application/json'
      });
      
      expect(condition({ headers: { 'Content-Type': 'application/json' } })).toBe(true);
      expect(condition({ headers: { 'Content-Type': 'text/plain' } })).toBe(false);
    });

    test('should match regex header value', () => {
      const condition = InterceptorConditions.headerMatches({
        'Authorization': /^Bearer /
      });
      
      expect(condition({ headers: { 'Authorization': 'Bearer token123' } })).toBe(true);
      expect(condition({ headers: { 'Authorization': 'Basic auth' } })).toBe(false);
    });

    test('should match with function predicate', () => {
      const condition = InterceptorConditions.headerMatches({
        'X-API-Version': (value) => parseInt(value) >= 2
      });
      
      expect(condition({ headers: { 'X-API-Version': '3' } })).toBe(true);
      expect(condition({ headers: { 'X-API-Version': '1' } })).toBe(false);
    });

    test('should handle missing headers', () => {
      const condition = InterceptorConditions.headerMatches({
        'Authorization': 'Bearer token'
      });
      
      expect(condition({})).toBe(false);
      expect(condition({ headers: {} })).toBe(false);
      expect(condition({ headers: null })).toBe(false);
    });

    test('should match multiple header conditions', () => {
      const condition = InterceptorConditions.headerMatches({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      });
      
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      expect(condition({ headers })).toBe(true);
      
      headers['Content-Type'] = 'text/plain';
      expect(condition({ headers })).toBe(false);
    });
  });

  describe('hasDataKeys', () => {
    test('should check for single data key', () => {
      const condition = InterceptorConditions.hasDataKeys('username');
      
      expect(condition({ data: { username: 'john' } })).toBe(true);
      expect(condition({ data: { email: 'john@example.com' } })).toBe(false);
    });

    test('should check for multiple data keys (any match)', () => {
      const condition = InterceptorConditions.hasDataKeys(['username', 'password']);
      
      expect(condition({ data: { username: 'john', password: 'secret' } })).toBe(true);
      expect(condition({ data: { username: 'john' } })).toBe(true); // hasDataKeys checks for ANY key
      expect(condition({ data: { password: 'secret' } })).toBe(true); // hasDataKeys checks for ANY key
      expect(condition({ data: { email: 'john@example.com' } })).toBe(false);
    });

    test('should check for ALL data keys using and combinator', () => {
      // To check for ALL keys, combine multiple hasDataKeys conditions
      const condition = InterceptorConditions.and(
        InterceptorConditions.hasDataKeys('username'),
        InterceptorConditions.hasDataKeys('password')
      );
      
      expect(condition({ data: { username: 'john', password: 'secret' } })).toBe(true);
      expect(condition({ data: { username: 'john' } })).toBe(false);
      expect(condition({ data: { password: 'secret' } })).toBe(false);
    });

    test('should handle missing data', () => {
      const condition = InterceptorConditions.hasDataKeys('key');
      
      expect(condition({})).toBe(false);
      expect(condition({ data: null })).toBe(false);
      expect(condition({ data: undefined })).toBe(false);
    });

    test('should handle FormData', () => {
      const condition = InterceptorConditions.hasDataKeys(['file', 'description']);
      
      const formData = new FormData();
      formData.append('file', new Blob(['test']));
      
      expect(condition({ data: formData })).toBe(true); // has 'file' key
      
      const emptyFormData = new FormData();
      expect(condition({ data: emptyFormData })).toBe(false); // no matching keys
    });

    test('should handle non-object data', () => {
      const condition = InterceptorConditions.hasDataKeys('key');
      
      expect(condition({ data: 'string' })).toBe(false);
      expect(condition({ data: 123 })).toBe(false);
      expect(condition({ data: [] })).toBe(false);
      expect(condition({ data: true })).toBe(false);
      expect(condition({ data: false })).toBe(false);
    });
  });

  describe('requestSizeBelow', () => {
    test('should check string data size', () => {
      const condition = InterceptorConditions.requestSizeBelow(100);
      
      expect(condition({ data: 'short' })).toBe(true);
      expect(condition({ data: 'a'.repeat(101) })).toBe(false);
    });

    test('should check JSON data size', () => {
      const condition = InterceptorConditions.requestSizeBelow(50);
      
      expect(condition({ data: { key: 'value' } })).toBe(true);
      expect(condition({ data: { key: 'a'.repeat(100) } })).toBe(false);
    });

    test('should handle FormData', () => {
      const condition = InterceptorConditions.requestSizeBelow(1000);
      
      const formData = new FormData();
      formData.append('file', new Blob(['test content']));
      
      expect(condition({ data: formData })).toBe(true);
    });

    test('should handle missing data', () => {
      const condition = InterceptorConditions.requestSizeBelow(100);
      
      expect(condition({})).toBe(true);
      expect(condition({ data: null })).toBe(true);
      expect(condition({ data: undefined })).toBe(true);
    });

    test('should handle various data types', () => {
      const condition = InterceptorConditions.requestSizeBelow(100);
      
      expect(condition({ data: 12345 })).toBe(true);
      expect(condition({ data: true })).toBe(true);
      expect(condition({ data: [1, 2, 3] })).toBe(true);
    });

    test('should handle Blob data', () => {
      const condition = InterceptorConditions.requestSizeBelow(100);
      
      const smallBlob = new Blob(['small']);
      const largeBlob = new Blob(['x'.repeat(200)]);
      
      expect(condition({ data: smallBlob })).toBe(true);
      expect(condition({ data: largeBlob })).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    const originalWindow = global.window;
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      global.window = { localStorage: { getItem: jest.fn(), setItem: jest.fn() } };
      global.localStorage = global.window.localStorage;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.localStorage = originalLocalStorage;
    });

    test('should check localStorage for token', () => {
      const condition = InterceptorConditions.isAuthenticated();
      
      // When NO token exists, isAuthenticated returns false
      global.localStorage.getItem.mockReturnValue(null);
      expect(condition()).toBe(false);
      
      // When token exists, isAuthenticated returns true
      global.localStorage.getItem.mockReturnValue('token123');
      expect(condition()).toBe(true);
      
      // Should check for both 'accessToken' and 'token'
      expect(global.localStorage.getItem).toHaveBeenCalledWith('accessToken');
    });

    test('should fallback to "token" when "accessToken" is not found', () => {
      const condition = InterceptorConditions.isAuthenticated();
      
      // Mock implementation to return null for accessToken but value for token
      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return null;
        if (key === 'token') return 'fallback-token';
        return null;
      });
      
      expect(condition()).toBe(true);
      
      // Verify both keys were checked
      expect(global.localStorage.getItem).toHaveBeenCalledWith('accessToken');
      expect(global.localStorage.getItem).toHaveBeenCalledWith('token');
    });

    test('should use custom auth checker', () => {
      const customAuthChecker = jest.fn().mockReturnValue(true);
      const condition = InterceptorConditions.isAuthenticated(customAuthChecker);
      
      expect(condition()).toBe(true);
      expect(customAuthChecker).toHaveBeenCalled();
    });

    test('should handle auth check errors', () => {
      const errorChecker = jest.fn().mockImplementation(() => {
        throw new Error('Auth error');
      });
      const condition = InterceptorConditions.isAuthenticated(errorChecker);
      
      expect(condition()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Authentication check failed:', 'Auth error');
    });

    test('should return false when window undefined', () => {
      delete global.window;
      const condition = InterceptorConditions.isAuthenticated();
      
      expect(condition()).toBe(false);
    });
  });

  describe('isPublicEndpoint', () => {
    test('should identify public endpoints', () => {
      const condition = InterceptorConditions.isPublicEndpoint();
      
      expect(condition({ url: '/public/assets/logo.png' })).toBe(true);
      expect(condition({ url: '/health' })).toBe(true);
      expect(condition({ url: '/health/check' })).toBe(true); // includes '/health'
      expect(condition({ url: '/api/users' })).toBe(false);
    });

    test('should handle auth endpoints as public', () => {
      const condition = InterceptorConditions.isPublicEndpoint();
      
      expect(condition({ url: '/login' })).toBe(true);
      expect(condition({ url: '/register' })).toBe(true);
      expect(condition({ url: '/signup' })).toBe(true);
      expect(condition({ url: '/forgot-password' })).toBe(true);
      expect(condition({ url: '/reset-password' })).toBe(true);
      expect(condition({ url: '/auth/login' })).toBe(true); // includes '/login'
      expect(condition({ url: '/user/login-history' })).toBe(true); // includes '/login'
    });

    test('should handle additional default public endpoints', () => {
      const condition = InterceptorConditions.isPublicEndpoint();
      
      expect(condition({ url: '/status' })).toBe(true);
      expect(condition({ url: '/ping' })).toBe(true);
      expect(condition({ url: '/health/check' })).toBe(true); // includes '/health'
    });

    test('should handle custom public paths', () => {
      const condition = InterceptorConditions.isPublicEndpoint(['/api/docs', '/api/swagger']);
      
      expect(condition({ url: '/api/docs' })).toBe(true);
      expect(condition({ url: '/api/swagger' })).toBe(true);
      expect(condition({ url: '/api/users' })).toBe(false);
    });

    test('should handle wildcard patterns', () => {
      const condition = InterceptorConditions.isPublicEndpoint(['/api/v*/docs']);
      
      expect(condition({ url: '/api/v1/docs' })).toBe(true);
      expect(condition({ url: '/api/v2/docs' })).toBe(true);
      expect(condition({ url: '/api/docs' })).toBe(false);
    });

    test('should handle missing url', () => {
      const condition = InterceptorConditions.isPublicEndpoint();
      
      expect(condition({})).toBe(false);
      expect(condition({ url: '' })).toBe(false);
      expect(condition({ url: null })).toBe(false);
    });
  });

  describe('isFileUpload', () => {
    test('should detect FormData', () => {
      const condition = InterceptorConditions.isFileUpload();
      
      expect(condition({ data: new FormData() })).toBe(true);
      expect(condition({ data: {} })).toBe(false); // Now returns false instead of undefined
    });

    test('should detect multipart content type', () => {
      const condition = InterceptorConditions.isFileUpload();
      
      expect(condition({ 
        headers: { 'Content-Type': 'multipart/form-data' } 
      })).toBe(true);
      
      // Now checks both Content-Type and content-type (fixed)
      expect(condition({ 
        headers: { 'content-type': 'multipart/form-data; boundary=----' } 
      })).toBe(true); // Now case-insensitive
      
      expect(condition({ 
        headers: { 'Content-Type': 'multipart/form-data; boundary=----' } 
      })).toBe(true);
      
      expect(condition({ 
        headers: { 'Content-Type': 'application/json' } 
      })).toBe(false);
    });

    test('should handle missing data and headers', () => {
      const condition = InterceptorConditions.isFileUpload();
      
      expect(condition({})).toBe(false); // Now returns false
      expect(condition({ data: null })).toBe(false);
      expect(condition({ headers: null })).toBe(false);
      expect(condition({ data: null, headers: null })).toBe(false);
    });

    test('should handle edge cases', () => {
      const condition = InterceptorConditions.isFileUpload();
      
      // No headers property
      expect(condition({ data: 'string' })).toBe(false);
      
      // Headers without Content-Type
      expect(condition({ headers: {} })).toBe(false);
      
      // Headers with null Content-Type
      expect(condition({ headers: { 'Content-Type': null } })).toBe(false);
      
      // Headers with undefined Content-Type
      expect(condition({ headers: { 'Content-Type': undefined } })).toBe(false);
      
      // Empty string Content-Type
      expect(condition({ headers: { 'Content-Type': '' } })).toBe(false);
      
      // Content-Type that doesn't include multipart
      expect(condition({ headers: { 'Content-Type': 'text/plain' } })).toBe(false);
    });
  });

  describe('isOnline', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    test('should return true when online', () => {
      global.navigator = { onLine: true };
      const condition = InterceptorConditions.isOnline();
      
      expect(condition()).toBe(true);
    });

    test('should return false when offline', () => {
      global.navigator = { onLine: false };
      const condition = InterceptorConditions.isOnline();
      
      expect(condition()).toBe(false);
    });

    test('should return true when navigator undefined', () => {
      delete global.navigator;
      const condition = InterceptorConditions.isOnline();
      
      expect(condition()).toBe(true);
    });

    test('should handle navigator without onLine property', () => {
      global.navigator = {}; // navigator exists but no onLine property
      const condition = InterceptorConditions.isOnline();
      
      expect(condition()).toBe(true); // Assumes online when onLine is undefined
    });
  });

  describe('timeRange', () => {
    let mockDate;

    beforeEach(() => {
      mockDate = jest.spyOn(Date.prototype, 'getHours');
    });

    afterEach(() => {
      mockDate.mockRestore();
    });

    test('should match time within range', () => {
      mockDate.mockReturnValue(10);
      const condition = InterceptorConditions.timeRange({ start: 9, end: 17 });
      
      expect(condition()).toBe(true);
    });

    test('should not match time outside range', () => {
      mockDate.mockReturnValue(20);
      const condition = InterceptorConditions.timeRange({ start: 9, end: 17 });
      
      expect(condition()).toBe(false);
    });

    test('should handle range crossing midnight', () => {
      const condition = InterceptorConditions.timeRange({ start: 22, end: 6 });
      
      mockDate.mockReturnValue(23);
      expect(condition()).toBe(true);
      
      mockDate.mockReturnValue(3);
      expect(condition()).toBe(true);
      
      mockDate.mockReturnValue(10);
      expect(condition()).toBe(false);
    });

    test('should handle edge cases', () => {
      const condition = InterceptorConditions.timeRange({ start: 9, end: 17 });
      
      mockDate.mockReturnValue(9);
      expect(condition()).toBe(true);
      
      mockDate.mockReturnValue(17);
      expect(condition()).toBe(true);
      
      mockDate.mockReturnValue(8);
      expect(condition()).toBe(false);
      
      mockDate.mockReturnValue(18);
      expect(condition()).toBe(false);
    });

    test('should use defaults when start equals end', () => {
      mockDate.mockReturnValue(10);
      const condition = InterceptorConditions.timeRange({ start: 0, end: 23 });
      
      expect(condition()).toBe(true); // Always true when covering full day
    });

    test('should validate timeRange parameters', () => {
      // Should throw when timeRange is not provided
      expect(() => InterceptorConditions.timeRange()).toThrow('timeRange requires an object with start and end hour numbers');
      
      // Should throw when start is missing
      expect(() => InterceptorConditions.timeRange({ end: 17 })).toThrow('timeRange requires an object with start and end hour numbers');
      
      // Should throw when end is missing
      expect(() => InterceptorConditions.timeRange({ start: 9 })).toThrow('timeRange requires an object with start and end hour numbers');
      
      // Should throw when start is not a number
      expect(() => InterceptorConditions.timeRange({ start: '9', end: 17 })).toThrow('timeRange requires an object with start and end hour numbers');
    });
  });

  describe('userAgentMatches', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    test('should match string pattern', () => {
      global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' };
      const condition = InterceptorConditions.userAgentMatches('iPhone');
      
      expect(condition()).toBe(true);
    });

    test('should match regex pattern', () => {
      global.navigator = { userAgent: 'Mozilla/5.0 (Android 11; Mobile)' };
      const condition = InterceptorConditions.userAgentMatches(/Android \d+/);
      
      expect(condition()).toBe(true);
    });

    test('should return false when pattern not matched', () => {
      global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' };
      const condition = InterceptorConditions.userAgentMatches('iPhone');
      
      expect(condition()).toBe(false);
    });

    test('should return false when navigator undefined', () => {
      delete global.navigator;
      const condition = InterceptorConditions.userAgentMatches('test');
      
      expect(condition()).toBe(false);
    });

    test('should return false when userAgent undefined', () => {
      global.navigator = {}; // navigator exists but no userAgent
      const condition = InterceptorConditions.userAgentMatches('test');
      
      expect(condition()).toBe(false);
    });
  });

  describe('and', () => {
    test('should return true when all conditions are true', () => {
      const cond1 = jest.fn().mockReturnValue(true);
      const cond2 = jest.fn().mockReturnValue(true);
      const cond3 = jest.fn().mockReturnValue(true);
      
      const combined = InterceptorConditions.and(cond1, cond2, cond3);
      const config = { url: '/test' };
      
      expect(combined(config)).toBe(true);
      expect(cond1).toHaveBeenCalledWith(config);
      expect(cond2).toHaveBeenCalledWith(config);
      expect(cond3).toHaveBeenCalledWith(config);
    });

    test('should return false when any condition is false', () => {
      const cond1 = jest.fn().mockReturnValue(true);
      const cond2 = jest.fn().mockReturnValue(false);
      const cond3 = jest.fn().mockReturnValue(true);
      
      const combined = InterceptorConditions.and(cond1, cond2, cond3);
      
      expect(combined({})).toBe(false);
      expect(cond3).not.toHaveBeenCalled(); // Short-circuit evaluation
    });

    test('should handle condition errors gracefully', () => {
      const cond1 = jest.fn().mockReturnValue(true);
      const cond2 = jest.fn().mockImplementation(() => {
        throw new Error('Condition error');
      });
      
      const combined = InterceptorConditions.and(cond1, cond2);
      
      expect(combined({})).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Condition evaluation failed:',
        'Condition error'
      );
    });

    test('should work with no conditions', () => {
      const combined = InterceptorConditions.and();
      expect(combined({})).toBe(true);
    });
  });

  describe('or', () => {
    test('should return true when any condition is true', () => {
      const cond1 = jest.fn().mockReturnValue(false);
      const cond2 = jest.fn().mockReturnValue(true);
      const cond3 = jest.fn().mockReturnValue(false);
      
      const combined = InterceptorConditions.or(cond1, cond2, cond3);
      const config = { url: '/test' };
      
      expect(combined(config)).toBe(true);
      expect(cond1).toHaveBeenCalledWith(config);
      expect(cond2).toHaveBeenCalledWith(config);
      expect(cond3).not.toHaveBeenCalled(); // Short-circuit evaluation
    });

    test('should return false when all conditions are false', () => {
      const cond1 = jest.fn().mockReturnValue(false);
      const cond2 = jest.fn().mockReturnValue(false);
      const cond3 = jest.fn().mockReturnValue(false);
      
      const combined = InterceptorConditions.or(cond1, cond2, cond3);
      
      expect(combined({})).toBe(false);
      expect(cond1).toHaveBeenCalled();
      expect(cond2).toHaveBeenCalled();
      expect(cond3).toHaveBeenCalled();
    });

    test('should handle condition errors gracefully', () => {
      const cond1 = jest.fn().mockImplementation(() => {
        throw new Error('Condition error');
      });
      const cond2 = jest.fn().mockReturnValue(true);
      
      const combined = InterceptorConditions.or(cond1, cond2);
      
      expect(combined({})).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Condition evaluation failed:',
        'Condition error'
      );
    });

    test('should work with no conditions', () => {
      const combined = InterceptorConditions.or();
      expect(combined({})).toBe(false);
    });
  });

  describe('not', () => {
    test('should negate true condition', () => {
      const condition = jest.fn().mockReturnValue(true);
      const negated = InterceptorConditions.not(condition);
      
      expect(negated({})).toBe(false);
      expect(condition).toHaveBeenCalled();
    });

    test('should negate false condition', () => {
      const condition = jest.fn().mockReturnValue(false);
      const negated = InterceptorConditions.not(condition);
      
      expect(negated({})).toBe(true);
      expect(condition).toHaveBeenCalled();
    });

    test('should handle condition errors gracefully', () => {
      const condition = jest.fn().mockImplementation(() => {
        throw new Error('Condition error');
      });
      const negated = InterceptorConditions.not(condition);
      
      expect(negated({})).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Condition evaluation failed:',
        'Condition error'
      );
    });
  });

  describe('custom', () => {
    test('should return the custom function as-is', () => {
      const customFn = jest.fn().mockReturnValue(true);
      const condition = InterceptorConditions.custom(customFn);
      
      expect(condition).toBe(customFn);
      
      condition({ custom: true });
      expect(customFn).toHaveBeenCalledWith({ custom: true });
    });
  });
});

describe('CommonConditions', () => {
  describe('environment conditions', () => {
    test('should have isDevelopment condition', () => {
      expect(CommonConditions.isDevelopment).toBeDefined();
      expect(typeof CommonConditions.isDevelopment).toBe('function');
    });

    test('should have isProduction condition', () => {
      expect(CommonConditions.isProduction).toBeDefined();
      expect(typeof CommonConditions.isProduction).toBe('function');
    });
  });

  describe('HTTP method conditions', () => {
    test('should have isGetRequest condition', () => {
      expect(CommonConditions.isGetRequest).toBeDefined();
      expect(CommonConditions.isGetRequest({ method: 'GET' })).toBe(true);
      expect(CommonConditions.isGetRequest({ method: 'POST' })).toBe(false);
    });

    test('should have isPostRequest condition', () => {
      expect(CommonConditions.isPostRequest).toBeDefined();
      expect(CommonConditions.isPostRequest({ method: 'POST' })).toBe(true);
      expect(CommonConditions.isPostRequest({ method: 'GET' })).toBe(false);
    });

    test('should have isWriteRequest condition', () => {
      expect(CommonConditions.isWriteRequest).toBeDefined();
      expect(CommonConditions.isWriteRequest({ method: 'POST' })).toBe(true);
      expect(CommonConditions.isWriteRequest({ method: 'PUT' })).toBe(true);
      expect(CommonConditions.isWriteRequest({ method: 'PATCH' })).toBe(true);
      expect(CommonConditions.isWriteRequest({ method: 'DELETE' })).toBe(true);
      expect(CommonConditions.isWriteRequest({ method: 'GET' })).toBe(false);
    });
  });

  describe('URL conditions', () => {
    test('should have isApiCall condition', () => {
      expect(CommonConditions.isApiCall).toBeDefined();
      expect(CommonConditions.isApiCall({ url: '/api/users' })).toBe(true);
      expect(CommonConditions.isApiCall({ url: '/auth/login' })).toBe(false);
    });

    test('should have isAuthCall condition', () => {
      expect(CommonConditions.isAuthCall).toBeDefined();
      expect(CommonConditions.isAuthCall({ url: '/auth/login' })).toBe(true);
      expect(CommonConditions.isAuthCall({ url: '/api/users' })).toBe(false);
    });

    test('should have isPublicRoute condition', () => {
      expect(CommonConditions.isPublicRoute).toBeDefined();
      expect(CommonConditions.isPublicRoute({ url: '/public/assets' })).toBe(true);
      expect(CommonConditions.isPublicRoute({ url: '/api/users' })).toBe(false);
    });
  });

  describe('auth conditions', () => {
    const originalWindow = global.window;
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      global.window = { localStorage: { getItem: jest.fn(), setItem: jest.fn() } };
      global.localStorage = global.window.localStorage;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.localStorage = originalLocalStorage;
    });

    test('should have requiresAuth condition', () => {
      expect(CommonConditions.requiresAuth).toBeDefined();
      
      // requiresAuth = NOT authenticated AND NOT public
      // Returns true when user is NOT authenticated AND endpoint is NOT public
      
      // No token, not public endpoint = requires auth
      global.localStorage.getItem.mockReturnValue(null);
      expect(CommonConditions.requiresAuth({ 
        url: '/api/users'
      })).toBe(true);
      
      // No token, but public endpoint = doesn't require auth
      expect(CommonConditions.requiresAuth({ 
        url: '/public/assets'
      })).toBe(false);
      
      // Has token, not public endpoint = doesn't require auth (user is authenticated)
      global.localStorage.getItem.mockReturnValue('token123');
      expect(CommonConditions.requiresAuth({ 
        url: '/api/users'
      })).toBe(false);
    });

    test('should demonstrate requiresAuth logic breakdown', () => {
      // This test clarifies the requiresAuth behavior after fixes
      
      // Setup: no token (isAuthenticated will return false)
      global.localStorage.getItem.mockReturnValue(null);
      
      // Test individual conditions
      const isAuth = InterceptorConditions.isAuthenticated();
      const isPublic = InterceptorConditions.isPublicEndpoint();
      const notAuth = InterceptorConditions.not(isAuth);
      const notPublic = InterceptorConditions.not(isPublic);
      
      // For a private endpoint
      const privateConfig = { url: '/api/private' };
      expect(isAuth()).toBe(false); // No token = not authenticated
      expect(isPublic(privateConfig)).toBe(false); // Not public
      expect(notAuth()).toBe(true); // NOT authenticated = true
      expect(notPublic(privateConfig)).toBe(true); // NOT public = true
      
      // requiresAuth = NOT authenticated AND NOT public = true AND true = true
      expect(CommonConditions.requiresAuth(privateConfig)).toBe(true);
      
      // For a public endpoint
      const publicConfig = { url: '/login' };
      expect(isAuth()).toBe(false); // No token = not authenticated
      expect(isPublic(publicConfig)).toBe(true); // Is public
      expect(notAuth()).toBe(true); // NOT authenticated = true
      expect(notPublic(publicConfig)).toBe(false); // NOT public = false
      
      // requiresAuth = NOT authenticated AND NOT public = true AND false = false
      expect(CommonConditions.requiresAuth(publicConfig)).toBe(false);
    });
  });
  
  describe('file conditions', () => {
    test('should have isFileUpload condition', () => {
      expect(CommonConditions.isFileUpload).toBeDefined();
      expect(CommonConditions.isFileUpload({ data: new FormData() })).toBe(true);
      expect(CommonConditions.isFileUpload({ data: {} })).toBe(false); // Now returns false
    });

    test('should have isSmallRequest condition', () => {
      expect(CommonConditions.isSmallRequest).toBeDefined();
      expect(CommonConditions.isSmallRequest({ data: 'small' })).toBe(true);
      expect(CommonConditions.isSmallRequest({ data: 'x'.repeat(200000) })).toBe(false);
    });
  });

  describe('network conditions', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    test('should have isOnline condition', () => {
      expect(CommonConditions.isOnline).toBeDefined();
      
      global.navigator = { onLine: true };
      expect(CommonConditions.isOnline()).toBe(true);
      
      global.navigator = { onLine: false };
      expect(CommonConditions.isOnline()).toBe(false);
    });
  });

  describe('time conditions', () => {
    test('should have isBusinessHours condition', () => {
      expect(CommonConditions.isBusinessHours).toBeDefined();
      expect(typeof CommonConditions.isBusinessHours()).toBe('boolean');
    });

    test('should have isNightTime condition', () => {
      expect(CommonConditions.isNightTime).toBeDefined();
      expect(typeof CommonConditions.isNightTime()).toBe('boolean');
    });
  });

  describe('browser conditions', () => {
    const originalNavigator = global.navigator;

    beforeEach(() => {
      global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
    });

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    test('should have isMobile condition', () => {
      expect(CommonConditions.isMobile).toBeDefined();
      
      // Test with mobile user agent
      global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)';
      expect(CommonConditions.isMobile()).toBe(true);
      
      // Test with desktop user agent
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      expect(CommonConditions.isMobile()).toBe(false);
    });

    test('should have isDesktop condition', () => {
      expect(CommonConditions.isDesktop).toBeDefined();
      
      // Test with desktop user agent
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      expect(CommonConditions.isDesktop()).toBe(true);
      
      // Test with mobile user agent
      global.navigator.userAgent = 'Mozilla/5.0 (Android 11; Mobile)';
      expect(CommonConditions.isDesktop()).toBe(false);
    });
  });
});