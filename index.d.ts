import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface RefreshOptions {
  getAccessToken: () => string | null | undefined;
  getRefreshToken: () => string | null | undefined;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  onRefreshTokenFail: () => void;
  refreshUrl: string;
  refreshRequestConfig?: (refreshToken: string) => AxiosRequestConfig;
  handleRefreshResponse?: (response: AxiosResponse) => RefreshTokenResponse;
}

export interface ExtendedAxiosInstance extends AxiosInstance {
  useAuthInterceptor(getToken: () => string | null | undefined): void;
  useRefreshInterceptor(options: RefreshOptions): void;
  removeAuthInterceptor(): void;
  removeRefreshInterceptor(): void;
}

/**
 * Create a new Axios instance extended with utility interceptors.
 * @param baseUrl Optional base URL
 */
export function createAxiosInstance(baseUrl?: string): ExtendedAxiosInstance;

/**
 * Attach auth interceptor to existing axios instance
 */
export function attachAuthInterceptor(
  axiosInstance: AxiosInstance,
  getAccessTokenFn: () => string | null | undefined
): number;

/**
 * Attach refresh interceptor to existing axios instance
 */
export function attachRefreshInterceptor(
  axiosInstance: AxiosInstance,
  options: RefreshOptions
): number;