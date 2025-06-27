import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachCircuitBreaker } from '../../../lib/core/circuitBreaker';

describe('CircuitBreaker', () => {
  let mockInstance;
  let originalRequest;

  beforeEach(() => {
    originalRequest = jest.fn();
    mockInstance = {
      request: originalRequest
    };
  });

  test('should attach circuit breaker methods to instance', () => {
    attachCircuitBreaker(mockInstance);

    expect(mockInstance.withCircuitBreaker).toBeDefined();
    expect(typeof mockInstance.withCircuitBreaker).toBe('function');
  });

  test('should allow requests when circuit is closed', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 3 });

    originalRequest.mockResolvedValueOnce({ data: 'success' });

    const response = await mockInstance.request({ url: '/test' });
    expect(response.data).toBe('success');
    expect(originalRequest).toHaveBeenCalled();
  });

  test('should open circuit after failure threshold', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 2 });

    // Simulate failures
    originalRequest.mockRejectedValue(new Error('Network error'));

    // First two failures should go through
    await expect(mockInstance.request({})).rejects.toThrow('Network error');
    await expect(mockInstance.request({})).rejects.toThrow('Network error');

    // Third request should be blocked by open circuit
    await expect(mockInstance.request({})).rejects.toThrow('Circuit breaker is OPEN');
    expect(originalRequest).toHaveBeenCalledTimes(2);
  });

  test('should provide circuit breaker status', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 2 });

    const status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.failures).toBe(0);
    expect(status.isClosed).toBe(true);
  });

  test('should handle monitoring period reset', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ 
      failureThreshold: 2, 
      monitoringPeriod: 100 
    });

    // Cause one failure
    originalRequest.mockRejectedValueOnce(new Error('Network error'));
    await expect(mockInstance.request({})).rejects.toThrow('Network error');

    // Wait for monitoring period to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should reset failure count - next failure should not open circuit
    originalRequest.mockRejectedValueOnce(new Error('Another error'));
    await expect(mockInstance.request({})).rejects.toThrow('Another error');

    // Circuit should still be closed after reset
    const status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.failures).toBe(1); // Reset count, this is the first failure in new period
  });

  test('should limit concurrent requests in half-open state', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ 
      failureThreshold: 1,
      resetTimeout: 50
    });

    // Open circuit with failure
    originalRequest.mockRejectedValueOnce(new Error('Failure'));
    await expect(mockInstance.request({})).rejects.toThrow('Failure');

    // Verify circuit is open
    let status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('OPEN');

    // Wait for reset timeout to move to half-open
    await new Promise(resolve => setTimeout(resolve, 60));

    // Mock slow response to test concurrent limit
    originalRequest.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: 'slow' }), 100))
    );

    // First request should go through (moves to half-open)
    const firstRequest = mockInstance.request({});

    // Second concurrent request should be blocked
    await expect(mockInstance.request({}))
      .rejects.toThrow('Circuit breaker is HALF_OPEN - request limit reached');

    // Wait for first request to complete
    await firstRequest;
  });

  test('should manually reset circuit breaker', () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 1 });

    // Open circuit manually
    mockInstance.openCircuitBreaker();
    let status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('OPEN');
    expect(status.lastFailureTime).toBeGreaterThan(0);

    // Reset circuit manually
    mockInstance.resetCircuitBreaker();
    status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.failures).toBe(0);
    expect(status.lastFailureTime).toBe(0);
  });

  test('should manually open circuit breaker and return instance', () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 5 });

    const result = mockInstance.openCircuitBreaker();
    
    expect(result).toBe(mockInstance); // Should return instance for chaining
    
    const status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('OPEN');
    expect(status.isOpen).toBe(true);
  });

  test('should reset circuit breaker and return instance', () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 1 });

    const result = mockInstance.resetCircuitBreaker();
    
    expect(result).toBe(mockInstance); // Should return instance for chaining
    
    const status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.isClosed).toBe(true);
  });

  test('should use custom failure detection', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ 
      failureThreshold: 2,
      isFailure: (error) => error.message.includes('critical')
    });

    // Non-critical error shouldn't count towards failure threshold
    originalRequest.mockRejectedValueOnce(new Error('minor issue'));
    await expect(mockInstance.request({})).rejects.toThrow('minor issue');

    // Critical error should count
    originalRequest.mockRejectedValueOnce(new Error('critical failure'));
    await expect(mockInstance.request({})).rejects.toThrow('critical failure');
    
    // Another critical error should open circuit
    originalRequest.mockRejectedValueOnce(new Error('critical system failure'));
    await expect(mockInstance.request({})).rejects.toThrow('critical system failure');

    // Circuit should be open now
    await expect(mockInstance.request({}))
      .rejects.toThrow('Circuit breaker is OPEN');
  });

  test('should add circuit breaker info to errors', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 2 });

    const originalError = new Error('Network error');
    originalRequest.mockRejectedValueOnce(originalError);

    try {
      await mockInstance.request({});
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBe(originalError);
      expect(error.circuitBreakerState).toBe('CLOSED');
      expect(error.circuitBreakerFailures).toBe(1);
    }
  });

  test('should provide complete circuit breaker status', () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 3 });

    const status = mockInstance.getCircuitBreakerStatus();
    
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('failures');
    expect(status).toHaveProperty('lastFailureTime');
    expect(status).toHaveProperty('isOpen');
    expect(status).toHaveProperty('isHalfOpen');
    expect(status).toHaveProperty('isClosed');
    
    expect(status.state).toBe('CLOSED');
    expect(status.failures).toBe(0);
    expect(status.lastFailureTime).toBe(0);
    expect(status.isOpen).toBe(false);
    expect(status.isHalfOpen).toBe(false);
    expect(status.isClosed).toBe(true);
  });

  test('should transition from half-open to closed on success', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ 
      failureThreshold: 1,
      resetTimeout: 50
    });

    // Open circuit
    originalRequest.mockRejectedValueOnce(new Error('Failure'));
    await expect(mockInstance.request({})).rejects.toThrow('Failure');

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 60));

    // Successful request should close circuit
    originalRequest.mockResolvedValueOnce({ data: 'success' });
    const response = await mockInstance.request({});

    expect(response.data).toBe('success');
    
    const status = mockInstance.getCircuitBreakerStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.failures).toBe(0);
  });

  test('should handle error states correctly', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ failureThreshold: 1 });

    // Open circuit
    originalRequest.mockRejectedValueOnce(new Error('Error'));
    await expect(mockInstance.request({})).rejects.toThrow('Error');

    // Verify OPEN error
    try {
      await mockInstance.request({});
      fail('Should have thrown circuit open error');
    } catch (error) {
      expect(error.message).toBe('Circuit breaker is OPEN');
      expect(error.code).toBe('ECIRCUITOPEN');
      expect(error.circuitBreakerState).toBe('OPEN');
    }
  });

  test('should decrement half-open requests on error', async () => {
    attachCircuitBreaker(mockInstance);
    mockInstance.withCircuitBreaker({ 
      failureThreshold: 1,
      resetTimeout: 50
    });

    // Open circuit
    originalRequest.mockRejectedValueOnce(new Error('Initial failure'));
    await expect(mockInstance.request({})).rejects.toThrow('Initial failure');

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 60));

    // First request in half-open should fail and increment failures
    originalRequest.mockRejectedValueOnce(new Error('Half-open failure'));
    
    try {
      await mockInstance.request({});
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Half-open failure');
      expect(error.circuitBreakerState).toBe('HALF_OPEN');
    }

    // Circuit should remain in HALF_OPEN or go back to OPEN
    const status = mockInstance.getCircuitBreakerStatus();
    expect(['HALF_OPEN', 'OPEN']).toContain(status.state);
  });
});