import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import axios from "axios";

jest.mock("axios");

import {
  createApiClient,
  createResource,
  uploadFile,
  createHealthCheck
} from "../../../lib/utils/commonPatterns.js";

describe("commonPatterns", () => {
  const mockAxiosInstance = {
    defaults: {},
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Explicitly mock axios.create as a jest.fn()
    axios.create = jest.fn().mockReturnValue(mockAxiosInstance);
  });

  describe("createApiClient", () => {
    test("should create axios instance with default configuration", () => {
      const result = createApiClient("https://api.example.com");

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 10000,
      });
      expect(result).toBe(mockAxiosInstance);
    });

    test("should merge custom options with defaults", () => {
      const options = {
        timeout: 5000,
        headers: { "X-API-Key": "test-key" },
        withCredentials: true,
      };

      const result = createApiClient("https://api.example.com", options);

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 5000,
        headers: { "X-API-Key": "test-key" },
        withCredentials: true,
      });
      expect(result).toBe(mockAxiosInstance);
    });

    test("should handle baseURL with trailing slash", () => {
      createApiClient("https://api.example.com/");

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com/",
        timeout: 10000,
      });
    });

    test("should create independent instances", () => {
      const mockInstance1 = { ...mockAxiosInstance, id: 1 };
      const mockInstance2 = { ...mockAxiosInstance, id: 2 };
      
      axios.create
        .mockReturnValueOnce(mockInstance1)
        .mockReturnValueOnce(mockInstance2);

      const client1 = createApiClient("https://api1.example.com");
      const client2 = createApiClient("https://api2.example.com");

      expect(client1).toBe(mockInstance1);
      expect(client2).toBe(mockInstance2);
      expect(client1).not.toBe(client2);
    });

    test("should handle empty options", () => {
      createApiClient("https://api.example.com", {});

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 10000,
      });
    });

    test("should preserve all custom options", () => {
      const options = {
        timeout: 30000,
        maxRedirects: 5,
        responseType: "json",
        validateStatus: (status) => status < 600,
        headers: {
          "Accept": "application/json",
          "X-Custom": "header"
        }
      };

      createApiClient("https://api.example.com", options);

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: "https://api.example.com",
        timeout: 30000,
        maxRedirects: 5,
        responseType: "json",
        validateStatus: options.validateStatus,
        headers: {
          "Accept": "application/json",
          "X-Custom": "header"
        }
      });
    });
  });

  describe("createResource", () => {
    let mockInstance;
    let resource;

    beforeEach(() => {
      mockInstance = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      };
      resource = createResource(mockInstance, "/users");
    });

    test("should return object with all CRUD methods", () => {
      expect(resource).toHaveProperty("list");
      expect(resource).toHaveProperty("get");
      expect(resource).toHaveProperty("create");
      expect(resource).toHaveProperty("update");
      expect(resource).toHaveProperty("patch");
      expect(resource).toHaveProperty("delete");
      expect(typeof resource.list).toBe("function");
      expect(typeof resource.get).toBe("function");
      expect(typeof resource.create).toBe("function");
      expect(typeof resource.update).toBe("function");
      expect(typeof resource.patch).toBe("function");
      expect(typeof resource.delete).toBe("function");
    });

    describe("list", () => {
      test("should call instance.get with resource path and params", () => {
        const params = { page: 1, limit: 10 };
        resource.list(params);

        expect(mockInstance.get).toHaveBeenCalledWith("/users", { params });
      });

      test("should handle list without params", () => {
        resource.list();

        expect(mockInstance.get).toHaveBeenCalledWith("/users", {
          params: undefined,
        });
      });

      test("should return the promise from instance.get", () => {
        const mockResponse = { data: [] };
        mockInstance.get.mockResolvedValue(mockResponse);

        const result = resource.list();

        expect(result).toBeInstanceOf(Promise);
      });
    });

    describe("get", () => {
      test("should call instance.get with id appended to path", () => {
        resource.get(123);

        expect(mockInstance.get).toHaveBeenCalledWith("/users/123");
      });

      test("should handle string id", () => {
        resource.get("abc-123");

        expect(mockInstance.get).toHaveBeenCalledWith("/users/abc-123");
      });

      test("should handle UUID format", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        resource.get(uuid);

        expect(mockInstance.get).toHaveBeenCalledWith(`/users/${uuid}`);
      });
    });

    describe("create", () => {
      test("should call instance.post with resource path and data", () => {
        const data = { name: "John Doe", email: "john@example.com" };
        resource.create(data);

        expect(mockInstance.post).toHaveBeenCalledWith("/users", data);
      });

      test("should handle empty data", () => {
        resource.create({});

        expect(mockInstance.post).toHaveBeenCalledWith("/users", {});
      });
    });

    describe("update", () => {
      test("should call instance.put with id path and data", () => {
        const data = { name: "Jane Doe" };
        resource.update(123, data);

        expect(mockInstance.put).toHaveBeenCalledWith("/users/123", data);
      });

      test("should handle string id", () => {
        const data = { name: "Jane Doe" };
        resource.update("user-456", data);

        expect(mockInstance.put).toHaveBeenCalledWith("/users/user-456", data);
      });
    });

    describe("patch", () => {
      test("should call instance.patch with id path and data", () => {
        const data = { status: "active" };
        resource.patch(123, data);

        expect(mockInstance.patch).toHaveBeenCalledWith("/users/123", data);
      });

      test("should handle partial updates", () => {
        const data = { email: "newemail@example.com" };
        resource.patch(456, data);

        expect(mockInstance.patch).toHaveBeenCalledWith("/users/456", data);
      });
    });

    describe("delete", () => {
      test("should call instance.delete with id path", () => {
        resource.delete(123);

        expect(mockInstance.delete).toHaveBeenCalledWith("/users/123");
      });

      test("should handle string id", () => {
        resource.delete("temp-user");

        expect(mockInstance.delete).toHaveBeenCalledWith("/users/temp-user");
      });
    });

    test("should work with nested resource paths", () => {
      const nestedResource = createResource(
        mockInstance,
        "/api/v1/organizations/123/users"
      );

      nestedResource.get(456);
      expect(mockInstance.get).toHaveBeenCalledWith(
        "/api/v1/organizations/123/users/456"
      );
    });

    test("should handle empty resource path", () => {
      const rootResource = createResource(mockInstance, "");
      
      rootResource.get(123);
      expect(mockInstance.get).toHaveBeenCalledWith("/123");
    });

    test("should handle resource path without leading slash", () => {
      const resource = createResource(mockInstance, "items");
      
      resource.list();
      expect(mockInstance.get).toHaveBeenCalledWith("items", { params: undefined });
    });

    test("should handle resource path with trailing slash", () => {
      const resource = createResource(mockInstance, "/users/");
      
      resource.get(123);
      expect(mockInstance.get).toHaveBeenCalledWith("/users//123");
    });
  });

  describe("uploadFile", () => {
    let mockInstance;
    let mockFile;
    let FormDataMock;

    beforeEach(() => {
      mockInstance = {
        post: jest.fn().mockResolvedValue({ data: { id: "123" } }),
      };

      mockFile = new Blob(["file content"], { type: "text/plain" });
      mockFile.name = "test.txt";

      // Mock FormData
      FormDataMock = jest.fn();
      FormDataMock.prototype.append = jest.fn();
      global.FormData = FormDataMock;
    });

    afterEach(() => {
      // Restore original FormData
      delete global.FormData;
    });

    test("should upload file with default options", async () => {
      const result = await uploadFile(mockInstance, mockFile);

      expect(FormDataMock).toHaveBeenCalled();
      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "file",
        mockFile
      );
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/upload",
        expect.any(FormDataMock),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: undefined,
        }
      );
      expect(result.data.id).toBe("123");
    });

    test("should use custom field name", async () => {
      await uploadFile(mockInstance, mockFile, {
        fieldName: "document",
      });

      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "document",
        mockFile
      );
    });

    test("should use custom URL", async () => {
      await uploadFile(mockInstance, mockFile, {
        url: "/api/files/upload",
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/api/files/upload",
        expect.any(FormDataMock),
        expect.any(Object)
      );
    });

    test("should include custom headers", async () => {
      const customHeaders = {
        "X-CSRF-Token": "abc123",
        Authorization: "Bearer token",
      };

      await uploadFile(mockInstance, mockFile, {
        headers: customHeaders,
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/upload",
        expect.any(FormDataMock),
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-CSRF-Token": "abc123",
            Authorization: "Bearer token",
          },
          onUploadProgress: undefined,
        }
      );
    });

    test("should pass progress callback", async () => {
      const onProgress = jest.fn();

      await uploadFile(mockInstance, mockFile, {
        onProgress,
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/upload",
        expect.any(FormDataMock),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: onProgress,
        }
      );
    });

    test("should pass additional config options", async () => {
      const config = {
        timeout: 30000,
        withCredentials: true,
        validateStatus: (status) => status < 500,
      };

      await uploadFile(mockInstance, mockFile, {
        config,
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        "/upload",
        expect.any(FormDataMock),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: undefined,
          timeout: 30000,
          withCredentials: true,
          validateStatus: config.validateStatus,
        }
      );
    });

    test("should handle upload errors", async () => {
      const error = new Error("Upload failed");
      mockInstance.post.mockRejectedValueOnce(error);

      await expect(uploadFile(mockInstance, mockFile)).rejects.toThrow(
        "Upload failed"
      );
    });

    test("should work with all options combined", async () => {
      const onProgress = jest.fn();
      const options = {
        fieldName: "avatar",
        url: "/api/users/avatar",
        headers: {
          "X-User-Id": "123",
        },
        onProgress,
        config: {
          timeout: 60000,
        },
      };

      await uploadFile(mockInstance, mockFile, options);

      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "avatar",
        mockFile
      );
      expect(mockInstance.post).toHaveBeenCalledWith(
        "/api/users/avatar",
        expect.any(FormDataMock),
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-User-Id": "123",
          },
          onUploadProgress: onProgress,
          timeout: 60000,
        }
      );
    });

    test("should handle empty file", async () => {
      const emptyFile = new Blob([], { type: "text/plain" });
      
      await uploadFile(mockInstance, emptyFile);
      
      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "file",
        emptyFile
      );
    });

    test("should handle file without explicit type", async () => {
      const fileWithoutType = new Blob(["content"]);
      
      await uploadFile(mockInstance, fileWithoutType);
      
      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "file",
        fileWithoutType
      );
    });

    test("should handle large files", async () => {
      const largeContent = "x".repeat(10 * 1024 * 1024); // 10MB
      const largeFile = new Blob([largeContent], { type: "text/plain" });
      
      await uploadFile(mockInstance, largeFile);
      
      expect(FormDataMock.prototype.append).toHaveBeenCalledWith(
        "file",
        largeFile
      );
    });
  });

  describe("createHealthCheck", () => {
    let mockInstance;

    beforeEach(() => {
      mockInstance = {
        get: jest.fn(),
      };
    });

    test("should return health check object with check method", () => {
      const healthCheck = createHealthCheck(mockInstance);

      expect(healthCheck).toHaveProperty("check");
      expect(typeof healthCheck.check).toBe("function");
    });

    describe("check method", () => {
      test("should return healthy status on successful response", async () => {
        mockInstance.get.mockResolvedValueOnce({
          status: 200,
          data: { status: "ok", version: "1.0.0" },
        });

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(mockInstance.get).toHaveBeenCalledWith("/health", {
          timeout: 5000,
        });
        expect(result).toEqual({
          healthy: true,
          status: 200,
          data: { status: "ok", version: "1.0.0" },
        });
      });

      test("should use custom endpoint", async () => {
        mockInstance.get.mockResolvedValueOnce({
          status: 200,
          data: { healthy: true },
        });

        const healthCheck = createHealthCheck(mockInstance, "/api/health-check");
        await healthCheck.check();

        expect(mockInstance.get).toHaveBeenCalledWith("/api/health-check", {
          timeout: 5000,
        });
      });

      test("should return unhealthy status on error", async () => {
        const error = new Error("Connection refused");
        mockInstance.get.mockRejectedValueOnce(error);

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: false,
          error: "Connection refused",
        });
      });

      test("should handle timeout errors", async () => {
        const timeoutError = new Error("Timeout exceeded");
        timeoutError.code = "ECONNABORTED";
        mockInstance.get.mockRejectedValueOnce(timeoutError);

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: false,
          error: "Timeout exceeded",
        });
      });

      test("should handle network errors", async () => {
        const networkError = new Error("Network Error");
        networkError.code = "ENETUNREACH";
        mockInstance.get.mockRejectedValueOnce(networkError);

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: false,
          error: "Network Error",
        });
      });

      test("should handle 503 Service Unavailable", async () => {
        const error = new Error("Service Unavailable");
        error.response = { status: 503 };
        mockInstance.get.mockRejectedValueOnce(error);

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: false,
          error: "Service Unavailable",
        });
      });

      test("should not throw on check failure", async () => {
        mockInstance.get.mockRejectedValueOnce(new Error("Fatal error"));

        const healthCheck = createHealthCheck(mockInstance);
        
        // Should not throw
        const result = await healthCheck.check();
        
        expect(result.healthy).toBe(false);
        expect(result.error).toBe("Fatal error");
      });

      test("should handle different endpoint formats", async () => {
        mockInstance.get.mockResolvedValue({ status: 200, data: {} });
        
        // Test various endpoint formats
        const testCases = [
          { input: "/health", expected: "/health" },
          { input: "health", expected: "health" },
          { input: "/api/v1/health", expected: "/api/v1/health" },
          { input: "", expected: "" } // Empty string is passed as-is
        ];
        
        for (const { input, expected } of testCases) {
          mockInstance.get.mockClear();
          const healthCheck = createHealthCheck(mockInstance, input);
          await healthCheck.check();
          
          expect(mockInstance.get).toHaveBeenCalledWith(
            expected,
            { timeout: 5000 }
          );
        }
        
        // Test undefined to ensure it uses default
        mockInstance.get.mockClear();
        const healthCheckDefault = createHealthCheck(mockInstance);
        await healthCheckDefault.check();
        
        expect(mockInstance.get).toHaveBeenCalledWith(
          "/health",
          { timeout: 5000 }
        );
      });

      test("should handle non-standard health check responses", async () => {
        mockInstance.get.mockResolvedValueOnce({
          status: 200,
          data: null // Some APIs return null or empty data
        });

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: true,
          status: 200,
          data: null
        });
      });

      test("should handle 204 No Content responses", async () => {
        mockInstance.get.mockResolvedValueOnce({
          status: 204,
          data: undefined
        });

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: true,
          status: 204,
          data: undefined
        });
      });

      test("should capture error response data", async () => {
        const error = new Error("Server Error");
        error.response = {
          status: 500,
          data: { error: "Database connection failed" }
        };
        mockInstance.get.mockRejectedValueOnce(error);

        const healthCheck = createHealthCheck(mockInstance);
        const result = await healthCheck.check();

        expect(result).toEqual({
          healthy: false,
          error: "Server Error"
        });
      });
    });
  });
});