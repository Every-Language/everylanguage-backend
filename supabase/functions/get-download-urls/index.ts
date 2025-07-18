import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { B2StorageService } from '../_shared/b2-storage-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DownloadRequest {
  filePaths: string[];
  expirationHours?: number;
}

interface UrlGenerationResult {
  success: boolean;
  urls: Record<string, string>;
  expiresIn: number;
  totalFiles: number;
  successfulUrls: number;
  failedFiles?: string[];
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

    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestData: DownloadRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { filePaths, expirationHours = 24 } = requestData;

    // Validate input
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid filePaths array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate expiration hours (between 1 and 168 hours = 7 days)
    if (expirationHours < 1 || expirationHours > 168) {
      return new Response(
        JSON.stringify({
          error: 'expirationHours must be between 1 and 168 (7 days)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limit batch size to prevent abuse
    if (filePaths.length > 100) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 100 files per request',
          hint: 'Split large requests into smaller batches',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const b2Service = new B2StorageService();
    const urls: Record<string, string> = {};
    const errors: Record<string, string> = {};
    const failedFiles: string[] = [];

    console.log(
      `Generating ${filePaths.length} presigned URLs with ${expirationHours}h expiration`
    );

    // Generate signed URLs for each file
    const urlPromises = filePaths.map(async filePath => {
      const fileName = filePath.split('/').pop() ?? filePath;
      try {
        const signedUrl = await b2Service.generateDownloadUrl(
          fileName,
          expirationHours * 3600
        );
        urls[filePath] = signedUrl;
        console.log(`✅ Generated URL for: ${fileName}`);
      } catch (error) {
        const errorMessage = (error as Error).message;
        errors[filePath] = errorMessage;
        failedFiles.push(filePath);
        console.warn(
          `❌ Failed to generate URL for ${fileName}: ${errorMessage}`
        );
      }
    });

    // Wait for all URL generations to complete
    await Promise.allSettled(urlPromises);

    const result: UrlGenerationResult = {
      success: Object.keys(urls).length > 0,
      urls,
      expiresIn: expirationHours * 3600,
      totalFiles: filePaths.length,
      successfulUrls: Object.keys(urls).length,
    };

    // Include error details if there were failures
    if (failedFiles.length > 0) {
      result.failedFiles = failedFiles;
      result.errors = errors;
    }

    const statusCode = result.success ? 200 : 500;

    console.log(
      `🏁 Generated ${result.successfulUrls}/${result.totalFiles} URLs successfully`
    );

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('❌ URL generation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate download URLs',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
