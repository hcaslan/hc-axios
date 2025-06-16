# hc-axios

> ⚠️ **Pre-release**: This package is in active development (v0.0.x series). API may change before v0.1.0.

A powerful wrapper around Axios that simplifies token management, adds retry logic, provides useful debugging features, and eliminates common boilerplate patterns with advanced utilities.

## Installation

```bash
npm install hc-axios
```

## Features

- 🔐 **Automatic token injection** - Seamlessly add auth tokens to requests
- 🔄 **Smart token refresh** - Auto-refresh tokens on 401 responses
- 🔁 **Retry mechanism** - Configurable retry logic for failed requests
- 📝 **Request/Response logging** - Built-in debugging tools
- 📦 **File upload with progress** - Built-in upload progress tracking
- 🔄 **Smart pagination** - Automatic pagination handling
- 💾 **Response caching** - Intelligent caching with TTL
- ⏱️ **Smart timeouts** - Per-endpoint timeout configuration
- 🚦 **Rate limiting** - Built-in request throttling
- ❌ **Request cancellation** - Easy cancellation and deduplication
- 📊 **Polling utilities** - Simplified polling with conditions
- 🔗 **RESTful resources** - Auto-generated CRUD operations
- 🏥 **Circuit breaker** - Automatic failure detection
- 🎯 **Batch requests** - Efficient concurrent request handling
- 🧪 **Mock support** - Easy mocking for testing
- 📈 **Performance monitoring** - Built-in metrics and status
- 🎯 **TypeScript support** - Full type definitions included
- 🔗 **Chainable API** - Fluent interface for easy configuration
- 🪶 **Lightweight** - Minimal dependencies

## Quick Start

```javascript
import hcAxios from 'hc-axios';

// Create an instance
const api = hcAxios.create('https://api.example.com');

// Add authentication
api.useAuth(() => localStorage.getItem('accessToken'));

// Use it like regular axios
const response = await api.get('/users');
```

## API Reference

### Creating an Instance

```javascript
import hcAxios from 'hc-axios';

// With base URL string
const api = hcAxios.create('https://api.example.com');

// With config object
const api = hcAxios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Authentication

```javascript
// Simple auth token
api.useAuth(() => localStorage.getItem('accessToken'));

// Remove auth
api.removeAuth();
```

### Refresh Token Handling

```javascript
api.useRefreshToken({
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setAccessToken: (token) => localStorage.setItem('accessToken', token),
  setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
  onRefreshTokenFail: () => {
    // Handle refresh failure (e.g., redirect to login)
    window.location.href = '/login';
  },
  refreshUrl: '/auth/refresh'
});

// Remove refresh token handling
api.removeRefreshToken();
```

### Retry Logic

```javascript
// Basic retry with defaults (3 retries, 1s delay, retry on 5xx and network errors)
api.useRetry();

// Custom retry configuration
api.useRetry({
  retries: 5,
  retryDelay: (retryCount) => retryCount * 1000, // Progressive delay
  retryCondition: (error) => {
    // Retry on network errors and specific status codes
    return !error.response || [408, 429, 500, 502, 503, 504].includes(error.response.status);
  }
});

// Remove retry
api.removeRetry();
```

### Request/Response Logging

```javascript
// Basic logging
api.useLogging();

// Custom logging configuration
api.useLogging({
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logger: customLogger, // Must have .log() and .error() methods
  requestFormatter: (config) => ({
    method: config.method,
    url: config.url,
    timestamp: new Date().toISOString()
  }),
  responseFormatter: (response) => ({
    status: response.status,
    duration: response.config.metadata?.duration
  })
});

// Remove logging
api.removeLogging();
```

### File Upload with Progress Tracking

Eliminate complex file upload boilerplate with built-in progress tracking.

```javascript
// Enable upload progress tracking
api.useUploadProgress({
  onProgress: (info) => {
    console.log(`Upload: ${info.percentage}%`);
    console.log(`Speed: ${info.speed} bytes/sec`);
    console.log(`Remaining: ${info.remaining} bytes`);
  },
  onComplete: (response, duration) => {
    console.log(`Upload completed in ${duration}ms`);
  }
});

// Simple file upload
const response = await api.uploadFile(file, {
  url: '/upload',
  fieldName: 'document',
  headers: { 'X-Upload-Type': 'document' }
});
```

### Smart Pagination

Automatically handle paginated APIs without repetitive code.

```javascript
// Fetch all paginated data automatically
const allUsers = await api.fetchAll('/users', {
  params: { status: 'active' }
});

// Or iterate through pages for memory efficiency
for await (const page of api.paginate('/posts')) {
  console.log(`Page ${page.page}: ${page.data.length} posts`);
  console.log(`Total: ${page.total}, Has more: ${page.hasMore}`);
  
  // Process each page
  page.data.forEach(post => {
    console.log(`- ${post.title}`);
  });
}
```

### Response Caching

Built-in intelligent caching eliminates redundant requests.

```javascript
// Enable caching
api.useCache({
  maxAge: 300000, // 5 minutes
  maxSize: 50,
  keyGenerator: (config) => `${config.method}:${config.url}:${JSON.stringify(config.params)}`
});

// First request hits the server
const response1 = await api.get('/users');

// Second request within 5 minutes is served from cache
const response2 = await api.get('/users'); // Cached!
```

### Smart Timeouts

Configure different timeouts for different endpoints automatically.

```javascript
api.useSmartTimeout({
  defaultTimeout: 5000,
  endpointTimeouts: {
    'POST /upload': 60000,        // 1 minute for uploads
    '/heavy-computation': 120000, // 2 minutes for heavy tasks
    'GET /quick': 2000           // 2 seconds for quick requests
  },
  onTimeout: (error, config) => {
    console.log(`Request to ${config.url} timed out`);
  }
});
```

### Rate Limiting

Prevent overwhelming APIs with built-in rate limiting.

```javascript
api.useRateLimit({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  onLimit: (error, config) => {
    console.warn('Rate limit exceeded, backing off...');
  }
});
```

### Request Cancellation & Deduplication

Easy request cancellation and automatic deduplication.

```javascript
// Cancellable requests
const searchPromise = api.cancellable('search', {
  method: 'GET',
  url: '/search',
  params: { q: 'javascript' }
});

// Cancel by key
setTimeout(() => api.cancel('search'), 5000);

// Request deduplication - prevents duplicate requests
api.dedupe();
// Now multiple identical requests will only execute once
```

### Polling Made Simple

Simplified polling with conditions and error handling.

```javascript
const result = await api.poll('/job/status/123', {
  interval: 2000,
  maxAttempts: 30,
  condition: (data) => data.status === 'completed',
  onUpdate: (response, attempt) => {
    console.log(`Attempt ${attempt}: Status is ${response.data.status}`);
  },
  onError: (error, attempt) => {
    console.warn(`Polling attempt ${attempt} failed:`, error.message);
    return attempt < 5; // Continue for first 5 errors
  }
});
```

### RESTful Resource Helpers

Generate RESTful API methods automatically.

```javascript
// Create a resource helper for users
const users = api.resource('/users');

// All CRUD operations available
const user = await users.get(123);
const newUser = await users.create({ name: 'John', email: 'john@example.com' });
const updated = await users.update(123, { name: 'Jane' });
const patched = await users.patch(123, { email: 'jane@example.com' });
await users.delete(123);
const userList = await users.list({ active: true });
```

### Circuit Breaker Pattern

Automatic circuit breaker for unreliable services.

```javascript
const robustApi = api.withCircuitBreaker({
  failureThreshold: 5,    // Open circuit after 5 failures
  resetTimeout: 30000,    // Try again after 30 seconds
  monitoringPeriod: 60000 // Reset failure count every minute
});

// Circuit breaker automatically prevents requests when service is down
```

### Batch Requests

Combine multiple requests efficiently.

```javascript
const requests = [
  () => api.get('/users/1'),
  () => api.get('/users/2'),
  () => api.get('/posts/1'),
  { method: 'GET', url: '/comments/1' }
];

const results = await api.batch(requests);
console.log('All requests completed:', results);

// Or with concurrency limiting
const results = await api.concurrent(requests, 3); // Max 3 concurrent
```

### Response Transformation

Automatic data transformation eliminates manual conversion.

```javascript
// Automatic camelCase conversion
api.useCamelCase();
// API returns: { user_name: "john", first_name: "John" }
// Response data: { userName: "john", firstName: "John" }

// Custom transformations
api.useResponseTransform((data) => ({
  ...data,
  _receivedAt: new Date().toISOString()
}));
```

### Health Check Monitoring

Built-in service health monitoring.

```javascript
const healthCheck = api.healthCheck('/health');

const status = await healthCheck.check();
if (status.healthy) {
  console.log('Service is healthy');
} else {
  console.error('Service is down:', status.error);
}
```

### Mock Responses for Testing

Easy mocking for development and testing.

```javascript
const testApi = api.mock({
  'GET /users': {
    data: [{ id: 1, name: 'John' }],
    delay: 100
  },
  'POST /users': {
    data: { id: 2, name: 'Jane' },
    status: 201
  },
  '/error': {
    error: new Error('Simulated error')
  }
});

// Requests will return mocked responses
const users = await testApi.get('/users'); // Returns mocked data

// Remove mocking
testApi.unmock();
```

### Method Chaining

All configuration methods return the instance for chaining:

```javascript
const api = hcAxios
  .create('https://api.example.com')
  .useAuth(() => getToken())
  .useRetry({ retries: 3 })
  .useCache({ maxAge: 300000 })
  .useRateLimit({ maxRequests: 100 })
  .useLogging({ logErrors: true })
  .useCamelCase()
  .dedupe();
```

### Quick Auth Setup

Configure authentication and refresh tokens in one call:

```javascript
api.setupAuth({
  getToken: () => localStorage.getItem('accessToken'),
  refresh: {
    getAccessToken: () => localStorage.getItem('accessToken'),
    getRefreshToken: () => localStorage.getItem('refreshToken'),
    setAccessToken: (token) => localStorage.setItem('accessToken', token),
    setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
    onRefreshTokenFail: () => window.location.href = '/login',
    refreshUrl: '/auth/refresh'
  }
});
```

### Environment-Specific Setups

Pre-configured setups for different environments.

```javascript
// Development setup with debugging features
api.setupDevelopment({
  uploadProgress: {
    onProgress: (info) => console.log(`Upload: ${info.percentage}%`)
  },
  timeout: {
    defaultTimeout: 15000,
    endpointTimeouts: {
      'POST /upload': 60000
    }
  }
});

// Production setup with performance optimizations
api.setupProduction({
  cache: { maxAge: 600000 }, // 10 minutes
  rateLimit: { maxRequests: 50, windowMs: 60000 },
  retry: { retries: 2, retryDelay: 3000 },
  timeout: { defaultTimeout: 30000 }
});
```

### Check Interceptor Status

```javascript
const status = api.getInterceptorStatus();
console.log(status);
// {
//   auth: true,
//   refreshToken: true,
//   retry: false,
//   logging: true,
//   uploadProgress: false,
//   cache: true,
//   smartTimeout: true,
//   rateLimit: false
// }

// Get performance metrics
const metrics = api.getMetrics();
console.log(metrics);
// {
//   requestQueue: {
//     running: 2,
//     queued: 5
//   }
// }
```

## Advanced Examples

### Custom Refresh Token Request

```javascript
api.useRefreshToken({
  // ... other options
  refreshRequestConfig: (refreshToken) => ({
    method: 'post',
    url: '/auth/refresh',
    headers: {
      'X-Refresh-Token': refreshToken
    },
    data: {
      grantType: 'refresh_token',
      refreshToken
    }
  }),
  handleRefreshResponse: (response) => ({
    token: response.data.access_token,
    refreshToken: response.data.refresh_token
  })
});
```

### Advanced Retry with Exponential Backoff

```javascript
const response = await api.retryRequest({
  method: 'GET',
  url: '/unstable-endpoint'
}, {
  retries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2 // 1s, 2s, 4s, 8s, 16s delays
});
```

### Request Queue Management

```javascript
// Limit concurrent requests
api.useQueue(3); // Max 3 concurrent requests

// Check queue status
const metrics = api.getMetrics();
console.log(`Running: ${metrics.requestQueue.running}, Queued: ${metrics.requestQueue.queued}`);
```

## Framework Integration

### React Integration

```javascript
// api/client.js
import hcAxios from 'hc-axios';
import { authStore } from '../stores/auth';

const api = hcAxios
  .create(process.env.REACT_APP_API_URL)
  .useAuth(() => authStore.accessToken)
  .useRefreshToken({
    getAccessToken: () => authStore.accessToken,
    getRefreshToken: () => authStore.refreshToken,
    setAccessToken: (token) => authStore.setAccessToken(token),
    setRefreshToken: (token) => authStore.setRefreshToken(token),
    onRefreshTokenFail: () => authStore.logout(),
    refreshUrl: '/auth/refresh'
  })
  .useRetry()
  .useCache({ maxAge: 300000 })
  .useLogging({ logErrors: process.env.NODE_ENV === 'development' });

export default api;
```

### Vue 3 Plugin

```javascript
// plugins/api.js
import hcAxios from 'hc-axios';

export default {
  install(app, options) {
    const api = hcAxios.create(options.baseURL);
    
    // Configure based on options
    if (options.auth) {
      api.setupAuth(options.auth);
    }
    
    if (options.retry) {
      api.useRetry(options.retry);
    }
    
    if (options.debug) {
      api.useLogging();
    }
    
    app.config.globalProperties.$api = api;
    app.provide('api', api);
  }
};

// main.js
app.use(apiPlugin, {
  baseURL: import.meta.env.VITE_API_URL,
  auth: {
    getToken: () => localStorage.getItem('token'),
    // ... refresh config
  },
  retry: true,
  debug: import.meta.env.DEV
});
```

### Next.js Integration

```javascript
// lib/api.js
import hcAxios from 'hc-axios';

const api = hcAxios.create(process.env.NEXT_PUBLIC_API_URL);

// Client-side only configuration
if (typeof window !== 'undefined') {
  api.useAuth(() => localStorage.getItem('accessToken'))
     .useRefreshToken({
       // ... refresh config
     })
     .useCache({ maxAge: 300000 });
}

export default api;
```

### Error Handling

```javascript
try {
  const response = await api.get('/users');
  console.log(response.data);
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Server error:', error.response.status);
  } else if (error.request) {
    // Request made but no response
    console.error('Network error');
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript support with detailed type definitions:

```typescript
import hcAxios, { HCAxiosInstance, RefreshTokenOptions } from 'hc-axios';

// Typed instance
const api: HCAxiosInstance = hcAxios.create({
  baseURL: 'https://api.example.com'
});

// Typed configuration
const refreshOptions: RefreshTokenOptions = {
  getAccessToken: () => tokenStore.accessToken,
  getRefreshToken: () => tokenStore.refreshToken,
  setAccessToken: (token: string) => tokenStore.setAccessToken(token),
  setRefreshToken: (token: string) => tokenStore.setRefreshToken(token),
  onRefreshTokenFail: () => router.push('/login'),
  refreshUrl: '/auth/refresh'
};

api.useRefreshToken(refreshOptions);

// Type-safe responses
interface User {
  id: number;
  name: string;
  email: string;
}

const { data } = await api.get<User[]>('/users');
// data is typed as User[]

// Typed resource operations
const users = api.resource<User>('/users');
const user = await users.get(1); // Returns Promise<AxiosResponse<User>>
const newUser = await users.create({ name: 'John', email: 'john@example.com' });
```


## Migration from Axios

hc-axios is built on top of axios, so migration is straightforward:

```javascript
// Before (axios)
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com'
});

api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

// After (hc-axios)
import hcAxios from 'hc-axios';

const api = hcAxios
  .create('https://api.example.com')
  .useAuth(() => getToken());
```

## Performance Comparison

### Before vs After Code Reduction

| Feature | Vanilla Axios | hc-axios | Reduction |
|---------|---------------|----------|-----------|
| File upload with progress | 50+ lines | 3 lines | 90%+ |
| Pagination handling | 20+ lines | 1 line | 95%+ |
| Request caching | 100+ lines | 1 line | 99%+ |
| RESTful CRUD operations | 30+ lines | 5 lines | 85%+ |
| Request retry logic | 40+ lines | 1 line | 97%+ |
| Authentication handling | 25+ lines | 2 lines | 92%+ |

### Performance Benefits

- **Request Queue**: Prevents browser connection limits, improves performance
- **Caching**: Reduces network requests by up to 80% for repeated calls
- **Deduplication**: Eliminates redundant requests completely
- **Circuit Breaker**: Prevents cascade failures in microservice architectures
- **Smart Timeouts**: Reduces hanging requests and improves user experience
- **Rate Limiting**: Protects APIs from overload

## Comparison with Axios

| Feature | axios | hc-axios |
|---------|-------|----------|
| HTTP requests | ✅ | ✅ |
| Interceptors | ✅ | ✅ |
| Auth token injection | Manual setup | `api.useAuth()` |
| Token refresh | Manual setup | `api.useRefreshToken()` |
| Retry logic | Manual/3rd party | `api.useRetry()` |
| Request logging | Manual setup | `api.useLogging()` |
| File upload progress | Manual setup | `api.useUploadProgress()` |
| Response caching | Manual/3rd party | `api.useCache()` |
| Pagination | Manual loops | `api.fetchAll()` / `api.paginate()` |
| Rate limiting | 3rd party | `api.useRateLimit()` |
| Request cancellation | Manual setup | `api.cancellable()` / `api.cancel()` |
| Circuit breaker | 3rd party | `api.withCircuitBreaker()` |
| RESTful resources | Manual CRUD | `api.resource()` |
| Health monitoring | Manual setup | `api.healthCheck()` |
| Mock responses | 3rd party | `api.mock()` |
| TypeScript | ✅ | ✅ Enhanced |
| Chainable config | ❌ | ✅ |

## Browser Support

hc-axios supports all modern browsers and Node.js environments that support:
- ES6+ features
- Promise API
- AbortController (for request cancellation)
- FormData (for file uploads)

For older browsers, appropriate polyfills may be required.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues, please file them in the [GitHub Issues](https://github.com/hcaslan/hc-axios/issues) section.

## License

MIT © Heval Can Aslan Özen

---