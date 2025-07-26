# Improved Bulk Upload System

## Overview

The improved bulk upload system provides efficient bulk file uploads with real-time progress tracking, eliminating the need to store binary data in Postgres.

## Key Features

- ✅ **Immediate feedback**: DB records created instantly with "pending" status
- ✅ **No binary storage in Postgres**: Files uploaded directly to B2 storage
- ✅ **Real-time progress tracking**: Status updates from pending → uploading → completed/failed
- ✅ **Efficient concurrency**: Controlled background processing (3 uploads at a time)
- ✅ **Per-file granularity**: Track status of individual files in a batch
- ✅ **Error handling**: Failed uploads marked appropriately with error details

## Architecture

### 1. Bulk Upload Endpoint (`upload-bible-chapter-audio-bulk`)

**Flow:**

1. **Immediate validation & record creation**: Creates all DB records with "pending" status
2. **Immediate response**: Returns record IDs and batch information to frontend
3. **Background processing**: Uploads files to B2 and updates statuses asynchronously

**Request Format:**

```
POST /functions/v1/upload-bible-chapter-audio-bulk
Content-Type: multipart/form-data

file_0: [File]
metadata_0: [JSON string with BibleChapterUploadRequest]
file_1: [File]
metadata_1: [JSON string with BibleChapterUploadRequest]
...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalFiles": 5,
    "batchId": "uuid-here",
    "mediaRecords": [
      {
        "mediaFileId": "uuid",
        "fileName": "chapter1.mp3",
        "status": "pending",
        "version": 1
      }
    ]
  }
}
```

### 2. Progress Tracking Endpoint (`get-upload-progress`)

**Flow:**

1. Query `media_files` table for current upload statuses
2. Calculate progress statistics
3. Return real-time status for frontend

**Request Format:**

```
POST /functions/v1/get-upload-progress
Content-Type: application/json

{
  "mediaFileIds": ["uuid1", "uuid2", ...], // Optional: specific files
  "batchId": "uuid"  // Optional: filter by batch
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalFiles": 5,
    "pendingCount": 1,
    "uploadingCount": 2,
    "completedCount": 2,
    "failedCount": 0,
    "progress": {
      "percentage": 40,
      "status": "in_progress"
    },
    "files": [
      {
        "mediaFileId": "uuid",
        "fileName": "chapter1.mp3",
        "status": "completed",
        "downloadUrl": "https://...",
        "createdAt": "2025-01-26T...",
        "updatedAt": "2025-01-26T..."
      }
    ]
  }
}
```

## Status Flow

Each file progresses through these statuses:

1. **`pending`** - Record created, waiting to start upload
2. **`uploading`** - Currently uploading to B2 storage
3. **`completed`** - Successfully uploaded with download URL
4. **`failed`** - Upload failed with error message

## Frontend Implementation

### 1. Initiate Upload

```javascript
const formData = new FormData();
files.forEach((file, index) => {
  formData.append(`file_${index}`, file);
  formData.append(`metadata_${index}`, JSON.stringify(metadata[index]));
});

const response = await fetch('/functions/v1/upload-bible-chapter-audio-bulk', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${token}` },
});

const result = await response.json();
// result.data.mediaRecords contains the created records
```

### 2. Track Progress

```javascript
// Poll for progress updates
const checkProgress = async mediaFileIds => {
  const response = await fetch('/functions/v1/get-upload-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mediaFileIds }),
  });

  const progress = await response.json();
  return progress.data;
};

// Use setInterval or real-time subscriptions
const progressInterval = setInterval(async () => {
  const progress = await checkProgress(mediaFileIds);
  updateUI(progress);

  if (
    progress.progress.status === 'completed' ||
    progress.progress.status === 'failed'
  ) {
    clearInterval(progressInterval);
  }
}, 2000); // Check every 2 seconds
```

### 3. Real-time Updates (Alternative)

```javascript
// Using Supabase real-time subscriptions for immediate updates
const subscription = supabase
  .channel('media_files_changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'media_files',
      filter: `id=in.(${mediaFileIds.join(',')})`,
    },
    payload => {
      console.log('Status update:', payload.new);
      updateFileStatus(payload.new);
    }
  )
  .subscribe();
```

## Benefits vs Previous System

| Aspect                | Old Queue System                | New Direct System            |
| --------------------- | ------------------------------- | ---------------------------- |
| **Binary Storage**    | ❌ Stored in Postgres `bytea`   | ✅ Direct upload to B2       |
| **Efficiency**        | ❌ Large DB overhead            | ✅ Minimal DB usage          |
| **Progress Tracking** | ❌ Required polling queue table | ✅ Real-time via media_files |
| **Complexity**        | ❌ 3 separate functions         | ✅ 2 simple endpoints        |
| **User Experience**   | ❌ Delayed feedback             | ✅ Immediate record creation |
| **Error Recovery**    | ❌ Complex queue management     | ✅ Simple retry logic        |
| **Scalability**       | ❌ Limited by DB storage        | ✅ Scales with B2 storage    |

## Database Schema Changes

- **Removed**: `upload_queue` table (no longer needed)
- **Leverages**: Existing `media_files.upload_status` column for progress tracking
- **Simplified**: No binary data storage, just metadata and status tracking

## Migration Path

1. Deploy new bulk upload function
2. Update frontend to use new endpoints
3. Run migration to drop `upload_queue` table
4. Remove old queue-based function deployments

## Performance Characteristics

- **Immediate response**: ~200-500ms (just DB record creation)
- **Background upload**: 3 concurrent uploads for optimal throughput
- **Progress polling**: ~50-100ms per check (simple DB query)
- **Memory usage**: Minimal (no binary data in memory/DB)
- **Storage costs**: Reduced (no duplicate binary storage)
