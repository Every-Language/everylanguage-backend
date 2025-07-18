import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  validateUploadRequest,
  validateLanguageEntity,
  validateProject,
  validateTargetId,
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
    // const { data: { user } } = await supabaseClient.auth.getUser();

    // Parse request data
    let parsedData;
    try {
      parsedData = await parseUploadRequest(req);
    } catch (parseError: unknown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request parsing failed',
          details:
            parseError instanceof Error
              ? parseError.message
              : 'Unknown parsing error',
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
    } catch (validationError: unknown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database validation failed',
          details:
            validationError instanceof Error
              ? validationError.message
              : 'Unknown validation error',
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
    const providedDuration = uploadRequest.duration;
    if (providedDuration) {
      console.log(`⏱️ Provided duration: ${providedDuration} seconds`);
    }

    // TODO: The rest of the upload logic would go here
    // For now, return a placeholder response
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Upload functionality temporarily disabled',
        details: 'This endpoint is being updated',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
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
