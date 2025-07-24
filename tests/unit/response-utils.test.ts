import { describe, it, expect } from '@jest/globals';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  handleUnexpectedError,
  createValidationErrorResponse,
  createParsingErrorResponse,
  createUploadErrorResponse,
  createDatabaseErrorResponse,
} from '../../supabase/functions/_shared/response-utils';
import { corsHeaders } from '../../supabase/functions/_shared/request-parser';

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with default status 200', async () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      const body = await response.json();
      expect(body).toEqual({
        success: true,
        data: { id: '123', name: 'Test' },
      });
    });

    it('should create success response with custom status', async () => {
      const data = { created: true };
      const response = createSuccessResponse(data, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toEqual({
        success: true,
        data: { created: true },
      });
    });

    it('should handle null data', async () => {
      const response = createSuccessResponse(null);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({
        success: true,
        data: null,
      });
    });

    it('should include CORS headers', () => {
      const response = createSuccessResponse({ test: true });

      Object.entries(corsHeaders).forEach(([key, value]) => {
        expect(response.headers.get(key)).toBe(value);
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with default status 400', async () => {
      const response = createErrorResponse('Validation failed');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Validation failed',
      });
    });

    it('should create error response with custom status and details', async () => {
      const response = createErrorResponse(
        'Server error',
        500,
        'Database connection failed'
      );

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Server error',
        details: 'Database connection failed',
      });
    });

    it('should create error response without details', async () => {
      const response = createErrorResponse('Not found', 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Not found',
      });
    });

    it('should include CORS headers', () => {
      const response = createErrorResponse('Test error');

      Object.entries(corsHeaders).forEach(([key, value]) => {
        expect(response.headers.get(key)).toBe(value);
      });
    });
  });

  describe('createCorsResponse', () => {
    it('should create CORS preflight response', () => {
      const response = createCorsResponse();

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();

      Object.entries(corsHeaders).forEach(([key, value]) => {
        expect(response.headers.get(key)).toBe(value);
      });
    });
  });

  describe('handleUnexpectedError', () => {
    // Mock console.error to avoid output during tests
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle Error instances', async () => {
      const error = new Error('Network timeout');
      const response = handleUnexpectedError(error);

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith('Unexpected error:', error);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Internal server error',
        details: 'Network timeout',
      });
    });

    it('should handle non-Error objects', async () => {
      const error = 'String error';
      const response = handleUnexpectedError(error);

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith('Unexpected error:', error);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Internal server error',
        details: 'Unknown error occurred',
      });
    });

    it('should handle null/undefined errors', async () => {
      const response = handleUnexpectedError(null);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Internal server error',
        details: 'Unknown error occurred',
      });
    });
  });

  describe('specialized error response functions', () => {
    it('createValidationErrorResponse should create validation error', async () => {
      const response = createValidationErrorResponse('Missing required field');

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Validation failed',
        details: 'Missing required field',
      });
    });

    it('createParsingErrorResponse should create parsing error', async () => {
      const response = createParsingErrorResponse('Invalid JSON format');

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Request parsing failed',
        details: 'Invalid JSON format',
      });
    });

    it('createUploadErrorResponse should create upload error', async () => {
      const response = createUploadErrorResponse('File too large');

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Upload failed',
        details: 'File too large',
      });
    });

    it('createDatabaseErrorResponse should create database error', async () => {
      const response = createDatabaseErrorResponse('Connection timeout');

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: 'Database error',
        details: 'Connection timeout',
      });
    });

    it('all specialized error functions should include CORS headers', () => {
      const responses = [
        createValidationErrorResponse('test'),
        createParsingErrorResponse('test'),
        createUploadErrorResponse('test'),
        createDatabaseErrorResponse('test'),
      ];

      responses.forEach(response => {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          expect(response.headers.get(key)).toBe(value);
        });
      });
    });
  });
});
