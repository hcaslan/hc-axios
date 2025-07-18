/**
 * Enhanced interceptor management utilities with complete implementations
 */
export class InterceptorManager {
  constructor(instance) {
    this.instance = instance;
    this.groups = new Map();
    this.conditionalInterceptors = new Map();
    this.interceptorIds = new Map();
    this.conditionalInterceptorIds = new Map();
    this.errorHandler = this._createErrorHandler();
    this.interceptorConfig = new Map(); // Store original configurations
    this.cleanupCallbacks = new Set(); // For instance destruction cleanup
    
    // Dynamic interceptor registry
    this.interceptorRegistry = this._buildInterceptorRegistry();
    
    // Bind cleanup to instance if possible
    this._setupCleanup();
  }

  /**
   * Create error handler for interceptor operations
   * @private
   */
  _createErrorHandler() {
    return {
      handleConditionError: (error, interceptorName, config) => {
        console.warn(`[InterceptorManager] Condition evaluation failed for '${interceptorName}':`, error.message);
        console.debug('Config:', config);
        return false; // Safe default
      },
      
      handleInterceptorError: (error, interceptorName, operation) => {
        console.error(`[InterceptorManager] Interceptor '${interceptorName}' ${operation} failed:`, error.message);
        console.debug('Stack:', error.stack);
      },
      
      handleCleanupError: (error, resource) => {
        console.warn(`[InterceptorManager] Cleanup failed for ${resource}:`, error.message);
      }
    };
  }

  /**
   * Build dynamic interceptor registry
   * @private
   */
  _buildInterceptorRegistry() {
    return {
      // Basic interceptors
      auth: {
        method: 'useAuth',
        removeMethod: 'removeAuth',
        hasRequestLogic: true,
        hasResponseLogic: false,
        configurable: true
      },
      refreshToken: {
        method: 'useRefreshToken',
        removeMethod: 'removeRefreshToken',
        hasRequestLogic: false,
        hasResponseLogic: true,
        configurable: true
      },
      retry: {
        method: 'useRetry',
        removeMethod: 'removeRetry',
        hasRequestLogic: false,
        hasResponseLogic: true,
        configurable: true
      },
      logging: {
        method: 'useLogging',
        removeMethod: 'removeLogging',
        hasRequestLogic: true,
        hasResponseLogic: true,
        configurable: true
      },
      uploadProgress: {
        method: 'useUploadProgress',
        removeMethod: 'removeUploadProgress',
        hasRequestLogic: true,
        hasResponseLogic: true,
        configurable: true
      },
      cache: {
        method: 'useCache',
        removeMethod: 'removeCache',
        hasRequestLogic: true,
        hasResponseLogic: true,
        configurable: true
      },
      smartTimeout: {
        method: 'useSmartTimeout',
        removeMethod: 'removeSmartTimeout',
        hasRequestLogic: true,
        hasResponseLogic: true,
        configurable: true
      },
      rateLimit: {
        method: 'useRateLimit',
        removeMethod: 'removeRateLimit',
        hasRequestLogic: true,
        hasResponseLogic: false,
        configurable: true
      }
    };
  }

  /**
   * Setup cleanup mechanisms
   * @private
   */
  _setupCleanup() {
    // Store reference for cleanup
    if (this.instance && typeof this.instance.on === 'function') {
      // If instance supports events
      this.instance.on('destroy', () => this.cleanup());
    }
    
    // Add to global cleanup if in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    // Add to process cleanup if in Node.js
    if (typeof process !== 'undefined') {
      const cleanup = () => this.cleanup();
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  }

  /**
   * Creates an interceptor group for easy management
   * @param {string} groupName - Name of the group
   * @param {string[]} interceptorNames - List of interceptor names in the group
   */
  createGroup(groupName, interceptorNames) {
    // Validate interceptor names
    const invalidInterceptors = interceptorNames.filter(name => 
      !this.interceptorRegistry[name]
    );
    
    if (invalidInterceptors.length > 0) {
      throw new Error(
        `Invalid interceptors in group '${groupName}': ${invalidInterceptors.join(', ')}`
      );
    }
    
    this.groups.set(groupName, {
      interceptors: [...interceptorNames], // Clone array
      enabled: false,
      createdAt: new Date(),
      metadata: {
        totalInterceptors: interceptorNames.length,
        validInterceptors: interceptorNames.length
      }
    });
    
    return this;
  }

  /**
   * Enable an interceptor group
   * @param {string} groupName - Name of the group to enable
   */
  enableGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Interceptor group '${groupName}' not found`);
    }

    if (group.enabled) {
      console.warn(`[InterceptorManager] Group '${groupName}' is already enabled`);
      return this;
    }

    const enabledInterceptors = [];
    const failedInterceptors = [];

    group.interceptors.forEach(interceptorName => {
      try {
        this._enableInterceptor(interceptorName);
        enabledInterceptors.push(interceptorName);
      } catch (error) {
        failedInterceptors.push({ interceptorName, error: error.message });
        this.errorHandler.handleInterceptorError(error, interceptorName, 'enable');
      }
    });

    group.enabled = true;
    group.enabledAt = new Date();
    group.metadata = {
      ...group.metadata,
      enabledInterceptors: enabledInterceptors.length,
      failedInterceptors: failedInterceptors.length,
      lastFailures: failedInterceptors
    };

    if (failedInterceptors.length > 0) {
      console.warn(`[InterceptorManager] Group '${groupName}' partially enabled. Failed: ${failedInterceptors.map(f => f.interceptorName).join(', ')}`);
    }

    return this;
  }

  /**
   * Disable an interceptor group
   * @param {string} groupName - Name of the group to disable
   */
  disableGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Interceptor group '${groupName}' not found`);
    }

    if (!group.enabled) {
      console.warn(`[InterceptorManager] Group '${groupName}' is already disabled`);
      return this;
    }

    group.interceptors.forEach(interceptorName => {
      try {
        this._disableInterceptor(interceptorName);
      } catch (error) {
        this.errorHandler.handleInterceptorError(error, interceptorName, 'disable');
      }
    });

    group.enabled = false;
    group.disabledAt = new Date();
    return this;
  }

  /**
   * Toggle an interceptor group
   * @param {string} groupName - Name of the group to toggle
   */
  toggleGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Interceptor group '${groupName}' not found`);
    }

    if (group.enabled) {
      this.disableGroup(groupName);
    } else {
      this.enableGroup(groupName);
    }

    return this;
  }

  /**
   * Check if a group is enabled
   * @param {string} groupName - Name of the group
   * @returns {boolean} Whether the group is enabled
   */
  isGroupEnabled(groupName) {
    const group = this.groups.get(groupName);
    return group ? group.enabled : false;
  }

  /**
   * Get group configuration
   * @param {string} groupName - Name of the group
   * @returns {Object|null} Group configuration or null if not found
   */
  getGroupConfig(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      return null;
    }
    
    return {
      name: groupName,
      interceptors: [...group.interceptors],
      enabled: group.enabled,
      metadata: { ...group.metadata },
      createdAt: group.createdAt,
      enabledAt: group.enabledAt,
      disabledAt: group.disabledAt
    };
  }

  /**
   * Delete an interceptor group
   * @param {string} groupName - Name of the group to delete
   */
  deleteGroup(groupName) {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Interceptor group '${groupName}' not found`);
    }

    // Disable the group first if it's enabled
    if (group.enabled) {
      this.disableGroup(groupName);
    }

    this.groups.delete(groupName);
    return this;
  }

  /**
   * Setup conditional interceptors
   * @param {Object} config - Configuration for conditional interceptors
   */
  useConditionalInterceptors(config) {
    Object.entries(config).forEach(([interceptorName, options]) => {
      try {
        this.addConditionalInterceptor(interceptorName, options);
      } catch (error) {
        this.errorHandler.handleInterceptorError(error, interceptorName, 'setup conditional');
      }
    });
    return this;
  }

  /**
   * Add a conditional interceptor
   * @param {string} interceptorName - Name of the interceptor
   * @param {Object} options - Interceptor options with condition
   * @param {Function} options.condition - Function that returns boolean to determine if interceptor should run
   * @param {Object} [options.config] - Additional configuration for the interceptor
   */
  addConditionalInterceptor(interceptorName, options) {
    const { condition, config = {} } = options;

    if (typeof condition !== 'function') {
      throw new Error(`Condition for '${interceptorName}' must be a function`);
    }

    if (!this.interceptorRegistry[interceptorName]) {
      throw new Error(`Unknown interceptor '${interceptorName}'. Available: ${Object.keys(this.interceptorRegistry).join(', ')}`);
    }

    // Store the conditional interceptor configuration
    this.conditionalInterceptors.set(interceptorName, {
      condition,
      config,
      enabled: true, // Changed: conditional interceptors are enabled by default when added
      createdAt: new Date(),
      metadata: {
        activationCount: 0,
        lastActivated: null,
        errors: []
      }
    });

    // Setup the conditional wrapper
    this._setupConditionalInterceptor(interceptorName, condition, config);
    return this;
  }

  /**
   * Remove a conditional interceptor
   * @param {string} interceptorName - Name of the interceptor to remove
   */
  removeConditionalInterceptor(interceptorName) {
    const interceptor = this.conditionalInterceptors.get(interceptorName);
    if (interceptor) {
      try {
        this._removeConditionalInterceptor(interceptorName);
        this.conditionalInterceptors.delete(interceptorName);
      } catch (error) {
        this.errorHandler.handleInterceptorError(error, interceptorName, 'remove conditional');
      }
    }
    return this;
  }

  /**
   * Enable a specific interceptor
   * @param {string} interceptorName - Name of the interceptor
   */
  enableInterceptor(interceptorName) {
    try {
      this._enableInterceptor(interceptorName);
    } catch (error) {
      this.errorHandler.handleInterceptorError(error, interceptorName, 'enable');
      throw error;
    }
    return this;
  }

  /**
   * Disable a specific interceptor
   * @param {string} interceptorName - Name of the interceptor
   */
  disableInterceptor(interceptorName) {
    try {
      this._disableInterceptor(interceptorName);
    } catch (error) {
      this.errorHandler.handleInterceptorError(error, interceptorName, 'disable');
      throw error;
    }
    return this;
  }

  /**
   * Check if an interceptor is enabled
   * @param {string} interceptorName - Name of the interceptor
   * @returns {boolean} Whether the interceptor is enabled
   */
  isEnabled(interceptorName) {
    // Check regular interceptors
    if (this.interceptorIds.has(interceptorName)) {
      return true;
    }
    
    // Check conditional interceptors
    const conditionalInterceptor = this.conditionalInterceptors.get(interceptorName);
    return conditionalInterceptor ? conditionalInterceptor.enabled : false;
  }

  /**
   * Get the status of all interceptors and groups
   */
  getStatus() {
    const groupsStatus = {};
    for (const [groupName, group] of this.groups) {
      groupsStatus[groupName] = {
        enabled: group.enabled,
        interceptors: group.interceptors,
        metadata: group.metadata,
        createdAt: group.createdAt,
        enabledAt: group.enabledAt,
        disabledAt: group.disabledAt
      };
    }

    const conditionalStatus = {};
    for (const [interceptorName, interceptor] of this.conditionalInterceptors) {
      conditionalStatus[interceptorName] = {
        enabled: interceptor.enabled,
        hasCondition: true,
        metadata: interceptor.metadata,
        createdAt: interceptor.createdAt
      };
    }

    return {
      groups: groupsStatus,
      conditional: conditionalStatus,
      activeInterceptors: Array.from(this.interceptorIds.keys()),
      registry: Object.keys(this.interceptorRegistry),
      health: this._getHealthMetrics()
    };
  }

  /**
   * Get health metrics
   * @private
   */
  _getHealthMetrics() {
    const totalGroups = this.groups.size;
    const enabledGroups = Array.from(this.groups.values()).filter(g => g.enabled).length;
    const totalConditionals = this.conditionalInterceptors.size;
    const enabledConditionals = Array.from(this.conditionalInterceptors.values()).filter(i => i.enabled).length;
    
    return {
      groups: { total: totalGroups, enabled: enabledGroups },
      conditionals: { total: totalConditionals, enabled: enabledConditionals },
      interceptors: { active: this.interceptorIds.size },
      errors: {
        groups: Array.from(this.groups.values()).reduce((sum, g) => sum + (g.metadata?.failedInterceptors || 0), 0),
        conditionals: Array.from(this.conditionalInterceptors.values()).reduce((sum, i) => sum + (i.metadata?.errors?.length || 0), 0)
      }
    };
  }

  /**
   * Get list of available groups
   */
  getGroups() {
    return Array.from(this.groups.keys());
  }

  /**
   * Get list of conditional interceptors
   */
  getConditionalInterceptors() {
    return Array.from(this.conditionalInterceptors.keys());
  }

  /**
   * Clear all interceptor groups
   */
  clearGroups() {
    // Disable all groups first
    for (const groupName of this.groups.keys()) {
      try {
        this.disableGroup(groupName);
      } catch (error) {
        this.errorHandler.handleCleanupError(error, `group ${groupName}`);
      }
    }
    this.groups.clear();
    return this;
  }

  /**
   * Clear all conditional interceptors
   */
  clearConditionalInterceptors() {
    for (const interceptorName of this.conditionalInterceptors.keys()) {
      try {
        this.removeConditionalInterceptor(interceptorName);
      } catch (error) {
        this.errorHandler.handleCleanupError(error, `conditional interceptor ${interceptorName}`);
      }
    }
    return this;
  }

  /**
   * Complete cleanup
   */
  cleanup() {
    try {
      this.clearGroups();
      this.clearConditionalInterceptors();
      
      // Clear all stored IDs
      this.interceptorIds.clear();
      this.conditionalInterceptorIds.clear();
      this.interceptorConfig.clear();
      
      // Clear caches with proper cleanup
      if (this._cache) {
        this._cache.clear();
        this._cache = null;
      }
      
      // Clear rate limit tracking
      if (this._rateLimitRequests) {
        this._rateLimitRequests = [];
      }
      
      // Execute cleanup callbacks
      this.cleanupCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          this.errorHandler.handleCleanupError(error, 'cleanup callback');
        }
      });
      this.cleanupCallbacks.clear();
      
    } catch (error) {
      this.errorHandler.handleCleanupError(error, 'manager cleanup');
    }
  }

  /**
   * Add cleanup callback
   */
  onCleanup(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.add(callback);
    }
  }

  // Private methods

  /**
   * Setup conditional interceptor wrapper
   * @private
   */
  _setupConditionalInterceptor(interceptorName, condition, config) {
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    if (!interceptorInfo) {
      throw new Error(`Unknown interceptor '${interceptorName}'`);
    }

    // Apply conditional interceptor based on what logic it has
    this._applyConditionalInterceptor(interceptorName, { condition, config, enabled: true });
  }

  /**
   * Enable a specific interceptor
   * @private
   */
  _enableInterceptor(interceptorName) {
    // Check if it's a conditional interceptor
    const conditionalInterceptor = this.conditionalInterceptors.get(interceptorName);
    if (conditionalInterceptor && !conditionalInterceptor.enabled) {
      this._applyConditionalInterceptor(interceptorName, conditionalInterceptor);
      conditionalInterceptor.enabled = true;
      conditionalInterceptor.metadata.lastActivated = new Date();
      conditionalInterceptor.metadata.activationCount++;
      return;
    }

    // Handle regular interceptors
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    if (!interceptorInfo) {
      throw new Error(`Unknown interceptor '${interceptorName}'`);
    }

    const method = this._getInterceptorMethod(interceptorName);
    if (method && !this.interceptorIds.has(interceptorName)) {
      try {
        // Get stored config or use empty object
        const config = this.interceptorConfig.get(interceptorName) || {};
        const result = method.call(this.instance, config);
        this.interceptorIds.set(interceptorName, result);
      } catch (error) {
        throw new Error(`Failed to enable interceptor '${interceptorName}': ${error.message}`);
      }
    }
  }

  /**
   * Disable a specific interceptor
   * @private
   */
  _disableInterceptor(interceptorName) {
    // Handle conditional interceptors
    const conditionalInterceptor = this.conditionalInterceptors.get(interceptorName);
    if (conditionalInterceptor && conditionalInterceptor.enabled) {
      this._removeConditionalInterceptor(interceptorName);
      conditionalInterceptor.enabled = false;
      return;
    }

    // Handle regular interceptors
    const interceptorId = this.interceptorIds.get(interceptorName);
    if (interceptorId !== undefined) {
      const removeMethod = this._getRemoveMethod(interceptorName);
      if (removeMethod) {
        try {
          removeMethod.call(this.instance);
          this.interceptorIds.delete(interceptorName);
        } catch (error) {
          throw new Error(`Failed to disable interceptor '${interceptorName}': ${error.message}`);
        }
      }
    }
  }

  /**
   * Apply conditional interceptor with condition checking
   * @private
   */
  _applyConditionalInterceptor(interceptorName, conditionalInterceptor) {
    const { condition, config } = conditionalInterceptor;
    const interceptorInfo = this.interceptorRegistry[interceptorName];

    let requestInterceptorId = null;
    let responseInterceptorId = null;

    // Setup request interceptor if needed
    if (interceptorInfo.hasRequestLogic) {
      requestInterceptorId = this.instance.interceptors.request.use(
        (requestConfig) => {
          try {
            if (condition(requestConfig)) {
              return this._applyInterceptorLogic(interceptorName, requestConfig, 'request', config);
            }
          } catch (error) {
            const shouldApply = this.errorHandler.handleConditionError(error, interceptorName, requestConfig);
            if (shouldApply) {
              return this._applyInterceptorLogic(interceptorName, requestConfig, 'request', config);
            }
          }
          return requestConfig;
        },
        (error) => {
          try {
            if (error.config && condition(error.config)) {
              return this._applyInterceptorLogic(interceptorName, error, 'requestError', config);
            }
          } catch (condError) {
            this.errorHandler.handleConditionError(condError, interceptorName, error.config);
          }
          return Promise.reject(error);
        }
      );
    }

    // Setup response interceptor if needed
    if (interceptorInfo.hasResponseLogic) {
      responseInterceptorId = this.instance.interceptors.response.use(
        (response) => {
          try {
            if (condition(response.config)) {
              return this._applyInterceptorLogic(interceptorName, response, 'response', config);
            }
          } catch (error) {
            const shouldApply = this.errorHandler.handleConditionError(error, interceptorName, response.config);
            if (shouldApply) {
              return this._applyInterceptorLogic(interceptorName, response, 'response', config);
            }
          }
          return response;
        },
        (error) => {
          try {
            if (error.config && condition(error.config)) {
              return this._applyInterceptorLogic(interceptorName, error, 'responseError', config);
            }
          } catch (condError) {
            this.errorHandler.handleConditionError(condError, interceptorName, error.config);
          }
          return Promise.reject(error);
        }
      );
    }

    // Store interceptor IDs for cleanup
    this.conditionalInterceptorIds.set(interceptorName, {
      request: requestInterceptorId,
      response: responseInterceptorId
    });
  }

  /**
   * Remove conditional interceptor
   * @private
   */
  _removeConditionalInterceptor(interceptorName) {
    const interceptorIds = this.conditionalInterceptorIds.get(interceptorName);
    if (interceptorIds) {
      if (interceptorIds.request !== null) {
        this.instance.interceptors.request.eject(interceptorIds.request);
      }
      if (interceptorIds.response !== null) {
        this.instance.interceptors.response.eject(interceptorIds.response);
      }
      this.conditionalInterceptorIds.delete(interceptorName);
    }
  }

  /**
   * Get interceptor method by name
   * @private
   */
  _getInterceptorMethod(interceptorName) {
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    const methodName = interceptorInfo?.method;
    return methodName && this.instance[methodName] ? this.instance[methodName] : null;
  }

  /**
   * Get remove method by interceptor name
   * @private
   */
  _getRemoveMethod(interceptorName) {
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    const methodName = interceptorInfo?.removeMethod;
    return methodName && this.instance[methodName] ? this.instance[methodName] : null;
  }

  /**
   * Apply interceptor logic based on type - COMPLETE IMPLEMENTATION
   * @private
   */
  _applyInterceptorLogic(interceptorName, data, type, config = {}) {
    const conditionalConfig = this.conditionalInterceptors.get(interceptorName);
    
    try {
      switch (interceptorName) {
        case 'auth':
          return this._applyAuthLogic(data, type, config);
          
        case 'logging':
          return this._applyLoggingLogic(data, type, config);
          
        case 'retry':
          return this._applyRetryLogic(data, type, config);
          
        case 'cache':
          return this._applyCacheLogic(data, type, config);
          
        case 'uploadProgress':
          return this._applyUploadProgressLogic(data, type, config);
          
        case 'smartTimeout':
          return this._applyTimeoutLogic(data, type, config);
          
        case 'rateLimit':
          return this._applyRateLimitLogic(data, type, config);
          
        case 'refreshToken':
          return this._applyRefreshTokenLogic(data, type, config);
          
        default:
          console.warn(`[InterceptorManager] No logic implementation for '${interceptorName}'`);
          return type === 'responseError' || type === 'requestError' ? Promise.reject(data) : data;
      }
    } catch (error) {
      if (conditionalConfig) {
        conditionalConfig.metadata.errors.push({
          error: error.message,
          timestamp: new Date(),
          type,
          config: { ...config }
        });
      }
      
      this.errorHandler.handleInterceptorError(error, interceptorName, `apply ${type} logic`);
      return type === 'responseError' || type === 'requestError' ? Promise.reject(data) : data;
    }
  }

  /**
   * Apply auth interceptor logic
   * @private
   */
  _applyAuthLogic(data, type, config) {
    if (type === 'request') {
      const token = this._getAuthToken(config);
      if (token) {
        data.headers = data.headers || {};
        data.headers.Authorization = `Bearer ${token}`;
      }
    }
    return data;
  }

  /**
   * Apply logging interceptor logic
   * @private
   */
  _applyLoggingLogic(data, type, config) {
    const logger = config.logger || console;
    
    switch (type) {
      case 'request':
        if (config.logRequests !== false) {
          logger.log('🚀 Conditional Request:', {
            method: data.method?.toUpperCase(),
            url: data.url,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'response':
        if (config.logResponses !== false) {
          logger.log('✅ Conditional Response:', {
            status: data.status,
            url: data.config?.url,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'responseError':
        if (config.logErrors !== false) {
          logger.error('❌ Conditional Error:', {
            status: data.response?.status,
            message: data.message,
            url: data.config?.url,
            timestamp: new Date().toISOString()
          });
        }
        break;
    }
    return data;
  }

  /**
   * Apply retry interceptor logic
   * @private
   */
  _applyRetryLogic(data, type, config) {
    if (type === 'responseError') {
      const retryConfig = data.config;
      const retries = config.retries || 3;
      const retryDelay = config.retryDelay || 1000;
      
      // Initialize retry count
      if (!retryConfig.__retryCount) {
        retryConfig.__retryCount = 0;
      }
      
      // Check if we should retry
      const shouldRetry = this._shouldRetry(data, config);
      if (shouldRetry && retryConfig.__retryCount < retries) {
        retryConfig.__retryCount += 1;
        
        const delay = typeof retryDelay === 'function' 
          ? retryDelay(retryConfig.__retryCount)
          : retryDelay;
        
        // Return a promise that retries after delay
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.instance(retryConfig).then(resolve).catch(reject);
          }, delay);
        });
      }
    }
    return Promise.reject(data);
  }

  /**
   * Apply cache interceptor logic
   * @private
   */
  _applyCacheLogic(data, type, config) {
    if (type === 'request' && data.method?.toLowerCase() === 'get') {
      const cacheKey = this._generateCacheKey(data, config);
      const cached = this._getCachedResponse(cacheKey, config);
      
      if (cached) {
        // Modify config to return cached response
        data.adapter = () => Promise.resolve(cached);
      }
    } else if (type === 'response' && data.config?.method?.toLowerCase() === 'get') {
      const cacheKey = this._generateCacheKey(data.config, config);
      this._setCachedResponse(cacheKey, data, config);
    }
    return data;
  }

  /**
   * Apply upload progress interceptor logic
   * @private
   */
  _applyUploadProgressLogic(data, type, config) {
    if (type === 'request' && data.data instanceof FormData) {
      if (config.onStart) {
        config.onStart(data);
      }
      
      // Add upload progress tracking
      data.onUploadProgress = (progressEvent) => {
        if (config.onProgress && progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const uploadInfo = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: percentCompleted,
            speed: progressEvent.loaded / ((Date.now() - (data.uploadStartTime || Date.now())) / 1000),
            remaining: progressEvent.total - progressEvent.loaded
          };
          config.onProgress(uploadInfo, data);
        }
      };
      
      data.uploadStartTime = Date.now();
    } else if (type === 'response' && data.config?.data instanceof FormData) {
      if (config.onComplete) {
        const duration = Date.now() - (data.config.uploadStartTime || Date.now());
        config.onComplete(data, duration);
      }
    }
    return data;
  }

  /**
   * Apply timeout interceptor logic
   * @private
   */
  _applyTimeoutLogic(data, type, config) {
    if (type === 'request' && !data.timeout) {
      const url = data.url || '';
      const method = data.method?.toUpperCase() || 'GET';
      const endpointKey = `${method} ${url}`;
      
      const endpointTimeouts = config.endpointTimeouts || {};
      const defaultTimeout = config.defaultTimeout || 5000;
      
      data.timeout = endpointTimeouts[endpointKey] || 
                    endpointTimeouts[url] || 
                    defaultTimeout;
    }
    return data;
  }

  /**
   * Apply rate limit interceptor logic with improved cleanup
   * @private
   */
  _applyRateLimitLogic(data, type, config) {
    if (type === 'request') {
      const now = Date.now();
      const windowMs = config.windowMs || 60000;
      const maxRequests = config.maxRequests || 100;
      
      // Get or create request tracking for this interceptor
      if (!this._rateLimitRequests) {
        this._rateLimitRequests = [];
      }
      
      // Remove old requests outside the window (improved cleanup)
      this._rateLimitRequests = this._rateLimitRequests.filter(
        timestamp => now - timestamp <= windowMs
      );
      
      // Check if rate limit exceeded
      if (this._rateLimitRequests.length >= maxRequests) {
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.config = data;
        
        if (config.onLimit) {
          config.onLimit(error, data);
        }
        
        return Promise.reject(error);
      }
      
      // Add current request timestamp
      this._rateLimitRequests.push(now);
      
      // Schedule cleanup if list gets too large
      if (this._rateLimitRequests.length > maxRequests * 2) {
        setTimeout(() => {
          if (this._rateLimitRequests) {
            const currentTime = Date.now();
            this._rateLimitRequests = this._rateLimitRequests.filter(
              timestamp => currentTime - timestamp <= windowMs
            );
          }
        }, windowMs);
      }
    }
    return data;
  }

  /**
   * Apply refresh token interceptor logic
   * @private
   */
  _applyRefreshTokenLogic(data, type, config) {
    if (type === 'responseError' && data.response?.status === 401) {
      const originalRequest = data.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Attempt to refresh token
        const refreshToken = config.getRefreshToken ? config.getRefreshToken() : null;
        
        if (refreshToken) {
          const refreshConfig = config.refreshRequestConfig 
            ? config.refreshRequestConfig(refreshToken)
            : { method: 'post', url: config.refreshUrl, data: { refreshToken } };
            
          return this.instance.request(refreshConfig)
            .then((response) => {
              const tokenData = config.handleRefreshResponse 
                ? config.handleRefreshResponse(response)
                : response.data;
                
              if (config.setAccessToken) {
                config.setAccessToken(tokenData.token);
              }
              if (config.setRefreshToken && tokenData.refreshToken) {
                config.setRefreshToken(tokenData.refreshToken);
              }
              
              // Update authorization header and retry
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${tokenData.token}`;
              
              return this.instance(originalRequest);
            })
            .catch((error) => {
              if (config.onRefreshTokenFail) {
                config.onRefreshTokenFail();
              }
              return Promise.reject(error);
            });
        } else if (config.onRefreshTokenFail) {
          config.onRefreshTokenFail();
        }
      }
    }
    return Promise.reject(data);
  }

  // Helper methods for interceptor logic

  /**
   * Get auth token (integrates with actual auth system)
   * @private
   */
  _getAuthToken(config) {
    // Check if config has a token getter
    if (config.getToken && typeof config.getToken === 'function') {
      return config.getToken();
    }
    
    // Try multiple sources for auth token
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) return token;
    }
    
    // Check if there's a global token getter
    if (typeof global !== 'undefined' && global.getAuthToken) {
      return global.getAuthToken();
    }
    
    return null;
  }

  /**
   * Determine if request should be retried
   * @private
   */
  _shouldRetry(error, config) {
    const defaultCondition = (error) => {
      // Network errors
      if (!error.response) return true;
      
      // Server errors (5xx)
      if (error.response.status >= 500 && error.response.status <= 599) return true;
      
      // Rate limiting (429)
      if (error.response.status === 429) return true;
      
      // Request timeout (408)
      if (error.response.status === 408) return true;
      
      return false;
    };
    
    const retryCondition = config.retryCondition || defaultCondition;
    
    try {
      return retryCondition(error);
    } catch (conditionError) {
      this.errorHandler.handleConditionError(conditionError, 'retry', error.config);
      return false;
    }
  }

  /**
   * Generate cache key for request
   * @private
   */
  _generateCacheKey(requestConfig, config) {
    const defaultGenerator = (config) => {
      const method = config.method || 'get';
      const url = config.url || '';
      const params = JSON.stringify(config.params || {});
      return `${method}:${url}:${params}`;
    };
    
    const keyGenerator = config.keyGenerator || defaultGenerator;
    
    try {
      return keyGenerator(requestConfig);
    } catch (error) {
      this.errorHandler.handleConditionError(error, 'cache-key-generation', requestConfig);
      return defaultGenerator(requestConfig);
    }
  }

  /**
   * Get cached response with automatic cleanup
   * @private
   */
  _getCachedResponse(cacheKey, config) {
    if (!this._cache) {
      this._cache = new Map();
      this._setupCacheCleanup();
    }
    
    const cached = this._cache.get(cacheKey);
    const maxAge = config.maxAge || 300000; // 5 minutes default
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.response;
    }
    
    // Clean expired entry
    if (cached) {
      this._cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Set cached response with size management
   * @private
   */
  _setCachedResponse(cacheKey, response, config) {
    if (!this._cache) {
      this._cache = new Map();
      this._setupCacheCleanup();
    }
    
    const maxSize = config.maxSize || 100;
    
    // Clean up if cache is full
    if (this._cache.size >= maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    
    this._cache.set(cacheKey, {
      response: {
        ...response,
        cached: true
      },
      timestamp: Date.now()
    });
  }

  /**
   * Setup automatic cache cleanup
   * @private
   */
  _setupCacheCleanup() {
    if (this._cacheCleanupInterval) return;
    
    // Run cleanup every 5 minutes
    this._cacheCleanupInterval = setInterval(() => {
      if (!this._cache || this._cache.size === 0) return;
      
      const now = Date.now();
      const maxAge = 300000; // 5 minutes
      
      for (const [key, value] of this._cache.entries()) {
        if (now - value.timestamp > maxAge) {
          this._cache.delete(key);
        }
      }
    }, 300000);
    
    // Add to cleanup callbacks
    this.onCleanup(() => {
      if (this._cacheCleanupInterval) {
        clearInterval(this._cacheCleanupInterval);
        this._cacheCleanupInterval = null;
      }
    });
  }

  /**
   * Validate interceptor exists and is properly configured
   * @param {string} interceptorName - Name of interceptor to validate
   * @returns {boolean} Whether interceptor is valid
   */
  validateInterceptor(interceptorName) {
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    
    if (!interceptorInfo) {
      return false;
    }
    
    // Check if methods exist on instance
    const method = this.instance[interceptorInfo.method];
    const removeMethod = this.instance[interceptorInfo.removeMethod];
    
    return typeof method === 'function' && typeof removeMethod === 'function';
  }

  /**
   * Get detailed interceptor information
   * @param {string} interceptorName - Name of interceptor
   * @returns {Object} Detailed interceptor info
   */
  getInterceptorInfo(interceptorName) {
    const interceptorInfo = this.interceptorRegistry[interceptorName];
    const isValid = this.validateInterceptor(interceptorName);
    const isActive = this.interceptorIds.has(interceptorName);
    const isConditional = this.conditionalInterceptors.has(interceptorName);
    
    return {
      name: interceptorName,
      exists: !!interceptorInfo,
      valid: isValid,
      active: isActive,
      conditional: isConditional,
      info: interceptorInfo,
      conditionalConfig: isConditional ? this.conditionalInterceptors.get(interceptorName) : null
    };
  }

  /**
   * Bulk operations for interceptors
   */
  bulkEnable(interceptorNames) {
    const results = {
      success: [],
      failed: []
    };
    
    interceptorNames.forEach(name => {
      try {
        this.enableInterceptor(name);
        results.success.push(name);
      } catch (error) {
        results.failed.push({ name, error: error.message });
      }
    });
    
    return results;
  }

  bulkDisable(interceptorNames) {
    const results = {
      success: [],
      failed: []
    };
    
    interceptorNames.forEach(name => {
      try {
        this.disableInterceptor(name);
        results.success.push(name);
      } catch (error) {
        results.failed.push({ name, error: error.message });
      }
    });
    
    return results;
  }

  /**
   * Export current configuration for backup/restore
   */
  exportConfiguration() {
    const config = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      groups: {},
      conditionalInterceptors: {},
      interceptorConfig: {}
    };
    
    // Export groups
    for (const [name, group] of this.groups) {
      config.groups[name] = {
        interceptors: group.interceptors,
        enabled: group.enabled
      };
    }
    
    // Export conditional interceptors (without functions)
    for (const [name, interceptor] of this.conditionalInterceptors) {
      config.conditionalInterceptors[name] = {
        config: interceptor.config,
        enabled: interceptor.enabled,
        // Note: condition functions cannot be serialized
        hasCondition: true
      };
    }
    
    // Export stored configurations
    for (const [name, conf] of this.interceptorConfig) {
      config.interceptorConfig[name] = conf;
    }
    
    return config;
  }

  /**
   * Import configuration (partial restore)
   */
  importConfiguration(config, options = {}) {
    const { 
      restoreGroups = true, 
      restoreInterceptorConfig = true,
      clearExisting = false 
    } = options;
    
    try {
      if (clearExisting) {
        this.cleanup();
      }
      
      // Restore groups
      if (restoreGroups && config.groups) {
        Object.entries(config.groups).forEach(([name, groupConfig]) => {
          try {
            this.createGroup(name, groupConfig.interceptors);
            if (groupConfig.enabled) {
              this.enableGroup(name);
            }
          } catch (error) {
            this.errorHandler.handleCleanupError(error, `restore group ${name}`);
          }
        });
      }
      
      // Restore interceptor configurations
      if (restoreInterceptorConfig && config.interceptorConfig) {
        Object.entries(config.interceptorConfig).forEach(([name, conf]) => {
          this.interceptorConfig.set(name, conf);
        });
      }
      
      // Note: Conditional interceptors with condition functions cannot be fully restored
      // They need to be re-added with their condition functions
      
      return { success: true };
      
    } catch (error) {
      this.errorHandler.handleCleanupError(error, 'import configuration');
      return { success: false, error: error.message };
    }
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics() {
    const now = Date.now();
    
    return {
      groups: {
        total: this.groups.size,
        enabled: Array.from(this.groups.values()).filter(g => g.enabled).length,
        averageInterceptorsPerGroup: this.groups.size > 0 
          ? Array.from(this.groups.values()).reduce((sum, g) => sum + g.interceptors.length, 0) / this.groups.size 
          : 0
      },
      conditionals: {
        total: this.conditionalInterceptors.size,
        enabled: Array.from(this.conditionalInterceptors.values()).filter(i => i.enabled).length,
        totalActivations: Array.from(this.conditionalInterceptors.values())
          .reduce((sum, i) => sum + i.metadata.activationCount, 0),
        totalErrors: Array.from(this.conditionalInterceptors.values())
          .reduce((sum, i) => sum + i.metadata.errors.length, 0)
      },
      memory: {
        interceptorIds: this.interceptorIds.size,
        conditionalIds: this.conditionalInterceptorIds.size,
        cachedResponses: this._cache ? this._cache.size : 0,
        rateLimitEntries: this._rateLimitRequests ? this._rateLimitRequests.length : 0
      },
      health: this._getHealthMetrics()
    };
  }

  /**
   * Debug information
   */
  getDebugInfo() {
    return {
      instance: {
        hasInstance: !!this.instance,
        interceptors: {
          request: this.instance?.interceptors?.request?.handlers?.length || 0,
          response: this.instance?.interceptors?.response?.handlers?.length || 0
        }
      },
      registry: this.interceptorRegistry,
      activeInterceptors: Array.from(this.interceptorIds.keys()),
      conditionalInterceptors: Array.from(this.conditionalInterceptors.keys()),
      groups: Array.from(this.groups.keys()),
      performance: this.getPerformanceMetrics(),
      errorCounts: {
        groups: Array.from(this.groups.values())
          .reduce((sum, g) => sum + (g.metadata?.failedInterceptors || 0), 0),
        conditionals: Array.from(this.conditionalInterceptors.values())
          .reduce((sum, i) => sum + i.metadata.errors.length, 0)
      }
    };
  }
}