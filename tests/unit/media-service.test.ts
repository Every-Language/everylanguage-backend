import { MediaService } from '../../supabase/functions/_shared/media-service';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mediaService = new MediaService(mockSupabaseClient as any);
  });

  describe('getNextVersion', () => {
    it('should return incremented version for existing file', async () => {
      // Mock the supabase client response
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ version: 3 }],
          error: null,
        }),
      } as any);

      const version = await mediaService.getNextVersion('test.mp3', 'lang-id');

      expect(version).toBe(4);
    });

    it('should return 1 on database error', async () => {
      // Mock database error
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      } as any);

      const version = await mediaService.getNextVersion('test.mp3', 'lang-id');

      expect(version).toBe(1);
    });
  });

  describe('createMediaFile', () => {
    it('should create media file successfully', async () => {
      const mockMediaFile = { id: 'test-id', language_entity_id: 'lang-id' };

      // Create a new mock chain for this test
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMediaFile,
          error: null,
        }),
      } as any);

      const result = await mediaService.createMediaFile({
        languageEntityId: 'lang-id',
        mediaType: 'audio',
        fileSize: 1024,
        version: 1,
      });

      expect(result).toEqual(mockMediaFile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
    });

    it('should throw error when creation fails', async () => {
      // Create a new mock chain for this test
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        }),
      } as any);

      await expect(
        mediaService.createMediaFile({
          languageEntityId: 'lang-id',
          mediaType: 'audio',
          fileSize: 1024,
          version: 1,
        })
      ).rejects.toThrow('Database error: Creation failed');
    });
  });

  describe('updateMediaFileAfterUpload', () => {
    it('should update media file successfully', async () => {
      // Create a new mock chain for this test
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(
        mediaService.updateMediaFileAfterUpload(
          'file-id',
          'https://example.com/file.mp3',
          1024
        )
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media_files');
    });

    it('should throw error when update fails', async () => {
      // Create a new mock chain for this test
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      } as any);

      await expect(
        mediaService.updateMediaFileAfterUpload(
          'file-id',
          'https://example.com/file.mp3',
          1024
        )
      ).rejects.toThrow('Failed to update media file: Update failed');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-id' };

      // Create a new mock chain for this test
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      } as any);

      const result = await mediaService.getAuthenticatedUser('auth-uid');

      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should return null when no userId provided', async () => {
      const result = await mediaService.getAuthenticatedUser();

      expect(result).toBeNull();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });
});
