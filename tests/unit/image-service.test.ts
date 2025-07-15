import { describe, it, expect, beforeEach } from '@jest/globals';
import { ImageService } from '../../supabase/functions/_shared/image-service.ts';
import type {
  ImageData,
  ImageSetData,
} from '../../supabase/functions/_shared/image-service.ts';

describe('ImageService', () => {
  let imageService: ImageService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create a more flexible mock that can handle different query chains
    const createMockQuery = (finalResult = { data: null, error: null }) => ({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue(finalResult),
      single: jest.fn().mockResolvedValue(finalResult),
    });

    mockSupabaseClient = createMockQuery();
    imageService = new ImageService(mockSupabaseClient);
  });

  describe('createImageSet', () => {
    it('should create image set successfully', async () => {
      const imageSetData: ImageSetData = {
        name: 'Test Set',
        remotePath: 'path/to/set',
        createdBy: 'user-id',
      };

      const mockResult = {
        id: 'set-id',
        name: 'Test Set',
        remote_path: 'path/to/set',
        created_by: 'user-id',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await imageService.createImageSet(imageSetData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('image_sets');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        name: 'Test Set',
        remote_path: 'path/to/set',
        created_by: 'user-id',
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw error on creation failure', async () => {
      const imageSetData: ImageSetData = {
        name: 'Test Set',
        remotePath: 'path/to/set',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(imageService.createImageSet(imageSetData)).rejects.toThrow(
        'Failed to create image set: Database error'
      );
    });
  });

  describe('createImage', () => {
    it('should create image successfully', async () => {
      const imageData: ImageData = {
        remotePath: 'path/to/image.jpg',
        targetType: 'chapter',
        targetId: 'chapter-id',
        setId: 'set-id',
        createdBy: 'user-id',
        fileSize: 1024,
      };

      const mockResult = {
        id: 'image-id',
        remote_path: 'path/to/image.jpg',
        target_type: 'chapter',
        target_id: 'chapter-id',
        set_id: 'set-id',
        created_by: 'user-id',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await imageService.createImage(imageData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        remote_path: 'path/to/image.jpg',
        target_type: 'chapter',
        target_id: 'chapter-id',
        set_id: 'set-id',
        created_by: 'user-id',
      });
      expect(result).toEqual(mockResult);
    });

    it('should create image without set ID', async () => {
      const imageData: ImageData = {
        remotePath: 'path/to/image.jpg',
        targetType: 'chapter',
        targetId: 'chapter-id',
        createdBy: 'user-id',
        fileSize: 1024,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'image-id' },
        error: null,
      });

      await imageService.createImage(imageData);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        remote_path: 'path/to/image.jpg',
        target_type: 'chapter',
        target_id: 'chapter-id',
        set_id: undefined,
        created_by: 'user-id',
      });
    });

    it('should throw error on creation failure', async () => {
      const imageData: ImageData = {
        remotePath: 'path/to/image.jpg',
        targetType: 'chapter',
        targetId: 'chapter-id',
        fileSize: 1024,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(imageService.createImage(imageData)).rejects.toThrow(
        'Failed to create image: Database error'
      );
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user for valid auth UID', async () => {
      const mockUser = { id: 'user-id' };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await imageService.getAuthenticatedUser('auth-uid');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'auth_uid',
        'auth-uid'
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null for undefined auth UID', async () => {
      const result = await imageService.getAuthenticatedUser(undefined);
      expect(result).toBeNull();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should return null for empty auth UID', async () => {
      const result = await imageService.getAuthenticatedUser('');
      expect(result).toBeNull();
    });
  });

  describe('getImagesBySet', () => {
    it('should get images by set ID', async () => {
      const mockImages = [
        { id: 'image-1', set_id: 'set-id' },
        { id: 'image-2', set_id: 'set-id' },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockImages,
        error: null,
      });

      await imageService.getImagesBySet('set-id');

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

      await expect(imageService.getImagesBySet('set-id')).rejects.toThrow(
        'Failed to get images by set: Database error'
      );
    });
  });

  describe('getImagesByTarget', () => {
    it('should get images by target type and ID', async () => {
      const mockImages = [
        { id: 'image-1', target_type: 'chapter', target_id: 'chapter-id' },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockImages,
        error: null,
      });

      await imageService.getImagesByTarget('chapter', 'chapter-id');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'target_type',
        'chapter'
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'target_id',
        'chapter-id'
      );
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  describe('deleteImage', () => {
    it('should soft delete image', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await imageService.deleteImage('image-id');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'image-id');
    });

    it('should verify ownership before deletion', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      await imageService.deleteImage('image-id', 'auth-uid');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('images');
    });

    it('should throw error if user does not own image', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'other-user-id' },
          error: null,
        });

      await expect(
        imageService.deleteImage('image-id', 'auth-uid')
      ).rejects.toThrow('Not authorized to delete this image');
    });

    it('should throw error on deletion failure', async () => {
      // For deleteImage, the chain ends with .eq(), so we need to mock eq to return a promise
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabaseClient.eq = mockEq;

      await expect(imageService.deleteImage('image-id')).rejects.toThrow(
        'Failed to delete image: Database error'
      );
    });
  });

  describe('updateImageSet', () => {
    it('should update image set', async () => {
      const updates = { name: 'Updated Set Name' };
      const mockResult = { id: 'set-id', name: 'Updated Set Name' };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await imageService.updateImageSet('set-id', updates);

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String),
      });
      expect(result).toEqual(mockResult);
    });

    it('should verify ownership before update', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'set-id' },
          error: null,
        });

      await imageService.updateImageSet(
        'set-id',
        { name: 'New Name' },
        'auth-uid'
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('image_sets');
    });

    it('should throw error if user does not own set', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'other-user-id' },
          error: null,
        });

      await expect(
        imageService.updateImageSet('set-id', { name: 'New Name' }, 'auth-uid')
      ).rejects.toThrow('Not authorized to update this image set');
    });
  });

  describe('userOwnsImageSet', () => {
    it('should return true if user owns image set', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'user-id' },
          error: null,
        });

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(true);
    });

    it('should return false if user does not own image set', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'other-user-id' },
          error: null,
        });

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await imageService.userOwnsImageSet('set-id', 'auth-uid');
      expect(result).toBe(false);
    });
  });

  describe('userOwnsImage', () => {
    it('should return true if user owns image', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'user-id' },
          error: null,
        });

      const result = await imageService.userOwnsImage('image-id', 'auth-uid');
      expect(result).toBe(true);
    });

    it('should return false if user does not own image', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'user-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_by: 'other-user-id' },
          error: null,
        });

      const result = await imageService.userOwnsImage('image-id', 'auth-uid');
      expect(result).toBe(false);
    });
  });
});
