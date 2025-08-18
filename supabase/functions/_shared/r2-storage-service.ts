import { presignUrl } from './r2-s3-signer.ts';
import { StorageUtils } from './storage-utils.ts';

export class R2StorageService {
  private accountId: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucketName: string;
  private endpoint: string;

  constructor() {
    this.accountId = Deno.env.get('R2_ACCOUNT_ID') ?? '';
    this.accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID') ?? '';
    this.secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '';
    this.bucketName = Deno.env.get('R2_BUCKET_NAME') ?? '';
    const customEndpoint = Deno.env.get('R2_S3_ENDPOINT');
    this.endpoint =
      customEndpoint ?? `https://${this.accountId}.r2.cloudflarestorage.com`;

    if (
      !this.accountId ||
      !this.accessKeyId ||
      !this.secretAccessKey ||
      !this.bucketName
    ) {
      throw new Error('Missing R2 configuration in environment variables');
    }
  }

  generateUniqueFileName(originalName: string): string {
    return StorageUtils.generateUniqueFileName(originalName);
  }

  getObjectUrl(objectKey: string): string {
    // Path-style endpoint for R2
    return `${this.endpoint}/${this.bucketName}/${objectKey}`;
  }

  async getPresignedPutUrl(
    objectKey: string,
    expiresInSeconds: number
  ): Promise<string> {
    const url = this.getObjectUrl(objectKey);
    return presignUrl(
      {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: 'auto',
        service: 's3',
      },
      {
        method: 'PUT',
        url,
        expiresInSeconds,
      }
    );
  }

  async getPresignedGetUrl(
    objectKey: string,
    expiresInSeconds: number
  ): Promise<string> {
    const url = this.getObjectUrl(objectKey);
    return presignUrl(
      {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: 'auto',
        service: 's3',
      },
      {
        method: 'GET',
        url,
        expiresInSeconds,
      }
    );
  }

  /**
   * Download a file from R2 bucket (replacement for B2 downloadFileFromPrivateBucket)
   */
  async downloadFile(objectKey: string): Promise<Uint8Array> {
    // For now, use presigned GET URL for downloading
    const downloadUrl = await this.getPresignedGetUrl(objectKey, 3600); // 1 hour expiry

    const response = await fetch(downloadUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download file ${objectKey}: ${response.status} ${response.statusText}`
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }
}
