import { corsHeaders } from '../_shared/request-parser.ts';
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { B2Utils } from '../_shared/b2-utils.ts';
import { R2StorageService } from '../_shared/r2-storage-service.ts';
import { StorageUtils } from '../_shared/storage-utils.ts';

interface UploadUrlRequest {
  files: Array<{
    fileName: string;
    contentType: string;
    metadata?: Record<string, string>;
  }>;
  batchId?: string;
  concurrency?: number; // Number of parallel upload URLs to generate
}

interface UploadUrlInfo {
  fileName: string;
  b2FileName: string; // The actual filename that will be used in B2
  remotePath: string; // The full remote path for database storage
  uploadUrl: string;
  authorizationToken: string;
  contentType: string;
  expiresIn: number; // seconds
}

interface UploadUrlResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string;
    urls: UploadUrlInfo[];
    uploadMetadata: {
      maxFileSize: number;
      validForHours: number;
      instructions: string;
    };
  };
  error?: string;
  details?: string;
}

const MAX_FILES_PER_REQUEST = 500;
const MAX_UPLOAD_URLS = 20; // B2 recommendation for parallel uploads
const UPLOAD_URL_VALID_HOURS = 24;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult.error,
          details: authResult.details,
        }),
        {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { publicUserId } = authResult;

    // Parse request data
    let requestData: UploadUrlRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      files,
      batchId = crypto.randomUUID(),
      concurrency = 5,
    } = requestData;

    // Validate input
    if (!Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Files array is required and must not be empty',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Maximum ${MAX_FILES_PER_REQUEST} files per request`,
          details: 'Split large requests into smaller batches',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate each file entry
    for (const [index, file] of files.entries()) {
      if (!file.fileName || typeof file.fileName !== 'string') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `File at index ${index}: fileName is required`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!file.contentType || typeof file.contentType !== 'string') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `File at index ${index}: contentType is required`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    console.log(
      `🔗 Generating upload URLs for ${files.length} files (batch: ${batchId})`
    );

    const storageProvider = (
      Deno.env.get('STORAGE_PROVIDER') ?? 'b2'
    ).toLowerCase();
    const b2Service = storageProvider === 'b2' ? new B2StorageService() : null;
    const r2Service = storageProvider === 'r2' ? new R2StorageService() : null;
    const uploadUrls: UploadUrlInfo[] = [];

    // Determine number of upload URLs to generate
    // Balance between parallelism and B2 limits
    const numUploadUrls = Math.min(
      Math.max(concurrency, 1),
      MAX_UPLOAD_URLS,
      files.length
    );

    // Generate upload URLs (can be reused across multiple files)
    const urlGenerationPromises =
      storageProvider === 'b2'
        ? Array.from({ length: numUploadUrls }, () =>
            generateB2UploadUrl(
              b2Service as B2StorageService,
              publicUserId,
              batchId
            )
          )
        : [];

    const uploadUrlResponses = await Promise.allSettled(urlGenerationPromises);

    // Check if any URL generation failed
    const failedUrls = uploadUrlResponses.filter(
      result => result.status === 'rejected'
    );

    if (failedUrls.length > 0) {
      console.error('Failed to generate some upload URLs:', failedUrls);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate upload URLs',
          details: 'Unable to obtain URLs from B2 service',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validUrlResponses = uploadUrlResponses.filter(
      (
        result
      ): result is PromiseFulfilledResult<{
        uploadUrl: string;
        authorizationToken: string;
      }> => result.status === 'fulfilled'
    );

    // Map each file to an upload URL (round-robin distribution)
    if (storageProvider === 'b2') {
      files.forEach((file, index) => {
        const urlIndex = index % validUrlResponses.length;
        const { uploadUrl, authorizationToken } =
          validUrlResponses[urlIndex].value;

        const b2FileName = B2Utils.generateUniqueFileName(file.fileName);
        const remotePath = (b2Service as B2StorageService).getPublicDownloadUrl(
          b2FileName
        );

        uploadUrls.push({
          fileName: file.fileName,
          b2FileName,
          remotePath,
          uploadUrl,
          authorizationToken,
          contentType: file.contentType,
          expiresIn: UPLOAD_URL_VALID_HOURS * 3600,
        });
      });
    } else {
      // R2: generate presigned PUT URLs per file directly
      for (const file of files) {
        const objectKey = StorageUtils.generateUniqueFileName(file.fileName);
        const unsignedUrl = (r2Service as R2StorageService).getObjectUrl(
          objectKey
        );
        const uploadUrl = await (
          r2Service as R2StorageService
        ).getPresignedPutUrl(objectKey, UPLOAD_URL_VALID_HOURS * 3600);

        uploadUrls.push({
          fileName: file.fileName,
          b2FileName: objectKey, // keep field name for backward compatibility
          remotePath: unsignedUrl, // full remote path for DB storage (temporary until schema switch)
          uploadUrl,
          authorizationToken: '', // not used for R2 presigned URLs
          contentType: file.contentType,
          expiresIn: UPLOAD_URL_VALID_HOURS * 3600,
        });
      }
    }

    const response: UploadUrlResponse = {
      success: true,
      data: {
        totalFiles: files.length,
        batchId,
        urls: uploadUrls,
        uploadMetadata: {
          maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB - B2's max file size
          validForHours: UPLOAD_URL_VALID_HOURS,
          instructions:
            'Use X-Bz-File-Name header with the provided b2FileName, Content-Type header, and Authorization header from the response',
        },
      },
    };

    console.log(
      `✅ Generated ${uploadUrls.length} upload URL mappings for ${files.length} files`
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Upload URL generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to generate upload URLs',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Generate a single upload URL with metadata
 */
async function generateB2UploadUrl(
  b2Service: B2StorageService,
  _publicUserId: string,
  _batchId: string
): Promise<{
  uploadUrl: string;
  authorizationToken: string;
}> {
  // Get upload URL from B2
  const uploadUrlData = await b2Service.getUploadUrl();

  return {
    uploadUrl: uploadUrlData.uploadUrl,
    authorizationToken: uploadUrlData.authorizationToken,
  };
}
