import { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse,
  AxiosStatic 
} from 'axios';

export interface RefreshTokenOptions {
  getAccessToken: () => string | null | undefined;
  getRefreshToken: () => string | null | undefined;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  onRefreshTokenFail: () => void;
  refreshUrl: string;
  refreshRequestConfig?: (refreshToken: string) => AxiosRequestConfig;
  handleRefreshResponse?: (response: AxiosResponse) => { token: string; refreshToken: string };
}

export interface RetryOptions {
  retries?: number;
  retryDelay?: number | ((retryCount: number) => number);
  retryCondition?: (error: any) => boolean;
  shouldResetTimeout?: boolean;
}

export interface LoggingOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  requestFormatter?: (config: AxiosRequestConfig) => any;
  responseFormatter?: (response: AxiosResponse) => any;
  errorFormatter?: (error: any) => any;
}

export interface AuthConfig {
  getToken: () => string | null | undefined;
  refresh?: RefreshTokenOptions;
}

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  remaining: number;
}

export interface UploadOptions {
  onProgress?: (info: UploadProgressInfo) => void;
  onStart?: (config: AxiosRequestConfig) => void;
  onComplete?: (response: AxiosResponse, duration: number) => void;
  onError?: (error: any) => void;
}

export interface CacheOptions {
  maxAge?: number;
  maxSize?: number;
  keyGenerator?: (config: AxiosRequestConfig) => string;
}

export interface TimeoutOptions {
  defaultTimeout?: number;
  endpointTimeouts?: Record<string, number>;
  onTimeout?: (error: any, config: AxiosRequestConfig) => void;
}

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  onLimit?: (error: any, config: AxiosRequestConfig) => void;
}

export interface PaginationConfig {
  pageParam?: string;
  limitParam?: string;
  defaultLimit?: number;
  totalKey?: string;
  dataKey?: string;
  pageKey?: string;
}

export interface PaginationPage<T = any> {
  data: T[];
  page: number;
  total?: number;
  hasMore: boolean;
}

export interface PollingOptions {
  interval?: number;
  maxAttempts?: number;
  condition?: (data: any) => boolean;
  onUpdate?: (response: AxiosResponse, attempt: number) => void;
  onError?: (error: any, attempt: number) => boolean;
  config?: AxiosRequestConfig;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

export interface RetryRequestOptions {
  retries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  status?: number;
  data?: any;
  error?: string;
}

export interface HealthCheck {
  check(): Promise<HealthCheckResult>;
}

export interface MockResponse {
  data?: any;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  error?: Error;
  delay?: number;
}

export interface MockConfig {
  [key: string]: MockResponse | any;
}

export interface FileUploadOptions {
  url?: string;
  fieldName?: string;
  onProgress?: (info: UploadProgressInfo) => void;
  headers?: Record<string, string>;
  config?: AxiosRequestConfig;
}

export interface ResourceMethods<T = any> {
  list(params?: any): Promise<AxiosResponse<T[]>>;
  get(id: string | number): Promise<AxiosResponse<T>>;
  create(data: Partial<T>): Promise<AxiosResponse<T>>;
  update(id: string | number, data: Partial<T>): Promise<AxiosResponse<T>>;
  patch(id: string | number, data: Partial<T>): Promise<AxiosResponse<T>>;
  delete(id: string | number): Promise<AxiosResponse<void>>;
}

export interface QueueMetrics {
  running: number;
  queued: number;
}

export interface InstanceMetrics {
  requestQueue: QueueMetrics | null;
}

export interface DevelopmentSetupOptions {
  logging?: LoggingOptions;
  retry?: RetryOptions;
  uploadProgress?: UploadOptions;
  timeout?: TimeoutOptions;
}

export interface ProductionSetupOptions {
  retry?: RetryOptions;
  cache?: CacheOptions;
  rateLimit?: RateLimitOptions;
  timeout?: TimeoutOptions;
  logging?: LoggingOptions;
}

export interface InterceptorStatus {
  auth: boolean;
  refreshToken: boolean;
  retry: boolean;
  logging: boolean;
  uploadProgress: boolean;
  cache: boolean;
  smartTimeout: boolean;
  rateLimit: boolean;
}

export interface HCAxiosInstance extends AxiosInstance {
  // Auth methods
  useAuth(getToken: () => string | null | undefined): HCAxiosInstance;
  removeAuth(): HCAxiosInstance;
  
  // Refresh token methods
  useRefreshToken(options: RefreshTokenOptions): HCAxiosInstance;
  removeRefreshToken(): HCAxiosInstance;
  
  // Retry methods
  useRetry(options?: RetryOptions): HCAxiosInstance;
  removeRetry(): HCAxiosInstance;
  
  // Logging methods
  useLogging(options?: LoggingOptions): HCAxiosInstance;
  removeLogging(): HCAxiosInstance;
  
  // New enhanced methods
  useUploadProgress(options?: UploadOptions): HCAxiosInstance;
  removeUploadProgress(): HCAxiosInstance;
  
  // Cache methods
  useCache(options?: CacheOptions): HCAxiosInstance;
  removeCache(): HCAxiosInstance;
  
  // Timeout methods
  useSmartTimeout(options?: TimeoutOptions): HCAxiosInstance;
  removeSmartTimeout(): HCAxiosInstance;
  
  // Rate limit methods
  useRateLimit(options?: RateLimitOptions): HCAxiosInstance;
  removeRateLimit(): HCAxiosInstance;
  
  // Response transformation methods
  useResponseTransform(transformer: (data: any) => any): HCAxiosInstance;
  useCamelCase(): HCAxiosInstance;
  
  // Queue methods
  useQueue(maxConcurrent?: number): HCAxiosInstance;
  
  // Utility methods
  uploadFile(file: File, options?: FileUploadOptions): Promise<AxiosResponse>;
  
  batch<T = any>(requests: Array<(() => Promise<AxiosResponse<T>>) | AxiosRequestConfig>): Promise<AxiosResponse<T>[]>;
  
  cancellable<T = any>(key: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  cancel(key: string): void;
  cancelAll(): void;
  
  paginate<T = any>(url: string, options?: AxiosRequestConfig): AsyncIterableIterator<PaginationPage<T>>;
  fetchAll<T = any>(url: string, options?: AxiosRequestConfig): Promise<T[]>;
  
  resource<T = any>(resourcePath: string): ResourceMethods<T>;
  
  healthCheck(endpoint?: string): HealthCheck;
  
  poll<T = any>(url: string, options?: PollingOptions): Promise<AxiosResponse<T>>;
  
  concurrent<T = any>(requests: Array<() => Promise<AxiosResponse<T>>>, limit?: number): Promise<AxiosResponse<T>[]>;
  
  retryRequest<T = any>(config: AxiosRequestConfig, options?: RetryRequestOptions): Promise<AxiosResponse<T>>;
  
  withCircuitBreaker(options?: CircuitBreakerOptions): HCAxiosInstance;
  
  dedupe(): HCAxiosInstance;
  
  mock(mocks: MockConfig): HCAxiosInstance;
  unmock?(): HCAxiosInstance;
  
  // Setup helpers
  setupAuth(config: AuthConfig): HCAxiosInstance;
  setupDevelopment(options?: DevelopmentSetupOptions): HCAxiosInstance;
  setupProduction(options?: ProductionSetupOptions): HCAxiosInstance;
  
  // Status and metrics
  getInterceptorStatus(): InterceptorStatus;
  getMetrics(): InstanceMetrics;
  
  // Internal properties (optional access)
  _queue?: any;
}

export interface HCAxiosStatic {
  create(config?: string | AxiosRequestConfig): HCAxiosInstance;
  VERSION: string;
  isHCAxios: boolean;
}

// Utility classes
export declare class RequestQueue {
  constructor(maxConcurrent?: number);
  add<T>(requestFn: () => Promise<T>): Promise<T>;
}

export declare class PaginationHelper {
  constructor(instance: AxiosInstance, config?: PaginationConfig);
  fetchAll<T = any>(url: string, options?: AxiosRequestConfig): Promise<T[]>;
  fetchPages<T = any>(url: string, options?: AxiosRequestConfig): AsyncIterableIterator<PaginationPage<T>>;
}

export declare class CancellationManager {
  constructor();
  create(key: string): AbortSignal;
  cancel(key: string): void;
  cancelAll(): void;
  getSignal(key: string): AbortSignal | undefined;
}

export declare class BatchRequestManager {
  constructor(instance: AxiosInstance, options?: {
    batchSize?: number;
    delay?: number;
    endpoint?: string;
  });
  add<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

export declare class ErrorHandler {
  constructor(options?: {
    globalHandler?: (error: any) => any;
    logger?: any;
  });
  register(errorType: string, handler: (error: any) => any): void;
  handle(error: any): Promise<any>;
  getErrorType(error: any): string;
}

// Response transformers
export declare const responseTransformers: {
  toCamelCase: (data: any) => any;
  toSnakeCase: (data: any) => any;
  extractData: (dataPath?: string) => (response: any) => any;
  addMetadata: (response: any) => any;
};

// Common patterns
export declare const commonPatterns: {
  createApiClient: (baseURL: string, options?: AxiosRequestConfig) => AxiosInstance;
  createResource: <T = any>(instance: AxiosInstance, resourcePath: string) => ResourceMethods<T>;
  uploadFile: (instance: AxiosInstance, file: File, options?: FileUploadOptions) => Promise<AxiosResponse>;
  createHealthCheck: (instance: AxiosInstance, endpoint?: string) => HealthCheck;
};

// Interceptor functions
export declare function attachAuthInterceptor(
  instance: AxiosInstance, 
  getTokenFn: () => string | null | undefined
): number;

export declare function attachRefreshInterceptor(
  instance: AxiosInstance, 
  options: RefreshTokenOptions
): number;

export declare function attachRetryInterceptor(
  instance: AxiosInstance, 
  options?: RetryOptions
): number;

export declare function attachLoggingInterceptor(
  instance: AxiosInstance, 
  options?: LoggingOptions
): { request: number | null; response: number | null };

export declare function attachUploadInterceptor(
  instance: AxiosInstance, 
  options?: UploadOptions
): { request: number; response: number };

export declare function attachCacheInterceptor(
  instance: AxiosInstance, 
  options?: CacheOptions
): { request: number; response: number };

export declare function attachTimeoutInterceptor(
  instance: AxiosInstance, 
  options?: TimeoutOptions
): { request: number; response: number };

export declare function attachRateLimitInterceptor(
  instance: AxiosInstance, 
  options?: RateLimitOptions
): number;

// Main export
declare const hcAxios: HCAxiosStatic;

export { hcAxios };
export default hcAxios;

// Type helpers for better developer experience
export type RequestFunction<T = any> = () => Promise<AxiosResponse<T>>;
export type TransformFunction = (data: any) => any;
export type ErrorHandler = (error: any) => any;
export type ProgressCallback = (info: UploadProgressInfo) => void;
export type ConditionFunction = (data: any) => boolean;

// Generic response types for common use cases
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResponse<T = any> {
  items: T[];
  count: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// Error types
export interface HCAxiosError extends Error {
  isHCAxiosError: true;
  code?: string;
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
  request?: any;
  toJSON(): object;
}

// Configuration presets
export interface ConfigPreset {
  development: DevelopmentSetupOptions;
  production: ProductionSetupOptions;
  testing: {
    mocks: MockConfig;
    timeout: number;
  };
}

// Event types for advanced usage
export interface RequestEvent {
  type: 'request' | 'response' | 'error';
  config: AxiosRequestConfig;
  timestamp: number;
  data?: any;
  error?: any;
}

export type EventListener = (event: RequestEvent) => void;

// Advanced instance configuration
export interface AdvancedConfig extends AxiosRequestConfig {
  // Enhanced features
  enableQueue?: boolean;
  enableDeduplication?: boolean;
  enableCircuitBreaker?: boolean;
  
  // Preset configurations
  preset?: 'development' | 'production' | 'testing';
  
  // Event handling
  onEvent?: EventListener;
  
  // Custom adapters
  uploadAdapter?: (config: AxiosRequestConfig) => Promise<AxiosResponse>;
  cacheAdapter?: (key: string) => Promise<any>;
}

// Module augmentation for better IDE support
declare module 'axios' {
  interface AxiosRequestConfig {
    // Additional properties that hc-axios might add
    uploadStartTime?: number;
    cached?: boolean;
    retryCount?: number;
    circuitBreakerState?: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  }
  
  interface AxiosResponse {
    // Additional properties that hc-axios might add
    cached?: boolean;
    fromQueue?: boolean;
    retryAttempt?: number;
  }
}