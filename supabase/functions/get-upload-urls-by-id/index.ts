import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { R2StorageService } from '../_shared/r2-storage-service.ts';
import { StorageUtils } from '../_shared/storage-utils.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface RequestBody {
  mediaFileIds?: string[];
  imageIds?: string[];
  expirationHours?: number;
}

interface UrlInfo {
  id: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
}

interface BatchUploadUrlsResult {
  success: boolean;
  media?: UrlInfo[];
  images?: UrlInfo[];
  errors?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { mediaFileIds = [], imageIds = [], expirationHours = 24 } = body;
    if (mediaFileIds.length === 0 && imageIds.length === 0) {
      return createErrorResponse('Provide mediaFileIds and/or imageIds', 400);
    }

    // R2-only storage - no provider switching needed
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const r2 = new R2StorageService();
    const expiresInSeconds = Math.min(Math.max(1, expirationHours), 24) * 3600;

    const errors: Record<string, string> = {};
    const media: UrlInfo[] = [];
    const images: UrlInfo[] = [];

    // Helper to allocate object key (existing or new)
    const ensureKey = (
      existing: string | null,
      proposedName: string
    ): string =>
      existing && existing.length > 0
        ? existing
        : StorageUtils.generateUniqueFileName(proposedName);

    if (mediaFileIds.length > 0) {
      const { data, error } = await supabase
        .from('media_files')
        .select('id, object_key')
        .in('id', mediaFileIds);
      if (error) {
        return createErrorResponse(`DB error: ${error.message}`, 500);
      }
      for (const row of data ?? []) {
        try {
          const objectKey = ensureKey(row.object_key, `${row.id}.bin`);
          const uploadUrl = await r2.getPresignedPutUrl(
            objectKey,
            expiresInSeconds
          );
          // Persist object_key and provider for future fetches
          await supabase
            .from('media_files')
            .update({ object_key: objectKey, storage_provider: 'r2' })
            .eq('id', row.id);
          media.push({
            id: row.id,
            objectKey,
            uploadUrl,
            expiresIn: expiresInSeconds,
          });
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
    }

    if (imageIds.length > 0) {
      const { data, error } = await supabase
        .from('images')
        .select('id, object_key')
        .in('id', imageIds);
      if (error) {
        return createErrorResponse(`DB error: ${error.message}`, 500);
      }
      for (const row of data ?? []) {
        try {
          const objectKey = ensureKey(row.object_key, `${row.id}.bin`);
          const uploadUrl = await r2.getPresignedPutUrl(
            objectKey,
            expiresInSeconds
          );
          await supabase
            .from('images')
            .update({ object_key: objectKey, storage_provider: 'r2' })
            .eq('id', row.id);
          images.push({
            id: row.id,
            objectKey,
            uploadUrl,
            expiresIn: expiresInSeconds,
          });
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
    }

    const response: BatchUploadUrlsResult = {
      success: Object.keys(errors).length === 0,
    };
    if (media.length > 0) response.media = media;
    if (images.length > 0) response.images = images;
    if (!response.success) response.errors = errors;

    return createSuccessResponse(response);
  } catch (error) {
    return createErrorResponse((error as Error).message, 500);
  }
});
