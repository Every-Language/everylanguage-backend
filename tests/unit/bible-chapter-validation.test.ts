import { parseAndValidateBibleChapterRequest } from '../../supabase/functions/_shared/bible-chapter-validation';

// Mock File constructor for tests
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(bits: any[], name: string, options: { type?: string } = {}) {
    this.name = name;
    this.size = bits.reduce((acc, bit) => acc + (bit?.length ?? 0), 0);
    this.type = options.type ?? 'application/octet-stream';
  }
} as any;

describe('Bible Chapter Validation - Parser', () => {
  describe('parseBibleChapterUploadRequest', () => {
    it('should parse JSON request successfully', async () => {
      const mockRequestData = {
        language_entity_id: 'test-lang-id',
        chapter_id: 'test-chapter-id',
        start_verse_id: 'verse-1-id',
        end_verse_id: 'verse-2-id',
        duration_seconds: 120.5,
        filename: 'test-chapter.m4a',
        file_content: 'test audio content',
        verse_timings: [
          {
            verseId: 'verse-1-id',
            startTimeSeconds: 0,
            durationSeconds: 60.5,
          },
          {
            verseId: 'verse-2-id',
            startTimeSeconds: 60.5,
            durationSeconds: 60,
          },
        ],
        tag_ids: ['tag-1', 'tag-2'],
      };

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
        json: () => Promise.resolve(mockRequestData),
      } as any;

      const result = await parseAndValidateBibleChapterRequest(mockRequest);

      expect(result.uploadRequest.fileName).toBe('test-chapter.m4a');
      expect(result.uploadRequest.languageEntityId).toBe('test-lang-id');
      expect(result.uploadRequest.chapterId).toBe('test-chapter-id');
      expect(result.uploadRequest.startVerseId).toBe('verse-1-id');
      expect(result.uploadRequest.endVerseId).toBe('verse-2-id');
      expect(result.uploadRequest.durationSeconds).toBe(120.5);
      expect(result.uploadRequest.verseTimings).toHaveLength(2);
      expect(result.uploadRequest.tagIds).toEqual(['tag-1', 'tag-2']);
      expect(result.file).toBeInstanceOf(File);
    });

    it('should throw error for missing required fields', async () => {
      const mockRequestData = {
        language_entity_id: 'test-lang-id',
        // Missing chapter_id, start_verse_id, end_verse_id, duration_seconds
        filename: 'test-chapter.m4a',
        file_content: 'test audio content',
      };

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
        json: () => Promise.resolve(mockRequestData),
      } as any;

      await expect(
        parseAndValidateBibleChapterRequest(mockRequest)
      ).rejects.toThrow(
        'Missing required fields: chapter_id, start_verse_id, end_verse_id, duration_seconds'
      );
    });

    it('should parse request with minimal required fields', async () => {
      const mockRequestData = {
        language_entity_id: 'test-lang-id',
        chapter_id: 'test-chapter-id',
        start_verse_id: 'verse-1-id',
        end_verse_id: 'verse-2-id',
        duration_seconds: 120.5,
        filename: 'test-chapter.m4a',
        file_content: 'test audio content',
        // No optional fields
      };

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
        json: () => Promise.resolve(mockRequestData),
      } as any;

      const result = await parseAndValidateBibleChapterRequest(mockRequest);

      expect(result.uploadRequest.fileName).toBe('test-chapter.m4a');
      expect(result.uploadRequest.languageEntityId).toBe('test-lang-id');
      expect(result.uploadRequest.chapterId).toBe('test-chapter-id');
      expect(result.uploadRequest.startVerseId).toBe('verse-1-id');
      expect(result.uploadRequest.endVerseId).toBe('verse-2-id');
      expect(result.uploadRequest.durationSeconds).toBe(120.5);
      expect(result.uploadRequest.projectId).toBeUndefined();
      expect(result.uploadRequest.verseTimings).toBeUndefined();
      expect(result.uploadRequest.tagIds).toBeUndefined();
      expect(result.file).toBeInstanceOf(File);
    });

    it('should parse verse timings correctly', async () => {
      const verseTimings = [
        {
          verseId: 'verse-1',
          startTimeSeconds: 0,
          durationSeconds: 30.5,
        },
        {
          verseId: 'verse-2',
          startTimeSeconds: 30.5,
          durationSeconds: 45.2,
        },
      ];

      const mockRequestData = {
        language_entity_id: 'test-lang-id',
        chapter_id: 'test-chapter-id',
        start_verse_id: 'verse-1',
        end_verse_id: 'verse-2',
        duration_seconds: 75.7,
        filename: 'test-chapter.m4a',
        file_content: 'test audio content',
        verse_timings: verseTimings,
      };

      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
        json: () => Promise.resolve(mockRequestData),
      } as any;

      const result = await parseAndValidateBibleChapterRequest(mockRequest);

      expect(result.uploadRequest.verseTimings).toHaveLength(2);
      expect(result.uploadRequest.verseTimings![0]).toEqual({
        verseId: 'verse-1',
        startTimeSeconds: 0,
        durationSeconds: 30.5,
      });
      expect(result.uploadRequest.verseTimings![1]).toEqual({
        verseId: 'verse-2',
        startTimeSeconds: 30.5,
        durationSeconds: 45.2,
      });
    });

    it('should throw error for unsupported content type', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/plain';
            return null;
          },
        },
      } as any;

      await expect(
        parseAndValidateBibleChapterRequest(mockRequest)
      ).rejects.toThrow('Unsupported content type: text/plain');
    });
  });
});
