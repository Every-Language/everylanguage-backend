import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BibleAudioService } from '../_shared/bible-audio-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Expose-Headers':
    'content-range, accept-ranges, content-length, x-bible-metadata',
};

Deno.serve(async (req: Request) => {
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
    const stream = url.searchParams.get('stream') === 'true';
    const metadataOnly = url.searchParams.get('metadata') === 'true';

    if (!mediaFileId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: id',
          usage:
            'GET /download-bible-chapter-audio?id=uuid&stream=true|false&metadata=true|false',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client and Bible audio service
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify authentication (optional for Bible content based on your RLS policies)
    await supabaseClient.auth.getUser();

    // Initialize Bible audio service
    const bibleAudioService = new BibleAudioService(supabaseClient);

    // Get metadata for the requested chapter
    const metadata =
      await bibleAudioService.getChapterAudioMetadata(mediaFileId);

    // If only metadata is requested, return it
    if (metadataOnly) {
      return new Response(JSON.stringify({ success: true, metadata }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle Range requests for resumable downloads
    const rangeHeader = req.headers.get('range');

    if (stream || rangeHeader) {
      console.log(
        `Streaming Bible audio: ${metadata.bookName} ${metadata.chapterNumber}${
          rangeHeader ? ` with range: ${rangeHeader}` : ''
        }`
      );

      const streamResponse = await bibleAudioService.streamChapterAudio(
        metadata,
        rangeHeader
      );

      return new Response(streamResponse.body, {
        status: streamResponse.status,
        headers: {
          ...corsHeaders,
          ...Object.fromEntries(streamResponse.headers.entries()),
        },
      });
    } else {
      // Full download
      console.log(
        `Downloading Bible audio: ${metadata.bookName} ${metadata.chapterNumber}`
      );

      const fileData = await bibleAudioService.downloadChapterAudio(metadata);

      return new Response(fileData.data, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': fileData.contentType,
          'Content-Length': fileData.data.length.toString(),
          'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
          'Cache-Control': 'private, max-age=86400',
          'X-Bible-Metadata': JSON.stringify(metadata),
        },
      });
    }
  } catch (error: unknown) {
    console.error('Bible audio download error:', error);
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
