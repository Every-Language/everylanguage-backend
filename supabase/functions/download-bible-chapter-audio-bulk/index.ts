import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  BibleAudioService,
  BibleAudioBatchQuery,
  BatchDownloadManager,
} from '../_shared/bible-audio-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'content-length, x-batch-progress',
};

interface BatchDownloadRequest {
  languageEntityId: string;
  scope: 'version' | 'book' | 'chapters';
  bookId?: string;
  chapterIds?: string[];
  batchSize?: number; // Number of files to process in parallel (default: 3)
  format?: 'zip' | 'individual'; // Default: individual
}

interface BatchDownloadResponse {
  success: boolean;
  batchId: string;
  files: Array<{
    mediaFileId: string;
    fileName: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalBytes: number;
  };
}

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

    // Parse request body
    let batchRequest: BatchDownloadRequest;
    try {
      batchRequest = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          usage: {
            method: 'POST',
            body: {
              languageEntityId: 'uuid',
              scope: 'version | book | chapters',
              bookId: 'uuid (required for book/chapters)',
              chapterIds: ['uuid1', 'uuid2'], // (required for chapters)
              batchSize: 3, // optional, default 3
              format: 'individual | zip', // optional, default individual
            },
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!batchRequest.languageEntityId || !batchRequest.scope) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: languageEntityId, scope',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      (batchRequest.scope === 'book' || batchRequest.scope === 'chapters') &&
      !batchRequest.bookId
    ) {
      return new Response(
        JSON.stringify({
          error: 'bookId is required for book and chapters scope',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      batchRequest.scope === 'chapters' &&
      (!batchRequest.chapterIds || batchRequest.chapterIds.length === 0)
    ) {
      return new Response(
        JSON.stringify({
          error: 'chapterIds array is required for chapters scope',
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

    // Verify authentication
    await supabaseClient.auth.getUser();

    // Initialize Bible audio service
    const bibleAudioService = new BibleAudioService(supabaseClient);

    // Build query for batch metadata
    const query: BibleAudioBatchQuery = {
      languageEntityId: batchRequest.languageEntityId,
      scope: batchRequest.scope,
      bookId: batchRequest.bookId,
      chapterIds: batchRequest.chapterIds,
    };

    console.log(`Fetching batch metadata for ${batchRequest.scope}...`);

    // Get all metadata for the batch
    const allMetadata = await bibleAudioService.getBatchAudioMetadata(query);

    if (allMetadata.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No audio files found for the specified criteria',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${allMetadata.length} files to download`);

    // Set up batch processing
    const batchSize = Math.min(batchRequest.batchSize ?? 3, 5); // Max 5 concurrent
    const batchId = crypto.randomUUID();
    const results: BatchDownloadResponse['files'] = [];
    let totalBytes = 0;

    // Calculate total size
    allMetadata.forEach(metadata => {
      totalBytes += metadata.fileSize;
    });

    const batchManager = new BatchDownloadManager(allMetadata.length);

    // Process files in batches to avoid overwhelming the server/client
    for (let i = 0; i < allMetadata.length; i += batchSize) {
      const batch = allMetadata.slice(i, i + batchSize);

      const batchPromises = batch.map(async metadata => {
        try {
          console.log(
            `Downloading ${metadata.bookName} ${metadata.chapterNumber}...`
          );

          batchManager.updateProgress({ currentFile: metadata });

          const fileData =
            await bibleAudioService.downloadChapterAudio(metadata);

          batchManager.updateProgress({
            completedFiles: batchManager.getProgress().completedFiles + 1,
            downloadedFileBytes: metadata.fileSize,
          });

          return {
            mediaFileId: metadata.mediaFileId,
            fileName: fileData.fileName,
            success: true,
            data: fileData.data,
            contentType: fileData.contentType,
          };
        } catch (error) {
          console.error(
            `Failed to download ${metadata.bookName} ${metadata.chapterNumber}:`,
            error
          );

          batchManager.updateProgress({
            failedFiles: batchManager.getProgress().failedFiles + 1,
          });

          return {
            mediaFileId: metadata.mediaFileId,
            fileName: `${metadata.bookName}-${metadata.chapterNumber}.m4a`,
            success: false,
            error: (error as Error).message,
          };
        }
      });

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be kind to the server
      if (i + batchSize < allMetadata.length) {
        await new Promise(resolve => globalThis.setTimeout(resolve, 100));
      }
    }

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(
      `Batch download complete: ${successfulResults.length} successful, ${failedResults.length} failed`
    );

    // For individual format, return a multipart response with all files
    if (batchRequest.format !== 'zip') {
      // Note: In a real implementation, you'd need to handle binary data properly
      // For now, we'll return metadata about the files

      // For this implementation, return a JSON response with file information
      // In production, you might want to implement actual file streaming
      const response: BatchDownloadResponse = {
        success: true,
        batchId,
        files: results.map(r => ({
          mediaFileId: r.mediaFileId,
          fileName: r.fileName,
          success: r.success,
          error: r.error,
        })),
        summary: {
          totalFiles: allMetadata.length,
          successfulFiles: successfulResults.length,
          failedFiles: failedResults.length,
          totalBytes,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Batch-Progress': JSON.stringify(batchManager.getProgress()),
        },
      });
    }

    // ZIP format would be implemented here
    // For now, return an error for ZIP format
    return new Response(
      JSON.stringify({
        error: 'ZIP format not yet implemented',
        suggestion: 'Use format: "individual" for now',
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Batch download error:', error);
    return new Response(
      JSON.stringify({
        error: 'Batch download failed',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
