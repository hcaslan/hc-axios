/**
 * Advanced interceptor management utilities
 */
export class InterceptorManager {
  constructor(instance) {
    this.instance = instance;
    this.groups = new Map();
    this.conditionalInterceptors = new Map();
    this.interceptorIds = new Map();
  }

  /**
   * Creates an interceptor group for easy management
   * @param {string} groupName - Name of the group
   * @param {string[]} interceptorNames - List of interceptor names in the group
   */
  createGroup(groupName, interceptorNames) {
    this.groups.set(groupName, {
      interceptors: interceptorNames,
      enabled: false
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

    group.interceptors.forEach(interceptorName => {
      this._enableInterceptor(interceptorName);
    });

    group.enabled = true;
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

    group.interceptors.forEach(interceptorName => {
      this._disableInterceptor(interceptorName);
    });

    group.enabled = false;
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
   * Setup conditional interceptors
   * @param {Object} config - Configuration for conditional interceptors
   */
  useConditionalInterceptors(config) {
    Object.entries(config).forEach(([interceptorName, options]) => {
      this.addConditionalInterceptor(interceptorName, options);
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

    this.conditionalInterceptors.set(interceptorName, {
      condition,
      config,
      enabled: false
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
      this._disableInterceptor(interceptorName);
      this.conditionalInterceptors.delete(interceptorName);
    }
    return this;
  }

  /**
   * Enable a specific interceptor
   * @param {string} interceptorName - Name of the interceptor
   */
  enableInterceptor(interceptorName) {
    this._enableInterceptor(interceptorName);
    return this;
  }

  /**
   * Disable a specific interceptor
   * @param {string} interceptorName - Name of the interceptor
   */
  disableInterceptor(interceptorName) {
    this._disableInterceptor(interceptorName);
    return this;
  }

  /**
   * Get the status of all interceptors and groups
   */
  getStatus() {
    const groupsStatus = {};
    for (const [groupName, group] of this.groups) {
      groupsStatus[groupName] = {
        enabled: group.enabled,
        interceptors: group.interceptors
      };
    }

    const conditionalStatus = {};
    for (const [interceptorName, interceptor] of this.conditionalInterceptors) {
      conditionalStatus[interceptorName] = {
        enabled: interceptor.enabled,
        hasCondition: true
      };
    }

    return {
      groups: groupsStatus,
      conditional: conditionalStatus,
      activeInterceptors: Array.from(this.interceptorIds.keys())
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
      this.disableGroup(groupName);
    }
    this.groups.clear();
    return this;
  }

  /**
   * Clear all conditional interceptors
   */
  clearConditionalInterceptors() {
    for (const interceptorName of this.conditionalInterceptors.keys()) {
      this.removeConditionalInterceptor(interceptorName);
    }
    return this;
  }

  // Private methods

  /**
   * Setup conditional interceptor wrapper
   * @private
   */
  _setupConditionalInterceptor(interceptorName, condition, config) {
    const originalMethod = this._getInterceptorMethod(interceptorName);
    if (!originalMethod) {
      console.warn(`Interceptor method for '${interceptorName}' not found`);
      return;
    }

    // Creates a wrapper that checks condition before applying interceptor
    const conditionalWrapper = (options = {}) => {
      const mergedOptions = { ...config, ...options };
      
      // Store original interceptor configuration
      const conditionalConfig = this.conditionalInterceptors.get(interceptorName);
      if (conditionalConfig) {
        conditionalConfig.originalMethod = originalMethod;
        conditionalConfig.options = mergedOptions;
      }

      return originalMethod.call(this.instance, mergedOptions);
    };

    // Replace the instance method temporarily
    this.instance[`_conditional_${interceptorName}`] = conditionalWrapper;
  }

  /**
   * Enable a specific interceptor
   * @private
   */
  _enableInterceptor(interceptorName) {
    // Check if it's a conditional interceptor
    const conditionalInterceptor = this.conditionalInterceptors.get(interceptorName);
    if (conditionalInterceptor && !conditionalInterceptor.enabled) {
      // Apply the interceptor with condition checking
      this._applyConditionalInterceptor(interceptorName, conditionalInterceptor);
      conditionalInterceptor.enabled = true;
      return;
    }

    // Handle regular interceptors
    const method = this._getInterceptorMethod(interceptorName);
    if (method && !this.interceptorIds.has(interceptorName)) {
      try {
        const result = method.call(this.instance, {});
        this.interceptorIds.set(interceptorName, result);
      } catch (error) {
        console.warn(`Failed to enable interceptor '${interceptorName}':`, error.message);
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
          console.warn(`Failed to disable interceptor '${interceptorName}':`, error.message);
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

    // Creates a conditional request interceptor
    const requestInterceptorId = this.instance.interceptors.request.use(
      (requestConfig) => {
        if (condition(requestConfig)) {
          // Apply the original interceptor logic based on type
          return this._applyInterceptorLogic(interceptorName, requestConfig, 'request');
        }
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    // Creates a conditional response interceptor if needed
    let responseInterceptorId = null;
    if (this._hasResponseLogic(interceptorName)) {
      responseInterceptorId = this.instance.interceptors.response.use(
        (response) => {
          if (condition(response.config)) {
            return this._applyInterceptorLogic(interceptorName, response, 'response');
          }
          return response;
        },
        (error) => {
          if (error.config && condition(error.config)) {
            return this._applyInterceptorLogic(interceptorName, error, 'error');
          }
          return Promise.reject(error);
        }
      );
    }

    // Store interceptor IDs for cleanup
    this.interceptorIds.set(interceptorName, {
      request: requestInterceptorId,
      response: responseInterceptorId
    });
  }

  /**
   * Remove conditional interceptor
   * @private
   */
  _removeConditionalInterceptor(interceptorName) {
    const interceptorIds = this.interceptorIds.get(interceptorName);
    if (interceptorIds) {
      if (interceptorIds.request !== null) {
        this.instance.interceptors.request.eject(interceptorIds.request);
      }
      if (interceptorIds.response !== null) {
        this.instance.interceptors.response.eject(interceptorIds.response);
      }
      this.interceptorIds.delete(interceptorName);
    }
  }

  /**
   * Get interceptor method by name
   * @private
   */
  _getInterceptorMethod(interceptorName) {
    const methodMap = {
      'auth': 'useAuth',
      'refreshToken': 'useRefreshToken',
      'retry': 'useRetry',
      'logging': 'useLogging',
      'uploadProgress': 'useUploadProgress',
      'cache': 'useCache',
      'smartTimeout': 'useSmartTimeout',
      'rateLimit': 'useRateLimit'
    };

    const methodName = methodMap[interceptorName];
    return methodName ? this.instance[methodName] : null;
  }

  /**
   * Get remove method by interceptor name
   * @private
   */
  _getRemoveMethod(interceptorName) {
    const methodMap = {
      'auth': 'removeAuth',
      'refreshToken': 'removeRefreshToken',
      'retry': 'removeRetry',
      'logging': 'removeLogging',
      'uploadProgress': 'removeUploadProgress',
      'cache': 'removeCache',
      'smartTimeout': 'removeSmartTimeout',
      'rateLimit': 'removeRateLimit'
    };

    const methodName = methodMap[interceptorName];
    return methodName ? this.instance[methodName] : null;
  }

  /**
   * Apply interceptor logic based on type
   * @private
   */
  _applyInterceptorLogic(interceptorName, data, type) {
    // This is a simplified version - in a real implementation,
    // you'd need specific logic for each interceptor type
    switch (interceptorName) {
      case 'auth':
        if (type === 'request') {
          // Apply auth logic conditionally
          const token = this._getAuthToken();
          if (token) {
            data.headers = data.headers || {};
            data.headers.Authorization = `Bearer ${token}`;
          }
        }
        break;
      case 'logging':
        if (type === 'request') {
          console.log('🚀 Conditional Request:', data.method?.toUpperCase(), data.url);
        } else if (type === 'response') {
          console.log('✅ Conditional Response:', data.status, data.config.url);
        }
        break;
      // Add more interceptor logic as needed
    }
    return data;
  }

  /**
   * Check if interceptor has response logic
   * @private
   */
  _hasResponseLogic(interceptorName) {
    const responseInterceptors = ['retry', 'logging', 'refreshToken', 'uploadProgress', 'cache'];
    return responseInterceptors.includes(interceptorName);
  }

  /**
   * Get auth token (placeholder - should integrate with actual auth system)
   * @private
   */
  _getAuthToken() {
    // This should integrate with your actual auth token retrieval
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }
}