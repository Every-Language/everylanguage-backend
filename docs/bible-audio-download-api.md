# Bible Audio Download API Guide

## Overview

The Bible Audio Download system uses presigned URLs for secure, direct downloads from B2 storage. This approach is optimized for offline-first mobile apps and provides the best performance for Bible audio content.

## Architecture

```
Frontend App ──► Edge Function ──► B2 Storage
     ↓              ↓                  ↓
   Get URLs    Generate Signed    Return URLs
     ↓              URLs               ↓
Download Direct ◄─────────────────────┘
```

**Benefits:**

- ✅ Security: B2 credentials stay server-side
- ✅ Performance: Direct downloads from B2 CDN
- ✅ Offline-First: URLs can be cached
- ✅ Streaming: Full HTTP range request support
- ✅ Resumable: Built-in download resumption

## API Endpoint

### Get Download URLs

**Endpoint:** `POST /functions/v1/get-download-urls`

**Headers:**

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**

```typescript
{
  filePaths: string[];           // Array of remote file paths
  expirationHours?: number;      // Optional: 1-168 hours (default: 24)
}
```

**Response:**

```typescript
{
  success: boolean;
  urls: Record<string, string>;  // Map of filePath -> signedUrl
  expiresIn: number;            // Seconds until URLs expire
  totalFiles: number;           // Total files requested
  successfulUrls: number;       // Successfully generated URLs
  failedFiles?: string[];       // Failed file paths (if any)
  errors?: Record<string, string>; // Error details per file
}
```

## Frontend Implementation

### 1. Basic Usage

```typescript
// services/BibleDownloadService.ts
export class BibleDownloadService {
  private supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async getDownloadUrls(filePaths: string[], expirationHours = 24) {
    const {
      data: { session },
    } = await this.supabaseClient.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-download-urls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths,
          expirationHours,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get download URLs');
    }

    return await response.json();
  }

  async downloadFile(signedUrl: string, localPath: string): Promise<void> {
    const response = await fetch(signedUrl);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const fileData = await response.arrayBuffer();
    // Save to local storage (implementation depends on your platform)
    await this.saveToLocal(localPath, fileData);
  }
}
```

### 2. React Native Implementation

```typescript
// hooks/useAudioDownload.ts
import { useState, useCallback } from 'react';
import RNFS from 'react-native-fs';

interface DownloadProgress {
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
}

export const useAudioDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const downloadService = new BibleDownloadService();

  const downloadChapter = useCallback(
    async (filePath: string, localPath: string) => {
      try {
        setIsDownloading(true);

        // Get signed URL
        const { urls, success } = await downloadService.getDownloadUrls([
          filePath,
        ]);

        if (!success || !urls[filePath]) {
          throw new Error('Failed to get download URL');
        }

        const signedUrl = urls[filePath];

        // Download with progress tracking
        const downloadDest = `${RNFS.DocumentDirectoryPath}/${localPath}`;

        const download = RNFS.downloadFile({
          fromUrl: signedUrl,
          toFile: downloadDest,
          progress: res => {
            setProgress({
              progress: res.bytesWritten / res.contentLength,
              downloadedBytes: res.bytesWritten,
              totalBytes: res.contentLength,
            });
          },
        });

        await download.promise;

        return downloadDest;
      } finally {
        setIsDownloading(false);
        setProgress(null);
      }
    },
    []
  );

  return { downloadChapter, isDownloading, progress };
};
```

### 3. Batch Download Implementation

```typescript
// services/BibleBatchDownload.ts
export class BibleBatchDownloader {
  private maxConcurrentDownloads = 3;
  private downloadQueue: Array<{ filePath: string; localPath: string }> = [];
  private activeDownloads = new Set<string>();

  async downloadBatch(
    files: Array<{ filePath: string; localPath: string }>,
    onProgress?: (completed: number, total: number) => void
  ) {
    // Get all signed URLs at once
    const filePaths = files.map(f => f.filePath);
    const { urls, success, errors } = await downloadService.getDownloadUrls(
      filePaths,
      24
    );

    if (!success) {
      throw new Error('Failed to get signed URLs');
    }

    let completed = 0;
    const total = files.length;

    // Process downloads in batches
    const downloadPromises = files.map(async ({ filePath, localPath }) => {
      const signedUrl = urls[filePath];

      if (!signedUrl) {
        console.warn(`No URL for ${filePath}:`, errors?.[filePath]);
        return { filePath, success: false, error: errors?.[filePath] };
      }

      try {
        await this.downloadWithRetry(signedUrl, localPath);
        completed++;
        onProgress?.(completed, total);
        return { filePath, success: true };
      } catch (error) {
        console.error(`Download failed for ${filePath}:`, error);
        return { filePath, success: false, error: (error as Error).message };
      }
    });

    // Limit concurrent downloads
    const results = await this.limitConcurrency(
      downloadPromises,
      this.maxConcurrentDownloads
    );

    return {
      total,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  private async limitConcurrency<T>(
    promises: Promise<T>[],
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
      });

      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  private async downloadWithRetry(
    signedUrl: string,
    localPath: string,
    maxRetries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(signedUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const fileData = await response.arrayBuffer();
        await RNFS.writeFile(localPath, fileData, 'base64');
        return;
      } catch (error) {
        console.warn(`Download attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
}
```

### 4. Streaming Implementation

```typescript
// components/AudioPlayer.tsx
import Video from 'react-native-video';

export const StreamingAudioPlayer = ({ filePath }: { filePath: string }) => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getStreamUrl = async () => {
      try {
        const { urls } = await downloadService.getDownloadUrls([filePath], 1); // 1 hour for streaming
        setStreamUrl(urls[filePath]);
      } catch (error) {
        console.error('Failed to get stream URL:', error);
      } finally {
        setLoading(false);
      }
    };

    getStreamUrl();
  }, [filePath]);

  if (loading) return <ActivityIndicator />;
  if (!streamUrl) return <Text>Failed to load audio</Text>;

  return (
    <Video
      source={{ uri: streamUrl }}
      audioOnly={true}
      controls={true}
      resizeMode="contain"
      onError={(error) => console.error('Video player error:', error)}
    />
  );
};
```

## Error Handling

### Common Error Scenarios

```typescript
// utils/errorHandler.ts
export const handleDownloadError = (error: any) => {
  if (error.message?.includes('Authentication failed')) {
    // Redirect to login
    return 'Please log in to download content';
  }

  if (error.message?.includes('expirationHours must be between')) {
    return 'Invalid expiration time specified';
  }

  if (error.message?.includes('Maximum 100 files per request')) {
    return 'Too many files requested. Please split into smaller batches';
  }

  if (error.message?.includes('No internet connection')) {
    return 'Please check your internet connection';
  }

  if (error.message?.includes('HTTP 403')) {
    return 'Access denied. File may have expired or been moved';
  }

  if (error.message?.includes('HTTP 404')) {
    return 'File not found. It may have been deleted';
  }

  return 'Download failed. Please try again';
};
```

### Retry Logic

```typescript
// utils/retryLogic.ts
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }

  throw new Error('Max retries exceeded');
};
```

## Caching Strategy

### URL Caching

```typescript
// services/UrlCache.ts
export class UrlCache {
  private cache = new Map<string, { url: string; expiresAt: number }>();

  set(filePath: string, signedUrl: string, expiresIn: number) {
    const expiresAt = Date.now() + expiresIn * 1000 - 60000; // 1min buffer
    this.cache.set(filePath, { url: signedUrl, expiresAt });
  }

  get(filePath: string): string | null {
    const cached = this.cache.get(filePath);

    if (!cached || Date.now() > cached.expiresAt) {
      this.cache.delete(filePath);
      return null;
    }

    return cached.url;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage in service
export class CachedDownloadService extends BibleDownloadService {
  private urlCache = new UrlCache();

  async getDownloadUrls(filePaths: string[], expirationHours = 24) {
    // Check cache first
    const cachedUrls: Record<string, string> = {};
    const uncachedPaths: string[] = [];

    for (const path of filePaths) {
      const cachedUrl = this.urlCache.get(path);
      if (cachedUrl) {
        cachedUrls[path] = cachedUrl;
      } else {
        uncachedPaths.push(path);
      }
    }

    // Fetch uncached URLs
    if (uncachedPaths.length > 0) {
      const response = await super.getDownloadUrls(
        uncachedPaths,
        expirationHours
      );

      // Cache new URLs
      for (const [path, url] of Object.entries(response.urls)) {
        this.urlCache.set(path, url, response.expiresIn);
      }

      // Combine cached and new URLs
      response.urls = { ...cachedUrls, ...response.urls };
    } else {
      // All URLs were cached
      return {
        success: true,
        urls: cachedUrls,
        expiresIn: expirationHours * 3600,
        totalFiles: filePaths.length,
        successfulUrls: Object.keys(cachedUrls).length,
      };
    }
  }
}
```

## Production Considerations

### 1. Rate Limiting

```typescript
// Implement client-side rate limiting
export class RateLimitedDownloadService {
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests

  async getDownloadUrls(filePaths: string[], expirationHours = 24) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    return super.getDownloadUrls(filePaths, expirationHours);
  }
}
```

### 2. Network Awareness

```typescript
// Only download on WiFi for large files
import NetInfo from '@react-native-community/netinfo';

export const shouldAutoDownload = async (
  fileSize: number
): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();

  // Always allow on WiFi
  if (netInfo.type === 'wifi') return true;

  // Allow small files on cellular (< 5MB)
  if (netInfo.type === 'cellular' && fileSize < 5 * 1024 * 1024) {
    return true;
  }

  return false;
};
```

### 3. Background Downloads

```typescript
// Queue downloads for background processing
export class BackgroundDownloadQueue {
  private queue: Array<{
    filePath: string;
    localPath: string;
    priority: number;
  }> = [];

  async addToQueue(filePath: string, localPath: string, priority = 1) {
    this.queue.push({ filePath, localPath, priority });
    this.queue.sort((a, b) => b.priority - a.priority); // High priority first

    // Start processing if not already running
    this.processQueue();
  }

  private async processQueue() {
    // Implementation depends on your background task setup
    // Use libraries like @react-native-background-job
  }
}
```

## Testing

### Mock Implementation

```typescript
// __mocks__/BibleDownloadService.ts
export class MockBibleDownloadService {
  async getDownloadUrls(filePaths: string[]): Promise<any> {
    const urls: Record<string, string> = {};

    filePaths.forEach(path => {
      urls[path] = `https://mock-url.com/${path}`;
    });

    return {
      success: true,
      urls,
      expiresIn: 3600,
      totalFiles: filePaths.length,
      successfulUrls: filePaths.length,
    };
  }
}
```

### Test Cases

```typescript
// __tests__/BibleDownloadService.test.ts
describe('BibleDownloadService', () => {
  it('should handle authentication errors', async () => {
    const service = new BibleDownloadService();

    await expect(service.getDownloadUrls(['test-file.m4a'])).rejects.toThrow(
      'Authentication required'
    );
  });

  it('should handle batch downloads', async () => {
    const service = new MockBibleDownloadService();
    const filePaths = ['file1.m4a', 'file2.m4a'];

    const result = await service.getDownloadUrls(filePaths);

    expect(result.success).toBe(true);
    expect(result.totalFiles).toBe(2);
    expect(Object.keys(result.urls)).toHaveLength(2);
  });
});
```

## API Limits & Quotas

- **Max files per request:** 100
- **URL expiration:** 1-168 hours (7 days max)
- **File size limit:** Determined by your B2 bucket settings
- **Rate limits:** Implement client-side throttling for best performance

## Security Notes

- ✅ URLs expire automatically (configurable 1-168 hours)
- ✅ Authentication required for URL generation
- ✅ B2 credentials never exposed to frontend
- ✅ URLs are single-use for the specific file
- ⚠️ Cache URLs securely on client-side
- ⚠️ Don't log or share URLs in plaintext

## Troubleshooting

### Common Issues

1. **"Authentication failed"**

   - Check Supabase session is valid
   - Verify JWT token hasn't expired

2. **"expirationHours must be between 1 and 168"**

   - Use valid expiration time (1-168 hours)

3. **"Maximum 100 files per request"**

   - Split large batches into smaller chunks

4. **"Failed to generate URL for [file]"**

   - Check file exists in B2 bucket
   - Verify filename matches exactly

5. **Download fails with 403/404**
   - URL may have expired
   - File may have been moved/deleted
   - Generate fresh URLs

This API provides a robust, scalable solution for Bible audio downloads with excellent performance for offline-first applications.
