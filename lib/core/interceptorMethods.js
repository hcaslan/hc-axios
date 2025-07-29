/**
 * Attaches interceptor methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} interceptorIds - Object to track interceptor IDs
 * @param {Object} attachers - Object containing interceptor attachment functions
 * @param {Object} interceptorStatus - Object to track interceptor status
 * @param {Object} interceptorEvents - Event emitter for interceptor events
 */
export function attachInterceptorMethods(
  instance,
  interceptorIds,
  attachers,
  interceptorStatus,
  interceptorEvents
) {
  /**
   * Configure authentication
   */
  instance.useAuth = function (options = {}) {
    // Remove existing if present
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
    }
    interceptorIds.auth = attachers.attachAuthInterceptor(instance, options);

    // Update status
    interceptorStatus.auth = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    // Emit event
    interceptorEvents.emit("interceptor:enabled", {
      name: "auth",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure refresh token handling
   */
  instance.useRefreshToken = function (options = {}) {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
    }
    interceptorIds.refresh = attachers.attachRefreshInterceptor(
      instance,
      options
    );

    interceptorStatus.refresh = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "refresh",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure retry logic
   */
  instance.useRetry = function (options = {}) {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
    }
    interceptorIds.retry = attachers.attachRetryInterceptor(instance, options);

    interceptorStatus.retry = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "retry",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure request/response logging
   */
  instance.useLogging = function (options = {}) {
    if (interceptorIds.logging.request !== null) {
      instance.interceptors.request.eject(interceptorIds.logging.request);
    }
    if (interceptorIds.logging.response !== null) {
      instance.interceptors.response.eject(interceptorIds.logging.response);
    }
    const ids = attachers.attachLoggingInterceptor(instance, options);
    interceptorIds.logging = ids;

    interceptorStatus.logging = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "logging",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure upload progress tracking
   */
  instance.useUploadProgress = function (options = {}) {
    if (interceptorIds.upload.request !== null) {
      instance.interceptors.request.eject(interceptorIds.upload.request);
    }
    if (interceptorIds.upload.response !== null) {
      instance.interceptors.response.eject(interceptorIds.upload.response);
    }
    const ids = attachers.attachUploadInterceptor(instance, options);
    interceptorIds.upload = ids;

    interceptorStatus.upload = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "upload",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure response caching
   */
  instance.useCache = function (options = {}) {
    if (interceptorIds.cache.request !== null) {
      instance.interceptors.request.eject(interceptorIds.cache.request);
    }
    if (interceptorIds.cache.response !== null) {
      instance.interceptors.response.eject(interceptorIds.cache.response);
    }
    const ids = attachers.attachCacheInterceptor(instance, options);
    interceptorIds.cache = ids;

    interceptorStatus.cache = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "cache",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure smart timeouts
   */
  instance.useSmartTimeout = function (options = {}) {
    if (interceptorIds.timeout.request !== null) {
      instance.interceptors.request.eject(interceptorIds.timeout.request);
    }
    if (interceptorIds.timeout.response !== null) {
      instance.interceptors.response.eject(interceptorIds.timeout.response);
    }
    const ids = attachers.attachTimeoutInterceptor(instance, options);
    interceptorIds.timeout = ids;

    interceptorStatus.timeout = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "timeout",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  /**
   * Configure rate limiting
   */
  instance.useRateLimit = function (options = {}) {
    if (interceptorIds.rateLimit !== null) {
      instance.interceptors.request.eject(interceptorIds.rateLimit);
    }
    interceptorIds.rateLimit = attachers.attachRateLimitInterceptor(
      instance,
      options
    );

    interceptorStatus.rateLimit = {
      enabled: true,
      lastEnabled: new Date(),
      config: options,
    };

    interceptorEvents.emit("interceptor:enabled", {
      name: "rateLimit",
      config: options,
      timestamp: new Date(),
    });

    return instance;
  };

  // Enhanced removal methods with proper validation and cleanup

  /**
   * Remove authentication interceptor
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeAuth = function () {
    try {
      if (interceptorIds.auth === null) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[hc-axios] Auth interceptor is not currently active");
        }
        return instance;
      }

      // Eject the interceptor
      instance.interceptors.request.eject(interceptorIds.auth);

      // Clear the ID
      interceptorIds.auth = null;

      // Update status
      interceptorStatus.auth = {
        enabled: false,
        lastEnabled: interceptorStatus.auth.lastEnabled,
        config: null,
      };

      // Clean up any auth-specific state
      if (instance._authTokenProvider) {
        delete instance._authTokenProvider;
      }
      if (instance._authCache) {
        delete instance._authCache;
      }

      // Emit removal event
      interceptorEvents.emit("interceptor:removed", {
        name: "auth",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "auth",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(`Failed to remove auth interceptor: ${error.message}`);
    }
  };

  /**
   * Remove refresh token interceptor
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeRefreshToken = function () {
    try {
      if (interceptorIds.refresh === null) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Refresh token interceptor is not currently active"
          );
        }
        return instance;
      }

      instance.interceptors.response.eject(interceptorIds.refresh);
      interceptorIds.refresh = null;

      interceptorStatus.refresh = {
        enabled: false,
        lastEnabled: interceptorStatus.refresh.lastEnabled,
        config: null,
      };

      // Clean up refresh-specific state
      if (instance._refreshQueue) {
        instance._refreshQueue.clear && instance._refreshQueue.clear();
        delete instance._refreshQueue;
      }
      if (instance._isRefreshing !== undefined) {
        delete instance._isRefreshing;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "refresh",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "refresh",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(
        `Failed to remove refresh token interceptor: ${error.message}`
      );
    }
  };

  /**
   * Remove retry interceptor
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeRetry = function () {
    try {
      if (interceptorIds.retry === null) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[hc-axios] Retry interceptor is not currently active");
        }
        return instance;
      }

      instance.interceptors.response.eject(interceptorIds.retry);
      interceptorIds.retry = null;

      interceptorStatus.retry = {
        enabled: false,
        lastEnabled: interceptorStatus.retry.lastEnabled,
        config: null,
      };

      // Clean up retry-specific state
      if (instance._retryQueue) {
        delete instance._retryQueue;
      }
      if (instance._retryCount) {
        delete instance._retryCount;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "retry",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "retry",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(`Failed to remove retry interceptor: ${error.message}`);
    }
  };

  /**
   * Remove logging interceptors
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeLogging = function () {
    try {
      const hadRequest = interceptorIds.logging.request !== null;
      const hadResponse = interceptorIds.logging.response !== null;

      if (!hadRequest && !hadResponse) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Logging interceptors are not currently active"
          );
        }
        return instance;
      }

      if (hadRequest) {
        instance.interceptors.request.eject(interceptorIds.logging.request);
        interceptorIds.logging.request = null;
      }

      if (hadResponse) {
        instance.interceptors.response.eject(interceptorIds.logging.response);
        interceptorIds.logging.response = null;
      }

      interceptorStatus.logging = {
        enabled: false,
        lastEnabled: interceptorStatus.logging.lastEnabled,
        config: null,
      };

      // Clean up logging-specific state
      if (instance._logger) {
        delete instance._logger;
      }
      if (instance._logBuffer) {
        delete instance._logBuffer;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "logging",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "logging",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(
        `Failed to remove logging interceptors: ${error.message}`
      );
    }
  };

  /**
   * Remove upload progress interceptors
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeUploadProgress = function () {
    try {
      const hadRequest = interceptorIds.upload.request !== null;
      const hadResponse = interceptorIds.upload.response !== null;

      if (!hadRequest && !hadResponse) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Upload progress interceptors are not currently active"
          );
        }
        return instance;
      }

      if (hadRequest) {
        instance.interceptors.request.eject(interceptorIds.upload.request);
        interceptorIds.upload.request = null;
      }

      if (hadResponse) {
        instance.interceptors.response.eject(interceptorIds.upload.response);
        interceptorIds.upload.response = null;
      }

      interceptorStatus.upload = {
        enabled: false,
        lastEnabled: interceptorStatus.upload.lastEnabled,
        config: null,
      };

      // Clean up upload-specific state
      if (instance._uploadProgressHandlers) {
        instance._uploadProgressHandlers.clear &&
          instance._uploadProgressHandlers.clear();
        delete instance._uploadProgressHandlers;
      }
      if (instance._activeUploads) {
        delete instance._activeUploads;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "upload",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "upload",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(
        `Failed to remove upload progress interceptors: ${error.message}`
      );
    }
  };

  /**
   * Remove cache interceptors
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeCache = function () {
    try {
      const hadRequest = interceptorIds.cache.request !== null;
      const hadResponse = interceptorIds.cache.response !== null;

      if (!hadRequest && !hadResponse) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Cache interceptors are not currently active"
          );
        }
        return instance;
      }

      if (hadRequest) {
        instance.interceptors.request.eject(interceptorIds.cache.request);
        interceptorIds.cache.request = null;
      }

      if (hadResponse) {
        instance.interceptors.response.eject(interceptorIds.cache.response);
        interceptorIds.cache.response = null;
      }

      interceptorStatus.cache = {
        enabled: false,
        lastEnabled: interceptorStatus.cache.lastEnabled,
        config: null,
      };

      // Clean up cache-specific state
      if (instance._cache) {
        // Clear cache if it has a clear method
        if (instance._cache.clear) {
          instance._cache.clear();
        }
        delete instance._cache;
      }
      if (instance._cacheKeyGenerator) {
        delete instance._cacheKeyGenerator;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "cache",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "cache",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(`Failed to remove cache interceptors: ${error.message}`);
    }
  };

  /**
   * Remove smart timeout interceptors
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeSmartTimeout = function () {
    try {
      const hadRequest = interceptorIds.timeout.request !== null;
      const hadResponse = interceptorIds.timeout.response !== null;

      if (!hadRequest && !hadResponse) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Smart timeout interceptors are not currently active"
          );
        }
        return instance;
      }

      if (hadRequest) {
        instance.interceptors.request.eject(interceptorIds.timeout.request);
        interceptorIds.timeout.request = null;
      }

      if (hadResponse) {
        instance.interceptors.response.eject(interceptorIds.timeout.response);
        interceptorIds.timeout.response = null;
      }

      interceptorStatus.timeout = {
        enabled: false,
        lastEnabled: interceptorStatus.timeout.lastEnabled,
        config: null,
      };

      // Clean up timeout-specific state
      if (instance._timeoutHandlers) {
        // Clear any active timeouts
        if (instance._timeoutHandlers instanceof Map) {
          instance._timeoutHandlers.forEach((handler) => {
            if (handler && handler.clear) {
              handler.clear();
            }
          });
          instance._timeoutHandlers.clear();
        }
        delete instance._timeoutHandlers;
      }
      if (instance._timeoutConfig) {
        delete instance._timeoutConfig;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "timeout",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "timeout",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(
        `Failed to remove smart timeout interceptors: ${error.message}`
      );
    }
  };

  /**
   * Remove rate limit interceptor
   * @returns {Object} The instance for chaining
   * @throws {Error} If removal fails
   */
  instance.removeRateLimit = function () {
    try {
      if (interceptorIds.rateLimit === null) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[hc-axios] Rate limit interceptor is not currently active"
          );
        }
        return instance;
      }

      instance.interceptors.request.eject(interceptorIds.rateLimit);
      interceptorIds.rateLimit = null;

      interceptorStatus.rateLimit = {
        enabled: false,
        lastEnabled: interceptorStatus.rateLimit.lastEnabled,
        config: null,
      };

      // Clean up rate limit-specific state
      if (instance._rateLimiter) {
        // Stop any rate limit timers
        if (instance._rateLimiter.stop) {
          instance._rateLimiter.stop();
        }
        delete instance._rateLimiter;
      }
      if (instance._rateLimitQueue) {
        // Clear the queue
        if (Array.isArray(instance._rateLimitQueue)) {
          instance._rateLimitQueue.length = 0;
        }
        delete instance._rateLimitQueue;
      }

      interceptorEvents.emit("interceptor:removed", {
        name: "rateLimit",
        timestamp: new Date(),
      });

      return instance;
    } catch (error) {
      interceptorEvents.emit("interceptor:error", {
        name: "rateLimit",
        operation: "remove",
        error: error.message,
        timestamp: new Date(),
      });
      throw new Error(
        `Failed to remove rate limit interceptor: ${error.message}`
      );
    }
  };
}
