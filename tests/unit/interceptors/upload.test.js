import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { attachUploadInterceptor } from '../../../lib/interceptors/upload.js';

describe('Upload Interceptor', () => {
  let mockInstance;

  beforeEach(() => {
    mockInstance = {
      interceptors: {
        request: {
          use: jest.fn().mockReturnValue(1)
        },
        response: {
          use: jest.fn().mockReturnValue(2)
        }
      }
    };
    
    jest.clearAllMocks();
  });

  test('should attach upload interceptors to both request and response', () => {
    const interceptorIds = attachUploadInterceptor(mockInstance);

    expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(interceptorIds).toEqual({ request: 1, response: 2 });
  });

  test('should add upload progress handler for FormData', async () => {
    const onProgress = jest.fn();
    const options = { onProgress };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');
    
    const config = {
      url: '/api/upload',
      method: 'post',
      data: formData
    };
    
    const result = await requestInterceptor(config);
    
    expect(result.onUploadProgress).toBeDefined();
    expect(result.uploadStartTime).toBeDefined();
    expect(typeof result.uploadStartTime).toBe('number');
  });

  test('should call onProgress with upload info', async () => {
    const onProgress = jest.fn();
    const options = { onProgress };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    const config = {
      url: '/api/upload',
      data: formData
    };
    
    const result = await requestInterceptor(config);
    
    // Mock current time
    const startTime = result.uploadStartTime;
    jest.spyOn(Date, 'now').mockReturnValue(startTime + 1000);
    
    // Simulate progress event
    const progressEvent = {
      lengthComputable: true,
      loaded: 50,
      total: 100
    };
    
    result.onUploadProgress(progressEvent);
    
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: 50,
        total: 100,
        percentage: 50,
        speed: 0.05, // 50 bytes / 1000ms
        remaining: 50
      }),
      result
    );
    
    Date.now.mockRestore();
  });

  test('should handle non-FormData requests', async () => {
    attachUploadInterceptor(mockInstance);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const config = {
      url: '/api/data',
      method: 'post',
      data: { key: 'value' }
    };
    
    const result = await requestInterceptor(config);
    
    expect(result.onUploadProgress).toBeUndefined();
    expect(result.uploadStartTime).toBeUndefined();
    expect(result).toEqual(config); // Config should be unchanged
  });

  test('should call onStart callback', async () => {
    const onStart = jest.fn();
    const options = { onStart };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    const config = {
      url: '/api/upload',
      data: formData
    };
    
    await requestInterceptor(config);
    
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/upload',
        data: formData
      })
    );
  });

  test('should call onComplete callback', async () => {
    const onComplete = jest.fn();
    const options = { onComplete };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const formData = new FormData();
    const uploadStartTime = Date.now();
    
    // Mock current time to be 1 second later
    jest.spyOn(Date, 'now').mockReturnValue(uploadStartTime + 1000);
    
    const response = {
      config: {
        url: '/api/upload',
        data: formData,
        uploadStartTime
      },
      status: 200,
      data: { fileId: '123' }
    };
    
    const result = await responseInterceptor(response);
    
    expect(onComplete).toHaveBeenCalledWith(response, 1000);
    expect(result).toEqual(response);
    
    Date.now.mockRestore();
  });

  test('should handle upload errors', async () => {
    const onError = jest.fn();
    const options = { onError };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [, requestErrorInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    const [, responseErrorInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    // Test request error
    const requestError = new Error('Network error');
    await expect(requestErrorInterceptor(requestError)).rejects.toEqual(requestError);
    expect(onError).toHaveBeenCalledWith(requestError);
    
    // Test response error for FormData
    const formData = new FormData();
    const responseError = {
      config: {
        url: '/api/upload',
        data: formData
      },
      response: {
        status: 413,
        data: { error: 'File too large' }
      }
    };
    
    await expect(responseErrorInterceptor(responseError)).rejects.toEqual(responseError);
    expect(onError).toHaveBeenCalledWith(responseError);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  test('should not call onComplete for non-FormData responses', async () => {
    const onComplete = jest.fn();
    const options = { onComplete };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [responseInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const response = {
      config: {
        url: '/api/data',
        data: { key: 'value' }
      },
      status: 200,
      data: { result: 'success' }
    };
    
    const result = await responseInterceptor(response);
    
    expect(onComplete).not.toHaveBeenCalled();
    expect(result).toEqual(response);
  });

  test('should not call onError for non-FormData response errors', async () => {
    const onError = jest.fn();
    const options = { onError };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [, responseErrorInterceptor] = mockInstance.interceptors.response.use.mock.calls[0];
    
    const error = {
      config: {
        url: '/api/data',
        data: { key: 'value' }
      },
      response: {
        status: 500
      }
    };
    
    await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
    
    // onError should not be called for non-FormData requests from response interceptor
    expect(onError).not.toHaveBeenCalled();
  });

  test('should handle progress events when not lengthComputable', async () => {
    const onProgress = jest.fn();
    const options = { onProgress };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    const config = {
      url: '/api/upload',
      data: formData
    };
    
    const result = await requestInterceptor(config);
    
    // Simulate progress event that's not length computable
    const progressEvent = {
      lengthComputable: false,
      loaded: 50
    };
    
    result.onUploadProgress(progressEvent);
    
    expect(onProgress).not.toHaveBeenCalled();
  });

  test('should handle missing onProgress callback', async () => {
    // No onProgress provided
    attachUploadInterceptor(mockInstance);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    const config = {
      url: '/api/upload',
      data: formData
    };
    
    const result = await requestInterceptor(config);
    
    // Should not throw when calling onUploadProgress
    expect(() => {
      result.onUploadProgress({
        lengthComputable: true,
        loaded: 50,
        total: 100
      });
    }).not.toThrow();
  });

  test('should calculate speed correctly with zero time elapsed', async () => {
    const onProgress = jest.fn();
    const options = { onProgress };
    
    attachUploadInterceptor(mockInstance, options);
    
    const [requestInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const formData = new FormData();
    const config = {
      url: '/api/upload',
      data: formData
    };
    
    const result = await requestInterceptor(config);
    
    // Mock Date.now to return same time (zero elapsed)
    jest.spyOn(Date, 'now').mockReturnValue(result.uploadStartTime);
    
    const progressEvent = {
      lengthComputable: true,
      loaded: 50,
      total: 100
    };
    
    result.onUploadProgress(progressEvent);
    
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        speed: 50 // Should use 1 as denominator when time elapsed is 0
      }),
      result
    );
    
    Date.now.mockRestore();
  });

  test('should work with no options provided', () => {
    // Should not throw with no options
    expect(() => {
      attachUploadInterceptor(mockInstance);
    }).not.toThrow();
    
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
  });

  test('should pass through errors without FormData', async () => {
    attachUploadInterceptor(mockInstance, { onError: jest.fn() });
    
    const [, requestErrorInterceptor] = mockInstance.interceptors.request.use.mock.calls[0];
    
    const error = new Error('Some error');
    
    await expect(requestErrorInterceptor(error)).rejects.toEqual(error);
  });
});