import type {
  UploadRequest,
  MediaType,
  TargetType,
} from './media-validation.ts';

export interface ParsedRequest {
  file: File;
  uploadRequest: UploadRequest;
}

interface MediaJsonData {
  target_type: string;
  target_id: string;
  language_entity_id: string;
  filename?: string;
  duration_seconds?: number;
  file_content?: string;
}

function isMediaJsonData(data: unknown): data is MediaJsonData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).target_type === 'string' &&
    typeof (data as any).target_id === 'string' &&
    typeof (data as any).language_entity_id === 'string'
  );
}

export async function parseUploadRequest(req: Request): Promise<ParsedRequest> {
  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  const isJson = contentType.includes('application/json');

  if (!isMultipart && !isJson) {
    throw new Error(
      `Invalid content type. Expected multipart/form-data or application/json, got: ${contentType}`
    );
  }

  let file: File;
  let uploadRequest: any;

  if (isJson) {
    // Handle JSON test data
    const jsonData = await req.json();

    if (!isMediaJsonData(jsonData)) {
      throw new Error('Invalid JSON data format for media upload');
    }

    uploadRequest = {
      target_type: jsonData.target_type,
      target_id: jsonData.target_id,
      language_entity_id: jsonData.language_entity_id,
      filename: jsonData.filename ?? 'test_file.m4a',
      duration_seconds: jsonData.duration_seconds,
    };

    // Create a fake file for testing
    const testContent = jsonData.file_content ?? 'test audio content';
    file = new File([testContent], uploadRequest.filename, {
      type: 'audio/m4a',
    });
  } else {
    // Parse multipart form data
    const formData = await req.formData();
    file = formData.get('file') as File;
    uploadRequest = {
      target_type: formData.get('target_type') as string,
      target_id: formData.get('target_id') as string,
      language_entity_id: formData.get('language_entity_id') as string,
      filename: file.name || 'unknown',
      duration_seconds: formData.get('duration_seconds') as string,
    };
  }

  // Determine media type from file
  const detectedMediaType: MediaType = file.type.startsWith('video/')
    ? 'video'
    : 'audio';

  // Parse duration if provided
  let durationSeconds: number | undefined = undefined;
  if (uploadRequest.duration_seconds) {
    durationSeconds =
      typeof uploadRequest.duration_seconds === 'string'
        ? parseFloat(uploadRequest.duration_seconds)
        : uploadRequest.duration_seconds;
  }

  // Create validated upload request
  const finalUploadRequest: UploadRequest = {
    fileName: uploadRequest.filename,
    mediaType: detectedMediaType,
    languageEntityId: uploadRequest.language_entity_id,
    targetType: uploadRequest.target_type as TargetType,
    targetId: uploadRequest.target_id ?? undefined,
    isBibleAudio: false,
    duration: durationSeconds,
  };

  return { file, uploadRequest: finalUploadRequest };
}

// CORS headers for frontend requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
