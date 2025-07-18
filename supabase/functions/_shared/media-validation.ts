// Database enum values (sync with your schema)
export const VALID_MEDIA_TYPES = ['audio', 'video'] as const;
export const VALID_TARGET_TYPES = [
  'chapter',
  'book',
  'sermon',
  'passage',
  'verse',
  'podcast',
  'film_segment',
  'audio_segment',
] as const;

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export type MediaType = (typeof VALID_MEDIA_TYPES)[number];
export type TargetType = (typeof VALID_TARGET_TYPES)[number];

export interface UploadRequest {
  fileName: string;
  mediaType: MediaType;
  languageEntityId: string;
  projectId?: string;
  targetType?: TargetType;
  targetId?: string;
  isBibleAudio?: boolean;
  duration?: number;
  metadata?: Record<string, string>;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    mediaFileId: string;
    downloadUrl: string;
    fileSize: number;
    version: number;
    duration?: number;
  };
  error?: string;
}

// Validation helper functions
export async function validateLanguageEntity(
  supabaseClient: any,
  languageEntityId: string
) {
  const { data, error } = await supabaseClient
    .from('language_entities')
    .select('id, name, level')
    .eq('id', languageEntityId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    throw new Error(
      error?.code === 'PGRST116'
        ? 'Language entity not found or has been deleted'
        : `Language entity validation failed: ${error?.message}`
    );
  }
  return data;
}

export async function validateProject(supabaseClient: any, projectId: string) {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    throw new Error(
      error?.code === 'PGRST116'
        ? 'Project not found or has been deleted'
        : `Project validation failed: ${error?.message}`
    );
  }
  return data;
}

export async function validateTargetId(
  supabaseClient: any,
  targetType: TargetType,
  targetId: string
) {
  const targetTableMap = {
    chapter: 'chapters',
    book: 'books',
    verse: 'verses',
    passage: 'passages',
    // These don't have specific tables in your schema
    sermon: null,
    podcast: null,
    film_segment: null,
    audio_segment: null,
  };

  const tableName = targetTableMap[targetType];

  if (!tableName) {
    // For sermon, podcast, etc. - we'll allow any UUID for now
    // You might want to create a general content table for these
    console.log(
      `Target type '${targetType}' doesn't have specific validation table`
    );
    return { id: targetId, validated: false };
  }

  const { data, error } = await supabaseClient
    .from(tableName)
    .select('id')
    .eq('id', targetId)
    .single();

  if (error || !data) {
    throw new Error(
      error?.code === 'PGRST116'
        ? `${targetType} with ID ${targetId} not found`
        : `${targetType} validation failed: ${error?.message}`
    );
  }
  return { ...data, validated: true };
}

export function validateUploadRequest(
  uploadRequest: UploadRequest,
  file: File
) {
  const errors: string[] = [];

  // 1. Validate required fields
  if (!uploadRequest.fileName || !uploadRequest.languageEntityId) {
    errors.push('Missing required fields: fileName, languageEntityId');
  }

  // 2. Validate media type against enum
  if (!VALID_MEDIA_TYPES.includes(uploadRequest.mediaType)) {
    errors.push(
      `Invalid media type '${uploadRequest.mediaType}'. Must be one of: ${VALID_MEDIA_TYPES.join(', ')}`
    );
  }

  // 3. Validate target type against enum (if provided)
  if (
    uploadRequest.targetType &&
    !VALID_TARGET_TYPES.includes(uploadRequest.targetType)
  ) {
    errors.push(
      `Invalid target type '${uploadRequest.targetType}'. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`
    );
  }

  // 4. Validate file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // 5. Validate file type
  const supportedTypes =
    uploadRequest.mediaType === 'audio'
      ? SUPPORTED_AUDIO_TYPES
      : SUPPORTED_VIDEO_TYPES;

  if (!supportedTypes.includes(file.type)) {
    errors.push(
      `Unsupported file type '${file.type}' for ${uploadRequest.mediaType}. Supported types: ${supportedTypes.join(', ')}`
    );
  }

  return errors;
}
