import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/response-utils.ts';

interface CreateSeriesRequest {
  packageType?: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId?: string;
  chunkingStrategy?: 'size' | 'testament' | 'book_group' | 'custom';
  maxSizePerPackageMB?: number;
  customChunks?: {
    startBook: string;
    endBook: string;
    description: string;
  }[];
}

interface CreateSeriesResponse {
  success: boolean;
  seriesId: string;
  seriesName: string;
  totalParts: number;
  estimatedTotalSizeMB: number;
  packages: {
    partNumber: number;
    packageId: string;
    contentRange: {
      startBook: string;
      endBook: string;
      description: string;
    };
    estimatedSizeMB: number;
  }[];
  generationJobId?: string;
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
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request
    const request: CreateSeriesRequest = await req.json();

    // Validate required fields
    if (
      !request.packageType ||
      !request.languageEntityId ||
      !request.chunkingStrategy
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required fields: packageType, languageEntityId, chunkingStrategy',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build package request for series planning
    const packageRequest = {
      packageType: request.packageType,
      audioVersionId: request.audioVersionId,
      textVersionId: request.textVersionId,
      languageEntityId: request.languageEntityId,
      requestedBy: user.id,
      includeStructure: true,

      // Force chunking with specified strategy
      enableChunking: true,
      maxSizeMB: request.maxSizePerPackageMB ?? 2048,
      chunkingStrategy: request.chunkingStrategy,
      customChunkRange: request.customChunks?.[0]
        ? {
            startBook: request.customChunks[0].startBook,
            endBook:
              request.customChunks[request.customChunks.length - 1].endBook,
          }
        : undefined,
    };

    console.log(`📦 Creating package series with request:`, packageRequest);

    // Create chunking plan without actually building packages
    const builder = new BiblePackageBuilder(supabaseClient);

    // We can reuse the chunking logic to create a plan
    const result = await builder.build(packageRequest);

    if (result.seriesInfo && result.packages) {
      const response: CreateSeriesResponse = {
        success: true,
        seriesId: result.seriesInfo.seriesId,
        seriesName: result.seriesInfo.seriesName,
        totalParts: result.seriesInfo.totalParts,
        estimatedTotalSizeMB: result.seriesInfo.estimatedTotalSizeMB,
        packages: result.packages.map(pkg => ({
          partNumber: pkg.partNumber,
          packageId: pkg.manifest.packageId,
          contentRange: pkg.manifest.seriesInfo?.contentRange ?? {
            startBook: 'unknown',
            endBook: 'unknown',
            description: 'Unknown range',
          },
          estimatedSizeMB: pkg.sizeInBytes / (1024 * 1024),
        })),
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If single package result, convert to series format
    if (result.packageBuffer && result.manifest) {
      const response: CreateSeriesResponse = {
        success: true,
        seriesId: result.manifest.packageId,
        seriesName: result.manifest.packageId,
        totalParts: 1,
        estimatedTotalSizeMB: (result.sizeInBytes ?? 0) / (1024 * 1024),
        packages: [
          {
            partNumber: 1,
            packageId: result.manifest.packageId || '',
            contentRange: {
              startBook: result.manifest.includesBooks[0] || 'gen',
              endBook: result.manifest.includesBooks.slice(-1)[0] || 'rev',
              description: 'Complete Bible',
            },
            estimatedSizeMB: (result.sizeInBytes ?? 0) / (1024 * 1024),
          },
        ],
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Unable to create series plan');
  } catch (error) {
    console.error('❌ Package series creation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Package series creation failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
