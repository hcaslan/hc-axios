/**
 * Attaches an Authorization header to all requests using the provided token getter.
 * @param {import('axios').AxiosInstance} instance - The Axios instance to attach the interceptor to.
 * @param {() => string | null | undefined} getTokenFn - A function that returns the token (or null/undefined).
 * @returns {number} The interceptor ID (can be used to eject the interceptor)
 */
export function attachAuthInterceptor(instance, getTokenFn) {
  const interceptorId = instance.interceptors.request.use(
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
  
  return interceptorId;
}