/**
 * Attaches setup and configuration methods to the axios instance
 * @param {Object} instance - The axios instance
 */
export function attachSetupMethods(instance) {
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
   * Setup common interceptor groups
   */
  instance.setupCommonGroups = function() {
    // Create predefined groups
    instance.createInterceptorGroup('api-calls', ['auth', 'retry', 'cache']);
    instance.createInterceptorGroup('development', ['logging', 'retry']);
    instance.createInterceptorGroup('production', ['auth', 'retry', 'cache', 'rateLimit']);
    instance.createInterceptorGroup('upload', ['auth', 'upload', 'retry']);
    
    return instance;
  };

  /**
   * Setup environment-specific interceptors
   */
  instance.setupEnvironmentInterceptors = function() {
    const env = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development';
    
    // Add conditional interceptors based on environment
    instance.addConditionalInterceptor('request', 
      (config) => env === 'development',
      (config) => {
        console.log('[DEV] Request:', config.method?.toUpperCase(), config.url);
        return config;
      }
    );
    
    instance.addConditionalInterceptor('response',
      (config) => env === 'production' && config.url?.includes('/api/'),
      (response) => {
        // Add production-specific response handling
        response.headers['x-processed-at'] = new Date().toISOString();
        return response;
      },
      (error) => {
        // Production error tracking
        if (typeof window !== 'undefined' && window.trackError) {
          window.trackError(error);
        }
        return Promise.reject(error);
      }
    );
    
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
    
    // Add request timeout
    if (options.timeout !== false) {
      instance.useSmartTimeout({
        timeout: 30000,
        ...options.timeout
      });
    }
    
    return instance;
  };

  /**
   * Configure common production setup
   */
  instance.setupProduction = function(options = {}) {
    // Setup common groups
    instance.setupCommonGroups();
    
    // Enable production group
    instance.enableGroup('production');
    
    // Setup environment-specific interceptors
    instance.setupEnvironmentInterceptors();
    
    // Configure authentication if provided
    if (options.auth) {
      instance.setupAuth(options.auth);
    }
    
    // Add retry with exponential backoff
    instance.useRetry({
      retries: 5,
      retryDelay: 1000,
      retryCondition: (error) => {
        return error.code === 'ECONNABORTED' || 
               error.response?.status >= 500 ||
               error.response?.status === 429;
      },
      ...options.retry
    });
    
    // Configure caching
    if (options.cache !== false) {
      instance.useCache({
        maxAge: 5 * 60 * 1000, // 5 minutes
        ...options.cache
      });
    }
    
    // Configure rate limiting
    if (options.rateLimit !== false) {
      instance.useRateLimit({
        maxRequests: 100,
        perMilliseconds: 60000, // 1 minute
        ...options.rateLimit
      });
    }
    
    // Add smart timeout
    instance.useSmartTimeout({
      timeout: 60000, // 1 minute
      ...options.timeout
    });
    
    return instance;
  };
}