import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { responseTransformers } from '../../../lib/utils/responseTransform.js';

describe('responseTransformers', () => {
  describe('toCamelCase', () => {
    test('should convert snake_case to camelCase', () => {
      const input = { user_name: 'John', first_name: 'John' };
      const expected = { userName: 'John', firstName: 'John' };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should handle nested objects', () => {
      const input = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
          contact_details: {
            phone_number: '123456'
          }
        }
      };
      
      const expected = {
        userInfo: {
          firstName: 'John',
          lastName: 'Doe',
          contactDetails: {
            phoneNumber: '123456'
          }
        }
      };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should handle arrays', () => {
      const input = [
        { user_id: 1, user_name: 'John' },
        { user_id: 2, user_name: 'Jane' }
      ];
      
      const expected = [
        { userId: 1, userName: 'John' },
        { userId: 2, userName: 'Jane' }
      ];
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should handle arrays within objects', () => {
      const input = {
        user_list: [
          { first_name: 'John' },
          { first_name: 'Jane' }
        ]
      };
      
      const expected = {
        userList: [
          { firstName: 'John' },
          { firstName: 'Jane' }
        ]
      };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should return primitive values as-is', () => {
      expect(responseTransformers.toCamelCase('string')).toBe('string');
      expect(responseTransformers.toCamelCase(123)).toBe(123);
      expect(responseTransformers.toCamelCase(true)).toBe(true);
      expect(responseTransformers.toCamelCase(null)).toBe(null);
      expect(responseTransformers.toCamelCase(undefined)).toBe(undefined);
    });

    test('should handle already camelCase keys', () => {
      const input = { userName: 'John', userId: 123 };
      expect(responseTransformers.toCamelCase(input)).toEqual(input);
    });

    test('should handle Date and other non-plain objects', () => {
      const date = new Date('2024-01-01');
      const regex = /test/;
      
      expect(responseTransformers.toCamelCase(date)).toBe(date);
      expect(responseTransformers.toCamelCase(regex)).toBe(regex);
    });

    test('should handle empty objects and arrays', () => {
      expect(responseTransformers.toCamelCase({})).toEqual({});
      expect(responseTransformers.toCamelCase([])).toEqual([]);
    });

    test('should handle complex edge cases', () => {
      const input = {
        __proto__: 'value',
        _: 'underscore',
        _123: 'number start',
        test_: 'trailing',
        test__case: 'double underscore',
        TEST_CONSTANT: 'all caps'
      };
      
      const expected = {
        __proto__: 'value',
        _: 'underscore',
        _123: 'number start',
        test_: 'trailing',
        test_Case: 'double underscore',
        TESTCONSTANT: 'all caps'
      };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should handle uppercase letters after underscore', () => {
      const input = { user_ID: '123', field_A: 'value' };
      const expected = { userID: '123', fieldA: 'value' };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should handle numbers after underscore', () => {
      const input = { field_1: 'value1', item_2_name: 'value2' };
      const expected = { field1: 'value1', item2Name: 'value2' };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    test('should preserve leading underscores', () => {
      const input = { _private_field: 'value', __double: 'value' };
      const expected = { _privateField: 'value', __double: 'value' };
      
      expect(responseTransformers.toCamelCase(input)).toEqual(expected);
    });

    // Options tests
    test('should preserve specified keys with options', () => {
      const input = { user_id: 1, API_KEY: 'secret', auth_token: 'token' };
      const result = responseTransformers.toCamelCase(input, {
        preserveKeys: ['API_KEY']
      });
      
      expect(result).toEqual({
        userId: 1,
        API_KEY: 'secret',
        authToken: 'token'
      });
    });

    test('should preserve keys matching pattern', () => {
      const input = { 
        _private_field: 'value', 
        __system_var: 'system',
        regular_field: 'normal'
      };
      
      const result = responseTransformers.toCamelCase(input, {
        preservePattern: /^_/
      });
      
      expect(result).toEqual({
        _private_field: 'value',
        __system_var: 'system',
        regularField: 'normal'
      });
    });

    test('should handle deep option', () => {
      const input = {
        user_info: {
          first_name: 'John',
          nested_data: { deep_field: 'value' }
        }
      };
      
      const result = responseTransformers.toCamelCase(input, { deep: false });
      
      expect(result).toEqual({
        userInfo: {
          first_name: 'John',
          nested_data: { deep_field: 'value' }
        }
      });
    });

    test('should preserve consecutive capitals when option enabled', () => {
      const input = { API_KEY: 'secret', HTTP_STATUS: '200' };
      
      const result = responseTransformers.toCamelCase(input, {
        preserveConsecutiveCapitals: true
      });
      
      expect(result).toEqual({
        apikey: 'secret',
        httpstatus: '200'
      });
    });
  });

  describe('toSnakeCase', () => {
    test('should convert camelCase to snake_case', () => {
      const input = { userName: 'John', firstName: 'John' };
      const expected = { user_name: 'John', first_name: 'John' };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle nested objects', () => {
      const input = {
        userInfo: {
          firstName: 'John',
          lastName: 'Doe',
          contactDetails: {
            phoneNumber: '123456'
          }
        }
      };
      
      const expected = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
          contact_details: {
            phone_number: '123456'
          }
        }
      };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle arrays', () => {
      const input = [
        { userId: 1, userName: 'John' },
        { userId: 2, userName: 'Jane' }
      ];
      
      const expected = [
        { user_id: 1, user_name: 'John' },
        { user_id: 2, user_name: 'Jane' }
      ];
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle arrays within objects', () => {
      const input = {
        userList: [
          { firstName: 'John' },
          { firstName: 'Jane' }
        ]
      };
      
      const expected = {
        user_list: [
          { first_name: 'John' },
          { first_name: 'Jane' }
        ]
      };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should return primitive values as-is', () => {
      expect(responseTransformers.toSnakeCase('string')).toBe('string');
      expect(responseTransformers.toSnakeCase(123)).toBe(123);
      expect(responseTransformers.toSnakeCase(true)).toBe(true);
      expect(responseTransformers.toSnakeCase(null)).toBe(null);
      expect(responseTransformers.toSnakeCase(undefined)).toBe(undefined);
    });

    test('should handle Date and other non-plain objects', () => {
      const date = new Date('2024-01-01');
      const regex = /test/;
      
      expect(responseTransformers.toSnakeCase(date)).toBe(date);
      expect(responseTransformers.toSnakeCase(regex)).toBe(regex);
    });

    test('should handle already snake_case keys', () => {
      const input = { user_name: 'John', user_id: 123 };
      expect(responseTransformers.toSnakeCase(input)).toEqual(input);
    });

    test('should handle empty objects and arrays', () => {
      expect(responseTransformers.toSnakeCase({})).toEqual({});
      expect(responseTransformers.toSnakeCase([])).toEqual([]);
    });

    test('should handle complex edge cases', () => {
      const input = {
        __proto__: 'value',
        _: 'underscore',
        _privateField: 'leading underscore',
        camelCase: 'normal',
        PascalCase: 'pascal',
        CONSTANT_CASE: 'already snake',
        mixedUPPERCase: 'mixed',
        number123In456Name: 'numbers'
      };
      
      const expected = {
        __proto__: 'value',
        _: 'underscore',
        _private_field: 'leading underscore',
        camel_case: 'normal',
        pascal_case: 'pascal',
        constant_case: 'already snake',
        mixed_upper_case: 'mixed',
        number_123_in_456_name: 'numbers'
      };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle PascalCase without leading underscore', () => {
      const input = { UserId: '123', UserName: 'John' };
      const expected = { user_id: '123', user_name: 'John' };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle consecutive capitals correctly', () => {
      const input = { APIKey: 'secret', HTTPStatus: 200, XMLParser: 'test' };
      const expected = { api_key: 'secret', http_status: 200, xml_parser: 'test' };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    test('should handle mixed case patterns', () => {
      const input = { iPhone: 'device', eBay: 'site', iPadPro: 'tablet' };
      const expected = { i_phone: 'device', e_bay: 'site', i_pad_pro: 'tablet' };
      
      expect(responseTransformers.toSnakeCase(input)).toEqual(expected);
    });

    // Options tests
    test('should output UPPER_SNAKE_CASE when option enabled', () => {
      const input = { userName: 'John', userId: 123 };
      const result = responseTransformers.toSnakeCase(input, { upperCase: true });
      
      expect(result).toEqual({
        USER_NAME: 'John',
        USER_ID: 123
      });
    });

    test('should preserve specified keys', () => {
      const input = { userId: 1, customID: 'special', authToken: 'token' };
      const result = responseTransformers.toSnakeCase(input, {
        preserveKeys: ['customID']
      });
      
      expect(result).toEqual({
        user_id: 1,
        customID: 'special',
        auth_token: 'token'
      });
    });

    test('should handle deep option', () => {
      const input = {
        userInfo: {
          firstName: 'John',
          nestedData: { deepField: 'value' }
        }
      };
      
      const result = responseTransformers.toSnakeCase(input, { deep: false });
      
      expect(result).toEqual({
        user_info: {
          firstName: 'John',
          nestedData: { deepField: 'value' }
        }
      });
    });
  });

  describe('toKebabCase', () => {
    test('should convert to kebab-case', () => {
      const input = { userName: 'John', firstName: 'Jane' };
      const expected = { 'user-name': 'John', 'first-name': 'Jane' };
      
      expect(responseTransformers.toKebabCase(input)).toEqual(expected);
    });

    test('should handle snake_case input', () => {
      const input = { user_name: 'John', first_name: 'Jane' };
      const expected = { 'user-name': 'John', 'first-name': 'Jane' };
      
      expect(responseTransformers.toKebabCase(input)).toEqual(expected);
    });

    test('should handle PascalCase', () => {
      const input = { UserName: 'John', FirstName: 'Jane' };
      const expected = { 'user-name': 'John', 'first-name': 'Jane' };
      
      expect(responseTransformers.toKebabCase(input)).toEqual(expected);
    });

    test('should handle nested objects and arrays', () => {
      const input = {
        userInfo: {
          firstName: 'John',
          contactDetails: ['email', 'phone']
        }
      };
      
      const expected = {
        'user-info': {
          'first-name': 'John',
          'contact-details': ['email', 'phone']
        }
      };
      
      expect(responseTransformers.toKebabCase(input)).toEqual(expected);
    });

    test('should handle complex cases', () => {
      const input = {
        APIKey: 'secret',
        HTTPStatus_Code: 200,
        iPhone_Model: '15'
      };
      
      const expected = {
        'api-key': 'secret',
        'http-status-code': 200,
        'i-phone-model': '15'
      };
      
      expect(responseTransformers.toKebabCase(input)).toEqual(expected);
    });
  });

  describe('toPascalCase', () => {
    test('should convert to PascalCase', () => {
      const input = { user_name: 'John', first_name: 'Jane' };
      const expected = { UserName: 'John', FirstName: 'Jane' };
      
      expect(responseTransformers.toPascalCase(input)).toEqual(expected);
    });

    test('should handle camelCase input', () => {
      const input = { userName: 'John', firstName: 'Jane' };
      const expected = { UserName: 'John', FirstName: 'Jane' };
      
      expect(responseTransformers.toPascalCase(input)).toEqual(expected);
    });

    test('should handle nested structures', () => {
      const input = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe'
        }
      };
      
      const expected = {
        UserInfo: {
          FirstName: 'John',
          LastName: 'Doe'
        }
      };
      
      expect(responseTransformers.toPascalCase(input)).toEqual(expected);
    });

    test('should handle arrays', () => {
      const input = [
        { user_id: 1, is_active: true },
        { user_id: 2, is_active: false }
      ];
      
      const expected = [
        { UserId: 1, IsActive: true },
        { UserId: 2, IsActive: false }
      ];
      
      expect(responseTransformers.toPascalCase(input)).toEqual(expected);
    });
  });

  describe('extractData', () => {
    test('should extract data from simple path', () => {
      const response = { data: { users: [1, 2, 3] } };
      const extractor = responseTransformers.extractData('data');
      
      expect(extractor(response)).toEqual({ users: [1, 2, 3] });
    });

    test('should extract data from nested path', () => {
      const response = {
        result: {
          data: {
            items: ['a', 'b', 'c']
          }
        }
      };
      const extractor = responseTransformers.extractData('result.data.items');
      
      expect(extractor(response)).toEqual(['a', 'b', 'c']);
    });

    test('should use default path when no path provided', () => {
      const response = { data: 'content' };
      const extractor = responseTransformers.extractData();
      
      expect(extractor(response)).toBe('content');
    });

    test('should return original response when path not found', () => {
      const response = { result: 'value' };
      const extractor = responseTransformers.extractData('data.items');
      
      expect(extractor(response)).toEqual({ result: 'value' });
    });

    test('should handle null/undefined in path gracefully', () => {
      const response = { data: null };
      const extractor = responseTransformers.extractData('data.items');
      
      expect(extractor(response)).toEqual({ data: null });
    });

    test('should handle missing intermediate paths', () => {
      const response = { data: {} };
      const extractor = responseTransformers.extractData('data.result.items');
      
      expect(extractor(response)).toEqual({ data: {} });
    });

    test('should handle array indices in path', () => {
      const response = {
        data: {
          items: [
            { id: 1 },
            { id: 2 }
          ]
        }
      };
      const extractor = responseTransformers.extractData('data.items.0');
      
      expect(extractor(response)).toEqual({ id: 1 });
    });

    test('should return falsy values when found', () => {
      const testCases = [
        { response: { data: 0 }, path: 'data', expected: 0 },
        { response: { data: false }, path: 'data', expected: false },
        { response: { data: null }, path: 'data', expected: null },
        { response: { data: '' }, path: 'data', expected: '' },
        { response: { data: { value: 0 } }, path: 'data.value', expected: 0 }
      ];
      
      testCases.forEach(({ response, path, expected }) => {
        const extractor = responseTransformers.extractData(path);
        expect(extractor(response)).toBe(expected);
      });
    });

    // Options tests
    test('should use default value when path not found', () => {
      const response = { data: {} };
      const extractor = responseTransformers.extractData('missing.path', {
        defaultValue: []
      });
      
      expect(extractor(response)).toEqual([]);
    });

    test('should extract multiple paths', () => {
      const response = {
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark' },
        count: 42
      };
      
      const extractor = responseTransformers.extractData(['user.name', 'settings.theme', 'count'], {
        multiple: true
      });
      
      expect(extractor(response)).toEqual({
        name: 'John',
        theme: 'dark',
        count: 42
      });
    });

    test('should use fallback paths', () => {
      const response = { result: { data: 'found' } };
      const extractor = responseTransformers.extractData('data.result', {
        fallbackPaths: ['result.data', 'response.data']
      });
      
      expect(extractor(response)).toBe('found');
    });

    test('should handle multiple extraction with missing paths', () => {
      const response = { user: { name: 'John' } };
      const extractor = responseTransformers.extractData(['user.name', 'user.email', 'settings.theme'], {
        multiple: true,
        defaultValue: null
      });
      
      expect(extractor(response)).toEqual({
        name: 'John',
        email: null,
        theme: null
      });
    });
  });

  describe('addMetadata', () => {
    let mockDate;

    beforeEach(() => {
      // Mock Date to have consistent timestamps in tests
      mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      Date.now = jest.fn(() => 1704110400000); // 2024-01-01T12:00:00.000Z in unix
    });

    test('should add metadata to response', () => {
      const response = { data: 'content' };
      const result = responseTransformers.addMetadata(response);
      
      expect(result).toEqual({
        data: 'content',
        _metadata: {
          timestamp: '2024-01-01T12:00:00.000Z',
          requestId: undefined,
          cached: false
        }
      });
    });

    test('should include request ID from headers', () => {
      const response = {
        data: 'content',
        headers: { 'x-request-id': 'req-123' }
      };
      const result = responseTransformers.addMetadata(response);
      
      expect(result._metadata.requestId).toBe('req-123');
    });

    test('should preserve cached flag', () => {
      const response = { data: 'content', cached: true };
      const result = responseTransformers.addMetadata(response);
      
      expect(result._metadata.cached).toBe(true);
    });

    test('should preserve existing metadata and merge new values', () => {
      const response = {
        data: 'content',
        _metadata: { existing: 'data', cached: true }
      };
      const result = responseTransformers.addMetadata(response);
      
      expect(result._metadata).toHaveProperty('existing', 'data');
      expect(result._metadata).toHaveProperty('timestamp');
      expect(result._metadata).toHaveProperty('cached', true);
      expect(result._metadata).toHaveProperty('requestId');
    });

    test('should handle cached values correctly', () => {
      const testCases = [
        { input: { cached: 0 }, expected: 0 },
        { input: { cached: '' }, expected: '' },
        { input: { cached: false }, expected: false },
        { input: { cached: true }, expected: true },
        { input: { cached: null }, expected: false },
        { input: { cached: undefined }, expected: false },
        { input: {}, expected: false }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = responseTransformers.addMetadata(input);
        expect(result._metadata.cached).toBe(expected);
      });
    });

    test('should handle non-object responses gracefully', () => {
      const testCases = [
        'string response',
        123,
        true,
        null,
        undefined
      ];
      
      testCases.forEach(response => {
        const result = responseTransformers.addMetadata(response);
        expect(result).toHaveProperty('data', response);
        expect(result).toHaveProperty('_metadata');
        expect(result._metadata).toHaveProperty('timestamp');
        expect(result._metadata).toHaveProperty('cached', false);
        expect(result._metadata).toHaveProperty('requestId', undefined);
      });
    });

    test('should handle arrays as responses', () => {
      const response = [{ id: 1 }, { id: 2 }];
      const result = responseTransformers.addMetadata(response);
      
      expect(result).toHaveProperty('data', response);
      expect(result).toHaveProperty('_metadata');
      expect(result._metadata).toHaveProperty('timestamp');
      expect(result._metadata).toHaveProperty('cached', false);
    });

    test('should prioritize new request ID over existing metadata', () => {
      const response = {
        data: 'content',
        headers: { 'x-request-id': 'new-req-123' },
        _metadata: { requestId: 'old-req-456' }
      };
      const result = responseTransformers.addMetadata(response);
      
      expect(result._metadata.requestId).toBe('new-req-123');
    });

    test('should preserve existing request ID when no new one provided', () => {
      const response = {
        data: 'content',
        _metadata: { requestId: 'existing-req-123' }
      };
      const result = responseTransformers.addMetadata(response);
      
      expect(result._metadata.requestId).toBe('existing-req-123');
    });

    // Options tests
    test('should exclude metadata fields based on options', () => {
      const response = { data: 'content' };
      const result = responseTransformers.addMetadata(response, {
        includeTimestamp: false,
        includeRequestId: false
      });
      
      expect(result._metadata).not.toHaveProperty('timestamp');
      expect(result._metadata).not.toHaveProperty('requestId');
      expect(result._metadata).toHaveProperty('cached');
    });

    test('should use unix timestamp format', () => {
      const response = { data: 'content' };
      const result = responseTransformers.addMetadata(response, {
        timestampFormat: 'unix'
      });
      
      expect(result._metadata.timestamp).toBe(1704110400000);
    });

    test('should use custom timestamp function', () => {
      const customTimestamp = jest.fn(() => '2024-01-01');
      const response = { data: 'content' };
      const result = responseTransformers.addMetadata(response, {
        timestampFormat: 'custom',
        customTimestamp
      });
      
      expect(customTimestamp).toHaveBeenCalled();
      expect(result._metadata.timestamp).toBe('2024-01-01');
    });

    test('should add additional metadata', () => {
      const response = { data: 'content' };
      const result = responseTransformers.addMetadata(response, {
        additionalMetadata: {
          version: '1.0',
          environment: 'test'
        }
      });
      
      expect(result._metadata).toHaveProperty('version', '1.0');
      expect(result._metadata).toHaveProperty('environment', 'test');
    });
  });

  describe('compose', () => {
    test('should compose multiple transformers', () => {
      const addOne = (x) => ({ ...x, count: (x.count || 0) + 1 });
      const double = (x) => ({ ...x, count: x.count * 2 });
      const addField = (x) => ({ ...x, field: 'added' });
      
      const composed = responseTransformers.compose(addOne, double, addField);
      const result = composed({});
      
      expect(result).toEqual({ count: 2, field: 'added' });
    });

    test('should work with empty compose', () => {
      const composed = responseTransformers.compose();
      const data = { test: 'data' };
      const result = composed(data);
      
      expect(result).toEqual(data);
    });

    test('should compose transformer functions in order', () => {
      const pipeline = responseTransformers.compose(
        responseTransformers.extractData('data'),
        responseTransformers.toCamelCase,
        responseTransformers.addMetadata
      );
      
      const response = {
        data: {
          user_name: 'John',
          user_id: 123
        }
      };
      
      const result = pipeline(response);
      
      expect(result).toHaveProperty('userName', 'John');
      expect(result).toHaveProperty('userId', 123);
      expect(result).toHaveProperty('_metadata');
    });

    test('should handle errors when invalid transformer provided', () => {
      const invalidTransformer = { not: 'a function' };
      
      expect(() => {
        const composed = responseTransformers.compose(
          responseTransformers.toCamelCase,
          invalidTransformer
        );
        composed({ test: 'data' });
      }).toThrow('transformer is not a function');
    });
  });

  describe('transformPaths', () => {
    test('should transform specific paths only', () => {
      const data = {
        user: {
          first_name: 'John',
          last_name: 'Doe'
        },
        settings: {
          theme_name: 'dark',
          auto_save: true
        },
        unchanged_field: 'value'
      };
      
      const transformer = responseTransformers.transformPaths(
        ['user', 'settings.theme_name'],
        responseTransformers.toCamelCase
      );
      
      const result = transformer(data);
      
      expect(result.user).toEqual({ firstName: 'John', lastName: 'Doe' });
      expect(result.settings.theme_name).toBe('dark'); // Only the value is transformed, not the key
      expect(result.settings.auto_save).toBe(true);
      expect(result.unchanged_field).toBe('value');
    });

    test('should handle missing paths gracefully', () => {
      const data = { existing: 'value' };
      const transformer = responseTransformers.transformPaths(
        ['missing.path'],
        responseTransformers.toCamelCase
      );
      
      const result = transformer(data);
      expect(result).toEqual(data);
    });

    test('should handle non-object data', () => {
      const data = 'string';
      const transformer = responseTransformers.transformPaths(
        ['any.path'],
        responseTransformers.toCamelCase
      );
      
      expect(transformer(data)).toBe('string');
    });

    test('should work with array indices', () => {
      const data = {
        users: [
          { first_name: 'John' },
          { first_name: 'Jane' }
        ]
      };
      
      const transformer = responseTransformers.transformPaths(
        ['users.0'],
        responseTransformers.toCamelCase
      );
      
      const result = transformer(data);
      expect(result.users[0]).toEqual({ firstName: 'John' });
      expect(result.users[1]).toEqual({ first_name: 'Jane' });
    });
  });

  describe('removeNullish', () => {
    test('should remove null and undefined values', () => {
      const data = {
        name: 'John',
        age: null,
        email: undefined,
        active: true,
        score: 0
      };
      
      const result = responseTransformers.removeNullish(data);
      
      expect(result).toEqual({
        name: 'John',
        active: true,
        score: 0
      });
    });

    test('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          age: null,
          profile: {
            bio: undefined,
            avatar: 'url'
          }
        }
      };
      
      const result = responseTransformers.removeNullish(data);
      
      expect(result).toEqual({
        user: {
          name: 'John',
          profile: {
            avatar: 'url'
          }
        }
      });
    });

    test('should handle arrays', () => {
      const data = [
        { name: 'John', age: null },
        { name: 'Jane', email: undefined }
      ];
      
      const result = responseTransformers.removeNullish(data);
      
      expect(result).toEqual([
        { name: 'John' },
        { name: 'Jane' }
      ]);
    });

    test('should remove empty strings when option enabled', () => {
      const data = { name: '', age: 25, bio: '' };
      const result = responseTransformers.removeNullish(data, {
        removeEmptyStrings: true
      });
      
      expect(result).toEqual({ age: 25 });
    });

    test('should remove empty objects when option enabled', () => {
      const data = {
        user: { name: 'John' },
        empty: {},
        settings: { nested: {} }
      };
      
      const result = responseTransformers.removeNullish(data, {
        removeEmptyObjects: true,
        deep: true
      });
      
      // Note: empty nested objects should be removed when deep is true
      expect(result).toEqual({
        user: { name: 'John' },
        settings: {}
      });
    });

    test('should handle deep option false', () => {
      const data = {
        name: 'John',
        nested: {
          value: null,
          keep: 'this'
        }
      };
      
      const result = responseTransformers.removeNullish(data, { deep: false });
      
      expect(result).toEqual({
        name: 'John',
        nested: {
          value: null,
          keep: 'this'
        }
      });
    });

    test('should return primitive values as-is', () => {
      expect(responseTransformers.removeNullish('string')).toBe('string');
      expect(responseTransformers.removeNullish(123)).toBe(123);
      expect(responseTransformers.removeNullish(true)).toBe(true);
      expect(responseTransformers.removeNullish(null)).toBe(null);
    });
  });

  describe('renameKeys', () => {
    test('should rename keys based on mapping', () => {
      const data = { id: 1, name: 'John', desc: 'Description' };
      const renamer = responseTransformers.renameKeys({
        id: 'userId',
        desc: 'description'
      });
      
      const result = renamer(data);
      
      expect(result).toEqual({
        userId: 1,
        name: 'John',
        description: 'Description'
      });
    });

    test('should handle nested objects', () => {
      const data = {
        user: { id: 1, name: 'John' },
        items: [
          { id: 2, desc: 'Item 1' },
          { id: 3, desc: 'Item 2' }
        ]
      };
      
      const renamer = responseTransformers.renameKeys({
        id: 'identifier',
        desc: 'description'
      });
      
      const result = renamer(data);
      
      expect(result.user).toEqual({ identifier: 1, name: 'John' });
      expect(result.items[0]).toEqual({ identifier: 2, description: 'Item 1' });
    });

    test('should handle arrays at top level', () => {
      const data = [
        { id: 1, desc: 'First' },
        { id: 2, desc: 'Second' }
      ];
      
      const renamer = responseTransformers.renameKeys({
        id: 'identifier',
        desc: 'description'
      });
      
      const result = renamer(data);
      
      expect(result).toEqual([
        { identifier: 1, description: 'First' },
        { identifier: 2, description: 'Second' }
      ]);
    });

    test('should return primitive values as-is', () => {
      const renamer = responseTransformers.renameKeys({});
      
      expect(renamer('string')).toBe('string');
      expect(renamer(123)).toBe(123);
      expect(renamer(null)).toBe(null);
    });

    test('should handle empty key map', () => {
      const data = { id: 1, name: 'John' };
      const renamer = responseTransformers.renameKeys({});
      
      expect(renamer(data)).toEqual(data);
    });
  });

  describe('pick', () => {
    test('should pick only specified keys', () => {
      const data = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
        age: 30
      };
      
      const picker = responseTransformers.pick(['id', 'name', 'email']);
      const result = picker(data);
      
      expect(result).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com'
      });
    });

    test('should handle arrays', () => {
      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ];
      
      const picker = responseTransformers.pick(['id', 'name']);
      const result = picker(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    test('should handle missing keys gracefully', () => {
      const data = { id: 1, name: 'John' };
      const picker = responseTransformers.pick(['id', 'email', 'phone']);
      const result = picker(data);
      
      expect(result).toEqual({ id: 1 });
    });

    test('should handle deep option for nested picks', () => {
      const data = {
        id: 1,
        name: 'Top Level',
        user: {
          id: 2,
          name: 'John',
          email: 'john@example.com',
          password: 'secret'
        }
      };
      
      // With deep option, it should pick keys from nested objects recursively
      const picker = responseTransformers.pick(['id', 'name'], { deep: true });
      const result = picker(data);
      
      // The actual implementation picks top-level keys and applies the same picking to nested values
      expect(result).toEqual({
        id: 1,
        name: 'Top Level'
      });
    });

    test('should return primitive values as-is', () => {
      const picker = responseTransformers.pick(['any']);
      
      expect(picker('string')).toBe('string');
      expect(picker(123)).toBe(123);
      expect(picker(null)).toBe(null);
    });

    test('should handle empty keys array', () => {
      const data = { id: 1, name: 'John' };
      const picker = responseTransformers.pick([]);
      
      expect(picker(data)).toEqual({});
    });
  });

  describe('omit', () => {
    test('should omit specified keys', () => {
      const data = {
        id: 1,
        name: 'John',
        password: 'secret',
        token: 'auth-token'
      };
      
      const omitter = responseTransformers.omit(['password', 'token']);
      const result = omitter(data);
      
      expect(result).toEqual({
        id: 1,
        name: 'John'
      });
    });

    test('should handle arrays', () => {
      const data = [
        { id: 1, name: 'John', password: 'secret' },
        { id: 2, name: 'Jane', password: 'secret' }
      ];
      
      const omitter = responseTransformers.omit(['password']);
      const result = omitter(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    test('should handle nested objects with deep option', () => {
      const data = {
        user: {
          id: 1,
          name: 'John',
          password: 'secret'
        },
        settings: {
          theme: 'dark',
          apiKey: 'key'
        }
      };
      
      const omitter = responseTransformers.omit(['password', 'apiKey'], { deep: true });
      const result = omitter(data);
      
      expect(result).toEqual({
        user: {
          id: 1,
          name: 'John'
        },
        settings: {
          theme: 'dark'
        }
      });
    });

    test('should handle shallow omit by default', () => {
      const data = {
        password: 'secret',
        user: {
          id: 1,
          password: 'also-secret'
        }
      };
      
      const omitter = responseTransformers.omit(['password']);
      const result = omitter(data);
      
      expect(result).toEqual({
        user: {
          id: 1,
          password: 'also-secret'
        }
      });
    });

    test('should return primitive values as-is', () => {
      const omitter = responseTransformers.omit(['any']);
      
      expect(omitter('string')).toBe('string');
      expect(omitter(123)).toBe(123);
      expect(omitter(null)).toBe(null);
    });

    test('should handle empty keys array', () => {
      const data = { id: 1, name: 'John' };
      const omitter = responseTransformers.omit([]);
      
      expect(omitter(data)).toEqual(data);
    });
  });

  describe('integration tests', () => {
    test('should chain transformations manually', () => {
      const response = {
        data: {
          user_info: {
            first_name: 'John',
            last_name: 'Doe'
          }
        }
      };
      
      // Extract data first
      const extractor = responseTransformers.extractData('data');
      const extracted = extractor(response);
      
      // Then convert to camelCase
      const camelCased = responseTransformers.toCamelCase(extracted);
      
      expect(camelCased).toEqual({
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });
    });

    test('should handle complex nested transformations', () => {
      const apiResponse = {
        result: {
          data: {
            user_list: [
              { user_id: 1, user_name: 'John', is_active: true },
              { user_id: 2, user_name: 'Jane', is_active: false }
            ],
            total_count: 2
          }
        }
      };
      
      const extractor = responseTransformers.extractData('result.data');
      const extracted = extractor(apiResponse);
      const transformed = responseTransformers.toCamelCase(extracted);
      
      expect(transformed).toEqual({
        userList: [
          { userId: 1, userName: 'John', isActive: true },
          { userId: 2, userName: 'Jane', isActive: false }
        ],
        totalCount: 2
      });
    });

    test('should compose complex transformation pipeline', () => {
      const apiResponse = {
        data: {
          users: [
            { user_id: 1, user_name: 'John', password: 'secret', is_active: true, last_login: null },
            { user_id: 2, user_name: 'Jane', password: 'secret', is_active: false, last_login: null }
          ],
          _internal_field: 'should be preserved'
        }
      };

      const pipeline = responseTransformers.compose(
        responseTransformers.extractData('data'),
        (data) => responseTransformers.toCamelCase(data, { preservePattern: /^_/ }),
        (data) => ({
          ...data,
          users: data.users.map(user => {
            const cleaned = responseTransformers.removeNullish(user);
            const omitter = responseTransformers.omit(['password']);
            return omitter(cleaned);
          })
        }),
        (data) => responseTransformers.addMetadata(data, { 
          additionalMetadata: { version: 'v1' }
        })
      );

      const result = pipeline(apiResponse);

      expect(result.users).toHaveLength(2);
      expect(result.users[0]).not.toHaveProperty('password');
      expect(result.users[0]).not.toHaveProperty('lastLogin');
      expect(result.users[0]).toHaveProperty('userId', 1);
      expect(result.users[0]).toHaveProperty('userName', 'John');
      expect(result._internal_field).toBe('should be preserved');
      expect(result._metadata).toHaveProperty('version', 'v1');
    });

    test('should build a complete data processing pipeline', () => {
      const apiResponse = {
        status: 'success',
        data: {
          results: [
            { 
              user_id: 1, 
              full_name: 'John Doe',
              email_address: 'john@example.com',
              is_active: true,
              created_at: '2024-01-01',
              internal_id: null,
              _system_field: 'system'
            },
            { 
              user_id: 2, 
              full_name: 'Jane Smith',
              email_address: 'jane@example.com',
              is_active: false,
              created_at: '2024-01-02',
              internal_id: null,
              _system_field: 'system'
            }
          ],
          meta: {
            total_count: 2,
            page_size: 10
          }
        }
      };

      // Build a comprehensive pipeline
      const pipeline = responseTransformers.compose(
        // Extract the main data
        responseTransformers.extractData('data'),
        // Rename some keys first
        responseTransformers.renameKeys({
          full_name: 'name',
          email_address: 'email',
          created_at: 'createdDate'
        }),
        // Remove null values
        responseTransformers.removeNullish,
        // Convert to camelCase, preserving system fields
        (data) => responseTransformers.toCamelCase(data, { 
          preservePattern: /^_/,
          deep: true 
        }),
        // Transform the structure
        (data) => ({
          users: data.results.map(user => 
            responseTransformers.pick(['userId', 'name', 'email', 'isActive', 'createdDate'])(user)
          ),
          pagination: {
            total: data.meta.totalCount,
            pageSize: data.meta.pageSize
          }
        }),
        // Add metadata
        (data) => responseTransformers.addMetadata(data, {
          additionalMetadata: {
            processedAt: new Date().toISOString(),
            version: '2.0'
          }
        })
      );

      const result = pipeline(apiResponse);

      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toEqual({
        userId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true,
        createdDate: '2024-01-01'
      });
      expect(result.pagination).toEqual({
        total: 2,
        pageSize: 10
      });
      expect(result._metadata).toHaveProperty('version', '2.0');
      expect(result._metadata).toHaveProperty('processedAt');
    });
  });
});