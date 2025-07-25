import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import { corsHeaders } from '../_shared/request-parser.ts';
import { validateBibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import type { BibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import { getPublicUserId } from '../_shared/user-service.ts';

interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    mediaRecords: Array<{
      mediaFileId: string;
      fileName: string;
      status: 'completed' | 'failed';
      uploadResult?: {
        downloadUrl: string;
        fileSize: number;
        version: number;
      };
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

    // Parse multipart form data for bulk upload
    const formData = await req.formData();
    const files: File[] = [];
    const metadata: BibleChapterUploadRequest[] = [];

    // Extract files and their corresponding metadata
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_')) {
        files.push(value as File);
      } else if (key.startsWith('metadata_')) {
        try {
          const metadataObj = JSON.parse(value as string);
          metadata.push(metadataObj);
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Invalid metadata format for ${key}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No files provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (files.length !== metadata.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mismatch between number of files and metadata entries',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🎵 Starting bulk upload of ${files.length} files`);

    // === PHASE 1: VALIDATION AND RECORD CREATION ===
    const mediaRecords = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadRequest = metadata[i];

      try {
        // Validate each request
        await validateBibleChapterUploadRequest(
          supabaseClient,
          uploadRequest,
          file
        );

        // Get next version for this chapter
        const nextVersion = await getNextVersionForChapter(supabaseClient, {
          projectId: uploadRequest.projectId,
          startVerseId: uploadRequest.startVerseId,
          endVerseId: uploadRequest.endVerseId,
        });

        // Create media file record with 'pending' status
        const mediaFile = await createBibleChapterMediaFile(supabaseClient, {
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
          status: 'pending', // Key difference from single upload
        });

        mediaRecords.push({
          mediaFileId: mediaFile.id,
          fileName: uploadRequest.fileName,
          file,
          uploadRequest,
          version: nextVersion,
          status: 'pending' as const,
        });

        console.log(`✅ Created pending record for: ${uploadRequest.fileName}`);
      } catch (validationError: unknown) {
        console.error(
          `❌ Validation failed for ${uploadRequest.fileName}:`,
          validationError
        );

        // Still create a record but mark it as failed
        try {
          const failedMediaFile = await createBibleChapterMediaFile(
            supabaseClient,
            {
              languageEntityId: uploadRequest.languageEntityId,
              audioVersionId: uploadRequest.audioVersionId,
              projectId: uploadRequest.projectId,
              createdBy: publicUserId,
              fileSize: file.size,
              durationSeconds: uploadRequest.durationSeconds,
              version: 1,
              chapterId: uploadRequest.chapterId,
              startVerseId: uploadRequest.startVerseId,
              endVerseId: uploadRequest.endVerseId,
              status: 'failed',
            }
          );

          mediaRecords.push({
            mediaFileId: failedMediaFile.id,
            fileName: uploadRequest.fileName,
            file,
            uploadRequest,
            version: 1,
            status: 'failed' as const,
            error:
              validationError instanceof Error
                ? validationError.message
                : 'Validation failed',
          });
        } catch {
          // If we can't even create a failed record, we'll handle it in the response
          mediaRecords.push({
            mediaFileId: '',
            fileName: uploadRequest.fileName,
            file,
            uploadRequest,
            version: 1,
            status: 'failed' as const,
            error: 'Failed to create database record',
          });
        }
      }
    }

    console.log(`📋 Created ${mediaRecords.length} database records`);

    // === PHASE 2: CONCURRENT UPLOADS ===
    const b2Service = new B2StorageService();
    const uploadResults = [];

    // Process uploads with controlled concurrency (5 at a time)
    const batchSize = 5;
    for (let i = 0; i < mediaRecords.length; i += batchSize) {
      const batch = mediaRecords.slice(i, i + batchSize);

      const batchPromises = batch.map(async record => {
        if (record.status === 'failed' || !record.mediaFileId) {
          return {
            mediaFileId: record.mediaFileId,
            fileName: record.fileName,
            status: 'failed' as const,
            error: record.error ?? 'Pre-upload validation failed',
          };
        }

        try {
          // Update status to 'uploading'
          await supabaseClient
            .from('media_files')
            .update({ upload_status: 'uploading' })
            .eq('id', record.mediaFileId);

          console.log(`⬆️ Starting upload for: ${record.fileName}`);

          // Upload file to B2
          const fileBuffer = await record.file.arrayBuffer();
          const fileBytes = new Uint8Array(fileBuffer);

          const uploadResult = await b2Service.uploadFile(
            fileBytes,
            record.uploadRequest.fileName,
            record.file.type,
            {
              'media-type': 'audio',
              'language-entity-id': record.uploadRequest.languageEntityId,
              'project-id': record.uploadRequest.projectId ?? '',
              'chapter-id': record.uploadRequest.chapterId,
              'is-bible-audio': 'true',
              version: record.version.toString(),
              'uploaded-by': publicUserId,
            }
          );

          // Update media file record with upload results
          await supabaseClient
            .from('media_files')
            .update({
              upload_status: 'completed',
              remote_path: uploadResult.downloadUrl,
              file_size: uploadResult.fileSize,
            })
            .eq('id', record.mediaFileId);

          // Create verse timing records if provided
          if (
            record.uploadRequest.verseTimings &&
            record.uploadRequest.verseTimings.length > 0
          ) {
            await createMediaFileVerses(supabaseClient, {
              mediaFileId: record.mediaFileId,
              verseTimings: record.uploadRequest.verseTimings,
              createdBy: publicUserId,
            });
          }

          // Create tag associations if provided
          if (
            record.uploadRequest.tagIds &&
            record.uploadRequest.tagIds.length > 0
          ) {
            await createMediaFileTags(supabaseClient, {
              mediaFileId: record.mediaFileId,
              tagIds: record.uploadRequest.tagIds,
              createdBy: publicUserId,
            });
          }

          console.log(`✅ Completed upload for: ${record.fileName}`);

          return {
            mediaFileId: record.mediaFileId,
            fileName: record.fileName,
            status: 'completed' as const,
            uploadResult: {
              downloadUrl: uploadResult.downloadUrl,
              fileSize: uploadResult.fileSize,
              version: record.version,
            },
          };
        } catch (uploadError: unknown) {
          console.error(
            `❌ Upload failed for ${record.fileName}:`,
            uploadError
          );

          // Update database to reflect failed upload
          try {
            await supabaseClient
              .from('media_files')
              .update({ upload_status: 'failed' })
              .eq('id', record.mediaFileId);
          } catch (dbError) {
            console.error(
              `❌ Failed to update status for ${record.fileName}:`,
              dbError
            );
          }

          return {
            mediaFileId: record.mediaFileId,
            fileName: record.fileName,
            status: 'failed' as const,
            error:
              uploadError instanceof Error
                ? uploadError.message
                : 'Upload failed',
          };
        }
      });

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.allSettled(batchPromises);

      // Extract results from settled promises
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          uploadResults.push(result.value);
        } else {
          uploadResults.push({
            mediaFileId: '',
            fileName: 'unknown',
            status: 'failed' as const,
            error: 'Promise rejection',
          });
        }
      }

      console.log(
        `📦 Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mediaRecords.length / batchSize)}`
      );
    }

    // === PREPARE RESPONSE ===
    const successfulUploads = uploadResults.filter(
      r => r.status === 'completed'
    ).length;
    const failedUploads = uploadResults.filter(
      r => r.status === 'failed'
    ).length;

    console.log(
      `🎉 Bulk upload completed: ${successfulUploads} successful, ${failedUploads} failed`
    );

    const response: BulkUploadResponse = {
      success: true,
      data: {
        totalFiles: files.length,
        successfulUploads,
        failedUploads,
        mediaRecords: uploadResults,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Bulk upload error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Bulk upload failed',
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

// Helper function to create Bible chapter media file (modified to accept status)
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
    status?: 'pending' | 'failed';
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
      upload_status: data.status ?? 'pending',
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
