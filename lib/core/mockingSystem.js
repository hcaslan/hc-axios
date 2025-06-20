/**
 * Attaches mocking functionality to the axios instance
 * @param {Object} instance - The axios instance
 */
export function attachMockingSystem(instance) {
  /**
   * Enable request mocking
   * @param {Object|Array} mocks - Mock configuration(s)
   * @returns {Object} - The axios instance
   */
  instance.mock = function(mocks) {
    // Normalize mocks to array
    const mockConfigs = Array.isArray(mocks) ? mocks : [mocks];
    
    // Store active mocks
    instance._mocks = instance._mocks || [];
    instance._mocks.push(...mockConfigs);
    
    // Store original request method if not already stored
    if (!instance._originalRequest) {
      instance._originalRequest = instance.request.bind(instance);
    }
    
    // Override request method
    instance.request = async function(config) {
      // Find matching mock
      const matchingMock = findMatchingMock(config, instance._mocks);
      
      if (matchingMock) {
        // Return mocked response
        return createMockResponse(config, matchingMock);
      }
      
      // No matching mock, proceed with real request
      return instance._originalRequest(config);
    };
    
    return instance;
  };
  
  /**
   * Clear all mocks
   */
  instance.clearMocks = function() {
    instance._mocks = [];
    
    // Restore original request method if mocks were active
    if (instance._originalRequest) {
      instance.request = instance._originalRequest;
      delete instance._originalRequest;
    }
    
    return instance;
  };
  
  /**
   * Get active mocks
   */
  instance.getMocks = function() {
    return instance._mocks || [];
  };
  
  /**
   * Remove specific mock
   */
  instance.removeMock = function(url, method = 'get') {
    if (!instance._mocks) return instance;
    
    instance._mocks = instance._mocks.filter(mock => {
      return !(mock.url === url && (mock.method || 'get').toLowerCase() === method.toLowerCase());
    });
    
    // If no mocks left, restore original request
    if (instance._mocks.length === 0) {
      instance.clearMocks();
    }
    
    return instance;
  };
}

/**
 * Find a mock that matches the request config
 */
function findMatchingMock(config, mocks) {
  return mocks.find(mock => {
    // Check method
    const mockMethod = (mock.method || 'get').toLowerCase();
    const requestMethod = (config.method || 'get').toLowerCase();
    
    if (mockMethod !== requestMethod && mock.method !== '*') {
      return false;
    }
    
    // Check URL
    if (typeof mock.url === 'string') {
      // Exact match or wildcard
      if (mock.url === '*') {
        return true;
      }
      
      // Handle wildcards in URL
      if (mock.url.includes('*')) {
        const pattern = mock.url.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(config.url);
      }
      
      return config.url === mock.url;
    }
    
    // Regex URL matching
    if (mock.url instanceof RegExp) {
      return mock.url.test(config.url);
    }
    
    // Function URL matching
    if (typeof mock.url === 'function') {
      return mock.url(config.url, config);
    }
    
    return false;
  });
}

/**
 * Create a mock response
 */
async function createMockResponse(config, mock) {
  // Simulate network delay
  if (mock.delay) {
    await new Promise(resolve => setTimeout(resolve, mock.delay));
  }
  
  // Handle error responses
  if (mock.error) {
    const error = new Error(mock.error.message || 'Mocked error');
    error.config = config;
    error.code = mock.error.code || 'EMOCKED';
    error.response = {
      status: mock.error.status || 500,
      statusText: mock.error.statusText || 'Internal Server Error',
      data: mock.error.data || {},
      headers: mock.error.headers || {},
      config
    };
    throw error;
  }
  
  // Get response data
  let data;
  if (typeof mock.response === 'function') {
    data = await mock.response(config);
  } else {
    data = mock.response;
  }
  
  // Create axios-like response
  return {
    data,
    status: mock.status || 200,
    statusText: mock.statusText || 'OK',
    headers: mock.headers || {},
    config,
    request: {}
  };
}