import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { corsHeaders } from '../_shared/request-parser.ts';
import {
  validateBibleChapterUploadRequest,
  parseAndValidateBibleChapterRequest,
} from '../_shared/bible-chapter-validation.ts';
import type { BibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';

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

    if (!user) {
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

    // Parse request data
    let parsedData: { file: File; uploadRequest: BibleChapterUploadRequest };
    try {
      parsedData = await parseAndValidateBibleChapterRequest(req);
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
    try {
      await validateBibleChapterUploadRequest(
        supabaseClient,
        uploadRequest,
        file
      );
      console.log('✅ Bible chapter upload validation passed');
    } catch (validationError: unknown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
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
    // The MediaService class and its methods are no longer imported,
    // so these operations are removed.
    // const mediaService = new MediaService(supabaseClient);

    // Get next version number
    // const nextVersion = await mediaService.getNextVersion(
    //   uploadRequest.fileName,
    //   uploadRequest.languageEntityId
    // );
    // console.log(
    //   `📈 Next version for ${uploadRequest.fileName}: ${nextVersion}`
    // );

    // Get authenticated user for database operations
    // const publicUser = await mediaService.getAuthenticatedUser(user?.id);

    // Create media file record
    let mediaFile;
    try {
      mediaFile = await createBibleChapterMediaFile(supabaseClient, {
        languageEntityId: uploadRequest.languageEntityId,
        projectId: uploadRequest.projectId,
        createdBy: user?.id ?? null,
        fileSize: file.size,
        durationSeconds: uploadRequest.durationSeconds,
        version: 1, // Placeholder, actual version will be handled by B2StreamService
        startVerseId: uploadRequest.startVerseId,
        endVerseId: uploadRequest.endVerseId,
      });
    } catch (dbError: unknown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error creating media file',
          details:
            dbError instanceof Error
              ? dbError.message
              : 'Unknown database error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // === UPLOAD PHASE ===
    try {
      // Upload to B2 using the existing service
      const b2Service = new B2StorageService();
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      const uploadResult = await b2Service.uploadFile(
        fileBytes,
        uploadRequest.fileName,
        file.type,
        {
          'media-type': 'audio',
          'language-entity-id': uploadRequest.languageEntityId,
          'project-id': uploadRequest.projectId ?? '',
          'chapter-id': uploadRequest.chapterId,
          'is-bible-audio': 'true',
          version: '1', // Placeholder, actual version will be handled by B2StreamService
          'uploaded-by': user?.id ?? 'anonymous',
        }
      );

      // Update media file record with upload results
      // await mediaService.updateMediaFileAfterUpload(
      //   mediaFile.id,
      //   uploadResult.downloadUrl,
      //   uploadResult.fileSize
      // );

      // Create target association (chapter)
      // await mediaService.createTargetAssociation({
      //   mediaFileId: mediaFile.id,
      //   targetType: 'chapter',
      //   targetId: uploadRequest.chapterId,
      //   isBibleAudio: true,
      //   createdBy: publicUser?.id ?? null,
      // });

      // Create verse timing records if provided
      if (uploadRequest.verseTimings && uploadRequest.verseTimings.length > 0) {
        await createMediaFileVerses(supabaseClient, {
          mediaFileId: mediaFile.id,
          verseTimings: uploadRequest.verseTimings,
          createdBy: user?.id ?? null,
        });
      }

      // Create tag associations if provided
      if (uploadRequest.tagIds && uploadRequest.tagIds.length > 0) {
        await createMediaFileTags(supabaseClient, {
          mediaFileId: mediaFile.id,
          tagIds: uploadRequest.tagIds,
          createdBy: user?.id ?? null,
        });
      }

      // Return success response
      const response = {
        success: true,
        data: {
          mediaFileId: mediaFile.id,
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
          version: 1, // Placeholder, actual version will be handled by B2StreamService
          duration: uploadRequest.durationSeconds,
          chapterId: uploadRequest.chapterId,
          startVerseId: uploadRequest.startVerseId,
          endVerseId: uploadRequest.endVerseId,
          verseRecordsCreated: uploadRequest.verseTimings?.length ?? 0,
          tagRecordsCreated: uploadRequest.tagIds?.length ?? 0,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (uploadError: unknown) {
      console.error('Upload error:', uploadError);

      // Update database to reflect failed upload
      // await mediaService.markUploadFailed(mediaFile.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown upload error'}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
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

// Helper function to create Bible chapter media file
async function createBibleChapterMediaFile(
  supabaseClient: any,
  data: {
    languageEntityId: string;
    projectId?: string;
    createdBy?: string;
    fileSize: number;
    durationSeconds: number;
    version: number;
    startVerseId: string;
    endVerseId: string;
  }
) {
  const { data: mediaFile, error } = await supabaseClient
    .from('media_files')
    .insert({
      language_entity_id: data.languageEntityId,
      media_type: 'audio',
      project_id: data.projectId,
      created_by: data.createdBy,
      upload_status: 'uploading',
      publish_status: 'pending',
      check_status: 'pending',
      file_size: data.fileSize,
      duration_seconds: data.durationSeconds,
      version: data.version,
    })
    .select()
    .single();

  if (error || !mediaFile) {
    throw new Error(
      `Database error: ${error?.message ?? 'Unknown database error'}`
    );
  }

  return mediaFile;
}

// Helper function to create media file verses
async function createMediaFileVerses(
  supabaseClient: any,
  data: {
    mediaFileId: string;
    verseTimings: Array<{
      verseId: string;
      startTimeSeconds: number;
      durationSeconds: number;
    }>;
    createdBy?: string;
  }
) {
  const verseRecords = data.verseTimings.map(timing => ({
    media_file_id: data.mediaFileId,
    verse_id: timing.verseId,
    start_time_seconds: timing.startTimeSeconds,
    duration_seconds: timing.durationSeconds,
    verse_text_id: null,
    created_by: data.createdBy,
  }));

  const { error } = await supabaseClient
    .from('media_files_verses')
    .insert(verseRecords);

  if (error) {
    console.error('Error creating verse timings:', error);
    throw new Error(`Failed to create verse timings: ${error.message}`);
  }

  console.log(`✅ Created ${verseRecords.length} verse timing records`);
}

// Helper function to create media file tags
async function createMediaFileTags(
  supabaseClient: any,
  data: {
    mediaFileId: string;
    tagIds: string[];
    createdBy?: string;
  }
) {
  const tagRecords = data.tagIds.map(tagId => ({
    media_file_id: data.mediaFileId,
    tag_id: tagId,
    created_by: data.createdBy,
  }));

  const { error } = await supabaseClient
    .from('media_files_tags')
    .insert(tagRecords);

  if (error) {
    console.error('Error creating tag associations:', error);
    throw new Error(`Failed to create tag associations: ${error.message}`);
  }

  console.log(`✅ Created ${tagRecords.length} tag association records`);
}
