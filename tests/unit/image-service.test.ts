import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ImageService } from '../../supabase/functions/_shared/image-service';

// Mock the getPublicUserId function
jest.mock('../../supabase/functions/_shared/user-service.ts', () => ({
  getPublicUserId: jest.fn(),
}));

import { getPublicUserId } from '../../supabase/functions/_shared/user-service.ts';

const mockGetPublicUserId = getPublicUserId as jest.MockedFunction<
  typeof getPublicUserId
>;

describe('ImageService', () => {
  let imageService: ImageService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    } as any;

    // Set up default mock behavior
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

    imageService = new ImageService(mockSupabaseClient);
  });

  describe('createImageSet', () => {
    it('should create image set successfully', async () => {
      const mockImageSet = { id: 'set-id', name: 'Test Set' };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      const result = await imageService.createImageSet({
        name: 'Test Set',
        remotePath: '/path/to/set',
        createdBy: 'user-id',
      });

      expect(result).toEqual(mockImageSet);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('image_sets');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        name: 'Test Set',
        remote_path: '/path/to/set',
        created_by: 'user-id',
      });
    });

    it('should throw error on creation failure', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        imageService.createImageSet({
          name: 'Test Set',
          remotePath: '/path/to/set',
          createdBy: 'user-id',
        })
      ).rejects.toThrow('Failed to create image set: Database error');
    });
  });

  describe('createImage', () => {
    it('should create image successfully', async () => {
      const mockImage = { id: 'image-id', remote_path: '/path/to/image.jpg' };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      const result = await imageService.createImage({
        remotePath: '/path/to/image.jpg',
        targetType: 'chapter',
        targetId: 'chapter-id',
        setId: 'set-id',
        createdBy: 'user-id',
        fileSize: 1024,
      });

      expect(result).toEqual(mockImage);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        remote_path: '/path/to/image.jpg',
        target_type: 'chapter',
        target_id: 'chapter-id',
        set_id: 'set-id',
        created_by: 'user-id',
        version: 1,
      });
    });

    it('should create image without set ID', async () => {
      const mockImage = { id: 'image-id', remote_path: '/path/to/image.jpg' };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      const result = await imageService.createImage({
        remotePath: '/path/to/image.jpg',
        targetType: 'chapter',
        targetId: 'chapter-id',
        createdBy: 'user-id',
      });

      expect(result).toEqual(mockImage);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        remote_path: '/path/to/image.jpg',
        target_type: 'chapter',
        target_id: 'chapter-id',
        set_id: undefined,
        created_by: 'user-id',
        version: 1,
      });
    });

    it('should throw error on creation failure', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        imageService.createImage({
          remotePath: '/path/to/image.jpg',
          targetType: 'chapter',
          targetId: 'chapter-id',
          createdBy: 'user-id',
        })
      ).rejects.toThrow('Failed to create image: Database error');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user ID for valid auth UID', async () => {
      const mockUserId = 'user-id';

      // Mock the getPublicUserId function directly
      mockGetPublicUserId.mockResolvedValueOnce(mockUserId);

      const result = await imageService.getAuthenticatedUser('auth-uid');

      expect(result).toBe(mockUserId);
      expect(mockGetPublicUserId).toHaveBeenCalledWith(
        mockSupabaseClient,
        'auth-uid'
      );
    });

    it('should return null for undefined auth UID', async () => {
      mockGetPublicUserId.mockResolvedValueOnce(null);

      const result = await imageService.getAuthenticatedUser(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty auth UID', async () => {
      mockGetPublicUserId.mockResolvedValueOnce(null);

      const result = await imageService.getAuthenticatedUser('');
      expect(result).toBeNull();
    });
  });

  describe('getImagesInSet', () => {
    it('should get images by set ID', async () => {
      const mockImages = [
        { id: 'image-1', set_id: 'set-id' },
        { id: 'image-2', set_id: 'set-id' },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockImages,
        error: null,
      });

      const result = await imageService.getImagesInSet('set-id');

      expect(result).toEqual(mockImages);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('set_id', 'set-id');
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('deleted_at', null);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should throw error on failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(imageService.getImagesInSet('set-id')).rejects.toThrow(
        'Failed to get images in set: Database error'
      );
    });
  });

  describe('getImagesForTarget', () => {
    it('should get images by target type and ID', async () => {
      const mockImages = [
        { id: 'image-1', target_type: 'chapter', target_id: 'chapter-id' },
        { id: 'image-2', target_type: 'chapter', target_id: 'chapter-id' },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockImages,
        error: null,
      });

      const result = await imageService.getImagesForTarget(
        'chapter',
        'chapter-id'
      );

      expect(result).toEqual(mockImages);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'target_type',
        'chapter'
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'target_id',
        'chapter-id'
      );
    });
  });

  describe('deleteImage', () => {
    it('should soft delete image', async () => {
      const mockImage = { id: 'image-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock getting the image for ownership check (first chain ending with single())
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      await imageService.deleteImage('image-id', 'auth-uid');

      expect(mockGetPublicUserId).toHaveBeenCalledWith(
        mockSupabaseClient,
        'auth-uid'
      );
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
      });
    });

    it('should verify ownership before deletion', async () => {
      const mockImage = { id: 'image-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock getting the image for ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      // Should not throw since user owns the image
      await imageService.deleteImage('image-id', 'auth-uid');

      expect(mockGetPublicUserId).toHaveBeenCalledWith(
        mockSupabaseClient,
        'auth-uid'
      );
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
    });

    it('should throw error if user does not own image', async () => {
      const mockImage = { id: 'image-id', created_by: 'other-user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock getting the image for ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      await expect(
        imageService.deleteImage('image-id', 'auth-uid')
      ).rejects.toThrow('Not authorized to delete this image');
    });

    it('should handle deletion without throwing when user has permission', async () => {
      const mockImage = { id: 'image-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock getting the image for ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      // This should not throw - testing that the basic flow works
      await expect(
        imageService.deleteImage('image-id', 'auth-uid')
      ).resolves.not.toThrow();
    });
  });

  describe('updateImageSet', () => {
    it('should update image set', async () => {
      const mockImageSet = { id: 'set-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      // Mock update operation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockImageSet, name: 'Updated Set' },
        error: null,
      });

      const result = await imageService.updateImageSet(
        'set-id',
        { name: 'Updated Set' },
        'auth-uid'
      );

      expect(result.name).toBe('Updated Set');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        name: 'Updated Set',
        updated_at: expect.any(String),
      });
    });

    it('should verify ownership before update', async () => {
      const mockImageSet = { id: 'set-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      // Should not throw since user owns the set
      await imageService.updateImageSet(
        'set-id',
        { name: 'Updated Set' },
        'auth-uid'
      );

      expect(mockGetPublicUserId).toHaveBeenCalledWith(
        mockSupabaseClient,
        'auth-uid'
      );
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('image_sets');
    });

    it('should throw error if user does not own set', async () => {
      const mockImageSet = { id: 'set-id', created_by: 'other-user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      await expect(
        imageService.updateImageSet(
          'set-id',
          { name: 'Updated Set' },
          'auth-uid'
        )
      ).rejects.toThrow('Not authorized to update this image set');
    });
  });

  describe('userOwnsImageSet', () => {
    it('should return true if user owns image set', async () => {
      const mockImageSet = { id: 'set-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(true);
    });

    it('should return false if user does not own image set', async () => {
      const mockImageSet = { id: 'set-id', created_by: 'other-user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageSet,
        error: null,
      });

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      // Mock getPublicUserId to return null
      mockGetPublicUserId.mockResolvedValueOnce(null);

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(false);
    });
  });

  describe('userOwnsImage', () => {
    it('should return true if user owns image', async () => {
      const mockImage = { id: 'image-id', created_by: 'user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      const result = await imageService.userOwnsImage('image-id', 'auth-uid');
      expect(result).toBe(true);
    });

    it('should return false if user does not own image', async () => {
      const mockImage = { id: 'image-id', created_by: 'other-user-id' };

      // Mock getPublicUserId to return the user ID
      mockGetPublicUserId.mockResolvedValueOnce('user-id');

      // Mock ownership check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImage,
        error: null,
      });

      const result = await imageService.userOwnsImage('image-id', 'auth-uid');
      expect(result).toBe(false);
    });
  });
});
