import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { attachInterceptorGroupManagement } from "../../../lib/core/interceptorGroupManagement.js";

describe("interceptorGroupManagement", () => {
  let mockInstance;
  let mockInterceptorManager;

  beforeEach(() => {
    mockInstance = {};

    mockInterceptorManager = {
      createGroup: jest.fn(),
      enableGroup: jest.fn(),
      disableGroup: jest.fn(),
      getGroups: jest.fn().mockReturnValue(["test-group", "api-group"]),
      addConditionalInterceptor: jest.fn().mockReturnValue(123),
      removeConditionalInterceptor: jest.fn(),
      clearConditionalInterceptors: jest.fn(),
      getConditionalInterceptors: jest.fn().mockReturnValue([]),
      isEnabled: jest.fn(),
      isGroupEnabled: jest.fn(),
      getGroupConfig: jest.fn(),
      deleteGroup: jest.fn(),
    };
  });

  test("should attach all group management methods", () => {
    attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

    expect(mockInstance.createInterceptorGroup).toBeDefined();
    expect(mockInstance.enableGroup).toBeDefined();
    expect(mockInstance.disableGroup).toBeDefined();
    expect(mockInstance.getGroups).toBeDefined();
    expect(mockInstance.addConditionalInterceptor).toBeDefined();
    expect(mockInstance.removeConditionalInterceptor).toBeDefined();
    expect(mockInstance.clearConditionalInterceptors).toBeDefined();
    expect(mockInstance.getConditionalInterceptors).toBeDefined();
    expect(mockInstance.isInterceptorEnabled).toBeDefined();
    expect(mockInstance.toggleGroup).toBeDefined();
    expect(mockInstance.getGroupConfig).toBeDefined();
    expect(mockInstance.deleteGroup).toBeDefined();
  });

  describe("createInterceptorGroup", () => {
    test("should create interceptor group", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.createInterceptorGroup("auth-group", [
        "auth",
        "retry",
      ]);

      expect(mockInterceptorManager.createGroup).toHaveBeenCalledWith(
        "auth-group",
        ["auth", "retry"]
      );
      expect(result).toBe(mockInstance);
    });
  });

  describe("enableGroup", () => {
    test("should enable interceptor group", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.enableGroup("test-group");

      expect(mockInterceptorManager.enableGroup).toHaveBeenCalledWith(
        "test-group",
        mockInstance
      );
      expect(result).toBe(mockInstance);
    });
  });

  describe("disableGroup", () => {
    test("should disable interceptor group", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.disableGroup("test-group");

      expect(mockInterceptorManager.disableGroup).toHaveBeenCalledWith(
        "test-group",
        mockInstance
      );
      expect(result).toBe(mockInstance);
    });
  });

  describe("getGroups", () => {
    test("should return all groups", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const groups = mockInstance.getGroups();

      expect(mockInterceptorManager.getGroups).toHaveBeenCalled();
      expect(groups).toEqual(["test-group", "api-group"]);
    });
  });

  describe("addConditionalInterceptor", () => {
    test("should add request conditional interceptor", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const condition = (config) => config.url.includes("/api");
      const onFulfilled = (config) => config;

      const id = mockInstance.addConditionalInterceptor(
        "request",
        condition,
        onFulfilled
      );

      expect(
        mockInterceptorManager.addConditionalInterceptor
      ).toHaveBeenCalledWith(
        mockInstance,
        "request",
        condition,
        onFulfilled,
        undefined
      );
      expect(id).toBe(123);
    });

    test("should add response conditional interceptor with error handler", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const condition = (config) => config.url.includes("/api");
      const onFulfilled = (response) => response;
      const onRejected = (error) => Promise.reject(error);

      mockInstance.addConditionalInterceptor(
        "response",
        condition,
        onFulfilled,
        onRejected
      );

      expect(
        mockInterceptorManager.addConditionalInterceptor
      ).toHaveBeenCalledWith(
        mockInstance,
        "response",
        condition,
        onFulfilled,
        onRejected
      );
    });
  });

  describe("removeConditionalInterceptor", () => {
    test("should remove conditional interceptor", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.removeConditionalInterceptor(123);

      expect(
        mockInterceptorManager.removeConditionalInterceptor
      ).toHaveBeenCalledWith(123);
      expect(result).toBe(mockInstance);
    });
  });

  describe("clearConditionalInterceptors", () => {
    test("should clear all conditional interceptors", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.clearConditionalInterceptors();

      expect(
        mockInterceptorManager.clearConditionalInterceptors
      ).toHaveBeenCalled();
      expect(result).toBe(mockInstance);
    });
  });

  describe("getConditionalInterceptors", () => {
    test("should return conditional interceptors", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const interceptors = [
        { id: 1, type: "request", condition: () => true },
        { id: 2, type: "response", condition: () => false },
      ];
      mockInterceptorManager.getConditionalInterceptors.mockReturnValue(
        interceptors
      );

      const result = mockInstance.getConditionalInterceptors();

      expect(result).toEqual(interceptors);
    });
  });

  describe("isInterceptorEnabled", () => {
    test("should check if interceptor is enabled", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      mockInterceptorManager.isEnabled.mockReturnValue(true);

      const result = mockInstance.isInterceptorEnabled("auth");

      expect(mockInterceptorManager.isEnabled).toHaveBeenCalledWith("auth");
      expect(result).toBe(true);
    });
  });

  describe("toggleGroup", () => {
    test("should toggle enabled group to disabled", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      mockInterceptorManager.isGroupEnabled.mockReturnValue(true);

      mockInstance.disableGroup = jest.fn().mockReturnThis();

      const result = mockInstance.toggleGroup("test-group");

      expect(mockInterceptorManager.isGroupEnabled).toHaveBeenCalledWith(
        "test-group"
      );
      expect(mockInstance.disableGroup).toHaveBeenCalledWith("test-group");
      expect(result).toBe(false);
    });

    test("should toggle disabled group to enabled", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      mockInterceptorManager.isGroupEnabled.mockReturnValue(false);

      mockInstance.enableGroup = jest.fn().mockReturnThis();

      const result = mockInstance.toggleGroup("test-group");

      expect(mockInstance.enableGroup).toHaveBeenCalledWith("test-group");
      expect(result).toBe(true);
    });
  });

  describe("getGroupConfig", () => {
    test("should return group configuration", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const config = {
        name: "test-group",
        interceptors: ["auth", "retry"],
        enabled: true,
      };
      mockInterceptorManager.getGroupConfig.mockReturnValue(config);

      const result = mockInstance.getGroupConfig("test-group");

      expect(mockInterceptorManager.getGroupConfig).toHaveBeenCalledWith(
        "test-group"
      );
      expect(result).toEqual(config);
    });
  });

  describe("deleteGroup", () => {
    test("should delete interceptor group", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const result = mockInstance.deleteGroup("test-group");

      expect(mockInterceptorManager.deleteGroup).toHaveBeenCalledWith(
        "test-group"
      );
      expect(result).toBe(mockInstance);
    });
  });

  describe("chaining", () => {
    test("all methods should return instance for chaining", () => {
      attachInterceptorGroupManagement(mockInstance, mockInterceptorManager);

      const chainableMethods = [
        "createInterceptorGroup",
        "enableGroup",
        "disableGroup",
        "removeConditionalInterceptor",
        "clearConditionalInterceptors",
        "deleteGroup",
      ];

      chainableMethods.forEach((method) => {
        const result = mockInstance[method]("test");
        expect(result).toBe(mockInstance);
      });
    });
  });
});
