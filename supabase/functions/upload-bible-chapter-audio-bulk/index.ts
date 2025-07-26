import { corsHeaders } from '../_shared/request-parser.ts';
import { validateBibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import type { BibleChapterUploadRequest } from '../_shared/bible-chapter-validation.ts';
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';
import {
  createBibleChapterMediaFile,
  getNextVersionForChapter,
  createMediaFileVerses,
  createMediaFileTags,
  updateMediaFileUploadResults,
  markMediaFileAsFailed,
  updateMediaFileStatus,
} from '../_shared/bible-chapter-database.ts';
import { B2StorageService } from '../_shared/b2-storage-service.ts';

interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string; // For tracking this upload batch
    mediaRecords: Array<{
      mediaFileId: string;
      fileName: string;
      status: 'pending' | 'failed';
      version: number;
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

    const { supabaseClient, publicUserId } = authResult;

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

    const batchId = crypto.randomUUID();
    console.log(
      `🚀 Starting bulk upload of ${files.length} files (batch: ${batchId})`
    );

    // === PHASE 1: IMMEDIATE VALIDATION AND RECORD CREATION ===
    const mediaRecords = [];
    const pendingUploads = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadataObj = metadata[i];

      // Normalize metadata format (support both camelCase and snake_case)
      const uploadRequest: BibleChapterUploadRequest = {
        fileName: (metadataObj.fileName || metadataObj.filename) ?? file.name,
        languageEntityId:
          metadataObj.languageEntityId || metadataObj.language_entity_id,
        chapterId: metadataObj.chapterId || metadataObj.chapter_id,
        startVerseId: metadataObj.startVerseId || metadataObj.start_verse_id,
        endVerseId: metadataObj.endVerseId || metadataObj.end_verse_id,
        durationSeconds:
          metadataObj.durationSeconds || metadataObj.duration_seconds,
        audioVersionId:
          metadataObj.audioVersionId || metadataObj.audio_version_id,
        verseTimings: metadataObj.verseTimings ?? metadataObj.verse_timings,
        tagIds: metadataObj.tagIds ?? metadataObj.tag_ids,
      };

      try {
        // Validate the upload request
        await validateBibleChapterUploadRequest(
          supabaseClient,
          uploadRequest,
          file
        );

        // Get next version for this chapter
        const nextVersion = await getNextVersionForChapter(supabaseClient, {
          startVerseId: uploadRequest.startVerseId,
          endVerseId: uploadRequest.endVerseId,
        });

        // Create media file record with 'pending' status
        const mediaFile = await createBibleChapterMediaFile(supabaseClient, {
          languageEntityId: uploadRequest.languageEntityId,
          audioVersionId: uploadRequest.audioVersionId,
          createdBy: publicUserId,
          fileSize: file.size,
          durationSeconds: uploadRequest.durationSeconds,
          version: nextVersion,
          chapterId: uploadRequest.chapterId,
          startVerseId: uploadRequest.startVerseId,
          endVerseId: uploadRequest.endVerseId,
          status: 'pending',
        });

        // Store for response
        mediaRecords.push({
          mediaFileId: mediaFile.id,
          fileName: uploadRequest.fileName,
          status: 'pending' as const,
          version: nextVersion,
        });

        // Store for background processing
        pendingUploads.push({
          mediaFileId: mediaFile.id,
          file,
          uploadRequest,
          version: nextVersion,
        });

        console.log(`✅ Created pending record: ${uploadRequest.fileName}`);
      } catch (validationError: unknown) {
        console.error(
          `❌ Validation failed for ${uploadRequest.fileName}:`,
          validationError
        );

        // Create failed record for immediate feedback
        try {
          const failedMediaFile = await createBibleChapterMediaFile(
            supabaseClient,
            {
              languageEntityId: uploadRequest.languageEntityId,
              audioVersionId: uploadRequest.audioVersionId,
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
            status: 'failed' as const,
            version: 1,
            error:
              validationError instanceof Error
                ? validationError.message
                : 'Validation failed',
          });
        } catch {
          // If we can't create a record, add to response anyway
          mediaRecords.push({
            mediaFileId: '',
            fileName: uploadRequest.fileName,
            status: 'failed' as const,
            version: 1,
            error: 'Failed to create database record',
          });
        }
      }
    }

    console.log(
      `📋 Created ${mediaRecords.length} records (${pendingUploads.length} pending uploads)`
    );

    // === PHASE 2: RETURN IMMEDIATELY WITH RECORD INFO ===
    const response: BulkUploadResponse = {
      success: true,
      data: {
        totalFiles: files.length,
        batchId,
        mediaRecords,
      },
    };

    // Start background processing (no await - fire and forget)
    if (pendingUploads.length > 0) {
      processUploadsInBackground(
        supabaseClient,
        publicUserId,
        pendingUploads,
        batchId
      );
    }

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

// Background processing function (fire and forget)
async function processUploadsInBackground(
  supabaseClient: any,
  publicUserId: string,
  pendingUploads: any[],
  batchId: string
) {
  console.log(`🔄 Starting background processing for batch ${batchId}`);

  const b2Service = new B2StorageService();

  // Process uploads with controlled concurrency (3 at a time for better resource management)
  const batchSize = 3;

  for (let i = 0; i < pendingUploads.length; i += batchSize) {
    const batch = pendingUploads.slice(i, i + batchSize);

    const batchPromises = batch.map(async record => {
      try {
        // Update status to 'uploading'
        await updateMediaFileStatus(
          supabaseClient,
          record.mediaFileId,
          'uploading'
        );

        console.log(`⬆️ Uploading: ${record.uploadRequest.fileName}`);

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
            'chapter-id': record.uploadRequest.chapterId,
            'is-bible-audio': 'true',
            'batch-id': batchId,
            version: record.version.toString(),
            'uploaded-by': publicUserId,
          }
        );

        // Update media file with upload results
        await updateMediaFileUploadResults(supabaseClient, record.mediaFileId, {
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
        });

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

        console.log(`✅ Completed: ${record.uploadRequest.fileName}`);
        return { success: true, fileName: record.uploadRequest.fileName };
      } catch (uploadError: unknown) {
        console.error(
          `❌ Upload failed for ${record.uploadRequest.fileName}:`,
          uploadError
        );

        // Mark as failed
        await markMediaFileAsFailed(supabaseClient, record.mediaFileId);

        return {
          success: false,
          fileName: record.uploadRequest.fileName,
          error:
            uploadError instanceof Error
              ? uploadError.message
              : 'Upload failed',
        };
      }
    });

    // Wait for current batch to complete
    await Promise.allSettled(batchPromises);

    console.log(
      `📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingUploads.length / batchSize)} completed`
    );
  }

  console.log(`🎉 Background processing completed for batch ${batchId}`);
}
