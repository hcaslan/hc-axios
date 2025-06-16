/**
 * Simple response caching interceptor
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Cache configuration
 * @param {number} [options.maxAge=300000] - Cache max age in milliseconds (5 minutes default)
 * @param {number} [options.maxSize=100] - Maximum number of cached responses
 * @param {Function} [options.keyGenerator] - Custom cache key generator
 * @returns {number} Interceptor ID
 */
export function attachCacheInterceptor(instance, {
  maxAge = 300000, // 5 minutes
  maxSize = 100,
  keyGenerator
} = {}) {
  
  const cache = new Map();
  
  const defaultKeyGenerator = (config) => {
    return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
  };
  
  const generateKey = keyGenerator || defaultKeyGenerator;
  
  const cleanExpiredEntries = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        cache.delete(key);
      }
    }
  };
  
  const requestInterceptorId = instance.interceptors.request.use(
    (config) => {
      // Only cache GET requests by default
      if (config.method?.toLowerCase() === 'get') {
        const key = generateKey(config);
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < maxAge) {
          // Return cached response
          config.adapter = () => Promise.resolve(cached.response);
        }
      }
      
      return config;
    }
  );
  
  const responseInterceptorId = instance.interceptors.response.use(
    (response) => {
      if (response.config.method?.toLowerCase() === 'get' && response.status === 200) {
        cleanExpiredEntries();
        
        if (cache.size >= maxSize) {
          // Remove oldest entry
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        
        const key = generateKey(response.config);
        cache.set(key, {
          response: {
            ...response,
            config: response.config
          },
          timestamp: Date.now()
        });
      }
      
      return response;
    }
  );
  
  return { request: requestInterceptorId, response: responseInterceptorId };
}