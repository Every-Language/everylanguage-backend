import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { corsHeaders } from '../_shared/request-parser.ts';
import {
  validateBibleChapterUploadRequest,
  parseAndValidateBibleChapterRequest,
} from '../_shared/bible-chapter-validation.ts';
import type { BibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import { getPublicUserId } from '../_shared/user-service.ts';

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

    // Get the public user ID for database operations
    const publicUserId = await getPublicUserId(supabaseClient, user.id);
    if (!publicUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found in public users table',
        }),
        {
          status: 400,
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

    // Get next version number for this chapter
    const nextVersion = await getNextVersionForChapter(supabaseClient, {
      projectId: uploadRequest.projectId,
      startVerseId: uploadRequest.startVerseId,
      endVerseId: uploadRequest.endVerseId,
    });

    // Create media file record
    let mediaFile;
    try {
      mediaFile = await createBibleChapterMediaFile(supabaseClient, {
        languageEntityId: uploadRequest.languageEntityId,
        audioVersionId: uploadRequest.audioVersionId,
        projectId: uploadRequest.projectId,
        createdBy: publicUserId,
        fileSize: file.size,
        durationSeconds: uploadRequest.durationSeconds,
        version: nextVersion,
        chapterId: uploadRequest.chapterId,
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
          version: nextVersion.toString(),
          'uploaded-by': publicUserId,
        }
      );

      // Update media file record with upload results
      const { error: updateError } = await supabaseClient
        .from('media_files')
        .update({
          upload_status: 'completed',
          remote_path: uploadResult.downloadUrl,
          file_size: uploadResult.fileSize,
        })
        .eq('id', mediaFile.id);

      if (updateError) {
        console.error('Error updating media file after upload:', updateError);
        throw new Error(`Failed to update media file: ${updateError.message}`);
      }

      console.log(`✅ Updated media file ${mediaFile.id} with upload results`);

      // Create verse timing records if provided
      if (uploadRequest.verseTimings && uploadRequest.verseTimings.length > 0) {
        await createMediaFileVerses(supabaseClient, {
          mediaFileId: mediaFile.id,
          verseTimings: uploadRequest.verseTimings,
          createdBy: publicUserId,
        });
      }

      // Create tag associations if provided
      if (uploadRequest.tagIds && uploadRequest.tagIds.length > 0) {
        await createMediaFileTags(supabaseClient, {
          mediaFileId: mediaFile.id,
          tagIds: uploadRequest.tagIds,
          createdBy: publicUserId,
        });
      }

      // Return success response
      const response = {
        success: true,
        data: {
          mediaFileId: mediaFile.id,
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
          version: nextVersion,
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
      try {
        await supabaseClient
          .from('media_files')
          .update({
            upload_status: 'failed',
          })
          .eq('id', mediaFile.id);
        console.log(`❌ Marked media file ${mediaFile.id} as failed`);
      } catch (dbUpdateError) {
        console.error(
          'Error updating media file status to failed:',
          dbUpdateError
        );
      }

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
    audioVersionId: string;
    projectId?: string;
    createdBy: string;
    fileSize: number;
    durationSeconds: number;
    version: number;
    chapterId: string;
    startVerseId: string;
    endVerseId: string;
  }
) {
  const { data: mediaFile, error } = await supabaseClient
    .from('media_files')
    .insert({
      language_entity_id: data.languageEntityId,
      audio_version_id: data.audioVersionId,
      media_type: 'audio',
      project_id: data.projectId,
      created_by: data.createdBy,
      upload_status: 'uploading',
      publish_status: 'pending',
      check_status: 'pending',
      file_size: data.fileSize,
      duration_seconds: data.durationSeconds,
      version: data.version,
      chapter_id: data.chapterId,
      start_verse_id: data.startVerseId,
      end_verse_id: data.endVerseId,
      is_bible_audio: true,
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
    createdBy: string;
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
    createdBy: string;
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

// Helper function to get next version for a chapter
async function getNextVersionForChapter(
  supabaseClient: any,
  data: {
    projectId?: string;
    startVerseId: string;
    endVerseId: string;
  }
): Promise<number> {
  const { data: existingFiles, error } = await supabaseClient
    .from('media_files')
    .select('version')
    .eq('project_id', data.projectId ?? null)
    .eq('start_verse_id', data.startVerseId)
    .eq('end_verse_id', data.endVerseId)
    .order('version', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('Error getting next version for chapter:', error);
    return 1;
  }

  const highestVersion =
    existingFiles && existingFiles.length > 0 ? existingFiles[0].version : 0;

  const nextVersion = highestVersion + 1;
  console.log(
    `📈 Next version for chapter (${data.startVerseId} to ${data.endVerseId}): ${nextVersion}`
  );

  return nextVersion;
}
