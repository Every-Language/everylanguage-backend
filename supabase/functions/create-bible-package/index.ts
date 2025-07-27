import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/response-utils.ts';
import { parseRequest } from '../_shared/request-parser.ts';

interface CreatePackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  options?: {
    includeStructure?: boolean;
    compressionLevel?: number;
    maxSize?: number;
  };
}

interface CreatePackageResponse {
  success: boolean;
  packageId: string;
  manifest: any;
  sizeInBytes: number;
  estimatedDownloadTime?: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.',
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          details: authError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate request
    const requestData: CreatePackageRequest = await parseRequest(req);

    if (!requestData.packageType || !requestData.languageEntityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required fields: packageType and languageEntityId are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate package type specific requirements
    if (requestData.packageType === 'audio' && !requestData.audioVersionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'audioVersionId is required for audio packages',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (requestData.packageType === 'text' && !requestData.textVersionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'textVersionId is required for text packages',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      requestData.packageType === 'combined' &&
      (!requestData.audioVersionId || !requestData.textVersionId)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Both audioVersionId and textVersionId are required for combined packages',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Creating ${requestData.packageType} package for user ${user.id}`
    );

    // Create package
    const builder = new BiblePackageBuilder(supabaseClient);
    const result = await builder.build({
      packageType: requestData.packageType,
      audioVersionId: requestData.audioVersionId,
      textVersionId: requestData.textVersionId,
      languageEntityId: requestData.languageEntityId,
      requestedBy: user.id,
      includeStructure: requestData.options?.includeStructure ?? true,
    });

    // Calculate estimated download time (assuming 1 Mbps connection)
    const estimatedDownloadTime = Math.ceil(
      result.sizeInBytes / ((1024 * 1024) / 8)
    ); // seconds

    const response: CreatePackageResponse = {
      success: true,
      packageId: result.manifest.packageId,
      manifest: result.manifest,
      sizeInBytes: result.sizeInBytes,
      estimatedDownloadTime,
    };

    console.log(
      `Package created successfully: ${result.manifest.packageId} (${(result.sizeInBytes / 1024 / 1024).toFixed(2)} MB)`
    );

    // Return package as binary data
    return new Response(result.packageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.manifest.packageId}.bible"`,
        'Content-Length': result.sizeInBytes.toString(),
        'X-Package-Info': JSON.stringify(response),
        'X-Package-Size-MB': (result.sizeInBytes / 1024 / 1024).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Package creation error:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Package creation failed';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Requested resource not found';
    } else if (
      error.message.includes('validation') ||
      error.message.includes('required')
    ) {
      statusCode = 400;
      errorMessage = 'Invalid request data';
    } else if (
      error.message.includes('permission') ||
      error.message.includes('unauthorized')
    ) {
      statusCode = 403;
      errorMessage = 'Permission denied';
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
