import { B2Utils } from '../../supabase/functions/_shared/b2-utils';

// Mock globalThis.crypto
const mockCrypto = {
  subtle: {
    digest: jest.fn(),
  },
};
global.crypto = mockCrypto as any;

describe('B2Utils', () => {
  describe('calculateSha1', () => {
    it('should calculate SHA1 hash correctly', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockHashBuffer = new ArrayBuffer(20);
      const mockHashArray = new Uint8Array(mockHashBuffer);
      // Fill with a pattern that will create the expected hex string
      for (let i = 0; i < 20; i++) {
        mockHashArray[i] =
          i < 8 ? [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef][i] : 0;
      }

      mockCrypto.subtle.digest.mockResolvedValueOnce(mockHashBuffer);

      const result = await B2Utils.calculateSha1(testData);

      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-1', testData);
      expect(result).toBe('0123456789abcdef000000000000000000000000');
    });

    it('should handle empty data', async () => {
      const testData = new Uint8Array([]);
      const mockHashBuffer = new ArrayBuffer(20);
      // ArrayBuffer is initialized with zeros by default

      mockCrypto.subtle.digest.mockResolvedValueOnce(mockHashBuffer);

      const result = await B2Utils.calculateSha1(testData);

      expect(result).toBe('0000000000000000000000000000000000000000');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize basic problematic characters', () => {
      const fileName = 'file%name/with\\dangerous|chars<test>.txt';
      const result = B2Utils.sanitizeFileName(fileName);

      expect(result).toBe('filepercentname-with-dangerous-charslttestgt.txt');
    });

    it('should handle unicode characters', () => {
      const fileName = 'file with émojis 🎵🎶.txt';
      const result = B2Utils.sanitizeFileName(fileName);

      expect(result).toBe('file with émojis 🎵🎶.txt');
    });

    it('should handle empty string', () => {
      const result = B2Utils.sanitizeFileName('');
      expect(result).toBe('');
    });

    it('should handle only problematic characters', () => {
      const fileName = '%/<>|\\';
      const result = B2Utils.sanitizeFileName(fileName);

      expect(result).toBe('percent-ltgt--');
    });
  });

  describe('generateUniqueFileName', () => {
    it('should generate unique filename with timestamp', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890123);

      const fileName = 'test-file.jpg';
      const result = B2Utils.generateUniqueFileName(fileName);

      expect(result).toBe('1234567890123-test-file.jpg');

      Date.now = originalNow;
    });

    it('should sanitize filename in unique generation', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890123);

      const fileName = 'test%file/with\\problems.jpg';
      const result = B2Utils.generateUniqueFileName(fileName);

      expect(result).toBe('1234567890123-testpercentfile-with-problems.jpg');

      Date.now = originalNow;
    });
  });

  describe('convertToB2FileInfo', () => {
    it('should convert metadata to B2 file info headers', () => {
      const metadata = {
        'Content-Type': 'audio/mp3',
        'Custom-Header': 'custom-value',
        author: 'John Doe',
        'track-number': '1',
      };

      const result = B2Utils.convertToB2FileInfo(metadata);

      expect(result).toEqual({
        'X-Bz-Info-Content-Type': 'audio/mp3',
        'X-Bz-Info-Custom-Header': 'custom-value',
        'X-Bz-Info-author': 'John Doe',
        'X-Bz-Info-track-number': '1',
      });
    });

    it('should handle empty metadata', () => {
      const result = B2Utils.convertToB2FileInfo({});
      expect(result).toEqual({});
    });

    it('should sanitize header names', () => {
      const metadata = {
        'header with spaces': 'value',
        'header@with!special#chars': 'value',
      };

      const result = B2Utils.convertToB2FileInfo(metadata);

      expect(result).toEqual({
        'X-Bz-Info-header-with-spaces': 'value',
        'X-Bz-Info-header-with-special-chars': 'value',
      });
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME type for audio extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('mp3')).toBe('audio/mpeg');
      expect(B2Utils.getMimeTypeFromExtension('m4a')).toBe('audio/m4a');
      expect(B2Utils.getMimeTypeFromExtension('wav')).toBe('audio/wav');
      expect(B2Utils.getMimeTypeFromExtension('aac')).toBe('audio/aac');
      expect(B2Utils.getMimeTypeFromExtension('ogg')).toBe('audio/ogg');
    });

    it('should return correct MIME type for video extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('mp4')).toBe('video/mp4');
      expect(B2Utils.getMimeTypeFromExtension('webm')).toBe('video/webm');
      expect(B2Utils.getMimeTypeFromExtension('mov')).toBe('video/quicktime');
      expect(B2Utils.getMimeTypeFromExtension('avi')).toBe('video/x-msvideo');
    });

    it('should return correct MIME type for image extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
      expect(B2Utils.getMimeTypeFromExtension('jpeg')).toBe('image/jpeg');
      expect(B2Utils.getMimeTypeFromExtension('png')).toBe('image/png');
      expect(B2Utils.getMimeTypeFromExtension('gif')).toBe('image/gif');
      expect(B2Utils.getMimeTypeFromExtension('webp')).toBe('image/webp');
    });

    it('should return correct MIME type for document extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('pdf')).toBe('application/pdf');
      expect(B2Utils.getMimeTypeFromExtension('txt')).toBe('text/plain');
      expect(B2Utils.getMimeTypeFromExtension('json')).toBe('application/json');
    });

    it('should handle case insensitive extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('MP3')).toBe('audio/mpeg');
      expect(B2Utils.getMimeTypeFromExtension('JPG')).toBe('image/jpeg');
      expect(B2Utils.getMimeTypeFromExtension('PDF')).toBe('application/pdf');
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(B2Utils.getMimeTypeFromExtension('unknown')).toBe(
        'application/octet-stream'
      );
      expect(B2Utils.getMimeTypeFromExtension('')).toBe(
        'application/octet-stream'
      );
    });
  });

  describe('getContentDisposition', () => {
    it('should return attachment disposition by default', () => {
      const result = B2Utils.getContentDisposition('test-file.jpg');
      expect(result).toBe('attachment; filename="test-file.jpg"');
    });

    it('should return inline disposition when specified', () => {
      const result = B2Utils.getContentDisposition('test-file.jpg', true);
      expect(result).toBe('inline; filename="test-file.jpg"');
    });

    it('should sanitize filename in content disposition', () => {
      const result = B2Utils.getContentDisposition(
        'test%file/with\\problems.jpg'
      );
      expect(result).toBe(
        'attachment; filename="testpercentfile-with-problems.jpg"'
      );
    });

    it('should handle empty filename', () => {
      const result = B2Utils.getContentDisposition('');
      expect(result).toBe('attachment; filename=""');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(B2Utils.getFileExtension('test.mp3')).toBe('mp3');
      expect(B2Utils.getFileExtension('test.m4a')).toBe('m4a');
      expect(B2Utils.getFileExtension('test.jpg')).toBe('jpg');
      expect(B2Utils.getFileExtension('test.pdf')).toBe('pdf');
    });

    it('should handle files with multiple dots', () => {
      expect(B2Utils.getFileExtension('test.backup.jpg')).toBe('jpg');
      expect(B2Utils.getFileExtension('file.name.with.dots.pdf')).toBe('pdf');
    });

    it('should handle files without extension', () => {
      expect(B2Utils.getFileExtension('test')).toBe('');
      expect(B2Utils.getFileExtension('noextension')).toBe('');
    });

    it('should handle empty string', () => {
      expect(B2Utils.getFileExtension('')).toBe('');
    });
  });

  describe('validateFileSize', () => {
    it('should validate file size correctly', () => {
      expect(B2Utils.validateFileSize(1024, 2048)).toBe(true);
      expect(B2Utils.validateFileSize(2048, 2048)).toBe(true);
      expect(B2Utils.validateFileSize(1, 1000)).toBe(true);
    });

    it('should reject files that are too large', () => {
      expect(B2Utils.validateFileSize(2049, 2048)).toBe(false);
      expect(B2Utils.validateFileSize(1000, 500)).toBe(false);
    });

    it('should reject files with zero or negative size', () => {
      expect(B2Utils.validateFileSize(0, 1000)).toBe(false);
      expect(B2Utils.validateFileSize(-1, 1000)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(B2Utils.formatFileSize(0)).toBe('0 Bytes');
      expect(B2Utils.formatFileSize(1024)).toBe('1 KB');
      expect(B2Utils.formatFileSize(1048576)).toBe('1 MB');
      expect(B2Utils.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(B2Utils.formatFileSize(1536)).toBe('1.5 KB');
      expect(B2Utils.formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should handle small values', () => {
      expect(B2Utils.formatFileSize(512)).toBe('512 Bytes');
      expect(B2Utils.formatFileSize(1)).toBe('1 Bytes');
    });
  });

  describe('extractFileNameFromUrl', () => {
    it('should extract filename from B2 URL', () => {
      const url =
        'https://f005.backblazeb2.com/file/bucket-name/1234567890-filename.mp3';
      expect(B2Utils.extractFileNameFromUrl(url)).toBe(
        '1234567890-filename.mp3'
      );
    });

    it('should handle URLs with query parameters', () => {
      const url =
        'https://f005.backblazeb2.com/file/bucket-name/file.mp3?Authorization=token';
      expect(B2Utils.extractFileNameFromUrl(url)).toBe(
        'file.mp3?Authorization=token'
      );
    });

    it('should handle malformed URLs', () => {
      expect(B2Utils.extractFileNameFromUrl('invalid-url')).toBe('invalid-url');
      expect(B2Utils.extractFileNameFromUrl('')).toBe('');
    });
  });

  describe('removeTimestampPrefix', () => {
    it('should remove timestamp prefix from filename', () => {
      expect(B2Utils.removeTimestampPrefix('1234567890-filename.mp3')).toBe(
        'filename.mp3'
      );
      expect(B2Utils.removeTimestampPrefix('9876543210-test-file.jpg')).toBe(
        'test-file.jpg'
      );
    });

    it('should handle filenames without timestamp prefix', () => {
      expect(B2Utils.removeTimestampPrefix('filename.mp3')).toBe(
        'filename.mp3'
      );
      expect(B2Utils.removeTimestampPrefix('test-file.jpg')).toBe(
        'test-file.jpg'
      );
    });

    it('should handle empty string', () => {
      expect(B2Utils.removeTimestampPrefix('')).toBe('');
    });
  });
});
