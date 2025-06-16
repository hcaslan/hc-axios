import { createExtendedInstance } from './lib/core/createExtendedInstance.js';
import { version } from './lib/utils/version.js';

/**
 * Main hcAxios object that mimics axios structure
 */
const hcAxios = {
  /**
   * Creates a new hcAxios instance with enhanced features
   * @param {string|import('axios').AxiosRequestConfig} [config] - Base URL string or full config object
   * @returns {import('./index').HCAxiosInstance}
   */
  create(config) {
    if (typeof config === 'string') {
      config = { baseURL: config };
    }
    return createExtendedInstance(config);
  },

  /**
   * Version of hc-axios
   */
  VERSION: version,

  /**
   * Indicates this is hcAxios
   */
  isHCAxios: true,
};

export { hcAxios };
export default hcAxios;