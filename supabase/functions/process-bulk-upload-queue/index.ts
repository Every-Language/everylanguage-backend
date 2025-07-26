import { corsHeaders } from '../_shared/request-parser.ts';
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import {
  updateMediaFileUploadResults,
  markMediaFileAsFailed,
  updateMediaFileStatus,
} from '../_shared/bible-chapter-database.ts';

interface QueueProcessingRequest {
  queueId?: string; // Process specific queue
  batchSize?: number; // Number of items to process at once
}

interface QueueProcessingResponse {
  success: boolean;
  data?: {
    queueId?: string;
    processedCount: number;
    successfulCount: number;
    failedCount: number;
    skippedCount: number;
    details: Array<{
      id: string;
      mediaFileId: string;
      fileName: string;
      status: 'completed' | 'failed' | 'skipped';
      error?: string;
    }>;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authResult.error,
          details: authResult.details,
        }),
        {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { supabaseClient } = authResult;

    // Parse request body (optional - can process all queued items if no body)
    let requestData: QueueProcessingRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // If no body provided, process all queued items
      }
    }

    const { queueId, batchSize = 10 } = requestData;

    console.log('🔄 Starting queue processing...', { queueId, batchSize });

    // Build query for fetching queue items
    let query = supabaseClient
      .from('upload_queue')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    // Filter by specific queue if provided
    if (queueId) {
      query = query.eq('queue_id', queueId);
    }

    const { data: queueItems, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch queue items: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            queueId,
            processedCount: 0,
            successfulCount: 0,
            failedCount: 0,
            skippedCount: 0,
            details: [],
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📦 Processing ${queueItems.length} queue items`);

    // Initialize B2 storage service
    const b2Service = new B2StorageService();
    const processingResults = [];

    // Process each queue item
    for (const queueItem of queueItems) {
      try {
        console.log(`⚡ Processing: ${queueItem.file_name}`);

        // Mark as processing
        await supabaseClient
          .from('upload_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id);

        // Update media file status to uploading
        await updateMediaFileStatus(
          supabaseClient,
          queueItem.media_file_id,
          'uploading'
        );

        // Check if file data exists
        if (!queueItem.file_data) {
          throw new Error('No file data found in queue item');
        }

        // Convert base64 back to bytes if needed
        let fileBytes: Uint8Array;
        if (typeof queueItem.file_data === 'string') {
          // Assume it's base64 encoded
          const binaryString = atob(queueItem.file_data);
          fileBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            fileBytes[i] = binaryString.charCodeAt(i);
          }
        } else {
          fileBytes = new Uint8Array(queueItem.file_data);
        }

        // Prepare upload metadata
        const uploadRequest = queueItem.upload_request;
        const metadata = {
          'media-type': 'audio',
          'language-entity-id': uploadRequest.languageEntityId,
          'chapter-id': uploadRequest.chapterId,
          'is-bible-audio': 'true',
          'uploaded-by': queueItem.created_by,
        };

        // Upload file to B2
        const uploadResult = await b2Service.uploadFile(
          fileBytes,
          queueItem.file_name,
          queueItem.content_type,
          metadata
        );

        // Update media file with upload results
        await updateMediaFileUploadResults(
          supabaseClient,
          queueItem.media_file_id,
          {
            downloadUrl: uploadResult.downloadUrl,
            fileSize: uploadResult.fileSize,
          }
        );

        // Mark queue item as completed
        await supabaseClient
          .from('upload_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', queueItem.id);

        processingResults.push({
          id: queueItem.id,
          mediaFileId: queueItem.media_file_id,
          fileName: queueItem.file_name,
          status: 'completed' as const,
        });

        console.log(`✅ Successfully processed: ${queueItem.file_name}`);
      } catch (uploadError: unknown) {
        console.error(
          `❌ Failed to process ${queueItem.file_name}:`,
          uploadError
        );

        const errorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : 'Unknown upload error';

        // Mark media file as failed
        await markMediaFileAsFailed(supabaseClient, queueItem.media_file_id);

        // Mark queue item as failed
        await supabaseClient
          .from('upload_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', queueItem.id);

        processingResults.push({
          id: queueItem.id,
          mediaFileId: queueItem.media_file_id,
          fileName: queueItem.file_name,
          status: 'failed' as const,
          error: errorMessage,
        });
      }
    }

    const successfulCount = processingResults.filter(
      r => r.status === 'completed'
    ).length;
    const failedCount = processingResults.filter(
      r => r.status === 'failed'
    ).length;

    console.log(
      `🎉 Queue processing completed: ${successfulCount} successful, ${failedCount} failed`
    );

    const response: QueueProcessingResponse = {
      success: true,
      data: {
        queueId,
        processedCount: queueItems.length,
        successfulCount,
        failedCount,
        skippedCount: 0,
        details: processingResults,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Queue processing failed',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
