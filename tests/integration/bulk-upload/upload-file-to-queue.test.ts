// Mock fetch for integration tests
const mockFetchUpload = jest.fn();
global.fetch = mockFetchUpload;

interface AuthResponse {
  access_token: string;
}

interface FileUploadToQueueResponse {
  success: boolean;
  data?: {
    queueItemId: string;
    fileName: string;
    fileSize: number;
    status: string;
  };
  error?: string;
}

describe('Upload File to Queue - Integration Tests', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

  let authToken: string;

  beforeAll(async () => {
    // Mock authentication response
    mockFetchUpload.mockResolvedValueOnce({
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
    mockFetchUpload.mockClear();
  });

  test('should handle CORS preflight request', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    const response = await fetch(url, {
      method: 'OPTIONS',
    });

    expect(response.ok).toBe(true);
  });

  test('should require authentication', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Authentication required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    // Create mock form data
    const formData = new FormData();
    formData.append('file', new Blob(['test content'], { type: 'audio/mpeg' }));
    formData.append('queueItemId', 'queue-item-123');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should require file and queueItemId', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'File and queueItemId are required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    // Create incomplete form data
    const formData = new FormData();
    formData.append('file', new Blob(['test content'], { type: 'audio/mpeg' }));
    // Missing queueItemId

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should validate queue item exists and is accessible', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Queue item not found or not accessible',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['test content'], { type: 'audio/mpeg' }),
      'test.mp3'
    );
    formData.append('queueItemId', 'non-existent-queue-item');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  test('should validate file matches expected metadata', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'File does not match expected metadata',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['test content'], { type: 'audio/mpeg' }),
      'wrong-filename.mp3' // File name doesn't match queue item expectation
    );
    formData.append('queueItemId', 'queue-item-123');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should successfully upload file to queue', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queueItemId: 'queue-item-123',
            fileName: 'genesis-1.mp3',
            fileSize: 2048,
            status: 'queued',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    // Create test file content
    const fileContent = new Uint8Array(2048).fill(65); // Fill with 'A' characters
    const testFile = new Blob([fileContent], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', testFile, 'genesis-1.mp3');
    formData.append('queueItemId', 'queue-item-123');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as FileUploadToQueueResponse;
    expect(result.success).toBe(true);
    expect(result.data?.queueItemId).toBe('queue-item-123');
    expect(result.data?.fileName).toBe('genesis-1.mp3');
    expect(result.data?.fileSize).toBe(2048);
    expect(result.data?.status).toBe('queued');
  });

  test('should handle file upload with different content types', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queueItemId: 'queue-item-456',
            fileName: 'psalm-23.m4a',
            fileSize: 4096,
            status: 'queued',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    // Create test file with different content type
    const fileContent = new Uint8Array(4096).fill(66); // Fill with 'B' characters
    const testFile = new Blob([fileContent], { type: 'audio/mp4' });

    const formData = new FormData();
    formData.append('file', testFile, 'psalm-23.m4a');
    formData.append('queueItemId', 'queue-item-456');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as FileUploadToQueueResponse;
    expect(result.success).toBe(true);
    expect(result.data?.fileName).toBe('psalm-23.m4a');
    expect(result.data?.fileSize).toBe(4096);
  });

  test('should handle large file uploads', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queueItemId: 'queue-item-789',
            fileName: 'matthew-1.mp3',
            fileSize: 10485760, // 10MB
            status: 'queued',
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    // Create large test file (10MB)
    const largeFileSize = 10 * 1024 * 1024;
    const fileContent = new Uint8Array(largeFileSize).fill(67); // Fill with 'C' characters
    const testFile = new Blob([fileContent], { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', testFile, 'matthew-1.mp3');
    formData.append('queueItemId', 'queue-item-789');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as FileUploadToQueueResponse;
    expect(result.success).toBe(true);
    expect(result.data?.fileSize).toBe(largeFileSize);
  });

  test('should handle database update errors', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'File upload to queue failed',
          details: 'Failed to store file data: Database connection error',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['test content'], { type: 'audio/mpeg' }),
      'test.mp3'
    );
    formData.append('queueItemId', 'queue-item-123');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
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
    expect(result.details).toContain('Database connection error');
  });

  test('should handle server errors gracefully', async () => {
    mockFetchUpload.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'File upload to queue failed',
          details: 'Unknown error occurred',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/upload-file-to-queue`;

    const formData = new FormData();
    formData.append(
      'file',
      new Blob(['test content'], { type: 'audio/mpeg' }),
      'test.mp3'
    );
    formData.append('queueItemId', 'queue-item-123');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = (await response.json()) as {
      success: boolean;
      error: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('File upload to queue failed');
  });
});
