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
 */
export function attachRefreshInterceptor(instance, {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  onRefreshTokenFail,
  refreshUrl
}) {
  let refreshTokenPromise = null;

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;

      if (!error.response) {
        return Promise.reject(error);
      }

      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!refreshTokenPromise) {
          const refreshToken = getRefreshToken();
          if (!refreshToken) {
            onRefreshTokenFail();
            return Promise.reject(error);
          }

          refreshTokenPromise = axios
            .post(refreshUrl, null, {
              params: { refreshToken }
            })
            .then((res) => {
              if (!res.data) throw new Error("No token data in refresh response");

              setAccessToken(res.data.token);
              setRefreshToken(res.data.refreshToken);
              return res.data.token;
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
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );
}
