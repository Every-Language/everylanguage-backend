import {
  createBibleChapterMediaFile,
  updateMediaFileUploadResults,
  markMediaFileAsFailed,
  updateMediaFileStatus,
  getNextVersionForChapter,
  createMediaFileVerses,
  createMediaFileTags,
} from '../../supabase/functions/_shared/bible-chapter-database';

// Mock supabase client with proper chain structure
const mockSupabaseClient = {
  from: jest.fn(),
};

// Chain mocks for different operations
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

describe('Bible Chapter Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default chain returns
    mockSupabaseClient.from.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    });

    mockInsert.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      single: mockSingle,
      eq: mockEq,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });

    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
  });

  describe('createBibleChapterMediaFile', () => {
    it('should create a media file record successfully', async () => {
      const mockMediaFile = {
        id: 'media-file-123',
        language_entity_id: 'lang-123',
        audio_version_id: 'audio-123',
        created_by: 'user-123',
      };

      mockSingle.mockResolvedValue({
        data: mockMediaFile,
        error: null,
      });

      const mediaFileData = {
        languageEntityId: 'lang-123',
        audioVersionId: 'audio-123',
        chapterId: 'chapter-123',
        createdBy: 'user-123',
        fileSize: 1024,
        durationSeconds: 180.5,
        version: 1,
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
        status: 'pending' as const,
      };

      const result = await createBibleChapterMediaFile(
        mockSupabaseClient,
        mediaFileData
      );

      expect(result).toEqual(mockMediaFile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockInsert).toHaveBeenCalledWith({
        language_entity_id: 'lang-123',
        audio_version_id: 'audio-123',
        chapter_id: 'chapter-123',
        media_type: 'audio',
        created_by: 'user-123',
        upload_status: 'pending',
        publish_status: 'pending',
        check_status: 'pending',
        file_size: 1024,
        duration_seconds: 180.5,
        version: 1,
        start_verse_id: 'verse-1',
        end_verse_id: 'verse-2',
        is_bible_audio: true,
      });
    });

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mediaFileData = {
        languageEntityId: 'lang-123',
        audioVersionId: 'audio-123',
        chapterId: 'chapter-123',
        createdBy: 'user-123',
        fileSize: 1024,
        durationSeconds: 180.5,
        version: 1,
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
        status: 'pending' as const,
      };

      await expect(
        createBibleChapterMediaFile(mockSupabaseClient, mediaFileData)
      ).rejects.toThrow('Database error creating media file: Database error');
    });

    it('should handle missing data', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const mediaFileData = {
        languageEntityId: 'lang-123',
        audioVersionId: 'audio-123',
        chapterId: 'chapter-123',
        createdBy: 'user-123',
        fileSize: 1024,
        durationSeconds: 180.5,
        version: 1,
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
        status: 'pending' as const,
      };

      await expect(
        createBibleChapterMediaFile(mockSupabaseClient, mediaFileData)
      ).rejects.toThrow(
        'Database error creating media file: Unknown database error'
      );
    });
  });

  describe('updateMediaFileUploadResults', () => {
    it('should update media file with upload results', async () => {
      mockEq.mockResolvedValue({
        error: null,
      });

      const uploadResult = {
        downloadUrl: 'https://example.com/file.mp3',
        fileSize: 2048,
      };

      await updateMediaFileUploadResults(
        mockSupabaseClient,
        'media-file-123',
        uploadResult
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockUpdate).toHaveBeenCalledWith({
        upload_status: 'completed',
        remote_path: 'https://example.com/file.mp3',
        file_size: 2048,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'media-file-123');
    });

    it('should handle update errors', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const uploadResult = {
        downloadUrl: 'https://example.com/file.mp3',
        fileSize: 2048,
      };

      await expect(
        updateMediaFileUploadResults(
          mockSupabaseClient,
          'media-file-123',
          uploadResult
        )
      ).rejects.toThrow('Failed to update media file: Update failed');
    });
  });

  describe('markMediaFileAsFailed', () => {
    it('should mark media file as failed', async () => {
      mockEq.mockResolvedValue({
        error: null,
      });

      await markMediaFileAsFailed(mockSupabaseClient, 'media-file-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockUpdate).toHaveBeenCalledWith({
        upload_status: 'failed',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'media-file-123');
    });

    it('should handle errors gracefully', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      // Should not throw - just log error
      await expect(
        markMediaFileAsFailed(mockSupabaseClient, 'media-file-123')
      ).resolves.toBeUndefined();
    });
  });

  describe('updateMediaFileStatus', () => {
    it('should update media file status', async () => {
      mockEq.mockResolvedValue({
        error: null,
      });

      await updateMediaFileStatus(
        mockSupabaseClient,
        'media-file-123',
        'uploading'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockUpdate).toHaveBeenCalledWith({
        upload_status: 'uploading',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'media-file-123');
    });

    it('should handle update errors', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Status update failed' },
      });

      await expect(
        updateMediaFileStatus(mockSupabaseClient, 'media-file-123', 'uploading')
      ).rejects.toThrow(
        'Failed to update media file status: Status update failed'
      );
    });
  });

  describe('getNextVersionForChapter', () => {
    it('should return version 1 for new chapter', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getNextVersionForChapter(mockSupabaseClient, {
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
      });

      expect(result).toBe(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockSelect).toHaveBeenCalledWith('version');
    });

    it('should return incremented version for existing chapter', async () => {
      mockLimit.mockResolvedValue({
        data: [{ version: 3 }],
        error: null,
      });

      const result = await getNextVersionForChapter(mockSupabaseClient, {
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
      });

      expect(result).toBe(4);
    });

    it('should handle database errors and return version 1', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getNextVersionForChapter(mockSupabaseClient, {
        startVerseId: 'verse-1',
        endVerseId: 'verse-2',
      });

      expect(result).toBe(1);
    });
  });

  describe('createMediaFileVerses', () => {
    it('should create verse timing records', async () => {
      mockInsert.mockResolvedValue({
        error: null,
      });

      const verseTimingData = {
        mediaFileId: 'media-file-123',
        verseTimings: [
          {
            verseId: 'verse-1',
            startTimeSeconds: 0,
            durationSeconds: 30,
          },
          {
            verseId: 'verse-2',
            startTimeSeconds: 30,
            durationSeconds: 45,
          },
        ],
        createdBy: 'user-123',
      };

      await createMediaFileVerses(mockSupabaseClient, verseTimingData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'media_files_verses'
      );
      expect(mockInsert).toHaveBeenCalledWith([
        {
          media_file_id: 'media-file-123',
          verse_id: 'verse-1',
          start_time_seconds: 0,
          duration_seconds: 30,
          verse_text_id: null,
          created_by: 'user-123',
        },
        {
          media_file_id: 'media-file-123',
          verse_id: 'verse-2',
          start_time_seconds: 30,
          duration_seconds: 45,
          verse_text_id: null,
          created_by: 'user-123',
        },
      ]);
    });

    it('should skip empty verse timings', async () => {
      const verseTimingData = {
        mediaFileId: 'media-file-123',
        verseTimings: [],
        createdBy: 'user-123',
      };

      await createMediaFileVerses(mockSupabaseClient, verseTimingData);

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle insertion errors', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      const verseTimingData = {
        mediaFileId: 'media-file-123',
        verseTimings: [
          {
            verseId: 'verse-1',
            startTimeSeconds: 0,
            durationSeconds: 30,
          },
        ],
        createdBy: 'user-123',
      };

      await expect(
        createMediaFileVerses(mockSupabaseClient, verseTimingData)
      ).rejects.toThrow('Failed to create verse timings: Insert failed');
    });
  });

  describe('createMediaFileTags', () => {
    it('should create tag association records', async () => {
      mockInsert.mockResolvedValue({
        error: null,
      });

      const tagData = {
        mediaFileId: 'media-file-123',
        tagIds: ['tag-1', 'tag-2'],
        createdBy: 'user-123',
      };

      await createMediaFileTags(mockSupabaseClient, tagData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files_tags');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          media_file_id: 'media-file-123',
          tag_id: 'tag-1',
          created_by: 'user-123',
        },
        {
          media_file_id: 'media-file-123',
          tag_id: 'tag-2',
          created_by: 'user-123',
        },
      ]);
    });

    it('should skip empty tag IDs', async () => {
      const tagData = {
        mediaFileId: 'media-file-123',
        tagIds: [],
        createdBy: 'user-123',
      };

      await createMediaFileTags(mockSupabaseClient, tagData);

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle insertion errors', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Tag insert failed' },
      });

      const tagData = {
        mediaFileId: 'media-file-123',
        tagIds: ['tag-1'],
        createdBy: 'user-123',
      };

      await expect(
        createMediaFileTags(mockSupabaseClient, tagData)
      ).rejects.toThrow('Failed to create tag associations: Tag insert failed');
    });
  });
});
