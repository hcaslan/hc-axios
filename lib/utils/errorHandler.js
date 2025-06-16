/**
 * Enhanced error handling utilities
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.handlers = new Map();
    this.globalHandler = options.globalHandler;
    this.logger = options.logger || console;
  }

  register(errorType, handler) {
    this.handlers.set(errorType, handler);
  }

  async handle(error) {
    const errorType = this.getErrorType(error);
    const handler = this.handlers.get(errorType) || this.globalHandler;
    
    if (handler) {
      try {
        return await handler(error);
      } catch (handlerError) {
        this.logger.error('Error handler failed:', handlerError);
      }
    }
    
    // Default behavior
    this.logger.error('Unhandled error:', error);
    throw error;
  }

  getErrorType(error) {
    if (error.code === 'ECONNABORTED') return 'TIMEOUT';
    if (error.code === 'NETWORK_ERROR') return 'NETWORK';
    if (error.response?.status === 401) return 'UNAUTHORIZED';
    if (error.response?.status === 403) return 'FORBIDDEN';
    if (error.response?.status === 404) return 'NOT_FOUND';
    if (error.response?.status >= 500) return 'SERVER_ERROR';
    if (error.response?.status >= 400) return 'CLIENT_ERROR';
    
    return 'UNKNOWN';
  }
}

// Export commonly used patterns
export const commonPatterns = {
  // API Client pattern
  createApiClient: (baseURL, options = {}) => {
    const instance = axios.create({
      baseURL,
      timeout: 10000,
      ...options
    });
    
    return instance;
  },

  // Resource pattern (RESTful operations)
  createResource: (instance, resourcePath) => ({
    list: (params) => instance.get(resourcePath, { params }),
    get: (id) => instance.get(`${resourcePath}/${id}`),
    create: (data) => instance.post(resourcePath, data),
    update: (id, data) => instance.put(`${resourcePath}/${id}`, data),
    patch: (id, data) => instance.patch(`${resourcePath}/${id}`, data),
    delete: (id) => instance.delete(`${resourcePath}/${id}`)
  }),

  // File upload pattern
  uploadFile: (instance, file, options = {}) => {
    const formData = new FormData();
    formData.append(options.fieldName || 'file', file);
    
    return instance.post(options.url || '/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers
      },
      onUploadProgress: options.onProgress,
      ...options.config
    });
  },

  // Health check pattern
  createHealthCheck: (instance, endpoint = '/health') => ({
    check: async () => {
      try {
        const response = await instance.get(endpoint, { timeout: 5000 });
        return { healthy: true, status: response.status, data: response.data };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    }
  })
};