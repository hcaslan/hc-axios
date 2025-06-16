/**
 * Attaches logging interceptors for debugging
 * @param {import('axios').AxiosInstance} instance - The Axios instance
 * @param {Object} options - Logging configuration
 * @param {boolean} [options.logRequests=true] - Log outgoing requests
 * @param {boolean} [options.logResponses=true] - Log incoming responses
 * @param {boolean} [options.logErrors=true] - Log errors
 * @param {Object} [options.logger=console] - Logger object with log/error methods
 * @param {Function} [options.requestFormatter] - Custom request formatter
 * @param {Function} [options.responseFormatter] - Custom response formatter
 * @param {Function} [options.errorFormatter] - Custom error formatter
 * @returns {{request: number, response: number}} Interceptor IDs
 */
export function attachLoggingInterceptor(instance, {
  logRequests = true,
  logResponses = true,
  logErrors = true,
  logger = console,
  requestFormatter,
  responseFormatter,
  errorFormatter
} = {}) {
  
  const defaultRequestFormatter = (config) => ({
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    params: config.params,
    data: config.data,
    headers: config.headers
  });
  
  const defaultResponseFormatter = (response) => ({
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
    config: {
      method: response.config.method?.toUpperCase(),
      url: response.config.url
    }
  });
  
  const defaultErrorFormatter = (error) => ({
    message: error.message,
    code: error.code,
    response: error.response ? {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    } : null,
    config: error.config ? {
      method: error.config.method?.toUpperCase(),
      url: error.config.url
    } : null
  });
  
  const requestInterceptorId = logRequests 
    ? instance.interceptors.request.use(
        (config) => {
          const formatter = requestFormatter || defaultRequestFormatter;
          logger.log('🚀 Request:', formatter(config));
          return config;
        },
        (error) => {
          if (logErrors) {
            const formatter = errorFormatter || defaultErrorFormatter;
            logger.error('❌ Request Error:', formatter(error));
          }
          return Promise.reject(error);
        }
      )
    : null;
  
  const responseInterceptorId = (logResponses || logErrors)
    ? instance.interceptors.response.use(
        (response) => {
          if (logResponses) {
            const formatter = responseFormatter || defaultResponseFormatter;
            logger.log('✅ Response:', formatter(response));
          }
          return response;
        },
        (error) => {
          if (logErrors) {
            const formatter = errorFormatter || defaultErrorFormatter;
            logger.error('❌ Response Error:', formatter(error));
          }
          return Promise.reject(error);
        }
      )
    : null;
  
  return {
    request: requestInterceptorId,
    response: responseInterceptorId
  };
}