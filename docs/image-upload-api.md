# Image Upload API Documentation

This document describes the image upload functionality that allows users to upload images and associate them with content (chapters, books, verses, etc.) and optionally organize them into image sets.

## Overview

The image upload system consists of:

1. **Database Migration**: Adds `images` and `image_sets` tables with proper RLS policies
2. **Edge Function**: `upload-image` function that handles file uploads and database operations
3. **Shared Modules**: Validation, service, and storage utilities
4. **Comprehensive Tests**: Unit and integration tests for all components

## Database Schema

### Images Table

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  remote_path TEXT NOT NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  set_id UUID REFERENCES image_sets (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

### Image Sets Table

```sql
CREATE TABLE image_sets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  remote_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Testament Field (Books Table Enhancement)

```sql
ALTER TABLE books ADD COLUMN testament testament;
```

## RLS Policies

- **Anyone (authenticated/unauthenticated)**: Can read images and image sets
- **Authenticated users**: Can insert images and image sets
- **Users**: Can only update/delete their own records (based on `created_by`)
- **No direct deletes**: Images use soft deletion (`deleted_at`)

## API Endpoints

### Upload Image

**Endpoint**: `POST /functions/v1/upload-image`

**Content Types Supported**:

- `multipart/form-data` (for file uploads)
- `application/json` (for testing with mock data)

#### Request Parameters

| Parameter         | Type    | Required | Description                                                                                  |
| ----------------- | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `file`            | File    | Yes\*    | Image file (multipart only)                                                                  |
| `target_type`     | String  | Yes      | Type of content: chapter, book, verse, sermon, passage, podcast, film_segment, audio_segment |
| `target_id`       | String  | Yes      | ID of the target content                                                                     |
| `set_id`          | String  | No       | ID of existing image set to add image to                                                     |
| `set_name`        | String  | No\*\*   | Name for new image set                                                                       |
| `set_remote_path` | String  | No       | Remote path for new image set                                                                |
| `create_new_set`  | Boolean | No       | Whether to create a new image set                                                            |
| `metadata`        | Object  | No       | Additional metadata for the image                                                            |

\*Required for multipart requests, simulated for JSON requests  
\*\*Required when `create_new_set` is true

#### Example Requests

**Multipart Form Upload:**

```bash
curl -X POST 'http://localhost:54321/functions/v1/upload-image' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@/path/to/image.jpg' \
  -F 'target_type=chapter' \
  -F 'target_id=chapter-uuid' \
  -F 'set_name=Chapter Images' \
  -F 'create_new_set=true'
```

**JSON Upload (for testing):**

```bash
curl -X POST 'http://localhost:54321/functions/v1/upload-image' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "target_type": "chapter",
    "target_id": "chapter-uuid",
    "filename": "test.jpg",
    "file_content": "fake content",
    "create_new_set": true,
    "set_name": "Test Set"
  }'
```

#### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "imageId": "uuid",
    "setId": "uuid",
    "downloadUrl": "https://...",
    "fileSize": 1024,
    "remotePath": "timestamp-filename.ext"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Supported Image Types

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`
- `image/bmp`
- `image/tiff`

## File Size Limits

- **Maximum**: 50MB
- **Minimum**: 1KB

## Validation Rules

### Required Fields

- `target_type`: Must be valid enum value
- `target_id`: Must be provided
- `filename`: Must be provided

### Image Set Rules

- If `create_new_set` is true, `set_name` is required
- Cannot specify both `set_id` and `create_new_set=true`
- Cannot specify both `set_id` and `set_name` for existing sets

### Target Validation

- `chapter`, `book`, `verse` targets are validated against database
- Other target types are accepted without specific validation

## Architecture

### Shared Modules

1. **`image-validation.ts`**: Request parsing and validation logic
2. **`image-service.ts`**: Database operations for images and sets
3. **`b2-storage-service.ts`**: File upload to B2 storage (existing)

### Edge Function Flow

1. Parse request (multipart or JSON)
2. Validate request parameters
3. Validate against database (targets, sets)
4. Authenticate user (optional)
5. Upload file to B2 storage
6. Create image set (if requested)
7. Create image record in database
8. Return response with URLs and IDs

## Testing

### Unit Tests

- `tests/unit/image-validation.test.ts`: Validation logic tests
- `tests/unit/image-service.test.ts`: Database service tests

### Integration Tests

- `tests/integration/image-upload/basic-upload.test.ts`: End-to-end upload tests

### Development Testing

- `scripts/dev-tools/test_image_upload.js`: Manual testing script

**Run the test script:**

```bash
node scripts/dev-tools/test_image_upload.js
```

## Error Handling

### Common Error Scenarios

1. **Invalid file type**: Returns 400 with supported types list
2. **File too large/small**: Returns 400 with size limits
3. **Missing required fields**: Returns 400 with field names
4. **Invalid target type**: Returns 400 with valid options
5. **Target not found**: Returns 400 with target validation error
6. **Set creation conflicts**: Returns 400 with parameter conflict details
7. **Storage upload failure**: Returns 500 with upload error
8. **Database errors**: Returns 500 with database error

### CORS Support

The function includes proper CORS headers for browser-based uploads:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Usage Examples

### Basic Image Upload

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('target_type', 'chapter');
formData.append('target_id', chapterId);

const response = await fetch('/functions/v1/upload-image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

const result = await response.json();
```

### Create Image Set with Upload

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('target_type', 'book');
formData.append('target_id', bookId);
formData.append('create_new_set', 'true');
formData.append('set_name', 'Book Illustrations');

const response = await fetch('/functions/v1/upload-image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Add to Existing Set

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('target_type', 'verse');
formData.append('target_id', verseId);
formData.append('set_id', existingSetId);

const response = await fetch('/functions/v1/upload-image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

## Deployment

1. **Apply migration**: `supabase migration up`
2. **Deploy function**: `supabase functions deploy upload-image`
3. **Set environment variables**: Ensure B2 credentials are configured
4. **Test functionality**: Run the test script or integration tests

## Security Notes

- RLS policies ensure users can only modify their own content
- File uploads are validated for type and size
- All database targets are validated before creation
- Soft deletion prevents data loss while maintaining referential integrity
- B2 storage provides secure file hosting with unique filenames
