/**
 * File upload interceptor with progress tracking
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Upload configuration
 * @param {Function} [options.onProgress] - Progress callback
 * @param {Function} [options.onStart] - Upload start callback
 * @param {Function} [options.onComplete] - Upload complete callback
 * @param {Function} [options.onError] - Upload error callback
 * @returns {number} Interceptor ID
 */
export function attachUploadInterceptor(instance, {
  onProgress,
  onStart,
  onComplete,
  onError
} = {}) {
  
  const requestInterceptorId = instance.interceptors.request.use(
    (config) => {
      // Check if this is a file upload request
      if (config.data instanceof FormData) {
        if (onStart) onStart(config);
        
        // Add upload progress tracking
        config.onUploadProgress = (progressEvent) => {
          if (onProgress && progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const uploadInfo = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: percentCompleted,
              speed: progressEvent.loaded / (Date.now() - config.uploadStartTime || 1),
              remaining: progressEvent.total - progressEvent.loaded
            };
            onProgress(uploadInfo, config);
          }
        };
        
        config.uploadStartTime = Date.now();
      }
      
      return config;
    },
    (error) => {
      if (onError) onError(error);
      return Promise.reject(error);
    }
  );

  const responseInterceptorId = instance.interceptors.response.use(
    (response) => {
      if (response.config.data instanceof FormData && onComplete) {
        const duration = Date.now() - response.config.uploadStartTime;
        onComplete(response, duration);
      }
      return response;
    },
    (error) => {
      if (error.config?.data instanceof FormData && onError) {
        onError(error);
      }
      return Promise.reject(error);
    }
  );

  return { request: requestInterceptorId, response: responseInterceptorId };
}