/**
 * Common condition functions for interceptors
 * 
 * This module provides reusable condition functions that can be used to
 * conditionally apply interceptors based on various criteria such as URL patterns,
 * HTTP methods, authentication status, and more.
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
          // Handle wildcard patterns
          if (pattern.includes('*')) {
            const regexPattern = pattern.replace(/\*/g, '.*');
            return new RegExp(regexPattern).test(url);
          }
          return url.includes(pattern);
        }
        return false;
      });
    };
  }

  /**
   * Condition based on HTTP methods
   * @param {string|string[]} methods - HTTP methods to match (case-insensitive)
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
      // Check both NODE_ENV and browser environment
      const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : null;
      const currentEnv = nodeEnv || 'development';
      return envArray.includes(currentEnv);
    };
  }

  /**
   * Condition based on request headers
   * Note: Header matching is case-sensitive
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
   * Note: Checks if ANY of the specified keys exist in the data
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
      
      if (typeof data === 'object' && data !== null) {
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
    if (!timeRange || typeof timeRange.start !== 'number' || typeof timeRange.end !== 'number') {
      throw new Error('timeRange requires an object with start and end hour numbers');
    }
    
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
   * @returns {Function} Condition function that returns true if authenticated
   */
  static isAuthenticated(getAuthStatus) {
    const defaultGetAuthStatus = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Returns true when token EXISTS (fixed from inverted logic)
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        return !!token;
      }
      return false;
    };
    
    const authChecker = getAuthStatus || defaultGetAuthStatus;
    
    return () => {
      try {
        return authChecker();
      } catch (error) {
        console.warn('Authentication check failed:', error.message);
        return false;
      }
    };
  }

  /**
   * Condition based on network connectivity
   * @returns {Function} Condition function
   */
  static isOnline() {
    return () => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
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
      
      // Check if data is FormData
      if (data instanceof FormData) {
        return true;
      }
      
      // Check for multipart content type header
      if (config.headers) {
        const contentType = config.headers['Content-Type'] || config.headers['content-type'];
        if (contentType && contentType.includes('multipart/form-data')) {
          return true;
        }
      }
      
      // Explicitly return false instead of undefined
      return false;
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
      
      try {
        let size = 0;
        
        if (typeof data === 'string') {
          size = new Blob([data]).size;
        } else if (data instanceof FormData) {
          // Approximate size for FormData
          for (const [key, value] of data.entries()) {
            if (value instanceof File) {
              size += value.size;
            } else {
              size += new Blob([String(value)]).size;
            }
          }
        } else if (data instanceof Blob) {
          size = data.size;
        } else if (typeof data === 'object') {
          size = new Blob([JSON.stringify(data)]).size;
        } else {
          // For other types, convert to string
          size = new Blob([String(data)]).size;
        }
        
        return size <= maxSize;
      } catch (error) {
        console.warn('Failed to calculate request size:', error.message);
        return true; // Default to allowing the request on error
      }
    };
  }

  /**
   * Condition for public endpoints (no auth required)
   * @param {string[]} publicPaths - List of public path patterns
   * @returns {Function} Condition function
   */
  static isPublicEndpoint(publicPaths = ['/login', '/register', '/signup', '/forgot-password', '/reset-password', '/health', '/status', '/ping', '/public']) {
    return (config) => {
      const url = config.url || '';
      return publicPaths.some(path => {
        if (path.includes('*')) {
          const regexPattern = path.replace(/\*/g, '.*');
          return new RegExp(regexPattern).test(url);
        }
        return url.includes(path);
      });
    };
  }

  /**
   * Condition based on user agent
   * @param {string|RegExp} pattern - User agent pattern to match
   * @returns {Function} Condition function
   */
  static userAgentMatches(pattern) {
    return () => {
      if (typeof navigator === 'undefined' || !navigator.userAgent) {
        return false;
      }
      
      const userAgent = navigator.userAgent;
      
      if (pattern instanceof RegExp) {
        return pattern.test(userAgent);
      }
      
      return userAgent.includes(pattern);
    };
  }

  /**
   * Combine multiple conditions with AND logic
   * All conditions must return true
   * @param {...Function} conditions - Condition functions
   * @returns {Function} Combined condition function
   */
  static and(...conditions) {
    return (config) => {
      return conditions.every(condition => {
        try {
          return condition(config);
        } catch (error) {
          console.warn('Condition evaluation failed:', error.message);
          return false;
        }
      });
    };
  }

  /**
   * Combine multiple conditions with OR logic
   * At least one condition must return true
   * @param {...Function} conditions - Condition functions
   * @returns {Function} Combined condition function
   */
  static or(...conditions) {
    return (config) => {
      return conditions.some(condition => {
        try {
          return condition(config);
        } catch (error) {
          console.warn('Condition evaluation failed:', error.message);
          return false;
        }
      });
    };
  }

  /**
   * Negate a condition
   * @param {Function} condition - Condition function to negate
   * @returns {Function} Negated condition function
   */
  static not(condition) {
    return (config) => {
      try {
        return !condition(config);
      } catch (error) {
        console.warn('Condition evaluation failed:', error.message);
        return false;
      }
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
  isPublicRoute: InterceptorConditions.isPublicEndpoint(),
  
  // Auth conditions - Now works correctly after fixing isAuthenticated
  requiresAuth: InterceptorConditions.and(
    InterceptorConditions.not(InterceptorConditions.isAuthenticated()), // User is NOT authenticated
    InterceptorConditions.not(InterceptorConditions.isPublicEndpoint()) // AND endpoint is NOT public
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