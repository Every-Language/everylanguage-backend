# Frontend Integration Guide for AI Agent

## Overview for AI Implementation

This guide provides step-by-step instructions for implementing the bulk upload system frontend. Follow these instructions exactly to create a complete, working bulk upload interface with real-time progress tracking.

## Prerequisites

- React/Next.js frontend with Supabase client configured
- User authentication already implemented
- Access to the following backend endpoints:
  - `POST /functions/v1/upload-bible-chapter-audio-bulk`
  - `POST /functions/v1/get-upload-progress`

## Step 1: Define TypeScript Interfaces

Create these exact interfaces in your frontend:

```typescript
// types/upload.ts
export interface BibleChapterUploadRequest {
  fileName: string;
  languageEntityId: string;
  chapterId: string;
  startVerseId: string;
  endVerseId: string;
  durationSeconds: number;
  audioVersionId: string;
  verseTimings?: Array<{
    verseId: string;
    startTime: number;
    endTime: number;
  }>;
  tagIds?: string[];
}

export interface MediaFileRecord {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  version: number;
  error?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string;
    mediaRecords: MediaFileRecord[];
  };
  error?: string;
}

export interface UploadProgressData {
  totalFiles: number;
  pendingCount: number;
  uploadingCount: number;
  completedCount: number;
  failedCount: number;
  progress: {
    percentage: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
  files: Array<{
    mediaFileId: string;
    fileName: string;
    status: string;
    downloadUrl?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UploadProgressResponse {
  success: boolean;
  data?: UploadProgressData;
  error?: string;
}
```

## Step 2: Create Upload Service

Create this service file exactly as shown:

```typescript
// services/bulkUploadService.ts
import { createClient } from '@supabase/supabase-js';
import {
  BibleChapterUploadRequest,
  BulkUploadResponse,
  UploadProgressResponse,
} from '../types/upload';

class BulkUploadService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async uploadBulkFiles(
    files: File[],
    metadata: BibleChapterUploadRequest[]
  ): Promise<BulkUploadResponse> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    // Create FormData
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
      formData.append(`metadata_${index}`, JSON.stringify(metadata[index]));
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-bible-chapter-audio-bulk`,
      {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getUploadProgress(
    mediaFileIds: string[]
  ): Promise<UploadProgressResponse> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-upload-progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mediaFileIds }),
      }
    );

    if (!response.ok) {
      throw new Error(`Progress check failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Real-time subscription for immediate updates (optional enhancement)
  subscribeToUploadProgress(
    mediaFileIds: string[],
    onUpdate: (fileUpdate: any) => void
  ) {
    return this.supabase
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
          onUpdate(payload.new);
        }
      )
      .subscribe();
  }
}

export const bulkUploadService = new BulkUploadService();
```

## Step 3: Create Upload Progress Hook

Create this custom React hook:

```typescript
// hooks/useUploadProgress.ts
import { useState, useEffect, useCallback } from 'react';
import { bulkUploadService } from '../services/bulkUploadService';
import { UploadProgressData } from '../types/upload';

export const useUploadProgress = (mediaFileIds: string[]) => {
  const [progressData, setProgressData] = useState<UploadProgressData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkProgress = useCallback(async () => {
    if (mediaFileIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await bulkUploadService.getUploadProgress(mediaFileIds);
      if (response.success && response.data) {
        setProgressData(response.data);
      } else {
        setError(response.error || 'Failed to get progress');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [mediaFileIds]);

  useEffect(() => {
    if (mediaFileIds.length === 0) return;

    // Initial check
    checkProgress();

    // Set up polling (check every 2 seconds)
    const interval = setInterval(checkProgress, 2000);

    // Stop polling when all files are completed or failed
    if (
      progressData?.progress.status === 'completed' ||
      progressData?.progress.status === 'failed'
    ) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [mediaFileIds, checkProgress, progressData?.progress.status]);

  return {
    progressData,
    isLoading,
    error,
    refetch: checkProgress,
  };
};
```

## Step 4: Create Main Upload Component

Create this complete component:

```typescript
// components/BulkUploadComponent.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { bulkUploadService } from '../services/bulkUploadService';
import { useUploadProgress } from '../hooks/useUploadProgress';
import { BibleChapterUploadRequest, MediaFileRecord } from '../types/upload';

interface BulkUploadComponentProps {
  languageEntityId: string;
  audioVersionId: string;
  onUploadComplete?: (results: MediaFileRecord[]) => void;
}

export const BulkUploadComponent: React.FC<BulkUploadComponentProps> = ({
  languageEntityId,
  audioVersionId,
  onUploadComplete,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaFileIds, setMediaFileIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { progressData, error: progressError } = useUploadProgress(mediaFileIds);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for audio files only
    const audioFiles = acceptedFiles.filter(file =>
      file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac)$/i)
    );
    setSelectedFiles(audioFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
    },
    multiple: true,
  });

  const generateMetadata = (files: File[]): BibleChapterUploadRequest[] => {
    return files.map((file, index) => {
      // Extract chapter info from filename (customize this logic for your naming convention)
      const fileName = file.name;
      const chapterMatch = fileName.match(/chapter[_-]?(\d+)/i) || fileName.match(/(\d+)/);
      const chapterNumber = chapterMatch ? chapterMatch[1] : String(index + 1);

      return {
        fileName: file.name,
        languageEntityId,
        audioVersionId,
        chapterId: `chapter-${chapterNumber}`, // Adjust based on your chapter ID format
        startVerseId: `verse-${chapterNumber}-1`, // Adjust based on your verse ID format
        endVerseId: `verse-${chapterNumber}-999`, // Adjust based on your verse ID format
        durationSeconds: 0, // Will be calculated during upload
        // Add verseTimings and tagIds as needed
      };
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const metadata = generateMetadata(selectedFiles);
      const response = await bulkUploadService.uploadBulkFiles(selectedFiles, metadata);

      if (response.success && response.data) {
        const fileIds = response.data.mediaRecords.map(record => record.mediaFileId);
        setMediaFileIds(fileIds);

        // Clear selected files since upload has started
        setSelectedFiles([]);
      } else {
        setUploadError(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setMediaFileIds([]);
    setUploadError(null);
  };

  // Call completion callback when all uploads are done
  React.useEffect(() => {
    if (
      progressData?.progress.status === 'completed' &&
      progressData.files.length > 0 &&
      onUploadComplete
    ) {
      const results: MediaFileRecord[] = progressData.files.map(file => ({
        mediaFileId: file.mediaFileId,
        fileName: file.fileName,
        status: file.status as any,
        version: 1, // Default version
        error: file.error,
      }));
      onUploadComplete(results);
    }
  }, [progressData, onUploadComplete]);

  return (
    <div className="bulk-upload-container p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Bulk Audio Upload</h2>

      {/* File Drop Zone */}
      {selectedFiles.length === 0 && mediaFileIds.length === 0 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {isDragActive ? (
              <p>Drop the audio files here...</p>
            ) : (
              <div>
                <p className="text-lg">Drag & drop audio files here, or click to select</p>
                <p className="text-sm text-gray-500 mt-2">Supports: MP3, WAV, M4A, AAC</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Selected Files ({selectedFiles.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploading ? 'Starting Upload...' : `Upload ${selectedFiles.length} Files`}
            </button>
            <button
              onClick={resetUpload}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {progressData && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Upload Progress</h3>

          {/* Overall Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span>{progressData.progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  progressData.progress.status === 'completed' ? 'bg-green-500' :
                  progressData.progress.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${progressData.progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4 text-center">
            <div className="bg-yellow-100 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-800">{progressData.pendingCount}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-100 p-3 rounded">
              <div className="text-2xl font-bold text-blue-800">{progressData.uploadingCount}</div>
              <div className="text-sm text-blue-600">Uploading</div>
            </div>
            <div className="bg-green-100 p-3 rounded">
              <div className="text-2xl font-bold text-green-800">{progressData.completedCount}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="bg-red-100 p-3 rounded">
              <div className="text-2xl font-bold text-red-800">{progressData.failedCount}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>

          {/* Individual File Status */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {progressData.files.map(file => (
              <div key={file.mediaFileId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex-1">
                  <p className="font-medium">{file.fileName}</p>
                  {file.error && <p className="text-sm text-red-500">{file.error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      file.status === 'completed' ? 'bg-green-100 text-green-800' :
                      file.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                      file.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {file.status}
                  </span>
                  {file.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reset Button */}
          {(progressData.progress.status === 'completed' || progressData.progress.status === 'failed') && (
            <button
              onClick={resetUpload}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Upload More Files
            </button>
          )}
        </div>
      )}

      {/* Error Messages */}
      {(uploadError || progressError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {uploadError || progressError}
        </div>
      )}
    </div>
  );
};
```

## Step 5: Add Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "react-dropzone": "^14.0.0"
  }
}
```

Run: `npm install react-dropzone`

## Step 6: Add Styling (Tailwind CSS)

The component above uses Tailwind CSS classes. If you're not using Tailwind, replace with your own CSS:

```css
/* Alternative CSS if not using Tailwind */
.bulk-upload-container {
  padding: 1.5rem;
  max-width: 64rem;
  margin: 0 auto;
}

.file-drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-drop-zone:hover {
  border-color: #9ca3af;
}

.file-drop-zone.active {
  border-color: #3b82f6;
  background-color: #dbeafe;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-card {
  padding: 0.75rem;
  border-radius: 0.375rem;
  text-align: center;
}
```

## Step 7: Usage Example

Use the component in your application:

```typescript
// pages/upload.tsx or your upload page
import React from 'react';
import { BulkUploadComponent } from '../components/BulkUploadComponent';

export default function UploadPage() {
  const handleUploadComplete = (results) => {
    console.log('Upload completed:', results);
    // Handle completion (show success message, redirect, etc.)
  };

  return (
    <div>
      <BulkUploadComponent
        languageEntityId="your-language-id"
        audioVersionId="your-audio-version-id"
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
```

## Step 8: Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 9: Error Handling and Testing

### Test Cases to Implement:

1. **File Upload Test:**

```javascript
// Test successful upload
const testFiles = [new File(['test'], 'test1.mp3', { type: 'audio/mpeg' })];
// Should create records and start progress tracking
```

2. **Progress Tracking Test:**

```javascript
// Test progress polling
// Should show pending → uploading → completed states
```

3. **Error Handling Test:**

```javascript
// Test with invalid files, network errors, auth failures
// Should show appropriate error messages
```

## Step 10: Performance Optimizations

1. **Debounce progress checks** if user has many uploads
2. **Use React.memo** for file list items
3. **Implement virtual scrolling** for large file lists
4. **Add file size limits** and validation

## Implementation Checklist

- [ ] Install dependencies (`react-dropzone`)
- [ ] Create TypeScript interfaces
- [ ] Implement upload service
- [ ] Create progress tracking hook
- [ ] Build main upload component
- [ ] Add styling (Tailwind or custom CSS)
- [ ] Set up environment variables
- [ ] Test file upload flow
- [ ] Test progress tracking
- [ ] Test error handling
- [ ] Add to your application

## API Endpoint Summary

### Upload Endpoint

- **URL:** `POST /functions/v1/upload-bible-chapter-audio-bulk`
- **Content-Type:** `multipart/form-data`
- **Auth:** Bearer token in Authorization header
- **Body:** Files as `file_0`, `file_1`, etc. + metadata as `metadata_0`, `metadata_1`, etc.

### Progress Endpoint

- **URL:** `POST /functions/v1/get-upload-progress`
- **Content-Type:** `application/json`
- **Auth:** Bearer token in Authorization header
- **Body:** `{ "mediaFileIds": ["uuid1", "uuid2", ...] }`

## Common Customizations

1. **Custom file naming logic** in `generateMetadata()`
2. **Different progress polling intervals** (currently 2 seconds)
3. **File validation rules** (size limits, file types)
4. **Custom UI styling** to match your design system
5. **Integration with your existing upload workflows**

Follow these steps exactly, and you'll have a fully functional bulk upload system with real-time progress tracking!
