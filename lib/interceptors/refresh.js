import axios from 'axios';

/**
 * Attaches an interceptor to the given Axios instance that will refresh
 * the access token if any request returns a 401.
 *
 * @param {import('axios').AxiosInstance} instance - The Axios instance to attach the interceptor to.
 * @param {Object} options
 * @param {() => string | null | undefined} options.getAccessToken - Function returning current access token.
 * @param {() => string | null | undefined} options.getRefreshToken - Function returning current refresh token.
 * @param {(token: string) => void} options.setAccessToken - Function to save new access token.
 * @param {(refreshToken: string) => void} options.setRefreshToken - Function to save new refresh token.
 * @param {() => void} options.onRefreshTokenFail - Callback when refresh token fails (e.g., redirect to login).
 * @param {string} options.refreshUrl - The URL to call to refresh tokens.
 * @param {(refreshToken: string) => import('axios').AxiosRequestConfig} [options.refreshRequestConfig] - Custom config builder for refresh request.
 * @param {(response: import('axios').AxiosResponse) => {token: string, refreshToken: string}} [options.handleRefreshResponse] - Custom response handler.
 * @returns {number} The interceptor ID (can be used to eject the interceptor)
 */
export function attachRefreshInterceptor(instance, {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  onRefreshTokenFail,
  refreshUrl,
  refreshRequestConfig,
  handleRefreshResponse
}) {
  let refreshTokenPromise = null;

  // Default refresh request config builder
  const defaultRefreshConfig = (refreshToken) => ({
    method: 'post',
    url: refreshUrl,
    params: { refreshToken }
  });

  // Default response handler
  const defaultResponseHandler = (res) => {
    if (!res.data || !res.data.token || !res.data.refreshToken) {
      throw new Error("Invalid token response structure");
    }
    return res.data;
  };

  const interceptorId = instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;

      // Handle network errors
      if (!error.response) {
        return Promise.reject(error);
      }

      // Handle 401 errors
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Prevent multiple simultaneous refresh requests
        if (!refreshTokenPromise) {
          const refreshToken = getRefreshToken();
          
          if (!refreshToken) {
            onRefreshTokenFail();
            return Promise.reject(error);
          }

          const config = refreshRequestConfig 
            ? refreshRequestConfig(refreshToken) 
            : defaultRefreshConfig(refreshToken);

          refreshTokenPromise = axios(config)
            .then((res) => {
              const handler = handleRefreshResponse || defaultResponseHandler;
              const tokenData = handler(res);
              
              setAccessToken(tokenData.token);
              setRefreshToken(tokenData.refreshToken);
              
              return tokenData.token;
            })
            .catch((err) => {
              onRefreshTokenFail();
              throw err;
            })
            .finally(() => {
              refreshTokenPromise = null;
            });
        }

        try {
          const newAccessToken = await refreshTokenPromise;
          
          // Update the authorization header
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          return instance(originalRequest);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );

  return interceptorId;
}