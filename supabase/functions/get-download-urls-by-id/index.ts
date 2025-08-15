import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { createSignedCdnUrl } from '../_shared/cdn-utils.ts';

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

interface BatchUrlResult {
  success: boolean;
  expiresIn: number;
  media?: Record<string, string>; // media_file_id -> url
  images?: Record<string, string>; // image_id -> url
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
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresInSeconds = Math.min(Math.max(1, expirationHours), 24) * 3600;
    const result: BatchUrlResult = {
      success: true,
      expiresIn: expiresInSeconds,
    };
    const errors: Record<string, string> = {};

    // Media files
    if (mediaFileIds.length > 0) {
      const { data, error } = await supabase
        .from('media_files')
        .select('id, object_key')
        .in('id', mediaFileIds);
      if (error) {
        return new Response(
          JSON.stringify({ error: `DB error (media_files): ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      const media: Record<string, string> = {};
      for (const row of data ?? []) {
        const key = row.object_key;
        if (!key) {
          errors[row.id] = 'Missing object key';
          continue;
        }
        try {
          if (storageProvider === 'b2') {
            const b2 = new B2StorageService();
            media[row.id] = await b2.generateDownloadUrl(key, expiresInSeconds);
          } else {
            const base = Deno.env.get('CDN_BASE_URL') ?? '';
            const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';
            let url = await createSignedCdnUrl(
              base,
              key,
              secret,
              expiresInSeconds
            );
            if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'dev') {
              const u = new URL(url);
              u.searchParams.set('env', 'dev');
              url = u.toString();
            }
            media[row.id] = url;
          }
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
      result.media = media;
    }

    // Images
    if (imageIds.length > 0) {
      const { data, error } = await supabase
        .from('images')
        .select('id, object_key')
        .in('id', imageIds);
      if (error) {
        return new Response(
          JSON.stringify({ error: `DB error (images): ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      const images: Record<string, string> = {};
      for (const row of data ?? []) {
        const key = row.object_key;
        if (!key) {
          errors[row.id] = 'Missing object key';
          continue;
        }
        try {
          if (storageProvider === 'b2') {
            const b2 = new B2StorageService();
            images[row.id] = await b2.generateDownloadUrl(
              key,
              expiresInSeconds
            );
          } else {
            const base = Deno.env.get('CDN_BASE_URL') ?? '';
            const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';
            let url = await createSignedCdnUrl(
              base,
              key,
              secret,
              expiresInSeconds
            );
            if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'dev') {
              const u = new URL(url);
              u.searchParams.set('env', 'dev');
              url = u.toString();
            }
            images[row.id] = url;
          }
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
      result.images = images;
    }

    if (Object.keys(errors).length > 0) {
      result.success =
        Object.keys(errors).length < mediaFileIds.length + imageIds.length;
      result.errors = errors;
    }

    return new Response(JSON.stringify(result), {
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
