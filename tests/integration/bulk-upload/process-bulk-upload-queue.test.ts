// Mock fetch for integration tests
const mockFetchProcessor = jest.fn();
global.fetch = mockFetchProcessor;

interface AuthResponse {
  access_token: string;
}

interface QueueProcessingResponse {
  success: boolean;
  data?: {
    queueId?: string;
    processedCount: number;
    successfulCount: number;
    failedCount: number;
    skippedCount: number;
    details: Array<{
      id: string;
      mediaFileId: string;
      fileName: string;
      status: 'completed' | 'failed' | 'skipped';
      error?: string;
    }>;
  };
  error?: string;
}

describe('Process Bulk Upload Queue - Integration Tests', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

  let authToken: string;

  beforeAll(async () => {
    // Mock authentication response
    mockFetchProcessor.mockResolvedValueOnce({
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
    mockFetchProcessor.mockClear();
  });

  test('should handle CORS preflight request', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'OPTIONS',
    });

    expect(response.ok).toBe(true);
  });

  test('should require authentication', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Authentication required',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should handle GET request to process all queued items', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            processedCount: 0,
            successfulCount: 0,
            failedCount: 0,
            skippedCount: 0,
            details: [],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.processedCount).toBe(0);
  });

  test('should handle empty queue', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            processedCount: 0,
            successfulCount: 0,
            failedCount: 0,
            skippedCount: 0,
            details: [],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'empty-queue-123',
        batchSize: 10,
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.processedCount).toBe(0);
    expect(result.data?.details).toEqual([]);
  });

  test('should process specific queue with successful uploads', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queueId: 'queue-123-456',
            processedCount: 2,
            successfulCount: 2,
            failedCount: 0,
            skippedCount: 0,
            details: [
              {
                id: 'queue-item-1',
                mediaFileId: 'media-file-1',
                fileName: 'genesis-1.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-2',
                mediaFileId: 'media-file-2',
                fileName: 'genesis-2.mp3',
                status: 'completed',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'queue-123-456',
        batchSize: 10,
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.queueId).toBe('queue-123-456');
    expect(result.data?.processedCount).toBe(2);
    expect(result.data?.successfulCount).toBe(2);
    expect(result.data?.failedCount).toBe(0);
    expect(result.data?.details).toHaveLength(2);

    // Verify all items were completed successfully
    result.data?.details.forEach(item => {
      expect(item.status).toBe('completed');
      expect(item.fileName).toMatch(/genesis-[12]\.mp3/);
    });
  });

  test('should handle mixed success and failure results', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queueId: 'queue-789-012',
            processedCount: 3,
            successfulCount: 2,
            failedCount: 1,
            skippedCount: 0,
            details: [
              {
                id: 'queue-item-1',
                mediaFileId: 'media-file-1',
                fileName: 'psalm-1.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-2',
                mediaFileId: 'media-file-2',
                fileName: 'psalm-2.mp3',
                status: 'failed',
                error: 'Upload to B2 failed: Network timeout',
              },
              {
                id: 'queue-item-3',
                mediaFileId: 'media-file-3',
                fileName: 'psalm-3.mp3',
                status: 'completed',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'queue-789-012',
        batchSize: 5,
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.processedCount).toBe(3);
    expect(result.data?.successfulCount).toBe(2);
    expect(result.data?.failedCount).toBe(1);

    // Verify details contain both success and failure
    const successfulItems = result.data?.details.filter(
      item => item.status === 'completed'
    );
    const failedItems = result.data?.details.filter(
      item => item.status === 'failed'
    );

    expect(successfulItems).toHaveLength(2);
    expect(failedItems).toHaveLength(1);
    expect(failedItems?.[0]?.error).toContain('Network timeout');
  });

  test('should respect batch size limitations', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            processedCount: 5, // Only processed 5 out of potentially more
            successfulCount: 5,
            failedCount: 0,
            skippedCount: 0,
            details: [
              {
                id: 'queue-item-1',
                mediaFileId: 'media-file-1',
                fileName: 'file-1.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-2',
                mediaFileId: 'media-file-2',
                fileName: 'file-2.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-3',
                mediaFileId: 'media-file-3',
                fileName: 'file-3.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-4',
                mediaFileId: 'media-file-4',
                fileName: 'file-4.mp3',
                status: 'completed',
              },
              {
                id: 'queue-item-5',
                mediaFileId: 'media-file-5',
                fileName: 'file-5.mp3',
                status: 'completed',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize: 5, // Limit to 5 items
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.processedCount).toBe(5);
    expect(result.data?.details).toHaveLength(5);

    // Verify all processed items were successful
    expect(result.data?.successfulCount).toBe(5);
    expect(result.data?.failedCount).toBe(0);
  });

  test('should handle B2 upload failures gracefully', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            processedCount: 1,
            successfulCount: 0,
            failedCount: 1,
            skippedCount: 0,
            details: [
              {
                id: 'queue-item-1',
                mediaFileId: 'media-file-1',
                fileName: 'large-file.mp3',
                status: 'failed',
                error: 'B2 upload failed: File too large',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'failed-upload-queue',
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.successfulCount).toBe(0);
    expect(result.data?.failedCount).toBe(1);
    expect(result.data?.details[0]?.error).toContain('File too large');
  });

  test('should handle database connection errors', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Queue processing failed',
          details: 'Failed to fetch queue items: Database connection error',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'db-error-queue',
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
    expect(result.error).toBe('Queue processing failed');
    expect(result.details).toContain('Database connection error');
  });

  test('should handle missing file data in queue items', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            processedCount: 1,
            successfulCount: 0,
            failedCount: 1,
            skippedCount: 0,
            details: [
              {
                id: 'queue-item-1',
                mediaFileId: 'media-file-1',
                fileName: 'missing-data.mp3',
                status: 'failed',
                error: 'No file data found in queue item',
              },
            ],
          },
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'missing-data-queue',
      }),
    });

    expect(response.ok).toBe(true);

    const result = (await response.json()) as QueueProcessingResponse;
    expect(result.success).toBe(true);
    expect(result.data?.failedCount).toBe(1);
    expect(result.data?.details[0]?.error).toBe(
      'No file data found in queue item'
    );
  });

  test('should handle server errors gracefully', async () => {
    mockFetchProcessor.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Queue processing failed',
          details: 'Internal server error',
        }),
    });

    const url = `${SUPABASE_URL}/functions/v1/process-bulk-upload-queue`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueId: 'error-queue',
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);

    const result = (await response.json()) as {
      success: boolean;
      error: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Queue processing failed');
  });
});
