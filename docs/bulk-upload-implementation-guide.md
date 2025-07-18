# Bulk Bible Chapter Audio Upload Implementation Guide

This guide provides complete instructions for implementing the bulk upload functionality using the `upload-bible-chapter-audio-bulk` Edge Function.

## Overview

The bulk upload system uses a **two-phase approach**:

1. **Phase 1**: Create all database records immediately with `'pending'` status
2. **Phase 2**: Process uploads concurrently (5 files at a time) with real-time status updates

This allows for immediate UI feedback and better user experience during large batch uploads.

## API Endpoint

```
POST /functions/v1/upload-bible-chapter-audio-bulk
```

## Request Format

### Content Type

```
Content-Type: multipart/form-data
```

### Form Data Structure

```typescript
// For each file, include:
// - file_{index}: The actual File object
// - metadata_{index}: JSON string with file metadata

const formData = new FormData();

// File 0
formData.append('file_0', audioFile1);
formData.append(
  'metadata_0',
  JSON.stringify({
    languageEntityId: 'uuid-here',
    projectId: 'uuid-here', // optional
    fileName: 'chapter1.mp3',
    durationSeconds: 180,
    startVerseId: 'verse-id-1',
    endVerseId: 'verse-id-31',
    chapterId: 'chapter-id-1',
    verseTimings: [
      // optional
      {
        verseId: 'verse-id-1',
        startTimeSeconds: 0,
        durationSeconds: 5.2,
      },
      // ... more verse timings
    ],
    tagIds: ['tag1', 'tag2'], // optional
  })
);

// File 1
formData.append('file_1', audioFile2);
formData.append(
  'metadata_1',
  JSON.stringify({
    // ... metadata for second file
  })
);

// Continue for all files...
```

### Metadata Object Schema

```typescript
interface BibleChapterUploadRequest {
  languageEntityId: string; // Required: UUID of language entity
  projectId?: string; // Optional: UUID of project
  fileName: string; // Required: Original filename
  durationSeconds: number; // Required: Audio duration in seconds
  startVerseId: string; // Required: Starting verse ID
  endVerseId: string; // Required: Ending verse ID
  chapterId: string; // Required: Chapter ID for grouping
  verseTimings?: Array<{
    // Optional: Verse timing data
    verseId: string;
    startTimeSeconds: number;
    durationSeconds: number;
  }>;
  tagIds?: string[]; // Optional: Array of tag UUIDs
}
```

## Response Format

### Success Response

```typescript
{
  success: true,
  data: {
    totalFiles: 10,
    successfulUploads: 8,
    failedUploads: 2,
    mediaRecords: [
      {
        mediaFileId: "uuid-here",
        fileName: "chapter1.mp3",
        status: "completed",
        uploadResult: {
          downloadUrl: "https://b2-download-url",
          fileSize: 1024000,
          version: 1
        }
      },
      {
        mediaFileId: "uuid-here",
        fileName: "chapter2.mp3",
        status: "failed",
        error: "Validation failed: Invalid file format"
      }
      // ... more records
    ]
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Bulk upload failed",
  details: "Authentication required"
}
```

## Frontend Implementation

### 1. Basic Upload Function

```typescript
interface UploadFile {
  file: File;
  metadata: BibleChapterUploadRequest;
}

async function bulkUploadBibleChapters(
  files: UploadFile[],
  authToken: string
): Promise<BulkUploadResponse> {
  const formData = new FormData();

  // Add files and metadata to form data
  files.forEach((item, index) => {
    formData.append(`file_${index}`, item.file);
    formData.append(`metadata_${index}`, JSON.stringify(item.metadata));
  });

  const response = await fetch(
    '/functions/v1/upload-bible-chapter-audio-bulk',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
```

### 2. Upload with Progress Tracking

```typescript
import { createClient } from '@supabase/supabase-js';

interface UploadProgress {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  uploadResult?: {
    downloadUrl: string;
    fileSize: number;
    version: number;
  };
}

class BulkUploadManager {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private progressCallback?: (progress: UploadProgress[]) => void;
  private subscription?: any;

  constructor(onProgress?: (progress: UploadProgress[]) => void) {
    this.progressCallback = onProgress;
  }

  async startBulkUpload(files: UploadFile[], authToken: string) {
    try {
      // 1. Start the upload
      const result = await bulkUploadBibleChapters(files, authToken);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Upload failed');
      }

      // 2. Set up real-time progress tracking
      this.setupProgressTracking(result.data.mediaRecords);

      // 3. Return initial result
      return result;
    } catch (error) {
      console.error('Bulk upload failed:', error);
      throw error;
    }
  }

  private setupProgressTracking(mediaRecords: any[]) {
    const mediaFileIds = mediaRecords.map(r => r.mediaFileId).filter(Boolean);

    if (mediaFileIds.length === 0) return;

    // Subscribe to database changes for these media files
    this.subscription = this.supabase
      .channel('bulk_upload_progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_files',
          filter: `id=in.(${mediaFileIds.join(',')})`,
        },
        payload => {
          this.handleProgressUpdate(payload.new);
        }
      )
      .subscribe();
  }

  private handleProgressUpdate(updatedRecord: any) {
    // Convert database record to progress format
    const progress: UploadProgress = {
      mediaFileId: updatedRecord.id,
      fileName: updatedRecord.remote_path || 'Unknown', // You might want to store filename differently
      status: updatedRecord.upload_status,
      uploadResult:
        updatedRecord.upload_status === 'completed'
          ? {
              downloadUrl: updatedRecord.remote_path,
              fileSize: updatedRecord.file_size,
              version: updatedRecord.version,
            }
          : undefined,
    };

    // Notify the UI
    if (this.progressCallback) {
      this.progressCallback([progress]); // You'll need to manage the full progress array
    }
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
```

### 3. React Component Example

```tsx
import React, { useState, useCallback, useEffect } from 'react';

interface UploadProgressState {
  [mediaFileId: string]: UploadProgress;
}

export function BulkUploadComponent() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState>({});
  const [uploadManager, setUploadManager] = useState<BulkUploadManager | null>(
    null
  );

  const handleProgressUpdate = useCallback((updates: UploadProgress[]) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      updates.forEach(update => {
        newProgress[update.mediaFileId] = update;
      });
      return newProgress;
    });
  }, []);

  const startUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const manager = new BulkUploadManager(handleProgressUpdate);
      setUploadManager(manager);

      const result = await manager.startBulkUpload(files, authToken);

      // Initialize progress state with all records
      const initialProgress: UploadProgressState = {};
      result.data!.mediaRecords.forEach(record => {
        initialProgress[record.mediaFileId] = {
          mediaFileId: record.mediaFileId,
          fileName: record.fileName,
          status: record.status,
          error: record.error,
          uploadResult: record.uploadResult,
        };
      });
      setProgress(initialProgress);

      console.log('Bulk upload started:', result);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadManager?.cleanup();
    };
  }, [uploadManager]);

  // Check if all uploads are complete
  const allUploadsComplete = Object.values(progress).every(
    p => p.status === 'completed' || p.status === 'failed'
  );

  useEffect(() => {
    if (allUploadsComplete && Object.keys(progress).length > 0) {
      setIsUploading(false);
      uploadManager?.cleanup();
    }
  }, [allUploadsComplete, progress, uploadManager]);

  return (
    <div>
      {/* File selection UI */}
      <input
        type='file'
        multiple
        accept='audio/*'
        onChange={e => {
          // Handle file selection and metadata creation
          // You'll need to implement this based on your UI
        }}
      />

      {/* Upload button */}
      <button
        onClick={startUpload}
        disabled={isUploading || files.length === 0}
      >
        {isUploading ? 'Uploading...' : `Upload ${files.length} Files`}
      </button>

      {/* Progress display */}
      {Object.keys(progress).length > 0 && (
        <div>
          <h3>Upload Progress</h3>
          {Object.values(progress).map(item => (
            <div key={item.mediaFileId} className='progress-item'>
              <span>{item.fileName}</span>
              <span className={`status ${item.status}`}>
                {item.status === 'pending' && '⏳ Pending'}
                {item.status === 'uploading' && '⬆️ Uploading'}
                {item.status === 'completed' && '✅ Completed'}
                {item.status === 'failed' && '❌ Failed'}
              </span>
              {item.error && <span className='error'>{item.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {allUploadsComplete && Object.keys(progress).length > 0 && (
        <div>
          <h3>Upload Summary</h3>
          <p>
            Completed:{' '}
            {
              Object.values(progress).filter(p => p.status === 'completed')
                .length
            }{' '}
            / Failed:{' '}
            {Object.values(progress).filter(p => p.status === 'failed').length}
          </p>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### Common Error Scenarios

1. **Authentication Errors**

   ```typescript
   // 401 Unauthorized
   {
     success: false,
     error: "Authentication required"
   }
   ```

2. **Validation Errors**

   ```typescript
   // Individual files can fail validation
   {
     mediaFileId: "uuid",
     fileName: "chapter1.mp3",
     status: "failed",
     error: "Validation failed: Invalid file format"
   }
   ```

3. **Upload Errors**
   ```typescript
   // Files can fail during upload phase
   {
     mediaFileId: "uuid",
     fileName: "chapter1.mp3",
     status: "failed",
     error: "Upload failed: Network timeout"
   }
   ```

### Error Handling Strategy

```typescript
try {
  const result = await bulkUploadBibleChapters(files, authToken);

  if (!result.success) {
    // Handle API-level errors
    throw new Error(result.error);
  }

  // Check for individual file failures
  const failedFiles = result.data!.mediaRecords.filter(
    r => r.status === 'failed'
  );
  if (failedFiles.length > 0) {
    console.warn('Some files failed:', failedFiles);
    // You might want to show these to the user or offer retry options
  }
} catch (error) {
  // Handle network errors, authentication errors, etc.
  console.error('Bulk upload failed:', error);

  if (error.message.includes('401')) {
    // Redirect to login
  } else if (error.message.includes('413')) {
    // File too large error
  } else {
    // Generic error handling
  }
}
```

## Performance Considerations

1. **File Size Limits**: The function processes 5 files concurrently. Very large files may cause timeouts.

2. **Memory Usage**: Large batches (>50 files) may consume significant memory. Consider chunking uploads.

3. **Network Timeouts**: Monitor for network timeouts on large files and implement retry logic.

4. **Real-time Updates**: Clean up Supabase subscriptions to prevent memory leaks.

## Best Practices

1. **Validate files before upload**: Check file types and sizes client-side first
2. **Show progress immediately**: Use the pending status to show files in queue
3. **Handle partial failures gracefully**: Allow users to retry failed uploads
4. **Cleanup subscriptions**: Always unsubscribe from real-time updates
5. **Provide clear feedback**: Show detailed error messages for failed uploads
6. **Consider chunking**: For very large batches, consider multiple smaller requests

## Testing

### Test with Mock Data

```typescript
const mockFiles: UploadFile[] = [
  {
    file: new File(['mock audio'], 'chapter1.mp3', { type: 'audio/mpeg' }),
    metadata: {
      languageEntityId: 'test-lang-id',
      fileName: 'chapter1.mp3',
      durationSeconds: 180,
      startVerseId: 'verse-1',
      endVerseId: 'verse-31',
      chapterId: 'chapter-1',
    },
  },
  // ... more test files
];

// Test the upload
const result = await bulkUploadBibleChapters(mockFiles, 'test-token');
console.log('Test result:', result);
```

This implementation provides a robust, user-friendly bulk upload experience with real-time progress tracking and comprehensive error handling.
