import { B2FileService } from '../../supabase/functions/_shared/b2-file-service';
import { B2AuthService } from '../../supabase/functions/_shared/b2-auth-service';

// Mock the B2AuthService
jest.mock('../../supabase/functions/_shared/b2-auth-service');

// Mock globalThis.fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('B2FileService', () => {
  let fileService: B2FileService;
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

    fileService = new B2FileService();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFileData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockMetadata = { author: 'John Doe' };

      // Mock dependencies
      mockAuthService.getUploadUrl.mockResolvedValueOnce({
        uploadUrl: 'https://upload.example.com',
        authorizationToken: 'upload-token',
      });

      mockAuthService.getConfig.mockReturnValue({
        applicationKeyId: 'test-key-id',
        applicationKey: 'test-app-key',
        bucketName: 'test-bucket',
        bucketId: 'test-bucket-id',
        apiUrl: 'https://api.backblazeb2.com',
      });

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/123456789-test-file.jpg'
      );

      // Mock fetch for upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            fileId: 'test-file-id',
            fileName: '123456789-test-file.jpg',
            contentType: 'image/jpeg',
            fileSize: 5,
            uploadTimestamp: 1234567890,
          }),
      });

      const result = await fileService.uploadFile(
        mockFileData,
        'test-file.jpg',
        'image/jpeg',
        mockMetadata
      );

      expect(result).toEqual({
        fileId: 'test-file-id',
        fileName: '123456789-test-file.jpg',
        downloadUrl:
          'https://download.example.com/file/test-bucket/123456789-test-file.jpg',
        fileSize: 5,
      });

      expect(mockAuthService.getUploadUrl).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://upload.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'upload-token',
            'Content-Type': 'image/jpeg',
            'X-Bz-Content-Sha1': expect.any(String),
            'X-Bz-File-Name': expect.stringContaining('test-file.jpg'),
            'X-Bz-Info-author': 'John Doe',
          }),
          body: mockFileData,
        })
      );
    });

    it('should handle upload failure', async () => {
      const mockFileData = new Uint8Array([1, 2, 3]);

      mockAuthService.getUploadUrl.mockResolvedValueOnce({
        uploadUrl: 'https://upload.example.com',
        authorizationToken: 'upload-token',
      });

      mockAuthService.getConfig.mockReturnValue({
        bucketName: 'test-bucket',
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Upload failed'),
      });

      await expect(
        fileService.uploadFile(mockFileData, 'test-file.jpg', 'image/jpeg')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockAuthService.authenticate.mockResolvedValueOnce({
        authorizationToken: 'auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fileService.deleteFile('test-file-id', 'test-file.jpg');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/b2api/v4/b2_delete_file_version',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'auth-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            fileId: 'test-file-id',
            fileName: 'test-file.jpg',
          }),
        })
      );
    });

    it('should handle delete failure', async () => {
      mockAuthService.authenticate.mockResolvedValueOnce({
        authorizationToken: 'auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Delete failed'),
      });

      await expect(
        fileService.deleteFile('test-file-id', 'test-file.jpg')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockData = new Uint8Array([1, 2, 3, 4, 5]);

      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.jpg'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockData.buffer),
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '5',
        }),
      });

      const result = await fileService.downloadFile('test-file.jpg');

      expect(result).toEqual({
        data: mockData,
        contentType: 'image/jpeg',
        contentLength: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://download.example.com/file/test-bucket/test-file.jpg'
      );
    });

    it('should handle download failure', async () => {
      mockAuthService.getPublicDownloadUrl.mockReturnValue(
        'https://download.example.com/file/test-bucket/test-file.jpg'
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fileService.downloadFile('test-file.jpg')).rejects.toThrow(
        'Download failed: 404 Not Found'
      );
    });
  });

  describe('downloadFileFromPrivateBucket', () => {
    it('should download file from private bucket successfully', async () => {
      const mockData = new Uint8Array([1, 2, 3, 4, 5]);

      mockAuthService.generateDownloadUrl.mockResolvedValueOnce(
        'https://download.example.com/file/test-bucket/test-file.jpg?Authorization=temp-token'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockData.buffer),
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '5',
        }),
      });

      const result =
        await fileService.downloadFileFromPrivateBucket('test-file.jpg');

      expect(result).toEqual({
        data: mockData,
        contentType: 'image/jpeg',
        contentLength: 5,
      });

      expect(mockAuthService.generateDownloadUrl).toHaveBeenCalledWith(
        'test-file.jpg',
        3600
      );
    });
  });

  describe('getFileInfo', () => {
    it('should get file info successfully', async () => {
      mockAuthService.authenticate.mockResolvedValueOnce({
        authorizationToken: 'auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      });

      mockAuthService.getConfig.mockReturnValue({
        bucketId: 'test-bucket-id',
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                fileId: 'test-file-id',
                fileName: 'test-file.jpg',
                contentType: 'image/jpeg',
                contentLength: 1024,
                uploadTimestamp: 1234567890,
              },
            ],
          }),
      });

      const result = await fileService.getFileInfo('test-file.jpg');

      expect(result).toEqual({
        fileId: 'test-file-id',
        fileName: 'test-file.jpg',
        contentType: 'image/jpeg',
        contentLength: 1024,
        uploadTimestamp: 1234567890,
      });
    });

    it('should return null when file not found', async () => {
      mockAuthService.authenticate.mockResolvedValueOnce({
        authorizationToken: 'auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      });

      mockAuthService.getConfig.mockReturnValue({
        bucketId: 'test-bucket-id',
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [],
          }),
      });

      const result = await fileService.getFileInfo('non-existent-file.jpg');

      expect(result).toBeNull();
    });

    it('should return null when file name does not match', async () => {
      mockAuthService.authenticate.mockResolvedValueOnce({
        authorizationToken: 'auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      });

      mockAuthService.getConfig.mockReturnValue({
        bucketId: 'test-bucket-id',
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                fileId: 'test-file-id',
                fileName: 'different-file.jpg',
                contentType: 'image/jpeg',
                contentLength: 1024,
                uploadTimestamp: 1234567890,
              },
            ],
          }),
      });

      const result = await fileService.getFileInfo('test-file.jpg');

      expect(result).toBeNull();
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files successfully', async () => {
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

      // Mock uploadFile method
      const uploadFileSpy = jest
        .spyOn(fileService, 'uploadFile')
        .mockResolvedValueOnce({
          fileId: 'file-id-1',
          fileName: 'file1.jpg',
          downloadUrl: 'https://download.example.com/file1.jpg',
          fileSize: 3,
        })
        .mockResolvedValueOnce({
          fileId: 'file-id-2',
          fileName: 'file2.jpg',
          downloadUrl: 'https://download.example.com/file2.jpg',
          fileSize: 3,
        });

      const result = await fileService.uploadMultipleFiles(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        fileId: 'file-id-1',
        fileName: 'file1.jpg',
        downloadUrl: 'https://download.example.com/file1.jpg',
        fileSize: 3,
      });
      expect(result[1]).toEqual({
        fileId: 'file-id-2',
        fileName: 'file2.jpg',
        downloadUrl: 'https://download.example.com/file2.jpg',
        fileSize: 3,
      });

      expect(uploadFileSpy).toHaveBeenCalledTimes(2);
      uploadFileSpy.mockRestore();
    });

    it('should handle partial failures in batch upload', async () => {
      const mockFiles = [
        {
          data: new Uint8Array([1, 2, 3]),
          name: 'file1.jpg',
          contentType: 'image/jpeg',
        },
        {
          data: new Uint8Array([4, 5, 6]),
          name: 'file2.jpg',
          contentType: 'image/jpeg',
        },
      ];

      // Mock uploadFile method with one success and one failure
      const uploadFileSpy = jest
        .spyOn(fileService, 'uploadFile')
        .mockResolvedValueOnce({
          fileId: 'file-id-1',
          fileName: 'file1.jpg',
          downloadUrl: 'https://download.example.com/file1.jpg',
          fileSize: 3,
        })
        .mockRejectedValueOnce(new Error('Upload failed'));

      await expect(fileService.uploadMultipleFiles(mockFiles)).rejects.toThrow(
        'Upload failed'
      );

      uploadFileSpy.mockRestore();
    });
  });
});
