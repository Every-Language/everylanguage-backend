// Mock fetch at the top level to avoid network calls in tests
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;

  // Helper function to create mock responses
  function createMockResponse(data: any, status = 200) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response);
  }

  mockFetch.mockImplementation((url: string, options: any) => {
    if (url.includes('/auth/v1/token')) {
      return createMockResponse({
        access_token: 'mock-auth-token',
        user: { email: 'test@example.com' },
      });
    }

    if (url.includes('/functions/v1/upload-media')) {
      const body = JSON.parse(options?.body ?? '{}');
      const filename = body.filename ?? 'test.m4a';

      return createMockResponse({
        success: true,
        data: {
          mediaFileId: 'mock-media-file-id',
          downloadUrl: `https://f005.backblazeb2.com/file/test-bucket/${filename}`,
          version: 1,
        },
      });
    }

    return createMockResponse({ error: 'Not found' }, 404);
  });
});

interface UploadResult {
  success: boolean;
  data: {
    mediaFileId: string;
    downloadUrl: string;
    version: number;
  };
}

async function testUploadWithFilename(filename: string) {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

  const testData = {
    target_type: 'chapter',
    target_id: 'test-chapter-id',
    language_entity_id: 'test-lang-id',
    filename: filename,
    file_content: `Test content for ${filename}`,
  };

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer mock-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData),
  });

  expect(response.ok).toBe(true);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const result = await response.json();
  return {
    filename,
    success: true,
    result: result as UploadResult,
  };
}

// Test cases
describe('Media Upload - Filename Robustness', () => {
  const testFilenames = [
    'normal-file.m4a',
    'file with spaces.m4a',
    'file-with-émojis-🎵🎶.m4a',
    'file(with)parentheses.m4a',
    'file[with]brackets.m4a',
    'file&with&ampersands.m4a',
    'file%with%percent.m4a',
    'file#with#hash.m4a',
    'file+with+plus.m4a',
    'très-long-filename-with-special-characters-äöü.m4a',
    '中文文件名.m4a',
    'العربية.m4a',
    'русский.m4a',
  ];

  testFilenames.forEach(filename => {
    it(`should handle filename: ${filename}`, async () => {
      const result = await testUploadWithFilename(filename);
      expect(result.success).toBe(true);
      expect(result.result.data).toBeDefined();
      expect(result.result.data.downloadUrl).toContain('.m4a');
    });
  });

  it('should handle very long filenames', async () => {
    const longFilename = 'a'.repeat(200) + '.m4a';
    const result = await testUploadWithFilename(longFilename);
    expect(result.success).toBe(true);
  });

  it('should sanitize dangerous characters', async () => {
    const dangerousFilename = '../../dangerous.m4a';
    const result = await testUploadWithFilename(dangerousFilename);
    expect(result.success).toBe(true);
    // Should not contain path traversal
    expect(result.result.data.downloadUrl).not.toContain('../');
  });

  it('should handle empty filename gracefully', async () => {
    const result = await testUploadWithFilename('');
    expect(result.success).toBe(true);
  });

  it('should handle filename with only extension', async () => {
    const result = await testUploadWithFilename('.m4a');
    expect(result.success).toBe(true);
  });
});
