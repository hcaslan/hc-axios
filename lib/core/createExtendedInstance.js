import axios from 'axios';

// Import interceptor attachers
import { attachAuthInterceptor } from '../interceptors/auth.js';
import { attachRefreshInterceptor } from '../interceptors/refresh.js';
import { attachRetryInterceptor } from '../interceptors/retry.js';
import { attachLoggingInterceptor } from '../interceptors/logging.js';
import { attachUploadInterceptor } from '../interceptors/upload.js';
import { attachCacheInterceptor } from '../interceptors/cache.js';
import { attachTimeoutInterceptor } from '../interceptors/timeout.js';
import { attachRateLimitInterceptor } from '../interceptors/rateLimit.js';

// Import utilities
import { RequestQueue } from '../utils/requestQueue.js';
import { PaginationHelper } from '../utils/pagination.js';
import { CancellationManager } from '../utils/cancellation.js';
import { BatchRequestManager } from '../utils/batchRequests.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { InterceptorManager } from '../utils/interceptorManager.js';
import { responseTransformers } from '../utils/responseTransform.js';
import { 
  createApiClient, 
  createResource, 
  uploadFile, 
  createHealthCheck 
} from '../utils/commonPatterns.js';
import { InterceptorConditions, CommonConditions } from '../utils/interceptorConditions.js';

// Import module attachers
import { attachInterceptorMethods } from './interceptorMethods.js';
import { attachUtilityMethods } from './utilityMethods.js';
import { attachSetupMethods } from './setupMethods.js';
import { attachCircuitBreaker } from './circuitBreaker.js';
import { attachDeduplication } from './deduplication.js';
import { attachMockingSystem } from './mockingSystem.js';
import { attachInterceptorGroupManagement } from './interceptorGroupManagement.js';
import { attachInstanceState } from './instanceState.js';
import { attachAdvancedFeatures } from './advancedFeatures.js';

/**
 * Creates an extended axios instance with additional methods
 * @param {import('axios').AxiosRequestConfig} [config] - Axios configuration
 * @returns {import('../../index').HCAxiosInstance}
 */
export function createExtendedInstance(config) {
  // Create base axios instance
  const instance = axios.create(config);
  
  // Initialize shared state
  const interceptorIds = {
    auth: null,
    refresh: null,
    retry: null,
    logging: { request: null, response: null },
    upload: { request: null, response: null },
    cache: { request: null, response: null },
    timeout: { request: null, response: null },
    rateLimit: null
  };

  // Initialize utility classes
  const utilities = {
    requestQueue: new RequestQueue(),
    paginationHelper: new PaginationHelper(instance),
    cancellationManager: new CancellationManager(),
    batchManager: new BatchRequestManager(instance),
    errorHandler: new ErrorHandler(),
    interceptorManager: new InterceptorManager(instance)
  };

  // Interceptor attacher functions
  const interceptorAttachers = {
    attachAuthInterceptor,
    attachRefreshInterceptor,
    attachRetryInterceptor,
    attachLoggingInterceptor,
    attachUploadInterceptor,
    attachCacheInterceptor,
    attachTimeoutInterceptor,
    attachRateLimitInterceptor
  };

  // Common pattern functions
  const commonPatterns = {
    createApiClient,
    createResource,
    uploadFile,
    createHealthCheck
  };

  // Attach all methods from modules
  attachInterceptorMethods(instance, interceptorIds, interceptorAttachers);
  attachUtilityMethods(instance, utilities, responseTransformers);
  attachSetupMethods(instance);
  attachCircuitBreaker(instance);
  attachDeduplication(instance);
  attachMockingSystem(instance);
  attachInterceptorGroupManagement(instance, utilities.interceptorManager);
  attachInstanceState(instance, interceptorIds, utilities);
  attachAdvancedFeatures(instance, commonPatterns);

  // Expose condition utilities for advanced users
  instance.InterceptorConditions = InterceptorConditions;
  instance.CommonConditions = CommonConditions;

  // Preserve original axios methods with proper binding
  instance.request = instance.request.bind(instance);
  instance.get = instance.get.bind(instance);
  instance.delete = instance.delete.bind(instance);
  instance.head = instance.head.bind(instance);
  instance.options = instance.options.bind(instance);
  instance.post = instance.post.bind(instance);
  instance.put = instance.put.bind(instance);
  instance.patch = instance.patch.bind(instance);

  return instance;
}