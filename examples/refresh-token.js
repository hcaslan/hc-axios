import hcAxios from 'hc-axios';

// Simulated token storage
class TokenStore {
  constructor() {
    this.accessToken = 'initial-access-token';
    this.refreshToken = 'initial-refresh-token';
  }
  
  getAccessToken() {
    return this.accessToken;
  }
  
  getRefreshToken() {
    return this.refreshToken;
  }
  
  setAccessToken(token) {
    console.log('📝 Storing new access token:', token);
    this.accessToken = token;
  }
  
  setRefreshToken(token) {
    console.log('📝 Storing new refresh token:', token);
    this.refreshToken = token;
  }
  
  clear() {
    console.log('🗑️ Clearing tokens');
    this.accessToken = null;
    this.refreshToken = null;
  }
}

const tokenStore = new TokenStore();

// Create API instance with mock server
const api = hcAxios.create('http://localhost:3000'); // You'd use your real API URL

// Setup authentication with refresh token support
api.setupAuth({
  getToken: () => tokenStore.getAccessToken(),
  refresh: {
    getAccessToken: () => tokenStore.getAccessToken(),
    getRefreshToken: () => tokenStore.getRefreshToken(),
    setAccessToken: (token) => tokenStore.setAccessToken(token),
    setRefreshToken: (token) => tokenStore.setRefreshToken(token),
    onRefreshTokenFail: () => {
      console.error('❌ Refresh token failed! Redirecting to login...');
      tokenStore.clear();
      // In a real app: window.location.href = '/login';
    },
    refreshUrl: '/auth/refresh',
    
    // Custom refresh request configuration
    refreshRequestConfig: (refreshToken) => ({
      method: 'post',
      url: '/auth/refresh',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    }),
    
    // Custom response handler for non-standard API responses
    handleRefreshResponse: (response) => {
      // Handle your API's specific response format
      return {
        token: response.data.access_token,
        refreshToken: response.data.refresh_token
      };
    }
  }
});

// Enable logging to see what's happening
api.useLogging({
  requestFormatter: (config) => ({
    method: config.method?.toUpperCase(),
    url: config.url,
    auth: config.headers?.Authorization ? '✅ Has auth header' : '❌ No auth header'
  }),
  responseFormatter: (response) => ({
    status: response.status,
    url: response.config.url
  }),
  errorFormatter: (error) => ({
    message: error.message,
    status: error.response?.status,
    url: error.config?.url
  })
});

// Example API calls
async function demonstrateRefreshFlow() {
  console.log('🔄 Demonstrating token refresh flow\n');
  
  try {
    // This call should work with the initial token
    console.log('1️⃣ Making authenticated request...');
    const response1 = await api.get('/api/user/profile');
    console.log('✅ Success:', response1.data);
    console.log('');
    
    // Simulate token expiration
    console.log('2️⃣ Simulating token expiration...');
    tokenStore.setAccessToken('expired-token');
    console.log('');
    
    // This call should trigger refresh
    console.log('3️⃣ Making request with expired token...');
    console.log('   (Should trigger automatic refresh)');
    const response2 = await api.get('/api/user/profile');
    console.log('✅ Success after refresh:', response2.data);
    console.log('');
    
    // Check that we have new tokens
    console.log('4️⃣ Verifying tokens were updated:');
    console.log('   Access token:', tokenStore.getAccessToken());
    console.log('   Refresh token:', tokenStore.getRefreshToken());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Mock server setup (for demonstration)
console.log('💡 To run this example, you need a mock server that:');
console.log('   - Returns 401 for expired tokens');
console.log('   - Has a /auth/refresh endpoint');
console.log('   - Has a /api/user/profile endpoint');
console.log('');
console.log('Or modify the example to use your actual API endpoints.\n');

// Uncomment to run the demonstration
// demonstrateRefreshFlow();