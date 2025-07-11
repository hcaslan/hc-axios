/**
 * Enhanced error handling utilities
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.handlers = new Map();
    this.globalHandler = options.globalHandler;
    this.logger = options.logger || console;
  }

  register(errorType, handler) {
    this.handlers.set(errorType, handler);
  }

  async handle(error) {
    const errorType = this.getErrorType(error);
    const handler = this.handlers.get(errorType) || this.globalHandler;
    
    if (handler) {
      try {
        return await handler(error);
      } catch (handlerError) {
        this.logger.error('Error handler failed:', handlerError);
      }
    }
    
    // Default behavior
    this.logger.error('Unhandled error:', error);
    throw error;
  }

  getErrorType(error) {
    if (!error) return 'UNKNOWN';

    if (error.code === 'ECONNABORTED') return 'TIMEOUT';
    if (error.code === 'NETWORK_ERROR') return 'NETWORK';
    if (error.response?.status === 401) return 'UNAUTHORIZED';
    if (error.response?.status === 403) return 'FORBIDDEN';
    if (error.response?.status === 404) return 'NOT_FOUND';
    if (error.response?.status >= 500) return 'SERVER_ERROR';
    if (error.response?.status >= 400) return 'CLIENT_ERROR';
    
    return 'UNKNOWN';
  }
}