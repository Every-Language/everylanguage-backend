import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/response-utils.ts';

interface CreatePackageRequest {
  packageType?: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId?: string;
  options?: {
    includeStructure?: boolean;
    compressionLevel?: number;
    maxSize?: number;

    // Multi-package options
    enableChunking?: boolean;
    chunkingStrategy?: 'size' | 'testament' | 'book_group' | 'custom';
    customChunkRange?: {
      startBook: string;
      endBook: string;
    };
    forceMultiplePackages?: boolean;
  };
}

interface PackageInfo {
  packageId: string;
  partNumber: number;
  downloadUrl?: string;
  manifest: any;
  sizeInBytes: number;
}

interface CreatePackageResponse {
  success: boolean;

  // Single package response
  packageId?: string;
  downloadUrl?: string;
  manifest?: any;
  sizeInBytes?: number;
  estimatedDownloadTime?: number;

  // Multi-package response
  packages?: PackageInfo[];
  seriesInfo?: {
    seriesId: string;
    seriesName: string;
    totalParts: number;
    totalSizeMB: number;
    chunkingStrategy: string;
    downloadUrls?: string[];
  };

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
    const request: CreatePackageRequest = await req.json();

    // Validate required fields
    if (!request.packageType || !request.languageEntityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: packageType and languageEntityId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build package request
    const packageRequest = {
      packageType: request.packageType,
      audioVersionId: request.audioVersionId,
      textVersionId: request.textVersionId,
      languageEntityId: request.languageEntityId,
      requestedBy: user.id,
      includeStructure: request.options?.includeStructure ?? true,

      // Multi-package options
      enableChunking:
        request.options?.enableChunking ??
        request.options?.forceMultiplePackages ??
        false,
      maxSizeMB: request.options?.maxSize ?? 2048,
      chunkingStrategy: request.options?.chunkingStrategy ?? 'size',
      customChunkRange: request.options?.customChunkRange,
    };

    console.log(`📦 Building package with request:`, packageRequest);

    // Build package(s)
    const builder = new BiblePackageBuilder(supabaseClient);
    const result = await builder.build(packageRequest);

    // Handle single package result
    if (result.packageBuffer && result.manifest) {
      const filename = `${result.manifest.packageId}.bible`;
      const downloadTime = Math.ceil(result.sizeInBytes / (1024 * 1024 * 2)); // Assume 2MB/s

      const response: CreatePackageResponse = {
        success: true,
        packageId: result.manifest.packageId,
        manifest: result.manifest,
        sizeInBytes: result.sizeInBytes,
        estimatedDownloadTime: downloadTime,
      };

      // Return the package as binary data
      return new Response(result.packageBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': result.sizeInBytes.toString(),
          'X-Package-Metadata': JSON.stringify(response),
        },
      });
    }

    // Handle multi-package result
    if (result.packages && result.seriesInfo) {
      const packagesInfo: PackageInfo[] = result.packages.map(pkg => ({
        packageId: pkg.manifest.packageId,
        partNumber: pkg.partNumber,
        manifest: pkg.manifest,
        sizeInBytes: pkg.sizeInBytes,
      }));

      const response: CreatePackageResponse = {
        success: true,
        packages: packagesInfo,
        seriesInfo: {
          seriesId: result.seriesInfo.seriesId,
          seriesName: result.seriesInfo.seriesName,
          totalParts: result.seriesInfo.totalParts,
          totalSizeMB: result.seriesInfo.estimatedTotalSizeMB,
          chunkingStrategy: result.seriesInfo.chunkingStrategy,
        },
      };

      // For multi-package, return JSON with package info
      // In a real implementation, you'd store the packages and provide download URLs
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Should not reach here
    throw new Error('Invalid build result - no packages generated');
  } catch (error) {
    console.error('❌ Package creation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Package creation failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
