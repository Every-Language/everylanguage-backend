import { describe, it, expect, beforeEach } from '@jest/globals';
import { MediaService } from '../../supabase/functions/_shared/media-service';

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mediaService = new MediaService(mockSupabaseClient);
  });

  describe('getNextVersion', () => {
    it('should return incremented version for existing file', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: [{ version: 3 }],
        error: null,
      });

      const version = await mediaService.getNextVersion('test.mp3', 'lang-id');

      expect(version).toBe(4);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('version');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'language_entity_id',
        'lang-id'
      );
      expect(mockSupabaseClient.like).toHaveBeenCalledWith(
        'remote_path',
        '%test.mp3%'
      );
    });

    it('should return 1 when no existing files found', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const version = await mediaService.getNextVersion('test.mp3', 'lang-id');

      expect(version).toBe(1);
    });

    it('should return 1 on database error', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const version = await mediaService.getNextVersion('test.mp3', 'lang-id');

      expect(version).toBe(1);
    });
  });

  describe('createMediaFile', () => {
    it('should create media file successfully', async () => {
      const mockMediaFile = { id: 'test-id', language_entity_id: 'lang-id' };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockMediaFile,
        error: null,
      });

      const result = await mediaService.createMediaFile({
        languageEntityId: 'lang-id',
        mediaType: 'audio',
        projectId: 'project-id',
        createdBy: 'user-id',
        fileSize: 1024,
        durationSeconds: 120,
        version: 1,
      });

      expect(result).toEqual(mockMediaFile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        language_entity_id: 'lang-id',
        media_type: 'audio',
        project_id: 'project-id',
        created_by: 'user-id',
        upload_status: 'uploading',
        publish_status: 'pending',
        file_size: 1024,
        duration_seconds: 120,
        version: 1,
      });
    });

    it('should throw error when creation fails', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        mediaService.createMediaFile({
          languageEntityId: 'lang-id',
          mediaType: 'audio',
          version: 1,
        })
      ).rejects.toThrow('Database error: Database error');
    });
  });

  describe('updateMediaFileAfterUpload', () => {
    it('should update media file successfully', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await mediaService.updateMediaFileAfterUpload(
        'file-id',
        'https://example.com/file.mp3',
        1024
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        remote_path: 'https://example.com/file.mp3',
        file_size: 1024,
        upload_status: 'completed',
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'file-id');
    });

    it('should not throw error when update fails (by design)', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // The method should not throw even when there's an error
      await expect(
        mediaService.updateMediaFileAfterUpload(
          'file-id',
          'https://example.com/file.mp3',
          1024
        )
      ).resolves.not.toThrow();
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user ID when found', async () => {
      const mockUserId = 'user-id';

      // Since getAuthenticatedUser now calls getPublicUserId, we need to mock the Supabase query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: mockUserId },
        error: null,
      });

      const result = await mediaService.getAuthenticatedUser('auth-uid');

      expect(result).toBe(mockUserId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'auth_uid',
        'auth-uid'
      );
    });

    it('should return null when no userId provided', async () => {
      const result = await mediaService.getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await mediaService.getAuthenticatedUser('auth-uid');
      expect(result).toBeNull();
    });
  });
});
