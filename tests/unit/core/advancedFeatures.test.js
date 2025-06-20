// test/core/advancedFeatures.test.js
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { attachAdvancedFeatures } from "../../../lib/core/advancedFeatures.js";

describe("advancedFeatures", () => {
  let mockInstance;
  let commonPatterns;

  beforeEach(() => {
    mockInstance = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    };

    commonPatterns = {
      createApiClient: jest.fn().mockReturnValue({ client: "api" }),
      createResource: jest.fn().mockReturnValue({ resource: "users" }),
      uploadFile: jest
        .fn()
        .mockReturnValue(Promise.resolve({ uploaded: true })),
      createHealthCheck: jest.fn().mockReturnValue({ check: "health" }),
    };
  });

  test("should attach all advanced feature methods", () => {
    attachAdvancedFeatures(mockInstance, commonPatterns);

    expect(mockInstance.requestWithRetry).toBeDefined();
    expect(mockInstance.createApiClient).toBeDefined();
    expect(mockInstance.createResource).toBeDefined();
    expect(mockInstance.uploadFile).toBeDefined();
    expect(mockInstance.createHealthCheck).toBeDefined();
    expect(mockInstance.graphql).toBeDefined();
    expect(mockInstance.createPollingConnection).toBeDefined();
    expect(mockInstance.transaction).toBeDefined();
    expect(mockInstance.resumableUpload).toBeDefined();
  });

  describe("requestWithRetry", () => {
    test("should retry failed requests", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      mockInstance.request
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: "success" });

      const result = await mockInstance.requestWithRetry(
        { url: "/api/data" },
        { retries: 3, baseDelay: 10 }
      );

      expect(mockInstance.request).toHaveBeenCalledTimes(3);
      expect(result.data).toBe("success");
    });

    test("should stop retrying after max attempts", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      mockInstance.request.mockRejectedValue(new Error("Persistent error"));

      await expect(
        mockInstance.requestWithRetry(
          { url: "/api/data" },
          { retries: 2, baseDelay: 10 }
        )
      ).rejects.toThrow("Persistent error");

      expect(mockInstance.request).toHaveBeenCalledTimes(2);
    });

    test("should use custom retry condition", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const error404 = new Error("Not found");
      error404.response = { status: 404 };

      mockInstance.request.mockRejectedValue(error404);

      await expect(
        mockInstance.requestWithRetry(
          { url: "/api/data" },
          {
            retries: 3,
            baseDelay: 10,
            retryCondition: (error) => error.response?.status !== 404,
          }
        )
      ).rejects.toThrow("Not found");

      expect(mockInstance.request).toHaveBeenCalledTimes(1); // No retry for 404
    });

    test("should apply exponential backoff", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const startTime = Date.now();
      mockInstance.request
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce({ data: "success" });

      await mockInstance.requestWithRetry(
        { url: "/api/data" },
        {
          retries: 3,
          baseDelay: 50,
          backoffFactor: 2,
        }
      );

      const totalTime = Date.now() - startTime;
      // Should take at least 50ms (first retry) + 100ms (second retry) = 150ms
      expect(totalTime).toBeGreaterThanOrEqual(150);
    });

    test("should respect maxDelay", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const error = new Error("Network error");
      error.retryAttempt = undefined;
      error.retryDelay = undefined;

      mockInstance.request
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: "success" });

      await mockInstance.requestWithRetry(
        { url: "/api/data" },
        {
          retries: 5,
          baseDelay: 1000,
          maxDelay: 100,
          backoffFactor: 10,
        }
      );

      // Check that retry info was added to error
      expect(error.retryAttempt).toBe(1);
      expect(error.retryDelay).toBeLessThanOrEqual(100);
    });

    test("should use default retry condition", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      // Test network error (should retry)
      const networkError = new Error("Network error");
      mockInstance.request
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: "success" });

      await mockInstance.requestWithRetry({ url: "/api/data" });
      expect(mockInstance.request).toHaveBeenCalledTimes(2);

      // Test 500 error (should retry)
      mockInstance.request.mockClear();
      const error500 = new Error("Server error");
      error500.response = { status: 500 };
      mockInstance.request
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({ data: "success" });

      await mockInstance.requestWithRetry({ url: "/api/data" });
      expect(mockInstance.request).toHaveBeenCalledTimes(2);

      // Test 400 error (should not retry)
      mockInstance.request.mockClear();
      const error400 = new Error("Bad request");
      error400.response = { status: 400 };
      mockInstance.request.mockRejectedValue(error400);

      await expect(
        mockInstance.requestWithRetry({ url: "/api/data" }, { retries: 3 })
      ).rejects.toThrow("Bad request");
      expect(mockInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe("createApiClient", () => {
    test("should delegate to common patterns", () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const result = mockInstance.createApiClient("https://api.example.com", {
        auth: true,
      });

      expect(commonPatterns.createApiClient).toHaveBeenCalledWith(
        mockInstance,
        "https://api.example.com",
        { auth: true }
      );
      expect(result).toEqual({ client: "api" });
    });
  });

  describe("createResource", () => {
    test("should delegate to common patterns", () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const result = mockInstance.createResource("/users", { idField: "id" });

      expect(commonPatterns.createResource).toHaveBeenCalledWith(
        mockInstance,
        "/users",
        { idField: "id" }
      );
      expect(result).toEqual({ resource: "users" });
    });
  });

  describe("uploadFile", () => {
    test("should delegate to common patterns", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["test content"], { type: "text/plain" });
      const result = await mockInstance.uploadFile("/upload", file, {
        onProgress: jest.fn(),
      });

      expect(commonPatterns.uploadFile).toHaveBeenCalledWith(
        mockInstance,
        "/upload",
        file,
        { onProgress: expect.any(Function) }
      );
      expect(result).toEqual({ uploaded: true });
    });
  });

  describe("createHealthCheck", () => {
    test("should delegate to common patterns", () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const result = mockInstance.createHealthCheck("/health", {
        interval: 5000,
      });

      expect(commonPatterns.createHealthCheck).toHaveBeenCalledWith(
        mockInstance,
        "/health",
        { interval: 5000 }
      );
      expect(result).toEqual({ check: "health" });
    });
  });

  describe("graphql", () => {
    test("should make GraphQL request", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      mockInstance.post.mockResolvedValue({ data: { user: { id: 1 } } });

      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;
      const variables = { id: "1" };

      await mockInstance.graphql(query, variables);

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/graphql",
        { query, variables },
        {}
      );
    });

    test("should use custom URL and options", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      mockInstance.post.mockResolvedValue({ data: { result: true } });

      await mockInstance.graphql(
        "query { test }",
        { var: "value" },
        {
          url: "/api/graphql",
          headers: { "X-Custom": "header" },
        }
      );

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/api/graphql",
        { query: "query { test }", variables: { var: "value" } },
        { headers: { "X-Custom": "header" } }
      );
    });
  });

  describe("createPollingConnection", () => {
    test("should create polling connection", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      let messageCount = 0;
      const onMessage = jest.fn();
      mockInstance.get.mockImplementation(() => {
        messageCount++;
        return Promise.resolve({ data: { message: `msg${messageCount}` } });
      });

      const connection = mockInstance.createPollingConnection("/poll", {
        interval: 50,
        onMessage,
      });

      // Wait for a few polls
      await new Promise((resolve) => setTimeout(resolve, 120));

      connection.close();

      expect(onMessage).toHaveBeenCalledTimes(3); // Initial + 2 interval polls
      expect(onMessage).toHaveBeenCalledWith({ message: "msg1" });
      expect(onMessage).toHaveBeenCalledWith({ message: "msg2" });
      expect(onMessage).toHaveBeenCalledWith({ message: "msg3" });
      expect(connection.isActive()).toBe(false);
    });

    test("should handle errors in polling", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const onError = jest.fn();
      mockInstance.get.mockRejectedValue(new Error("Poll error"));

      const connection = mockInstance.createPollingConnection("/poll", {
        interval: 50,
        onError,
      });

      await new Promise((resolve) => setTimeout(resolve, 60));

      connection.close();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should call onClose when connection is closed", () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const onClose = jest.fn();
      mockInstance.get.mockResolvedValue({ data: {} });

      const connection = mockInstance.createPollingConnection("/poll", {
        interval: 1000,
        onClose,
      });

      connection.close();

      expect(onClose).toHaveBeenCalled();
      expect(connection.isActive()).toBe(false);
    });
  });

  describe("transaction", () => {
    test("should execute operations in sequence", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const operations = [
        (instance) => instance.post("/users", { name: "John" }),
        (instance) => instance.put("/users/1", { name: "John Doe" }),
        (instance) => instance.get("/users/1"),
      ];

      mockInstance.post.mockResolvedValue({ data: { id: 1 } });
      mockInstance.put.mockResolvedValue({ data: { id: 1, name: "John Doe" } });
      mockInstance.get.mockResolvedValue({ data: { id: 1, name: "John Doe" } });

      const result = await mockInstance.transaction(operations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(mockInstance.post).toHaveBeenCalled();
      expect(mockInstance.put).toHaveBeenCalled();
      expect(mockInstance.get).toHaveBeenCalled();
    });

    test("should handle rollback on error", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const rollback1 = jest.fn();
      const rollback2 = jest.fn();

      const operations = [
        (instance) => Promise.resolve({ data: "op1", rollback: rollback1 }),
        (instance) => Promise.resolve({ data: "op2", rollback: rollback2 }),
        (instance) => Promise.reject(new Error("Operation failed")),
      ];

      const result = await mockInstance.transaction(operations);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe("Operation failed");
      expect(result.results).toHaveLength(2);

      // Rollbacks should be called in reverse order
      expect(rollback2).toHaveBeenCalled();
      expect(rollback1).toHaveBeenCalled();
      expect(rollback2.mock.invocationCallOrder[0]).toBeLessThan(
        rollback1.mock.invocationCallOrder[0]
      );
    });

    test("should handle rollback errors gracefully", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const consoleError = jest.spyOn(console, "error").mockImplementation();

      const operations = [
        (instance) =>
          Promise.resolve({
            data: "op1",
            rollback: () => {
              throw new Error("Rollback failed");
            },
          }),
        (instance) => Promise.reject(new Error("Operation failed")),
      ];

      const result = await mockInstance.transaction(operations);

      expect(result.success).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(
        "Rollback failed:",
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    test("should skip rollback when disabled", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const rollback = jest.fn();

      const operations = [
        (instance) => Promise.resolve({ data: "op1", rollback }),
        (instance) => Promise.reject(new Error("Failed")),
      ];

      await mockInstance.transaction(operations, { rollbackOnError: false });

      expect(rollback).not.toHaveBeenCalled();
    });

    test("should pass instance to operations", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const operation = jest.fn().mockResolvedValue({ data: "result" });

      await mockInstance.transaction([operation]);

      expect(operation).toHaveBeenCalledWith(mockInstance);
    });
  });

  describe("resumableUpload", () => {
    test("should create resumable upload", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["a".repeat(3 * 1024 * 1024)], {
        type: "text/plain",
      });
      Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 });

      const onProgress = jest.fn();
      let uploadCount = 0;

      mockInstance.put.mockImplementation(() => {
        uploadCount++;
        return Promise.resolve({ data: { uploaded: true } });
      });

      const upload = mockInstance.resumableUpload("/upload", file, {
        chunkSize: 1024 * 1024, // 1MB chunks
        onProgress,
      });

      const result = await upload.start();

      expect(result).toEqual({ success: true, uploadedBytes: 3 * 1024 * 1024 });
      expect(mockInstance.put).toHaveBeenCalledTimes(3); // 3 chunks
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenLastCalledWith({
        loaded: 3 * 1024 * 1024,
        total: 3 * 1024 * 1024,
        percentage: 100,
      });
    });

    test("should handle upload errors and allow resume", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["a".repeat(2 * 1024 * 1024)], {
        type: "text/plain",
      });
      Object.defineProperty(file, "size", { value: 2 * 1024 * 1024 });

      let uploadCount = 0;

      mockInstance.put.mockImplementation(() => {
        uploadCount++;
        if (uploadCount === 1) {
          return Promise.resolve({ data: { uploaded: true } });
        } else {
          const error = new Error("Upload failed");
          throw error;
        }
      });

      const upload = mockInstance.resumableUpload("/upload", file, {
        chunkSize: 1024 * 1024,
      });

      try {
        await upload.start();
      } catch (error) {
        expect(error.message).toBe("Upload failed");
        expect(error.resumeFrom).toBe(1024 * 1024);
      }

      // Test resume
      mockInstance.put.mockResolvedValue({ data: { uploaded: true } });

      const result = await upload.resume(1024 * 1024);

      expect(result).toEqual({ success: true, uploadedBytes: 2 * 1024 * 1024 });
      expect(mockInstance.put).toHaveBeenCalledTimes(3); // 1 success + 1 failed + 1 resumed
    });

    test("should provide upload progress", () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["test"], { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 1000 });

      const upload = mockInstance.resumableUpload("/upload", file);

      const progress = upload.getProgress();

      expect(progress).toEqual({
        uploadedBytes: 0,
        totalBytes: 1000,
        percentage: 0,
      });
    });

    test("should set proper headers for chunks", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["abcdef"], { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 6 });

      mockInstance.put.mockResolvedValue({ data: { uploaded: true } });

      const upload = mockInstance.resumableUpload("/upload", file, {
        chunkSize: 3,
        headers: { "X-Custom": "value" },
      });

      await upload.start();

      expect(mockInstance.put).toHaveBeenCalledWith(
        "/upload",
        expect.any(Blob),
        {
          headers: {
            "X-Custom": "value",
            "Content-Range": "bytes 0-2/6",
            "Content-Type": "text/plain",
          },
        }
      );

      expect(mockInstance.put).toHaveBeenCalledWith(
        "/upload",
        expect.any(Blob),
        {
          headers: {
            "X-Custom": "value",
            "Content-Range": "bytes 3-5/6",
            "Content-Type": "text/plain",
          },
        }
      );
    });

    test("should handle files without type", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["test"], { type: "" }); // simulate no type
      Object.defineProperty(file, "size", { value: 4 }); // not strictly necessary here

      mockInstance.put.mockResolvedValue({ data: { uploaded: true } });

      const upload = mockInstance.resumableUpload("/upload", file, {
        chunkSize: 4,
      });

      await upload.start();

      expect(mockInstance.put).toHaveBeenCalledWith(
        "/upload",
        expect.any(Blob),
        {
          headers: {
            "Content-Range": "bytes 0-3/4",
            "Content-Type": "application/octet-stream",
          },
        }
      );
    });

    test("should resume from specific byte position", async () => {
      attachAdvancedFeatures(mockInstance, commonPatterns);

      const file = new Blob(["a".repeat(1000)], { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 1000 });

      mockInstance.put.mockResolvedValue({ data: { uploaded: true } });

      const upload = mockInstance.resumableUpload("/upload", file, {
        chunkSize: 100,
      });

      // Start from byte 300
      const result = await upload.resume(300);

      expect(result).toEqual({ success: true, uploadedBytes: 1000 });
      // Should upload from 300 to 1000 (7 chunks of 100 bytes each)
      expect(mockInstance.put).toHaveBeenCalledTimes(7);

      // Check first chunk starts at byte 300
      expect(mockInstance.put).toHaveBeenCalledWith(
        "/upload",
        expect.any(Blob),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Range": "bytes 300-399/1000",
          }),
        })
      );
    });
  });
});
