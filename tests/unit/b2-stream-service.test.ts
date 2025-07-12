import { B2StreamService } from '../../supabase/functions/_shared/b2-stream-service';
import { B2AuthService } from '../../supabase/functions/_shared/b2-auth-service';

// Mock the B2AuthService
jest.mock('../../supabase/functions/_shared/b2-auth-service');

// Mock globalThis.fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('B2StreamService', () => {
  let streamService: B2StreamService;
  let mockAuthService: jest.Mocked<B2AuthService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock auth service
    mockAuthService = {
      authenticate: jest.fn(),
      getUploadUrl: jest.fn(),
      generateDownloadUrl: jest.fn(),
      getPublicDownloadUrl: jest.fn(),
      getConfig: jest.fn(),
    } as any;

    (
      B2AuthService as jest.MockedClass<typeof B2AuthService>
    ).mockImplementation(() => mockAuthService);

    streamService = new B2StreamService();
  });

  describe('streamFile', () => {
    it('should stream file successfully', async () => {
      const mockResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamService.streamFile('test-file.mp3');

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
    });

    it('should handle stream failure', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(streamService.streamFile('test-file.mp3')).rejects.toThrow(
        'Stream failed: 404 Not Found'
      );
    });
  });

  describe('streamFileFromPrivateBucket', () => {
    it('should stream file from private bucket successfully', async () => {
      const mockResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(
        'https://download.example.com/file/test-bucket/test-file.mp3?Authorization=temp-token'
      );
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result =
        await streamService.streamFileFromPrivateBucket('test-file.mp3');

      expect(result).toBe(mockResponse);
      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.mp3',
        3600
      );
    });
  });

  describe('streamFileWithRange', () => {
    it('should stream file with range successfully', async () => {
      const mockResponse = new Response('partial data', {
        status: 206,
        headers: {
          'content-type': 'audio/mpeg',
          'content-range': 'bytes 0-999/2000',
        },
      });

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamService.streamFileWithRange(
        'test-file.mp3',
        0,
        999
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://download.example.com/file/test-bucket/test-file.mp3',
        expect.objectContaining({
          headers: expect.objectContaining({
            Range: 'bytes=0-999',
          }),
        })
      );
      expect(result.status).toBe(206);
    });

    it('should handle range request for private bucket', async () => {
      const mockResponse = new Response('partial data', {
        status: 206,
        headers: {
          'content-type': 'audio/mpeg',
          'content-range': 'bytes 0-999/2000',
        },
      });

      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(
        'https://download.example.com/file/test-bucket/test-file.mp3?Authorization=temp-token'
      );
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamService.streamFileWithRange(
        'test-file.mp3',
        0,
        999,
        true
      );

      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.mp3',
        3600
      );
      expect(result.status).toBe(206);
    });
  });

  describe('streamFileWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamService.streamFileWithRetry(
        'test-file.mp3',
        3
      );

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFailureResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      const mockSuccessResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch
        .mockResolvedValueOnce(mockFailureResponse)
        .mockResolvedValueOnce(mockFailureResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await streamService.streamFileWithRetry(
        'test-file.mp3',
        3
      );

      expect(result).toBe(mockSuccessResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockFailureResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValue(mockFailureResponse);

      await expect(
        streamService.streamFileWithRetry('test-file.mp3', 2)
      ).rejects.toThrow('Stream failed after 2 retries');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('createStreamingResponse', () => {
    it('should create stream response with correct headers', () => {
      const mockSourceResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      const result = streamService.createStreamingResponse(
        mockSourceResponse,
        'test-file.mp3'
      );

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(result.headers.get('Accept-Ranges')).toBe('bytes');
      expect(result.headers.get('Cache-Control')).toBe('private, max-age=3600');
      expect(result.headers.get('Content-Disposition')).toBe(
        'attachment; filename="test-file.mp3"'
      );
    });

    it('should create inline stream response', () => {
      const mockSourceResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      const result = streamService.createStreamingResponse(
        mockSourceResponse,
        'test-file.mp3',
        true
      );

      expect(result.headers.get('Content-Disposition')).toBe(
        'inline; filename="test-file.mp3"'
      );
    });

    it('should handle missing content-type', () => {
      const mockSourceResponse = new Response('test data', {
        status: 200,
        headers: {},
      });

      const result = streamService.createStreamingResponse(
        mockSourceResponse,
        'test-file.mp3'
      );

      // Should infer content-type from filename extension
      expect(result.headers.get('Content-Type')).toBe('audio/mpeg');
    });

    it('should return default content-type when no filename provided', () => {
      const mockSourceResponse = new Response('test data', {
        status: 200,
        headers: {},
      });

      const result = streamService.createStreamingResponse(mockSourceResponse);

      expect(result.headers.get('Content-Type')).toBe(
        'application/octet-stream'
      );
    });

    it('should handle missing filename', () => {
      const mockSourceResponse = new Response('test data', {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });

      const result = streamService.createStreamingResponse(mockSourceResponse);

      expect(result.headers.has('Content-Disposition')).toBe(false);
    });
  });

  describe('supportsRangeRequests', () => {
    it('should return true when server supports range requests', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'accept-ranges': 'bytes',
        }),
      });

      const result = await streamService.supportsRangeRequests('test-file.mp3');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://download.example.com/file/test-bucket/test-file.mp3',
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });

    it('should return false when server does not support range requests', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
      });

      const result = await streamService.supportsRangeRequests('test-file.mp3');

      expect(result).toBe(false);
    });

    it('should return false on HEAD request failure', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await streamService.supportsRangeRequests('test-file.mp3');

      expect(result).toBe(false);
    });

    it('should check range support for private bucket', async () => {
      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(
        'https://download.example.com/file/test-bucket/test-file.mp3?Authorization=temp-token'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'accept-ranges': 'bytes',
        }),
      });

      const result = await streamService.supportsRangeRequests(
        'test-file.mp3',
        true
      );

      expect(result).toBe(true);
      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.mp3',
        3600
      );
    });
  });

  describe('getStreamFileSize', () => {
    it('should get file size successfully', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-length': '1024',
        }),
      });

      const result = await streamService.getStreamFileSize('test-file.mp3');

      expect(result).toBe(1024);
    });

    it('should return null when content-length is missing', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
      });

      const result = await streamService.getStreamFileSize('test-file.mp3');

      expect(result).toBeNull();
    });

    it('should return null on HEAD request failure', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.mp3'
      );
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await streamService.getStreamFileSize('test-file.mp3');

      expect(result).toBeNull();
    });

    it('should get file size for private bucket', async () => {
      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(
        'https://download.example.com/file/test-bucket/test-file.mp3?Authorization=temp-token'
      );
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-length': '2048',
        }),
      });

      const result = await streamService.getStreamFileSize(
        'test-file.mp3',
        true
      );

      expect(result).toBe(2048);
      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.mp3',
        3600
      );
    });
  });
});
