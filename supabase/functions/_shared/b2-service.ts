// B2 Configuration
const B2_CONFIG = {
  applicationKeyId: Deno.env.get('B2_APPLICATION_KEY_ID'),
  applicationKey: Deno.env.get('B2_APPLICATION_KEY'),
  bucketName: Deno.env.get('B2_BUCKET_NAME'),
  bucketId: Deno.env.get('B2_BUCKET_ID'),
  apiUrl: 'https://api.backblazeb2.com',
};

interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
}

interface B2UploadResponse {
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadTimestamp: number;
}

export class B2StorageService {
  private authToken: string | null = null;
  private apiUrl: string | null = null;
  private downloadUrl: string | null = null;

  constructor() {
    // Validate required environment variables
    if (!B2_CONFIG.applicationKeyId || !B2_CONFIG.applicationKey) {
      throw new Error('Missing B2 credentials in environment variables');
    }
    if (!B2_CONFIG.bucketName || !B2_CONFIG.bucketId) {
      throw new Error(
        'Missing B2 bucket configuration in environment variables'
      );
    }
  }

  /**
   * Authenticate with B2 API
   */
  private async authenticate(): Promise<B2AuthResponse> {
    // Return cached credentials if available
    if (this.authToken && this.apiUrl && this.downloadUrl) {
      return {
        authorizationToken: this.authToken,
        apiUrl: this.apiUrl,
        downloadUrl: this.downloadUrl,
      };
    }

    const credentials = btoa(
      `${B2_CONFIG.applicationKeyId}:${B2_CONFIG.applicationKey}`
    );

    const response = await fetch(
      `${B2_CONFIG.apiUrl}/b2api/v2/b2_authorize_account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`B2 authentication failed: ${error}`);
    }

    const data = (await response.json()) as B2AuthResponse;

    this.authToken = data.authorizationToken;
    this.apiUrl = data.apiUrl;
    this.downloadUrl = data.downloadUrl;

    return {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
    };
  }

  /**
   * Get upload URL for B2
   */
  private async getUploadUrl(): Promise<B2UploadUrlResponse> {
    const auth = await this.authenticate();

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: B2_CONFIG.bucketId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get upload URL: ${error}`);
    }

    return (await response.json()) as B2UploadUrlResponse;
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
    try {
      const uploadUrl = await this.getUploadUrl();

      // Generate unique filename to prevent conflicts
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${fileName}`;

      // Prepare file info headers
      const fileInfo: Record<string, string> = {
        'Content-Type': contentType,
        ...metadata,
      };

      // Convert file info to B2 format
      const b2FileInfo: Record<string, string> = {};
      Object.entries(fileInfo).forEach(([key, value]) => {
        b2FileInfo[`X-Bz-Info-${key.replace(/[^a-zA-Z0-9]/g, '-')}`] = value;
      });

      const response = await fetch(uploadUrl.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: uploadUrl.authorizationToken,
          'X-Bz-File-Name': uniqueFileName,
          'Content-Type': contentType,
          'X-Bz-Content-Sha1': 'unverified',
          ...b2FileInfo,
        },
        body: fileData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const uploadResult = (await response.json()) as B2UploadResponse;

      // Generate download URL
      const downloadUrl = `${this.downloadUrl}/file/${B2_CONFIG.bucketName}/${uploadResult.fileName}`;

      return {
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        downloadUrl,
        fileSize: uploadResult.fileSize,
      };
    } catch (error) {
      console.error('B2 upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from B2
   */
  async deleteFile(fileId: string, fileName: string): Promise<void> {
    try {
      const auth = await this.authenticate();

      const response = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_delete_file_version`,
        {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            fileName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Delete failed: ${error}`);
      }
    } catch (error) {
      console.error('B2 delete error:', error);
      throw error;
    }
  }

  /**
   * Generate a temporary download URL (for private buckets)
   */
  async generateDownloadUrl(
    fileName: string,
    validForSeconds: number = 3600
  ): Promise<string> {
    try {
      const auth = await this.authenticate();

      const response = await fetch(
        `${auth.apiUrl}/b2api/v2/b2_get_download_authorization`,
        {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId: B2_CONFIG.bucketId,
            fileNamePrefix: fileName,
            validDurationInSeconds: validForSeconds,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate download URL: ${error}`);
      }

      const data = (await response.json()) as { authorizationToken: string };
      return `${this.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}?Authorization=${data.authorizationToken}`;
    } catch (error) {
      console.error('B2 download URL generation error:', error);
      throw error;
    }
  }

  /**
   * Get public download URL (for public buckets)
   */
  getPublicDownloadUrl(fileName: string): string {
    return `${this.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}`;
  }
}
