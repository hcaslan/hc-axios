/**
 * Enhanced timeout interceptor with custom timeout per endpoint
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Timeout configuration
 * @param {number} [options.defaultTimeout=5000] - Default timeout in milliseconds
 * @param {Object} [options.endpointTimeouts={}] - Specific timeouts for endpoints
 * @param {Function} [options.onTimeout] - Timeout callback
 * @returns {number} Interceptor ID
 */
export function attachTimeoutInterceptor(instance, {
  defaultTimeout = 5000,
  endpointTimeouts = {},
  onTimeout
} = {}) {
  
  const requestInterceptorId = instance.interceptors.request.use(
    (config) => {
      // Set timeout if not already set
      if (!config.timeout) {
        const url = config.url || '';
        const method = config.method?.toUpperCase() || 'GET';
        const endpointKey = `${method} ${url}`;
        
        config.timeout = endpointTimeouts[endpointKey] || 
                        endpointTimeouts[url] || 
                        defaultTimeout;
      }
      
      return config;
    }
  );
  
  const responseInterceptorId = instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        if (onTimeout) {
          onTimeout(error, error.config);
        }
      }
      return Promise.reject(error);
    }
  );
  
  return { request: requestInterceptorId, response: responseInterceptorId };
}