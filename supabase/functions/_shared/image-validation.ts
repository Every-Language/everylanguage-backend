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
      target_type: jsonData.target_type,
      target_id: jsonData.target_id,
      set_id: jsonData.set_id,
      set_name: jsonData.set_name,
      set_remote_path: jsonData.set_remote_path,
      create_new_set: jsonData.create_new_set,
      filename: jsonData.filename ?? 'test_image.png',
      metadata: jsonData.metadata,
    };

    // Create a fake file for testing
    const testContent = jsonData.file_content ?? 'test image content';
    file = new File([testContent], uploadRequest.filename, {
      type: 'image/png',
    });
  } else {
    // Parse multipart form data
    const formData = await req.formData();
    file = formData.get('file') as File;

    // DEBUG: Log file object properties in CI environment
    console.log('DEBUG: File object:', file);
    console.log('DEBUG: File name:', file?.name);
    console.log('DEBUG: File type:', file?.type);
    console.log('DEBUG: File constructor:', file?.constructor?.name);
    console.log('DEBUG: File keys:', file ? Object.keys(file) : 'null');
    console.log(
      'DEBUG: File properties:',
      file ? Object.getOwnPropertyNames(file) : 'null'
    );

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

    // Extract filename from multiple sources for better cross-environment compatibility
    let filename = 'unknown';

    // Strategy 1: Try file.name first (standard File API)
    if (file?.name && file.name !== '' && file.name !== 'blob') {
      filename = file.name;
      console.log('DEBUG: Got filename from file.name:', filename);
    }
    // Strategy 2: Iterate through FormData entries to find filename in headers
    else {
      console.log('DEBUG: file.name not available, trying FormData iteration');

      try {
        // In real multipart form data, filename is in Content-Disposition header
        // Some polyfills might preserve this information differently
        for (const [key, value] of formData.entries()) {
          console.log('DEBUG: FormData entry:', key, value);
          if (key === 'file' && value && typeof value === 'object') {
            // Try different property names that might contain the filename
            const possibleNames = [
              'name',
              'fileName',
              'filename',
              '_name',
              'originalName',
            ];
            for (const prop of possibleNames) {
              if (prop in value && (value as any)[prop]) {
                filename = (value as any)[prop];
                console.log(`DEBUG: Got filename from ${prop}:`, filename);
                break;
              }
            }

            // If still no filename, check if it's a string representation that contains filename
            if (filename === 'unknown' && value.toString) {
              const stringRep = value.toString();
              console.log('DEBUG: File toString():', stringRep);
              // Look for filename pattern in string representation
              const filenameMatch = stringRep.match(
                /filename["\s]*[:=]["\s]*([^";\s]+)/i
              );
              if (filenameMatch?.[1]) {
                filename = filenameMatch[1];
                console.log(
                  'DEBUG: Got filename from string pattern:',
                  filename
                );
              }
            }
            break;
          }
        }
      } catch (error) {
        console.log('DEBUG: Error iterating FormData:', error);
      }
    }

    // Strategy 3: Fallback to examining raw FormData structure
    if (filename === 'unknown') {
      console.log('DEBUG: Still no filename, examining FormData structure');
      const fileEntry = formData.get('file');
      console.log('DEBUG: FormData file entry:', fileEntry);
      console.log('DEBUG: FormData file entry type:', typeof fileEntry);
      console.log(
        'DEBUG: FormData file entry constructor:',
        fileEntry?.constructor?.name
      );

      if (fileEntry && typeof fileEntry === 'object') {
        // Check all enumerable properties
        console.log('DEBUG: File entry keys:', Object.keys(fileEntry));
        console.log(
          'DEBUG: File entry properties:',
          Object.getOwnPropertyNames(fileEntry)
        );

        // Try accessing filename through different paths
        if ('name' in fileEntry && (fileEntry as any).name) {
          filename = (fileEntry as any).name;
          console.log(
            'DEBUG: Got filename from FormData entry.name:',
            filename
          );
        }
      }
    }

    console.log('DEBUG: Final filename:', filename);

    uploadRequest = {
      target_type: formData.get('target_type') as string,
      target_id: formData.get('target_id') as string,
      set_id: formData.get('set_id') as string,
      set_name: formData.get('set_name') as string,
      set_remote_path: formData.get('set_remote_path') as string,
      create_new_set: formData.get('create_new_set') === 'true',
      filename,
      metadata,
    };
  }

  if (!file) {
    throw new Error('No file provided');
  }

  // Create validated upload request
  const finalUploadRequest: ImageUploadRequest = {
    fileName: uploadRequest.filename,
    targetType: uploadRequest.target_type,
    targetId: uploadRequest.target_id,
    setId: uploadRequest.set_id || undefined,
    setName: uploadRequest.set_name || undefined,
    setRemotePath: uploadRequest.set_remote_path || undefined,
    createNewSet: uploadRequest.create_new_set || false,
    metadata: uploadRequest.metadata || undefined,
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
