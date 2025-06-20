/**
 * Attaches utility methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} utilities - Utility class instances
 * @param {Object} responseTransformers - Response transformer functions
 */
export function attachUtilityMethods(instance, utilities, responseTransformers) {
  /**
   * Execute multiple requests in parallel with individual error handling
   */
  instance.batch = function(requests) {
    return utilities.batchManager.batch(requests);
  };

  /**
   * Convenience wrapper for Promise.all with axios requests
   */
  instance.all = function(promises) {
    return Promise.all(promises);
  };

  /**
   * Convenience wrapper for Promise.race with axios requests
   */
  instance.race = function(promises) {
    return Promise.race(promises);
  };

  /**
   * Execute multiple requests with concurrency limit
   */
  instance.concurrent = async function(requests, limit = 5) {
    const results = [];
    const executing = [];
    
    for (const [index, request] of requests.entries()) {
      const promise = Promise.resolve().then(() => request()).then(
        result => ({ status: 'fulfilled', value: result, index }),
        error => ({ status: 'rejected', reason: error, index })
      );
      
      results[index] = promise;
      
      if (limit <= requests.length) {
        executing.push(promise);
        
        if (executing.length >= limit) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(p => p === promise), 1);
        }
      }
    }
    
    const resolvedResults = await Promise.all(results);
    return resolvedResults.sort((a, b) => a.index - b.index);
  };

  /**
   * Poll an endpoint until a condition is met
   */
  instance.poll = async function(config, options = {}) {
    const {
      interval = 1000,
      timeout = 30000,
      shouldStop = () => false,
      onProgress = () => {}
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await instance.request(config);
        
        if (shouldStop(response)) {
          return response;
        }
        
        onProgress(response);
        
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        if (options.stopOnError) {
          throw error;
        }
      }
    }
    
    throw new Error('Polling timeout exceeded');
  };

  /**
   * Create a request with a specific timeout
   */
  instance.requestWithTimeout = function(config, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return instance.request({
      ...config,
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
  };

  /**
   * Configure request queueing
   */
  instance.useQueue = function(maxConcurrent = 5) {
    const queue = utilities.requestQueue;
    queue.setMaxConcurrent(maxConcurrent);
    
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
   * Paginate through API results
   */
  instance.paginate = function(config, options = {}) {
    return utilities.paginationHelper.paginate(config, options);
  };

  /**
   * Paginate through all pages automatically
   */
  instance.paginateAll = async function(config, options = {}) {
    return utilities.paginationHelper.paginateAll(config, options);
  };

  /**
   * Cancel a request by ID
   */
  instance.cancel = function(requestId) {
    return utilities.cancellationManager.cancel(requestId);
  };

  /**
   * Cancel all pending requests
   */
  instance.cancelAll = function() {
    return utilities.cancellationManager.cancelAll();
  };

  /**
   * Create a cancellable request
   */
  instance.cancellable = function(config, requestId) {
    const source = utilities.cancellationManager.createSource(requestId);
    
    return {
      request: instance.request({
        ...config,
        cancelToken: source.token
      }),
      cancel: () => utilities.cancellationManager.cancel(requestId)
    };
  };

  /**
   * Handle errors with the error handler
   */
  instance.withErrorHandler = function(handler) {
    utilities.errorHandler.setHandler(handler);
    
    const errorInterceptorId = instance.interceptors.response.use(
      response => response,
      error => {
        utilities.errorHandler.handle(error);
        return Promise.reject(error);
      }
    );
    
    return instance;
  };
}