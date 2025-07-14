import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { B2StorageService } from '../_shared/b2-storage-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const mediaFileId = url.searchParams.get('id');
    const fileName = url.searchParams.get('filename');
    const stream = url.searchParams.get('stream') === 'true';

    if (!mediaFileId && !fileName) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: id or filename',
          usage:
            'GET /download-media?id=uuid or GET /download-media?filename=file.m4a',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let actualFileName = fileName;

    // If mediaFileId is provided, look up the filename from remote_path
    if (mediaFileId) {
      const { data: mediaFile, error: dbError } = await supabaseClient
        .from('media_files')
        .select('remote_path')
        .eq('id', mediaFileId)
        .single();

      if (dbError || !mediaFile) {
        return new Response(
          JSON.stringify({
            error: 'Media file not found',
            details: dbError?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!mediaFile.remote_path) {
        return new Response(
          JSON.stringify({
            error: 'File not available for download',
            details: 'No remote path found for this media file',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Extract filename from remote_path URL
      // remote_path format: https://f005.backblazeb2.com/file/bucket-name/timestamp-filename.ext
      actualFileName =
        mediaFile.remote_path.split('/').pop() ?? mediaFile.remote_path;
    }

    if (!actualFileName) {
      return new Response(
        JSON.stringify({ error: 'Could not determine filename' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize B2 service using the new service
    const b2Service = new B2StorageService();

    if (stream) {
      // Stream the file with retry logic
      console.log(`Streaming file: ${actualFileName}`);

      const streamResponse = await b2Service.streamFileWithRetry(
        actualFileName,
        3,
        true // Use private bucket
      );

      // Forward the stream response with appropriate headers
      return new Response(streamResponse.body, {
        status: streamResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type':
            streamResponse.headers.get('content-type') ??
            'application/octet-stream',
          'Content-Length': streamResponse.headers.get('content-length') ?? '',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else {
      // Download the entire file
      console.log(`Downloading file: ${actualFileName}`);

      const fileData =
        await b2Service.downloadFileFromPrivateBucket(actualFileName);

      // Determine content disposition filename
      const downloadName = fileName ?? actualFileName.replace(/^\d+-/, ''); // Remove timestamp prefix

      return new Response(fileData.data, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': fileData.contentType,
          'Content-Length': fileData.contentLength.toString(),
          'Content-Disposition': `attachment; filename="${downloadName}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
