// B2 Authentication Service - Handles auth and token management only

interface B2Config {
  applicationKeyId: string;
  applicationKey: string;
  bucketName: string;
  bucketId: string;
  apiUrl: string;
}

interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  apiInfo?: {
    storageApi?: {
      apiUrl: string;
      downloadUrl: string;
    };
  };
}

interface B2UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
}

export class B2AuthService {
  private authToken: string | null = null;
  private apiUrl: string | null = null;
  private downloadUrl: string | null = null;
  private config: B2Config;

  constructor() {
    this.config = {
      applicationKeyId: Deno.env.get('B2_APPLICATION_KEY_ID') ?? '',
      applicationKey: Deno.env.get('B2_APPLICATION_KEY') ?? '',
      bucketName: Deno.env.get('B2_BUCKET_NAME') ?? '',
      bucketId: Deno.env.get('B2_BUCKET_ID') ?? '',
      apiUrl: 'https://api.backblazeb2.com',
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.applicationKeyId || !this.config.applicationKey) {
      throw new Error(
        `Missing B2 credentials in environment variables. KeyId: ${!!this.config.applicationKeyId}, Key: ${!!this.config.applicationKey}`
      );
    }
    if (!this.config.bucketName || !this.config.bucketId) {
      throw new Error(
        `Missing B2 bucket configuration in environment variables. BucketName: ${!!this.config.bucketName}, BucketId: ${!!this.config.bucketId}`
      );
    }

    if (
      this.config.applicationKeyId.includes(':') ||
      this.config.applicationKey.includes(':')
    ) {
      throw new Error('B2 credentials should not contain colon characters');
    }
  }

  /**
   * Authenticate with B2 API and cache credentials
   */
  async authenticate(): Promise<B2AuthResponse> {
    // Return cached credentials if available
    if (this.authToken && this.apiUrl && this.downloadUrl) {
      return {
        authorizationToken: this.authToken,
        apiUrl: this.apiUrl,
        downloadUrl: this.downloadUrl,
      };
    }

    const credentials = btoa(
      `${this.config.applicationKeyId}:${this.config.applicationKey}`
    );

    console.log(
      'B2 Auth - Making request to:',
      `${this.config.apiUrl}/b2api/v4/b2_authorize_account`
    );

    const response = await fetch(
      `${this.config.apiUrl}/b2api/v4/b2_authorize_account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`B2 authentication failed: ${error}`);
    }

    const data = (await response.json()) as B2AuthResponse;

    // Cache credentials
    this.authToken = data.authorizationToken;
    this.apiUrl = data.apiInfo?.storageApi?.apiUrl ?? data.apiUrl;
    this.downloadUrl =
      data.apiInfo?.storageApi?.downloadUrl ?? data.downloadUrl;

    return {
      authorizationToken: data.authorizationToken,
      apiUrl: this.apiUrl,
      downloadUrl: this.downloadUrl,
    };
  }

  /**
   * Get upload URL for B2 bucket
   */
  async getUploadUrl(): Promise<B2UploadUrlResponse> {
    const auth = await this.authenticate();

    const response = await fetch(`${auth.apiUrl}/b2api/v4/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: this.config.bucketId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get upload URL: ${error}`);
    }

    return (await response.json()) as B2UploadUrlResponse;
  }

  /**
   * Generate a temporary download URL for private buckets
   */
  async generateDownloadUrl(
    fileName: string,
    validForSeconds: number = 3600
  ): Promise<string> {
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
          bucketId: this.config.bucketId,
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
    return `${this.downloadUrl}/file/${this.config.bucketName}/${fileName}?Authorization=${data.authorizationToken}`;
  }

  /**
   * Get public download URL for public buckets
   */
  getPublicDownloadUrl(fileName: string): string {
    if (!this.downloadUrl) {
      throw new Error('Must authenticate first');
    }
    return `${this.downloadUrl}/file/${this.config.bucketName}/${fileName}`;
  }

  /**
   * Get configuration (read-only)
   */
  getConfig(): Readonly<B2Config> {
    return { ...this.config };
  }

  /**
   * Clear cached credentials (force re-authentication)
   */
  clearCache(): void {
    this.authToken = null;
    this.apiUrl = null;
    this.downloadUrl = null;
  }
}
