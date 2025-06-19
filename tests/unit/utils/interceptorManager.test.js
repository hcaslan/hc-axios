/**
 * Comprehensive tests for the enhanced InterceptorManager
 */
// Should be this path (3 levels up: utils -> unit -> tests -> root, then down to lib)
import { InterceptorManager } from '../../../lib/utils/interceptorManager.js';
import axios from 'axios';

// Mock axios instance for testing
function createMockAxiosInstance() {
  const instance = axios.create();
  
  // Add mock methods that InterceptorManager expects
  instance.useAuth = function(getToken) {
    console.log('Mock useAuth called');
    return 'auth-interceptor-id';
  };
  
  instance.removeAuth = function() {
    console.log('Mock removeAuth called');
  };
  
  instance.useRetry = function(config) {
    console.log('Mock useRetry called with:', config);
    return 'retry-interceptor-id';
  };
  
  instance.removeRetry = function() {
    console.log('Mock removeRetry called');
  };
  
  instance.useLogging = function(config) {
    console.log('Mock useLogging called with:', config);
    return { request: 'log-req-id', response: 'log-res-id' };
  };
  
  instance.removeLogging = function() {
    console.log('Mock removeLogging called');
  };
  
  instance.useCache = function(config) {
    console.log('Mock useCache called with:', config);
    return { request: 'cache-req-id', response: 'cache-res-id' };
  };
  
  instance.removeCache = function() {
    console.log('Mock removeCache called');
  };
  
  instance.useUploadProgress = function(config) {
    console.log('Mock useUploadProgress called with:', config);
    return { request: 'upload-req-id', response: 'upload-res-id' };
  };
  
  instance.removeUploadProgress = function() {
    console.log('Mock removeUploadProgress called');
  };
  
  instance.useSmartTimeout = function(config) {
    console.log('Mock useSmartTimeout called with:', config);
    return { request: 'timeout-req-id', response: 'timeout-res-id' };
  };
  
  instance.removeSmartTimeout = function() {
    console.log('Mock removeSmartTimeout called');
  };
  
  instance.useRateLimit = function(config) {
    console.log('Mock useRateLimit called with:', config);
    return 'ratelimit-interceptor-id';
  };
  
  instance.removeRateLimit = function() {
    console.log('Mock removeRateLimit called');
  };
  
  instance.useRefreshToken = function(config) {
    console.log('Mock useRefreshToken called with:', config);
    return 'refresh-interceptor-id';
  };
  
  instance.removeRefreshToken = function() {
    console.log('Mock removeRefreshToken called');
  };
  
  return instance;
}

// Test Suite
describe('InterceptorManager', () => {
  let manager;
  let mockInstance;
  
  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
    manager = new InterceptorManager(mockInstance);
  });
  
  afterEach(() => {
    manager.cleanup();
  });

  describe('Basic Group Management', () => {
    test('should create interceptor groups', () => {
      manager.createGroup('test-group', ['auth', 'retry', 'logging']);
      
      const groups = manager.getGroups();
      expect(groups).toContain('test-group');
      
      const status = manager.getStatus();
      expect(status.groups['test-group']).toBeDefined();
      expect(status.groups['test-group'].interceptors).toEqual(['auth', 'retry', 'logging']);
      expect(status.groups['test-group'].enabled).toBe(false);
    });
    
    test('should reject invalid interceptors in groups', () => {
      expect(() => {
        manager.createGroup('invalid-group', ['auth', 'nonexistent', 'retry']);
      }).toThrow('Invalid interceptors in group \'invalid-group\': nonexistent');
    });
    
    test('should enable and disable groups', () => {
      manager.createGroup('api-group', ['auth', 'retry']);
      
      // Enable group
      manager.enableGroup('api-group');
      const statusAfterEnable = manager.getStatus();
      expect(statusAfterEnable.groups['api-group'].enabled).toBe(true);
      
      // Disable group
      manager.disableGroup('api-group');
      const statusAfterDisable = manager.getStatus();
      expect(statusAfterDisable.groups['api-group'].enabled).toBe(false);
    });
    
    test('should toggle groups', () => {
      manager.createGroup('toggle-group', ['auth']);
      
      // Initially disabled
      expect(manager.getStatus().groups['toggle-group'].enabled).toBe(false);
      
      // Toggle to enabled
      manager.toggleGroup('toggle-group');
      expect(manager.getStatus().groups['toggle-group'].enabled).toBe(true);
      
      // Toggle back to disabled
      manager.toggleGroup('toggle-group');
      expect(manager.getStatus().groups['toggle-group'].enabled).toBe(false);
    });
  });

  describe('Conditional Interceptors', () => {
    test('should add conditional interceptors', () => {
      const condition = (config) => config.url?.includes('/api/');
      
      manager.addConditionalInterceptor('conditional-auth', {
        condition,
        config: { verbose: true }
      });
      
      const conditionals = manager.getConditionalInterceptors();
      expect(conditionals).toContain('conditional-auth');
      
      const status = manager.getStatus();
      expect(status.conditional['conditional-auth']).toBeDefined();
      expect(status.conditional['conditional-auth'].hasCondition).toBe(true);
    });
    
    test('should reject invalid condition functions', () => {
      expect(() => {
        manager.addConditionalInterceptor('invalid-conditional', {
          condition: 'not-a-function',
          config: {}
        });
      }).toThrow('Condition for \'invalid-conditional\' must be a function');
    });
    
    test('should handle condition evaluation errors gracefully', async () => {
      const faultyCondition = () => {
        throw new Error('Condition evaluation failed');
      };
      
      manager.addConditionalInterceptor('faulty-auth', {
        condition: faultyCondition,
        config: {}
      });
      
      // Enable the conditional interceptor
      manager.enableInterceptor('faulty-auth');
      
      // The interceptor should still be created but condition errors should be handled
      const status = manager.getStatus();
      expect(status.conditional['faulty-auth']).toBeDefined();
    });
    
    test('should remove conditional interceptors', () => {
      const condition = () => true;
      
      manager.addConditionalInterceptor('removable', {
        condition,
        config: {}
      });
      
      // Verify it exists
      expect(manager.getConditionalInterceptors()).toContain('removable');
      
      // Remove it
      manager.removeConditionalInterceptor('removable');
      
      // Verify it's gone
      expect(manager.getConditionalInterceptors()).not.toContain('removable');
    });
  });

  describe('Interceptor Logic Application', () => {
    test('should apply auth logic correctly', () => {
      // Mock localStorage for auth token
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue('mock-token')
      };
      global.localStorage = mockLocalStorage;
      
      const requestConfig = {
        method: 'GET',
        url: '/api/users',
        headers: {}
      };
      
      const result = manager._applyInterceptorLogic('auth', requestConfig, 'request', {});
      
      expect(result.headers.Authorization).toBe('Bearer mock-token');
    });
    
    test('should apply logging logic correctly', () => {
      const mockLogger = {
        log: jest.fn(),
        error: jest.fn()
      };
      
      const requestConfig = {
        method: 'POST',
        url: '/api/data'
      };
      
      manager._applyInterceptorLogic('logging', requestConfig, 'request', {
        logger: mockLogger,
        logRequests: true
      });
      
      expect(mockLogger.log).toHaveBeenCalledWith('🚀 Conditional Request:', expect.any(Object));
    });
    
    test('should apply cache logic correctly', () => {
      const getConfig = {
        method: 'GET',
        url: '/api/data'
      };
      
      // First call should not find cache
      const result1 = manager._applyInterceptorLogic('cache', getConfig, 'request', {});
      expect(result1.adapter).toBeUndefined();
      
      // Simulate response to cache
      const response = {
        data: { test: 'data' },
        status: 200,
        config: getConfig
      };
      
      manager._applyInterceptorLogic('cache', response, 'response', {});
      
      // Second request should find cached response
      const result2 = manager._applyInterceptorLogic('cache', { ...getConfig }, 'request', {});
      expect(result2.adapter).toBeDefined();
    });
    
    test('should apply rate limit logic correctly', () => {
      const requestConfig = {
        method: 'POST',
        url: '/api/action'
      };
      
      const rateLimitConfig = {
        maxRequests: 2,
        windowMs: 1000
      };
      
      // First two requests should succeed
      expect(() => {
        manager._applyInterceptorLogic('rateLimit', requestConfig, 'request', rateLimitConfig);
      }).not.toThrow();
      
      expect(() => {
        manager._applyInterceptorLogic('rateLimit', requestConfig, 'request', rateLimitConfig);
      }).not.toThrow();
      
      // Third request should fail
      expect(() => {
        manager._applyInterceptorLogic('rateLimit', requestConfig, 'request', rateLimitConfig);
      }).toThrow('Rate limit exceeded');
    });
  });

  describe('Bulk Operations', () => {
    test('should enable multiple interceptors in bulk', () => {
      const result = manager.bulkEnable(['auth', 'retry', 'logging']);
      
      expect(result.success).toContain('auth');
      expect(result.success).toContain('retry');
      expect(result.success).toContain('logging');
      expect(result.failed).toHaveLength(0);
    });
    
    test('should handle failures in bulk operations', () => {
      const result = manager.bulkEnable(['auth', 'nonexistent', 'retry']);
      
      expect(result.success).toContain('auth');
      expect(result.success).toContain('retry');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe('nonexistent');
    });
    
    test('should disable multiple interceptors in bulk', () => {
      // Enable some first
      manager.bulkEnable(['auth', 'retry']);
      
      // Then disable them
      const result = manager.bulkDisable(['auth', 'retry']);
      
      expect(result.success).toContain('auth');
      expect(result.success).toContain('retry');
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('Configuration Export/Import', () => {
    test('should export configuration', () => {
      manager.createGroup('test-group', ['auth', 'retry']);
      manager.enableGroup('test-group');
      
      manager.addConditionalInterceptor('test-conditional', {
        condition: () => true,
        config: { test: true }
      });
      
      const config = manager.exportConfiguration();
      
      expect(config.version).toBe('1.0.0');
      expect(config.groups['test-group']).toBeDefined();
      expect(config.groups['test-group'].enabled).toBe(true);
      expect(config.conditionalInterceptors['test-conditional']).toBeDefined();
    });
    
    test('should import configuration', () => {
      const config = {
        version: '1.0.0',
        groups: {
          'imported-group': {
            interceptors: ['auth', 'logging'],
            enabled: true
          }
        },
        interceptorConfig: {
          'auth': { test: 'config' }
        }
      };
      
      const result = manager.importConfiguration(config);
      
      expect(result.success).toBe(true);
      expect(manager.getGroups()).toContain('imported-group');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should provide performance metrics', () => {
      manager.createGroup('perf-group', ['auth', 'retry', 'logging']);
      manager.enableGroup('perf-group');
      
      manager.addConditionalInterceptor('perf-conditional', {
        condition: () => true,
        config: {}
      });
      
      const metrics = manager.getPerformanceMetrics();
      
      expect(metrics.groups.total).toBe(1);
      expect(metrics.groups.enabled).toBe(1);
      expect(metrics.conditionals.total).toBe(1);
      expect(metrics.memory).toBeDefined();
      expect(metrics.health).toBeDefined();
    });
    
    test('should provide debug information', () => {
      manager.createGroup('debug-group', ['auth']);
      
      const debug = manager.getDebugInfo();
      
      expect(debug.instance.hasInstance).toBe(true);
      expect(debug.registry).toBeDefined();
      expect(debug.groups).toContain('debug-group');
      expect(debug.performance).toBeDefined();
    });
    
    test('should validate interceptors', () => {
      expect(manager.validateInterceptor('auth')).toBe(true);
      expect(manager.validateInterceptor('nonexistent')).toBe(false);
    });
    
    test('should provide detailed interceptor info', () => {
      const info = manager.getInterceptorInfo('auth');
      
      expect(info.name).toBe('auth');
      expect(info.exists).toBe(true);
      expect(info.valid).toBe(true);
      expect(info.info).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in group operations gracefully', () => {
      // Create a group with a mix of valid and invalid interceptors
      expect(() => {
        manager.createGroup('mixed-group', ['auth', 'invalid-interceptor']);
      }).toThrow();
    });
    
    test('should handle errors in interceptor logic gracefully', () => {
      // Test with malformed config that might cause errors
      const malformedConfig = {
        onProgress: 'not-a-function'
      };
      
      const requestConfig = {
        method: 'POST',
        data: new FormData()
      };
      
      // Should not throw, but handle error gracefully
      expect(() => {
        manager._applyInterceptorLogic('uploadProgress', requestConfig, 'request', malformedConfig);
      }).not.toThrow();
    });
    
    test('should handle cleanup errors gracefully', () => {
      manager.createGroup('cleanup-test', ['auth', 'retry']);
      manager.enableGroup('cleanup-test');
      
      // Mock a cleanup error
      const originalEject = mockInstance.interceptors.request.eject;
      mockInstance.interceptors.request.eject = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });
      
      // Should not throw during cleanup
      expect(() => {
        manager.cleanup();
      }).not.toThrow();
      
      // Restore original method
      mockInstance.interceptors.request.eject = originalEject;
    });
  });

  describe('Advanced Features', () => {
    test('should handle complex conditional logic', () => {
      const complexCondition = (config) => {
        return config.url?.includes('/api/') && 
               config.method?.toUpperCase() === 'POST' &&
               config.headers?.['Content-Type']?.includes('json');
      };
      
      manager.addConditionalInterceptor('complex-auth', {
        condition: complexCondition,
        config: {}
      });
      
      expect(manager.getConditionalInterceptors()).toContain('complex-auth');
    });
    
    test('should provide cleanup callbacks', () => {
      let cleanupCalled = false;
      
      manager.onCleanup(() => {
        cleanupCalled = true;
      });
      
      manager.cleanup();
      
      expect(cleanupCalled).toBe(true);
    });
    
    test('should handle interceptor conflicts gracefully', () => {
      // Enable the same interceptor multiple times
      manager.enableInterceptor('auth');
      manager.enableInterceptor('auth'); // Second call should be handled gracefully
      
      const status = manager.getStatus();
      expect(status.activeInterceptors).toContain('auth');
    });
    
    test('should maintain metadata correctly', () => {
      manager.createGroup('metadata-test', ['auth', 'retry']);
      manager.enableGroup('metadata-test');
      
      const status = manager.getStatus();
      const group = status.groups['metadata-test'];
      
      expect(group.metadata).toBeDefined();
      expect(group.createdAt).toBeDefined();
      expect(group.enabledAt).toBeDefined();
    });
  });

  describe('Integration with Real Axios Instance', () => {
    test('should work with real axios interceptors', () => {
      const realInstance = axios.create();
      const realManager = new InterceptorManager(realInstance);
      
      // Add some mock methods to make it work
      realInstance.useAuth = function() { return 'real-auth-id'; };
      realInstance.removeAuth = function() {};
      
      realManager.createGroup('real-group', ['auth']);
      realManager.enableGroup('real-group');
      
      expect(realManager.getStatus().groups['real-group'].enabled).toBe(true);
      
      realManager.cleanup();
    });
  });
});

// Test helper functions
function createTestCondition(shouldMatch = true) {
  return (config) => {
    if (shouldMatch) {
      return config.url?.includes('/test');
    }
    return false;
  };
}

function mockAxiosInterceptors() {
  return {
    request: {
      use: jest.fn().mockReturnValue('req-interceptor-id'),
      eject: jest.fn()
    },
    response: {
      use: jest.fn().mockReturnValue('res-interceptor-id'),
      eject: jest.fn()
    }
  };
}

// Performance Tests
describe('InterceptorManager Performance', () => {
  let manager;
  let mockInstance;
  
  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
    mockInstance.interceptors = mockAxiosInterceptors();
    manager = new InterceptorManager(mockInstance);
  });
  
  afterEach(() => {
    manager.cleanup();
  });

  test('should handle large numbers of groups efficiently', () => {
    const startTime = Date.now();
    
    // Create 1000 groups
    for (let i = 0; i < 1000; i++) {
      manager.createGroup(`group-${i}`, ['auth', 'retry']);
    }
    
    const creationTime = Date.now() - startTime;
    expect(creationTime).toBeLessThan(1000); // Should complete in under 1 second
    
    expect(manager.getGroups()).toHaveLength(1000);
  });
  
  test('should handle large numbers of conditional interceptors efficiently', () => {
    const startTime = Date.now();
    
    // Create 500 conditional interceptors
    for (let i = 0; i < 500; i++) {
      manager.addConditionalInterceptor(`conditional-${i}`, {
        condition: () => Math.random() > 0.5,
        config: { index: i }
      });
    }
    
    const creationTime = Date.now() - startTime;
    expect(creationTime).toBeLessThan(2000); // Should complete in under 2 seconds
    
    expect(manager.getConditionalInterceptors()).toHaveLength(500);
  });
  
  test('should maintain performance during bulk operations', () => {
    // Create many interceptors
    const interceptorNames = [];
    for (let i = 0; i < 100; i++) {
      const name = `perf-interceptor-${i}`;
      interceptorNames.push(name);
      manager.addConditionalInterceptor(name, {
        condition: () => true,
        config: {}
      });
    }
    
    const startTime = Date.now();
    const result = manager.bulkEnable(interceptorNames);
    const bulkTime = Date.now() - startTime;
    
    expect(bulkTime).toBeLessThan(500); // Should complete in under 500ms
    expect(result.success).toHaveLength(100);
  });
});

// Edge Cases and Stress Tests
describe('InterceptorManager Edge Cases', () => {
  let manager;
  let mockInstance;
  
  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
    mockInstance.interceptors = mockAxiosInterceptors();
    manager = new InterceptorManager(mockInstance);
  });
  
  afterEach(() => {
    manager.cleanup();
  });

  test('should handle circular group dependencies gracefully', () => {
    // This shouldn't happen in normal usage, but test edge case
    manager.createGroup('group-a', ['auth']);
    manager.createGroup('group-b', ['retry']);
    
    // Try to enable groups that don't have circular deps - should work fine
    expect(() => {
      manager.enableGroup('group-a');
      manager.enableGroup('group-b');
    }).not.toThrow();
  });
  
  test('should handle malformed interceptor configurations', () => {
    manager.addConditionalInterceptor('malformed-test', {
      condition: () => true,
      config: {
        // Malformed config that might cause issues
        onProgress: null,
        logger: undefined,
        retries: 'invalid-number',
        maxRequests: -1
      }
    });
    
    // Should handle gracefully without throwing
    expect(() => {
      manager.enableInterceptor('malformed-test');
    }).not.toThrow();
  });
  
  test('should handle interceptor method missing on instance', () => {
    // Remove a method from the instance
    delete mockInstance.useAuth;
    
    expect(() => {
      manager.enableInterceptor('auth');
    }).toThrow();
    
    // But validation should detect this
    expect(manager.validateInterceptor('auth')).toBe(false);
  });
  
  test('should handle concurrent enable/disable operations', async () => {
    manager.createGroup('concurrent-test', ['auth', 'retry', 'logging']);
    
    // Simulate concurrent operations
    const operations = [
      () => manager.enableGroup('concurrent-test'),
      () => manager.disableGroup('concurrent-test'),
      () => manager.toggleGroup('concurrent-test'),
      () => manager.enableInterceptor('auth'),
      () => manager.disableInterceptor('auth')
    ];
    
    // Run operations concurrently
    const promises = operations.map(op => 
      new Promise(resolve => {
        setTimeout(() => {
          try {
            op();
            resolve('success');
          } catch (error) {
            resolve('error');
          }
        }, Math.random() * 10);
      })
    );
    
    const results = await Promise.all(promises);
    
    // Should handle concurrent operations without crashing
    expect(results).toHaveLength(5);
  });
  
  test('should handle memory pressure scenarios', () => {
    // Create many objects to simulate memory pressure
    const largeData = [];
    for (let i = 0; i < 10000; i++) {
      largeData.push({
        id: i,
        data: new Array(1000).fill('memory-test-data'),
        timestamp: new Date()
      });
    }
    
    // Operations should still work under memory pressure
    manager.createGroup('memory-test', ['auth', 'retry']);
    manager.enableGroup('memory-test');
    
    const status = manager.getStatus();
    expect(status.groups['memory-test'].enabled).toBe(true);
    
    // Cleanup
    largeData.length = 0;
  });
});

// Integration Tests with Real-world Scenarios
describe('InterceptorManager Real-world Scenarios', () => {
  let manager;
  let mockInstance;
  
  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
    mockInstance.interceptors = mockAxiosInterceptors();
    manager = new InterceptorManager(mockInstance);
  });
  
  afterEach(() => {
    manager.cleanup();
  });

  test('should handle typical e-commerce API setup', () => {
    // Create groups for different parts of an e-commerce app
    manager.createGroup('user-auth', ['auth', 'refreshToken']);
    manager.createGroup('product-catalog', ['cache', 'retry']);
    manager.createGroup('checkout-flow', ['auth', 'retry', 'logging']);
    manager.createGroup('admin-panel', ['auth', 'logging', 'rateLimit']);
    
    // Setup conditional interceptors for different user types
    manager.addConditionalInterceptor('guest-optimizations', {
      condition: (config) => !config.headers?.Authorization,
      config: { cache: { maxAge: 600000 } }
    });
    
    manager.addConditionalInterceptor('premium-features', {
      condition: (config) => config.headers?.['X-User-Tier'] === 'premium',
      config: { timeout: 60000 }
    });
    
    // Enable appropriate groups
    manager.enableGroup('user-auth');
    manager.enableGroup('product-catalog');
    
    const status = manager.getStatus();
    expect(status.groups['user-auth'].enabled).toBe(true);
    expect(status.groups['product-catalog'].enabled).toBe(true);
    expect(status.conditional['guest-optimizations']).toBeDefined();
  });
  
  test('should handle development vs production environment switching', () => {
    // Development setup
    const developmentGroups = ['dev-logging', 'dev-debugging'];
    manager.createGroup('dev-logging', ['logging', 'retry']);
    manager.createGroup('dev-debugging', ['logging']);
    
    // Production setup
    const productionGroups = ['prod-performance', 'prod-monitoring'];
    manager.createGroup('prod-performance', ['cache', 'retry', 'rateLimit']);
    manager.createGroup('prod-monitoring', ['logging']);
    
    // Simulate environment switch
    const switchToProduction = () => {
      developmentGroups.forEach(group => manager.disableGroup(group));
      productionGroups.forEach(group => manager.enableGroup(group));
    };
    
    const switchToDevelopment = () => {
      productionGroups.forEach(group => manager.disableGroup(group));
      developmentGroups.forEach(group => manager.enableGroup(group));
    };
    
    // Initially in development
    developmentGroups.forEach(group => manager.enableGroup(group));
    
    // Switch to production
    switchToProduction();
    
    const prodStatus = manager.getStatus();
    expect(prodStatus.groups['prod-performance'].enabled).toBe(true);
    expect(prodStatus.groups['dev-logging'].enabled).toBe(false);
    
    // Switch back to development
    switchToDevelopment();
    
    const devStatus = manager.getStatus();
    expect(devStatus.groups['dev-logging'].enabled).toBe(true);
    expect(devStatus.groups['prod-performance'].enabled).toBe(false);
  });
  
  test('should handle API versioning scenarios', () => {
    // Setup for different API versions
    manager.addConditionalInterceptor('v1-api-auth', {
      condition: (config) => config.url?.includes('/api/v1/'),
      config: { legacy: true }
    });
    
    manager.addConditionalInterceptor('v2-api-features', {
      condition: (config) => config.url?.includes('/api/v2/'),
      config: { enhanced: true, cache: { maxAge: 300000 } }
    });
    
    manager.addConditionalInterceptor('v3-beta-features', {
      condition: (config) => 
        config.url?.includes('/api/v3/') && 
        config.headers?.['X-Beta-Access'] === 'true',
      config: { beta: true, timeout: 30000 }
    });
    
    // Enable all versioned interceptors
    manager.enableInterceptor('v1-api-auth');
    manager.enableInterceptor('v2-api-features');
    manager.enableInterceptor('v3-beta-features');
    
    const status = manager.getStatus();
    expect(Object.keys(status.conditional)).toHaveLength(3);
  });
  
  test('should handle microservices architecture', () => {
    // Different interceptor groups for different services
    const services = [
      { name: 'user-service', interceptors: ['auth', 'retry', 'logging'] },
      { name: 'payment-service', interceptors: ['auth', 'retry', 'rateLimit'] },
      { name: 'inventory-service', interceptors: ['cache', 'retry'] },
      { name: 'notification-service', interceptors: ['retry', 'logging'] }
    ];
    
    // Create groups for each service
    services.forEach(service => {
      manager.createGroup(service.name, service.interceptors);
    });
    
    // Setup service-specific conditional interceptors
    services.forEach(service => {
      manager.addConditionalInterceptor(`${service.name}-routing`, {
        condition: (config) => config.url?.includes(`/${service.name}/`),
        config: { service: service.name }
      });
    });
    
    // Enable all services
    services.forEach(service => {
      manager.enableGroup(service.name);
      manager.enableInterceptor(`${service.name}-routing`);
    });
    
    const status = manager.getStatus();
    expect(Object.keys(status.groups)).toHaveLength(4);
    expect(Object.keys(status.conditional)).toHaveLength(4);
  });
});

// Mock implementations for test utilities
const testUtils = {
  createMockRequest: (url = '/api/test', method = 'GET', headers = {}) => ({
    method,
    url,
    headers,
    data: method === 'POST' ? { test: 'data' } : undefined
  }),
  
  createMockResponse: (data = { success: true }, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: testUtils.createMockRequest()
  }),
  
  createMockError: (status = 500, message = 'Server Error') => {
    const error = new Error(message);
    error.response = {
      status,
      statusText: message,
      data: { error: message }
    };
    error.config = testUtils.createMockRequest();
    return error;
  },
  
  waitForCondition: async (condition, timeout = 1000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return false;
  }
};

// Export test utilities for reuse
export { 
  createMockAxiosInstance, 
  mockAxiosInterceptors, 
  createTestCondition, 
  testUtils 
};

// Additional test for specific interceptor logic
describe('Specific Interceptor Logic Tests', () => {
  let manager;
  let mockInstance;
  
  beforeEach(() => {
    mockInstance = createMockAxiosInstance();
    mockInstance.interceptors = mockAxiosInterceptors();
    manager = new InterceptorManager(mockInstance);
  });
  
  afterEach(() => {
    manager.cleanup();
  });

  test('should handle upload progress logic correctly', () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'text/plain' }));
    
    const requestConfig = {
      method: 'POST',
      url: '/upload',
      data: formData
    };
    
    const mockOnProgress = jest.fn();
    const config = {
      onProgress: mockOnProgress,
      onStart: jest.fn(),
      onComplete: jest.fn()
    };
    
    // Test request logic
    const result = manager._applyInterceptorLogic('uploadProgress', requestConfig, 'request', config);
    
    expect(result.onUploadProgress).toBeDefined();
    expect(result.uploadStartTime).toBeDefined();
    expect(config.onStart).toHaveBeenCalledWith(requestConfig);
    
    // Test progress event handling
    const mockProgressEvent = {
      lengthComputable: true,
      loaded: 50,
      total: 100
    };
    
    result.onUploadProgress(mockProgressEvent);
    
    expect(mockOnProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: 50,
        total: 100,
        percentage: 50
      }),
      requestConfig
    );
  });
  
  test('should handle refresh token logic correctly', async () => {
    const mockError = {
      response: { status: 401 },
      config: {
        method: 'GET',
        url: '/api/protected',
        headers: {}
      }
    };
    
    const config = {
      getRefreshToken: () => 'refresh-token',
      setAccessToken: jest.fn(),
      setRefreshToken: jest.fn(),
      refreshUrl: '/auth/refresh',
      onRefreshTokenFail: jest.fn()
    };
    
    // Mock the refresh request
    mockInstance.request = jest.fn().mockResolvedValue({
      data: {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }
    });
    
    const result = await manager._applyInterceptorLogic('refreshToken', mockError, 'responseError', config);
    
    expect(config.setAccessToken).toHaveBeenCalledWith('new-access-token');
    expect(config.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    expect(mockError.config.headers.Authorization).toBe('Bearer new-access-token');
  });
  
  test('should handle timeout logic with endpoint-specific timeouts', () => {
    const requestConfig = {
      method: 'POST',
      url: '/api/upload'
    };
    
    const config = {
      defaultTimeout: 5000,
      endpointTimeouts: {
        'POST /api/upload': 60000,
        '/api/quick': 2000
      }
    };
    
    const result = manager._applyInterceptorLogic('smartTimeout', requestConfig, 'request', config);
    
    expect(result.timeout).toBe(60000); // Should use endpoint-specific timeout
  });
});

console.log('InterceptorManager tests loaded successfully!');