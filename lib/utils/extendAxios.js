import { attachAuthInterceptor } from '../interceptors/auth.js';
import { attachRefreshInterceptor } from '../interceptors/refresh.js';

/**
 * Extends the given Axios instance with utility methods.
 *
 * @param {import('axios').AxiosInstance} instance - The Axios instance to extend.
 * @returns {import('../../index').ExtendedAxiosInstance}
 */
export function extendAxiosInstance(instance) {
  let authInterceptorId = null;
  let refreshInterceptorId = null;

  instance.useAuthInterceptor = (getTokenFn) => {
    // Remove existing auth interceptor if any
    if (authInterceptorId !== null) {
      instance.interceptors.request.eject(authInterceptorId);
    }
    authInterceptorId = attachAuthInterceptor(instance, getTokenFn);
  };

  instance.useRefreshInterceptor = (options) => {
    // Remove existing refresh interceptor if any
    if (refreshInterceptorId !== null) {
      instance.interceptors.response.eject(refreshInterceptorId);
    }
    refreshInterceptorId = attachRefreshInterceptor(instance, options);
  };

  instance.removeAuthInterceptor = () => {
    if (authInterceptorId !== null) {
      instance.interceptors.request.eject(authInterceptorId);
      authInterceptorId = null;
    }
  };

  instance.removeRefreshInterceptor = () => {
    if (refreshInterceptorId !== null) {
      instance.interceptors.response.eject(refreshInterceptorId);
      refreshInterceptorId = null;
    }
  };

  return instance;
}