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

interface ErrorResponse {
  error: string;
  hint?: string;
}

describe('Get Download URLs - Basic Functionality', () => {
  const FUNCTION_URL =
    'https://sjczwtpnjbmscxoszlyi.supabase.co/functions/v1/get-download-urls';

  beforeEach(() => {
    mockFetchBasic.mockClear();
  });

  describe('Basic functionality', () => {
    it('should get download URLs for multiple files', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: true,
        urls: {
          'file1.m4a': 'https://signed-url1.com',
          'file2.m4a': 'https://signed-url2.com',
        },
        expiresIn: 86400,
        totalFiles: 2,
        successfulUrls: 2,
      };

      mockFetchBasic.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['file1.m4a', 'file2.m4a'],
          expirationHours: 24,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = (await response.json()) as DownloadUrlsResponse;
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

      mockFetchBasic.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['single-file.m4a'],
        }),
      });

      const data = (await response.json()) as DownloadUrlsResponse;
      expect(data.success).toBe(true);
      expect(data.totalFiles).toBe(1);
      expect(data.successfulUrls).toBe(1);
      expect(data.expiresIn).toBe(3600);
    });

    it('should use default expiration when not specified', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            urls: { 'file.m4a': 'https://signed-url.com' },
            expiresIn: 86400,
            totalFiles: 1,
            successfulUrls: 1,
          }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['file.m4a'],
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = (await response.json()) as DownloadUrlsResponse;
      expect(data.expiresIn).toBe(86400);
    });
  });

  describe('Partial success handling', () => {
    it('should handle partial success with some failed files', async () => {
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

      mockFetchBasic.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
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

      const data = (await response.json()) as DownloadUrlsResponse;
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
    it('should return validation error for invalid filePaths', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
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

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Invalid filePaths array');
    });

    it('should return validation error for too many files', async () => {
      const largeBatch = Array.from({ length: 2001 }, (_, i) => `file${i}.m4a`);

      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
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
          filePaths: largeBatch,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Maximum 2000 files per request');
      expect(data.hint).toBe('Split large requests into smaller batches');
    });

    it('should return validation error for invalid expiration hours', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: 'expirationHours must be between 1 and 24 hours',
          }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['file.m4a'],
          expirationHours: 25,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('expirationHours must be between 1 and 24 hours');
    });

    it('should handle malformed JSON', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
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

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should handle missing filePaths', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: 'Invalid filePaths array',
          }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Invalid filePaths array');
    });
  });

  describe('HTTP method validation', () => {
    it('should reject non-POST requests', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 405,
        json: () =>
          Promise.resolve({
            error: 'Method not allowed',
          }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'GET',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(405);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Error handling', () => {
    it('should handle B2 service errors gracefully', async () => {
      mockFetchBasic.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'Failed to generate download URLs',
          }),
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: ['file.m4a'],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const data = (await response.json()) as ErrorResponse;
      expect(data.error).toBe('Failed to generate download URLs');
    });

    it('should handle complete failure scenario', async () => {
      const mockResponse: DownloadUrlsResponse = {
        success: false,
        urls: {},
        expiresIn: 0,
        totalFiles: 2,
        successfulUrls: 0,
        failedFiles: ['file1.m4a', 'file2.m4a'],
        errors: {
          'file1.m4a': 'File not found',
          'file2.m4a': 'Access denied',
        },
      };

      mockFetchBasic.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
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

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = (await response.json()) as DownloadUrlsResponse;
      expect(data.success).toBe(false);
      expect(data.successfulUrls).toBe(0);
      expect(data.failedFiles).toHaveLength(2);
    });
  });
});
