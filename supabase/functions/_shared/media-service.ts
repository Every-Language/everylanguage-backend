import type { MediaType } from './media-validation.ts';

export interface MediaFileData {
  languageEntityId: string;
  mediaType: MediaType;
  projectId?: string;
  createdBy?: string;
  fileSize: number;
  durationSeconds?: number;
  version: number;
}

export interface MediaFileTargetData {
  mediaFileId: string;
  targetType: string;
  targetId: string;
  isBibleAudio: boolean;
  createdBy?: string;
}

export class MediaService {
  constructor(private supabaseClient: any) {}

  async getNextVersion(
    fileName: string,
    languageEntityId: string
  ): Promise<number> {
    // Check for existing files with same name and language
    const { data, error } = await this.supabaseClient
      .from('media_files')
      .select('version')
      .ilike('remote_path', `%${fileName}`)
      .eq('language_entity_id', languageEntityId)
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error checking for existing versions:', error);
      return 1; // Default to version 1 if check fails
    }

    return data && data.length > 0 ? data[0].version + 1 : 1;
  }

  async createMediaFile(data: MediaFileData) {
    const { data: mediaFile, error } = await this.supabaseClient
      .from('media_files')
      .insert({
        language_entity_id: data.languageEntityId,
        media_type: data.mediaType,
        project_id: data.projectId,
        created_by: data.createdBy,
        upload_status: 'uploading',
        publish_status: 'pending',
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

  async updateMediaFileAfterUpload(
    mediaFileId: string,
    remotePath: string,
    fileSize: number
  ) {
    const { error } = await this.supabaseClient
      .from('media_files')
      .update({
        remote_path: remotePath,
        upload_status: 'completed',
        file_size: fileSize,
      })
      .eq('id', mediaFileId);

    if (error) {
      throw new Error(`Failed to update media file: ${error.message}`);
    }
  }

  async markUploadFailed(mediaFileId: string) {
    await this.supabaseClient
      .from('media_files')
      .update({ upload_status: 'failed' })
      .eq('id', mediaFileId);
  }

  async createTargetAssociation(data: MediaFileTargetData) {
    const { error } = await this.supabaseClient
      .from('media_files_targets')
      .insert({
        media_file_id: data.mediaFileId,
        target_type: data.targetType,
        target_id: data.targetId,
        is_bible_audio: data.isBibleAudio,
        created_by: data.createdBy,
      });

    if (error) {
      console.error('Target association error:', error);
      // Don't throw - this shouldn't fail the upload
    }
  }

  async getAuthenticatedUser(userId?: string) {
    if (!userId) return null;

    const { data } = await this.supabaseClient
      .from('users')
      .select('id')
      .eq('auth_uid', userId)
      .single();

    return data;
  }
}
