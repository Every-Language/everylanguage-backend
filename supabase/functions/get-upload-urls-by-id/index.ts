import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { R2StorageService } from '../_shared/r2-storage-service.ts';
import { StorageUtils } from '../_shared/storage-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mediaFileIds = [], imageIds = [], expirationHours = 24 } = body;
    if (mediaFileIds.length === 0 && imageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Provide mediaFileIds and/or imageIds' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const storageProvider = (
      Deno.env.get('STORAGE_PROVIDER') ?? 'b2'
    ).toLowerCase();
    if (storageProvider !== 'r2') {
      return new Response(
        JSON.stringify({
          error: 'Upload-by-id supported only for R2 presigned upload',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
        return new Response(
          JSON.stringify({ error: `DB error: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
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
        return new Response(
          JSON.stringify({ error: `DB error: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
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

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
