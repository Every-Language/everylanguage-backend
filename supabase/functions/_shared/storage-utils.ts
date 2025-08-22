// Provider-agnostic storage utilities

export class StorageUtils {
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/%/g, 'percent')
      .replace(/\//g, '-')
      .replace(/\\/g, '-')
      .replace(/\|/g, '-')
      .replace(/</g, 'lt')
      .replace(/>/g, 'gt')
      .replace(/[\t\n\r]/g, '_');
  }

  /**
   * Generate clean object key with UUID and proper folder structure
   * @param originalFilename - Original filename to extract extension from
   * @param folder - Storage folder ('media' or 'images')
   * @returns Clean object key in format: folder/uuid.extension
   */
  static generateCleanObjectKey(
    originalFilename?: string,
    folder: 'media' | 'images' = 'media'
  ): string {
    const uuid = crypto.randomUUID();

    if (originalFilename) {
      const extension = this.extractFileExtension(originalFilename);
      return extension ? `${folder}/${uuid}.${extension}` : `${folder}/${uuid}`;
    }

    return `${folder}/${uuid}`;
  }

  /**
   * Extract file extension from filename
   * @param filename - Filename to extract extension from
   * @returns File extension (without dot) or null if none found
   */
  static extractFileExtension(filename: string): string | null {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Extract original filename and file type from legacy object key format
   * Handles format: timestamp-originalfilename.extension
   * @param objectKey - Legacy object key to parse
   * @returns Object with originalFilename and fileType
   */
  static parseLegacyObjectKey(objectKey: string): {
    originalFilename: string | null;
    fileType: string | null;
  } {
    if (!objectKey) {
      return { originalFilename: null, fileType: null };
    }

    // Check if it matches the legacy timestamp-filename.extension format
    const legacyMatch = objectKey.match(/^\d+-(.+)$/);
    if (legacyMatch) {
      const originalFilename = legacyMatch[1];
      const fileType = this.extractFileExtension(originalFilename);
      return { originalFilename, fileType };
    }

    // If not legacy format, treat whole string as filename
    const fileType = this.extractFileExtension(objectKey);
    return { originalFilename: objectKey, fileType };
  }

  /**
   * @deprecated Use generateCleanObjectKey instead
   * Legacy method for backward compatibility
   */
  static generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(originalName);
    return `${timestamp}-${sanitizedName}`;
  }

  /**
   * Extract filename from storage URL (replacement for B2Utils.extractFileNameFromUrl)
   */
  static extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      // Remove leading slash and bucket name if present
      const parts = pathname.split('/').filter(part => part.length > 0);
      return parts[parts.length - 1] || '';
    } catch (error) {
      console.error('Error:', error);
      // Fallback: try to extract filename from end of string
      const parts = url.split('/');
      return parts[parts.length - 1] || url;
    }
  }
}
