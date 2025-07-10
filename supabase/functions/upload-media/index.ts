import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-service.ts';

// CORS headers for frontend requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supported file types and their MIME types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadRequest {
  fileName: string;
  mediaType: 'audio' | 'video';
  languageEntityId: string;
  projectId?: string;
  targetType?:
    | 'chapter'
    | 'book'
    | 'verse'
    | 'passage'
    | 'sermon'
    | 'podcast'
    | 'film_segment'
    | 'audio_segment';
  targetId?: string;
  isBibleAudio?: boolean;
  metadata?: Record<string, string>;
}

interface UploadResponse {
  success: boolean;
  data?: {
    mediaFileId: string;
    downloadUrl: string;
    fileSize: number;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') },
        },
      }
    );

    // Get authenticated user (optional for testing)
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Handle both JSON data format and individual form fields
    const requestData = formData.get('data') as string;
    let uploadRequest: UploadRequest;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (requestData) {
      // JSON format
      try {
        uploadRequest = JSON.parse(requestData) as UploadRequest;
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid metadata format' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Individual form fields format
      const targetType = formData.get('target_type') as string;
      const targetId = formData.get('target_id') as string;
      const languageEntityId =
        (formData.get('language_entity_id') as string) || 'default-language-id';
      const projectId = formData.get('project_id') as string;
      const isBibleAudio = formData.get('is_bible_audio') === 'true';

      // Determine media type from file type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'audio';

      uploadRequest = {
        fileName: file.name,
        mediaType,
        languageEntityId,
        projectId,
        targetType: targetType as any,
        targetId,
        isBibleAudio,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file type (use extension as fallback for octet-stream)
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const supportedTypes =
      uploadRequest.mediaType === 'audio'
        ? SUPPORTED_AUDIO_TYPES
        : SUPPORTED_VIDEO_TYPES;

    const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

    // Check MIME type first, then fallback to extension
    let isValidType = supportedTypes.includes(file.type);

    if (!isValidType && file.type === 'application/octet-stream') {
      // Fallback to extension checking
      if (uploadRequest.mediaType === 'audio') {
        isValidType = audioExtensions.includes(fileExtension ?? '');
      } else {
        isValidType = videoExtensions.includes(fileExtension ?? '');
      }
    }

    if (!isValidType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported file type '${file.type}' for file '${file.name}'. Supported types: ${supportedTypes.join(', ')}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (
      !uploadRequest.fileName ||
      !uploadRequest.mediaType ||
      !uploadRequest.languageEntityId
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required fields: fileName, mediaType, languageEntityId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create media file record with initial status
    const { data: mediaFile, error: dbError } = await supabaseClient
      .from('media_files')
      .insert({
        language_entity_id: uploadRequest.languageEntityId,
        media_type: uploadRequest.mediaType,
        project_id: uploadRequest.projectId,
        created_by: user?.id ?? null,
        upload_status: 'uploading',
        publish_status: 'pending',
        file_size: file.size,
        version: 1,
      })
      .select()
      .single();

    if (dbError || !mediaFile) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error',
          details: dbError?.message ?? 'Unknown database error',
          code: dbError?.code ?? 'UNKNOWN',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Initialize B2 service
      const b2Service = new B2StorageService();

      // Convert file to bytes
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // Upload to B2
      const uploadResult = await b2Service.uploadFile(
        fileBytes,
        uploadRequest.fileName,
        file.type,
        {
          'media-type': uploadRequest.mediaType,
          'language-entity-id': uploadRequest.languageEntityId,
          'project-id': uploadRequest.projectId ?? '',
          'uploaded-by': user?.id ?? 'anonymous',
          ...uploadRequest.metadata,
        }
      );

      // Update media file record with upload results
      const { error: updateError } = await supabaseClient
        .from('media_files')
        .update({
          remote_path: uploadResult.downloadUrl,
          upload_status: 'completed',
          file_size: uploadResult.fileSize,
          duration_seconds: null,
        })
        .eq('id', mediaFile.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        // Try to clean up B2 file
        try {
          await b2Service.deleteFile(
            uploadResult.fileId,
            uploadResult.fileName
          );
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to update database',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create target association if specified
      if (uploadRequest.targetType && uploadRequest.targetId) {
        const { error: targetError } = await supabaseClient
          .from('media_files_targets')
          .insert({
            media_file_id: mediaFile.id,
            target_type: uploadRequest.targetType,
            target_id: uploadRequest.targetId,
            is_bible_audio: uploadRequest.isBibleAudio ?? false,
            created_by: user.id,
          });

        if (targetError) {
          console.error('Target association error:', targetError);
          // Don't fail the upload, just log the error
        }
      }

      // Return success response
      const response: UploadResponse = {
        success: true,
        data: {
          mediaFileId: mediaFile.id,
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);

      // Update database to reflect failed upload
      await supabaseClient
        .from('media_files')
        .update({ upload_status: 'failed' })
        .eq('id', mediaFile.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Upload failed: ${(uploadError as Error).message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
