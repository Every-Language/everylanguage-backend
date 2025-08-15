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
}
