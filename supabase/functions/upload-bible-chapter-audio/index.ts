import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { corsHeaders } from '../_shared/request-parser.ts';
import {
  validateBibleChapterUploadRequest,
  parseAndValidateBibleChapterRequest,
} from '../_shared/bible-chapter-validation.ts';
import type { BibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import { getPublicUserIdFast } from '../_shared/user-service.ts';
import {
  createBibleChapterMediaFile,
  getNextVersionForChapter,
  createMediaFileVerses,
  createMediaFileTags,
} from '../_shared/bible-chapter-database.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
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
    // Optimization: Since public.users.id now equals auth.users.id, use fast getter
    const publicUserId = getPublicUserIdFast(user.id);
    if (!publicUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid user ID',
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
      startVerseId: uploadRequest.startVerseId,
      endVerseId: uploadRequest.endVerseId,
    });

    // Create media file record
    let mediaFile;
    try {
      mediaFile = await createBibleChapterMediaFile(supabaseClient, {
        languageEntityId: uploadRequest.languageEntityId,
        audioVersionId: uploadRequest.audioVersionId,
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
