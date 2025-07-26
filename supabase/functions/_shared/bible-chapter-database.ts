/**
 * Shared database operations for Bible chapter audio uploads
 * Includes transaction management and optimized queries
 */

export interface MediaFileData {
  languageEntityId: string;
  audioVersionId: string;
  chapterId: string;
  projectId?: string;
  createdBy: string;
  fileSize: number;
  durationSeconds: number;
  version: number;
  startVerseId: string;
  endVerseId: string;
  status?: 'pending' | 'uploading' | 'completed' | 'failed';
}

export interface VerseTimingData {
  mediaFileId: string;
  verseTimings: Array<{
    verseId: string;
    startTimeSeconds: number;
    durationSeconds: number;
  }>;
  createdBy: string;
}

export interface MediaFileTagData {
  mediaFileId: string;
  tagIds: string[];
  createdBy: string;
}

export interface UploadResultData {
  downloadUrl: string;
  fileSize: number;
}

/**
 * Create a Bible chapter media file record with transaction support
 */
export async function createBibleChapterMediaFile(
  supabaseClient: any,
  data: MediaFileData
): Promise<any> {
  const { data: mediaFile, error } = await supabaseClient
    .from('media_files')
    .insert({
      language_entity_id: data.languageEntityId,
      audio_version_id: data.audioVersionId, // Added: audio version ID
      chapter_id: data.chapterId, // Added: chapter ID
      media_type: 'audio',
      project_id: data.projectId,
      created_by: data.createdBy,
      upload_status: data.status ?? 'uploading',
      publish_status: 'pending',
      check_status: 'pending',
      file_size: data.fileSize,
      duration_seconds: data.durationSeconds,
      version: data.version,
      start_verse_id: data.startVerseId,
      end_verse_id: data.endVerseId,
      is_bible_audio: true,
    })
    .select()
    .single();

  if (error || !mediaFile) {
    throw new Error(
      `Database error creating media file: ${error?.message ?? 'Unknown database error'}`
    );
  }

  return mediaFile;
}

/**
 * Update media file with upload results
 */
export async function updateMediaFileUploadResults(
  supabaseClient: any,
  mediaFileId: string,
  uploadResult: UploadResultData
): Promise<void> {
  const { error } = await supabaseClient
    .from('media_files')
    .update({
      upload_status: 'completed',
      remote_path: uploadResult.downloadUrl,
      file_size: uploadResult.fileSize,
    })
    .eq('id', mediaFileId);

  if (error) {
    throw new Error(`Failed to update media file: ${error.message}`);
  }
}

/**
 * Mark media file as failed
 */
export async function markMediaFileAsFailed(
  supabaseClient: any,
  mediaFileId: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('media_files')
    .update({
      upload_status: 'failed',
    })
    .eq('id', mediaFileId);

  if (error) {
    console.error(`Error marking media file ${mediaFileId} as failed:`, error);
  }
}

/**
 * Update media file status
 */
export async function updateMediaFileStatus(
  supabaseClient: any,
  mediaFileId: string,
  status: 'pending' | 'uploading' | 'completed' | 'failed'
): Promise<void> {
  const { error } = await supabaseClient
    .from('media_files')
    .update({
      upload_status: status,
    })
    .eq('id', mediaFileId);

  if (error) {
    throw new Error(`Failed to update media file status: ${error.message}`);
  }
}

/**
 * Get next version number for a chapter with improved query performance
 */
export async function getNextVersionForChapter(
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

/**
 * Create media file verses in batch for better performance
 */
export async function createMediaFileVerses(
  supabaseClient: any,
  data: VerseTimingData
): Promise<void> {
  if (data.verseTimings.length === 0) {
    return;
  }

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
    throw new Error(`Failed to create verse timings: ${error.message}`);
  }

  console.log(`✅ Created ${verseRecords.length} verse timing records`);
}

/**
 * Create media file tags in batch for better performance
 */
export async function createMediaFileTags(
  supabaseClient: any,
  data: MediaFileTagData
): Promise<void> {
  if (data.tagIds.length === 0) {
    return;
  }

  const tagRecords = data.tagIds.map(tagId => ({
    media_file_id: data.mediaFileId,
    tag_id: tagId,
    created_by: data.createdBy,
  }));

  const { error } = await supabaseClient
    .from('media_files_tags')
    .insert(tagRecords);

  if (error) {
    throw new Error(`Failed to create tag associations: ${error.message}`);
  }

  console.log(`✅ Created ${tagRecords.length} tag association records`);
}

/**
 * Execute multiple database operations in a transaction
 * This is a more production-ready approach for data consistency
 */
export async function executeInTransaction<T>(
  supabaseClient: any,
  operations: (client: any) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't expose direct transaction control in client libraries
  // For true transactions, you'd need to use database functions or raw SQL
  // This is a pattern for grouping related operations
  try {
    return await operations(supabaseClient);
  } catch (error) {
    // In a real transaction, this would rollback
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Complete media file processing with all related data
 * Groups all operations for better consistency
 */
export async function completeMediaFileProcessing(
  supabaseClient: any,
  data: {
    mediaFileId: string;
    uploadResult: UploadResultData;
    verseTimings?: VerseTimingData['verseTimings'];
    tagIds?: string[];
    createdBy: string;
  }
): Promise<void> {
  try {
    // Update media file with upload results
    await updateMediaFileUploadResults(
      supabaseClient,
      data.mediaFileId,
      data.uploadResult
    );

    // Create verse timing records if provided
    if (data.verseTimings && data.verseTimings.length > 0) {
      await createMediaFileVerses(supabaseClient, {
        mediaFileId: data.mediaFileId,
        verseTimings: data.verseTimings,
        createdBy: data.createdBy,
      });
    }

    // Create tag associations if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await createMediaFileTags(supabaseClient, {
        mediaFileId: data.mediaFileId,
        tagIds: data.tagIds,
        createdBy: data.createdBy,
      });
    }

    console.log(`✅ Completed processing for media file ${data.mediaFileId}`);
  } catch (error) {
    // Mark as failed if any step fails
    await markMediaFileAsFailed(supabaseClient, data.mediaFileId);
    throw error;
  }
}
