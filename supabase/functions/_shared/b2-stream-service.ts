// B2 Stream Service - Handles streaming operations for large files

import { B2AuthService } from './b2-auth-service.ts';

export class B2StreamService {
  private authService: B2AuthService;

  constructor(authService?: B2AuthService) {
    this.authService = authService ?? new B2AuthService();
  }

  /**
   * Stream file from B2 (public bucket)
   */
  async streamFile(fileName: string): Promise<Response> {
    const downloadUrl = this.authService.getPublicDownloadUrl(fileName);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(
        `Stream failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * Stream file from B2 (private bucket)
   */
  async streamFileFromPrivateBucket(fileName: string): Promise<Response> {
    const downloadUrl = await this.authService.generateDownloadUrl(
      fileName,
      3600
    );

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(
        `Stream failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * Stream file with range support (for partial content)
   */
  async streamFileWithRange(
    fileName: string,
    rangeStart?: number,
    rangeEnd?: number,
    isPrivate: boolean = false
  ): Promise<Response> {
    const downloadUrl = isPrivate
      ? await this.authService.generateDownloadUrl(fileName, 3600)
      : this.authService.getPublicDownloadUrl(fileName);

    const headers: Record<string, string> = {};
    if (rangeStart !== undefined || rangeEnd !== undefined) {
      const start = rangeStart ?? 0;
      const end = rangeEnd ?? '';
      headers.Range = `bytes=${start}-${end}`;
    }

    const response = await fetch(downloadUrl, { headers });

    if (!response.ok && response.status !== 206) {
      throw new Error(
        `Stream failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  /**
   * Create a streaming response with proper headers
   */
  createStreamingResponse(
    sourceResponse: Response,
    fileName?: string,
    inline: boolean = false
  ): Response {
    // Get content type from source response or derive from filename
    let contentType = sourceResponse.headers.get('content-type');
    if (!contentType || contentType.startsWith('text/plain')) {
      // If no content-type or it's the default text/plain, try to infer from filename
      if (fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          mp3: 'audio/mpeg',
          mp4: 'video/mp4',
          webm: 'video/webm',
          jpg: 'image/jpeg',
          png: 'image/png',
          pdf: 'application/pdf',
        };
        contentType = mimeTypes[extension || ''] || 'application/octet-stream';
      } else {
        contentType = 'application/octet-stream';
      }
    }

    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    });

    // Add content length if available
    const contentLength = sourceResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Add content disposition if filename provided
    if (fileName) {
      const disposition = inline ? 'inline' : 'attachment';
      headers.set(
        'Content-Disposition',
        `${disposition}; filename="${fileName}"`
      );
    }

    // Handle range requests
    const contentRange = sourceResponse.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new Response(sourceResponse.body, {
      status: sourceResponse.status,
      headers,
    });
  }

  /**
   * Stream file with automatic retry on failure
   */
  async streamFileWithRetry(
    fileName: string,
    maxRetries: number = 3,
    isPrivate: boolean = false
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return isPrivate
          ? await this.streamFileFromPrivateBucket(fileName)
          : await this.streamFile(fileName);
      } catch {
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => globalThis.setTimeout(resolve, delay));
      }
    }

    throw new Error(`Stream failed after ${maxRetries} retries`);
  }

  /**
   * Check if file supports range requests
   */
  async supportsRangeRequests(
    fileName: string,
    isPrivate: boolean = false
  ): Promise<boolean> {
    try {
      const downloadUrl = isPrivate
        ? await this.authService.generateDownloadUrl(fileName, 3600)
        : this.authService.getPublicDownloadUrl(fileName);

      const response = await fetch(downloadUrl, { method: 'HEAD' });

      return response.headers.get('accept-ranges') === 'bytes';
    } catch {
      return false;
    }
  }

  /**
   * Get file size for streaming calculations
   */
  async getStreamFileSize(
    fileName: string,
    isPrivate: boolean = false
  ): Promise<number | null> {
    try {
      const downloadUrl = isPrivate
        ? await this.authService.generateDownloadUrl(fileName, 3600)
        : this.authService.getPublicDownloadUrl(fileName);

      const response = await fetch(downloadUrl, { method: 'HEAD' });

      if (!response.ok) {
        return null;
      }

      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch {
      return null;
    }
  }
}
