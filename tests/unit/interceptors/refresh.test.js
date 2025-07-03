import { describe, test, expect, jest, beforeEach } from "@jest/globals";

jest.unstable_mockModule("axios", () => {
  return {
    default: jest.fn(),
  };
});

const { attachRefreshInterceptor } = await import(
  "../../../lib/interceptors/refresh.js"
);
const axios = (await import("axios")).default;

describe("attachRefreshInterceptor", () => {
  let mockInstance;
  let mockOptions;
  let successHandler;
  let errorHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = jest.fn();
    mockInstance.interceptors = {
      response: {
        use: jest.fn(),
      },
    };

    mockInstance.interceptors.response.use.mockImplementation(
      (onSuccess, onError) => {
        successHandler = onSuccess;
        errorHandler = onError;
        return 123; // interceptor ID
      }
    );

    // Default options
    mockOptions = {
      getAccessToken: jest.fn(),
      getRefreshToken: jest.fn(),
      setAccessToken: jest.fn(),
      setRefreshToken: jest.fn(),
      onRefreshTokenFail: jest.fn(),
      refreshUrl: "/auth/refresh",
      refreshRequestConfig: null,
      handleRefreshResponse: null,
    };
  });

  test("should attach interceptor and return interceptor ID", () => {
    const interceptorId = attachRefreshInterceptor(mockInstance, mockOptions);

    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
    expect(interceptorId).toBe(123);
  });

  test("should pass through successful responses", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const response = { status: 200, data: { message: "success" } };
    const result = await successHandler(response);

    expect(result).toBe(response);
  });

  test("should pass through network errors", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = new Error("Network Error");
    // No response property means network error

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(mockOptions.onRefreshTokenFail).not.toHaveBeenCalled();
  });

  test("should pass through non-401 errors", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 500, data: { error: "Server Error" } },
      config: {},
    };

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(mockOptions.getRefreshToken).not.toHaveBeenCalled();
  });

  test("should not retry if request already retried", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: { _retry: true },
    };

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(mockOptions.getRefreshToken).not.toHaveBeenCalled();
  });

  test("should handle missing refresh token", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {},
    };
    mockOptions.getRefreshToken.mockReturnValue(null);

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(mockOptions.onRefreshTokenFail).toHaveBeenCalled();
  });

  test("should successfully refresh token and retry request", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {
        headers: { Authorization: "Bearer old-token" },
        method: "get",
        url: "/api/protected",
      },
    };

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    // Mock successful refresh response
    const refreshResponse = {
      data: {
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      },
    };
    axios.mockResolvedValue(refreshResponse);

    // Mock retried request
    const retriedResponse = { data: { success: true } };
    mockInstance.mockResolvedValue(retriedResponse);

    const result = await errorHandler(error);

    // Verify refresh request was made with default config
    expect(axios).toHaveBeenCalledWith({
      method: "post",
      url: "/auth/refresh",
      params: { refreshToken: "refresh-token-123" },
    });

    // Verify tokens were updated
    expect(mockOptions.setAccessToken).toHaveBeenCalledWith("new-access-token");
    expect(mockOptions.setRefreshToken).toHaveBeenCalledWith(
      "new-refresh-token"
    );

    // Verify original request was retried with new token
    expect(mockInstance).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer new-access-token" },
      method: "get",
      url: "/api/protected",
      _retry: true,
    });

    expect(result).toBe(retriedResponse);
  });

  test("should handle refresh token failure", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {},
    };

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    const refreshError = new Error("Refresh failed");
    axios.mockRejectedValue(refreshError);

    await expect(errorHandler(error)).rejects.toBe(refreshError);

    expect(mockOptions.onRefreshTokenFail).toHaveBeenCalled();
    expect(mockOptions.setAccessToken).not.toHaveBeenCalled();
  });

  test("should prevent multiple simultaneous refresh requests", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error1 = {
      response: { status: 401 },
      config: {},
    };
    const error2 = {
      response: { status: 401 },
      config: {},
    };

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    // Mock delayed refresh response
    let resolveRefresh;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    axios.mockReturnValue(refreshPromise);

    // Start two refresh attempts simultaneously
    const promise1 = errorHandler(error1);
    const promise2 = errorHandler(error2);

    // Only one refresh request should be made
    expect(axios).toHaveBeenCalledTimes(1);

    // Resolve the refresh
    resolveRefresh({
      data: {
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      },
    });

    mockInstance.mockResolvedValue({ data: "success" });

    await Promise.all([promise1, promise2]);

    // Still only one refresh request
    expect(axios).toHaveBeenCalledTimes(1);
    // But both original requests should be retried
    expect(mockInstance).toHaveBeenCalledTimes(2);
  });

  test("should use custom refresh request config", async () => {
    mockOptions.refreshRequestConfig = jest.fn().mockReturnValue({
      method: "put",
      url: "/custom/refresh",
      headers: { "X-Refresh": "true" },
      data: { token: "refresh-token-123" },
    });

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {},
    };

    axios.mockResolvedValue({
      data: {
        token: "new-token",
        refreshToken: "new-refresh",
      },
    });
    mockInstance.mockResolvedValue({ success: true });

    await errorHandler(error);

    expect(mockOptions.refreshRequestConfig).toHaveBeenCalledWith(
      "refresh-token-123"
    );
    expect(axios).toHaveBeenCalledWith({
      method: "put",
      url: "/custom/refresh",
      headers: { "X-Refresh": "true" },
      data: { token: "refresh-token-123" },
    });
  });

  test("should use custom response handler", async () => {
    mockOptions.handleRefreshResponse = jest.fn().mockReturnValue({
      token: "custom-access-token",
      refreshToken: "custom-refresh-token",
    });

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {},
    };

    const refreshResponse = {
      data: {
        access_token: "server-access-token",
        refresh_token: "server-refresh-token",
      },
    };
    axios.mockResolvedValue(refreshResponse);
    mockInstance.mockResolvedValue({ success: true });

    await errorHandler(error);

    expect(mockOptions.handleRefreshResponse).toHaveBeenCalledWith(
      refreshResponse
    );
    expect(mockOptions.setAccessToken).toHaveBeenCalledWith(
      "custom-access-token"
    );
    expect(mockOptions.setRefreshToken).toHaveBeenCalledWith(
      "custom-refresh-token"
    );
  });

  test("should handle invalid refresh response structure", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {},
    };

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    // Response missing required fields
    axios.mockResolvedValue({
      data: { message: "success" }, // Missing token and refreshToken
    });

    await expect(errorHandler(error)).rejects.toThrow(
      "Invalid token response structure"
    );
    expect(mockOptions.onRefreshTokenFail).toHaveBeenCalled();
  });

  test("should clean up refresh promise on success", async () => {
    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    attachRefreshInterceptor(mockInstance, mockOptions);

    const firstError = {
      response: { status: 401 },
      config: {},
    };

    axios.mockResolvedValueOnce({
      data: {
        token: "new-token",
        refreshToken: "new-refresh",
      },
    });

    mockInstance.mockResolvedValue({ success: true });

    await errorHandler(firstError);

    // Clear mock to verify new call
    axios.mockClear();

    // Prepare second mock response
    axios.mockResolvedValueOnce({
      data: {
        token: "newer-token",
        refreshToken: "newer-refresh",
      },
    });

    const secondError = {
      response: { status: 401 },
      config: {},
    };

    await errorHandler(secondError);

    expect(axios).toHaveBeenCalledTimes(1); // New refresh request made
  });

  test("should clean up refresh promise on failure", async () => {
    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    attachRefreshInterceptor(mockInstance, mockOptions);

    const firstError = {
      response: { status: 401 },
      config: {},
    };

    axios.mockRejectedValueOnce(new Error("Refresh failed"));

    await expect(errorHandler(firstError)).rejects.toThrow("Refresh failed");

    // Clear and reconfigure mocks for second attempt
    axios.mockClear();
    axios.mockResolvedValueOnce({
      data: {
        token: "new-token",
        refreshToken: "new-refresh",
      },
    });
    mockInstance.mockResolvedValue({ success: true });

    const secondError = {
      response: { status: 401 },
      config: {},
    };

    await errorHandler(secondError);

    expect(axios).toHaveBeenCalledTimes(1); // New refresh request made
  });

  test("should handle missing authorization header in original request", async () => {
    attachRefreshInterceptor(mockInstance, mockOptions);

    const error = {
      response: { status: 401 },
      config: {
        // No headers property
        method: "get",
        url: "/api/protected",
      },
    };

    mockOptions.getRefreshToken.mockReturnValue("refresh-token-123");

    axios.mockResolvedValue({
      data: {
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      },
    });
    mockInstance.mockResolvedValue({ success: true });

    await errorHandler(error);

    // Should create headers object and add authorization
    expect(mockInstance).toHaveBeenCalledWith({
      method: "get",
      url: "/api/protected",
      headers: { Authorization: "Bearer new-access-token" },
      _retry: true,
    });
  });
});
