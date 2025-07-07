import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BatchRequestManager } from '../../../lib/utils/batchRequests.js';

describe('BatchRequestManager', () => {
  let mockInstance;
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock axios instance
    mockInstance = {
      post: jest.fn()
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      manager = new BatchRequestManager(mockInstance);

      expect(manager.instance).toBe(mockInstance);
      expect(manager.batchSize).toBe(10);
      expect(manager.delay).toBe(100);
      expect(manager.endpoint).toBe('/batch');
      expect(manager.queue).toEqual([]);
      expect(manager.processing).toBe(false);
    });

    test('should initialize with custom options', () => {
      const options = {
        batchSize: 5,
        delay: 200,
        endpoint: '/api/batch'
      };

      manager = new BatchRequestManager(mockInstance, options);

      expect(manager.batchSize).toBe(5);
      expect(manager.delay).toBe(200);
      expect(manager.endpoint).toBe('/api/batch');
    });
  });

  describe('add', () => {
    beforeEach(() => {
      manager = new BatchRequestManager(mockInstance, { delay: 50 });
    });

    test('should add request to queue and return promise', async () => {
      const config = { method: 'GET', url: '/api/users' };
      
      // Mock successful batch response
      mockInstance.post.mockResolvedValueOnce({
        data: [{ success: true, data: { users: [] } }]
      });

      const promise = manager.add(config);
      expect(manager.queue).toHaveLength(1);
      expect(manager.queue[0].config).toEqual(config);
      expect(manager.processing).toBe(true);

      // Run timers to process the batch
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toEqual({ success: true, data: { users: [] } });
    });

    test('should process multiple requests in a single batch', async () => {
      const configs = [
        { method: 'GET', url: '/api/users' },
        { method: 'POST', url: '/api/posts', data: { title: 'Test' } },
        { method: 'DELETE', url: '/api/users/1' }
      ];

      // Mock batch response with multiple results
      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { users: [] } },
          { success: true, data: { id: 123, title: 'Test' } },
          { success: true, data: { deleted: true } }
        ]
      });

      const promises = configs.map(config => manager.add(config));
      expect(manager.queue).toHaveLength(3);

      await jest.runAllTimersAsync();

      const results = await Promise.all(promises);
      
      expect(mockInstance.post).toHaveBeenCalledWith('/batch', {
        requests: [
          { method: 'GET', url: '/api/users', data: undefined, params: undefined, headers: undefined },
          { method: 'POST', url: '/api/posts', data: { title: 'Test' }, params: undefined, headers: undefined },
          { method: 'DELETE', url: '/api/users/1', data: undefined, params: undefined, headers: undefined }
        ]
      });

      expect(results[0]).toEqual({ success: true, data: { users: [] } });
      expect(results[1]).toEqual({ success: true, data: { id: 123, title: 'Test' } });
      expect(results[2]).toEqual({ success: true, data: { deleted: true } });
    });

    test('should not start processing timer if already processing', async () => {
      manager.processing = true;
      
      const config = { method: 'GET', url: '/api/test' };
      manager.add(config);

      expect(manager.queue).toHaveLength(1);
      expect(manager.processing).toBe(true);
    });
  });

  describe('processBatch', () => {
    beforeEach(() => {
      manager = new BatchRequestManager(mockInstance, { 
        batchSize: 3, 
        delay: 50 
      });
    });

    test('should process empty queue', async () => {
      manager.processing = true;
      manager.queue = [];

      await manager.processBatch();

      expect(manager.processing).toBe(false);
      expect(mockInstance.post).not.toHaveBeenCalled();
    });

    test('should process batch with size limit', async () => {
      // Add 5 requests but batch size is 3
      const configs = Array(5).fill(null).map((_, i) => ({
        method: 'GET',
        url: `/api/item/${i}`
      }));

      // Mock response for first batch (3 items)
      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { id: 0 } },
          { success: true, data: { id: 1 } },
          { success: true, data: { id: 2 } }
        ]
      });

      // Mock response for second batch (2 items)
      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { id: 3 } },
          { success: true, data: { id: 4 } }
        ]
      });

      const promises = configs.map(config => manager.add(config));
      
      // Run all timers to process all batches
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(mockInstance.post).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(5);
      expect(results.map(r => r.data.id)).toEqual([0, 1, 2, 3, 4]);
    });

    test('should handle successful batch requests', async () => {
      const configs = [
        { method: 'GET', url: '/api/users' },
        { method: 'POST', url: '/api/posts', data: { title: 'Test' } }
      ];

      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { users: [] } },
          { success: true, data: { id: 123, title: 'Test' } }
        ]
      });

      const promises = configs.map(config => manager.add(config));
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(results[0]).toEqual({ success: true, data: { users: [] } });
      expect(results[1]).toEqual({ success: true, data: { id: 123, title: 'Test' } });
    });

    test('should handle all failed requests in a batch', async () => {
      const configs = [
        { method: 'GET', url: '/api/fail1' },
        { method: 'GET', url: '/api/fail2' }
      ];

      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: false, error: 'Error 1' },
          { success: false, error: 'Error 2' }
        ]
      });

      const settledPromise = Promise.allSettled(
        configs.map(config => manager.add(config))
      );
      
      await jest.runAllTimersAsync();
      const results = await settledPromise;
      
      expect(results[0].status).toBe('rejected');
      expect(results[0].reason).toBeInstanceOf(Error);
      expect(results[0].reason.message).toBe('Error 1');
      
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason).toBeInstanceOf(Error);
      expect(results[1].reason.message).toBe('Error 2');
    });

    test('should handle mixed success and failure responses', async () => {
      // Note: This test may show unhandled rejection warnings in Jest
      // This is a known Jest limitation with async rejections
      // The test still validates the functionality correctly
      
      const configs = [
        { method: 'GET', url: '/api/success' },
        { method: 'GET', url: '/api/fail' }
      ];

      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { message: 'ok' } },
          { success: false, error: 'Failed request' }
        ]
      });

      const settledPromise = Promise.allSettled(
        configs.map(config => manager.add(config))
      );
      
      await jest.runAllTimersAsync();
      const results = await settledPromise;
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toEqual({ success: true, data: { message: 'ok' } });
      
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason).toBeInstanceOf(Error);
      expect(results[1].reason.message).toBe('Failed request');
    });

    test('should handle batch request failure', async () => {
      const configs = [
        { method: 'GET', url: '/api/test1' },
        { method: 'GET', url: '/api/test2' }
      ];

      const batchError = new Error('Batch endpoint failed');
      mockInstance.post.mockRejectedValueOnce(batchError);

      const promises = configs.map(config => manager.add(config));
      jest.advanceTimersByTime(50);

      const results = await Promise.allSettled(promises);
      
      // All requests in the batch should be rejected with the same error
      expect(results[0].status).toBe('rejected');
      expect(results[0].reason).toBe(batchError);
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason).toBe(batchError);
    });

    test('should continue processing when more items in queue', async () => {
      manager.batchSize = 2;
      
      const configs = Array(5).fill(null).map((_, i) => ({
        method: 'GET',
        url: `/api/item/${i}`
      }));

      // Mock responses for 3 batches
      mockInstance.post
        .mockResolvedValueOnce({
          data: [
            { success: true, data: { id: 0 } },
            { success: true, data: { id: 1 } }
          ]
        })
        .mockResolvedValueOnce({
          data: [
            { success: true, data: { id: 2 } },
            { success: true, data: { id: 3 } }
          ]
        })
        .mockResolvedValueOnce({
          data: [
            { success: true, data: { id: 4 } }
          ]
        });

      const promises = configs.map(config => manager.add(config));
      
      // Run all timers to process all batches
      await jest.runAllTimersAsync();
      
      const results = await Promise.all(promises);
      
      expect(mockInstance.post).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(5);
      expect(manager.processing).toBe(false);
      expect(manager.queue).toHaveLength(0);
    });

    test('should handle configs with all parameters', async () => {
      const config = {
        method: 'POST',
        url: '/api/users',
        data: { name: 'John', email: 'john@example.com' },
        params: { includeRelated: true },
        headers: { 'X-Custom-Header': 'value' }
      };

      mockInstance.post.mockResolvedValueOnce({
        data: [{ success: true, data: { id: 123, name: 'John' } }]
      });

      const promise = manager.add(config);
      jest.advanceTimersByTime(50);

      await promise;

      expect(mockInstance.post).toHaveBeenCalledWith('/batch', {
        requests: [{
          method: 'POST',
          url: '/api/users',
          data: { name: 'John', email: 'john@example.com' },
          params: { includeRelated: true },
          headers: { 'X-Custom-Header': 'value' }
        }]
      });
    });

    test('should use default GET method when not specified', async () => {
      const config = {
        url: '/api/users'
      };

      mockInstance.post.mockResolvedValueOnce({
        data: [{ success: true, data: { users: [] } }]
      });

      manager.add(config);
      jest.advanceTimersByTime(50);

      expect(mockInstance.post).toHaveBeenCalledWith('/batch', {
        requests: [{
          method: 'GET',
          url: '/api/users',
          data: undefined,
          params: undefined,
          headers: undefined
        }]
      });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      manager = new BatchRequestManager(mockInstance, { delay: 50 });
    });

    test('should handle concurrent adds during processing', async () => {
      manager = new BatchRequestManager(mockInstance, { delay: 50, batchSize: 2 });
      
      const config1 = { method: 'GET', url: '/api/1' };
      const config2 = { method: 'GET', url: '/api/2' };
      const config3 = { method: 'GET', url: '/api/3' };

      // Set up mocks for both batches
      mockInstance.post
        .mockResolvedValueOnce({
          data: [
            { success: true, data: { id: 1 } },
            { success: true, data: { id: 2 } }
          ]
        })
        .mockResolvedValueOnce({
          data: [{ success: true, data: { id: 3 } }]
        });

      // Add all three requests
      const promise1 = manager.add(config1);
      const promise2 = manager.add(config2);
      const promise3 = manager.add(config3);
      
      // Run all timers to completion
      await jest.runAllTimersAsync();
      
      // Get results
      const results = await Promise.all([promise1, promise2, promise3]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true, data: { id: 1 } });
      expect(results[1]).toEqual({ success: true, data: { id: 2 } });
      expect(results[2]).toEqual({ success: true, data: { id: 3 } });
      expect(mockInstance.post).toHaveBeenCalledTimes(2);
    });

    test('should not create multiple timers when adding during processing', async () => {
      const config1 = { method: 'GET', url: '/api/1' };
      const config2 = { method: 'GET', url: '/api/2' };

      mockInstance.post.mockResolvedValueOnce({
        data: [
          { success: true, data: { id: 1 } },
          { success: true, data: { id: 2 } }
        ]
      });

      // Add first request - starts processing
      const promise1 = manager.add(config1);
      expect(manager.processing).toBe(true);
      
      // Add second request while processing - should not start new timer
      const promise2 = manager.add(config2);
      expect(manager.processing).toBe(true);
      
      // Process the batch
      await jest.runAllTimersAsync();
      
      const results = await Promise.all([promise1, promise2]);
      expect(results).toHaveLength(2);
      expect(mockInstance.post).toHaveBeenCalledTimes(1);
    });

    test('should handle zero delay', async () => {
      manager = new BatchRequestManager(mockInstance, { delay: 0 });
      
      const config = { method: 'GET', url: '/api/test' };
      
      mockInstance.post.mockResolvedValueOnce({
        data: [{ success: true, data: { test: true } }]
      });

      const promise = manager.add(config);
      
      // Run all timers even with zero delay
      await jest.runAllTimersAsync();
      
      await promise;
      
      expect(mockInstance.post).toHaveBeenCalled();
    });

    test('should maintain request order within batch', async () => {
      const configs = Array(5).fill(null).map((_, i) => ({
        method: 'GET',
        url: `/api/item/${i}`
      }));

      mockInstance.post.mockResolvedValueOnce({
        data: configs.map((_, i) => ({ success: true, data: { order: i } }))
      });

      const promises = configs.map(config => manager.add(config));
      
      await jest.runAllTimersAsync();

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.data.order).toBe(index);
      });
    });

    test('should handle zero delay', async () => {
      manager = new BatchRequestManager(mockInstance, { delay: 0 });
      
      const config = { method: 'GET', url: '/api/test' };
      
      mockInstance.post.mockResolvedValueOnce({
        data: [{ success: true, data: { test: true } }]
      });

      const promise = manager.add(config);
      
      await jest.advanceTimersByTimeAsync(0);
      
      await promise;
      
      expect(mockInstance.post).toHaveBeenCalled();
    });

    test('should maintain request order within batch', async () => {
      const configs = Array(5).fill(null).map((_, i) => ({
        method: 'GET',
        url: `/api/item/${i}`
      }));

      mockInstance.post.mockResolvedValueOnce({
        data: configs.map((_, i) => ({ success: true, data: { order: i } }))
      });

      const promises = configs.map(config => manager.add(config));
      await jest.advanceTimersByTimeAsync(50);

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.data.order).toBe(index);
      });
    });
  });
});