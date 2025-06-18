import hcAxios from 'hc-axios';

// ===========================================
// 1. BASIC INTERCEPTOR GROUP MANAGEMENT
// ===========================================

const api = hcAxios.create('https://api.example.com');

// Setup common interceptor groups
api.setupCommonGroups();

// Check available groups
console.log('Available groups:', api.getInterceptorGroups());
// Output: ['api-calls', 'development', 'production', 'upload', 'public']

// Enable specific groups based on environment
if (process.env.NODE_ENV === 'development') {
  api.enableGroup('development');
} else {
  api.enableGroup('production');
}

// ===========================================
// 2. CONDITIONAL INTERCEPTORS
// ===========================================

// Setup conditional interceptors based on various conditions
api.useConditionalInterceptors({
  // Enable auth only for non-public routes
  auth: {
    condition: api.CommonConditions.requiresAuth,
    config: {}
  },
  
  // Enable logging only in development
  logging: {
    condition: api.CommonConditions.isDevelopment,
    config: {
      logRequests: true,
      logResponses: true,
      logErrors: true
    }
  },
  
  // Enable retry only for API calls
  retry: {
    condition: api.InterceptorConditions.urlMatches('/api/'),
    config: {
      retries: 3,
      retryDelay: 1000
    }
  },
  
  // Enable cache only for GET requests to API
  cache: {
    condition: api.InterceptorConditions.and(
      api.CommonConditions.isGetRequest,
      api.CommonConditions.isApiCall
    ),
    config: {
      maxAge: 300000 // 5 minutes
    }
  },
  
  // Enable upload progress for file uploads
  uploadProgress: {
    condition: api.CommonConditions.isFileUpload,
    config: {
      onProgress: (info) => {
        console.log(`Upload progress: ${info.percentage}%`);
      }
    }
  }
});

// ===========================================
// 3. ADVANCED CONDITIONAL LOGIC
// ===========================================

// Custom condition for business hours only
api.addConditionalInterceptor('businessHoursAuth', {
  condition: api.InterceptorConditions.and(
    api.CommonConditions.isBusinessHours,
    api.InterceptorConditions.urlMatches('/admin/')
  ),
  config: {
    // Special auth handling for admin routes during business hours
  }
});

// Mobile-specific interceptors
api.addConditionalInterceptor('mobileOptimization', {
  condition: api.InterceptorConditions.and(
    api.CommonConditions.isMobile,
    api.InterceptorConditions.requestSizeBelow(1024 * 50) // 50KB limit for mobile
  ),
  config: {
    // Mobile-specific optimizations
  }
});

// Network-aware interceptors
api.addConditionalInterceptor('offlineHandling', {
  condition: api.InterceptorConditions.not(api.CommonConditions.isOnline),
  config: {
    // Handle offline scenarios
  }
});

// ===========================================
// 4. SMART ROUTING BASED INTERCEPTORS
// ===========================================

// Setup smart routing for different API endpoints
api.setupSmartRouting({
  '/api/auth/*': ['auth', 'retry'],
  '/api/upload/*': ['auth', 'uploadProgress', 'retry'],
  '/api/public/*': ['cache', 'logging'],
  '/api/admin/*': ['auth', 'logging', 'rateLimit'],
  '/health': ['logging'],
  '/api/*': ['auth', 'retry', 'cache']
});

// ===========================================
// 5. DYNAMIC INTERCEPTOR MANAGEMENT
// ===========================================

function setupDynamicInterceptors() {
  // Create custom groups for different features
  api.createInterceptorGroup('user-management', ['auth', 'logging', 'retry']);
  api.createInterceptorGroup('file-operations', ['auth', 'uploadProgress', 'retry']);
  api.createInterceptorGroup('analytics', ['logging', 'cache']);
  
  // Enable groups based on user permissions
  const userPermissions = getUserPermissions(); // Your permission logic
  
  if (userPermissions.includes('admin')) {
    api.enableGroup('user-management');
  }
  
  if (userPermissions.includes('file-upload')) {
    api.enableGroup('file-operations');
  }
  
  // Always enable analytics
  api.enableGroup('analytics');
}

// ===========================================
// 6. ENVIRONMENT-SPECIFIC SETUP
// ===========================================

function setupEnvironmentSpecificInterceptors() {
  // Development environment
  if (process.env.NODE_ENV === 'development') {
    api.setupDevelopment({
      logging: {
        logRequests: true,
        logResponses: true,
        requestFormatter: (config) => ({
          method: config.method?.toUpperCase(),
          url: config.url,
          timestamp: new Date().toISOString()
        })
      },
      uploadProgress: {
        onProgress: (info) => console.log(`📤 Upload: ${info.percentage}%`),
        onComplete: () => console.log('✅ Upload completed!')
      }
    });
    
    // Enable additional debugging interceptors
    api.addConditionalInterceptor('debugMode', {
      condition: () => localStorage.getItem('debug') === 'true',
      config: {
        // Debug-specific configuration
      }
    });
  }
  
  // Production environment
  else if (process.env.NODE_ENV === 'production') {
    api.setupProduction({
      retry: {
        retries: 2,
        retryDelay: 3000,
        retryCondition: (error) => {
          // More conservative retry logic for production
          return !error.response || error.response.status >= 500;
        }
      },
      cache: {
        maxAge: 600000, // 10 minutes
        maxSize: 100
      },
      rateLimit: {
        maxRequests: 50,
        windowMs: 60000
      }
    });
  }
  
  // Testing environment
  else if (process.env.NODE_ENV === 'test') {
    // Disable most interceptors for testing
    api.clearInterceptorGroups();
    api.clearConditionalInterceptors();
    
    // Only enable essential interceptors
    api.createInterceptorGroup('testing', ['logging']);
    api.enableGroup('testing');
  }
}

// ===========================================
// 7. REAL-TIME INTERCEPTOR TOGGLING
// ===========================================

function createInterceptorControls() {
  return {
    // Toggle groups
    toggleApiCalls: () => api.toggleGroup('api-calls'),
    toggleDevelopment: () => api.toggleGroup('development'),
    toggleProduction: () => api.toggleGroup('production'),
    
    // Individual interceptor controls
    enableAuth: () => api.enableInterceptor('auth'),
    disableAuth: () => api.disableInterceptor('auth'),
    enableLogging: () => api.enableInterceptor('logging'),
    disableLogging: () => api.disableInterceptor('logging'),
    
    // Conditional interceptor controls
    addTempLogging: () => api.addConditionalInterceptor('tempLogging', {
      condition: () => Date.now() < Date.now() + 60000, // 1 minute
      config: { logRequests: true }
    }),
    
    // Status checking
    getStatus: () => {
      const status = api.getInterceptorStatus();
      console.table(status.interceptorManager.groups);
      console.table(status.interceptorManager.conditional);
      return status;
    },
    
    // Metrics
    getMetrics: () => {
      const metrics = api.getMetrics();
      console.log('Interceptor Metrics:', metrics.interceptorManager);
      return metrics;
    }
  };
}

// ===========================================
// 8. COMPLEX CONDITIONAL SCENARIOS
// ===========================================

function setupComplexConditionals() {
  // Time-based conditional interceptors
  api.addConditionalInterceptor('nightModeOptimization', {
    condition: api.InterceptorConditions.and(
      api.CommonConditions.isNightTime,
      api.InterceptorConditions.methodMatches(['GET'])
    ),
    config: {
      // Reduced logging and increased cache times at night
    }
  });
  
  // User role-based interceptors
  api.addConditionalInterceptor('adminOnlyFeatures', {
    condition: api.InterceptorConditions.and(
      api.InterceptorConditions.urlMatches('/admin/'),
      api.InterceptorConditions.custom((config) => {
        return getUserRole() === 'admin';
      })
    ),
    config: {
      // Admin-specific interceptors
    }
  });
  
  // Request size-based interceptors
  api.addConditionalInterceptor('largeRequestHandling', {
    condition: api.InterceptorConditions.not(
      api.InterceptorConditions.requestSizeBelow(1024 * 1024) // > 1MB
    ),
    config: {
      // Special handling for large requests
      timeout: 120000, // 2 minutes
      retries: 1 // Fewer retries for large requests
    }
  });
  
  // Geolocation-based interceptors (if available)
  api.addConditionalInterceptor('regionSpecific', {
    condition: api.InterceptorConditions.custom((config) => {
      const userRegion = getUserRegion(); // Your region detection logic
      return userRegion === 'EU' && config.url?.includes('/gdpr/');
    }),
    config: {
      // GDPR compliance interceptors for EU users
    }
  });
  
  // Feature flag-based interceptors
  api.addConditionalInterceptor('betaFeatures', {
    condition: api.InterceptorConditions.and(
      api.InterceptorConditions.urlMatches('/beta/'),
      api.InterceptorConditions.custom(() => {
        return getFeatureFlag('beta-api') === true;
      })
    ),
    config: {
      // Beta feature specific interceptors
    }
  });
}

// ===========================================
// 9. INTERCEPTOR MONITORING AND DEBUGGING
// ===========================================

function setupInterceptorMonitoring() {
  // Monitor interceptor performance
  const interceptorMetrics = {
    requests: 0,
    authRequests: 0,
    cachedRequests: 0,
    retryAttempts: 0
  };
  
  // Add monitoring interceptor
  api.addConditionalInterceptor('monitoring', {
    condition: () => true, // Always active
    config: {
      onRequest: (config) => {
        interceptorMetrics.requests++;
        
        if (config.headers?.Authorization) {
          interceptorMetrics.authRequests++;
        }
        
        console.log(`📊 Request #${interceptorMetrics.requests}:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasAuth: !!config.headers?.Authorization,
          timestamp: new Date().toISOString()
        });
      },
      
      onResponse: (response) => {
        if (response.cached) {
          interceptorMetrics.cachedRequests++;
        }
        
        if (response.config.__retryCount) {
          interceptorMetrics.retryAttempts += response.config.__retryCount;
        }
      }
    }
  });
  
  // Periodic metrics reporting
  setInterval(() => {
    console.log('📈 Interceptor Metrics:', interceptorMetrics);
    
    // Reset metrics
    Object.keys(interceptorMetrics).forEach(key => {
      interceptorMetrics[key] = 0;
    });
  }, 60000); // Every minute
  
  return interceptorMetrics;
}

// ===========================================
// 10. TESTING HELPERS
// ===========================================

function createTestingHelpers() {
  return {
    // Save current interceptor state
    saveState: () => {
      const state = {
        status: api.getInterceptorStatus(),
        groups: api.getInterceptorGroups(),
        conditionals: api.getConditionalInterceptors()
      };
      
      localStorage.setItem('interceptorState', JSON.stringify(state));
      return state;
    },
    
    // Restore interceptor state
    restoreState: () => {
      const savedState = localStorage.getItem('interceptorState');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Clear current state
        api.clearInterceptorGroups();
        api.clearConditionalInterceptors();
        
        // Restore groups (would need additional implementation)
        console.log('Restored state:', state);
      }
    },
    
    // Create isolated test instance
    createTestInstance: (config = {}) => {
      const testApi = hcAxios.create(config.baseURL || 'https://test-api.com');
      
      // Apply minimal interceptors for testing
      if (config.enableLogging) {
        testApi.useLogging({
          logRequests: true,
          logErrors: true
        });
      }
      
      if (config.enableMocking) {
        testApi.mock(config.mocks || {});
      }
      
      return testApi;
    },
    
    // Validate interceptor behavior
    validateInterceptors: async () => {
      const testResults = {
        auth: false,
        retry: false,
        cache: false,
        logging: false
      };
      
      try {
        // Test auth interceptor
        const authResponse = await api.get('/test-auth');
        testResults.auth = !!authResponse.config.headers?.Authorization;
        
        // Test cache interceptor
        const cacheResponse1 = await api.get('/test-cache');
        const cacheResponse2 = await api.get('/test-cache');
        testResults.cache = cacheResponse2.cached || false;
        
        // Additional tests...
        
      } catch (error) {
        console.error('Interceptor validation failed:', error);
      }
      
      return testResults;
    }
  };
}

// ===========================================
// 11. USAGE EXAMPLES
// ===========================================

async function demonstrateInterceptorManagement() {
  console.log('🚀 Demonstrating Interceptor Management Features\n');
  
  // 1. Setup environment-specific interceptors
  setupEnvironmentSpecificInterceptors();
  console.log('✅ Environment-specific interceptors configured');
  
  // 2. Setup dynamic interceptors
  setupDynamicInterceptors();
  console.log('✅ Dynamic interceptors configured');
  
  // 3. Setup complex conditionals
  setupComplexConditionals();
  console.log('✅ Complex conditional interceptors configured');
  
  // 4. Create control interface
  const controls = createInterceptorControls();
  console.log('✅ Interceptor controls created');
  
  // 5. Setup monitoring
  const metrics = setupInterceptorMonitoring();
  console.log('✅ Interceptor monitoring enabled');
  
  // 6. Create testing helpers
  const testHelpers = createTestingHelpers();
  console.log('✅ Testing helpers created');
  
  // 7. Demonstrate real-time control
  console.log('\n📊 Current Status:');
  controls.getStatus();
  
  console.log('\n🔄 Toggling groups...');
  controls.toggleApiCalls();
  controls.toggleDevelopment();
  
  console.log('\n📊 Updated Status:');
  controls.getStatus();
  
  // 8. Make some test requests to see interceptors in action
  console.log('\n🌐 Making test requests...');
  
  try {
    // This should trigger auth and retry interceptors
    await api.get('/api/users');
    
    // This should trigger upload progress interceptor
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'text/plain' }));
    await api.post('/api/upload', formData);
    
    // This should trigger cache interceptor
    await api.get('/api/public/data');
    await api.get('/api/public/data'); // Second call should be cached
    
  } catch (error) {
    console.log('Test requests completed (some may have failed as expected)');
  }
  
  // 9. Show final metrics
  console.log('\n📈 Final Metrics:');
  controls.getMetrics();
  
  return {
    controls,
    metrics,
    testHelpers
  };
}

// ===========================================
// 12. INTEGRATION WITH EXISTING CODE
// ===========================================

// Example of migrating existing interceptor setup to use management features
function migrateExistingSetup() {
  // Old way (before interceptor management)
  // api.useAuth(() => getToken());
  // api.useRetry({ retries: 3 });
  // api.useLogging({ logErrors: true });
  
  // New way (with interceptor management)
  api.setupCommonGroups()
     .enableGroup('api-calls')
     .useConditionalInterceptors({
       auth: {
         condition: api.CommonConditions.requiresAuth,
         config: {}
       },
       retry: {
         condition: api.CommonConditions.isApiCall,
         config: { retries: 3 }
       },
       logging: {
         condition: api.CommonConditions.isDevelopment,
         config: { logErrors: true }
       }
     });
}

// Helper functions (would be implemented based on your app's logic)
function getUserPermissions() {
  // Mock implementation
  return ['admin', 'file-upload'];
}

function getUserRole() {
  // Mock implementation
  return localStorage.getItem('userRole') || 'user';
}

function getUserRegion() {
  // Mock implementation
  return 'US';
}

function getFeatureFlag(flag) {
  // Mock implementation
  const flags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
  return flags[flag] || false;
}

function getToken() {
  // Mock implementation
  return localStorage.getItem('accessToken');
}

// Export for use
export {
  demonstrateInterceptorManagement,
  createInterceptorControls,
  setupDynamicInterceptors,
  setupComplexConditionals,
  setupInterceptorMonitoring,
  createTestingHelpers,
  migrateExistingSetup
};

// ===========================================
// 13. EXAMPLE USAGE IN REAL APPLICATION
// ===========================================

// In your main application file:
async function initializeAPI() {
  const api = hcAxios.create(process.env.REACT_APP_API_URL);
  
  // Setup interceptor management
  const { controls, metrics, testHelpers } = await demonstrateInterceptorManagement();
  
  // Make controls available globally for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    window.apiControls = controls;
    window.apiMetrics = metrics;
    window.apiTestHelpers = testHelpers;
  }
  
  return api;
}

// Usage:
// const api = await initializeAPI();
// 
// // In browser console (development):
// window.apiControls.getStatus();
// window.apiControls.toggleApiCalls();
// window.apiMetrics;

console.log('✅ Interceptor Management Example loaded successfully!');
console.log('📖 Run demonstrateInterceptorManagement() to see it in action');