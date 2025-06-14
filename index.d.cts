import { AxiosInstance } from "axios";

/**
 * Returns a new Axios instance with the given base URL.
 * @param baseUrl - Optional base URL for the Axios instance.
 * @returns A configured Axios instance.
 */
export declare function createAxiosInstance(baseUrl?: string): AxiosInstance;

/**
 * Attaches an Authorization header to all requests using the provided token getter.
 * @param axiosInstance The Axios instance to attach the interceptor to.
 * @param getAccessTokenFn A function that returns the token (or null/undefined).
 */
export declare function attachAuthInterceptor(
  axiosInstance: AxiosInstance,
  getAccessTokenFn: () => string | null | undefined
): void;

/**
 * Attaches a refresh token interceptor to the given Axios instance.
 *
 * @param {import('axios').AxiosInstance} axiosInstance - The axios instance to attach interceptor.
 * @param {Object} options
 * @param {() => string | null | undefined} options.getAccessToken - Function returning current access token.
 * @param {() => string | null | undefined} options.getRefreshToken - Function returning current refresh token.
 * @param {(token: string) => void} options.setAccessToken - Function to save new access token.
 * @param {(refreshToken: string) => void} options.setRefreshToken - Function to save new refresh token.
 * @param {() => void} options.onRefreshTokenFail - Callback when refresh token fails (e.g., redirect to login).
 * @param {string} options.refreshUrl - The URL to call to refresh tokens.
 */
export declare function attachRefreshInterceptor(
  axiosInstance: AxiosInstance,
  options: {
    getAccessToken: () => string | null | undefined;
    getRefreshToken: () => string | null | undefined;
    setAccessToken: (token: string) => void;
    setRefreshToken: (token: string) => void;
    onRefreshTokenFail: () => void;
    refreshUrl: string;
  }
): void;