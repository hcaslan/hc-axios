/**
 * Response transformation utilities
 */
export const responseTransformers = {
  /**
   * Transform API responses to camelCase
   */
  toCamelCase: (data) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.toCamelCase(item));
    }
    
    if (data && typeof data === 'object') {
      const transformed = {};
      for (const [key, value] of Object.entries(data)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformed[camelKey] = responseTransformers.toCamelCase(value);
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Transform request data to snake_case
   */
  toSnakeCase: (data) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.toSnakeCase(item));
    }
    
    if (data && typeof data === 'object') {
      const transformed = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        transformed[snakeKey] = responseTransformers.toSnakeCase(value);
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Extract nested data from API responses
   */
  extractData: (dataPath = 'data') => (response) => {
    const keys = dataPath.split('.');
    let result = response;
    
    for (const key of keys) {
      result = result?.[key];
    }
    
    return result || response;
  },

  /**
   * Add metadata to responses
   */
  addMetadata: (response) => {
    return {
      ...response,
      _metadata: {
        timestamp: new Date().toISOString(),
        requestId: response.headers?.['x-request-id'],
        cached: response.cached || false
      }
    };
  }
};