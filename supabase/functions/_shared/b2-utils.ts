// B2 Utilities - Handles hashing, sanitization, and other utility functions

export class B2Utils {
  /**
   * Calculate SHA1 hash of data
   */
  static async calculateSha1(data: Uint8Array): Promise<string> {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sanitize filename to prevent URL encoding issues
   */
  static sanitizeFileName(fileName: string): string {
    // Note: Preserving spaces, unicode characters, and other safe characters
    return fileName
      .replace(/%/g, 'percent') // Replace % to avoid URL encoding conflicts
      .replace(/\//g, '-') // Replace / to avoid path issues
      .replace(/\\/g, '-') // Replace \ to avoid path issues
      .replace(/\|/g, '-') // Replace | to avoid pipe issues
      .replace(/</g, 'lt') // Replace < to avoid HTML issues
      .replace(/>/g, 'gt'); // Replace > to avoid HTML issues
  }

  /**
   * Generate unique filename with timestamp
   */
  static generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(originalName);
    return `${timestamp}-${sanitizedName}`;
  }

  /**
   * Convert metadata to B2 file info headers
   */
  static convertToB2FileInfo(
    metadata: Record<string, string>
  ): Record<string, string> {
    const b2FileInfo: Record<string, string> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      // B2 header format: X-Bz-Info-<key>
      const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '-');
      // Preserve original values - B2 can handle spaces and most characters in header values
      b2FileInfo[`X-Bz-Info-${sanitizedKey}`] = value;
    });
    return b2FileInfo;
  }

  /**
   * Extract filename from B2 download URL
   */
  static extractFileNameFromUrl(url: string): string {
    // URL format: https://f005.backblazeb2.com/file/bucket-name/timestamp-filename.ext
    return url.split('/').pop() ?? url;
  }

  /**
   * Remove timestamp prefix from filename
   */
  static removeTimestampPrefix(fileName: string): string {
    // Remove timestamp prefix like "1234567890-filename.ext" -> "filename.ext"
    return fileName.replace(/^\d+-/, '');
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > -1 ? fileName.substring(lastDot + 1) : '';
  }

  /**
   * Get MIME type from file extension (basic mapping)
   */
  static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/m4a',
      aac: 'audio/aac',
      ogg: 'audio/ogg',

      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',

      // Documents
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',

      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[extension.toLowerCase()] ?? 'application/octet-stream';
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Generate content disposition header
   */
  static getContentDisposition(
    fileName: string,
    inline: boolean = false
  ): string {
    const disposition = inline ? 'inline' : 'attachment';
    const sanitizedName = this.sanitizeFileName(fileName);
    return `${disposition}; filename="${sanitizedName}"`;
  }
}
