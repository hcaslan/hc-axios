import hcAxios from 'hc-axios';

// ===========================================
// 1. BASIC ENHANCED SETUP
// ===========================================

const api = hcAxios.create('https://api.example.com');

// Quick development setup with all common features
api.setupDevelopment({
  uploadProgress: {
    onProgress: (info) => console.log(`Upload: ${info.percentage}%`),
    onComplete: () => console.log('Upload completed!')
  },
  timeout: {
    defaultTimeout: 15000,
    endpointTimeouts: {
      'POST /upload': 60000, // 1 minute for uploads
      '/heavy-computation': 120000 // 2 minutes for heavy operations
    }
  }
});

// ===========================================
// 2. FILE UPLOAD WITH PROGRESS
// ===========================================

async function uploadFileExample() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  try {
    const response = await api.uploadFile(file, {
      url: '/upload',
      fieldName: 'document',
      onProgress: (info) => {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = `${info.percentage}%`;
        console.log(`Uploaded: ${info.percentage}% (${info.loaded}/${info.total} bytes)`);
      },
      headers: {
        'X-Upload-Type': 'document'
      }
    });
    
    console.log('File uploaded successfully:', response.data);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// ===========================================
// 3. PAGINATION HELPER
// ===========================================

async function paginationExample() {
  // Fetch all paginated data automatically
  const allUsers = await api.fetchAll('/users', {
    params: { status: 'active' }
  });
  console.log(`Fetched ${allUsers.length} users total`);
  
  // Or iterate through pages manually for better memory management
  for await (const page of api.paginate('/posts')) {
    console.log(`Page ${page.page}: ${page.data.length} posts`);
    console.log(`Total: ${page.total}, Has more: ${page.hasMore}`);
    
    // Process each page
    page.data.forEach(post => {
      console.log(`- ${post.title}`);
    });
    
    if (!page.hasMore) break;
  }
}

// ===========================================
// 4. REQUEST CACHING
// ===========================================

// Enable response caching
api.useCache({
  maxAge: 300000, // 5 minutes
  maxSize: 50,
  keyGenerator: (config) => `${config.method}:${config.url}:${config.params?.page || 1}`
});

async function cachingExample() {
  // First request - hits the server
  console.log('First request...');
  const response1 = await api.get('/users');
  
  // Second request within 5 minutes - served from cache
  console.log('Second request (should be cached)...');
  const response2 = await api.get('/users');
  
  console.log('Both responses equal:', response1.data === response2.data);
}

// ===========================================
// 5. REQUEST CANCELLATION
// ===========================================

async function cancellationExample() {
  // Start a long-running request
  const searchPromise = api.cancellable('search', {
    method: 'GET',
    url: '/search',
    params: { q: 'javascript' }
  });
  
  // Cancel it after 2 seconds
  setTimeout(() => {
    api.cancel('search');
    console.log('Search cancelled');
  }, 2000);
  
  try {
    const result = await searchPromise;
    console.log('Search completed:', result.data);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
    } else {
      console.error('Search failed:', error);
    }
  }
}

// ===========================================
// 6. BATCH REQUESTS
// ===========================================

async function batchExample() {
  const requests = [
    () => api.get('/users/1'),
    () => api.get('/users/2'),
    () => api.get('/posts/1'),
    { method: 'GET', url: '/comments/1' }
  ];
  
  try {
    const results = await api.batch(requests);
    console.log('All requests completed:', results.map(r => r.data));
  } catch (error) {
    console.error('Batch request failed:', error);
  }
}

// ===========================================
// 7. POLLING WITH CONDITIONS
// ===========================================

async function pollingExample() {
  try {
    const result = await api.poll('/job/status/123', {
      interval: 2000, // Check every 2 seconds
      maxAttempts: 30, // Max 1 minute
      condition: (data) => data.status === 'completed',
      onUpdate: (response, attempt) => {
        console.log(`Attempt ${attempt}: Job status is ${response.data.status}`);
      },
      onError: (error, attempt) => {
        console.warn(`Polling attempt ${attempt} failed:`, error.message);
        return attempt < 5; // Continue for first 5 errors
      }
    });
    
    console.log('Job completed!', result.data);
  } catch (error) {
    console.error('Job polling failed:', error);
  }
}

// ===========================================
// 8. RESOURCE HELPERS (RESTful)
// ===========================================

function resourceExample() {
  // Create a resource helper for users
  const users = api.resource('/users');
  const posts = api.resource('/posts');
  
  // Now you can use RESTful methods
  return {
    async createUser(userData) {
      return users.create(userData);
    },
    
    async getUser(id) {
      return users.get(id);
    },
    
    async updateUser(id, updates) {
      return users.update(id, updates);
    },
    
    async deleteUser(id) {
      return users.delete(id);
    },
    
    async listUsers(filters) {
      return users.list(filters);
    },
    
    async getUserPosts(userId) {
      return posts.list({ userId });
    }
  };
}

// ===========================================
// 9. RATE LIMITING
// ===========================================

api.useRateLimit({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  onLimit: (error, config) => {
    console.warn('Rate limit exceeded for:', config.url);
    // Could implement exponential backoff here
  }
});

// ===========================================
// 10. CIRCUIT BREAKER PATTERN
// ===========================================

function circuitBreakerExample() {
  const robustApi = hcAxios.create('https://unreliable-api.com')
    .withCircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000 // 30 seconds
    });
  
  return robustApi;
}

// ===========================================
// 11. REQUEST DEDUPLICATION
// ===========================================

function deduplicationExample() {
  const dedupeApi = api.dedupe();
  
  // These will only make one actual request
  Promise.all([
    dedupeApi.get('/users'),
    dedupeApi.get('/users'),
    dedupeApi.get('/users')
  ]).then(results => {
    console.log('All three requests return the same data');
  });
}

// ===========================================
// 12. CONCURRENT REQUEST LIMITING
// ===========================================

async function concurrentExample() {
  const requests = Array.from({ length: 20 }, (_, i) => 
    () => api.get(`/users/${i + 1}`)
  );
  
  // Limit to 3 concurrent requests
  const results = await api.concurrent(requests, 3);
  console.log(`Processed ${results.length} requests with max 3 concurrent`);
}

// ===========================================
// 13. RESPONSE TRANSFORMATION
// ===========================================

function transformationExample() {
  // Automatic camelCase conversion
  api.useCamelCase();
  
  // Or custom transformation
  api.useResponseTransform((data) => {
    // Add timestamp to all responses
    return {
      ...data,
      _receivedAt: new Date().toISOString()
    };
  });
}

// ===========================================
// 14. HEALTH CHECK MONITORING
// ===========================================

async function healthCheckExample() {
  const healthCheck = api.healthCheck('/health');
  
  const status = await healthCheck.check();
  if (status.healthy) {
    console.log('API is healthy:', status.data);
  } else {
    console.error('API is down:', status.error);
  }
}

// ===========================================
// 15. MOCK RESPONSES FOR TESTING
// ===========================================

function mockingExample() {
  const testApi = hcAxios.create().mock({
    'GET /users': {
      data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
      status: 200,
      delay: 100
    },
    'POST /users': {
      data: { id: 3, name: 'Bob' },
      status: 201
    },
    '/error-endpoint': {
      error: new Error('Simulated error'),
      delay: 50
    }
  });
  
  return testApi;
}

// ===========================================
// 16. ADVANCED ERROR HANDLING
// ===========================================

function errorHandlingExample() {
  // Custom error handlers for different error types
  api.useRetry({
    retries: 3,
    retryCondition: (error) => {
      // Custom retry logic
      if (error.response?.status === 429) { // Rate limited
        return true;
      }
      if (error.response?.status >= 500) { // Server errors
        return true;
      }
      if (!error.response) { // Network errors
        return true;
      }
      return false;
    },
    retryDelay: (retryCount) => {
      // Exponential backoff with jitter
      const baseDelay = 1000;
      const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
      const jitter = Math.random() * 1000;
      return exponentialDelay + jitter;
    }
  });
}

// ===========================================
// 17. PRODUCTION CONFIGURATION
// ===========================================

function productionSetup() {
  const prodApi = hcAxios.create('https://api.production.com')
    .setupProduction({
      retry: {
        retries: 2,
        retryDelay: 3000
      },
      cache: {
        maxAge: 600000, // 10 minutes
        maxSize: 100
      },
      rateLimit: {
        maxRequests: 50,
        windowMs: 60000
      },
      timeout: {
        defaultTimeout: 15000,
        endpointTimeouts: {
          '/upload': 120000,
          '/export': 300000
        }
      }
    })
    .useAuth(() => localStorage.getItem('accessToken'))
    .useRefreshToken({
      // ... refresh token config
    });
  
  return prodApi;
}

// ===========================================
// 18. COMPREHENSIVE EXAMPLE
// ===========================================

async function comprehensiveExample() {
  // Create a fully configured API client
  const comprehensiveApi = hcAxios
    .create({
      baseURL: 'https://api.example.com',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    // Authentication
    .useAuth(() => localStorage.getItem('token'))
    .useRefreshToken({
      getAccessToken: () => localStorage.getItem('accessToken'),
      getRefreshToken: () => localStorage.getItem('refreshToken'),
      setAccessToken: (token) => localStorage.setItem('accessToken', token),
      setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
      onRefreshTokenFail: () => window.location.href = '/login',
      refreshUrl: '/auth/refresh'
    })
    // Performance and reliability
    .useRetry({ retries: 3, retryDelay: 1000 })
    .useCache({ maxAge: 300000 })
    .useRateLimit({ maxRequests: 100, windowMs: 60000 })
    .useSmartTimeout({
      defaultTimeout: 15000,
      endpointTimeouts: {
        'POST /upload': 120000,
        '/heavy-task': 180000
      }
    })
    // Development features
    .useLogging({ logErrors: true })
    .useUploadProgress({
      onProgress: (info) => console.log(`Upload: ${info.percentage}%`)
    })
    // Data transformation
    .useCamelCase()
    // Request optimization
    .dedupe()
    .useQueue(5);
  
  // Usage examples
  const userResource = comprehensiveApi.resource('/users');
  
  // Create user
  const newUser = await userResource.create({
    first_name: 'John', // Will be converted to firstName in response
    last_name: 'Doe',
    email: 'john@example.com'
  });
  
  // Upload file with progress
  const fileUpload = await comprehensiveApi.uploadFile(file, {
    url: '/upload',
    onProgress: (info) => updateProgressBar(info.percentage)
  });
  
  // Paginated data
  const allUsers = await comprehensiveApi.fetchAll('/users');
  
  // Polling for job completion
  const jobResult = await comprehensiveApi.poll('/jobs/123', {
    condition: (data) => data.status === 'completed',
    interval: 2000,
    maxAttempts: 30
  });
  
  // Health check
  const health = await comprehensiveApi.healthCheck().check();
  
  console.log('API Status:', comprehensiveApi.getInterceptorStatus());
  console.log('Metrics:', comprehensiveApi.getMetrics());
}

// Helper function for progress updates
function updateProgressBar(percentage) {
  const progressBar = document.getElementById('upload-progress');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
  }
}

// Export examples for use
export {
  uploadFileExample,
  paginationExample,
  cachingExample,
  cancellationExample,
  batchExample,
  pollingExample,
  resourceExample,
  healthCheckExample,
  mockingExample,
  comprehensiveExample
};