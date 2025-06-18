/**
 * Common condition functions for interceptors
 */
export class InterceptorConditions {
  /**
   * Condition based on URL patterns
   * @param {string|RegExp|string[]} patterns - URL patterns to match
   * @returns {Function} Condition function
   */
  static urlMatches(patterns) {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    
    return (config) => {
      const url = config.url || '';
      return patternArray.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(url);
        }
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        return false;
      });
    };
  }

  /**
   * Condition based on HTTP methods
   * @param {string|string[]} methods - HTTP methods to match
   * @returns {Function} Condition function
   */
  static methodMatches(methods) {
    const methodArray = Array.isArray(methods) ? methods : [methods];
    const normalizedMethods = methodArray.map(m => m.toLowerCase());
    
    return (config) => {
      const method = (config.method || 'get').toLowerCase();
      return normalizedMethods.includes(method);
    };
  }

  /**
   * Condition based on environment
   * @param {string|string[]} environments - Environment names to match
   * @returns {Function} Condition function
   */
  static environmentMatches(environments) {
    const envArray = Array.isArray(environments) ? environments : [environments];
    
    return () => {
      const currentEnv = process.env.NODE_ENV || 'development';
      return envArray.includes(currentEnv);
    };
  }

  /**
   * Condition based on request headers
   * @param {Object} headerConditions - Header conditions to check
   * @returns {Function} Condition function
   */
  static headerMatches(headerConditions) {
    return (config) => {
      const headers = config.headers || {};
      
      return Object.entries(headerConditions).every(([headerName, expectedValue]) => {
        const actualValue = headers[headerName];
        
        if (expectedValue instanceof RegExp) {
          return expectedValue.test(actualValue);
        }
        
        if (typeof expectedValue === 'function') {
          return expectedValue(actualValue);
        }
        
        return actualValue === expectedValue;
      });
    };
  }

  /**
   * Condition based on request data presence
   * @param {string|string[]} dataKeys - Data keys to check for
   * @returns {Function} Condition function
   */
  static hasDataKeys(dataKeys) {
    const keyArray = Array.isArray(dataKeys) ? dataKeys : [dataKeys];
    
    return (config) => {
      const data = config.data || {};
      
      if (data instanceof FormData) {
        return keyArray.some(key => data.has(key));
      }
      
      if (typeof data === 'object') {
        return keyArray.some(key => data.hasOwnProperty(key));
      }
      
      return false;
    };
  }

  /**
   * Condition based on time of day
   * @param {Object} timeRange - Time range object
   * @param {number} timeRange.start - Start hour (0-23)
   * @param {number} timeRange.end - End hour (0-23)
   * @returns {Function} Condition function
   */
  static timeRange(timeRange) {
    const { start, end } = timeRange;
    
    return () => {
      const currentHour = new Date().getHours();
      
      if (start <= end) {
        return currentHour >= start && currentHour <= end;
      } else {
        // Handle overnight ranges (e.g., 22:00 to 06:00)
        return currentHour >= start || currentHour <= end;
      }
    };
  }

  /**
   * Condition based on user authentication status
   * @param {Function} [getAuthStatus] - Custom function to get auth status
   * @returns {Function} Condition function
   */
  static isAuthenticated(getAuthStatus) {
    const defaultGetAuthStatus = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return !!localStorage.getItem('accessToken');
      }
      return false;
    };
    
    const authChecker = getAuthStatus || defaultGetAuthStatus;
    
    return () => authChecker();
  }

  /**
   * Condition based on network connectivity
   * @returns {Function} Condition function
   */
  static isOnline() {
    return () => {
      if (typeof navigator !== 'undefined') {
        return navigator.onLine;
      }
      return true; // Assume online in non-browser environments
    };
  }

  /**
   * Condition for file upload requests
   * @returns {Function} Condition function
   */
  static isFileUpload() {
    return (config) => {
      const data = config.data;
      return data instanceof FormData || 
             (config.headers && 
              config.headers['Content-Type'] && 
              config.headers['Content-Type'].includes('multipart/form-data'));
    };
  }

  /**
   * Condition based on request size
   * @param {number} maxSize - Maximum size in bytes
   * @returns {Function} Condition function
   */
  static requestSizeBelow(maxSize) {
    return (config) => {
      const data = config.data;
      
      if (!data) return true;
      
      if (typeof data === 'string') {
        return new Blob([data]).size <= maxSize;
      }
      
      if (data instanceof FormData) {
        // Approximate size for FormData
        let size = 0;
        for (const [key, value] of data.entries()) {
          if (value instanceof File) {
            size += value.size;
          } else {
            size += new Blob([String(value)]).size;
          }
        }
        return size <= maxSize;
      }
      
      if (typeof data === 'object') {
        return new Blob([JSON.stringify(data)]).size <= maxSize;
      }
      
      return true;
    };
  }

  /**
   * Condition for public endpoints (no auth required)
   * @param {string[]} publicPaths - List of public path patterns
   * @returns {Function} Condition function
   */
  static isPublicEndpoint(publicPaths = ['/login', '/register', '/health', '/public']) {
    return (config) => {
      const url = config.url || '';
      return !publicPaths.some(path => url.includes(path));
    };
  }

  /**
   * Condition based on user agent
   * @param {string|RegExp} pattern - User agent pattern to match
   * @returns {Function} Condition function
   */
  static userAgentMatches(pattern) {
    return () => {
      if (typeof navigator === 'undefined') return false;
      
      const userAgent = navigator.userAgent;
      
      if (pattern instanceof RegExp) {
        return pattern.test(userAgent);
      }
      
      return userAgent.includes(pattern);
    };
  }

  /**
   * Combine multiple conditions with AND logic
   * @param {Function[]} conditions - Array of condition functions
   * @returns {Function} Combined condition function
   */
  static and(...conditions) {
    return (config) => {
      return conditions.every(condition => condition(config));
    };
  }

  /**
   * Combine multiple conditions with OR logic
   * @param {Function[]} conditions - Array of condition functions
   * @returns {Function} Combined condition function
   */
  static or(...conditions) {
    return (config) => {
      return conditions.some(condition => condition(config));
    };
  }

  /**
   * Negate a condition
   * @param {Function} condition - Condition function to negate
   * @returns {Function} Negated condition function
   */
  static not(condition) {
    return (config) => {
      return !condition(config);
    };
  }

  /**
   * Create a custom condition from a function
   * @param {Function} conditionFn - Custom condition function
   * @returns {Function} Condition function
   */
  static custom(conditionFn) {
    return conditionFn;
  }
}

/**
 * Predefined common conditions for easy use
 */
export const CommonConditions = {
  // Environment conditions
  isDevelopment: InterceptorConditions.environmentMatches('development'),
  isProduction: InterceptorConditions.environmentMatches('production'),
  
  // HTTP method conditions
  isGetRequest: InterceptorConditions.methodMatches('get'),
  isPostRequest: InterceptorConditions.methodMatches('post'),
  isWriteRequest: InterceptorConditions.methodMatches(['post', 'put', 'patch', 'delete']),
  
  // URL conditions
  isApiCall: InterceptorConditions.urlMatches('/api/'),
  isAuthCall: InterceptorConditions.urlMatches('/auth/'),
  isPublicRoute: InterceptorConditions.not(
    InterceptorConditions.isPublicEndpoint()
  ),
  
  // Auth conditions
  requiresAuth: InterceptorConditions.and(
    InterceptorConditions.isAuthenticated(),
    InterceptorConditions.isPublicEndpoint()
  ),
  
  // File conditions
  isFileUpload: InterceptorConditions.isFileUpload(),
  isSmallRequest: InterceptorConditions.requestSizeBelow(1024 * 100), // 100KB
  
  // Network conditions
  isOnline: InterceptorConditions.isOnline(),
  
  // Time conditions
  isBusinessHours: InterceptorConditions.timeRange({ start: 9, end: 17 }),
  isNightTime: InterceptorConditions.timeRange({ start: 22, end: 6 }),
  
  // Browser conditions
  isMobile: InterceptorConditions.userAgentMatches(/Mobile|Android|iPhone/i),
  isDesktop: InterceptorConditions.not(
    InterceptorConditions.userAgentMatches(/Mobile|Android|iPhone/i)
  )
};