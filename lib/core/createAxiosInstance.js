import axios from 'axios';
import { extendAxiosInstance } from '../utils/extendAxios.js';

/**
 * Creates a new Axios instance with utility interceptors attached.
 * @param {string} [baseUrl] - Optional base URL for the instance.
 * @returns {import('axios').AxiosInstance & { useAuthInterceptor: Function, useRefreshInterceptor: Function }}
 */
export function createAxiosInstance(baseUrl) {
  const instance = axios.create(baseUrl ? { baseURL: baseUrl } : {});
  return extendAxiosInstance(instance);
}
