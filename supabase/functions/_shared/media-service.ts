import { getPublicUserId } from './user-service.ts';

export interface MediaFileData {
  languageEntityId: string;
  mediaType: 'audio' | 'video';
  projectId?: string;
  createdBy?: string;
  fileSize?: number;
  durationSeconds?: number;
  version: number;
}

export interface MediaFileTargetData {
  mediaFileId: string;
  targetType: string;
  targetId: string;
  isBibleAudio?: boolean;
  createdBy?: string;
}

export class MediaService {
  constructor(private supabaseClient: any) {}

  async getNextVersion(
    fileName: string,
    languageEntityId: string
  ): Promise<number> {
    // This is a placeholder implementation
    // In a real scenario, you'd query existing media files to find the highest version
    const { data, error } = await this.supabaseClient
      .from('media_files')
      .select('version')
      .eq('language_entity_id', languageEntityId)
      .like('remote_path', `%${fileName}%`)
      .order('version', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error getting next version:', error);
      return 1;
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
        file_size: fileSize,
        upload_status: 'completed',
      })
      .eq('id', mediaFileId);

    if (error) {
      console.error('Update media file error:', error);
      // Don't throw - this shouldn't fail the upload
    }
  }

  async markUploadFailed(mediaFileId: string) {
    const { error } = await this.supabaseClient
      .from('media_files')
      .update({
        upload_status: 'failed',
      })
      .eq('id', mediaFileId);

    if (error) {
      console.error('Mark upload failed error:', error);
    }
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

  /**
   * Get authenticated user from auth UID
   * @deprecated Use getPublicUserId from user-service.ts instead
   */
  async getAuthenticatedUser(userId?: string) {
    return await getPublicUserId(this.supabaseClient, userId);
  }
}
