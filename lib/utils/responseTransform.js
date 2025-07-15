/**
 * Response transformation utilities with enhanced features
 */
export const responseTransformers = {
  /**
   * Transform API responses to camelCase with options
   */
  toCamelCase: (data, options = {}) => {
    const {
      preserveKeys = [],              // Keys to preserve as-is
      preservePattern = null,         // Regex pattern for keys to preserve
      deep = true,                    // Transform nested objects
      preserveConsecutiveCapitals = false  // Keep patterns like API_KEY as apiKey vs apiKey
    } = options;

    if (Array.isArray(data)) {
      return deep ? data.map(item => responseTransformers.toCamelCase(item, options)) : data;
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const transformed = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check if key should be preserved
        if (preserveKeys.includes(key) || (preservePattern && preservePattern.test(key))) {
          transformed[key] = deep ? responseTransformers.toCamelCase(value, options) : value;
          continue;
        }
        
        let camelKey = key;
        
        // Handle different transformation strategies
        if (preserveConsecutiveCapitals && /^[A-Z_]+$/.test(key)) {
          // Preserve all-caps constants but lowercase them
          camelKey = key.toLowerCase().replace(/_/g, '');
        } else if (key.startsWith('_')) {
          // Preserve leading underscores
          const leadingUnderscores = key.match(/^_+/)[0];
          const restOfKey = key.slice(leadingUnderscores.length);
          camelKey = leadingUnderscores + restOfKey.replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
        } else {
          // Standard camelCase conversion
          camelKey = key.replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
        }
        
        transformed[camelKey] = deep ? responseTransformers.toCamelCase(value, options) : value;
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Transform request data to snake_case with options
   */
  toSnakeCase: (data, options = {}) => {
    const {
      preserveKeys = [],
      preservePattern = null,
      deep = true,
      upperCase = false  // Option to output UPPER_SNAKE_CASE
    } = options;

    if (Array.isArray(data)) {
      return deep ? data.map(item => responseTransformers.toSnakeCase(item, options)) : data;
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const transformed = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check if key should be preserved
        if (preserveKeys.includes(key) || (preservePattern && preservePattern.test(key))) {
          transformed[key] = deep ? responseTransformers.toSnakeCase(value, options) : value;
          continue;
        }
        
        // Enhanced snake_case conversion
        let snakeKey = key
          // Insert underscore before uppercase letters that follow lowercase letters or numbers
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          // Handle consecutive capitals (e.g., APIKey -> API_Key)
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
          // Handle numbers (e.g., address1 -> address_1)
          .replace(/([a-zA-Z])(\d)/g, '$1_$2')
          // Convert to final case
          [upperCase ? 'toUpperCase' : 'toLowerCase']();
          
        transformed[snakeKey] = deep ? responseTransformers.toSnakeCase(value, options) : value;
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Transform to kebab-case
   */
  toKebabCase: (data, options = {}) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.toKebabCase(item, options));
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const transformed = {};
      
      for (const [key, value] of Object.entries(data)) {
        const kebabKey = key
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
          .replace(/_/g, '-')
          .toLowerCase();
          
        transformed[kebabKey] = responseTransformers.toKebabCase(value, options);
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Transform to PascalCase
   */
  toPascalCase: (data, options = {}) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.toPascalCase(item, options));
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const transformed = {};
      
      for (const [key, value] of Object.entries(data)) {
        const pascalKey = key
          .replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase())
          .replace(/^([a-z])/, (_, char) => char.toUpperCase());
          
        transformed[pascalKey] = responseTransformers.toPascalCase(value, options);
      }
      return transformed;
    }
    
    return data;
  },

  /**
   * Extract nested data from API responses with enhanced features
   */
  extractData: (dataPath = 'data', options = {}) => (response) => {
    const {
      defaultValue = undefined,
      multiple = false,  // Extract multiple paths
      fallbackPaths = [] // Alternative paths if primary fails
    } = options;

    // Handle multiple path extraction
    if (multiple && Array.isArray(dataPath)) {
      const results = {};
      dataPath.forEach(path => {
        const keys = path.split('.');
        let result = response;
        
        for (const key of keys) {
          result = result?.[key];
        }
        
        const pathKey = keys[keys.length - 1];
        results[pathKey] = result !== undefined ? result : defaultValue;
      });
      return results;
    }

    // Single path extraction with fallbacks
    const paths = [dataPath, ...fallbackPaths];
    
    for (const path of paths) {
      const keys = path.split('.');
      let result = response;
      
      for (const key of keys) {
        result = result?.[key];
      }
      
      if (result !== undefined) {
        return result;
      }
    }
    
    return defaultValue !== undefined ? defaultValue : response;
  },

  /**
   * Add metadata to responses with customization options
   * Can be called as addMetadata(response) or addMetadata(response, options)
   * When used with compose, wrap in a function: (data) => addMetadata(data, options)
   */
  addMetadata: (response, options = {}) => {
    const {
      includeTimestamp = true,
      includeRequestId = true,
      includeCached = true,
      timestampFormat = 'iso', // 'iso', 'unix', 'custom'
      customTimestamp = null,
      additionalMetadata = {}
    } = options;

    // Handle non-object responses (including arrays)
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return {
        data: response,
        _metadata: {
          ...(includeTimestamp && { 
            timestamp: timestampFormat === 'unix' 
              ? Date.now() 
              : timestampFormat === 'custom' && customTimestamp
                ? customTimestamp()
                : new Date().toISOString()
          }),
          ...(includeRequestId && { requestId: undefined }),
          ...(includeCached && { cached: false }),
          ...additionalMetadata
        }
      };
    }
    
    // Extract existing metadata to merge
    const existingMetadata = response._metadata || {};
    
    // Determine cached value
    let cachedValue;
    if (includeCached) {
      if (response.cached !== undefined) {
        // Convert null to false, keep other values as-is
        cachedValue = response.cached === null ? false : response.cached;
      } else if (existingMetadata.cached !== undefined) {
        cachedValue = existingMetadata.cached;
      } else {
        cachedValue = false;
      }
    }
    
    return {
      ...response,
      _metadata: {
        ...existingMetadata,
        ...(includeTimestamp && { 
          timestamp: timestampFormat === 'unix' 
            ? Date.now() 
            : timestampFormat === 'custom' && customTimestamp
              ? customTimestamp()
              : new Date().toISOString()
        }),
        ...(includeRequestId && { 
          requestId: response.headers?.['x-request-id'] ?? existingMetadata.requestId 
        }),
        ...(includeCached && { cached: cachedValue }),
        ...additionalMetadata
      }
    };
  },

  /**
   * Compose multiple transformers
   */
  compose: (...transformers) => (data) => {
    return transformers.reduce((result, transformer) => transformer(result), data);
  },

  /**
   * Transform only specific paths in an object
   */
  transformPaths: (paths, transformer) => (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const result = { ...data };
    
    paths.forEach(path => {
      const keys = path.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) return;
        current = current[keys[i]];
      }
      
      const lastKey = keys[keys.length - 1];
      if (current[lastKey] !== undefined) {
        current[lastKey] = transformer(current[lastKey]);
      }
    });
    
    return result;
  },

  /**
   * Remove null or undefined values from objects
   */
  removeNullish: (data, options = {}) => {
    const { removeEmptyStrings = false, removeEmptyObjects = false, deep = true } = options;
    
    if (Array.isArray(data)) {
      return deep ? data.map(item => responseTransformers.removeNullish(item, options)) : data;
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const cleaned = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check if value should be removed
        if (
          value === null || 
          value === undefined ||
          (removeEmptyStrings && value === '') ||
          (removeEmptyObjects && typeof value === 'object' && Object.keys(value).length === 0)
        ) {
          continue;
        }
        
        cleaned[key] = deep ? responseTransformers.removeNullish(value, options) : value;
      }
      
      return cleaned;
    }
    
    return data;
  },

  /**
   * Rename keys based on a mapping
   */
  renameKeys: (keyMap) => (data) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.renameKeys(keyMap)(item));
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const transformed = {};
      
      for (const [key, value] of Object.entries(data)) {
        const newKey = keyMap[key] || key;
        transformed[newKey] = responseTransformers.renameKeys(keyMap)(value);
      }
      
      return transformed;
    }
    
    return data;
  },

  /**
   * Pick only specified keys from objects
   */
  pick: (keys, options = { deep: false }) => (data) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.pick(keys, options)(item));
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const picked = {};
      
      keys.forEach(key => {
        if (key in data) {
          picked[key] = options.deep ? responseTransformers.pick(keys, options)(data[key]) : data[key];
        }
      });
      
      return picked;
    }
    
    return data;
  },

  /**
   * Omit specified keys from objects
   */
  omit: (keys, options = { deep: false }) => (data) => {
    if (Array.isArray(data)) {
      return data.map(item => responseTransformers.omit(keys, options)(item));
    }
    
    if (data && typeof data === 'object' && data.constructor === Object) {
      const result = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (!keys.includes(key)) {
          result[key] = options.deep ? responseTransformers.omit(keys, options)(value) : value;
        }
      }
      
      return result;
    }
    
    return data;
  }
};