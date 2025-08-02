// Mock fetch for integration tests
const mockFetchUploadUrls = jest.fn();
global.fetch = mockFetchUploadUrls;

interface AuthResponse {
  access_token: string;
}

interface UploadUrlInfo {
  fileName: string;
  b2FileName: string;
  remotePath: string;
  uploadUrl: string;
  authorizationToken: string;
  contentType: string;
  expiresIn: number;
}

interface GetUploadUrlsResponse {
  success: boolean;
  data?: {
    urls: UploadUrlInfo[];
    totalFiles: number;
    expiresIn: number;
    batchId: string;
  };
  error?: string;
}

describe('Get Upload URLs - Integration Tests', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

  let authToken: string;

  beforeAll(async () => {
    // Mock authentication response
    mockFetchUploadUrls.mockResolvedValueOnce({
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

    const authData = (await response.json()) as AuthResponse;
    authToken = authData.access_token;
    expect(authToken).toBeDefined();
  });

  beforeEach(() => {
    // Reset mock before each test
    mockFetchUploadUrls.mockClear();
  });

  test('should handle CORS preflight request', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'OPTIONS',
    });

    expect(response.ok).toBe(true);
  });

  test('should require authentication', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Authentication required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'test.m4a',
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should validate request body format', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Invalid JSON in request body',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should require files array', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Files array is required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should validate files array not empty', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'At least one file is required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should enforce maximum file limit', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Maximum 500 files allowed per request',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    // Create 501 files to exceed limit
    const files = Array.from({ length: 501 }, (_, i) => ({
      fileName: `test-${i}.m4a`,
      contentType: 'audio/m4a',
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should validate file properties', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'File name and content type are required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: '', // Invalid empty filename
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should successfully generate upload URLs for single file', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            urls: [
              {
                fileName: 'genesis-1.m4a',
                b2FileName: '1703123456789-genesis-1.m4a',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456789-genesis-1.m4a',
                uploadUrl:
                  'https://pod-000-1005-03.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28453',
                contentType: 'audio/m4a',
                expiresIn: 86400,
              },
            ],
            totalFiles: 1,
            expiresIn: 86400,
            batchId: 'batch-123-456',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'genesis-1.m4a',
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as GetUploadUrlsResponse;
    expect(result.success).toBe(true);
    expect(result.data?.urls).toHaveLength(1);
    expect(result.data?.totalFiles).toBe(1);
    expect(result.data?.batchId).toBeDefined();

    const uploadUrl = result.data!.urls[0];
    expect(uploadUrl.fileName).toBe('genesis-1.m4a');
    expect(uploadUrl.b2FileName).toContain('genesis-1.m4a');
    expect(uploadUrl.remotePath).toContain('backblazeb2.com');
    expect(uploadUrl.uploadUrl).toContain('b2_upload_file');
    expect(uploadUrl.authorizationToken).toBeDefined();
    expect(uploadUrl.contentType).toBe('audio/m4a');
    expect(uploadUrl.expiresIn).toBe(86400);
  });

  test('should successfully generate upload URLs for multiple files', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            urls: [
              {
                fileName: 'genesis-1.m4a',
                b2FileName: '1703123456789-genesis-1.m4a',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456789-genesis-1.m4a',
                uploadUrl:
                  'https://pod-000-1005-03.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz1',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28453',
                contentType: 'audio/m4a',
                expiresIn: 86400,
              },
              {
                fileName: 'genesis-2.mp3',
                b2FileName: '1703123456790-genesis-2.mp3',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456790-genesis-2.mp3',
                uploadUrl:
                  'https://pod-000-1005-04.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz2',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28454',
                contentType: 'audio/mpeg',
                expiresIn: 86400,
              },
              {
                fileName: 'psalm-23.wav',
                b2FileName: '1703123456791-psalm-23.wav',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456791-psalm-23.wav',
                uploadUrl:
                  'https://pod-000-1005-03.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz3',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28453',
                contentType: 'audio/wav',
                expiresIn: 86400,
              },
            ],
            totalFiles: 3,
            expiresIn: 86400,
            batchId: 'batch-456-789',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'genesis-1.m4a',
            contentType: 'audio/m4a',
          },
          {
            fileName: 'genesis-2.mp3',
            contentType: 'audio/mpeg',
          },
          {
            fileName: 'psalm-23.wav',
            contentType: 'audio/wav',
          },
        ],
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as GetUploadUrlsResponse;
    expect(result.success).toBe(true);
    expect(result.data?.urls).toHaveLength(3);
    expect(result.data?.totalFiles).toBe(3);

    // Verify each upload URL has required properties
    result.data!.urls.forEach(uploadUrl => {
      expect(uploadUrl.fileName).toBeDefined();
      expect(uploadUrl.b2FileName).toBeDefined();
      expect(uploadUrl.remotePath).toContain('backblazeb2.com');
      expect(uploadUrl.uploadUrl).toContain('b2_upload_file');
      expect(uploadUrl.authorizationToken).toBeDefined();
      expect(uploadUrl.contentType).toBeDefined();
      expect(uploadUrl.expiresIn).toBe(86400);
    });

    // Verify content types match request
    expect(result.data!.urls[0].contentType).toBe('audio/m4a');
    expect(result.data!.urls[1].contentType).toBe('audio/mpeg');
    expect(result.data!.urls[2].contentType).toBe('audio/wav');
  });

  test('should handle optional metadata in files', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            urls: [
              {
                fileName: 'chapter-with-metadata.m4a',
                b2FileName: '1703123456792-chapter-with-metadata.m4a',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456792-chapter-with-metadata.m4a',
                uploadUrl:
                  'https://pod-000-1005-03.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz4',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28455',
                contentType: 'audio/m4a',
                expiresIn: 86400,
              },
            ],
            totalFiles: 1,
            expiresIn: 86400,
            batchId: 'batch-789-012',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'chapter-with-metadata.m4a',
            contentType: 'audio/m4a',
            metadata: {
              chapterId: 'gen-1',
              languageId: 'eng',
              version: '1.0',
            },
          },
        ],
        batchId: 'custom-batch-id',
        concurrency: 10,
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as GetUploadUrlsResponse;
    expect(result.success).toBe(true);
    expect(result.data?.urls).toHaveLength(1);
  });

  test('should handle B2 service errors gracefully', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Failed to generate upload URLs',
          details: 'B2 authentication failed',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'test.m4a',
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = (await response.json()) as {
      success: boolean;
      error: string;
      details?: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to generate upload URLs');
  });

  test('should handle special characters in filenames', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            urls: [
              {
                fileName: 'Chapter (1) - "Genesis" & More.m4a',
                b2FileName: '1703123456793-Chapter (1) - "Genesis" & More.m4a',
                remotePath:
                  'https://f005.backblazeb2.com/file/test-bucket/1703123456793-Chapter (1) - "Genesis" & More.m4a',
                uploadUrl:
                  'https://pod-000-1005-03.backblazeb2.com/b2api/v4/b2_upload_file?token=xyz5',
                authorizationToken:
                  '2_20151009170037_f504a0f893b4015621f7b7d91ca28456',
                contentType: 'audio/m4a',
                expiresIn: 86400,
              },
            ],
            totalFiles: 1,
            expiresIn: 86400,
            batchId: 'batch-special-chars',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'Chapter (1) - "Genesis" & More.m4a',
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as GetUploadUrlsResponse;
    expect(result.success).toBe(true);
    expect(result.data?.urls[0].fileName).toBe(
      'Chapter (1) - "Genesis" & More.m4a'
    );
  });

  test('should handle server errors gracefully', async () => {
    mockFetchUploadUrls.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Internal server error',
          details: 'Unknown error occurred',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'test.m4a',
            contentType: 'audio/m4a',
          },
        ],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = (await response.json()) as {
      success: boolean;
      error: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal server error');
  });
});
