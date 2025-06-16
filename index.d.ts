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

export interface InterceptorStatus {
  auth: boolean;
  refreshToken: boolean;
  retry: boolean;
  logging: boolean;
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
  
  // Helper methods
  setupAuth(config: AuthConfig): HCAxiosInstance;
  getInterceptorStatus(): InterceptorStatus;
}

export interface HCAxiosStatic {
  create(config?: string | AxiosRequestConfig): HCAxiosInstance;
  VERSION: string;
  isHCAxios: boolean;
}

declare const hcAxios: HCAxiosStatic;

export { hcAxios };
export default hcAxios;