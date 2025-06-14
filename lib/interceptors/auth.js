/**
 * Attaches an Authorization header to all requests using the provided token getter.
 * @param {import('axios').AxiosInstance} instance - The Axios instance to attach the interceptor to.
 * @param {() => string | null | undefined} getTokenFn - A function that returns the token (or null/undefined).
 */
export function attachAuthInterceptor(instance, getTokenFn) {
  instance.interceptors.request.use(
    (config) => {
      const token = getTokenFn?.();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
}
