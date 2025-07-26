# Bulk Upload Frontend Implementation Guide

This guide explains how to implement the new split bulk upload system that provides real-time progress updates for better UX.

## Overview

The bulk upload system is split into three components:

1. **`initiate-bulk-upload`** - Creates database records immediately and returns
2. **`upload-file-to-queue`** - Uploads file data to the processing queue
3. **`process-bulk-upload-queue`** - Background processing (can be triggered manually or via cron)

## Frontend Implementation

### 1. Basic Upload Flow

```typescript
interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    validRecords: number;
    invalidRecords: number;
    queueId: string;
    mediaRecords: Array<{
      mediaFileId: string;
      queueItemId: string; // ID for the queue item, needed for file uploads
      fileName: string;
      status: 'pending' | 'failed';
      version: number;
      error?: string;
    }>;
  };
  error?: string;
}

// Step 1: Initiate bulk upload
async function initiateBulkUpload(
  files: File[],
  metadata: BibleChapterUploadRequest[]
) {
  const response = await fetch('/functions/v1/initiate-bulk-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: files.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      })),
      metadata,
    }),
  });

  return (await response.json()) as BulkUploadResponse;
}

// Step 2: Upload files to queue
async function uploadFilesToQueue(
  files: File[],
  mediaRecords: MediaFileRecord[]
) {
  const uploads = files.map(async (file, index) => {
    const record = mediaRecords[index];
    if (record.status === 'failed') return record;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('queueItemId', record.queueItemId); // Use the actual queue item ID

    const response = await fetch('/functions/v1/upload-file-to-queue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    return await response.json();
  });

  return await Promise.all(uploads);
}

// Step 3: Trigger background processing (optional - can also use cron)
async function triggerBackgroundProcessing(queueId: string) {
  const response = await fetch('/functions/v1/process-bulk-upload-queue', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queueId }),
  });

  return await response.json();
}
```

### 2. React Implementation with Real-time Updates

```tsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface UploadProgress {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
}

export function BulkUploadComponent() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [supabase] = useState(() =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  );

  // Real-time subscription to media_files table
  useEffect(() => {
    if (uploads.length === 0) return;

    const mediaFileIds = uploads.map(u => u.mediaFileId);

    const subscription = supabase
      .channel('media_files_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_files',
          filter: `id=in.(${mediaFileIds.join(',')})`,
        },
        payload => {
          const updatedRecord = payload.new;
          setUploads(prev =>
            prev.map(upload =>
              upload.mediaFileId === updatedRecord.id
                ? {
                    ...upload,
                    status: updatedRecord.upload_status,
                    progress: getProgressFromStatus(
                      updatedRecord.upload_status
                    ),
                  }
                : upload
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [uploads, supabase]);

  const handleBulkUpload = async (
    files: File[],
    metadata: BibleChapterUploadRequest[]
  ) => {
    try {
      // Step 1: Initiate upload - creates records immediately
      const initResponse = await initiateBulkUpload(files, metadata);

      if (!initResponse.success) {
        throw new Error(initResponse.error);
      }

      // Initialize progress tracking
      const initialUploads: UploadProgress[] =
        initResponse.data!.mediaRecords.map(record => ({
          mediaFileId: record.mediaFileId,
          fileName: record.fileName,
          status: record.status,
          progress: record.status === 'failed' ? 0 : 10, // 10% for record creation
          error: record.error,
        }));

      setUploads(initialUploads);

      // Step 2: Upload file data to queue
      const uploadResponses = await uploadFilesToQueue(
        files,
        initResponse.data!.mediaRecords
      );

      // Update progress after files are queued
      setUploads(prev =>
        prev.map(upload => ({
          ...upload,
          progress: upload.status === 'failed' ? 0 : 30, // 30% for file upload to queue
        }))
      );

      // Step 3: Trigger background processing
      await triggerBackgroundProcessing(initResponse.data!.queueId);

      // Real-time updates will handle the rest via Supabase subscription
    } catch (error) {
      console.error('Bulk upload failed:', error);
      // Handle error appropriately
    }
  };

  const getProgressFromStatus = (status: string): number => {
    switch (status) {
      case 'pending':
        return 10;
      case 'uploading':
        return 70;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div>
      <h2>Bulk Upload Progress</h2>
      {uploads.map(upload => (
        <div key={upload.mediaFileId} className='upload-item'>
          <div className='file-name'>{upload.fileName}</div>
          <div className='progress-bar'>
            <div
              className='progress-fill'
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <div className='status'>
            {upload.status === 'completed' && '✅ Complete'}
            {upload.status === 'uploading' && '⏳ Uploading...'}
            {upload.status === 'pending' && '📋 Pending'}
            {upload.status === 'failed' && `❌ Failed: ${upload.error}`}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. Advanced Features

#### Retry Failed Uploads

```typescript
async function retryFailedUploads(queueId: string) {
  // Reset failed queue items back to 'queued' status
  const response = await fetch('/functions/v1/retry-failed-uploads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queueId }),
  });

  return await response.json();
}
```

#### Cancel Uploads

```typescript
async function cancelQueuedUploads(queueId: string) {
  const response = await fetch('/functions/v1/cancel-queued-uploads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queueId }),
  });

  return await response.json();
}
```

#### Progress Tracking with Queue Status

```typescript
// Subscribe to upload_queue table for more detailed progress
useEffect(() => {
  if (!queueId) return;

  const subscription = supabase
    .channel('upload_queue_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'upload_queue',
        filter: `queue_id=eq.${queueId}`,
      },
      payload => {
        const queueItem = payload.new || payload.old;

        setUploads(prev =>
          prev.map(upload => {
            if (upload.mediaFileId === queueItem.media_file_id) {
              return {
                ...upload,
                status:
                  queueItem.status === 'processing'
                    ? 'uploading'
                    : upload.status,
                progress: getQueueProgressFromStatus(queueItem.status),
                error: queueItem.error_message,
              };
            }
            return upload;
          })
        );
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [queueId, supabase]);

const getQueueProgressFromStatus = (status: string): number => {
  switch (status) {
    case 'queued':
      return 30;
    case 'processing':
      return 70;
    case 'completed':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
};
```

## Backend Deployment

### 1. Apply Database Migration

```bash
supabase migration up
```

### 2. Deploy Edge Functions

```bash
supabase functions deploy initiate-bulk-upload
supabase functions deploy upload-file-to-queue
supabase functions deploy process-bulk-upload-queue
```

### 3. Set up Cron Job (Optional)

You can set up a cron job to automatically process the queue:

```bash
# Every 5 minutes
*/5 * * * * curl -X POST "https://your-project.supabase.co/functions/v1/process-bulk-upload-queue" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Migration from Existing System

If you want to maintain backward compatibility, both systems can coexist:

1. Keep the existing `upload-bible-chapter-audio-bulk` function
2. Add the new functions alongside
3. Update frontend to use new system for better UX
4. Gradually migrate existing users

### Feature Comparison

| Feature        | Old System              | New System                 |
| -------------- | ----------------------- | -------------------------- |
| User Feedback  | Wait for completion     | Immediate + Real-time      |
| Error Handling | All-or-nothing          | Per-file granularity       |
| Recovery       | Manual restart          | Automatic retry capability |
| Scalability    | Function timeout limits | Background processing      |
| Monitoring     | Limited                 | Detailed queue status      |

## Troubleshooting

### Common Issues

1. **Files not uploading**: Check if `upload-file-to-queue` is being called correctly
2. **No real-time updates**: Verify Supabase RLS policies allow reading `media_files` and `upload_queue`
3. **Background processing not starting**: Manually trigger or check cron setup
4. **Memory issues**: Adjust `batchSize` in queue processing

### Debugging

```typescript
// Check queue status
async function getQueueStatus(queueId: string) {
  const response = await fetch(
    `/functions/v1/get-queue-status?queueId=${queueId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return await response.json();
}
```

This implementation provides a much better user experience with immediate feedback and real-time progress updates, while maintaining the reliability and error handling needed for production use.
