import axios from 'axios';
import { attachAuthInterceptor } from '../interceptors/auth.js';
import { attachRefreshInterceptor } from '../interceptors/refresh.js';
import { attachRetryInterceptor } from '../interceptors/retry.js';
import { attachLoggingInterceptor } from '../interceptors/logging.js';

/**
 * Creates an extended axios instance with additional methods
 * @param {import('axios').AxiosRequestConfig} [config] - Axios configuration
 * @returns {import('../../index').HCAxiosInstance}
 */
export function createExtendedInstance(config) {
  // Create base axios instance
  const instance = axios.create(config);
  
  // Store interceptor IDs for management
  const interceptorIds = {
    auth: null,
    refresh: null,
    retry: null,
    logging: { request: null, response: null }
  };

  // Enhance the instance with our custom methods
  
  /**
   * Configure authentication interceptor
   */
  instance.useAuth = function(getTokenFn) {
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
    }
    interceptorIds.auth = attachAuthInterceptor(instance, getTokenFn);
    return instance; // Enable chaining
  };

  /**
   * Configure refresh token interceptor
   */
  instance.useRefreshToken = function(options) {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
    }
    interceptorIds.refresh = attachRefreshInterceptor(instance, options);
    return instance; // Enable chaining
  };

  /**
   * Configure retry interceptor
   */
  instance.useRetry = function(options = {}) {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
    }
    interceptorIds.retry = attachRetryInterceptor(instance, options);
    return instance; // Enable chaining
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
    const ids = attachLoggingInterceptor(instance, options);
    interceptorIds.logging = ids;
    return instance; // Enable chaining
  };

  /**
   * Remove authentication interceptor
   */
  instance.removeAuth = function() {
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
      interceptorIds.auth = null;
    }
    return instance;
  };

  /**
   * Remove refresh token interceptor
   */
  instance.removeRefreshToken = function() {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
      interceptorIds.refresh = null;
    }
    return instance;
  };

  /**
   * Remove retry interceptor
   */
  instance.removeRetry = function() {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
      interceptorIds.retry = null;
    }
    return instance;
  };

  /**
   * Remove logging interceptor
   */
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

  /**
   * Quick configuration helper for common auth setup
   */
  instance.setupAuth = function(authConfig) {
    if (authConfig.getToken) {
      instance.useAuth(authConfig.getToken);
    }
    
    if (authConfig.refresh) {
      instance.useRefreshToken(authConfig.refresh);
    }
    
    return instance;
  };

  /**
   * Get current interceptor status
   */
  instance.getInterceptorStatus = function() {
    return {
      auth: interceptorIds.auth !== null,
      refreshToken: interceptorIds.refresh !== null,
      retry: interceptorIds.retry !== null,
      logging: interceptorIds.logging.request !== null || interceptorIds.logging.response !== null
    };
  };

  // Preserve original axios methods visibility
  instance.request = instance.request.bind(instance);
  instance.get = instance.get.bind(instance);
  instance.delete = instance.delete.bind(instance);
  instance.head = instance.head.bind(instance);
  instance.options = instance.options.bind(instance);
  instance.post = instance.post.bind(instance);
  instance.put = instance.put.bind(instance);
  instance.patch = instance.patch.bind(instance);

  return instance;
}