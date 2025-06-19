/**
 * Barrel export for lib utilities
 * Centralized export to avoid circular dependencies
 */

// Core functionality
export { createExtendedInstance } from './core/createExtendedInstance.js';

// Interceptors
export { attachAuthInterceptor } from './interceptors/auth.js';
export { attachRefreshInterceptor } from './interceptors/refresh.js';
export { attachRetryInterceptor } from './interceptors/retry.js';
export { attachLoggingInterceptor } from './interceptors/logging.js';
export { attachUploadInterceptor } from './interceptors/upload.js';
export { attachCacheInterceptor } from './interceptors/cache.js';
export { attachTimeoutInterceptor } from './interceptors/timeout.js';
export { attachRateLimitInterceptor } from './interceptors/rateLimit.js';

// Utilities - Export classes and functions separately to avoid circular deps
export { RequestQueue } from './utils/requestQueue.js';
export { PaginationHelper } from './utils/pagination.js';
export { CancellationManager } from './utils/cancellation.js';
export { BatchRequestManager } from './utils/batchRequests.js';
export { ErrorHandler } from './utils/errorHandler.js';
export { InterceptorManager } from './utils/interceptorManager.js';

// Response transformation
export { responseTransformers } from './utils/responseTransform.js';

// Common patterns
export { 
  createApiClient, 
  createResource, 
  uploadFile, 
  createHealthCheck 
} from './utils/commonPatterns.js';

// Interceptor conditions
export { 
  InterceptorConditions, 
  CommonConditions 
} from './utils/interceptorConditions.js';

// Version
export { version } from './utils/version.js';