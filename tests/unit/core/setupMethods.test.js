import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { attachSetupMethods } from "../../../lib/core/setupMethods.js";

describe("setupMethods", () => {
  let mockInstance;
  let originalEnv;

  beforeEach(() => {
    mockInstance = {
      useAuth: jest.fn().mockReturnThis(),
      useRefreshToken: jest.fn().mockReturnThis(),
      useRetry: jest.fn().mockReturnThis(),
      useLogging: jest.fn().mockReturnThis(),
      useSmartTimeout: jest.fn().mockReturnThis(),
      useCache: jest.fn().mockReturnThis(),
      useRateLimit: jest.fn().mockReturnThis(),
      createInterceptorGroup: jest.fn().mockReturnThis(),
      enableGroup: jest.fn().mockReturnThis(),
      addConditionalInterceptor: jest.fn().mockReturnThis(),
      setupCommonGroups: jest.fn().mockReturnThis(),
      setupEnvironmentInterceptors: jest.fn().mockReturnThis(),
    };

    // Store original NODE_ENV
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  test("should attach all setup methods", () => {
    attachSetupMethods(mockInstance);

    expect(mockInstance.setupAuth).toBeDefined();
    expect(mockInstance.setupCommonGroups).toBeDefined();
    expect(mockInstance.setupEnvironmentInterceptors).toBeDefined();
    expect(mockInstance.setupDevelopment).toBeDefined();
    expect(mockInstance.setupProduction).toBeDefined();
  });

  describe("setupAuth", () => {
    test("should setup auth with token function", () => {
      attachSetupMethods(mockInstance);

      const getToken = () => "auth-token";
      mockInstance.setupAuth({ getToken });

      expect(mockInstance.useAuth).toHaveBeenCalledWith(getToken);
    });

    test("should setup refresh token", () => {
      attachSetupMethods(mockInstance);

      const refreshConfig = {
        refreshUrl: "/refresh",
        getRefreshToken: () => "refresh-token",
      };

      mockInstance.setupAuth({ refresh: refreshConfig });

      expect(mockInstance.useRefreshToken).toHaveBeenCalledWith(refreshConfig);
    });

    test("should setup both auth and refresh", () => {
      attachSetupMethods(mockInstance);

      const authConfig = {
        getToken: () => "auth-token",
        refresh: { refreshUrl: "/refresh" },
      };

      mockInstance.setupAuth(authConfig);

      expect(mockInstance.useAuth).toHaveBeenCalled();
      expect(mockInstance.useRefreshToken).toHaveBeenCalled();
    });
  });

  describe("setupCommonGroups", () => {
    test("should create predefined interceptor groups", () => {
      attachSetupMethods(mockInstance);

      mockInstance.setupCommonGroups();

      expect(mockInstance.createInterceptorGroup).toHaveBeenCalledWith(
        "api-calls",
        ["auth", "retry", "cache"]
      );
      expect(mockInstance.createInterceptorGroup).toHaveBeenCalledWith(
        "development",
        ["logging", "retry"]
      );
      expect(mockInstance.createInterceptorGroup).toHaveBeenCalledWith(
        "production",
        ["auth", "retry", "cache", "rateLimit"]
      );
      expect(mockInstance.createInterceptorGroup).toHaveBeenCalledWith(
        "upload",
        ["auth", "upload", "retry"]
      );
    });
  });

  describe("setupEnvironmentInterceptors", () => {
    test("should add development interceptors", () => {
      attachSetupMethods(mockInstance);
      process.env.NODE_ENV = "development";

      mockInstance.setupEnvironmentInterceptors();

      // Check request interceptor was added
      expect(mockInstance.addConditionalInterceptor).toHaveBeenCalledWith(
        "request",
        expect.any(Function),
        expect.any(Function)
      );

      // Test the condition function
      const devCondition =
        mockInstance.addConditionalInterceptor.mock.calls[0][1];
      expect(devCondition({})).toBe(true);
    });

    test("should add production interceptors", () => {
      attachSetupMethods(mockInstance);
      process.env.NODE_ENV = "production";

      mockInstance.setupEnvironmentInterceptors();

      // Check response interceptor was added
      expect(mockInstance.addConditionalInterceptor).toHaveBeenCalledWith(
        "response",
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );

      // Test the condition function
      const prodCondition =
        mockInstance.addConditionalInterceptor.mock.calls[1][1];
      expect(prodCondition({ url: "/api/users" })).toBe(true);
      expect(prodCondition({ url: "/other" })).toBe(false);
    });
  });

  describe("setupDevelopment", () => {
    test("should setup development configuration", () => {
      attachSetupMethods(mockInstance);

      // Mock all functions used within setupDevelopment
      mockInstance.setupCommonGroups = jest.fn();
      mockInstance.enableGroup = jest.fn();
      mockInstance.setupEnvironmentInterceptors = jest.fn();
      mockInstance.useLogging = jest.fn();
      mockInstance.useRetry = jest.fn();
      mockInstance.useSmartTimeout = jest.fn();

      mockInstance.setupDevelopment();

      expect(mockInstance.setupCommonGroups).toHaveBeenCalled();
      expect(mockInstance.enableGroup).toHaveBeenCalledWith("development");
      expect(mockInstance.setupEnvironmentInterceptors).toHaveBeenCalled();
      expect(mockInstance.useLogging).toHaveBeenCalledWith({
        logRequests: true,
        logResponses: true,
        logErrors: true,
      });
      expect(mockInstance.useRetry).toHaveBeenCalledWith({
        retries: 3,
        retryDelay: 1000,
      });
      expect(mockInstance.useSmartTimeout).toHaveBeenCalledWith({
        timeout: 30000,
      });
    });

    test("should merge custom options", () => {
      attachSetupMethods(mockInstance);

      const options = {
        logging: { logRequests: false },
        retry: { retries: 5 },
        timeout: { timeout: 60000 },
      };

      mockInstance.setupDevelopment(options);

      expect(mockInstance.useLogging).toHaveBeenCalledWith({
        logRequests: false,
        logResponses: true,
        logErrors: true,
      });
      expect(mockInstance.useRetry).toHaveBeenCalledWith({
        retries: 5,
        retryDelay: 1000,
      });
      expect(mockInstance.useSmartTimeout).toHaveBeenCalledWith({
        timeout: 60000,
      });
    });

    test("should skip timeout if disabled", () => {
      attachSetupMethods(mockInstance);

      mockInstance.setupDevelopment({ timeout: false });

      expect(mockInstance.useSmartTimeout).not.toHaveBeenCalled();
    });
  });

  describe("setupProduction", () => {
    test("should setup production configuration", () => {
      attachSetupMethods(mockInstance);

      // Ensure all dependent methods are mocked
      mockInstance.setupCommonGroups = jest.fn();
      mockInstance.enableGroup = jest.fn();
      mockInstance.setupEnvironmentInterceptors = jest.fn();
      mockInstance.setupAuth = jest.fn();
      mockInstance.useRetry = jest.fn();
      mockInstance.useCache = jest.fn();
      mockInstance.useRateLimit = jest.fn();
      mockInstance.useSmartTimeout = jest.fn();

      mockInstance.setupProduction();

      expect(mockInstance.setupCommonGroups).toHaveBeenCalled();
      expect(mockInstance.enableGroup).toHaveBeenCalledWith("production");
      expect(mockInstance.setupEnvironmentInterceptors).toHaveBeenCalled();

      expect(mockInstance.useRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          retries: 5,
          retryDelay: 1000,
          retryCondition: expect.any(Function),
        })
      );

      expect(mockInstance.useCache).toHaveBeenCalledWith(
        expect.objectContaining({
          maxAge: 5 * 60 * 1000,
        })
      );

      expect(mockInstance.useRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRequests: 100,
          perMilliseconds: 60000,
        })
      );

      expect(mockInstance.useSmartTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    test("should setup auth if provided", () => {
      attachSetupMethods(mockInstance);

      const authConfig = {
        getToken: () => "token",
        refresh: { refreshUrl: "/refresh" },
      };

      mockInstance.setupAuth = jest.fn();

      mockInstance.setupProduction({ auth: authConfig });

      expect(mockInstance.setupAuth).toHaveBeenCalledWith(authConfig);
    });

    test("should skip cache if disabled", () => {
      attachSetupMethods(mockInstance);

      mockInstance.setupProduction({ cache: false });

      expect(mockInstance.useCache).not.toHaveBeenCalled();
    });

    test("should skip rate limit if disabled", () => {
      attachSetupMethods(mockInstance);

      mockInstance.setupProduction({ rateLimit: false });

      expect(mockInstance.useRateLimit).not.toHaveBeenCalled();
    });

    test("should merge custom options", () => {
      attachSetupMethods(mockInstance);

      const options = {
        retry: { retries: 10, retryDelay: 2000 },
        cache: { maxAge: 10000 },
        rateLimit: { maxRequests: 50 },
        timeout: { timeout: 120000 },
      };

      mockInstance.setupProduction(options);

      expect(mockInstance.useRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          retries: 10,
          retryDelay: 2000,
        })
      );

      expect(mockInstance.useCache).toHaveBeenCalledWith({
        maxAge: 10000,
      });

      expect(mockInstance.useRateLimit).toHaveBeenCalledWith({
        maxRequests: 50,
        perMilliseconds: 60000,
      });

      expect(mockInstance.useSmartTimeout).toHaveBeenCalledWith({
        timeout: 120000,
      });
    });

    test("should test retry condition function", () => {
      attachSetupMethods(mockInstance);

      mockInstance.setupProduction();

      const retryCall = mockInstance.useRetry.mock.calls[0][0];
      const retryCondition = retryCall.retryCondition;

      // Should retry on connection abort
      expect(retryCondition({ code: "ECONNABORTED" })).toBe(true);

      // Should retry on 500+ errors
      expect(retryCondition({ response: { status: 500 } })).toBe(true);
      expect(retryCondition({ response: { status: 503 } })).toBe(true);

      // Should retry on 429 (rate limit)
      expect(retryCondition({ response: { status: 429 } })).toBe(true);

      // Should not retry on client errors
      expect(retryCondition({ response: { status: 400 } })).toBe(false);
      expect(retryCondition({ response: { status: 404 } })).toBe(false);
    });

    test("should chain method calls", () => {
      attachSetupMethods(mockInstance);

      const result = mockInstance.setupProduction();

      expect(result).toBe(mockInstance);
    });
  });

  describe("chaining", () => {
    test("all setup methods should return instance for chaining", () => {
      attachSetupMethods(mockInstance);

      const methods = [
        "setupAuth",
        "setupCommonGroups",
        "setupEnvironmentInterceptors",
        "setupDevelopment",
        "setupProduction",
      ];

      methods.forEach((method) => {
        const result = mockInstance[method]({});
        expect(result).toBe(mockInstance);
      });
    });
  });
});
