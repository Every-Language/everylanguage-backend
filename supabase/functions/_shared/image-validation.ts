// Image validation and types for image upload functionality

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
] as const;

export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
export const MIN_IMAGE_SIZE = 1024; // 1KB

export type ImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export interface ImageUploadRequest {
  fileName: string;
  targetType: string;
  targetId: string;
  setId?: string;
  setName?: string;
  setRemotePath?: string;
  createNewSet?: boolean;
  metadata?: Record<string, string>;
}

export interface ParsedImageRequest {
  file: File;
  uploadRequest: ImageUploadRequest;
}

export interface ImageUploadResponse {
  success: boolean;
  data?: {
    imageId: string;
    setId?: string;
    downloadUrl: string;
    fileSize: number;
    remotePath: string;
    version: number; // Add version to response
  };
  error?: string;
}

interface ImageJsonData {
  target_type: string;
  target_id: string;
  set_id?: string;
  set_name?: string;
  set_remote_path?: string;
  create_new_set?: boolean;
  filename?: string;
  metadata?: any;
  file_content?: string;
}

function isImageJsonData(data: unknown): data is ImageJsonData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as any).target_type === 'string' &&
    typeof (data as any).target_id === 'string'
  );
}

export async function parseImageUploadRequest(
  req: Request
): Promise<{ file: File; uploadRequest: ImageUploadRequest }> {
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

    if (!isImageJsonData(jsonData)) {
      throw new Error('Invalid JSON data format for image upload');
    }

    uploadRequest = {
      fileName: jsonData.filename ?? 'test_image.png',
      targetType: jsonData.target_type,
      targetId: jsonData.target_id,
      setId: jsonData.set_id,
      setName: jsonData.set_name,
      setRemotePath: jsonData.set_remote_path,
      createNewSet: jsonData.create_new_set,
      metadata: jsonData.metadata,
    };

    // Create a fake file for testing
    const testContent = jsonData.file_content ?? 'test image content';
    file = new File([testContent], uploadRequest.fileName, {
      type: 'image/png',
    });
  } else {
    // Parse multipart form data
    const formData = await req.formData();
    file = formData.get('file') as File;

    // Parse metadata if provided
    const metadataJson = formData.get('metadata') as string;
    let metadata: Record<string, string> | undefined = undefined;
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson);
      } catch {
        throw new Error('Invalid metadata JSON format');
      }
    }

    // Extract filename with robust fallback strategy
    let filename = 'unknown';
    if (file) {
      // Primary: Use file.name if available and valid
      if (file.name && file.name !== '' && file.name !== 'blob') {
        filename = file.name;
      }
      // Fallback: Check if filename exists in file properties using Object.getOwnPropertyNames
      else {
        const fileProps = Object.getOwnPropertyNames(file);
        if (fileProps.includes('name') && (file as any).name) {
          filename = (file as any).name;
        }
        // Last resort: Try to extract from FormData iteration
        else {
          for (const [key, value] of formData.entries()) {
            if (key === 'file' && value instanceof File && value.name) {
              filename = value.name;
              break;
            }
          }
        }
      }
    }

    uploadRequest = {
      fileName: filename,
      targetType: formData.get('target_type') as string,
      targetId: formData.get('target_id') as string,
      setId: formData.get('set_id') as string,
      setName: formData.get('set_name') as string,
      setRemotePath: formData.get('set_remote_path') as string,
      createNewSet: formData.get('create_new_set') === 'true',
      metadata,
    };
  }

  if (!file) {
    throw new Error('No file provided');
  }

  // Create validated upload request
  const finalUploadRequest: ImageUploadRequest = {
    fileName: uploadRequest.fileName,
    targetType: uploadRequest.targetType,
    targetId: uploadRequest.targetId,
    setId: uploadRequest.setId ?? undefined,
    setName: uploadRequest.setName ?? undefined,
    setRemotePath: uploadRequest.setRemotePath ?? undefined,
    createNewSet: uploadRequest.createNewSet ?? false,
    metadata: uploadRequest.metadata ?? undefined,
  };

  return { file, uploadRequest: finalUploadRequest };
}

export function validateImageUploadRequest(
  uploadRequest: ImageUploadRequest,
  file: File
): string[] {
  const errors: string[] = [];

  // 1. Validate required fields
  if (!uploadRequest.fileName) {
    errors.push('Missing required field: fileName');
  }

  if (!uploadRequest.targetType) {
    errors.push('Missing required field: targetType');
  }

  if (!uploadRequest.targetId) {
    errors.push('Missing required field: targetId');
  }

  // 2. Validate file type
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as ImageType)) {
    errors.push(
      `Unsupported image type '${file.type}'. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
    );
  }

  // 3. Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    errors.push(
      `Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
    );
  }

  if (file.size < MIN_IMAGE_SIZE) {
    errors.push(`Image too small. Minimum size is ${MIN_IMAGE_SIZE / 1024}KB`);
  }

  // 4. Validate set creation logic
  if (uploadRequest.createNewSet) {
    if (!uploadRequest.setName) {
      errors.push('set_name is required when creating a new set');
    }
    if (uploadRequest.setId) {
      errors.push('Cannot specify set_id when creating a new set');
    }
  } else if (uploadRequest.setId && uploadRequest.setName) {
    errors.push('Cannot specify both set_id and set_name for existing set');
  }

  // 5. Validate target type (basic validation, more detailed validation in database)
  const validTargetTypes = [
    'chapter',
    'book',
    'verse',
    'sermon',
    'passage',
    'podcast',
    'film_segment',
    'audio_segment',
  ];

  if (!validTargetTypes.includes(uploadRequest.targetType)) {
    errors.push(
      `Invalid target_type '${uploadRequest.targetType}'. Must be one of: ${validTargetTypes.join(', ')}`
    );
  }

  return errors;
}

export async function validateImageUploadInDatabase(
  supabaseClient: any,
  uploadRequest: ImageUploadRequest
): Promise<void> {
  const errors: string[] = [];

  try {
    // Validate target exists (basic validation for common types)
    const targetTableMap: Record<string, string> = {
      chapter: 'chapters',
      book: 'books',
      verse: 'verses',
    };

    const tableName = targetTableMap[uploadRequest.targetType];
    if (tableName) {
      const { data: target, error: targetError } = await supabaseClient
        .from(tableName)
        .select('id')
        .eq('id', uploadRequest.targetId)
        .single();

      if (targetError || !target) {
        throw new Error(
          targetError?.code === 'PGRST116'
            ? `${uploadRequest.targetType} with ID ${uploadRequest.targetId} not found`
            : `${uploadRequest.targetType} validation failed: ${targetError?.message}`
        );
      }
      console.log(`✅ Target ${uploadRequest.targetType} validated`);
    } else {
      console.log(
        `ℹ️ Target type '${uploadRequest.targetType}' doesn't have specific validation`
      );
    }

    // Validate existing set if provided
    if (uploadRequest.setId && !uploadRequest.createNewSet) {
      const { data: imageSet, error: setError } = await supabaseClient
        .from('image_sets')
        .select('id, name')
        .eq('id', uploadRequest.setId)
        .single();

      if (setError || !imageSet) {
        throw new Error(
          setError?.code === 'PGRST116'
            ? 'Image set not found'
            : `Image set validation failed: ${setError?.message}`
        );
      }
      console.log(`✅ Image set validated: ${imageSet.name}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  } catch (dbError: any) {
    throw new Error(`Database validation failed: ${dbError.message}`);
  }
}
