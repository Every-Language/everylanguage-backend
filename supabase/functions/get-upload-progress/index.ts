import { corsHeaders } from '../_shared/request-parser.ts';
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';

interface UploadProgressRequest {
  batchId?: string; // Optional: filter by specific batch
  mediaFileIds?: string[]; // Optional: check specific files
}

interface UploadProgressResponse {
  success: boolean;
  data?: {
    batchId?: string;
    totalFiles: number;
    pendingCount: number;
    uploadingCount: number;
    completedCount: number;
    failedCount: number;
    progress: {
      percentage: number;
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
    };
    files: Array<{
      mediaFileId: string;
      fileName: string;
      status: string;
      downloadUrl?: string;
      error?: string;
      createdAt: string;
      updatedAt: string;
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

    const { supabaseClient, publicUserId } = authResult;

    // Parse request body (optional)
    let requestData: UploadProgressRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // If no body provided, return all user's recent uploads
      }
    }

    const { batchId, mediaFileIds } = requestData;

    // Build query for media files
    let query = supabaseClient
      .from('media_files')
      .select(
        `
        id,
        file_name,
        upload_status,
        download_url,
        created_at,
        updated_at
      `
      )
      .eq('created_by', publicUserId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (mediaFileIds && mediaFileIds.length > 0) {
      query = query.in('id', mediaFileIds);
    } else if (batchId) {
      // If using batch tracking, we'd need to add batch_id to media_files table
      // For now, filter by recent uploads (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', oneHourAgo);
    } else {
      // Default: show uploads from last 2 hours
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
      ).toISOString();
      query = query.gte('created_at', twoHoursAgo);
    }

    const { data: mediaFiles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch media files: ${fetchError.message}`);
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            batchId,
            totalFiles: 0,
            pendingCount: 0,
            uploadingCount: 0,
            completedCount: 0,
            failedCount: 0,
            progress: {
              percentage: 100,
              status: 'completed' as const,
            },
            files: [],
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate status counts
    const pendingCount = mediaFiles.filter(
      f => f.upload_status === 'pending'
    ).length;
    const uploadingCount = mediaFiles.filter(
      f => f.upload_status === 'uploading'
    ).length;
    const completedCount = mediaFiles.filter(
      f => f.upload_status === 'completed'
    ).length;
    const failedCount = mediaFiles.filter(
      f => f.upload_status === 'failed'
    ).length;
    const totalFiles = mediaFiles.length;

    // Calculate overall progress
    const completedOrFailed = completedCount + failedCount;
    const percentage =
      totalFiles > 0 ? Math.round((completedOrFailed / totalFiles) * 100) : 100;

    // Determine overall status
    let overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    if (pendingCount === totalFiles) {
      overallStatus = 'pending';
    } else if (completedOrFailed === totalFiles) {
      overallStatus = failedCount === totalFiles ? 'failed' : 'completed';
    } else {
      overallStatus = 'in_progress';
    }

    // Format file data for response
    const files = mediaFiles.map(file => ({
      mediaFileId: file.id,
      fileName: file.file_name || 'unknown',
      status: file.upload_status || 'unknown',
      downloadUrl: file.download_url || undefined,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    const response: UploadProgressResponse = {
      success: true,
      data: {
        batchId,
        totalFiles,
        pendingCount,
        uploadingCount,
        completedCount,
        failedCount,
        progress: {
          percentage,
          status: overallStatus,
        },
        files,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Upload progress check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to check upload progress',
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
