import axios from 'axios';

// Import interceptors
import { attachAuthInterceptor } from '../interceptors/auth.js';
import { attachRefreshInterceptor } from '../interceptors/refresh.js';
import { attachRetryInterceptor } from '../interceptors/retry.js';
import { attachLoggingInterceptor } from '../interceptors/logging.js';
import { attachUploadInterceptor } from '../interceptors/upload.js';
import { attachCacheInterceptor } from '../interceptors/cache.js';
import { attachTimeoutInterceptor } from '../interceptors/timeout.js';
import { attachRateLimitInterceptor } from '../interceptors/rateLimit.js';

// Import utilities
import { RequestQueue } from '../utils/requestQueue.js';
import { PaginationHelper } from '../utils/pagination.js';
import { CancellationManager } from '../utils/cancellation.js';
import { BatchRequestManager } from '../utils/batchRequests.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { InterceptorManager } from '../utils/interceptorManager.js';

// Import transformers and patterns
import { responseTransformers } from '../utils/responseTransform.js';
import { 
  createApiClient, 
  createResource, 
  uploadFile, 
  createHealthCheck 
} from '../utils/commonPatterns.js';

// Import conditions
import { InterceptorConditions, CommonConditions } from '../utils/interceptorConditions.js';

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
    logging: { request: null, response: null },
    upload: { request: null, response: null },
    cache: { request: null, response: null },
    timeout: { request: null, response: null },
    rateLimit: null
  };

  // Initialize utility classes
  const requestQueue = new RequestQueue();
  const paginationHelper = new PaginationHelper(instance);
  const cancellationManager = new CancellationManager();
  const batchManager = new BatchRequestManager(instance);
  const errorHandler = new ErrorHandler();
  const interceptorManager = new InterceptorManager(instance);

  // Enhance the instance with interceptor management
  
  /**
   * Create an interceptor group for easy management
   */
  instance.createInterceptorGroup = function(groupName, interceptorNames) {
    interceptorManager.createGroup(groupName, interceptorNames);
  }
  };

  /**
   * Enable an interceptor group
   */
  instance.enableGroup = function(groupName) {
    interceptorManager.enableGroup(groupName);
    return instance;
  };

  /**
   * Disable an interceptor group
   */
  instance.disableGroup = function(groupName) {
    interceptorManager.disableGroup(groupName);
    return instance;
  };

  /**
   * Toggle an interceptor group
   */
  instance.toggleGroup = function(groupName) {
    interceptorManager.toggleGroup(groupName);
    return instance;
  };

  /**
   * Setup conditional interceptors
   */
  instance.useConditionalInterceptors = function(config) {
    interceptorManager.useConditionalInterceptors(config);
    return instance;
  };

  /**
   * Add a conditional interceptor
   */
  instance.addConditionalInterceptor = function(interceptorName, options) {
    interceptorManager.addConditionalInterceptor(interceptorName, options);
    return instance;
  };

  /**
   * Remove a conditional interceptor
   */
  instance.removeConditionalInterceptor = function(interceptorName) {
    interceptorManager.removeConditionalInterceptor(interceptorName);
    return instance;
  };

  /**
   * Enable a specific interceptor
   */
  instance.enableInterceptor = function(interceptorName) {
    interceptorManager.enableInterceptor(interceptorName);
    return instance;
  };

  /**
   * Disable a specific interceptor
   */
  instance.disableInterceptor = function(interceptorName) {
    interceptorManager.disableInterceptor(interceptorName);
    return instance;
  };

  /**
   * Get interceptor manager status
   */
  instance.getInterceptorManagerStatus = function() {
    return interceptorManager.getStatus();
  };

  /**
   * Get available interceptor groups
   */
  instance.getInterceptorGroups = function() {
    return interceptorManager.getGroups();
  };

  /**
   * Get conditional interceptors
   */
  instance.getConditionalInterceptors = function() {
    return interceptorManager.getConditionalInterceptors();
  };

  /**
   * Clear all interceptor groups
   */
  instance.clearInterceptorGroups = function() {
    interceptorManager.clearGroups();
    return instance;
  };

  /**
   * Clear all conditional interceptors
   */
  instance.clearConditionalInterceptors = function() {
    interceptorManager.clearConditionalInterceptors();
    return instance;
  };

  // Existing interceptor methods with enhanced functionality
  
  /**
   * Configure authentication interceptor
   */
  instance.useAuth = function(getTokenFn) {
    if (interceptorIds.auth !== null) {
      instance.interceptors.request.eject(interceptorIds.auth);
    }
    interceptorIds.auth = attachAuthInterceptor(instance, getTokenFn);
    return instance;
  };

  /**
   * Configure refresh token interceptor
   */
  instance.useRefreshToken = function(options) {
    if (interceptorIds.refresh !== null) {
      instance.interceptors.response.eject(interceptorIds.refresh);
    }
    interceptorIds.refresh = attachRefreshInterceptor(instance, options);
    return instance;
  };

  /**
   * Configure retry interceptor
   */
  instance.useRetry = function(options = {}) {
    if (interceptorIds.retry !== null) {
      instance.interceptors.response.eject(interceptorIds.retry);
    }
    interceptorIds.retry = attachRetryInterceptor(instance, options);
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
    const ids = attachLoggingInterceptor(instance, options);
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
    const ids = attachUploadInterceptor(instance, options);
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
    const ids = attachCacheInterceptor(instance, options);
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
    const ids = attachTimeoutInterceptor(instance, options);
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
    interceptorIds.rateLimit = attachRateLimitInterceptor(instance, options);
    return instance;
  };

  /**
   * Configure response transformation
   */
  instance.useResponseTransform = function(transformer) {
    const responseInterceptorId = instance.interceptors.response.use(
      (response) => {
        response.data = transformer(response.data);
        return response;
      }
    );
    return instance;
  };

  /**
   * Enable automatic camelCase transformation
   */
  instance.useCamelCase = function() {
    return instance.useResponseTransform(responseTransformers.toCamelCase);
  };

  /**
   * Configure request queueing
   */
  instance.useQueue = function(maxConcurrent = 5) {
    const queue = new RequestQueue(maxConcurrent);
    
    // Override HTTP methods to use queue
    const originalMethods = {};
    ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach(method => {
      originalMethods[method] = instance[method];
      instance[method] = function(...args) {
        return queue.add(() => originalMethods[method].apply(instance, args));
      };
    });
    
    instance._queue = queue;
    return instance;
  };

  // Enhanced setup methods with interceptor management

  /**
   * Setup common interceptor groups
   */
  instance.setupCommonGroups = function() {
    // Create predefined groups
    instance.createInterceptorGroup('api-calls', ['auth', 'retry', 'cache']);
    instance.createInterceptorGroup('development', ['logging', 'retry']);
    instance.createInterceptorGroup('production', ['auth', 'retry', 'cache', 'rateLimit']);
    instance.createInterceptorGroup('upload', ['auth', 'uploadProgress', 'retry']);
    instance.createInterceptorGroup('public', ['logging', 'cache']);
    
    return instance;
  };

  /**
   * Setup environment-specific interceptor configuration
   */
  instance.setupEnvironmentInterceptors = function() {
    instance.useConditionalInterceptors({
      logging: {
        condition: CommonConditions.isDevelopment,
        config: {
          logRequests: true,
          logResponses: true,
          logErrors: true
        }
      },
      auth: {
        condition: CommonConditions.requiresAuth,
        config: {}
      },
      retry: {
        condition: CommonConditions.isApiCall,
        config: {
          retries: 3,
          retryDelay: 1000
        }
      },
      cache: {
        condition: InterceptorConditions.and(
          CommonConditions.isGetRequest,
          CommonConditions.isApiCall
        ),
        config: {
          maxAge: 300000
        }
      },
      uploadProgress: {
        condition: CommonConditions.isFileUpload,
        config: {
          onProgress: (info) => console.log(`Upload: ${info.percentage}%`)
        }
      }
    });
    
    return instance;
  };

  /**
   * Setup smart interceptor routing
   */
  instance.setupSmartRouting = function(routes = {}) {
    const defaultRoutes = {
      '/api/auth/*': ['auth', 'retry'],
      '/api/upload/*': ['auth', 'uploadProgress', 'retry'],
      '/api/public/*': ['cache', 'logging'],
      '/health': ['logging'],
      '/api/*': ['auth', 'retry', 'cache'],
      ...routes
    };

    Object.entries(defaultRoutes).forEach(([pattern, interceptors]) => {
      const groupName = `route-${pattern.replace(/[^a-zA-Z0-9]/g, '-')}`;
      instance.createInterceptorGroup(groupName, interceptors);
      
      instance.addConditionalInterceptor(`group-${groupName}`, {
        condition: InterceptorConditions.urlMatches(pattern),
        config: {}
      });
    });
    
    return instance;
  };

  // File upload with progress
  instance.uploadFile = function(file, options = {}) {
    return uploadFile(instance, file, options);
  };

  // Batch multiple requests
  instance.batch = function(requests) {
    return Promise.all(requests.map(req => {
      if (typeof req === 'function') {
        return req();
      }
      return instance.request(req);
    }));
  };

  // Create a cancellable request
  instance.cancellable = function(key, config) {
    const signal = cancellationManager.create(key);
    return instance.request({ ...config, signal });
  };

  // Cancel request by key
  instance.cancel = function(key) {
    cancellationManager.cancel(key);
  };

  // Cancel all pending requests
  instance.cancelAll = function() {
    cancellationManager.cancelAll();
  };

  // Paginated requests helper
  instance.paginate = function(url, options = {}) {
    return paginationHelper.fetchPages(url, options);
  };

  // Fetch all paginated data
  instance.fetchAll = function(url, options = {}) {
    return paginationHelper.fetchAll(url, options);
  };

  // Create RESTful resource helpers
  instance.resource = function(resourcePath) {
    return createResource(instance, resourcePath);
  };

  // Health check utility
  instance.healthCheck = function(endpoint) {
    return createHealthCheck(instance, endpoint);
  };

  // Polling utility
  instance.poll = function(url, options = {}) {
    const { 
      interval = 1000, 
      maxAttempts = 10, 
      condition = () => true,
      onUpdate,
      onError
    } = options;
    
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const poll = async () => {
        try {
          attempts++;
          const response = await instance.get(url, options.config);
          
          if (onUpdate) onUpdate(response, attempts);
          
          if (condition(response.data)) {
            resolve(response);
          } else if (attempts >= maxAttempts) {
            reject(new Error('Max polling attempts reached'));
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          if (onError) {
            const shouldContinue = onError(error, attempts);
            if (shouldContinue && attempts < maxAttempts) {
              setTimeout(poll, interval);
            } else {
              reject(error);
            }
          } else {
            reject(error);
          }
        }
      };
      
      poll();
    });
  };

  // Concurrent request limiter
  instance.concurrent = function(requests, limit = 5) {
    const queue = new RequestQueue(limit);
    return Promise.all(requests.map(req => queue.add(req)));
  };

  // Request with automatic retry and exponential backoff
  instance.retryRequest = function(config, options = {}) {
    const { 
      retries = 3, 
      baseDelay = 1000, 
      maxDelay = 30000,
      backoffFactor = 2 
    } = options;
    
    const makeRequest = async (attempt = 1) => {
      try {
        return await instance.request(config);
      } catch (error) {
        if (attempt >= retries) {
          throw error;
        }
        
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return makeRequest(attempt + 1);
      }
    };
    
    return makeRequest();
  };

  // Request with circuit breaker pattern
  instance.withCircuitBreaker = function(options = {}) {
    const { 
      failureThreshold = 5, 
      resetTimeout = 60000,
      monitoringPeriod = 60000 
    } = options;
    
    let failures = 0;
    let lastFailureTime = 0;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    
    const originalRequest = instance.request.bind(instance);
    
    instance.request = async function(config) {
      const now = Date.now();
      
      // Reset failures after monitoring period
      if (now - lastFailureTime > monitoringPeriod) {
        failures = 0;
      }
      
      // Check circuit breaker state
      if (state === 'OPEN') {
        if (now - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }
      
      try {
        const response = await originalRequest(config);
        
        // Reset on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return response;
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        if (failures >= failureThreshold) {
          state = 'OPEN';
        }
        
        throw error;
      }
    };
    
    return instance;
  };

  // Request deduplication
  instance.dedupe = function() {
    const pendingRequests = new Map();
    
    const originalRequest = instance.request.bind(instance);
    
    instance.request = function(config) {
      const key = JSON.stringify({
        method: config.method,
        url: config.url,
        params: config.params,
        data: config.data
      });
      
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      
      const request = originalRequest(config).finally(() => {
        pendingRequests.delete(key);
      });
      
      pendingRequests.set(key, request);
      return request;
    };
    
    return instance;
  };

  // Mock responses for testing
  instance.mock = function(mocks) {
    const originalAdapter = instance.defaults.adapter;
    
    instance.defaults.adapter = function(config) {
      const mockKey = `${config.method?.toUpperCase()} ${config.url}`;
      const mock = mocks[mockKey] || mocks[config.url];
      
      if (mock) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (mock.error) {
              reject(mock.error);
            } else {
              resolve({
                data: mock.data || mock,
                status: mock.status || 200,
                statusText: mock.statusText || 'OK',
                headers: mock.headers || {},
                config
              });
            }
          }, mock.delay || 0);
        });
      }
      
      return originalAdapter(config);
    };
    
    // Method to restore original adapter
    instance.unmock = function() {
      instance.defaults.adapter = originalAdapter;
    };
    
    return instance;
  };

  // REMOVAL METHODS

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
   * Configure common development setup with enhanced interceptor management
   */
  instance.setupDevelopment = function(options = {}) {
    // Setup common groups first
    instance.setupCommonGroups();
    
    // Enable development group
    instance.enableGroup('development');
    
    // Setup environment-specific interceptors
    instance.setupEnvironmentInterceptors();
    
    // Enable logging by default
    instance.useLogging({
      logRequests: true,
      logResponses: true,
      logErrors: true,
      ...options.logging
    });
    
    // Add retry for network issues
    instance.useRetry({
      retries: 3,
      retryDelay: 1000,
      ...options.retry
    });
    
    // Add upload progress tracking
    if (options.uploadProgress) {
      instance.useUploadProgress(options.uploadProgress);
    }
    
    // Add smart timeouts
    instance.useSmartTimeout({
      defaultTimeout: 10000,
      ...options.timeout
    });
    
    return instance;
  };

  /**
   * Configure common production setup with enhanced interceptor management
   */
  instance.setupProduction = function(options = {}) {
    // Setup common groups first
    instance.setupCommonGroups();
    
    // Enable production group
    instance.enableGroup('production');
    
    // Setup environment-specific interceptors
    instance.setupEnvironmentInterceptors();
    
    // Conservative retry settings
    instance.useRetry({
      retries: 2,
      retryDelay: 2000,
      ...options.retry
    });
    
    // Enable caching
    instance.useCache({
      maxAge: 300000, // 5 minutes
      ...options.cache
    });
    
    // Rate limiting
    instance.useRateLimit({
      maxRequests: 100,
      windowMs: 60000,
      ...options.rateLimit
    });
    
    // Smart timeouts
    instance.useSmartTimeout({
      defaultTimeout: 30000,
      ...options.timeout
    });
    
    // Error logging only
    instance.useLogging({
      logRequests: false,
      logResponses: false,
      logErrors: true,
      ...options.logging
    });
    
    return instance;
  };

  /**
   * Get current interceptor status (enhanced with manager info)
   */
  instance.getInterceptorStatus = function() {
    const basicStatus = {
      auth: interceptorIds.auth !== null,
      refreshToken: interceptorIds.refresh !== null,
      retry: interceptorIds.retry !== null,
      logging: interceptorIds.logging.request !== null || interceptorIds.logging.response !== null,
      uploadProgress: interceptorIds.upload.request !== null || interceptorIds.upload.response !== null,
      cache: interceptorIds.cache.request !== null || interceptorIds.cache.response !== null,
      smartTimeout: interceptorIds.timeout.request !== null || interceptorIds.timeout.response !== null,
      rateLimit: interceptorIds.rateLimit !== null
    };

    const managerStatus = interceptorManager.getStatus();
    
    return {
      ...basicStatus,
      interceptorManager: managerStatus
    };
  };

  /**
   * Get performance metrics
   */
  instance.getMetrics = function() {
    return {
      requestQueue: instance._queue ? {
        running: instance._queue.running,
        queued: instance._queue.queue.length
      } : null,
      interceptorManager: {
        groups: interceptorManager.getGroups().length,
        conditionalInterceptors: interceptorManager.getConditionalInterceptors().length
      }
    };
  };

  // Expose condition utilities for advanced users
  instance.InterceptorConditions = InterceptorConditions;
  instance.CommonConditions = CommonConditions;

  // Preserve original axios methods
  instance.request = instance.request.bind(instance);
  instance.get = instance.get.bind(instance);
  instance.delete = instance.delete.bind(instance);
  instance.head = instance.head.bind(instance);
  instance.options = instance.options.bind(instance);
  instance.post = instance.post.bind(instance);
  instance.put = instance.put.bind(instance);
  instance.patch = instance.patch.bind(instance);

  return instance;