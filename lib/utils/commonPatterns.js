/**
 * Common API patterns and utilities
 */

/**
 * API Client pattern
 * @param {string} baseURL - Base URL for the API
 * @param {Object} options - Additional axios configuration
 * @returns {import('axios').AxiosInstance} Configured axios instance
 */
export function createApiClient(baseURL, options = {}) {
  const axios = require('axios');
  return axios.create({
    baseURL,
    timeout: 10000,
    ...options
  });
}

/**
 * Resource pattern (RESTful operations)
 * @param {import('axios').AxiosInstance} instance - Axios instance
 * @param {string} resourcePath - Resource path
 * @returns {Object} Resource methods
 */
export function createResource(instance, resourcePath) {
  return {
    list: (params) => instance.get(resourcePath, { params }),
    get: (id) => instance.get(`${resourcePath}/${id}`),
    create: (data) => instance.post(resourcePath, data),
    update: (id, data) => instance.put(`${resourcePath}/${id}`, data),
    patch: (id, data) => instance.patch(`${resourcePath}/${id}`, data),
    delete: (id) => instance.delete(`${resourcePath}/${id}`)
  };
}

/**
 * File upload pattern
 * @param {import('axios').AxiosInstance} instance - Axios instance
 * @param {File} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise} Upload promise
 */
export function uploadFile(instance, file, options = {}) {
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
}

/**
 * Health check pattern
 * @param {import('axios').AxiosInstance} instance - Axios instance
 * @param {string} endpoint - Health check endpoint
 * @returns {Object} Health check object
 */
export function createHealthCheck(instance, endpoint = '/health') {
  return {
    check: async () => {
      try {
        const response = await instance.get(endpoint, { timeout: 5000 });
        return { healthy: true, status: response.status, data: response.data };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    }
  };
}