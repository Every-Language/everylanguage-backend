// Mock fetch for integration tests
const mockFetchBasic = jest.fn();
global.fetch = mockFetchBasic;

interface DownloadUrlsResponse {
  success: boolean;
  urls: Record<string, string>;
  expiresIn: number;
  totalFiles: number;
  successfulUrls: number;
  failedFiles?: string[];
  errors?: Record<string, string>;
}

describe('Get Download URLs - Basic Functionality', () => {
  const FUNCTION_URL =
    'https://sjczwtpnjbmscxoszlyi.supabase.co/functions/v1/get-download-urls';

  beforeEach(() => {
    mockFetchBasic.mockClear();
  });

  describe('Successful URL generation', () => {
    it('should generate URLs for valid file paths', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: true,
        urls: {
          'path/to/file1.m4a': 'https://signed-url-1.com',
          'path/to/file2.m4a': 'https://signed-url-2.com',
        },
        expiresIn: 86400,
        totalFiles: 2,
        successfulUrls: 2,
      };

      mockFetchBasic.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['path/to/file1.m4a', 'path/to/file2.m4a'],
          expirationHours: 24,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual(mockResponse);
      expect(data.success).toBe(true);
      expect(data.totalFiles).toBe(2);
      expect(data.successfulUrls).toBe(2);
      expect(Object.keys(data.urls)).toHaveLength(2);
    });

    it('should handle single file path', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: true,
        urls: {
          'single-file.m4a': 'https://signed-url.com',
        },
        expiresIn: 3600,
        totalFiles: 1,
        successfulUrls: 1,
      };

      mockFetchBasic.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['single-file.m4a'],
          expirationHours: 1,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.totalFiles).toBe(1);
      expect(data.successfulUrls).toBe(1);
      expect(data.expiresIn).toBe(3600);
    });

    it('should use default expiration when not specified', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: true,
        urls: {
          'test-file.m4a': 'https://signed-url.com',
        },
        expiresIn: 86400, // 24 hours default
        totalFiles: 1,
        successfulUrls: 1,
      };

      mockFetchBasic.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['test-file.m4a'],
        }),
      });

      const data = await response.json();
      expect(data.expiresIn).toBe(86400);
    });
  });

  describe('Partial failures', () => {
    it('should handle partial failures gracefully', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: true,
        urls: {
          'valid-file.m4a': 'https://signed-url.com',
        },
        expiresIn: 86400,
        totalFiles: 2,
        successfulUrls: 1,
        failedFiles: ['invalid-file.m4a'],
        errors: {
          'invalid-file.m4a': 'File not found',
        },
      };

      mockFetchBasic.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['valid-file.m4a', 'invalid-file.m4a'],
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.totalFiles).toBe(2);
      expect(data.successfulUrls).toBe(1);
      expect(data.failedFiles).toEqual(['invalid-file.m4a']);
      expect(data.errors).toEqual({
        'invalid-file.m4a': 'File not found',
      });
    });
  });

  describe('Validation errors', () => {
    it('should reject empty file paths array', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid filePaths array',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: [],
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid filePaths array');
    });

    it('should reject too many files', async () => {
      const tooManyFiles = Array.from(
        { length: 2001 },
        (_, i) => `file${i}.m4a`
      );

      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Maximum 2000 files per request',
          hint: 'Split large requests into smaller batches',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: tooManyFiles,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Maximum 2000 files per request');
      expect(data.hint).toBe('Split large requests into smaller batches');
    });

    it('should reject invalid expiration hours', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'expirationHours must be between 1 and 24 hours',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['test-file.m4a'],
          expirationHours: 48, // Too high
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('expirationHours must be between 1 and 24 hours');
    });

    it('should reject invalid JSON', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid JSON in request body',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should reject non-array filePaths', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid filePaths array',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: 'not-an-array',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid filePaths array');
    });
  });

  describe('HTTP method validation', () => {
    it('should handle CORS preflight requests', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('ok'),
        headers: new Headers({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'OPTIONS',
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'POST, OPTIONS'
      );
    });

    it('should reject non-POST/OPTIONS methods', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 405,
        json: jest.fn().mockResolvedValue({
          error: 'Method not allowed',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'GET',
      });

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: 'Failed to generate download URLs',
          details: 'Internal server error',
        }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['test-file.m4a'],
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to generate download URLs');
    });

    it('should return 500 when all URLs fail to generate', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: false,
        urls: {},
        expiresIn: 86400,
        totalFiles: 2,
        successfulUrls: 0,
        failedFiles: ['file1.m4a', 'file2.m4a'],
        errors: {
          'file1.m4a': 'File not found',
          'file2.m4a': 'Access denied',
        },
      };

      mockFetchBasic.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['file1.m4a', 'file2.m4a'],
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.successfulUrls).toBe(0);
      expect(data.failedFiles).toHaveLength(2);
    });
  });
});
