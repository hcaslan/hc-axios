import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CancellationManager } from '../../../lib/utils/cancellation.js';

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => {
  const controller = {
    abort: jest.fn(),
    signal: { aborted: false }
  };
  
  // When abort is called, update the signal
  controller.abort.mockImplementation(() => {
    controller.signal.aborted = true;
  });
  
  return controller;
});

describe('CancellationManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CancellationManager();
  });

  afterEach(() => {
    // Clean up any remaining controllers
    manager.cancelAll();
  });

  describe('constructor', () => {
    test('should initialize with empty controllers map', () => {
      expect(manager.controllers).toBeInstanceOf(Map);
      expect(manager.controllers.size).toBe(0);
    });
  });

  describe('create', () => {
    test('should create new abort controller and return signal', () => {
      const signal = manager.create('request-1');

      expect(global.AbortController).toHaveBeenCalledTimes(1);
      expect(manager.controllers.has('request-1')).toBe(true);
      expect(signal).toBeDefined();
      expect(signal.aborted).toBe(false);
    });

    test('should cancel existing controller with same key before creating new one', () => {
      // Create first controller
      const signal1 = manager.create('request-1');
      const controller1 = manager.controllers.get('request-1');

      // Create second controller with same key
      const signal2 = manager.create('request-1');
      const controller2 = manager.controllers.get('request-1');

      // First controller should have been aborted
      expect(controller1.abort).toHaveBeenCalledTimes(1);
      expect(signal1.aborted).toBe(true);

      // Second controller should be new
      expect(controller2).not.toBe(controller1);
      expect(signal2).not.toBe(signal1);
      expect(signal2.aborted).toBe(false);
    });

    test('should handle multiple unique keys', () => {
      const signal1 = manager.create('request-1');
      const signal2 = manager.create('request-2');
      const signal3 = manager.create('request-3');

      expect(manager.controllers.size).toBe(3);
      expect(manager.controllers.has('request-1')).toBe(true);
      expect(manager.controllers.has('request-2')).toBe(true);
      expect(manager.controllers.has('request-3')).toBe(true);

      expect(signal1).not.toBe(signal2);
      expect(signal2).not.toBe(signal3);
    });
  });

  describe('cancel', () => {
    test('should cancel controller and remove from map', () => {
      const signal = manager.create('request-1');
      const controller = manager.controllers.get('request-1');

      manager.cancel('request-1');

      expect(controller.abort).toHaveBeenCalledTimes(1);
      expect(signal.aborted).toBe(true);
      expect(manager.controllers.has('request-1')).toBe(false);
    });

    test('should handle cancelling non-existent key gracefully', () => {
      expect(() => {
        manager.cancel('non-existent');
      }).not.toThrow();

      expect(manager.controllers.size).toBe(0);
    });

    test('should only cancel specified controller', () => {
      manager.create('request-1');
      const signal2 = manager.create('request-2');
      manager.create('request-3');

      const controller2 = manager.controllers.get('request-2');

      manager.cancel('request-2');

      expect(controller2.abort).toHaveBeenCalledTimes(1);
      expect(signal2.aborted).toBe(true);
      expect(manager.controllers.has('request-2')).toBe(false);

      // Other controllers should remain
      expect(manager.controllers.has('request-1')).toBe(true);
      expect(manager.controllers.has('request-3')).toBe(true);
      expect(manager.controllers.size).toBe(2);
    });
  });

  describe('cancelAll', () => {
    test('should cancel all controllers and clear map', () => {
      const signal1 = manager.create('request-1');
      const signal2 = manager.create('request-2');
      const signal3 = manager.create('request-3');

      const controllers = [
        manager.controllers.get('request-1'),
        manager.controllers.get('request-2'),
        manager.controllers.get('request-3')
      ];

      manager.cancelAll();

      // All controllers should be aborted
      controllers.forEach(controller => {
        expect(controller.abort).toHaveBeenCalledTimes(1);
      });

      // All signals should be aborted
      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(true);
      expect(signal3.aborted).toBe(true);

      // Map should be empty
      expect(manager.controllers.size).toBe(0);
    });

    test('should handle empty map gracefully', () => {
      expect(() => {
        manager.cancelAll();
      }).not.toThrow();

      expect(manager.controllers.size).toBe(0);
    });

    test('should work after some controllers have been cancelled', () => {
      manager.create('request-1');
      manager.create('request-2');
      manager.create('request-3');

      // Cancel one controller
      manager.cancel('request-2');

      const remainingControllers = [
        manager.controllers.get('request-1'),
        manager.controllers.get('request-3')
      ];

      manager.cancelAll();

      remainingControllers.forEach(controller => {
        expect(controller.abort).toHaveBeenCalledTimes(1);
      });

      expect(manager.controllers.size).toBe(0);
    });
  });

  describe('getSignal', () => {
    test('should return signal for existing controller', () => {
      const createdSignal = manager.create('request-1');
      const retrievedSignal = manager.getSignal('request-1');

      expect(retrievedSignal).toBe(createdSignal);
    });

    test('should return undefined for non-existent key', () => {
      const signal = manager.getSignal('non-existent');

      expect(signal).toBeUndefined();
    });

    test('should return undefined after controller is cancelled', () => {
      manager.create('request-1');
      manager.cancel('request-1');

      const signal = manager.getSignal('request-1');

      expect(signal).toBeUndefined();
    });

    test('should return correct signal when multiple controllers exist', () => {
      const signal1 = manager.create('request-1');
      const signal2 = manager.create('request-2');
      const signal3 = manager.create('request-3');

      expect(manager.getSignal('request-1')).toBe(signal1);
      expect(manager.getSignal('request-2')).toBe(signal2);
      expect(manager.getSignal('request-3')).toBe(signal3);
    });
  });

  describe('integration scenarios', () => {
    test('should handle lifecycle of multiple requests', () => {
      // Create initial requests
      const signal1 = manager.create('upload-1');
      const signal2 = manager.create('api-call-1');

      expect(manager.controllers.size).toBe(2);

      // Cancel one request
      manager.cancel('upload-1');
      expect(manager.controllers.size).toBe(1);
      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);

      // Create new request with same key as cancelled one
      const signal3 = manager.create('upload-1');
      expect(manager.controllers.size).toBe(2);
      expect(signal3).not.toBe(signal1);
      expect(signal3.aborted).toBe(false);

      // Replace existing request
      const signal4 = manager.create('api-call-1');
      expect(manager.controllers.size).toBe(2);
      expect(signal2.aborted).toBe(true);
      expect(signal4.aborted).toBe(false);

      // Cancel all
      manager.cancelAll();
      expect(manager.controllers.size).toBe(0);
      expect(signal3.aborted).toBe(true);
      expect(signal4.aborted).toBe(true);
    });

    test('should handle rapid creation and cancellation', () => {
      const keys = ['req-1', 'req-2', 'req-3', 'req-4', 'req-5'];
      const signals = [];

      // Rapidly create controllers
      keys.forEach(key => {
        signals.push(manager.create(key));
      });

      expect(manager.controllers.size).toBe(5);

      // Rapidly cancel some
      manager.cancel('req-2');
      manager.cancel('req-4');

      expect(manager.controllers.size).toBe(3);
      expect(signals[1].aborted).toBe(true);
      expect(signals[3].aborted).toBe(true);

      // Create new ones with cancelled keys
      const newSignal2 = manager.create('req-2');
      const newSignal4 = manager.create('req-4');

      expect(manager.controllers.size).toBe(5);
      expect(newSignal2).not.toBe(signals[1]);
      expect(newSignal4).not.toBe(signals[3]);

      // Cancel all
      manager.cancelAll();
      expect(manager.controllers.size).toBe(0);
    });
  });
});