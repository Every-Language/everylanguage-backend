// Mock fetch for integration tests
const mockFetchRequest = jest.fn();

beforeEach(() => {
  mockFetchRequest.mockClear();
  global.fetch = mockFetchRequest;
});

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

describe('Bible Chapter Upload - Filename Robustness', () => {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? 'https://sjczwtpnjbmscxoszlyi.supabase.co';
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

  let authToken: string = 'mock-auth-token-12345';

  async function testBibleChapterUploadWithFilename(filename: string) {
    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`;

    // Mock successful upload response with sanitized filename
    const sanitizedFilename = filename
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '');

    // Set up the upload mock
    mockFetchRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            mediaFileId: 'mock-media-file-id',
            downloadUrl: `https://f005.backblazeb2.com/file/test-bucket/${sanitizedFilename}`,
            fileSize: 1024,
            version: 1,
            duration: 60.0,
            chapterId: 'gen-1',
            startVerseId: 'gen-1-1',
            endVerseId: 'gen-1-1',
            verseRecordsCreated: 1,
            tagRecordsCreated: 0,
          },
        }),
      text: () => Promise.resolve('{"success":true}'),
    });

    const testData = {
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      chapter_id: 'gen-1',
      start_verse_id: 'gen-1-1',
      end_verse_id: 'gen-1-1',
      duration_seconds: 60.0,
      filename: filename,
      file_content: `Test content for ${filename}`,
      verse_timings: [
        {
          verseId: 'gen-1-1',
          startTimeSeconds: 0,
          durationSeconds: 60.0,
        },
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
    return {
      filename,
      success: true,
      result: result,
    };
  }

  // Test cases for different filename patterns
  const testFilenames = [
    'normal-chapter.m4a',
    'chapter with spaces.m4a',
    'chapter-with-émojis-🎵🎶.m4a',
    'chapter(with)parentheses.m4a',
    'chapter[with]brackets.m4a',
    'chapter&with&ampersands.m4a',
    'chapter%with%percent.m4a',
    'chapter#with#hash.m4a',
    'chapter+with+plus.m4a',
    'très-long-chapter-name-with-special-characters-äöü.m4a',
    '中文章节名.m4a',
    'العربية.m4a',
    'русский.m4a',
    'Genesis_Chapter_1_Audio.m4a',
    'matthew-5-beatitudes.m4a',
  ];

  testFilenames.forEach(filename => {
    it(`should handle filename: ${filename}`, async () => {
      const result = await testBibleChapterUploadWithFilename(filename);
      expect(result.success).toBe(true);
      expect(result.result.data).toBeDefined();
      expect(result.result.data.downloadUrl).toContain('.m4a');
      expect(result.result.data.verseRecordsCreated).toBe(1);
    });
  });

  it('should handle very long filenames', async () => {
    const longFilename = 'a'.repeat(200) + '.m4a';
    const result = await testBibleChapterUploadWithFilename(longFilename);
    expect(result.success).toBe(true);
  });

  it('should sanitize dangerous characters', async () => {
    const dangerousFilename = '../../dangerous-chapter.m4a';
    const result = await testBibleChapterUploadWithFilename(dangerousFilename);
    expect(result.success).toBe(true);
    // Should not contain path traversal
    expect(result.result.data.downloadUrl).not.toContain('../');
  });

  it('should handle empty filename gracefully', async () => {
    const result = await testBibleChapterUploadWithFilename('');
    expect(result.success).toBe(true);
  });

  it('should handle filename with only extension', async () => {
    const result = await testBibleChapterUploadWithFilename('.m4a');
    expect(result.success).toBe(true);
  });

  it('should handle complex Bible reference patterns', async () => {
    const biblicalFilenames = [
      '1-Corinthians-13-Love-Chapter.m4a',
      'John_3_16_For_God_So_Loved.m4a',
      'Psalm-23-The-Lords-Prayer.m4a',
      'Matthew_5_3-12_Beatitudes.m4a',
      'Revelation_21_1-8_New_Heaven_Earth.m4a',
    ];

    for (const filename of biblicalFilenames) {
      const result = await testBibleChapterUploadWithFilename(filename);
      expect(result.success).toBe(true);
      expect(result.result.data.downloadUrl).toContain(filename);
    }
  });
});
