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
