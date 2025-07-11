import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RequestQueue } from '../../../lib/utils/requestQueue.js';

describe('RequestQueue', () => {
  let queue;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = new RequestQueue();
  });

  describe('constructor', () => {
    test('should initialize with default maxConcurrent value', () => {
      expect(queue.maxConcurrent).toBe(5);
      expect(queue.queue).toEqual([]);
      expect(queue.running).toBe(0);
    });

    test('should initialize with custom maxConcurrent value', () => {
      const customQueue = new RequestQueue(10);
      expect(customQueue.maxConcurrent).toBe(10);
    });

    test('should handle zero maxConcurrent', () => {
      const customQueue = new RequestQueue(0);
      expect(customQueue.maxConcurrent).toBe(0);
    });

    test('should handle negative maxConcurrent', () => {
      const customQueue = new RequestQueue(-1);
      expect(customQueue.maxConcurrent).toBe(-1);
    });
  });

  describe('add', () => {
    test('should add request to queue and return promise', async () => {
      const mockRequest = jest.fn().mockResolvedValue('result');
      
      const promise = queue.add(mockRequest);
      
      expect(queue.queue).toHaveLength(0); // Should be processed immediately
      expect(queue.running).toBe(1);
      
      const result = await promise;
      expect(result).toBe('result');
      expect(mockRequest).toHaveBeenCalled();
    });

    test('should handle rejected requests', async () => {
      const error = new Error('Request failed');
      const mockRequest = jest.fn().mockRejectedValue(error);
      
      await expect(queue.add(mockRequest)).rejects.toThrow('Request failed');
      expect(mockRequest).toHaveBeenCalled();
    });

    test('should queue requests when max concurrent reached', async () => {
      const queue = new RequestQueue(2);
      const mockRequests = [];
      const promises = [];
      
      // Create 3 mock requests that take time to complete
      for (let i = 0; i < 3; i++) {
        mockRequests[i] = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(`result${i}`), 50))
        );
      }
      
      // Add all 3 requests
      for (let i = 0; i < 3; i++) {
        promises[i] = queue.add(mockRequests[i]);
      }
      
      // First 2 should start immediately
      expect(queue.running).toBe(2);
      expect(queue.queue).toHaveLength(1);
      expect(mockRequests[0]).toHaveBeenCalled();
      expect(mockRequests[1]).toHaveBeenCalled();
      expect(mockRequests[2]).not.toHaveBeenCalled();
      
      // Wait for all to complete
      const results = await Promise.all(promises);
      expect(results).toEqual(['result0', 'result1', 'result2']);
      expect(mockRequests[2]).toHaveBeenCalled();
    });

    test('should handle multiple queued requests', async () => {
      const queue = new RequestQueue(1);
      const results = [];
      
      const promise1 = queue.add(() => Promise.resolve(1));
      const promise2 = queue.add(() => Promise.resolve(2));
      const promise3 = queue.add(() => Promise.resolve(3));
      
      expect(queue.running).toBe(1);
      expect(queue.queue).toHaveLength(2);
      
      results.push(await promise1);
      results.push(await promise2);
      results.push(await promise3);
      
      expect(results).toEqual([1, 2, 3]);
      expect(queue.running).toBe(0);
      expect(queue.queue).toHaveLength(0);
    });
  });

  describe('process', () => {
    test('should not process when queue is empty', async () => {
      const processSpy = jest.spyOn(queue, 'process');
      
      await queue.process();
      
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(queue.running).toBe(0);
    });

    test('should not process when max concurrent reached', async () => {
      queue.running = queue.maxConcurrent;
      queue.queue.push({
        request: jest.fn(),
        resolve: jest.fn(),
        reject: jest.fn()
      });
      
      const processSpy = jest.spyOn(queue, 'process');
      await queue.process();
      
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(queue.queue).toHaveLength(1);
    });

    test('should process next request after completion', async () => {
      const queue = new RequestQueue(1);
      let processCallCount = 0;
      const originalProcess = queue.process.bind(queue);
      
      queue.process = jest.fn(async function() {
        processCallCount++;
        return originalProcess();
      });
      
      const request1 = jest.fn().mockResolvedValue('first');
      const request2 = jest.fn().mockResolvedValue('second');
      
      const promise1 = queue.add(request1);
      const promise2 = queue.add(request2);
      
      const results = await Promise.all([promise1, promise2]);
      
      expect(results).toEqual(['first', 'second']);
      // Process called: initial (2x for each add) + after first completes + after second completes
      expect(processCallCount).toBeGreaterThanOrEqual(3);
    });

    test('should handle errors and continue processing', async () => {
      const queue = new RequestQueue(1);
      
      const request1 = jest.fn().mockRejectedValue(new Error('Error 1'));
      const request2 = jest.fn().mockResolvedValue('success');
      
      const promise1 = queue.add(request1);
      const promise2 = queue.add(request2);
      
      await expect(promise1).rejects.toThrow('Error 1');
      await expect(promise2).resolves.toBe('success');
      
      expect(queue.running).toBe(0);
      expect(queue.queue).toHaveLength(0);
    });

    test('should handle synchronous errors in request function', async () => {
      const errorRequest = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      
      await expect(queue.add(errorRequest)).rejects.toThrow('Sync error');
      expect(queue.running).toBe(0);
    });
  });

  describe('concurrent request handling', () => {
    test('should respect maxConcurrent limit', async () => {
      const queue = new RequestQueue(3);
      const runningRequests = [];
      const maxRunning = { value: 0 };
      
      const trackingRequest = (id) => jest.fn().mockImplementation(() => {
        runningRequests.push(id);
        maxRunning.value = Math.max(maxRunning.value, runningRequests.length);
        
        return new Promise(resolve => {
          setTimeout(() => {
            const index = runningRequests.indexOf(id);
            runningRequests.splice(index, 1);
            resolve(id);
          }, 10);
        });
      });
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(queue.add(trackingRequest(i)));
      }
      
      await Promise.all(promises);
      
      expect(maxRunning.value).toBeLessThanOrEqual(3);
      expect(runningRequests).toHaveLength(0);
    });

    test('should handle maxConcurrent of 0', async () => {
      const queue = new RequestQueue(0);
      const request = jest.fn().mockResolvedValue('result');
      
      const promise = queue.add(request);
      
      // With maxConcurrent of 0, nothing should process
      expect(queue.running).toBe(0);
      expect(queue.queue).toHaveLength(1);
      expect(request).not.toHaveBeenCalled();
      
      // The promise will never resolve in this case
      // This is an edge case that might need handling in the actual implementation
    });
  });

  describe('edge cases', () => {
    test('should handle request function that returns non-promise', async () => {
      const syncRequest = jest.fn().mockReturnValue('sync result');
      
      const result = await queue.add(syncRequest);
      expect(result).toBe('sync result');
    });

    test('should handle null or undefined request functions', async () => {
      await expect(queue.add(null)).rejects.toThrow();
      await expect(queue.add(undefined)).rejects.toThrow();
    });

    test('should maintain queue order', async () => {
      const queue = new RequestQueue(1);
      const results = [];
      const delays = [30, 20, 10];
      
      const promises = delays.map((delay, index) => 
        queue.add(() => 
          new Promise(resolve => 
            setTimeout(() => {
              results.push(index);
              resolve(index);
            }, delay)
          )
        )
      );
      
      await Promise.all(promises);
      
      // Despite different delays, results should be in order
      expect(results).toEqual([0, 1, 2]);
    });

    test('should handle rapid add calls', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(queue.add(() => Promise.resolve(i)));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(queue.running).toBe(0);
      expect(queue.queue).toHaveLength(0);
    });
  });

  describe('performance and cleanup', () => {
    test('should clean up after processing', async () => {
      const request = jest.fn().mockResolvedValue('done');
      
      await queue.add(request);
      
      expect(queue.running).toBe(0);
      expect(queue.queue).toHaveLength(0);
    });

    test('should handle memory properly with large queues', async () => {
      const queue = new RequestQueue(10);
      const promises = [];
      
      // Add many requests
      for (let i = 0; i < 1000; i++) {
        promises.push(queue.add(() => Promise.resolve(i)));
      }
      
      await Promise.all(promises);
      
      expect(queue.queue).toHaveLength(0);
      expect(queue.running).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    test('should work with axios-like request functions', async () => {
      const mockAxiosRequest = jest.fn().mockImplementation((config) => 
        Promise.resolve({
          data: { message: 'success' },
          status: 200,
          config
        })
      );
      
      const result = await queue.add(() => mockAxiosRequest({ url: '/api/test' }));
      
      expect(result.data.message).toBe('success');
      expect(result.config.url).toBe('/api/test');
    });

    test('should handle network-like delays', async () => {
      jest.useRealTimers();
      
      const queue = new RequestQueue(2);
      const startTime = Date.now();
      
      const slowRequest = () => new Promise(resolve => 
        setTimeout(() => resolve('slow'), 100)
      );
      
      const fastRequest = () => new Promise(resolve => 
        setTimeout(() => resolve('fast'), 50)
      );
      
      const [slow1, fast1, fast2, slow2] = await Promise.all([
        queue.add(slowRequest),
        queue.add(fastRequest),
        queue.add(fastRequest),
        queue.add(slowRequest)
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(slow1).toBe('slow');
      expect(fast1).toBe('fast');
      expect(fast2).toBe('fast');
      expect(slow2).toBe('slow');
      
      // Should take ~150ms (2 batches of max 100ms each)
      expect(duration).toBeGreaterThanOrEqual(150);
      expect(duration).toBeLessThan(250);
      
      jest.useFakeTimers();
    });
  });

  describe('method existence for compatibility', () => {
    test('should have expected public methods', () => {
      expect(typeof queue.add).toBe('function');
      expect(typeof queue.process).toBe('function');
    });

    test('should have expected properties', () => {
      expect(queue).toHaveProperty('maxConcurrent');
      expect(queue).toHaveProperty('queue');
      expect(queue).toHaveProperty('running');
    });
  });
});