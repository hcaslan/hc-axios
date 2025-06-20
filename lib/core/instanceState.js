import axios from 'axios';
/**
 * Attaches state management and introspection methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} interceptorIds - Object tracking interceptor IDs
 * @param {Object} utilities - Utility class instances
 */
export function attachInstanceState(instance, interceptorIds, utilities) {
  /**
   * Get list of active interceptors
   * @returns {Object} Active interceptor information
   */
  instance.getActiveInterceptors = function() {
    const active = {
      request: [],
      response: []
    };
    
    // Check standard interceptors
    if (interceptorIds.auth !== null) {
      active.request.push({ name: 'auth', id: interceptorIds.auth });
    }
    
    if (interceptorIds.refresh !== null) {
      active.response.push({ name: 'refresh', id: interceptorIds.refresh });
    }
    
    if (interceptorIds.retry !== null) {
      active.response.push({ name: 'retry', id: interceptorIds.retry });
    }
    
    if (interceptorIds.logging.request !== null) {
      active.request.push({ name: 'logging', id: interceptorIds.logging.request });
    }
    
    if (interceptorIds.logging.response !== null) {
      active.response.push({ name: 'logging', id: interceptorIds.logging.response });
    }
    
    if (interceptorIds.upload.request !== null) {
      active.request.push({ name: 'upload', id: interceptorIds.upload.request });
    }
    
    if (interceptorIds.upload.response !== null) {
      active.response.push({ name: 'upload', id: interceptorIds.upload.response });
    }
    
    if (interceptorIds.cache.request !== null) {
      active.request.push({ name: 'cache', id: interceptorIds.cache.request });
    }
    
    if (interceptorIds.cache.response !== null) {
      active.response.push({ name: 'cache', id: interceptorIds.cache.response });
    }
    
    if (interceptorIds.timeout.request !== null) {
      active.request.push({ name: 'timeout', id: interceptorIds.timeout.request });
    }
    
    if (interceptorIds.timeout.response !== null) {
      active.response.push({ name: 'timeout', id: interceptorIds.timeout.response });
    }
    
    if (interceptorIds.rateLimit !== null) {
      active.request.push({ name: 'rateLimit', id: interceptorIds.rateLimit });
    }
    
    return active;
  };

  /**
   * Get instance statistics
   * @returns {Object} Statistics about the instance
   */
  instance.getStats = function() {
    const activeInterceptors = instance.getActiveInterceptors();
    
    return {
      interceptors: {
        request: activeInterceptors.request.length,
        response: activeInterceptors.response.length,
        total: activeInterceptors.request.length + activeInterceptors.response.length
      },
      queue: instance._queue ? {
        running: instance._queue.running,
        queued: instance._queue.queue.length,
        maxConcurrent: instance._queue.maxConcurrent
      } : null,
      interceptorManager: {
        groups: utilities.interceptorManager.getGroups().length,
        conditionalInterceptors: utilities.interceptorManager.getConditionalInterceptors().length
      },
      mocks: instance._mocks ? instance._mocks.length : 0,
      circuitBreaker: instance.getCircuitBreakerStatus ? instance.getCircuitBreakerStatus() : null,
      dedupe: instance.getDedupeStats ? instance.getDedupeStats() : null
    };
  };

  /**
   * Get detailed configuration info
   * @returns {Object} Detailed configuration
   */
  instance.getConfig = function() {
    return {
      baseURL: instance.defaults.baseURL,
      timeout: instance.defaults.timeout,
      headers: {
        common: instance.defaults.headers.common,
        get: instance.defaults.headers.get,
        post: instance.defaults.headers.post,
        put: instance.defaults.headers.put,
        patch: instance.defaults.headers.patch,
        delete: instance.defaults.headers.delete
      },
      transformRequest: instance.defaults.transformRequest ? 'configured' : 'default',
      transformResponse: instance.defaults.transformResponse ? 'configured' : 'default',
      validateStatus: instance.defaults.validateStatus ? 'custom' : 'default'
    };
  };

  /**
   * Reset instance to default state
   * @param {boolean} preserveDefaults - Whether to preserve default config
   */
  instance.reset = function(preserveDefaults = true) {
    // Remove all interceptors
    instance.removeAuth();
    instance.removeRefreshToken();
    instance.removeRetry();
    instance.removeLogging();
    instance.removeUploadProgress();
    instance.removeCache();
    instance.removeSmartTimeout();
    instance.removeRateLimit();
    
    // Clear conditional interceptors
    instance.clearConditionalInterceptors();
    
    // Clear mocks
    if (instance.clearMocks) {
      instance.clearMocks();
    }
    
    // Reset circuit breaker
    if (instance.resetCircuitBreaker) {
      instance.resetCircuitBreaker();
    }
    
    // Clear dedupe
    if (instance.clearDedupe) {
      instance.clearDedupe();
    }
    
    // Reset defaults if requested
    if (!preserveDefaults) {
      instance.defaults = axios.defaults;
    }
    
    return instance;
  };

  /**
   * Create a snapshot of current instance state
   * @returns {Object} State snapshot
   */
  instance.createSnapshot = function() {
    return {
      timestamp: Date.now(),
      config: instance.getConfig(),
      stats: instance.getStats(),
      activeInterceptors: instance.getActiveInterceptors(),
      groups: utilities.interceptorManager.getGroups(),
      conditionalInterceptors: utilities.interceptorManager.getConditionalInterceptors()
    };
  };

  /**
   * Export instance configuration for debugging
   * @returns {string} JSON string of configuration
   */
  instance.exportConfig = function() {
    const snapshot = instance.createSnapshot();
    return JSON.stringify(snapshot, null, 2);
  };
}