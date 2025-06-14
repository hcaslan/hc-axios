import { attachAuthInterceptor } from '../interceptors/auth.js';
import { attachRefreshInterceptor } from '../interceptors/refresh.js';


/**
 * Extends the given Axios instance with utility methods.
 *
 * @param {import('axios').AxiosInstance} instance - The Axios instance to extend.
 * @returns {import('axios').AxiosInstance & { useAuthInterceptor: Function, useRefreshInterceptor: Function }}
 */
export function extendAxiosInstance(instance) {
  instance.useAuthInterceptor = (getTokenFn) =>
    attachAuthInterceptor(instance, getTokenFn);

  instance.useRefreshInterceptor = (options) =>
    attachRefreshInterceptor(instance, options);

  return instance;
}
