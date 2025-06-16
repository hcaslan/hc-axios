/**
 * Attaches a retry interceptor to automatically retry failed requests
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Retry configuration
 * @param {number} [options.retries=3] - Number of retry attempts
 * @param {number|Function} [options.retryDelay=1000] - Delay between retries (ms) or function
 * @param {Function} [options.retryCondition] - Function to determine if retry should occur
 * @param {boolean} [options.shouldResetTimeout=true] - Reset timeout on retry
 * @returns {number} Interceptor ID
 */
export function attachRetryInterceptor(instance, {
  retries = 3,
  retryDelay = 1000,
  retryCondition = (error) => {
    // Default: retry on network errors and 5xx errors
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  },
  shouldResetTimeout = true
} = {}) {
  
  const interceptorId = instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      
      // Initialize retry count
      if (!config.__retryCount) {
        config.__retryCount = 0;
      }
      
      // Check if we should retry
      if (!retryCondition(error) || config.__retryCount >= retries) {
        return Promise.reject(error);
      }
      
      // Increment retry count
      config.__retryCount += 1;
      
      // Calculate delay
      const delay = typeof retryDelay === 'function' 
        ? retryDelay(config.__retryCount)
        : retryDelay;
      
      // Reset timeout if needed
      if (shouldResetTimeout && config.timeout) {
        config.timeout = config.timeout;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return instance(config);
    }
  );
  
  return interceptorId;
}