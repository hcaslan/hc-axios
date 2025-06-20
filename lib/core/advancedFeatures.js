/**
 * Attaches advanced feature methods to the axios instance
 * @param {Object} instance - The axios instance
 * @param {Object} commonPatterns - Common pattern functions
 */
export function attachAdvancedFeatures(instance, commonPatterns) {
  /**
   * Request with retry using exponential backoff
   * @param {Object} config - Request configuration
   * @param {Object} options - Retry options
   */
  instance.requestWithRetry = async function(config, options = {}) {
    const { 
      retries = 3, 
      baseDelay = 1000, 
      maxDelay = 30000,
      backoffFactor = 2,
      retryCondition = (error) => {
        // Retry on network errors or 5xx status codes
        return !error.response || error.response.status >= 500;
      }
    } = options;
    
    const makeRequest = async (attempt = 1) => {
      try {
        return await instance.request(config);
      } catch (error) {
        if (attempt >= retries || !retryCondition(error)) {
          throw error;
        }
        
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        
        // Add retry info to error for logging
        error.retryAttempt = attempt;
        error.retryDelay = delay;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return makeRequest(attempt + 1);
      }
    };
    
    return makeRequest();
  };

  /**
   * Create a scoped API client
   * @param {string} baseURL - Base URL for the API
   * @param {Object} options - Additional options
   */
  instance.createApiClient = function(baseURL, options = {}) {
    return commonPatterns.createApiClient(instance, baseURL, options);
  };

  /**
   * Create a RESTful resource
   * @param {string} resourcePath - Path to the resource
   * @param {Object} options - Resource options
   */
  instance.createResource = function(resourcePath, options = {}) {
    return commonPatterns.createResource(instance, resourcePath, options);
  };

  /**
   * Upload file with progress tracking
   * @param {string} url - Upload URL
   * @param {File|Blob} file - File to upload
   * @param {Object} options - Upload options
   */
  instance.uploadFile = function(url, file, options = {}) {
    return commonPatterns.uploadFile(instance, url, file, options);
  };

  /**
   * Create a health check endpoint
   * @param {string} url - Health check URL
   * @param {Object} options - Health check options
   */
  instance.createHealthCheck = function(url, options = {}) {
    return commonPatterns.createHealthCheck(instance, url, options);
  };

  /**
   * Perform GraphQL query
   * @param {string} query - GraphQL query string
   * @param {Object} variables - Query variables
   * @param {Object} options - Request options
   */
  instance.graphql = function(query, variables = {}, options = {}) {
    const { url = '/graphql', ...requestOptions } = options;
    
    return instance.post(url, {
      query,
      variables
    }, requestOptions);
  };

  /**
   * Create a WebSocket-like polling connection
   * @param {string} url - Polling URL
   * @param {Object} options - Polling options
   */
  instance.createPollingConnection = function(url, options = {}) {
    const {
      interval = 5000,
      onMessage,
      onError,
      onClose
    } = options;
    
    let isActive = true;
    let pollInterval;
    
    const poll = async () => {
      if (!isActive) return;
      
      try {
        const response = await instance.get(url);
        if (onMessage && response.data) {
          onMessage(response.data);
        }
      } catch (error) {
        if (onError) {
          onError(error);
        }
      }
    };
    
    // Start polling
    poll();
    pollInterval = setInterval(poll, interval);
    
    // Return connection object
    return {
      close: () => {
        isActive = false;
        clearInterval(pollInterval);
        if (onClose) {
          onClose();
        }
      },
      isActive: () => isActive
    };
  };

  /**
   * Execute requests in a transaction-like manner
   * @param {Array<Function>} operations - Array of request operations
   * @param {Object} options - Transaction options
   */
  instance.transaction = async function(operations, options = {}) {
    const {
      rollbackOnError = true,
      isolated = false
    } = options;
    
    const results = [];
    const rollbackOperations = [];
    
    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        // Execute operation
        const result = await operation(instance);
        results.push(result);
        
        // Store rollback if provided
        if (result && typeof result.rollback === 'function') {
          rollbackOperations.push(result.rollback);
        }
      }
      
      return {
        success: true,
        results
      };
    } catch (error) {
      // Rollback if enabled
      if (rollbackOnError && rollbackOperations.length > 0) {
        for (const rollback of rollbackOperations.reverse()) {
          try {
            await rollback();
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
      }
      
      return {
        success: false,
        error,
        results
      };
    }
  };

  /**
   * Create a retry-able upload with resume capability
   * @param {string} url - Upload URL
   * @param {File|Blob} file - File to upload
   * @param {Object} options - Upload options
   */
  instance.resumableUpload = function(url, file, options = {}) {
    const {
      chunkSize = 1024 * 1024, // 1MB chunks
      onProgress,
      headers = {}
    } = options;
    
    let uploadedBytes = 0;
    
    const upload = async () => {
      while (uploadedBytes < file.size) {
        const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
        
        try {
          const response = await instance.put(url, chunk, {
            headers: {
              ...headers,
              'Content-Range': `bytes ${uploadedBytes}-${uploadedBytes + chunk.size - 1}/${file.size}`,
              'Content-Type': file.type || 'application/octet-stream'
            }
          });
          
          uploadedBytes += chunk.size;
          
          if (onProgress) {
            onProgress({
              loaded: uploadedBytes,
              total: file.size,
              percentage: Math.round((uploadedBytes / file.size) * 100)
            });
          }
        } catch (error) {
          // Allow resume from last successful position
          error.resumeFrom = uploadedBytes;
          throw error;
        }
      }
      
      return { success: true, uploadedBytes };
    };
    
    return {
      start: upload,
      resume: (fromByte) => {
        uploadedBytes = fromByte || uploadedBytes;
        return upload();
      },
      getProgress: () => ({
        uploadedBytes,
        totalBytes: file.size,
        percentage: Math.round((uploadedBytes / file.size) * 100)
      })
    };
  };
}