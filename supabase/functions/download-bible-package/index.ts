import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/response-utils.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const packageType = url.searchParams.get('packageType');
    const audioVersionId = url.searchParams.get('audioVersionId');
    const textVersionId = url.searchParams.get('textVersionId');
    const languageEntityId = url.searchParams.get('languageEntityId');

    if (!packageType || !languageEntityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required parameters: packageType and languageEntityId',
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Build package
    const builder = new BiblePackageBuilder(supabaseClient);

    console.log(
      `🚀 Building package: ${packageType} for audio=${audioVersionId}, text=${textVersionId}, lang=${languageEntityId}`
    );

    const result = await builder.build({
      packageType: packageType as any,
      audioVersionId: audioVersionId ?? undefined,
      textVersionId: textVersionId ?? undefined,
      languageEntityId,
      requestedBy: 'system',
    });

    console.log(`📦 Package built successfully: ${result.sizeInBytes} bytes`);

    return new Response(result.packageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.manifest.packageId}.bible"`,
        'Content-Length': result.sizeInBytes.toString(),
        'X-Served-From': 'generated',
      },
    });
  } catch (error) {
    console.error('Package download error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Package download failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
