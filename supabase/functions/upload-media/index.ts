import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import {
  validateUploadRequest,
  validateLanguageEntity,
  validateProject,
  validateTargetId,
  UploadResponse,
} from '../_shared/media-validation.ts';
import { MediaService } from '../_shared/media-service.ts';
import { parseUploadRequest, corsHeaders } from '../_shared/request-parser.ts';

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

    // Get authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    // Parse request data
    let parsedData;
    try {
      parsedData = await parseUploadRequest(req);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request parsing failed',
          details: parseError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { file, uploadRequest } = parsedData;

    // === VALIDATION PHASE ===
    const validationErrors = validateUploadRequest(uploadRequest, file);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validationErrors.join('; '),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // === DATABASE VALIDATION PHASE ===
    try {
      // Validate language entity
      const languageEntity = await validateLanguageEntity(
        supabaseClient,
        uploadRequest.languageEntityId
      );
      console.log(
        `✅ Language entity validated: ${languageEntity.name} (${languageEntity.level})`
      );

      // Validate project (if provided)
      let project = null;
      if (uploadRequest.projectId) {
        project = await validateProject(
          supabaseClient,
          uploadRequest.projectId
        );
        console.log(`✅ Project validated: ${project.name}`);
      }

      // Validate target ID (if both targetType and targetId provided)
      if (uploadRequest.targetType && uploadRequest.targetId) {
        await validateTargetId(
          supabaseClient,
          uploadRequest.targetType,
          uploadRequest.targetId
        );
        console.log(
          `✅ Target validated: ${uploadRequest.targetType} ${uploadRequest.targetId}`
        );
      }
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database validation failed',
          details: validationError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // === MEDIA PROCESSING PHASE ===
    const mediaService = new MediaService(supabaseClient);

    // Get next version number
    const nextVersion = await mediaService.getNextVersion(
      uploadRequest.fileName,
      uploadRequest.languageEntityId
    );
    console.log(
      `📈 Next version for ${uploadRequest.fileName}: ${nextVersion}`
    );

    // Use provided duration or null if not provided
    const providedDuration = uploadRequest.durationSeconds;
    if (providedDuration) {
      console.log(`⏱️ Provided duration: ${providedDuration} seconds`);
    }

    // Get authenticated user for database operations
    const publicUser = await mediaService.getAuthenticatedUser(user?.id);

    // Create media file record
    let mediaFile;
    try {
      mediaFile = await mediaService.createMediaFile({
        languageEntityId: uploadRequest.languageEntityId,
        mediaType: uploadRequest.mediaType,
        projectId: uploadRequest.projectId,
        createdBy: publicUser?.id ?? null,
        fileSize: file.size,
        durationSeconds: providedDuration,
        version: nextVersion,
      });
    } catch (dbError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error',
          details: dbError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // === UPLOAD PHASE ===
    try {
      // Upload to B2 using the new service
      const b2Service = new B2StorageService();
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      const uploadResult = await b2Service.uploadFile(
        fileBytes,
        uploadRequest.fileName,
        file.type,
        {
          'media-type': uploadRequest.mediaType,
          'language-entity-id': uploadRequest.languageEntityId,
          'project-id': uploadRequest.projectId ?? '',
          version: nextVersion.toString(),
          'uploaded-by': user?.id ?? 'anonymous',
          ...uploadRequest.metadata,
        }
      );

      // Update media file record with upload results
      await mediaService.updateMediaFileAfterUpload(
        mediaFile.id,
        uploadResult.downloadUrl,
        uploadResult.fileSize
      );

      // Create target association if specified
      if (uploadRequest.targetType && uploadRequest.targetId) {
        await mediaService.createTargetAssociation({
          mediaFileId: mediaFile.id,
          targetType: uploadRequest.targetType,
          targetId: uploadRequest.targetId,
          isBibleAudio: uploadRequest.isBibleAudio ?? false,
          createdBy: publicUser?.id ?? null,
        });
      }

      // Return success response
      const response: UploadResponse = {
        success: true,
        data: {
          mediaFileId: mediaFile.id,
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
          version: nextVersion,
          duration: providedDuration,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);

      // Update database to reflect failed upload
      await mediaService.markUploadFailed(mediaFile.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Upload failed: ${uploadError.message}`,
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
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error?.message ?? 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
