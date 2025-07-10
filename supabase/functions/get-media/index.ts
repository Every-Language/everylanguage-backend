import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request URL
    const url = new URL(req.url);
    const mediaFileId = url.searchParams.get('mediaFileId');
    const validForHours = parseInt(
      url.searchParams.get('validForHours') ?? '24'
    );

    if (!mediaFileId) {
      return new Response(
        JSON.stringify({ success: false, error: 'mediaFileId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get media file from database
    const { data: mediaFile, error: dbError } = await supabaseClient
      .from('media_files')
      .select('*')
      .eq('id', mediaFileId)
      .single();

    if (dbError || !mediaFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Media file not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!mediaFile.remote_path) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File not available for download',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // If the file is from B2, generate a temporary download URL
      if (
        mediaFile.remote_path.includes('backblazeb2.com') ||
        mediaFile.remote_path.includes('b2.com')
      ) {
        const b2Service = new B2StorageService();

        // Extract filename from the remote path
        const fileName = mediaFile.remote_path.split('/').pop();

        if (!fileName) {
          throw new Error('Invalid file path');
        }

        // Generate temporary download URL (valid for specified hours)
        const downloadUrl = await b2Service.generateDownloadUrl(
          fileName,
          validForHours * 3600
        );

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              downloadUrl,
              fileName,
              fileSize: mediaFile.file_size,
              mediaType: mediaFile.media_type,
              expiresIn: validForHours * 3600, // seconds
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        // For non-B2 files, return the direct URL
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              downloadUrl: mediaFile.remote_path,
              fileName: mediaFile.remote_path.split('/').pop() ?? 'unknown',
              fileSize: mediaFile.file_size,
              mediaType: mediaFile.media_type,
              expiresIn: null, // No expiration for direct URLs
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (downloadError) {
      console.error('Download URL generation error:', downloadError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to generate download URL: ${(downloadError as Error).message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
