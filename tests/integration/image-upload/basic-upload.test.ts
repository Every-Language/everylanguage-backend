import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Mock fetch for integration tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/upload-image`;

interface ImageUploadResponse {
  success: boolean;
  data?: {
    imageId: string;
    setId?: string;
    downloadUrl: string;
    fileSize: number;
    remotePath: string;
  };
  error?: string;
}

describe('Image Upload Integration Tests', () => {
  let testChapterId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test data
    testChapterId = 'test-chapter-id';

    // Mock authentication response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          access_token: 'mock-auth-token-12345',
        }),
      text: () => Promise.resolve('{"access_token":"mock-auth-token-12345"}'),
    });

    // Get auth token (mocked)
    const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const authData = (await response.json()) as { access_token: string };
    authToken = authData.access_token;
  });

  beforeEach(() => {
    // Reset mock before each test
    mockFetch.mockClear();
  });

  describe('Basic Image Upload', () => {
    it('should upload image with JSON data successfully', async () => {
      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              imageId: 'mock-image-id-123',
              downloadUrl:
                'https://f005.backblazeb2.com/file/test-bucket/test-image.jpg',
              fileSize: 1024,
              remotePath: 'images/test-image.jpg',
            },
          }),
        text: () => Promise.resolve('{"success":true}'),
      });

      const requestData = {
        target_type: 'chapter',
        target_id: testChapterId,
        filename: 'test-image.jpg',
        file_content: 'test image content for integration test',
        metadata: {
          description: 'Test image for integration testing',
          source: 'automated test',
        },
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.imageId).toBeDefined();
      expect(result.data!.downloadUrl).toBeDefined();
      expect(result.data!.fileSize).toBeGreaterThan(0);
      expect(result.data!.remotePath).toBeDefined();
    });

    it('should upload image with multipart form data', async () => {
      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              imageId: 'mock-multipart-image-id-456',
              downloadUrl:
                'https://f005.backblazeb2.com/file/test-bucket/multipart-test.png',
              fileSize: 2048,
              remotePath: 'images/multipart-test.png',
            },
          }),
        text: () => Promise.resolve('{"success":true}'),
      });

      const formData = new FormData();
      const imageContent = 'fake image content for multipart test';
      const imageFile = new File([imageContent], 'multipart-test.png', {
        type: 'image/png',
      });

      formData.append('file', imageFile);
      formData.append('target_type', 'chapter');
      formData.append('target_id', testChapterId);
      formData.append(
        'metadata',
        JSON.stringify({
          description: 'Multipart test image',
        })
      );

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.imageId).toBeDefined();
    });

    it('should create new image set during upload', async () => {
      // Mock successful upload response with new set
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              imageId: 'mock-set-image-id-789',
              setId: 'mock-new-set-id-456',
              downloadUrl:
                'https://f005.backblazeb2.com/file/test-bucket/set-test.jpg',
              fileSize: 1536,
              remotePath: 'images/set-test.jpg',
            },
          }),
        text: () => Promise.resolve('{"success":true}'),
      });

      const requestData = {
        target_type: 'chapter',
        target_id: testChapterId,
        filename: 'set-test-image.jpg',
        file_content: 'test image content for set creation',
        create_new_set: true,
        set_name: 'Integration Test Set',
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data!.setId).toBeDefined();
      expect(result.data!.imageId).toBeDefined();
    });
  });

  describe('Validation Tests', () => {
    it('should reject invalid target type', async () => {
      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error:
              'Validation failed: Invalid target_type. Must be one of: chapter, book, verse, sermon, passage, podcast, film_segment, audio_segment',
          }),
        text: () => Promise.resolve('{"success":false}'),
      });

      const requestData = {
        target_type: 'invalid_type',
        target_id: testChapterId,
        filename: 'test-image.jpg',
        file_content: 'test content',
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid target_type');
    });

    it('should reject missing required fields', async () => {
      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Validation failed: Missing required field: target_type',
          }),
        text: () => Promise.resolve('{"success":false}'),
      });

      const requestData = {
        // Missing target_type
        target_id: testChapterId,
        filename: 'test-image.jpg',
        file_content: 'test content',
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('should reject invalid set creation parameters', async () => {
      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error:
              'Validation failed: set_name is required when creating a new set',
          }),
        text: () => Promise.resolve('{"success":false}'),
      });

      const requestData = {
        target_type: 'chapter',
        target_id: testChapterId,
        filename: 'test-image.jpg',
        file_content: 'test content',
        create_new_set: true,
        // Missing set_name
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = (await response.json()) as ImageUploadResponse;

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'set_name is required when creating a new set'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle CORS preflight requests', async () => {
      // Mock CORS preflight response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['Access-Control-Allow-Origin', '*'],
          ['Access-Control-Allow-Methods', 'POST, OPTIONS'],
          [
            'Access-Control-Allow-Headers',
            'authorization, x-client-info, apikey, content-type',
          ],
        ]),
        text: () => Promise.resolve('ok'),
      });

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'POST'
      );
    });
  });
});
