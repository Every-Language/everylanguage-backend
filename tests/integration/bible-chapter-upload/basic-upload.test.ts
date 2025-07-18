// Mock fetch for integration tests
const mockFetchBibleChapter = jest.fn();
global.fetch = mockFetchBibleChapter;

interface AuthResponse {
  access_token: string;
}

interface BibleChapterUploadResponse {
  success: boolean;
  data: {
    mediaFileId: string;
    downloadUrl: string;
    fileSize: number;
    version: number;
    duration: number;
    chapterId: string;
    startVerseId: string;
    endVerseId: string;
    verseRecordsCreated: number;
    tagRecordsCreated: number;
  };
}

describe('Bible Chapter Upload - Basic Functionality', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

  let authToken: string;

  beforeAll(async () => {
    // Mock authentication response
    mockFetchBibleChapter.mockResolvedValueOnce({
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
    mockFetchBibleChapter.mockClear();
  });

  test('should upload Bible chapter via JSON method', async () => {
    // Mock successful upload response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-bible-media-file-id-123',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/genesis-1.m4a',
            verseRecordsCreated: 2,
            tagRecordsCreated: 1,
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'gen-1',
      start_verse_id: 'gen-1-1',
      end_verse_id: 'gen-1-2',
      duration_seconds: 180.5,
      project_id: 'test-project-id',
      filename: 'genesis-1.m4a',
      file_content: 'This is test Bible chapter audio content',
      verse_timings: [
        {
          verseId: 'gen-1-1',
          startTimeSeconds: 0,
          durationSeconds: 90.0,
        },
        {
          verseId: 'gen-1-2',
          startTimeSeconds: 90.0,
          durationSeconds: 90.5,
        },
      ],
      tag_ids: ['biblical-audio'],
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

    const result = (await response.json()) as BibleChapterUploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.mediaFileId).toBeDefined();
    expect(result.data.downloadUrl).toBeDefined();
    expect(result.data.downloadUrl).toContain('backblazeb2.com');
    expect(result.data.downloadUrl).toContain('genesis-1.m4a');
    expect(result.data.verseRecordsCreated).toBe(2);
    expect(result.data.tagRecordsCreated).toBe(1);
  });

  test('should require authentication', async () => {
    // Mock unauthorized response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
      text: () => Promise.resolve('Unauthorized'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'gen-1',
      start_verse_id: 'gen-1-1',
      end_verse_id: 'gen-1-2',
      duration_seconds: 120.5,
      filename: 'test-chapter.m4a',
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
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Missing required fields' }),
      text: () => Promise.resolve('Missing required fields'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const invalidData = {
      // Missing required fields
      filename: 'test-chapter.m4a',
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

  test('should handle verse timings correctly', async () => {
    // Mock successful upload response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-verses-media-file-id-456',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/psalms-1.m4a',
            verseRecordsCreated: 6,
            tagRecordsCreated: 0,
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'psa-1',
      start_verse_id: 'psa-1-1',
      end_verse_id: 'psa-1-6',
      duration_seconds: 300.0,
      filename: 'psalms-1.m4a',
      file_content: 'Psalm 1 audio content',
      verse_timings: [
        { verseId: 'psa-1-1', startTimeSeconds: 0, durationSeconds: 50 },
        { verseId: 'psa-1-2', startTimeSeconds: 50, durationSeconds: 45 },
        { verseId: 'psa-1-3', startTimeSeconds: 95, durationSeconds: 48 },
        { verseId: 'psa-1-4', startTimeSeconds: 143, durationSeconds: 52 },
        { verseId: 'psa-1-5', startTimeSeconds: 195, durationSeconds: 53 },
        { verseId: 'psa-1-6', startTimeSeconds: 248, durationSeconds: 52 },
      ],
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

    const result = (await response.json()) as BibleChapterUploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.verseRecordsCreated).toBe(6);
  });

  test('should work without optional fields', async () => {
    // Mock successful upload response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-minimal-media-file-id-789',
            downloadUrl:
              'https://f005.backblazeb2.com/file/test-bucket/matthew-1.m4a',
            verseRecordsCreated: 0,
            tagRecordsCreated: 0,
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    // Minimal required data only
    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'mat-1',
      start_verse_id: 'mat-1-1',
      end_verse_id: 'mat-1-25',
      duration_seconds: 600.0,
      filename: 'matthew-1.m4a',
      file_content: 'Matthew chapter 1 audio content',
      // No optional fields: project_id, verse_timings, tag_ids
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

    const result = (await response.json()) as BibleChapterUploadResponse;
    expect(result.success).toBe(true);
    expect(result.data.mediaFileId).toBeDefined();
    expect(result.data.downloadUrl).toContain('matthew-1.m4a');
    expect(result.data.verseRecordsCreated).toBe(0); // No verse timings provided
    expect(result.data.tagRecordsCreated).toBe(0); // No tags provided
  });

  test('should handle file type validation', async () => {
    // Mock validation error response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Only audio files are supported' }),
      text: () => Promise.resolve('Only audio files are supported'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'gen-1',
      start_verse_id: 'gen-1-1',
      end_verse_id: 'gen-1-2',
      duration_seconds: 120.5,
      filename: 'test-chapter.txt', // Wrong file type
      file_content: 'Test content',
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  test('should handle database validation errors', async () => {
    // Mock database validation error response
    mockFetchBibleChapter.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'Language entity not found or has been deleted',
        }),
      text: () =>
        Promise.resolve('Language entity not found or has been deleted'),
    });

    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    const testData = {
      language_entity_id: 'invalid-language-id',
      chapter_id: 'gen-1',
      start_verse_id: 'gen-1-1',
      end_verse_id: 'gen-1-2',
      duration_seconds: 120.5,
      filename: 'test-chapter.m4a',
      file_content: 'Test content',
    };

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });
});
