import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { attachUtilityMethods } from "../../../lib/core/utilityMethods.js";

describe("utilityMethods", () => {
  let mockInstance;
  let utilities;
  let responseTransformers;

  beforeEach(() => {
    mockInstance = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      head: jest.fn(),
      options: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn().mockReturnValue(1),
        },
      },
    };

    utilities = {
      requestQueue: {
        add: jest.fn(),
        setMaxConcurrent: jest.fn(),
      },
      paginationHelper: {
        paginate: jest.fn(),
        paginateAll: jest.fn(),
      },
      cancellationManager: {
        cancel: jest.fn(),
        cancelAll: jest.fn(),
        createSource: jest.fn().mockReturnValue({
          token: "cancel-token",
          cancel: jest.fn(),
        }),
      },
      batchManager: {
        batch: jest.fn(),
      },
      errorHandler: {
        setHandler: jest.fn(),
        handle: jest.fn(),
      },
    };

    responseTransformers = {
      toCamelCase: jest.fn(),
    };
  });

  test("should attach all utility methods", () => {
    attachUtilityMethods(mockInstance, utilities, responseTransformers);

    expect(mockInstance.batch).toBeDefined();
    expect(mockInstance.all).toBeDefined();
    expect(mockInstance.race).toBeDefined();
    expect(mockInstance.concurrent).toBeDefined();
    expect(mockInstance.poll).toBeDefined();
    expect(mockInstance.requestWithTimeout).toBeDefined();
    expect(mockInstance.useQueue).toBeDefined();
    expect(mockInstance.useResponseTransform).toBeDefined();
    expect(mockInstance.useCamelCase).toBeDefined();
    expect(mockInstance.paginate).toBeDefined();
    expect(mockInstance.paginateAll).toBeDefined();
    expect(mockInstance.cancel).toBeDefined();
    expect(mockInstance.cancelAll).toBeDefined();
    expect(mockInstance.cancellable).toBeDefined();
    expect(mockInstance.withErrorHandler).toBeDefined();
  });

  describe("batch", () => {
    test("should delegate to batch manager", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);
      const requests = [{ url: "/1" }, { url: "/2" }];

      mockInstance.batch(requests);

      expect(utilities.batchManager.batch).toHaveBeenCalledWith(requests);
    });
  });

  describe("all", () => {
    test("should wrap Promise.all", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);
      const promises = [Promise.resolve(1), Promise.resolve(2)];

      const result = await mockInstance.all(promises);

      expect(result).toEqual([1, 2]);
    });
  });

  describe("race", () => {
    test("should wrap Promise.race", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);
      const promises = [
        new Promise((resolve) => setTimeout(() => resolve("slow"), 100)),
        Promise.resolve("fast"),
      ];

      const result = await mockInstance.race(promises);

      expect(result).toBe("fast");
    });
  });

  describe("concurrent", () => {
    test("should execute requests with concurrency limit", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const requests = [
        () => Promise.resolve({ data: 1 }),
        () => Promise.resolve({ data: 2 }),
        () => Promise.resolve({ data: 3 }),
      ];

      const results = await mockInstance.concurrent(requests, 2);

      expect(results).toHaveLength(3);
      expect(results[0].value.data).toBe(1);
      expect(results[1].value.data).toBe(2);
      expect(results[2].value.data).toBe(3);
    });

    test("should handle rejections in concurrent requests", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const requests = [
        () => Promise.resolve({ data: "success" }),
        () => Promise.reject(new Error("failed")),
        () => Promise.resolve({ data: "another success" }),
      ];

      const results = await mockInstance.concurrent(requests, 2);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect(results[1].reason.message).toBe("failed");
      expect(results[2].status).toBe("fulfilled");
    });
  });

  describe("poll", () => {
    test("should poll until condition is met", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      let callCount = 0;
      mockInstance.request.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: { ready: callCount >= 3 },
        });
      });

      const result = await mockInstance.poll(
        { url: "/status" },
        {
          interval: 10,
          shouldStop: (response) => response.data.ready,
        }
      );

      expect(callCount).toBe(3);
      expect(result.data.ready).toBe(true);
    });

    test("should timeout if condition never met", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      mockInstance.request.mockResolvedValue({ data: { ready: false } });

      await expect(
        mockInstance.poll(
          { url: "/status" },
          {
            interval: 10,
            timeout: 50,
            shouldStop: (response) => response.data.ready,
          }
        )
      ).rejects.toThrow("Polling timeout exceeded");
    });

    test("should handle errors during polling", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      mockInstance.request.mockRejectedValue(new Error("Network error"));

      await expect(
        mockInstance.poll(
          { url: "/status" },
          {
            interval: 10,
            timeout: 50,
            stopOnError: true,
          }
        )
      ).rejects.toThrow("Network error");
    });
  });

  describe("requestWithTimeout", () => {
    test("should create request with timeout", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      mockInstance.request.mockResolvedValue({ data: "success" });

      const config = { url: "/api/data" };
      const result = await mockInstance.requestWithTimeout(config, 1000);

      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          ...config,
          signal: expect.any(AbortSignal),
        })
      );
      expect(result.data).toBe("success");
    });
  });

  describe("useQueue", () => {
    test("should setup request queueing", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const originalGet = mockInstance.get;
      mockInstance.useQueue(10);

      expect(utilities.requestQueue.setMaxConcurrent).toHaveBeenCalledWith(10);
      expect(mockInstance._queue).toBe(utilities.requestQueue);
      expect(mockInstance.get).not.toBe(originalGet);
    });

    test("should queue HTTP method calls", async () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      utilities.requestQueue.add.mockImplementation((fn) => fn());
      mockInstance.get.mockResolvedValue({ data: "result" });

      mockInstance.useQueue(5);
      await mockInstance.get("/test");

      expect(utilities.requestQueue.add).toHaveBeenCalled();
    });
  });

  describe("useResponseTransform", () => {
    test("should add response transformer", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const transformer = jest.fn((data) => ({ transformed: data }));
      mockInstance.useResponseTransform(transformer);

      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();

      // Test the transformer function
      const interceptorFn =
        mockInstance.interceptors.response.use.mock.calls[0][0];
      const response = { data: { original: true } };
      const result = interceptorFn(response);

      expect(transformer).toHaveBeenCalledWith({ original: true });
      expect(result.data).toEqual({ transformed: { original: true } });
    });
  });

  describe("useCamelCase", () => {
    test("should use camelCase transformer", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      responseTransformers.toCamelCase = jest.fn();
      mockInstance.useResponseTransform = jest.fn();

      mockInstance.useCamelCase();

      expect(mockInstance.useResponseTransform).toHaveBeenCalledWith(
        responseTransformers.toCamelCase
      );
    });
  });

  describe("pagination", () => {
    test("should delegate paginate to pagination helper", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const config = { url: "/users" };
      const options = { pageSize: 20 };

      mockInstance.paginate(config, options);

      expect(utilities.paginationHelper.paginate).toHaveBeenCalledWith(
        config,
        options
      );
    });

    test("should delegate paginateAll to pagination helper", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const config = { url: "/users" };
      const options = { pageSize: 20 };

      mockInstance.paginateAll(config, options);

      expect(utilities.paginationHelper.paginateAll).toHaveBeenCalledWith(
        config,
        options
      );
    });
  });

  describe("cancellation", () => {
    test("should cancel request by ID", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      mockInstance.cancel("request-123");

      expect(utilities.cancellationManager.cancel).toHaveBeenCalledWith(
        "request-123"
      );
    });

    test("should cancel all requests", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      mockInstance.cancelAll();

      expect(utilities.cancellationManager.cancelAll).toHaveBeenCalled();
    });

    test("should create cancellable request", () => {

      utilities.cancellationManager.createSource = jest.fn().mockReturnValue({
        token: "mock-token",
      });

      utilities.cancellationManager.cancel = jest.fn();

      mockInstance.request = jest
        .fn()
        .mockReturnValue(Promise.resolve({ data: "mockData" }));

      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const config = { url: "/api/data" };
      const result = mockInstance.cancellable(config, "req-123");

      expect(utilities.cancellationManager.createSource).toHaveBeenCalledWith(
        "req-123"
      );
      expect(result.request).toBeDefined();
      expect(result.cancel).toBeDefined();

      result.cancel();
      expect(utilities.cancellationManager.cancel).toHaveBeenCalledWith(
        "req-123"
      );
    });
  });

  describe("withErrorHandler", () => {
    test("should setup error handler", () => {
      attachUtilityMethods(mockInstance, utilities, responseTransformers);

      const handler = jest.fn();
      mockInstance.withErrorHandler(handler);

      expect(utilities.errorHandler.setHandler).toHaveBeenCalledWith(handler);
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();

      // Test error interceptor
      const errorInterceptor =
        mockInstance.interceptors.response.use.mock.calls[0][1];
      const error = new Error("Test error");

      expect(errorInterceptor(error)).rejects.toBe(error);
      expect(utilities.errorHandler.handle).toHaveBeenCalledWith(error);
    });
  });
});
