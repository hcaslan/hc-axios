/**
 * Attaches interceptor-related methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} interceptorIds - Object to track interceptor IDs
 * @param {Object} attachers - Interceptor attacher functions
 */
export function attachInterceptorMethods(instance, interceptorIds, attachers) {
  /**
   * Configure authentication interceptor
   */
  instance.useAuth = function(getTokenFn) {
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
    }
    interceptorIds.auth = attachers.attachAuthInterceptor(instance, getTokenFn);
    return instance;
  };

  /**
   * Configure refresh token interceptor
   */
  instance.useRefreshToken = function(options) {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
    }
    interceptorIds.refresh = attachers.attachRefreshInterceptor(instance, options);
    return instance;
  };

  /**
   * Configure retry interceptor
   */
  instance.useRetry = function(options = {}) {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
    }
    interceptorIds.retry = attachers.attachRetryInterceptor(instance, options);
    return instance;
  };

  /**
   * Configure logging interceptor
   */
  instance.useLogging = function(options = {}) {
    if (interceptorIds.logging.request !== null) {
      instance.interceptors.request.eject(interceptorIds.logging.request);
    }
    if (interceptorIds.logging.response !== null) {
      instance.interceptors.response.eject(interceptorIds.logging.response);
    }
    const ids = attachers.attachLoggingInterceptor(instance, options);
    interceptorIds.logging = ids;
    return instance;
  };

  /**
   * Configure upload progress tracking
   */
  instance.useUploadProgress = function(options = {}) {
    if (interceptorIds.upload.request !== null) {
      instance.interceptors.request.eject(interceptorIds.upload.request);
    }
    if (interceptorIds.upload.response !== null) {
      instance.interceptors.response.eject(interceptorIds.upload.response);
    }
    const ids = attachers.attachUploadInterceptor(instance, options);
    interceptorIds.upload = ids;
    return instance;
  };

  /**
   * Configure response caching
   */
  instance.useCache = function(options = {}) {
    if (interceptorIds.cache.request !== null) {
      instance.interceptors.request.eject(interceptorIds.cache.request);
    }
    if (interceptorIds.cache.response !== null) {
      instance.interceptors.response.eject(interceptorIds.cache.response);
    }
    const ids = attachers.attachCacheInterceptor(instance, options);
    interceptorIds.cache = ids;
    return instance;
  };

  /**
   * Configure smart timeouts
   */
  instance.useSmartTimeout = function(options = {}) {
    if (interceptorIds.timeout.request !== null) {
      instance.interceptors.request.eject(interceptorIds.timeout.request);
    }
    if (interceptorIds.timeout.response !== null) {
      instance.interceptors.response.eject(interceptorIds.timeout.response);
    }
    const ids = attachers.attachTimeoutInterceptor(instance, options);
    interceptorIds.timeout = ids;
    return instance;
  };

  /**
   * Configure rate limiting
   */
  instance.useRateLimit = function(options = {}) {
    if (interceptorIds.rateLimit !== null) {
      instance.interceptors.request.eject(interceptorIds.rateLimit);
    }
    interceptorIds.rateLimit = attachers.attachRateLimitInterceptor(instance, options);
    return instance;
  };

  // Removal methods
  instance.removeAuth = function() {
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
      interceptorIds.auth = null;
    }
    return instance;
  };

  instance.removeRefreshToken = function() {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
      interceptorIds.refresh = null;
    }
    return instance;
  };

  instance.removeRetry = function() {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
      interceptorIds.retry = null;
    }
    return instance;
  };

  instance.removeLogging = function() {
    if (interceptorIds.logging.request !== null) {
      instance.interceptors.request.eject(interceptorIds.logging.request);
      interceptorIds.logging.request = null;
    }
    if (interceptorIds.logging.response !== null) {
      instance.interceptors.response.eject(interceptorIds.logging.response);
      interceptorIds.logging.response = null;
    }
    return instance;
  };

  instance.removeUploadProgress = function() {
    if (interceptorIds.upload.request !== null) {
      instance.interceptors.request.eject(interceptorIds.upload.request);
      interceptorIds.upload.request = null;
    }
    if (interceptorIds.upload.response !== null) {
      instance.interceptors.response.eject(interceptorIds.upload.response);
      interceptorIds.upload.response = null;
    }
    return instance;
  };

  instance.removeCache = function() {
    if (interceptorIds.cache.request !== null) {
      instance.interceptors.request.eject(interceptorIds.cache.request);
      interceptorIds.cache.request = null;
    }
    if (interceptorIds.cache.response !== null) {
      instance.interceptors.response.eject(interceptorIds.cache.response);
      interceptorIds.cache.response = null;
    }
    return instance;
  };

  instance.removeSmartTimeout = function() {
    if (interceptorIds.timeout.request !== null) {
      instance.interceptors.request.eject(interceptorIds.timeout.request);
      interceptorIds.timeout.request = null;
    }
    if (interceptorIds.timeout.response !== null) {
      instance.interceptors.response.eject(interceptorIds.timeout.response);
      interceptorIds.timeout.response = null;
    }
    return instance;
  };

  instance.removeRateLimit = function() {
    if (interceptorIds.rateLimit !== null) {
      instance.interceptors.request.eject(interceptorIds.rateLimit);
      interceptorIds.rateLimit = null;
    }
    return instance;
  };
}