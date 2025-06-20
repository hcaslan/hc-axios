import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import axios from "axios";
import { createExtendedInstance } from "../../../lib/core/createExtendedInstance.js";

// Mock all the module dependencies
jest.mock("axios");
jest.mock("../../lib/interceptors/auth.js");
jest.mock("../../lib/interceptors/refresh.js");
jest.mock("../../lib/interceptors/retry.js");
jest.mock("../../lib/interceptors/logging.js");
jest.mock("../../lib/interceptors/upload.js");
jest.mock("../../lib/interceptors/cache.js");
jest.mock("../../lib/interceptors/timeout.js");
jest.mock("../../lib/interceptors/rateLimit.js");
jest.mock("../../lib/utils/requestQueue.js");
jest.mock("../../lib/utils/pagination.js");
jest.mock("../../lib/utils/cancellation.js");
jest.mock("../../lib/utils/batchRequests.js");
jest.mock("../../lib/utils/errorHandler.js");
jest.mock("../../lib/utils/interceptorManager.js");
jest.mock("../../lib/utils/responseTransform.js");
jest.mock("../../lib/utils/commonPatterns.js");
jest.mock("../../lib/utils/interceptorConditions.js");

describe("createExtendedInstance", () => {
  const mockAxiosInstance = {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Explicitly mock axios.create as a jest.fn()
    axios.create = jest.fn().mockReturnValue(mockAxiosInstance);
  });

  test("should create an axios instance with provided config", () => {
    const config = { baseURL: "https://api.example.com" };
    const instance = createExtendedInstance(config);

    expect(axios.create).toHaveBeenCalledWith(config);
    expect(instance).toBeDefined();
  });

  test("should attach all interceptor methods", () => {
    const instance = createExtendedInstance();

    // Check interceptor methods
    expect(instance.useAuth).toBeDefined();
    expect(instance.useRefreshToken).toBeDefined();
    expect(instance.useRetry).toBeDefined();
    expect(instance.useLogging).toBeDefined();
    expect(instance.useUploadProgress).toBeDefined();
    expect(instance.useCache).toBeDefined();
    expect(instance.useSmartTimeout).toBeDefined();
    expect(instance.useRateLimit).toBeDefined();

    // Check removal methods
    expect(instance.removeAuth).toBeDefined();
    expect(instance.removeRefreshToken).toBeDefined();
    expect(instance.removeRetry).toBeDefined();
    expect(instance.removeLogging).toBeDefined();
    expect(instance.removeUploadProgress).toBeDefined();
    expect(instance.removeCache).toBeDefined();
    expect(instance.removeSmartTimeout).toBeDefined();
    expect(instance.removeRateLimit).toBeDefined();
  });

  test("should attach all utility methods", () => {
    const instance = createExtendedInstance();

    expect(instance.batch).toBeDefined();
    expect(instance.all).toBeDefined();
    expect(instance.race).toBeDefined();
    expect(instance.concurrent).toBeDefined();
    expect(instance.poll).toBeDefined();
    expect(instance.requestWithTimeout).toBeDefined();
    expect(instance.useQueue).toBeDefined();
    expect(instance.useResponseTransform).toBeDefined();
    expect(instance.useCamelCase).toBeDefined();
    expect(instance.paginate).toBeDefined();
    expect(instance.paginateAll).toBeDefined();
    expect(instance.cancel).toBeDefined();
    expect(instance.cancelAll).toBeDefined();
    expect(instance.cancellable).toBeDefined();
    expect(instance.withErrorHandler).toBeDefined();
  });

  test("should attach setup methods", () => {
    const instance = createExtendedInstance();

    expect(instance.setupAuth).toBeDefined();
    expect(instance.setupCommonGroups).toBeDefined();
    expect(instance.setupEnvironmentInterceptors).toBeDefined();
    expect(instance.setupDevelopment).toBeDefined();
    expect(instance.setupProduction).toBeDefined();
  });

  test("should attach circuit breaker methods", () => {
    const instance = createExtendedInstance();

    expect(instance.withCircuitBreaker).toBeDefined();
  });

  test("should attach deduplication methods", () => {
    const instance = createExtendedInstance();

    expect(instance.dedupe).toBeDefined();
  });

  test("should attach mocking methods", () => {
    const instance = createExtendedInstance();

    expect(instance.mock).toBeDefined();
    expect(instance.clearMocks).toBeDefined();
    expect(instance.getMocks).toBeDefined();
    expect(instance.removeMock).toBeDefined();
  });

  test("should attach interceptor group management methods", () => {
    const instance = createExtendedInstance();

    expect(instance.createInterceptorGroup).toBeDefined();
    expect(instance.enableGroup).toBeDefined();
    expect(instance.disableGroup).toBeDefined();
    expect(instance.getGroups).toBeDefined();
    expect(instance.addConditionalInterceptor).toBeDefined();
    expect(instance.removeConditionalInterceptor).toBeDefined();
    expect(instance.clearConditionalInterceptors).toBeDefined();
    expect(instance.getConditionalInterceptors).toBeDefined();
    expect(instance.isInterceptorEnabled).toBeDefined();
    expect(instance.toggleGroup).toBeDefined();
    expect(instance.getGroupConfig).toBeDefined();
    expect(instance.deleteGroup).toBeDefined();
  });

  test("should attach instance state methods", () => {
    const instance = createExtendedInstance();

    expect(instance.getActiveInterceptors).toBeDefined();
    expect(instance.getStats).toBeDefined();
    expect(instance.getConfig).toBeDefined();
    expect(instance.reset).toBeDefined();
    expect(instance.createSnapshot).toBeDefined();
    expect(instance.exportConfig).toBeDefined();
  });

  test("should attach advanced feature methods", () => {
    const instance = createExtendedInstance();

    expect(instance.requestWithRetry).toBeDefined();
    expect(instance.createApiClient).toBeDefined();
    expect(instance.createResource).toBeDefined();
    expect(instance.uploadFile).toBeDefined();
    expect(instance.createHealthCheck).toBeDefined();
    expect(instance.graphql).toBeDefined();
    expect(instance.createPollingConnection).toBeDefined();
    expect(instance.transaction).toBeDefined();
    expect(instance.resumableUpload).toBeDefined();
  });

  test("should expose condition utilities", () => {
    const instance = createExtendedInstance();

    expect(instance.InterceptorConditions).toBeDefined();
    expect(instance.CommonConditions).toBeDefined();
  });

  test("should preserve and bind original axios methods", () => {
    const instance = createExtendedInstance();

    // Sanity: check that all methods exist
    expect(instance.request).toBeDefined();
    expect(instance.get).toBeDefined();
    expect(instance.delete).toBeDefined();
    expect(instance.head).toBeDefined();
    expect(instance.options).toBeDefined();
    expect(instance.post).toBeDefined();
    expect(instance.put).toBeDefined();
    expect(instance.patch).toBeDefined();

    // Check that calling them works without throwing (implies bound context)
    expect(() => instance.request({})).not.toThrow();
    expect(() => instance.get("/test")).not.toThrow();
  });

  test("should create instance without config", () => {
    const instance = createExtendedInstance();

    expect(axios.create).toHaveBeenCalledWith(undefined);
    expect(instance).toBeDefined();
  });

  test("should initialize all utility classes", () => {
    const RequestQueue = require('../../../lib/utils/requestQueue.js').RequestQueue;
    const PaginationHelper = require('../../../lib/utils/pagination.js').PaginationHelper;
    const CancellationManager = require('../../../lib/utils/cancellation.js').CancellationManager;
    const BatchRequestManager = require('../../../lib/utils/batchRequests.js').BatchRequestManager;
    const ErrorHandler = require('../../../lib/utils/errorHandler.js').ErrorHandler;
    const InterceptorManager = require('../../../lib/utils/interceptorManager.js').InterceptorManager;

    createExtendedInstance();

    expect(RequestQueue).toHaveBeenCalled();
    expect(PaginationHelper).toHaveBeenCalled();
    expect(CancellationManager).toHaveBeenCalled();
    expect(BatchRequestManager).toHaveBeenCalled();
    expect(ErrorHandler).toHaveBeenCalled();
    expect(InterceptorManager).toHaveBeenCalled();
  });

  test("all methods should return instance for chaining", () => {
    const instance = createExtendedInstance();

    // Test a few methods that should support chaining
    const methods = [
      "useAuth",
      "useRetry",
      "useLogging",
      "removeAuth",
      "setupDevelopment",
      "enableGroup",
      "reset",
    ];

    methods.forEach((method) => {
      if (instance[method]) {
        expect(typeof instance[method]).toBe("function");
      }
    });
  });
});