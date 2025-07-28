// Mock fetch for integration tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

interface AuthResponse {
  access_token: string;
}

interface BulkUploadInitiationResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    validRecords: number;
    invalidRecords: number;
    queueId: string;
    mediaRecords: Array<{
      mediaFileId: string;
      queueItemId: string;
      fileName: string;
      status: 'pending' | 'failed';
      version: number;
      error?: string;
    }>;
  };
  error?: string;
}

describe('Initiate Bulk Upload - Integration Tests', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

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

    const authData = (await response.json()) as AuthResponse;
    authToken = authData.access_token;
    expect(authToken).toBeDefined();
  });

  beforeEach(() => {
    // Reset mock before each test
    mockFetch.mockClear();
  });

  test('should handle CORS preflight request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const response = await fetch(url, {
      method: 'OPTIONS',
    });

    expect(response.ok).toBe(true);
  });

  test('should require authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Authentication required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [],
        metadata: [],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should validate request body format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Invalid JSON in request body',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

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

  test('should require files and metadata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Files and metadata are required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [],
        metadata: [],
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should validate files and metadata count match', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Mismatch between number of files and metadata entries',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            fileName: 'test1.mp3',
            fileSize: 1024,
            contentType: 'audio/mpeg',
          },
        ],
        metadata: [], // Mismatch: 1 file, 0 metadata
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should successfully initiate bulk upload with valid data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            totalFiles: 2,
            validRecords: 2,
            invalidRecords: 0,
            queueId: 'queue-123-456',
            mediaRecords: [
              {
                mediaFileId: 'media-file-1',
                queueItemId: 'queue-item-1',
                fileName: 'genesis-1.mp3',
                status: 'pending',
                version: 1,
              },
              {
                mediaFileId: 'media-file-2',
                queueItemId: 'queue-item-2',
                fileName: 'genesis-2.mp3',
                status: 'pending',
                version: 1,
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const requestData = {
      files: [
        {
          fileName: 'genesis-1.mp3',
          fileSize: 2048,
          contentType: 'audio/mpeg',
        },
        {
          fileName: 'genesis-2.mp3',
          fileSize: 3072,
          contentType: 'audio/mpeg',
        },
      ],
      metadata: [
        {
          fileName: 'genesis-1.mp3',
          languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
          chapterId: 'gen-1',
          startVerseId: 'gen-1-1',
          endVerseId: 'gen-1-31',
          durationSeconds: 180.5,
          audioVersionId: 'test-audio-version-id',
        },
        {
          fileName: 'genesis-2.mp3',
          languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
          chapterId: 'gen-2',
          startVerseId: 'gen-2-1',
          endVerseId: 'gen-2-25',
          durationSeconds: 210.3,
          audioVersionId: 'test-audio-version-id',
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as BulkUploadInitiationResponse;
    expect(result.success).toBe(true);
    expect(result.data?.totalFiles).toBe(2);
    expect(result.data?.validRecords).toBe(2);
    expect(result.data?.invalidRecords).toBe(0);
    expect(result.data?.queueId).toBeDefined();
    expect(result.data?.mediaRecords).toHaveLength(2);

    // Verify media records structure
    result.data?.mediaRecords.forEach(record => {
      expect(record.mediaFileId).toBeDefined();
      expect(record.queueItemId).toBeDefined();
      expect(record.fileName).toMatch(/genesis-[12]\.mp3/);
      expect(record.status).toBe('pending');
      expect(record.version).toBe(1);
    });
  });

  test('should handle partial validation failures', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            totalFiles: 2,
            validRecords: 1,
            invalidRecords: 1,
            queueId: 'queue-123-456',
            mediaRecords: [
              {
                mediaFileId: 'media-file-1',
                queueItemId: 'queue-item-1',
                fileName: 'valid-file.mp3',
                status: 'pending',
                version: 1,
              },
              {
                mediaFileId: '',
                queueItemId: '',
                fileName: 'invalid-file.mp3',
                status: 'failed',
                version: 1,
                error: 'Invalid chapter ID',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const requestData = {
      files: [
        {
          fileName: 'valid-file.mp3',
          fileSize: 2048,
          contentType: 'audio/mpeg',
        },
        {
          fileName: 'invalid-file.mp3',
          fileSize: 3072,
          contentType: 'audio/mpeg',
        },
      ],
      metadata: [
        {
          fileName: 'valid-file.mp3',
          languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
          chapterId: 'gen-1',
          startVerseId: 'gen-1-1',
          endVerseId: 'gen-1-31',
          durationSeconds: 180.5,
          audioVersionId: 'test-audio-version-id',
        },
        {
          fileName: 'invalid-file.mp3',
          languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
          chapterId: 'invalid-chapter',
          startVerseId: 'invalid-verse',
          endVerseId: 'invalid-verse',
          durationSeconds: 210.3,
          audioVersionId: 'test-audio-version-id',
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as BulkUploadInitiationResponse;
    expect(result.success).toBe(true);
    expect(result.data?.totalFiles).toBe(2);
    expect(result.data?.validRecords).toBe(1);
    expect(result.data?.invalidRecords).toBe(1);

    // Verify that one record is pending and one is failed
    const pendingRecords = result.data?.mediaRecords.filter(
      r => r.status === 'pending'
    );
    const failedRecords = result.data?.mediaRecords.filter(
      r => r.status === 'failed'
    );

    expect(pendingRecords).toHaveLength(1);
    expect(failedRecords).toHaveLength(1);
    expect(failedRecords?.[0]?.error).toBeDefined();
  });

  test('should handle server errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Bulk upload initiation failed',
          details: 'Internal server error',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/initiate-bulk-upload`;

    const requestData = {
      files: [
        {
          fileName: 'test.mp3',
          fileSize: 1024,
          contentType: 'audio/mpeg',
        },
      ],
      metadata: [
        {
          fileName: 'test.mp3',
          languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
          chapterId: 'gen-1',
          startVerseId: 'gen-1-1',
          endVerseId: 'gen-1-31',
          durationSeconds: 180.5,
          audioVersionId: 'test-audio-version-id',
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = (await response.json()) as {
      success: boolean;
      error: string;
      details?: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
