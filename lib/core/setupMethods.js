/**
 * Attaches setup and configuration methods to the axios instance
 * @param {Object} instance - The axios instance
 */
export function attachSetupMethods(instance) {
  /**
   * Quick configuration helper for common auth setup
   */
  instance.setupAuth = function(authConfig) {
    // Add null check for authConfig
    if (!authConfig) {
      return instance;
    }
    
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
    try {
      // Create predefined groups
      instance.createInterceptorGroup('api-calls', ['auth', 'retry', 'cache']);
      instance.createInterceptorGroup('development', ['logging', 'retry']);
      instance.createInterceptorGroup('production', ['auth', 'retry', 'cache', 'rateLimit']);
      instance.createInterceptorGroup('upload', ['auth', 'upload', 'retry']);
    } catch (error) {
      // Handle group creation errors gracefully
      console.warn('Error creating interceptor groups:', error.message);
    }
    
    return instance;
  };

  /**
   * Setup environment-specific interceptors
   */
  instance.setupEnvironmentInterceptors = function() {
    const env = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development';
    
    try {
      // Add conditional interceptors based on environment
      instance.addConditionalInterceptor('request', 
        (config) => env === 'development',
        (config) => {
          console.log('[DEV] Request:', config.method?.toUpperCase(), config.url);
          return config;
        }
      );
      
      // Updated production condition to exclude public routes
      instance.addConditionalInterceptor('response',
        (config) => {
          if (env !== 'production') return false;
          if (!config.url) return false;
          
          // Check if it's an API call but not a public route
          const isApiCall = config.url.includes('/api/');
          const isPublicRoute = config.url.includes('/api/public/') || 
                               config.url.includes('/public/') || 
                               config.url === '/health';
          
          return isApiCall && !isPublicRoute;
        },
        (response) => {
          // Add production-specific response handling with null check
          if (!response.headers) {
            response.headers = {};
          }
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
    } catch (error) {
      // Handle interceptor setup errors gracefully
      console.warn('Error setting up environment interceptors:', error.message);
    }
    
    return instance;
  };

  /**
   * Configure common development setup with enhanced interceptor management
   */
  instance.setupDevelopment = function(options = {}) {
    // Setup common groups
    instance.setupCommonGroups();
    
    // Enable development group
    instance.enableGroup('development');
    
    // Add environment-specific interceptors
    instance.setupEnvironmentInterceptors();
    
    // Setup logging with defaults
    const loggingOptions = {
      logRequests: true,
      logResponses: true,
      logErrors: true,
      ...options.logging
    };
    instance.useLogging(loggingOptions);
    
    // Setup retry with defaults
    const retryOptions = {
      retries: 3,
      retryDelay: 1000,
      ...options.retry
    };
    instance.useRetry(retryOptions);
    
    // Setup timeout unless disabled
    if (options.timeout !== false) {
      const timeoutOptions = {
        timeout: 30000,
        ...options.timeout
      };
      instance.useSmartTimeout(timeoutOptions);
    }
    
    return instance;
  };

  /**
   * Configure production-ready setup
   */
  instance.setupProduction = function(options = {}) {
    // Setup common groups
    instance.setupCommonGroups();
    
    // Enable production group
    instance.enableGroup('production');
    
    // Add environment-specific interceptors
    instance.setupEnvironmentInterceptors();
    
    // Setup auth if provided
    if (options.auth) {
      instance.setupAuth(options.auth);
    }
    
    // Setup retry with production defaults
    const retryOptions = {
      retries: 5,
      retryDelay: 1000,
      retryCondition: (error) => {
        // Retry on network errors
        if (error.code === 'ECONNABORTED') return true;
        
        // Retry on server errors (500+) and rate limits (429)
        if (error.response) {
          const status = error.response.status;
          return status >= 500 || status === 429;
        }
        
        return false;
      },
      ...options.retry
    };
    instance.useRetry(retryOptions);
    
    // Setup cache unless disabled
    if (options.cache !== false) {
      const cacheOptions = {
        maxAge: 5 * 60 * 1000, // 5 minutes
        ...options.cache
      };
      instance.useCache(cacheOptions);
    }
    
    // Setup rate limiting unless disabled
    if (options.rateLimit !== false) {
      const rateLimitOptions = {
        maxRequests: 100,
        perMilliseconds: 60000,
        ...options.rateLimit
      };
      instance.useRateLimit(rateLimitOptions);
    }
    
    // Setup timeout
    const timeoutOptions = {
      timeout: 60000,
      ...options.timeout
    };
    instance.useSmartTimeout(timeoutOptions);
    
    return instance;
  };
}