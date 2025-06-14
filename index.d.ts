import { AxiosInstance } from 'axios';

export interface RefreshOptions {
  getAccessToken: () => string | null | undefined;
  getRefreshToken: () => string | null | undefined;
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  onRefreshTokenFail: () => void;
  refreshUrl: string;
}

export interface ExtendedAxiosInstance extends AxiosInstance {
  useAuthInterceptor(getToken: () => string | null | undefined): void;
  useRefreshInterceptor(options: RefreshOptions): void;
}

/**
 * Create a new Axios instance extended with utility interceptors.
 * @param baseUrl Optional base URL
 */
export function createAxiosInstance(baseUrl?: string): ExtendedAxiosInstance;
