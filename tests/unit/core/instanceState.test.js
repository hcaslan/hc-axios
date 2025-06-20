import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachInstanceState } from '../../../lib/core/instanceState.js';
import axios from 'axios';

jest.mock('axios');

describe('instanceState', () => {
  let mockInstance;
  let interceptorIds;
  let utilities;

  beforeEach(() => {
    interceptorIds = {
      auth: 123,
      refresh: null,
      retry: 456,
      logging: { request: 789, response: 101 },
      upload: { request: null, response: null },
      cache: { request: 202, response: 303 },
      timeout: { request: null, response: null },
      rateLimit: 404
    };

    utilities = {
      interceptorManager: {
        getGroups: jest.fn().mockReturnValue(['group1', 'group2']),
        getConditionalInterceptors: jest.fn().mockReturnValue([
          { id: 1, type: 'request' },
          { id: 2, type: 'response' }
        ])
      }
    };

    mockInstance = {
      _queue: {
        running: 3,
        queue: { length: 5 },
        maxConcurrent: 10
      },
      _mocks: [{ url: '/api/test' }, { url: '/api/users' }],
      getCircuitBreakerStatus: jest.fn().mockReturnValue({
        state: 'CLOSED',
        failures: 0,
        isOpen: false
      }),
      getDedupeStats: jest.fn().mockReturnValue({
        pendingRequests: 2,
        keys: ['key1', 'key2']
      }),
      defaults: {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          common: { 'Accept': 'application/json' },
          get: {},
          post: { 'Content-Type': 'application/json' },
          put: {},
          patch: {},
          delete: {}
        },
        transformRequest: [() => {}],
        transformResponse: [() => {}],
        validateStatus: (status) => status < 400
      },
      // Methods that will be called during reset
      removeAuth: jest.fn().mockReturnThis(),
      removeRefreshToken: jest.fn().mockReturnThis(),
      removeRetry: jest.fn().mockReturnThis(),
      removeLogging: jest.fn().mockReturnThis(),
      removeUploadProgress: jest.fn().mockReturnThis(),
      removeCache: jest.fn().mockReturnThis(),
      removeSmartTimeout: jest.fn().mockReturnThis(),
      removeRateLimit: jest.fn().mockReturnThis(),
      clearConditionalInterceptors: jest.fn().mockReturnThis(),
      clearMocks: jest.fn().mockReturnThis(),
      resetCircuitBreaker: jest.fn().mockReturnThis(),
      clearDedupe: jest.fn().mockReturnThis()
    };

    // Mock axios defaults
    axios.defaults = {
      baseURL: '',
      timeout: 0,
      headers: {
        common: {},
        get: {},
        post: {},
        put: {},
        patch: {},
        delete: {}
      }
    };
  });

  test('should attach all state methods', () => {
    attachInstanceState(mockInstance, interceptorIds, utilities);

    expect(mockInstance.getActiveInterceptors).toBeDefined();
    expect(mockInstance.getStats).toBeDefined();
    expect(mockInstance.getConfig).toBeDefined();
    expect(mockInstance.reset).toBeDefined();
    expect(mockInstance.createSnapshot).toBeDefined();
    expect(mockInstance.exportConfig).toBeDefined();
  });

  describe('getActiveInterceptors', () => {
    test('should return all active interceptors', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const active = mockInstance.getActiveInterceptors();
      
      expect(active.request).toContainEqual({ name: 'auth', id: 123 });
      expect(active.request).toContainEqual({ name: 'logging', id: 789 });
      expect(active.request).toContainEqual({ name: 'cache', id: 202 });
      expect(active.request).toContainEqual({ name: 'rateLimit', id: 404 });
      
      expect(active.response).toContainEqual({ name: 'retry', id: 456 });
      expect(active.response).toContainEqual({ name: 'logging', id: 101 });
      expect(active.response).toContainEqual({ name: 'cache', id: 303 });
    });

    test('should not include null interceptors', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const active = mockInstance.getActiveInterceptors();
      
      expect(active.request).not.toContainEqual(expect.objectContaining({ name: 'upload' }));
      expect(active.response).not.toContainEqual(expect.objectContaining({ name: 'refresh' }));
    });
  });

  describe('getStats', () => {
    test('should return comprehensive statistics', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const stats = mockInstance.getStats();
      
      expect(stats).toEqual({
        interceptors: {
          request: 4, // auth, logging, cache, rateLimit
          response: 3, // retry, logging, cache
          total: 7
        },
        queue: {
          running: 3,
          queued: 5,
          maxConcurrent: 10
        },
        interceptorManager: {
          groups: 2,
          conditionalInterceptors: 2
        },
        mocks: 2,
        circuitBreaker: {
          state: 'CLOSED',
          failures: 0,
          isOpen: false
        },
        dedupe: {
          pendingRequests: 2,
          keys: ['key1', 'key2']
        }
      });
    });

    test('should handle missing optional features', () => {
      mockInstance._queue = null;
      mockInstance._mocks = undefined;
      mockInstance.getCircuitBreakerStatus = undefined;
      mockInstance.getDedupeStats = undefined;
      
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const stats = mockInstance.getStats();
      
      expect(stats.queue).toBeNull();
      expect(stats.mocks).toBe(0);
      expect(stats.circuitBreaker).toBeNull();
      expect(stats.dedupe).toBeNull();
    });
  });

  describe('getConfig', () => {
    test('should return instance configuration', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const config = mockInstance.getConfig();
      
      expect(config).toEqual({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          common: { 'Accept': 'application/json' },
          get: {},
          post: { 'Content-Type': 'application/json' },
          put: {},
          patch: {},
          delete: {}
        },
        transformRequest: 'configured',
        transformResponse: 'configured',
        validateStatus: 'custom'
      });
    });

    test('should detect default transforms', () => {
      mockInstance.defaults.transformRequest = undefined;
      mockInstance.defaults.transformResponse = undefined;
      mockInstance.defaults.validateStatus = undefined;
      
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const config = mockInstance.getConfig();
      
      expect(config.transformRequest).toBe('default');
      expect(config.transformResponse).toBe('default');
      expect(config.validateStatus).toBe('default');
    });
  });

  describe('reset', () => {
    test('should remove all interceptors', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      mockInstance.reset();
      
      expect(mockInstance.removeAuth).toHaveBeenCalled();
      expect(mockInstance.removeRefreshToken).toHaveBeenCalled();
      expect(mockInstance.removeRetry).toHaveBeenCalled();
      expect(mockInstance.removeLogging).toHaveBeenCalled();
      expect(mockInstance.removeUploadProgress).toHaveBeenCalled();
      expect(mockInstance.removeCache).toHaveBeenCalled();
      expect(mockInstance.removeSmartTimeout).toHaveBeenCalled();
      expect(mockInstance.removeRateLimit).toHaveBeenCalled();
    });

    test('should clear other features', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      mockInstance.reset();
      
      expect(mockInstance.clearConditionalInterceptors).toHaveBeenCalled();
      expect(mockInstance.clearMocks).toHaveBeenCalled();
      expect(mockInstance.resetCircuitBreaker).toHaveBeenCalled();
      expect(mockInstance.clearDedupe).toHaveBeenCalled();
    });

    test('should preserve defaults by default', () => {
      const originalDefaults = { ...mockInstance.defaults };
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      mockInstance.reset();
      
      expect(mockInstance.defaults).toEqual(originalDefaults);
    });

    test('should reset defaults when requested', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      mockInstance.reset(false);
      
      expect(mockInstance.defaults).toEqual(axios.defaults);
    });

    test('should return instance for chaining', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const result = mockInstance.reset();
      
      expect(result).toBe(mockInstance);
    });
  });

  describe('createSnapshot', () => {
    test('should create complete snapshot', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const snapshot = mockInstance.createSnapshot();
      
      expect(snapshot).toMatchObject({
        timestamp: expect.any(Number),
        config: expect.any(Object),
        stats: expect.any(Object),
        activeInterceptors: expect.any(Object),
        groups: ['group1', 'group2'],
        conditionalInterceptors: expect.any(Array)
      });
    });
  });

  describe('exportConfig', () => {
    test('should export configuration as JSON', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const exported = mockInstance.exportConfig();
      
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed).toMatchObject({
        timestamp: expect.any(Number),
        config: expect.any(Object),
        stats: expect.any(Object)
      });
    });

    test('should format JSON with indentation', () => {
      attachInstanceState(mockInstance, interceptorIds, utilities);
      
      const exported = mockInstance.exportConfig();
      
      // Check for indented JSON (contains newlines and spaces)
      expect(exported).toMatch(/\n\s+/);
    });
  });
});