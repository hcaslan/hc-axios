/**
 * Rate limiting interceptor
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Rate limit configuration
 * @param {number} [options.maxRequests=100] - Maximum requests per window
 * @param {number} [options.windowMs=60000] - Time window in milliseconds
 * @param {Function} [options.onLimit] - Rate limit exceeded callback
 * @returns {number} Interceptor ID
 */
export function attachRateLimitInterceptor(instance, {
  maxRequests = 100,
  windowMs = 60000,
  onLimit
} = {}) {
  
  const requests = [];
  
  const requestInterceptorId = instance.interceptors.request.use(
    async (config) => {
      const now = Date.now();
      
      // Remove old requests outside the window
      while (requests.length > 0 && now - requests[0] > windowMs) {
        requests.shift();
      }
      
      // Check if rate limit exceeded
      if (requests.length >= maxRequests) {
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT_EXCEEDED';
        
        if (onLimit) {
          onLimit(error, config);
        }
        
        throw error;
      }
      
      // Add current request timestamp
      requests.push(now);
      
      return config;
    }
  );
  
  return requestInterceptorId;
}