import axios from "axios";

/**
 * Utility function to deep clone objects
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * Attaches state management and introspection methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} interceptorIds - Object tracking interceptor IDs
 * @param {Object} utilities - Utility class instances
 * @param {Object} interceptorStatus - Object tracking interceptor status
 */
export function attachInstanceState(
  instance,
  interceptorIds,
  utilities,
  interceptorStatus
) {
  /**
   * Get list of active interceptors
   * @returns {Object} Active interceptor information
   */
  instance.getActiveInterceptors = function () {
    const active = {
      request: [],
      response: [],
    };

    // Check standard interceptors
    if (interceptorIds.auth !== null) {
      active.request.push({ name: "auth", id: interceptorIds.auth });
    }

    if (interceptorIds.refresh !== null) {
      active.response.push({ name: "refresh", id: interceptorIds.refresh });
    }

    if (interceptorIds.retry !== null) {
      active.response.push({ name: "retry", id: interceptorIds.retry });
    }

    if (interceptorIds.logging && interceptorIds.logging.request !== null) {
      active.request.push({
        name: "logging",
        id: interceptorIds.logging.request,
      });
    }

    if (interceptorIds.logging && interceptorIds.logging.response !== null) {
      active.response.push({
        name: "logging",
        id: interceptorIds.logging.response,
      });
    }

    if (interceptorIds.upload && interceptorIds.upload.request !== null) {
      active.request.push({
        name: "upload",
        id: interceptorIds.upload.request,
      });
    }

    if (interceptorIds.upload && interceptorIds.upload.response !== null) {
      active.response.push({
        name: "upload",
        id: interceptorIds.upload.response,
      });
    }

    if (interceptorIds.cache && interceptorIds.cache.request !== null) {
      active.request.push({ name: "cache", id: interceptorIds.cache.request });
    }

    if (interceptorIds.cache && interceptorIds.cache.response !== null) {
      active.response.push({
        name: "cache",
        id: interceptorIds.cache.response,
      });
    }

    if (interceptorIds.timeout && interceptorIds.timeout.request !== null) {
      active.request.push({
        name: "timeout",
        id: interceptorIds.timeout.request,
      });
    }

    if (interceptorIds.timeout && interceptorIds.timeout.response !== null) {
      active.response.push({
        name: "timeout",
        id: interceptorIds.timeout.response,
      });
    }

    if (interceptorIds.rateLimit !== null) {
      active.request.push({ name: "rateLimit", id: interceptorIds.rateLimit });
    }

    return active;
  };

  /**
   * Get instance statistics
   * @returns {Object} Statistics about the instance
   */
  instance.getStats = function () {
    const activeInterceptors = instance.getActiveInterceptors();

    // Handle request queue stats
    let queueStats = null;
    if (utilities.requestQueue) {
      if (typeof utilities.requestQueue.getStats === "function") {
        queueStats = utilities.requestQueue.getStats();
      } else if (utilities.requestQueue.running !== undefined) {
        // Fallback to direct properties
        queueStats = {
          running: utilities.requestQueue.running,
          queued: utilities.requestQueue.queued,
          maxConcurrent: utilities.requestQueue.maxConcurrent,
        };
      } else if (instance._queue) {
        queueStats = {
          running: instance._queue.running,
          queued: instance._queue.queue.length,
          maxConcurrent: instance._queue.maxConcurrent,
        };
      }
    }

    // Handle interceptor manager stats
    let interceptorManagerStats = { groups: 0, conditionalInterceptors: 0 };
    if (utilities.interceptorManager) {
      try {
        if (typeof utilities.interceptorManager.getGroups === "function") {
          interceptorManagerStats.groups =
            utilities.interceptorManager.getGroups().length;
        }
        if (
          typeof utilities.interceptorManager.getConditionalInterceptors ===
          "function"
        ) {
          interceptorManagerStats.conditionalInterceptors =
            utilities.interceptorManager.getConditionalInterceptors().length;
        }
      } catch (error) {
        // Silently handle missing methods and use defaults
      }
    }

    return {
      interceptors: {
        request: activeInterceptors.request.length,
        response: activeInterceptors.response.length,
        total:
          activeInterceptors.request.length +
          activeInterceptors.response.length,
      },
      queue: queueStats,
      interceptorManager: interceptorManagerStats,
      mocks: instance._mocks ? instance._mocks.length : 0,
      circuitBreaker: instance.getCircuitBreakerStatus
        ? instance.getCircuitBreakerStatus()
        : null,
      dedupe: instance.getDedupeStats ? instance.getDedupeStats() : null,
    };
  };

  /**
   * Get detailed configuration info
   * @returns {Object} Detailed configuration
   */
  instance.getConfig = function () {
    // Handle missing or null defaults
    if (!instance.defaults) {
      return instance.defaults === null ? null : {};
    }

    // Deep clone to prevent mutations
    return deepClone({
      baseURL: instance.defaults.baseURL,
      timeout: instance.defaults.timeout,
      headers: {
        common: instance.defaults.headers?.common || {},
        get: instance.defaults.headers?.get || {},
        post: instance.defaults.headers?.post || {},
        put: instance.defaults.headers?.put || {},
        patch: instance.defaults.headers?.patch || {},
        delete: instance.defaults.headers?.delete || {},
      },
      transformRequest: instance.defaults.transformRequest
        ? "configured"
        : "default",
      transformResponse: instance.defaults.transformResponse
        ? "configured"
        : "default",
      validateStatus: instance.defaults.validateStatus ? "custom" : "default",
    });
  };

  /**
   * Reset instance to default state
   * @param {boolean} preserveDefaults - Whether to preserve default config
   */
  instance.reset = function (preserveDefaults = true) {
    // Remove all interceptors (only call if methods exist)
    try {
      if (instance.removeAuth) instance.removeAuth();
      if (instance.removeRefreshToken) instance.removeRefreshToken();
      if (instance.removeRetry) instance.removeRetry();
      if (instance.removeLogging) instance.removeLogging();
      if (instance.removeUploadProgress) instance.removeUploadProgress();
      if (instance.removeCache) instance.removeCache();
      if (instance.removeSmartTimeout) instance.removeSmartTimeout();
      if (instance.removeRateLimit) instance.removeRateLimit();
    } catch (error) {
      // Silently handle missing methods
    }

    // Clear conditional interceptors
    try {
      if (instance.clearConditionalInterceptors) {
        instance.clearConditionalInterceptors();
      }
    } catch (error) {
      // Silently handle missing method
    }

    // Clear other features
    try {
      if (instance.clearMocks) instance.clearMocks();
      if (instance.resetCircuitBreaker) instance.resetCircuitBreaker();
      if (instance.clearDedupe) instance.clearDedupe();
    } catch (error) {
      // Silently handle missing methods
    }

    // Reset defaults if requested
    if (!preserveDefaults && axios.defaults) {
      instance.defaults = axios.defaults;
    }

    return instance;
  };

  /**
   * Create a snapshot of current instance state
   * @returns {Object} State snapshot
   */
  instance.createSnapshot = function () {
    // Get groups and conditional interceptors safely
    let groups = [];
    let conditionalInterceptors = [];

    if (utilities.interceptorManager) {
      try {
        if (typeof utilities.interceptorManager.getGroups === "function") {
          groups = utilities.interceptorManager.getGroups();
        } else if (
          typeof utilities.interceptorManager.getActiveGroups === "function"
        ) {
          groups = utilities.interceptorManager.getActiveGroups();
        }

        if (
          typeof utilities.interceptorManager.getConditionalInterceptors ===
          "function"
        ) {
          conditionalInterceptors =
            utilities.interceptorManager.getConditionalInterceptors();
        }
      } catch (error) {
        // Use defaults on error
        groups = [];
        conditionalInterceptors = [];
      }
    }

    return {
      timestamp: Date.now(),
      config: instance.getConfig(),
      stats: instance.getStats(),
      activeInterceptors: instance.getActiveInterceptors(),
      groups: groups,
      conditionalInterceptors: conditionalInterceptors,
    };
  };

  /**
   * Get enhanced interceptor status information
   * @returns {Object} Detailed interceptor status
   */
  instance.getInterceptorStatus = function () {
    const status = {};

    // Iterate through all interceptor types
    Object.keys(interceptorStatus).forEach((name) => {
      const info = interceptorStatus[name];
      status[name] = {
        enabled: info.enabled,
        lastEnabled: info.lastEnabled,
        hasConfig: !!info.config,
        configSummary: info.config ? Object.keys(info.config) : [],
      };

      // Add ID information if available
      if (
        name === "auth" ||
        name === "refresh" ||
        name === "retry" ||
        name === "rateLimit"
      ) {
        status[name].interceptorId = interceptorIds[name];
      } else if (
        interceptorIds[name] &&
        typeof interceptorIds[name] === "object"
      ) {
        status[name].interceptorIds = {
          request: interceptorIds[name].request,
          response: interceptorIds[name].response,
        };
      }
    });

    return status;
  };

  /**
   * Export instance configuration for debugging
   * @returns {string} JSON string of configuration
   */
  instance.exportConfig = function () {
    const snapshot = instance.createSnapshot();
    return JSON.stringify(snapshot, null, 2);
  };
}
