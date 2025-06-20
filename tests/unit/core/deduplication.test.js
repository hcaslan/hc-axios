import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachDeduplication } from '../../../lib/core/deduplication.js';

describe('Deduplication', () => {
  let mockInstance;
  let originalRequest;

  beforeEach(() => {
    originalRequest = jest.fn();
    mockInstance = {
      request: originalRequest
    };
  });

  test('should deduplicate identical requests', async () => {
    attachDeduplication(mockInstance);
    mockInstance.dedupe();

    const config = { method: 'get', url: '/api/data' };
    originalRequest.mockResolvedValueOnce({ data: 'response' });

    // Make two identical requests simultaneously
    const promise1 = mockInstance.request(config);
    const promise2 = mockInstance.request(config);

    const [response1, response2] = await Promise.all([promise1, promise2]);

    // Should only make one actual request
    expect(originalRequest).toHaveBeenCalledTimes(1);
    expect(response1.data).toBe('response');
    expect(response2.data).toBe('response');
  });

  test('should not deduplicate different requests', async () => {
    attachDeduplication(mockInstance);
    mockInstance.dedupe();

    originalRequest.mockResolvedValueOnce({ data: 'response1' });
    originalRequest.mockResolvedValueOnce({ data: 'response2' });

    const promise1 = mockInstance.request({ url: '/api/data1' });
    const promise2 = mockInstance.request({ url: '/api/data2' });

    const [response1, response2] = await Promise.all([promise1, promise2]);

    expect(originalRequest).toHaveBeenCalledTimes(2);
    expect(response1.data).toBe('response1');
    expect(response2.data).toBe('response2');
  });

  test('should clear dedupe cache', () => {
    attachDeduplication(mockInstance);
    mockInstance.dedupe();

    mockInstance.clearDedupe();
    const stats = mockInstance.getDedupeStats();
    expect(stats.pendingRequests).toBe(0);
  });
});