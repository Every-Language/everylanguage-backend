import { B2StorageService } from '../../supabase/functions/_shared/b2-storage-service';
import { B2AuthService } from '../../supabase/functions/_shared/b2-auth-service';
import { B2FileService } from '../../supabase/functions/_shared/b2-file-service';
import { B2StreamService } from '../../supabase/functions/_shared/b2-stream-service';

// Mock the dependencies
jest.mock('../../supabase/functions/_shared/b2-auth-service');
jest.mock('../../supabase/functions/_shared/b2-file-service');
jest.mock('../../supabase/functions/_shared/b2-stream-service');

describe('B2StorageService', () => {
  let storageService: B2StorageService;
  let mockAuthService: jest.Mocked<B2AuthService>;
  let mockFileService: jest.Mocked<B2FileService>;
  let mockStreamService: jest.Mocked<B2StreamService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock services
    mockAuthService = {
      authenticate: jest.fn(),
      getUploadUrl: jest.fn(),
      generateDownloadUrl: jest.fn(),
      getPublicDownloadUrl: jest.fn(),
      getConfig: jest.fn(),
    } as any;

    mockFileService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      downloadFile: jest.fn(),
      downloadFileFromPrivateBucket: jest.fn(),
      getFileInfo: jest.fn(),
      uploadMultipleFiles: jest.fn(),
    } as any;

    mockStreamService = {
      streamFile: jest.fn(),
      streamFileFromPrivateBucket: jest.fn(),
      streamFileWithRange: jest.fn(),
      streamFileWithRetry: jest.fn(),
      createStreamResponse: jest.fn(),
      createStreamingResponse: jest.fn(),
      supportsRangeRequests: jest.fn(),
      getStreamFileSize: jest.fn(),
    } as any;

    (
      B2AuthService as jest.MockedClass<typeof B2AuthService>
    ).mockImplementation(() => mockAuthService);
    (
      B2FileService as jest.MockedClass<typeof B2FileService>
    ).mockImplementation(() => mockFileService);
    (
      B2StreamService as jest.MockedClass<typeof B2StreamService>
    ).mockImplementation(() => mockStreamService);

    storageService = new B2StorageService();
  });

  describe('constructor', () => {
    it('should initialize all services', () => {
      expect(B2AuthService).toHaveBeenCalled();
      expect(B2FileService).toHaveBeenCalled();
      expect(B2StreamService).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should delegate to file service', async () => {
      const mockFileData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockMetadata = { author: 'John Doe' };
      const expectedResult = {
        fileId: 'test-file-id',
        fileName: 'test-file.jpg',
        downloadUrl: 'https://download.example.com/test-file.jpg',
        fileSize: 5,
      };

      mockFileService.uploadFile.mockResolvedValueOnce(expectedResult);

      const result = await storageService.uploadFile(
        mockFileData,
        'test-file.jpg',
        'image/jpeg',
        mockMetadata
      );

      expect(result).toEqual(expectedResult);
      expect(mockFileService.uploadFile).toHaveBeenCalledWith(
        mockFileData,
        'test-file.jpg',
        'image/jpeg',
        mockMetadata
      );
    });
  });

  describe('deleteFile', () => {
    it('should delegate to file service', async () => {
      await storageService.deleteFile('test-file-id', 'test-file.jpg');

      expect(mockFileService.deleteFile).toHaveBeenCalledWith(
        'test-file-id',
        'test-file.jpg'
      );
    });
  });

  describe('downloadFile', () => {
    it('should delegate to file service', async () => {
      const expectedResult = {
        data: new Uint8Array([1, 2, 3]),
        contentType: 'image/jpeg',
        contentLength: 3,
      };

      mockFileService.downloadFile.mockResolvedValueOnce(expectedResult);

      const result = await storageService.downloadFile('test-file.jpg');

      expect(result).toEqual(expectedResult);
      expect(mockFileService.downloadFile).toHaveBeenCalledWith(
        'test-file.jpg'
      );
    });
  });

  describe('downloadFileFromPrivateBucket', () => {
    it('should delegate to file service', async () => {
      const expectedResult = {
        data: new Uint8Array([1, 2, 3]),
        contentType: 'image/jpeg',
        contentLength: 3,
      };

      mockFileService.downloadFileFromPrivateBucket.mockResolvedValueOnce(
        expectedResult
      );

      const result =
        await storageService.downloadFileFromPrivateBucket('test-file.jpg');

      expect(result).toEqual(expectedResult);
      expect(
        mockFileService.downloadFileFromPrivateBucket
      ).toHaveBeenCalledWith('test-file.jpg');
    });
  });

  describe('generateDownloadUrl', () => {
    it('should delegate to auth service', async () => {
      const expectedUrl =
        'https://download.example.com/test-file.jpg?Authorization=temp-token';
      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(expectedUrl);

      const result = await storageService.generateDownloadUrl(
        'test-file.jpg',
        7200
      );

      expect(result).toBe(expectedUrl);
      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.jpg',
        7200
      );
    });

    it('should use default expiration time', async () => {
      const expectedUrl =
        'https://download.example.com/test-file.jpg?Authorization=temp-token';
      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(expectedUrl);

      await storageService.generateDownloadUrl('test-file.jpg');

      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.jpg',
        3600
      );
    });
  });

  describe('getPublicDownloadUrl', () => {
    it('should delegate to auth service', async () => {
      const expectedUrl = 'https://download.example.com/test-file.jpg';
      mockAuthService.getPublicDownloadUrl.mockReturnValueOnce(expectedUrl);

      const result = await storageService.getPublicDownloadUrl('test-file.jpg');

      expect(result).toBe(expectedUrl);
      expect(mockAuthService.getPublicDownloadUrl).toHaveBeenCalledWith(
        'test-file.jpg'
      );
    });
  });

  describe('streamFile', () => {
    it('should delegate to stream service', async () => {
      const mockResponse = new Response('test data');
      mockStreamService.streamFile.mockResolvedValueOnce(mockResponse);

      const result = await storageService.streamFile('test-file.mp3');

      expect(result).toBe(mockResponse);
      expect(mockStreamService.streamFile).toHaveBeenCalledWith(
        'test-file.mp3'
      );
    });
  });

  describe('streamFileFromPrivateBucket', () => {
    it('should delegate to stream service', async () => {
      const mockResponse = new Response('test data');
      mockStreamService.streamFileFromPrivateBucket.mockResolvedValueOnce(
        mockResponse
      );

      const result =
        await storageService.streamFileFromPrivateBucket('test-file.mp3');

      expect(result).toBe(mockResponse);
      expect(
        mockStreamService.streamFileFromPrivateBucket
      ).toHaveBeenCalledWith('test-file.mp3');
    });
  });

  describe('streamFileWithRange', () => {
    it('should delegate to stream service', async () => {
      const mockResponse = new Response('partial data');
      mockStreamService.streamFileWithRange.mockResolvedValueOnce(mockResponse);

      const result = await storageService.streamFileWithRange(
        'test-file.mp3',
        0,
        999,
        false
      );

      expect(result).toBe(mockResponse);
      expect(mockStreamService.streamFileWithRange).toHaveBeenCalledWith(
        'test-file.mp3',
        0,
        999,
        false
      );
    });

    it('should use default isPrivate value', async () => {
      const mockResponse = new Response('partial data');
      mockStreamService.streamFileWithRange.mockResolvedValueOnce(mockResponse);

      await storageService.streamFileWithRange('test-file.mp3', 0, 999);

      expect(mockStreamService.streamFileWithRange).toHaveBeenCalledWith(
        'test-file.mp3',
        0,
        999,
        false
      );
    });
  });

  describe('streamFileWithRetry', () => {
    it('should delegate to stream service', async () => {
      const mockResponse = new Response('test data');
      mockStreamService.streamFileWithRetry.mockResolvedValueOnce(mockResponse);

      const result = await storageService.streamFileWithRetry(
        'test-file.mp3',
        3,
        false
      );

      expect(result).toBe(mockResponse);
      expect(mockStreamService.streamFileWithRetry).toHaveBeenCalledWith(
        'test-file.mp3',
        3,
        false
      );
    });

    it('should use default values', async () => {
      const mockResponse = new Response('test data');
      mockStreamService.streamFileWithRetry.mockResolvedValueOnce(mockResponse);

      await storageService.streamFileWithRetry('test-file.mp3');

      expect(mockStreamService.streamFileWithRetry).toHaveBeenCalledWith(
        'test-file.mp3',
        3,
        false
      );
    });
  });

  describe('getFileInfo', () => {
    it('should delegate to file service', async () => {
      const expectedResult = {
        fileId: 'test-file-id',
        fileName: 'test-file.jpg',
        contentType: 'image/jpeg',
        contentLength: 1024,
        uploadTimestamp: 1234567890,
      };

      mockFileService.getFileInfo.mockResolvedValueOnce(expectedResult);

      const result = await storageService.getFileInfo('test-file.jpg');

      expect(result).toEqual(expectedResult);
      expect(mockFileService.getFileInfo).toHaveBeenCalledWith('test-file.jpg');
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should delegate to file service', async () => {
      const mockFiles = [
        {
          data: new Uint8Array([1, 2, 3]),
          name: 'file1.jpg',
          contentType: 'image/jpeg',
          metadata: { author: 'John' },
        },
        {
          data: new Uint8Array([4, 5, 6]),
          name: 'file2.jpg',
          contentType: 'image/jpeg',
          metadata: { author: 'Jane' },
        },
      ];

      const expectedResult = [
        {
          fileId: 'file-id-1',
          fileName: 'file1.jpg',
          downloadUrl: 'https://download.example.com/file1.jpg',
          fileSize: 3,
        },
        {
          fileId: 'file-id-2',
          fileName: 'file2.jpg',
          downloadUrl: 'https://download.example.com/file2.jpg',
          fileSize: 3,
        },
      ];

      mockFileService.uploadMultipleFiles.mockResolvedValueOnce(expectedResult);

      const result = await storageService.uploadMultipleFiles(mockFiles);

      expect(result).toEqual(expectedResult);
      expect(mockFileService.uploadMultipleFiles).toHaveBeenCalledWith(
        mockFiles
      );
    });
  });

  describe('supportsRangeRequests', () => {
    it('should delegate to stream service', async () => {
      mockStreamService.supportsRangeRequests.mockResolvedValueOnce(true);

      const result = await storageService.supportsRangeRequests(
        'test-file.mp3',
        false
      );

      expect(result).toBe(true);
      expect(mockStreamService.supportsRangeRequests).toHaveBeenCalledWith(
        'test-file.mp3',
        false
      );
    });

    it('should use default isPrivate value', async () => {
      mockStreamService.supportsRangeRequests.mockResolvedValueOnce(true);

      await storageService.supportsRangeRequests('test-file.mp3');

      expect(mockStreamService.supportsRangeRequests).toHaveBeenCalledWith(
        'test-file.mp3',
        false
      );
    });
  });

  describe('getStreamFileSize', () => {
    it('should delegate to stream service', async () => {
      mockStreamService.getStreamFileSize.mockResolvedValueOnce(1024);

      const result = await storageService.getStreamFileSize(
        'test-file.mp3',
        false
      );

      expect(result).toBe(1024);
      expect(mockStreamService.getStreamFileSize).toHaveBeenCalledWith(
        'test-file.mp3',
        false
      );
    });

    it('should use default isPrivate value', async () => {
      mockStreamService.getStreamFileSize.mockResolvedValueOnce(1024);

      await storageService.getStreamFileSize('test-file.mp3');

      expect(mockStreamService.getStreamFileSize).toHaveBeenCalledWith(
        'test-file.mp3',
        false
      );
    });
  });

  describe('createStreamResponse', () => {
    it('should delegate to stream service', () => {
      const mockSourceResponse = new Response('test data');
      const mockStreamResponse = new Response('test data', {
        headers: {
          'Content-Disposition': 'attachment; filename="test-file.mp3"',
        },
      });

      jest
        .spyOn(mockStreamService, 'createStreamingResponse')
        .mockReturnValue(mockStreamResponse);

      const result = storageService.createStreamResponse(
        mockSourceResponse,
        'test-file.mp3',
        false
      );

      expect(result).toBe(mockStreamResponse);
      expect(mockStreamService.createStreamingResponse).toHaveBeenCalledWith(
        mockSourceResponse,
        'test-file.mp3',
        false
      );
    });

    it('should use default inline value', () => {
      const mockSourceResponse = new Response('test data');
      const mockStreamResponse = new Response('test data');

      jest
        .spyOn(mockStreamService, 'createStreamingResponse')
        .mockReturnValue(mockStreamResponse);

      const result = storageService.createStreamResponse(
        mockSourceResponse,
        'test-file.mp3'
      );

      expect(result).toBe(mockStreamResponse);
      expect(mockStreamService.createStreamingResponse).toHaveBeenCalledWith(
        mockSourceResponse,
        'test-file.mp3',
        false
      );
    });
  });
});
