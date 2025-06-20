/**
 * Attaches request deduplication functionality to the axios instance
 * @param {Object} instance - The axios instance
 */
export function attachDeduplication(instance) {
  /**
   * Enable request deduplication
   * Prevents duplicate requests from being sent simultaneously
   * @param {Object} options - Deduplication options
   * @param {Function} options.keyGenerator - Custom function to generate deduplication key
   * @param {number} options.ttl - Time to live for cached requests in ms
   * @returns {Object} - The axios instance
   */
  instance.dedupe = function(options = {}) {
    const {
      keyGenerator = defaultKeyGenerator,
      ttl = 1000 // Default 1 second TTL
    } = options;
    
    // Map to store pending requests
    const pendingRequests = new Map();
    
    // Store original request method
    const originalRequest = instance.request.bind(instance);
    
    // Override request method
    instance.request = function(config) {
      // Generate deduplication key
      const key = keyGenerator(config);
      
      // Check if we have a pending request with the same key
      if (pendingRequests.has(key)) {
        const pending = pendingRequests.get(key);
        
        // If the pending request hasn't expired, return it
        if (Date.now() - pending.timestamp < ttl) {
          return pending.promise;
        } else {
          // Clean up expired request
          pendingRequests.delete(key);
        }
      }
      
      // Create new request promise
      const requestPromise = originalRequest(config)
        .then(response => {
          // Clean up on success
          pendingRequests.delete(key);
          return response;
        })
        .catch(error => {
          // Clean up on error
          pendingRequests.delete(key);
          throw error;
        });
      
      // Store the pending request
      pendingRequests.set(key, {
        promise: requestPromise,
        timestamp: Date.now()
      });
      
      return requestPromise;
    };
    
    // Add method to clear pending requests
    instance.clearDedupe = function() {
      pendingRequests.clear();
      return instance;
    };
    
    // Add method to get dedupe stats
    instance.getDedupeStats = function() {
      return {
        pendingRequests: pendingRequests.size,
        keys: Array.from(pendingRequests.keys())
      };
    };
    
    return instance;
  };
  
  /**
   * Default key generator function
   * Generates a unique key based on method, url, params, and data
   */
  function defaultKeyGenerator(config) {
    const keyParts = [
      config.method || 'get',
      config.url || '',
      JSON.stringify(config.params || {}),
      JSON.stringify(config.data || {})
    ];
    
    return keyParts.join('::');
  }
}