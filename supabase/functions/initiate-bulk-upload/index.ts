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
} from '../_shared/bible-chapter-database.ts';

interface BulkUploadInitiationRequest {
  files: Array<{
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;
  metadata: BibleChapterUploadRequest[];
}

interface MediaFileRecord {
  mediaFileId: string;
  queueItemId: string; // Add queue item ID
  fileName: string;
  status: 'pending' | 'failed';
  version: number;
  uploadRequest?: BibleChapterUploadRequest;
  error?: string;
}

interface BulkUploadInitiationResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    validRecords: number;
    invalidRecords: number;
    queueId: string; // For tracking the bulk operation
    mediaRecords: MediaFileRecord[];
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

    // Parse request body
    let requestData: BulkUploadInitiationRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { files, metadata } = requestData;

    if (files.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Files and metadata are required',
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

    console.log(`🚀 Initiating bulk upload for ${files.length} files`);

    // Generate a unique queue ID for tracking this bulk operation
    const queueId = crypto.randomUUID();

    // === VALIDATION AND RECORD CREATION PHASE ===
    const mediaRecords: MediaFileRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const metadataObj = metadata[i];

      // Create a mock File object for validation
      const mockFile = {
        name: file.fileName,
        size: file.fileSize,
        type: file.contentType,
      } as File;

      try {
        // Validate the upload request
        await validateBibleChapterUploadRequest(
          supabaseClient,
          metadataObj,
          mockFile
        );

        // Get next version for this chapter
        const nextVersion = await getNextVersionForChapter(supabaseClient, {
          startVerseId: metadataObj.startVerseId,
          endVerseId: metadataObj.endVerseId,
        });

        // Create media file record with 'pending' status
        const mediaFile = await createBibleChapterMediaFile(supabaseClient, {
          languageEntityId: metadataObj.languageEntityId,
          audioVersionId: metadataObj.audioVersionId,
          createdBy: publicUserId,
          fileSize: file.fileSize,
          durationSeconds: metadataObj.durationSeconds,
          version: nextVersion,
          chapterId: metadataObj.chapterId,
          startVerseId: metadataObj.startVerseId,
          endVerseId: metadataObj.endVerseId,
          status: 'pending',
        });

        // Create verse timing records if provided
        if (metadataObj.verseTimings && metadataObj.verseTimings.length > 0) {
          await createMediaFileVerses(supabaseClient, {
            mediaFileId: mediaFile.id,
            verseTimings: metadataObj.verseTimings,
            createdBy: publicUserId,
          });
        }

        // Create tag associations if provided
        if (metadataObj.tagIds && metadataObj.tagIds.length > 0) {
          await createMediaFileTags(supabaseClient, {
            mediaFileId: mediaFile.id,
            tagIds: metadataObj.tagIds,
            createdBy: publicUserId,
          });
        }

        // Add queue metadata for background processing
        const queueInsertResult = await supabaseClient
          .from('upload_queue')
          .insert({
            id: crypto.randomUUID(),
            queue_id: queueId,
            media_file_id: mediaFile.id,
            file_name: file.fileName,
            file_size: file.fileSize,
            content_type: file.contentType,
            upload_request: metadataObj,
            status: 'queued',
            created_by: publicUserId,
          })
          .select()
          .single();

        if (queueInsertResult.error) {
          throw new Error(
            `Failed to create queue item: ${queueInsertResult.error.message}`
          );
        }

        mediaRecords.push({
          mediaFileId: mediaFile.id,
          queueItemId: queueInsertResult.data.id,
          fileName: file.fileName,
          status: 'pending',
          version: nextVersion,
          uploadRequest: metadataObj,
        });

        console.log(`✅ Created pending record for: ${file.fileName}`);
      } catch (validationError: unknown) {
        console.error(
          `❌ Validation failed for ${file.fileName}:`,
          validationError
        );

        // Still create a record but mark it as failed
        try {
          const failedMediaFile = await createBibleChapterMediaFile(
            supabaseClient,
            {
              languageEntityId: metadataObj.languageEntityId,
              audioVersionId: metadataObj.audioVersionId,
              createdBy: publicUserId,
              fileSize: file.fileSize,
              durationSeconds: metadataObj.durationSeconds,
              version: 1,
              chapterId: metadataObj.chapterId,
              startVerseId: metadataObj.startVerseId,
              endVerseId: metadataObj.endVerseId,
              status: 'failed',
            }
          );

          mediaRecords.push({
            mediaFileId: failedMediaFile.id,
            queueItemId: '', // No queue item for failed records
            fileName: file.fileName,
            status: 'failed',
            version: 1,
            error:
              validationError instanceof Error
                ? validationError.message
                : 'Validation failed',
          });
        } catch {
          // If we can't even create a failed record
          mediaRecords.push({
            mediaFileId: '',
            queueItemId: '', // No queue item for failed records
            fileName: file.fileName,
            status: 'failed',
            version: 1,
            error: 'Failed to create database record',
          });
        }
      }
    }

    const validRecords = mediaRecords.filter(
      r => r.status === 'pending'
    ).length;
    const invalidRecords = mediaRecords.filter(
      r => r.status === 'failed'
    ).length;

    console.log(
      `📋 Created ${mediaRecords.length} records (${validRecords} valid, ${invalidRecords} invalid)`
    );

    // Return immediately with record information
    const response: BulkUploadInitiationResponse = {
      success: true,
      data: {
        totalFiles: files.length,
        validRecords,
        invalidRecords,
        queueId,
        mediaRecords,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Bulk upload initiation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Bulk upload initiation failed',
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
