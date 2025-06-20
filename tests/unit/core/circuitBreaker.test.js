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
});