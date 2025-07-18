import { B2StorageService } from './b2-storage-service.ts';

export interface BibleAudioMetadata {
  mediaFileId: string;
  chapterId: string;
  bookId: string;
  bookName: string;
  chapterNumber: number;
  duration: number;
  fileSize: number;
  verseTimings: Array<{
    verseId: string;
    verseNumber: number;
    startTime: number;
    duration: number;
  }>;
  languageEntityId: string;
  publishStatus: string;
  version: number;
  remotePath: string;
}

export interface BibleAudioBatchQuery {
  languageEntityId: string;
  scope: 'version' | 'book' | 'chapters';
  bookId?: string; // Required for 'book' and 'chapters' scope
  chapterIds?: string[]; // Required for 'chapters' scope
  limit?: number;
  offset?: number;
}

export interface BatchProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: BibleAudioMetadata;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-1
}

export class BibleAudioService {
  private supabaseClient: any;
  private b2Service: B2StorageService;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
    this.b2Service = new B2StorageService();
  }

  /**
   * Get metadata for a single Bible chapter audio file
   */
  async getChapterAudioMetadata(
    mediaFileId: string
  ): Promise<BibleAudioMetadata> {
    const { data: mediaFile, error: dbError } = await this.supabaseClient
      .from('media_files')
      .select(
        `
        id,
        remote_path,
        file_size,
        duration_seconds,
        language_entity_id,
        publish_status,
        is_bible_audio,
        start_verse_id,
        end_verse_id,
        version,
        media_files_targets!inner (
          target_type,
          target_id
        ),
        media_files_verses (
          verse_id,
          start_time_seconds,
          duration_seconds,
          verses!inner (
            verse_number,
            chapter_id,
            chapters!inner (
              id,
              chapter_number,
              book_id,
              books!inner (
                id,
                name
              )
            )
          )
        )
      `
      )
      .eq('id', mediaFileId)
      .eq('is_bible_audio', true)
      .eq('publish_status', 'published')
      .single();

    if (dbError || !mediaFile) {
      throw new Error(`Bible chapter audio not found: ${dbError?.message}`);
    }

    if (!mediaFile.remote_path) {
      throw new Error('Audio file not available - no remote path');
    }

    return this.buildMetadata(mediaFile);
  }

  /**
   * Get metadata for multiple Bible chapter audio files
   */
  async getBatchAudioMetadata(
    query: BibleAudioBatchQuery
  ): Promise<BibleAudioMetadata[]> {
    let dbQuery = this.supabaseClient
      .from('media_files')
      .select(
        `
        id,
        remote_path,
        file_size,
        duration_seconds,
        language_entity_id,
        publish_status,
        is_bible_audio,
        start_verse_id,
        end_verse_id,
        version,
        media_files_targets!inner (
          target_type,
          target_id
        ),
        media_files_verses (
          verse_id,
          start_time_seconds,
          duration_seconds,
          verses!inner (
            verse_number,
            chapter_id,
            chapters!inner (
              id,
              chapter_number,
              book_id,
              books!inner (
                id,
                name
              )
            )
          )
        )
      `
      )
      .eq('language_entity_id', query.languageEntityId)
      .eq('is_bible_audio', true)
      .eq('publish_status', 'published')
      .eq('media_files_targets.target_type', 'chapter');

    // Apply scope filters
    if (query.scope === 'book' && query.bookId) {
      // Filter by book through the chapter relationship
      dbQuery = dbQuery.eq(
        'media_files_verses.verses.chapters.book_id',
        query.bookId
      );
    } else if (
      query.scope === 'chapters' &&
      query.chapterIds &&
      query.chapterIds.length > 0
    ) {
      // Filter by specific chapters
      dbQuery = dbQuery.in('media_files_targets.target_id', query.chapterIds);
    }

    // Apply pagination
    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }
    if (query.offset) {
      dbQuery = dbQuery.range(
        query.offset,
        query.offset + (query.limit || 50) - 1
      );
    }

    // Order by book and chapter for consistent results
    dbQuery = dbQuery
      .order('media_files_verses.verses.chapters.books.id', { ascending: true })
      .order('media_files_verses.verses.chapters.chapter_number', {
        ascending: true,
      });

    const { data: mediaFiles, error: dbError } = await dbQuery;

    if (dbError) {
      throw new Error(
        `Failed to fetch batch audio metadata: ${dbError.message}`
      );
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return [];
    }

    return mediaFiles
      .filter(file => file.remote_path) // Only include files with valid remote paths
      .map(file => this.buildMetadata(file));
  }

  /**
   * Stream a Bible chapter audio file
   */
  async streamChapterAudio(
    metadata: BibleAudioMetadata,
    rangeHeader?: string
  ): Promise<Response> {
    const fileName =
      metadata.remotePath.split('/').pop() ?? metadata.remotePath;

    const streamResponse = await this.b2Service.streamFileWithRetry(
      fileName,
      3,
      true // Use private bucket
    );

    const responseHeaders: Record<string, string> = {
      'Content-Type': streamResponse.headers.get('content-type') ?? 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400', // 24 hours for Bible audio
      'X-Bible-Metadata': JSON.stringify(metadata),
    };

    if (rangeHeader && streamResponse.status === 206) {
      responseHeaders['Content-Range'] =
        streamResponse.headers.get('content-range') ?? '';
      responseHeaders['Content-Length'] =
        streamResponse.headers.get('content-length') ?? '';
    } else {
      responseHeaders['Content-Length'] = metadata.fileSize.toString();
    }

    return new Response(streamResponse.body, {
      status: streamResponse.status,
      headers: responseHeaders,
    });
  }

  /**
   * Download a Bible chapter audio file
   */
  async downloadChapterAudio(
    metadata: BibleAudioMetadata
  ): Promise<{ data: Uint8Array; contentType: string; fileName: string }> {
    const fileName =
      metadata.remotePath.split('/').pop() ?? metadata.remotePath;
    const fileData =
      await this.b2Service.downloadFileFromPrivateBucket(fileName);

    const downloadName =
      `${metadata.bookName}-${metadata.chapterNumber}.m4a`.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      );

    return {
      data: fileData.data,
      contentType: fileData.contentType,
      fileName: downloadName,
    };
  }

  /**
   * Build metadata object from database result
   */
  private buildMetadata(mediaFile: any): BibleAudioMetadata {
    const chapterTarget = mediaFile.media_files_targets.find(
      (t: any) => t.target_type === 'chapter'
    );
    const firstVerse = mediaFile.media_files_verses[0];
    const chapter = firstVerse?.verses?.chapters;
    const book = chapter?.books;

    return {
      mediaFileId: mediaFile.id,
      chapterId: chapterTarget?.target_id ?? '',
      bookId: book?.id ?? '',
      bookName: book?.name ?? '',
      chapterNumber: chapter?.chapter_number ?? 0,
      duration: mediaFile.duration_seconds ?? 0,
      fileSize: mediaFile.file_size ?? 0,
      verseTimings: mediaFile.media_files_verses
        .map((v: any) => ({
          verseId: v.verse_id,
          verseNumber: v.verses.verse_number,
          startTime: v.start_time_seconds,
          duration: v.duration_seconds,
        }))
        .sort((a: any, b: any) => a.verseNumber - b.verseNumber),
      languageEntityId: mediaFile.language_entity_id,
      publishStatus: mediaFile.publish_status,
      version: mediaFile.version,
      remotePath: mediaFile.remote_path,
    };
  }
}

/**
 * Utility class for managing batch download progress and coordination
 */
export class BatchDownloadManager {
  private progress: BatchProgress;
  private onProgressCallback?: (progress: BatchProgress) => void;

  constructor(
    totalFiles: number,
    onProgress?: (progress: BatchProgress) => void
  ) {
    this.progress = {
      totalFiles,
      completedFiles: 0,
      failedFiles: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
    };
    this.onProgressCallback = onProgress;
  }

  updateProgress(
    update: Partial<
      BatchProgress & { fileBytes?: number; downloadedFileBytes?: number }
    >
  ): void {
    // Update counts
    if (update.completedFiles !== undefined) {
      this.progress.completedFiles = update.completedFiles;
    }
    if (update.failedFiles !== undefined) {
      this.progress.failedFiles = update.failedFiles;
    }
    if (update.currentFile !== undefined) {
      this.progress.currentFile = update.currentFile;
    }

    // Update bytes
    if (update.fileBytes !== undefined) {
      this.progress.totalBytes += update.fileBytes;
    }
    if (update.downloadedFileBytes !== undefined) {
      this.progress.downloadedBytes += update.downloadedFileBytes;
    }

    // Calculate overall progress
    this.progress.progress =
      this.progress.totalFiles > 0
        ? (this.progress.completedFiles + this.progress.failedFiles) /
          this.progress.totalFiles
        : 0;

    // Notify callback
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.progress });
    }
  }

  getProgress(): BatchProgress {
    return { ...this.progress };
  }

  addTotalBytes(bytes: number): void {
    this.progress.totalBytes += bytes;
  }

  isComplete(): boolean {
    return (
      this.progress.completedFiles + this.progress.failedFiles >=
      this.progress.totalFiles
    );
  }
}
