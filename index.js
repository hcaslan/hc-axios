/**
 * Barrel export for lib utilities
 * Centralized export to avoid circular dependencies
 */

// Core functionality
export { createExtendedInstance } from './lib/core/createExtendedInstance.js';

// Interceptors
export { attachAuthInterceptor } from './lib/interceptors/auth.js';
export { attachRefreshInterceptor } from './lib/interceptors/refresh.js';
export { attachRetryInterceptor } from './lib/interceptors/retry.js';
export { attachLoggingInterceptor } from './lib/interceptors/logging.js';
export { attachUploadInterceptor } from './lib/interceptors/upload.js';
export { attachCacheInterceptor } from './lib/interceptors/cache.js';
export { attachTimeoutInterceptor } from './lib/interceptors/timeout.js';
export { attachRateLimitInterceptor } from './lib/interceptors/rateLimit.js';

// Utilities - Export classes and functions separately to avoid circular deps
export { RequestQueue } from './lib/utils/requestQueue.js';
export { PaginationHelper } from './lib/utils/pagination.js';
export { CancellationManager } from './lib/utils/cancellation.js';
export { BatchRequestManager } from './lib/utils/batchRequests.js';
export { ErrorHandler } from './lib/utils/errorHandler.js';
export { InterceptorManager } from './lib/utils/interceptorManager.js';

// Response transformation
export { responseTransformers } from './lib/utils/responseTransform.js';

// Common patterns
export { 
  createApiClient, 
  createResource, 
  uploadFile, 
  createHealthCheck 
} from './lib/utils/commonPatterns.js';

// Interceptor conditions
export { 
  InterceptorConditions, 
  CommonConditions 
} from './lib/utils/interceptorConditions.js';

// Version
export { version } from './lib/utils/version.js';

// Import what we need for the main export
import { createExtendedInstance } from './lib/core/createExtendedInstance.js';
import { version } from './lib/utils/version.js';

// Main hcAxios static object - this was missing!
const hcAxios = {
  /**
   * Create a new hcAxios instance
   * @param {string | import('axios').AxiosRequestConfig} [config] - Base URL string or axios config object
   * @returns {import('./index').HCAxiosInstance}
   */
  create(config) {
    // Handle string config (base URL)
    if (typeof config === 'string') {
      return createExtendedInstance({ baseURL: config });
    }
    // Handle object config or undefined
    return createExtendedInstance(config);
  },
  
  // Version from package.json
  VERSION: version,
  
  // Identifier
  isHCAxios: true
};

// Export the main hcAxios object as default
export default hcAxios;

// Also export as named export for compatibility
export { hcAxios };