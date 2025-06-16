import hcAxios from 'hc-axios';

// Create an API instance
const api = hcAxios.create('https://jsonplaceholder.typicode.com');

// Configure authentication
api.useAuth(() => {
  // In a real app, this would return your auth token
  return 'fake-jwt-token';
});

// Configure retry logic
api.useRetry({
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx responses
    return !error.response || error.response.status >= 500;
  }
});

// Enable logging in development
if (process.env.NODE_ENV === 'development') {
  api.useLogging({
    logRequests: true,
    logResponses: true,
    logErrors: true
  });
}

// Example: Fetch users
async function fetchUsers() {
  try {
    const { data } = await api.get('/users');
    console.log(`Fetched ${data.length} users`);
    return data;
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
    throw error;
  }
}

// Example: Create a new post
async function createPost(title, body) {
  try {
    const { data } = await api.post('/posts', {
      title,
      body,
      userId: 1
    });
    console.log('Created post:', data);
    return data;
  } catch (error) {
    console.error('Failed to create post:', error.message);
    throw error;
  }
}

// Example: Update a post
async function updatePost(id, updates) {
  try {
    const { data } = await api.patch(`/posts/${id}`, updates);
    console.log('Updated post:', data);
    return data;
  } catch (error) {
    console.error('Failed to update post:', error.message);
    throw error;
  }
}

// Example: Delete a post
async function deletePost(id) {
  try {
    await api.delete(`/posts/${id}`);
    console.log(`Deleted post ${id}`);
  } catch (error) {
    console.error('Failed to delete post:', error.message);
    throw error;
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 Running hc-axios examples...\n');
  
  // Check interceptor status
  console.log('Interceptor status:', api.getInterceptorStatus());
  console.log('');
  
  // Fetch users
  console.log('1. Fetching users...');
  const users = await fetchUsers();
  console.log(`   First user: ${users[0].name}\n`);
  
  // Create a post
  console.log('2. Creating a post...');
  const newPost = await createPost(
    'Hello from hc-axios!',
    'This is a test post created with hc-axios'
  );
  console.log(`   Post ID: ${newPost.id}\n`);
  
  // Update the post
  console.log('3. Updating the post...');
  await updatePost(1, { title: 'Updated title' });
  console.log('');
  
  // Delete a post
  console.log('4. Deleting a post...');
  await deletePost(1);
  console.log('');
  
  console.log('✅ All examples completed!');
}

// Run the examples
runExamples().catch(console.error);