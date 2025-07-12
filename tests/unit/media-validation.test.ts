import {
  validateUploadRequest,
  validateLanguageEntity,
  validateProject,
  validateTargetId,
  VALID_MEDIA_TYPES,
  VALID_TARGET_TYPES,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_VIDEO_TYPES,
  MAX_FILE_SIZE,
} from '../../supabase/functions/_shared/media-validation';
import type {
  MediaType,
  TargetType,
  UploadRequest,
} from '../../supabase/functions/_shared/media-validation';

// Mock File constructor for Node.js test environment
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(bits: any[], name: string, options: { type?: string } = {}) {
    this.name = name;
    this.size = bits.join('').length;
    this.type = options.type || '';
  }
} as any;

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

describe('Media Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUploadRequest', () => {
    const createMockFile = (
      _size: number = 1024,
      type: string = 'audio/mpeg'
    ) => {
      return new File(['test content'], 'test.mp3', { type });
    };

    const createValidRequest = (): UploadRequest => ({
      fileName: 'test.mp3',
      mediaType: 'audio' as MediaType,
      languageEntityId: 'test-id',
      projectId: 'project-id',
      targetType: 'chapter' as TargetType,
      targetId: 'target-id',
      isBibleAudio: false,
    });

    it('should pass validation with valid input', () => {
      const request = createValidRequest();
      const file = createMockFile();

      const errors = validateUploadRequest(request, file);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required fields', () => {
      const request = {
        ...createValidRequest(),
        fileName: '',
        languageEntityId: '',
      };
      const file = createMockFile();

      const errors = validateUploadRequest(request, file);

      expect(errors).toContain(
        'Missing required fields: fileName, languageEntityId'
      );
    });

    it('should fail validation with invalid media type', () => {
      const request = {
        ...createValidRequest(),
        mediaType: 'invalid' as MediaType,
      };
      const file = createMockFile();

      const errors = validateUploadRequest(request, file);

      expect(errors).toContain(
        "Invalid media type 'invalid'. Must be one of: audio, video"
      );
    });

    it('should fail validation with invalid target type', () => {
      const request = {
        ...createValidRequest(),
        targetType: 'invalid' as TargetType,
      };
      const file = createMockFile();

      const errors = validateUploadRequest(request, file);

      expect(errors).toContain(
        "Invalid target type 'invalid'. Must be one of: chapter, book, sermon, passage, verse, podcast, film_segment, audio_segment"
      );
    });

    it('should fail validation with file too large', () => {
      const request = createValidRequest();
      const largeFile = new File(['test content'.repeat(1000000)], 'test.mp3', {
        type: 'audio/mpeg',
      });
      Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE + 1 });

      const errors = validateUploadRequest(request, largeFile);

      expect(errors).toContain(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    });

    it('should fail validation with unsupported file type', () => {
      const request = createValidRequest();
      const file = createMockFile(1024, 'text/plain');

      const errors = validateUploadRequest(request, file);

      expect(errors).toContain(
        "Unsupported file type 'text/plain' for audio. Supported types: audio/mpeg, audio/wav, audio/m4a, audio/x-m4a, audio/aac, audio/ogg, audio/webm"
      );
    });

    it('should validate video files correctly', () => {
      const request = {
        ...createValidRequest(),
        mediaType: 'video' as MediaType,
      };
      const file = createMockFile(1024, 'video/mp4');

      const errors = validateUploadRequest(request, file);

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateLanguageEntity', () => {
    it('should return language entity when found', async () => {
      const mockData = {
        id: 'test-id',
        name: 'Test Language',
        level: 'language',
      };
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: mockData, error: null });

      const result = await validateLanguageEntity(
        mockSupabaseClient,
        'test-id'
      );

      expect(result).toEqual(mockData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('language_entities');
    });

    it('should throw error when language entity not found', async () => {
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(
        validateLanguageEntity(mockSupabaseClient, 'test-id')
      ).rejects.toThrow('Language entity not found or has been deleted');
    });

    it('should throw error when database error occurs', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        validateLanguageEntity(mockSupabaseClient, 'test-id')
      ).rejects.toThrow('Language entity validation failed: Database error');
    });
  });

  describe('validateProject', () => {
    it('should return project when found', async () => {
      const mockData = { id: 'test-id', name: 'Test Project' };
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: mockData, error: null });

      const result = await validateProject(mockSupabaseClient, 'test-id');

      expect(result).toEqual(mockData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('projects');
    });

    it('should throw error when project not found', async () => {
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(
        validateProject(mockSupabaseClient, 'test-id')
      ).rejects.toThrow('Project not found or has been deleted');
    });
  });

  describe('validateTargetId', () => {
    it('should return target when found in chapters table', async () => {
      const mockData = { id: 'test-id' };
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: mockData, error: null });

      const result = await validateTargetId(
        mockSupabaseClient,
        'chapter',
        'test-id'
      );

      expect(result).toEqual({ ...mockData, validated: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chapters');
    });

    it('should return unvalidated for sermon type', async () => {
      const result = await validateTargetId(
        mockSupabaseClient,
        'sermon',
        'test-id'
      );

      expect(result).toEqual({ id: 'test-id', validated: false });
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should throw error when target not found', async () => {
      mockSupabaseClient
        .from()
        .single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(
        validateTargetId(mockSupabaseClient, 'chapter', 'test-id')
      ).rejects.toThrow('chapter with ID test-id not found');
    });
  });

  describe('Constants', () => {
    it('should have correct media types', () => {
      expect(VALID_MEDIA_TYPES).toEqual(['audio', 'video']);
    });

    it('should have correct target types', () => {
      expect(VALID_TARGET_TYPES).toEqual([
        'chapter',
        'book',
        'sermon',
        'passage',
        'verse',
        'podcast',
        'film_segment',
        'audio_segment',
      ]);
    });

    it('should have supported audio types', () => {
      expect(SUPPORTED_AUDIO_TYPES).toContain('audio/mpeg');
      expect(SUPPORTED_AUDIO_TYPES).toContain('audio/m4a');
    });

    it('should have supported video types', () => {
      expect(SUPPORTED_VIDEO_TYPES).toContain('video/mp4');
      expect(SUPPORTED_VIDEO_TYPES).toContain('video/webm');
    });

    it('should have reasonable max file size', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024 * 1024); // 10GB
    });
  });
});
