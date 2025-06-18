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

export interface ConditionalInterceptorConfig {
  condition: (config: AxiosRequestConfig) => boolean;
  config?: any;
}

export interface InterceptorConditionFunction {
  (config: AxiosRequestConfig): boolean;
}

export interface InterceptorGroupStatus {
  enabled: boolean;
  interceptors: string[];
}

export interface ConditionalInterceptorStatus {
  enabled: boolean;
  hasCondition: boolean;
}

export interface InterceptorManagerStatus {
  groups: Record<string, InterceptorGroupStatus>;
  conditional: Record<string, ConditionalInterceptorStatus>;
  activeInterceptors: string[];
}

export interface EnhancedInterceptorStatus {
  auth: boolean;
  refreshToken: boolean;
  retry: boolean;
  logging: boolean;
  uploadProgress: boolean;
  cache: boolean;
  smartTimeout: boolean;
  rateLimit: boolean;
  interceptorManager: InterceptorManagerStatus;
}

export interface InterceptorManagerMetrics {
  groups: number;
  conditionalInterceptors: number;
}

export interface EnhancedInstanceMetrics {
  requestQueue: QueueMetrics | null;
  interceptorManager: InterceptorManagerMetrics;
}

export interface TimeRangeCondition {
  start: number; // Hour (0-23)
  end: number;   // Hour (0-23)
}

export interface HeaderConditions {
  [headerName: string]: string | RegExp | ((value: string) => boolean);
}

export interface SmartRoutingConfig {
  [pattern: string]: string[];
}

// Interceptor Conditions class
export declare class InterceptorConditions {
  static urlMatches(patterns: string | RegExp | (string | RegExp)[]): InterceptorConditionFunction;
  static methodMatches(methods: string | string[]): InterceptorConditionFunction;
  static environmentMatches(environments: string | string[]): InterceptorConditionFunction;
  static headerMatches(headerConditions: HeaderConditions): InterceptorConditionFunction;
  static hasDataKeys(dataKeys: string | string[]): InterceptorConditionFunction;
  static timeRange(timeRange: TimeRangeCondition): InterceptorConditionFunction;
  static isAuthenticated(getAuthStatus?: () => boolean): InterceptorConditionFunction;
  static isOnline(): InterceptorConditionFunction;
  static isFileUpload(): InterceptorConditionFunction;
  static requestSizeBelow(maxSize: number): InterceptorConditionFunction;
  static isPublicEndpoint(publicPaths?: string[]): InterceptorConditionFunction;
  static userAgentMatches(pattern: string | RegExp): InterceptorConditionFunction;
  static and(...conditions: InterceptorConditionFunction[]): InterceptorConditionFunction;
  static or(...conditions: InterceptorConditionFunction[]): InterceptorConditionFunction;
  static not(condition: InterceptorConditionFunction): InterceptorConditionFunction;
  static custom(conditionFn: InterceptorConditionFunction): InterceptorConditionFunction;
}

// Common Conditions
export declare const CommonConditions: {
  isDevelopment: InterceptorConditionFunction;
  isProduction: InterceptorConditionFunction;
  isGetRequest: InterceptorConditionFunction;
  isPostRequest: InterceptorConditionFunction;
  isWriteRequest: InterceptorConditionFunction;
  isApiCall: InterceptorConditionFunction;
  isAuthCall: InterceptorConditionFunction;
  isPublicRoute: InterceptorConditionFunction;
  requiresAuth: InterceptorConditionFunction;
  isFileUpload: InterceptorConditionFunction;
  isSmallRequest: InterceptorConditionFunction;
  isOnline: InterceptorConditionFunction;
  isBusinessHours: InterceptorConditionFunction;
  isNightTime: InterceptorConditionFunction;
  isMobile: InterceptorConditionFunction;
  isDesktop: InterceptorConditionFunction;
};

// Interceptor Manager class
export declare class InterceptorManager {
  constructor(instance: AxiosInstance);
  createGroup(groupName: string, interceptorNames: string[]): InterceptorManager;
  enableGroup(groupName: string): InterceptorManager;
  disableGroup(groupName: string): InterceptorManager;
  toggleGroup(groupName: string): InterceptorManager;
  useConditionalInterceptors(config: Record<string, ConditionalInterceptorConfig>): InterceptorManager;
  addConditionalInterceptor(interceptorName: string, options: ConditionalInterceptorConfig): InterceptorManager;
  removeConditionalInterceptor(interceptorName: string): InterceptorManager;
  enableInterceptor(interceptorName: string): InterceptorManager;
  disableInterceptor(interceptorName: string): InterceptorManager;
  getStatus(): InterceptorManagerStatus;
  getGroups(): string[];
  getConditionalInterceptors(): string[];
  clearGroups(): InterceptorManager;
  clearConditionalInterceptors(): InterceptorManager;
}

// Enhanced HCAxiosInstance with interceptor management
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
  
  // Upload progress methods
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
  
  // Group management
  createInterceptorGroup(groupName: string, interceptorNames: string[]): HCAxiosInstance;
  enableGroup(groupName: string): HCAxiosInstance;
  disableGroup(groupName: string): HCAxiosInstance;
  toggleGroup(groupName: string): HCAxiosInstance;
  getInterceptorGroups(): string[];
  clearInterceptorGroups(): HCAxiosInstance;
  
  // Conditional interceptors
  useConditionalInterceptors(config: Record<string, ConditionalInterceptorConfig>): HCAxiosInstance;
  addConditionalInterceptor(interceptorName: string, options: ConditionalInterceptorConfig): HCAxiosInstance;
  removeConditionalInterceptor(interceptorName: string): HCAxiosInstance;
  getConditionalInterceptors(): string[];
  clearConditionalInterceptors(): HCAxiosInstance;
  
  // Individual interceptor control
  enableInterceptor(interceptorName: string): HCAxiosInstance;
  disableInterceptor(interceptorName: string): HCAxiosInstance;
  
  // Enhanced setup methods
  setupCommonGroups(): HCAxiosInstance;
  setupEnvironmentInterceptors(): HCAxiosInstance;
  setupSmartRouting(routes?: SmartRoutingConfig): HCAxiosInstance;
  
  // Enhanced status and metrics
  getInterceptorManagerStatus(): InterceptorManagerStatus;
  getInterceptorStatus(): EnhancedInterceptorStatus;
  getMetrics(): EnhancedInstanceMetrics;
  
  // Condition utilities (exposed for advanced users)
  InterceptorConditions: typeof InterceptorConditions;
  CommonConditions: typeof CommonConditions;
  
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
  
  // Internal properties
  _queue?: any;
}

// Enhanced setup options with interceptor management
export interface EnhancedDevelopmentSetupOptions extends DevelopmentSetupOptions {
  interceptorGroups?: string[];
  conditionalInterceptors?: Record<string, ConditionalInterceptorConfig>;
  smartRouting?: SmartRoutingConfig;
}

export interface EnhancedProductionSetupOptions extends ProductionSetupOptions {
  interceptorGroups?: string[];
  conditionalInterceptors?: Record<string, ConditionalInterceptorConfig>;
  smartRouting?: SmartRoutingConfig;
}

// Enhanced configuration interface
export interface InterceptorManagementConfig {
  groups?: Record<string, string[]>;
  conditionalInterceptors?: Record<string, ConditionalInterceptorConfig>;
  smartRouting?: SmartRoutingConfig;
  autoSetupEnvironment?: boolean;
  autoSetupCommonGroups?: boolean;
}

// Testing helpers interface
export interface InterceptorTestingHelpers {
  saveState(): any;
  restoreState(): void;
  createTestInstance(config?: any): HCAxiosInstance;
  validateInterceptors(): Promise<Record<string, boolean>>;
}

// Controls interface for runtime management
export interface InterceptorControls {
  toggleApiCalls(): void;
  toggleDevelopment(): void;
  toggleProduction(): void;
  enableAuth(): void;
  disableAuth(): void;
  enableLogging(): void;
  disableLogging(): void;
  addTempLogging(): void;
  getStatus(): EnhancedInterceptorStatus;
  getMetrics(): EnhancedInstanceMetrics;
}

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  remaining: number;
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

export interface HealthCheckResult {
  healthy: boolean;
  status?: number;
  data?: any;
  error?: string;
}

export interface HealthCheck {
  check(): Promise<HealthCheckResult>;
}

export interface MockConfig {
  [key: string]: any;
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

export interface AuthConfig {
  getToken: () => string | null | undefined;
  refresh?: RefreshTokenOptions;
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

export interface FileUploadOptions {
  url?: string;
  fieldName?: string;
  onProgress?: (info: UploadProgressInfo) => void;
  headers?: Record<string, string>;
  config?: AxiosRequestConfig;
}

// Main hcAxios static interface
export interface HCAxiosStatic {
  create(config?: string | AxiosRequestConfig): HCAxiosInstance;
  VERSION: string;
  isHCAxios: boolean;
}

// Utility exports
export declare const responseTransformers: {
  toCamelCase: (data: any) => any;
  toSnakeCase: (data: any) => any;
  extractData: (dataPath?: string) => (response: any) => any;
  addMetadata: (response: any) => any;
};

export declare const commonPatterns: {
  createApiClient: (baseURL: string, options?: AxiosRequestConfig) => AxiosInstance;
  createResource: <T = any>(instance: AxiosInstance, resourcePath: string) => ResourceMethods<T>;
  uploadFile: (instance: AxiosInstance, file: File, options?: FileUploadOptions) => Promise<AxiosResponse>;
  createHealthCheck: (instance: AxiosInstance, endpoint?: string) => HealthCheck;
};

// Main export
declare const hcAxios: HCAxiosStatic;

export { hcAxios };
export default hcAxios;

// Type helpers
export type InterceptorCondition = InterceptorConditionFunction;
export type ConditionalConfig = Record<string, ConditionalInterceptorConfig>;
export type GroupConfig = Record<string, string[]>;

// Enhanced error types
export interface HCAxiosError extends Error {
  isHCAxiosError: true;
  code?: string;
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
  request?: any;
  interceptorContext?: {
    activeGroups: string[];
    activeConditionals: string[];
    appliedInterceptors: string[];
  };
  toJSON(): object;
}