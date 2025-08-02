// B2 Storage Service - Main facade that orchestrates all B2 operations
// This maintains backward compatibility while using the focused services

import { B2AuthService } from './b2-auth-service.ts';
import { B2FileService } from './b2-file-service.ts';
import { B2StreamService } from './b2-stream-service.ts';
import { B2Utils } from './b2-utils.ts';

export class B2StorageService {
  private authService: B2AuthService;
  private fileService: B2FileService;
  private streamService: B2StreamService;

  constructor() {
    this.authService = new B2AuthService();
    this.fileService = new B2FileService(this.authService);
    this.streamService = new B2StreamService(this.authService);
  }

  // === FILE OPERATIONS ===

  /**
   * Upload file to B2 (backward compatible)
   */
  async uploadFile(
    fileData: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{
    fileId: string;
    fileName: string;
    downloadUrl: string;
    fileSize: number;
  }> {
    return this.fileService.uploadFile(
      fileData,
      fileName,
      contentType,
      metadata
    );
  }

  /**
   * Download file from B2 (backward compatible)
   */
  async downloadFile(fileName: string): Promise<{
    data: Uint8Array;
    contentType: string;
    contentLength: number;
  }> {
    return this.fileService.downloadFile(fileName);
  }

  /**
   * Download file from private bucket (backward compatible)
   */
  async downloadFileFromPrivateBucket(fileName: string): Promise<{
    data: Uint8Array;
    contentType: string;
    contentLength: number;
  }> {
    return this.fileService.downloadFileFromPrivateBucket(fileName);
  }

  /**
   * Delete file from B2 (backward compatible)
   */
  async deleteFile(fileId: string, fileName: string): Promise<void> {
    return this.fileService.deleteFile(fileId, fileName);
  }

  /**
   * Get file info from B2 (backward compatible)
   */
  async getFileInfo(fileName: string): Promise<{
    fileId: string;
    fileName: string;
    contentType: string;
    contentLength: number;
    uploadTimestamp: number;
  } | null> {
    return this.fileService.getFileInfo(fileName);
  }

  // === STREAMING OPERATIONS ===

  /**
   * Stream file from B2 (backward compatible)
   */
  async streamFile(fileName: string): Promise<Response> {
    return this.streamService.streamFile(fileName);
  }

  /**
   * Stream file from private bucket (backward compatible)
   */
  async streamFileFromPrivateBucket(fileName: string): Promise<Response> {
    return this.streamService.streamFileFromPrivateBucket(fileName);
  }

  // === URL OPERATIONS ===

  /**
   * Get upload URL for B2 bucket
   */
  async getUploadUrl(): Promise<{
    uploadUrl: string;
    authorizationToken: string;
  }> {
    return this.authService.getUploadUrl();
  }

  /**
   * Generate download URL (backward compatible)
   */
  async generateDownloadUrl(
    fileName: string,
    validForSeconds: number = 3600
  ): Promise<string> {
    return this.authService.generateDownloadUrl(fileName, validForSeconds);
  }

  /**
   * Get public download URL (backward compatible)
   */
  getPublicDownloadUrl(fileName: string): string {
    return this.authService.getPublicDownloadUrl(fileName);
  }

  // === EXTENDED OPERATIONS (New functionality) ===

  /**
   * Stream file with range support
   */
  async streamFileWithRange(
    fileName: string,
    rangeStart?: number,
    rangeEnd?: number,
    isPrivate: boolean = false
  ): Promise<Response> {
    return this.streamService.streamFileWithRange(
      fileName,
      rangeStart,
      rangeEnd,
      isPrivate
    );
  }

  /**
   * Stream file with retry logic
   */
  async streamFileWithRetry(
    fileName: string,
    maxRetries: number = 3,
    isPrivate: boolean = false
  ): Promise<Response> {
    return this.streamService.streamFileWithRetry(
      fileName,
      maxRetries,
      isPrivate
    );
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    return this.fileService.fileExists(fileName);
  }

  /**
   * Batch upload files
   */
  async uploadFiles(
    files: Array<{
      data: Uint8Array;
      name: string;
      contentType: string;
      metadata?: Record<string, string>;
    }>
  ): Promise<
    Array<{
      fileId: string;
      fileName: string;
      downloadUrl: string;
      fileSize: number;
    }>
  > {
    const uploads = files.map(file =>
      this.fileService.uploadFile(
        file.data,
        file.name,
        file.contentType,
        file.metadata
      )
    );

    return Promise.all(uploads);
  }

  /**
   * Upload multiple files (alternative method name for backward compatibility)
   */
  async uploadMultipleFiles(
    files: Array<{
      data: Uint8Array;
      name: string;
      contentType: string;
      metadata?: Record<string, string>;
    }>
  ): Promise<
    Array<{
      fileId: string;
      fileName: string;
      downloadUrl: string;
      fileSize: number;
    }>
  > {
    return this.fileService.uploadMultipleFiles(files);
  }

  /**
   * Check if server supports range requests
   */
  async supportsRangeRequests(
    fileName: string,
    isPrivate: boolean = false
  ): Promise<boolean> {
    return this.streamService.supportsRangeRequests(fileName, isPrivate);
  }

  /**
   * Get file size for streaming
   */
  async getStreamFileSize(
    fileName: string,
    isPrivate: boolean = false
  ): Promise<number | null> {
    return this.streamService.getStreamFileSize(fileName, isPrivate);
  }

  /**
   * Create streaming response
   */
  createStreamResponse(
    sourceResponse: Response,
    fileName: string,
    inline: boolean = false
  ): Response {
    return this.streamService.createStreamingResponse(
      sourceResponse,
      fileName,
      inline
    );
  }

  /**
   * Create streaming response (alternative method name for backward compatibility)
   */
  createStreamingResponse(
    sourceResponse: Response,
    fileName: string,
    inline: boolean = false
  ): Response {
    return this.streamService.createStreamingResponse(
      sourceResponse,
      fileName,
      inline
    );
  }

  /**
   * Clear authentication cache
   */
  clearAuthCache(): void {
    this.authService.clearCache();
  }

  // === UTILITY METHODS ===

  /**
   * Calculate SHA1 hash
   */
  static async calculateSha1(data: Uint8Array): Promise<string> {
    return B2Utils.calculateSha1(data);
  }

  /**
   * Sanitize filename
   */
  static sanitizeFileName(fileName: string): string {
    return B2Utils.sanitizeFileName(fileName);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    return B2Utils.formatFileSize(bytes);
  }

  /**
   * Get MIME type from extension
   */
  static getMimeTypeFromExtension(extension: string): string {
    return B2Utils.getMimeTypeFromExtension(extension);
  }
}
