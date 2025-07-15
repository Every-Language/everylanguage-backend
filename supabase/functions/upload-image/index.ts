// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { B2StorageService } from '../_shared/b2-storage-service.ts';
import {
  parseImageUploadRequest,
  validateImageUploadRequest,
  validateImageUploadInDatabase,
  ImageUploadResponse,
} from '../_shared/image-validation.ts';
import {
  ImageService,
  ImageData,
  ImageSetData,
} from '../_shared/image-service.ts';
import { B2Utils } from '../_shared/b2-utils.ts';

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log('Image Upload Function initialized');

Deno.serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Processing image upload request');

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const b2Storage = new B2StorageService();
    const imageService = new ImageService(supabaseClient);

    // Parse request
    const { file, uploadRequest } = await parseImageUploadRequest(req);
    console.log(`📄 Parsed upload request for file: ${uploadRequest.fileName}`);

    // Validate request
    const validationErrors = validateImageUploadRequest(uploadRequest, file);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Validation failed: ${validationErrors.join('; ')}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Database validation
    await validateImageUploadInDatabase(supabaseClient, uploadRequest);

    // Get authenticated user if auth header is provided
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');
    let authUser = null;
    let userId: string | undefined = undefined;

    if (authToken) {
      const { data: authData } = await supabaseClient.auth.getUser(authToken);
      if (authData.user) {
        authUser = await imageService.getAuthenticatedUser(authData.user.id);
        userId = authUser?.id;
      }
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Generate unique filename
    const sanitizedName = B2Utils.sanitizeFileName(uploadRequest.fileName);
    const uniqueFileName = B2Utils.generateUniqueFileName(sanitizedName);

    // Upload to B2
    console.log(`⬆️ Uploading file to B2: ${uniqueFileName}`);
    const uploadResult = await b2Storage.uploadFile(
      fileData,
      uniqueFileName,
      file.type,
      uploadRequest.metadata
    );

    console.log(`✅ File uploaded to B2 successfully`);

    // Handle image set creation/association
    let setId: string | undefined = uploadRequest.setId;

    if (uploadRequest.createNewSet && uploadRequest.setName) {
      console.log(`📁 Creating new image set: ${uploadRequest.setName}`);

      const imageSetData: ImageSetData = {
        name: uploadRequest.setName,
        remotePath: uploadRequest.setRemotePath || uploadResult.fileName,
        createdBy: userId,
      };

      const newSet = await imageService.createImageSet(imageSetData);
      setId = newSet.id;
      console.log(`✅ Created image set with ID: ${setId}`);
    }

    // Create image record in database
    console.log('💾 Creating image record in database');
    const imageData: ImageData = {
      remotePath: uploadResult.fileName,
      targetType: uploadRequest.targetType,
      targetId: uploadRequest.targetId,
      setId,
      createdBy: userId,
      fileSize: uploadResult.fileSize,
    };

    const image = await imageService.createImage(imageData);
    console.log(`✅ Created image record with ID: ${image.id}`);

    // Prepare response
    const response: ImageUploadResponse = {
      success: true,
      data: {
        imageId: image.id,
        setId,
        downloadUrl: uploadResult.downloadUrl,
        fileSize: uploadResult.fileSize,
        remotePath: uploadResult.fileName,
      },
    };

    console.log('🎉 Image upload completed successfully');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const response: ImageUploadResponse = {
      success: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  # Upload image with multipart form data
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upload-image' \
    --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
    --form 'file=@"/path/to/image.jpg"' \
    --form 'target_type="chapter"' \
    --form 'target_id="YOUR_CHAPTER_ID"' \
    --form 'set_name="Chapter Images"' \
    --form 'create_new_set="true"'

  # Upload image with JSON (for testing)
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upload-image' \
    --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "target_type": "chapter",
      "target_id": "YOUR_CHAPTER_ID",
      "filename": "test_image.png",
      "file_content": "test image data",
      "set_name": "Test Set",
      "create_new_set": true
    }'

*/
