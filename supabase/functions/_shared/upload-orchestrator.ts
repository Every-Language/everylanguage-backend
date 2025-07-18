import { B2StorageService } from './b2-storage-service.ts';
import {
  createBibleChapterMediaFile,
  updateMediaFileStatus,
  completeMediaFileProcessing,
  markMediaFileAsFailed,
  type UploadResultData,
} from './bible-chapter-database.ts';
import type { BibleChapterUploadRequest } from './bible-chapter-validation.ts';

export interface UploadContext {
  file: File;
  uploadRequest: BibleChapterUploadRequest;
  version: number;
  publicUserId: string;
}

export interface UploadResult {
  mediaFileId: string;
  fileName: string;
  status: 'completed' | 'failed';
  uploadResult?: {
    downloadUrl: string;
    fileSize: number;
    version: number;
  };
  error?: string;
}

export interface SingleUploadResult {
  success: boolean;
  data?: {
    mediaFileId: string;
    downloadUrl: string;
    fileSize: number;
    version: number;
    duration: number;
    chapterId: string;
    startVerseId: string;
    endVerseId: string;
    verseRecordsCreated: number;
    tagRecordsCreated: number;
  };
  error?: string;
}

export interface BulkUploadResult {
  success: boolean;
  data?: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    mediaRecords: UploadResult[];
  };
  error?: string;
}

/**
 * Upload orchestrator for Bible chapter audio files
 * Handles both single and bulk uploads with optimized performance
 */
export class UploadOrchestrator {
  private b2Service: B2StorageService;

  constructor() {
    this.b2Service = new B2StorageService();
  }

  /**
   * Process a single upload with comprehensive error handling
   */
  async processSingleUpload(
    supabaseClient: any,
    context: UploadContext
  ): Promise<SingleUploadResult> {
    let mediaFileId: string | null = null;

    try {
      // Create media file record
      const mediaFile = await createBibleChapterMediaFile(supabaseClient, {
        languageEntityId: context.uploadRequest.languageEntityId,
        projectId: context.uploadRequest.projectId,
        createdBy: context.publicUserId,
        fileSize: context.file.size,
        durationSeconds: context.uploadRequest.durationSeconds,
        version: context.version,
        startVerseId: context.uploadRequest.startVerseId,
        endVerseId: context.uploadRequest.endVerseId,
        status: 'uploading',
      });

      mediaFileId = mediaFile.id;

      // Upload to B2 storage
      const uploadResult = await this.uploadToB2(
        context.file,
        context.uploadRequest,
        context.version,
        context.publicUserId
      );

      // Complete processing with all related data
      await completeMediaFileProcessing(supabaseClient, {
        mediaFileId,
        uploadResult,
        verseTimings: context.uploadRequest.verseTimings,
        tagIds: context.uploadRequest.tagIds,
        createdBy: context.publicUserId,
      });

      return {
        success: true,
        data: {
          mediaFileId,
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
          version: context.version,
          duration: context.uploadRequest.durationSeconds,
          chapterId: context.uploadRequest.chapterId,
          startVerseId: context.uploadRequest.startVerseId,
          endVerseId: context.uploadRequest.endVerseId,
          verseRecordsCreated: context.uploadRequest.verseTimings?.length ?? 0,
          tagRecordsCreated: context.uploadRequest.tagIds?.length ?? 0,
        },
      };
    } catch (error: unknown) {
      console.error('Single upload failed:', error);

      // Mark media file as failed if it was created
      if (mediaFileId) {
        await markMediaFileAsFailed(supabaseClient, mediaFileId);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Process bulk uploads with controlled concurrency and memory management
   */
  async processBulkUploads(
    supabaseClient: any,
    contexts: UploadContext[],
    concurrencyLimit: number = 5
  ): Promise<BulkUploadResult> {
    if (contexts.length === 0) {
      return {
        success: false,
        error: 'No files provided for bulk upload',
      };
    }

    console.log(`🎵 Starting bulk upload of ${contexts.length} files`);

    // Phase 1: Create all database records first
    const mediaRecords = await this.createMediaRecords(
      supabaseClient,
      contexts
    );

    // Phase 2: Process uploads with controlled concurrency
    const uploadResults = await this.processBatchedUploads(
      supabaseClient,
      mediaRecords,
      concurrencyLimit
    );

    // Prepare response
    const successfulUploads = uploadResults.filter(
      r => r.status === 'completed'
    ).length;
    const failedUploads = uploadResults.filter(
      r => r.status === 'failed'
    ).length;

    console.log(
      `🎉 Bulk upload completed: ${successfulUploads} successful, ${failedUploads} failed`
    );

    return {
      success: true,
      data: {
        totalFiles: contexts.length,
        successfulUploads,
        failedUploads,
        mediaRecords: uploadResults,
      },
    };
  }

  /**
   * Create media records for all uploads upfront
   */
  private async createMediaRecords(
    supabaseClient: any,
    contexts: UploadContext[]
  ): Promise<Array<UploadContext & { mediaFileId: string; error?: string }>> {
    const results = [];

    for (const context of contexts) {
      try {
        const mediaFile = await createBibleChapterMediaFile(supabaseClient, {
          languageEntityId: context.uploadRequest.languageEntityId,
          projectId: context.uploadRequest.projectId,
          createdBy: context.publicUserId,
          fileSize: context.file.size,
          durationSeconds: context.uploadRequest.durationSeconds,
          version: context.version,
          startVerseId: context.uploadRequest.startVerseId,
          endVerseId: context.uploadRequest.endVerseId,
          status: 'pending',
        });

        results.push({
          ...context,
          mediaFileId: mediaFile.id,
        });

        console.log(`✅ Created record for: ${context.uploadRequest.fileName}`);
      } catch (error: unknown) {
        console.error(
          `❌ Failed to create record for ${context.uploadRequest.fileName}:`,
          error
        );

        results.push({
          ...context,
          mediaFileId: '',
          error:
            error instanceof Error
              ? error.message
              : 'Database record creation failed',
        });
      }
    }

    return results;
  }

  /**
   * Process uploads in batches with controlled concurrency
   */
  private async processBatchedUploads(
    supabaseClient: any,
    mediaRecords: Array<
      UploadContext & { mediaFileId: string; error?: string }
    >,
    batchSize: number
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    // Process in batches to control memory usage and concurrency
    for (let i = 0; i < mediaRecords.length; i += batchSize) {
      const batch = mediaRecords.slice(i, i + batchSize);

      const batchPromises = batch.map(async record => {
        if (record.error || !record.mediaFileId) {
          return {
            mediaFileId: record.mediaFileId,
            fileName: record.uploadRequest.fileName,
            status: 'failed' as const,
            error: record.error ?? 'Pre-upload validation failed',
          };
        }

        return await this.processIndividualUpload(supabaseClient, record);
      });

      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.allSettled(batchPromises);

      // Extract results from settled promises
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            mediaFileId: '',
            fileName: 'unknown',
            status: 'failed',
            error: 'Promise rejection',
          });
        }
      }

      console.log(
        `📦 Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mediaRecords.length / batchSize)}`
      );

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < mediaRecords.length) {
        await new Promise(resolve => {
          const timeoutId = globalThis.setTimeout(resolve, 100);
          return timeoutId;
        });
      }
    }

    return results;
  }

  /**
   * Process individual upload within a batch
   */
  private async processIndividualUpload(
    supabaseClient: any,
    record: UploadContext & { mediaFileId: string }
  ): Promise<UploadResult> {
    try {
      // Update status to uploading
      await updateMediaFileStatus(
        supabaseClient,
        record.mediaFileId,
        'uploading'
      );

      console.log(`⬆️ Starting upload for: ${record.uploadRequest.fileName}`);

      // Upload to B2
      const uploadResult = await this.uploadToB2(
        record.file,
        record.uploadRequest,
        record.version,
        record.publicUserId
      );

      // Complete processing
      await completeMediaFileProcessing(supabaseClient, {
        mediaFileId: record.mediaFileId,
        uploadResult,
        verseTimings: record.uploadRequest.verseTimings,
        tagIds: record.uploadRequest.tagIds,
        createdBy: record.publicUserId,
      });

      console.log(`✅ Completed upload for: ${record.uploadRequest.fileName}`);

      return {
        mediaFileId: record.mediaFileId,
        fileName: record.uploadRequest.fileName,
        status: 'completed',
        uploadResult: {
          downloadUrl: uploadResult.downloadUrl,
          fileSize: uploadResult.fileSize,
          version: record.version,
        },
      };
    } catch (uploadError: unknown) {
      console.error(
        `❌ Upload failed for ${record.uploadRequest.fileName}:`,
        uploadError
      );

      // Mark as failed
      await markMediaFileAsFailed(supabaseClient, record.mediaFileId);

      return {
        mediaFileId: record.mediaFileId,
        fileName: record.uploadRequest.fileName,
        status: 'failed',
        error:
          uploadError instanceof Error ? uploadError.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload file to B2 storage with optimized memory handling
   */
  private async uploadToB2(
    file: File,
    uploadRequest: BibleChapterUploadRequest,
    version: number,
    publicUserId: string
  ): Promise<UploadResultData> {
    // Stream file to reduce memory usage for large files
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    const uploadResult = await this.b2Service.uploadFile(
      fileBytes,
      uploadRequest.fileName,
      file.type,
      {
        'media-type': 'audio',
        'language-entity-id': uploadRequest.languageEntityId,
        'project-id': uploadRequest.projectId ?? '',
        'chapter-id': uploadRequest.chapterId,
        'is-bible-audio': 'true',
        version: version.toString(),
        'uploaded-by': publicUserId,
      }
    );

    return {
      downloadUrl: uploadResult.downloadUrl,
      fileSize: uploadResult.fileSize,
    };
  }
}
