// B2 File Service - Handles file operations (upload, download, management)

import { B2AuthService } from './b2-auth-service.ts';
import { B2Utils } from './b2-utils.ts';

interface B2UploadResponse {
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadTimestamp: number;
}

interface B2FileInfo {
  fileId: string;
  fileName: string;
  contentType: string;
  contentLength: number;
  uploadTimestamp: number;
}

interface B2DownloadResult {
  data: Uint8Array;
  contentType: string;
  contentLength: number;
}

export class B2FileService {
  private authService: B2AuthService;

  constructor(authService?: B2AuthService) {
    this.authService = authService ?? new B2AuthService();
  }

  /**
   * Upload file to B2
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
    const uploadUrl = await this.authService.getUploadUrl();

    // Generate unique filename
    const uniqueFileName = B2Utils.generateUniqueFileName(fileName);

    // Calculate SHA1 hash
    const sha1Hash = await B2Utils.calculateSha1(fileData);

    // Prepare metadata headers
    const fileInfo = { 'Content-Type': contentType, ...metadata };
    const b2FileInfo = B2Utils.convertToB2FileInfo(fileInfo);

    // Upload file
    const response = await fetch(uploadUrl.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadUrl.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(uniqueFileName),
        'Content-Type': contentType,
        'X-Bz-Content-Sha1': sha1Hash,
        ...b2FileInfo,
      },
      body: fileData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const uploadResult = (await response.json()) as B2UploadResponse;

    return {
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      downloadUrl: this.authService.getPublicDownloadUrl(uploadResult.fileName),
      fileSize: uploadResult.fileSize,
    };
  }

  /**
   * Download file from B2 (public bucket)
   */
  async downloadFile(fileName: string): Promise<B2DownloadResult> {
    const downloadUrl = this.authService.getPublicDownloadUrl(fileName);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const contentType =
      response.headers.get('content-type') ?? 'application/octet-stream';
    const contentLength = parseInt(
      response.headers.get('content-length') ?? '0'
    );

    return { data, contentType, contentLength };
  }

  /**
   * Download file from B2 (private bucket)
   */
  async downloadFileFromPrivateBucket(
    fileName: string
  ): Promise<B2DownloadResult> {
    const downloadUrl = await this.authService.generateDownloadUrl(
      fileName,
      3600
    );

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const contentType =
      response.headers.get('content-type') ?? 'application/octet-stream';
    const contentLength = parseInt(
      response.headers.get('content-length') ?? '0'
    );

    return { data, contentType, contentLength };
  }

  /**
   * Delete file from B2
   */
  async deleteFile(fileId: string, fileName: string): Promise<void> {
    const auth = await this.authService.authenticate();

    const response = await fetch(
      `${auth.apiUrl}/b2api/v4/b2_delete_file_version`,
      {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, fileName }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Delete failed: ${error}`);
    }
  }

  /**
   * Get file info from B2
   */
  async getFileInfo(fileName: string): Promise<B2FileInfo | null> {
    const auth = await this.authService.authenticate();
    const config = this.authService.getConfig();

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: config.bucketId,
        startFileName: fileName,
        maxFileCount: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get file info: ${error}`);
    }

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      if (file.fileName === fileName) {
        return {
          fileId: file.fileId,
          fileName: file.fileName,
          contentType: file.contentType,
          contentLength: file.contentLength,
          uploadTimestamp: file.uploadTimestamp,
        };
      }
    }

    return null; // File not found
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const fileInfo = await this.getFileInfo(fileName);
      return fileInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Upload multiple files to B2
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
    const uploads = files.map(file =>
      this.uploadFile(file.data, file.name, file.contentType, file.metadata)
    );

    return Promise.all(uploads);
  }
}
