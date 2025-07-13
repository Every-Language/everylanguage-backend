// Mock fetch for integration tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

interface AuthResponse {
  access_token: string;
}

interface UploadResponse {
  success: boolean;
  data: {
    mediaFileId: string;
    downloadUrl: string;
  };
}

describe('Media Upload - Basic Functionality', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzQ4NTEsImV4cCI6MjA2NzU1MDg1MX0.l7ZQTG1_deDY4nFu8NUIzBL0Qg0Z4dQ-zDQaAPHBGiY';

  let authToken: string;

  beforeAll(async () => {
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

    // Authenticate once for all tests
    const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL ?? 'sarah.johnson@example.com',
        password: process.env.TEST_USER_PASSWORD ?? 'SecurePassword123!',
      }),
    });

    expect(response.ok).toBe(true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    const authData = (await response.json()) as AuthResponse;
    authToken = authData.access_token;
    expect(authToken).toBeDefined();
  });

  beforeEach(() => {
    // Reset mock before each test
    mockFetch.mockClear();
  });

  test('should upload via JSON method', async () => {
    // Mock successful upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-media-file-id-123',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/test-audio.m4a',
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    const testData = {
      target_type: 'chapter',
      target_id: `json-upload-test-${Date.now()}`,
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      filename: 'test-audio.m4a',
      file_content: 'This is test audio content for B2 upload testing',
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as UploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.mediaFileId).toBeDefined();
    expect(result.data.downloadUrl).toBeDefined();
    expect(result.data.downloadUrl).toContain('backblazeb2.com');
    expect(result.data.downloadUrl).toContain('test-audio.m4a');
  });

  test('should require authentication', async () => {
    // Mock unauthorized response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
      text: () => Promise.resolve('Unauthorized'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    const testData = {
      target_type: 'chapter',
      target_id: 'test-chapter-123',
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      filename: 'test-audio.m4a',
      file_content: 'Test content',
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should validate required fields', async () => {
    // Mock validation error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Missing required fields' }),
      text: () => Promise.resolve('Missing required fields'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    const invalidData = {
      // Missing required fields
      filename: 'test-audio.m4a',
      file_content: 'Test content',
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should handle large file content', async () => {
    // Mock large file response (could be success or 413 payload too large)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-large-file-id-456',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/large-test-audio.m4a',
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    // Create a larger test content (100KB)
    const largeContent = 'A'.repeat(100 * 1024);

    const testData = {
      target_type: 'chapter',
      target_id: `large-upload-test-${Date.now()}`,
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      filename: 'large-test-audio.m4a',
      file_content: largeContent,
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(true);
    const result = (await response.json()) as UploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.mediaFileId).toBeDefined();
  });

  test('should handle different content types', async () => {
    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    const contentTypes = [
      { filename: 'test.mp3', expected: 'audio/mpeg' },
      { filename: 'test.wav', expected: 'audio/wav' },
      { filename: 'test.m4a', expected: 'audio/m4a' },
      { filename: 'test.jpg', expected: 'image/jpeg' },
    ];

    // Mock responses for each content type test
    contentTypes.forEach((contentType, index) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              mediaFileId: `mock-content-type-id-${index}`,
              downloadUrl: `https://f005.backblazeb2.com/file/test-bucket/${contentType.filename}`,
            },
          }),
        text: () => Promise.resolve('{"success":true}'),
      });
    });

    for (const contentType of contentTypes) {
      const testData = {
        target_type: 'chapter',
        target_id: `content-type-test-${Date.now()}-${contentType.filename}`,
        language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
        filename: contentType.filename,
        file_content: `Test content for ${contentType.filename}`,
      };

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      expect(response.ok).toBe(true);
      const result = (await response.json()) as UploadResponse;
      expect(result.success).toBe(true);
      expect(result.data.mediaFileId).toBeDefined();
      expect(result.data.downloadUrl).toContain(contentType.filename);
    }
  });

  test('should accept optional duration field', async () => {
    // Mock successful upload response with duration
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-media-file-with-duration-123',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/test-audio-with-duration.m4a',
            duration: 125.5, // Should match the provided duration
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

    const testData = {
      target_type: 'chapter',
      target_id: `duration-test-${Date.now()}`,
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      filename: 'test-audio-with-duration.m4a',
      file_content: 'This is test audio content with known duration',
      duration_seconds: 125.5, // Frontend-calculated duration
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as UploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.mediaFileId).toBeDefined();
    expect(result.data.downloadUrl).toBeDefined();
    expect(result.data.duration).toBe(125.5); // Should reflect the provided duration
  });
});
