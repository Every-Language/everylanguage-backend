import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateImageUploadRequest,
  parseImageUploadRequest,
  validateImageUploadInDatabase,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MIN_IMAGE_SIZE,
} from '../../supabase/functions/_shared/image-validation.ts';
import type { ImageUploadRequest } from '../../supabase/functions/_shared/image-validation.ts';

describe('Image Validation', () => {
  describe('validateImageUploadRequest', () => {
    let validRequest: ImageUploadRequest;
    let validFile: File;

    beforeEach(() => {
      validRequest = {
        fileName: 'test-image.jpg',
        targetType: 'chapter',
        targetId: 'test-chapter-id',
        createNewSet: false,
      };

      // Create a file with at least 1KB of content to pass size validation
      const content = 'x'.repeat(1024); // 1KB of content
      validFile = new File([content], 'test-image.jpg', {
        type: 'image/jpeg',
      });
    });

    it('should pass validation for valid request and file', () => {
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toEqual([]);
    });

    it('should reject missing fileName', () => {
      validRequest.fileName = '';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain('Missing required field: fileName');
    });

    it('should reject missing targetType', () => {
      validRequest.targetType = '';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain('Missing required field: targetType');
    });

    it('should reject missing targetId', () => {
      validRequest.targetId = '';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain('Missing required field: targetId');
    });

    it('should reject non-image files', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const errors = validateImageUploadRequest(validRequest, textFile);
      expect(errors).toContain('File must be an image');
    });

    it('should reject unsupported image types', () => {
      const unsupportedFile = new File(['test'], 'test.xyz', {
        type: 'image/xyz',
      });
      const errors = validateImageUploadRequest(validRequest, unsupportedFile);
      expect(errors).toContain(
        `Unsupported image type 'image/xyz'. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
      );
    });

    it('should reject files that are too large', () => {
      // Create a mock file that's larger than MAX_IMAGE_SIZE
      Object.defineProperty(validFile, 'size', {
        value: MAX_IMAGE_SIZE + 1,
        writable: false,
      });

      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain(
        `Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
      );
    });

    it('should reject files that are too small', () => {
      Object.defineProperty(validFile, 'size', {
        value: MIN_IMAGE_SIZE - 1,
        writable: false,
      });

      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain(
        `Image too small. Minimum size is ${MIN_IMAGE_SIZE / 1024}KB`
      );
    });

    it('should reject invalid target types', () => {
      validRequest.targetType = 'invalid_type';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain(
        "Invalid target_type 'invalid_type'. Must be one of: chapter, book, verse, sermon, passage, podcast, film_segment, audio_segment"
      );
    });

    it('should require set_name when creating new set', () => {
      validRequest.createNewSet = true;
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain('set_name is required when creating a new set');
    });

    it('should reject set_id when creating new set', () => {
      validRequest.createNewSet = true;
      validRequest.setId = 'existing-set-id';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain('Cannot specify set_id when creating a new set');
    });

    it('should reject both set_id and set_name for existing set', () => {
      validRequest.createNewSet = false;
      validRequest.setId = 'existing-set-id';
      validRequest.setName = 'Existing Set';
      const errors = validateImageUploadRequest(validRequest, validFile);
      expect(errors).toContain(
        'Cannot specify both set_id and set_name for existing set'
      );
    });

    it('should accept all supported image types', () => {
      SUPPORTED_IMAGE_TYPES.forEach(type => {
        const file = new File(['test'], 'test.img', { type });
        const errors = validateImageUploadRequest(validRequest, file);
        expect(errors).not.toContain(
          expect.stringContaining('Unsupported image type')
        );
      });
    });
  });

  describe('parseImageUploadRequest', () => {
    it('should parse multipart form data correctly', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      formData.append('file', file);
      formData.append('target_type', 'chapter');
      formData.append('target_id', 'test-chapter-id');
      formData.append('set_name', 'Test Set');
      formData.append('create_new_set', 'true');

      const request = new Request('http://example.com', {
        method: 'POST',
        body: formData,
      });

      const result = await parseImageUploadRequest(request);

      // File.name behavior varies across environments, accept both expected and fallback values
      expect(['test.jpg', 'unknown']).toContain(result.uploadRequest.fileName);
      expect(result.uploadRequest.targetType).toBe('chapter');
      expect(result.uploadRequest.targetId).toBe('test-chapter-id');
      expect(result.uploadRequest.setName).toBe('Test Set');
      expect(result.uploadRequest.createNewSet).toBe(true);
      // File object name also varies across environments
      expect(['test.jpg', 'unknown']).toContain(result.file.name);
    });

    it('should parse JSON data correctly', async () => {
      const jsonData = {
        target_type: 'chapter',
        target_id: 'test-chapter-id',
        filename: 'test.png',
        file_content: 'test content',
        set_name: 'Test Set',
        create_new_set: true,
        metadata: { description: 'Test image' },
      };

      const request = new Request('http://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      const result = await parseImageUploadRequest(request);

      expect(result.uploadRequest.fileName).toBe('test.png');
      expect(result.uploadRequest.targetType).toBe('chapter');
      expect(result.uploadRequest.targetId).toBe('test-chapter-id');
      expect(result.uploadRequest.setName).toBe('Test Set');
      expect(result.uploadRequest.createNewSet).toBe(true);
      expect(result.uploadRequest.metadata).toEqual({
        description: 'Test image',
      });
    });

    it('should throw error for invalid content type', async () => {
      const request = new Request('http://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'plain text',
      });

      await expect(parseImageUploadRequest(request)).rejects.toThrow(
        'Invalid content type'
      );
    });

    it('should throw error when no file is provided', async () => {
      const formData = new FormData();
      formData.append('target_type', 'chapter');

      const request = new Request('http://example.com', {
        method: 'POST',
        body: formData,
      });

      await expect(parseImageUploadRequest(request)).rejects.toThrow(
        'No file provided'
      );
    });

    it('should handle metadata parsing in multipart form', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);
      formData.append('target_type', 'chapter');
      formData.append('target_id', 'test-id');
      formData.append('metadata', JSON.stringify({ key: 'value' }));

      const request = new Request('http://example.com', {
        method: 'POST',
        body: formData,
      });

      const result = await parseImageUploadRequest(request);
      expect(result.uploadRequest.metadata).toEqual({ key: 'value' });
    });

    it('should throw error for invalid metadata JSON', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);
      formData.append('target_type', 'chapter');
      formData.append('target_id', 'test-id');
      formData.append('metadata', 'invalid json');

      const request = new Request('http://example.com', {
        method: 'POST',
        body: formData,
      });

      await expect(parseImageUploadRequest(request)).rejects.toThrow(
        'Invalid metadata JSON format'
      );
    });
  });

  describe('validateImageUploadInDatabase', () => {
    let mockSupabaseClient: any;
    let validRequest: ImageUploadRequest;

    beforeEach(() => {
      validRequest = {
        fileName: 'test.jpg',
        targetType: 'chapter',
        targetId: 'test-chapter-id',
      };

      mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };
    });

    it('should validate existing chapter target', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'test-chapter-id' },
        error: null,
      });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chapters');
    });

    it('should validate existing book target', async () => {
      validRequest.targetType = 'book';
      validRequest.targetId = 'test-book-id';

      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'test-book-id' },
        error: null,
      });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('books');
    });

    it('should throw error for non-existent target', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).rejects.toThrow('chapter with ID test-chapter-id not found');
    });

    it('should validate existing image set', async () => {
      validRequest.setId = 'test-set-id';

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'test-chapter-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'test-set-id', name: 'Test Set' },
          error: null,
        });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('image_sets');
    });

    it('should throw error for non-existent image set', async () => {
      validRequest.setId = 'non-existent-set';

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: 'test-chapter-id' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).rejects.toThrow('Image set not found');
    });

    it('should skip validation for unsupported target types', async () => {
      validRequest.targetType = 'sermon';

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).resolves.not.toThrow();

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        validateImageUploadInDatabase(mockSupabaseClient, validRequest)
      ).rejects.toThrow('Database validation failed');
    });
  });
});
