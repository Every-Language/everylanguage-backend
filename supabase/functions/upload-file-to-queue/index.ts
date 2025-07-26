import { corsHeaders } from '../_shared/request-parser.ts';
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';

interface FileUploadToQueueResponse {
  success: boolean;
  data?: {
    queueItemId: string;
    fileName: string;
    fileSize: number;
    status: string;
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

    const { supabaseClient, publicUserId } = authResult;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const queueItemId = formData.get('queueItemId') as string;

    if (!queueItemId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File and queueItemId are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📤 Uploading file to queue: ${file.name}`);

    // Verify the queue item exists and belongs to the user
    const { data: queueItem, error: fetchError } = await supabaseClient
      .from('upload_queue')
      .select('*')
      .eq('id', queueItemId)
      .eq('created_by', publicUserId)
      .eq('status', 'queued')
      .single();

    if (fetchError || !queueItem) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Queue item not found or not accessible',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file matches expected metadata
    if (
      file.name !== queueItem.file_name ||
      file.size !== queueItem.file_size
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File does not match expected metadata',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert file to binary data
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Store file data in the queue item
    const { error: updateError } = await supabaseClient
      .from('upload_queue')
      .update({
        file_data: fileBytes,
        status: 'queued', // Ensure it's ready for processing
      })
      .eq('id', queueItemId);

    if (updateError) {
      throw new Error(`Failed to store file data: ${updateError.message}`);
    }

    console.log(`✅ File stored in queue: ${file.name}`);

    const response: FileUploadToQueueResponse = {
      success: true,
      data: {
        queueItemId,
        fileName: file.name,
        fileSize: file.size,
        status: 'queued',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('File upload to queue error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'File upload to queue failed',
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
