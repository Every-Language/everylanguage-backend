# API Specifications

## Overview

This document defines all API endpoints required for the Bible package distribution system, including package generation, downloads, sync operations, and status tracking.

## Base Configuration

### Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
B2_KEY_ID=your-backblaze-key-id
B2_APPLICATION_KEY=your-backblaze-application-key
B2_BUCKET_NAME=your-bucket-name
```

### Common Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Client-Version: 1.0.0
X-Device-ID: <unique-device-identifier>
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}
```

## Package Generation APIs

### 1. Create Bible Package

**Endpoint:** `POST /functions/v1/create-bible-package`

Creates a new Bible package with specified content.

#### Request Body

```typescript
interface CreatePackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string; // Required for audio/combined packages
  textVersionId?: string; // Required for text/combined packages
  languageEntityId: string;
  options?: {
    includeStructure?: boolean; // Include bible structure data
    compressionLevel?: number; // 1-9, default 6
    maxSize?: number; // Max size in MB, default 2048

    // Multi-package options
    enableChunking?: boolean; // Allow automatic splitting if needed
    chunkingStrategy?: 'size' | 'testament' | 'book_group' | 'custom';
    customChunkRange?: {
      startBook: string; // OSIS book ID
      endBook: string; // OSIS book ID
    };
    forceMultiplePackages?: boolean; // Always create series even if fits in one
  };
}
```

#### Response

```typescript
interface CreatePackageResponse {
  success: boolean;

  // Single package response
  packageId?: string;
  downloadUrl?: string; // If immediate download
  manifest?: BiblePackageManifest;
  sizeInBytes?: number;
  estimatedDownloadTime?: number; // Seconds

  // Multi-package response
  packages?: PackageInfo[];
  seriesInfo?: {
    seriesId: string;
    seriesName: string;
    totalParts: number;
    totalSizeMB: number;
    chunkingStrategy: string;
    downloadUrls?: string[]; // URLs for all packages
  };
}

interface PackageInfo {
  packageId: string;
  partNumber: number;
  downloadUrl?: string;
  manifest: BiblePackageManifest;
  sizeInBytes: number;
}
```

#### Example Request

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/create-bible-package" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "packageType": "audio",
    "audioVersionId": "123e4567-e89b-12d3-a456-426614174000",
    "languageEntityId": "987fcdeb-51a2-43d1-b123-456789abcdef",
    "options": {
      "includeStructure": true,
      "compressionLevel": 7
    }
  }'
```

#### Example Response

```json
{
  "success": true,
  "packageId": "niv-english-audio-v2.1",
  "manifest": {
    "packageId": "niv-english-audio-v2.1",
    "packageVersion": "2.1.0",
    "packageType": 1,
    "estimatedSizeMB": 850.5,
    "totalFiles": 1189,
    "includesVerseTimings": true
  },
  "sizeInBytes": 891863040,
  "estimatedDownloadTime": 178
}
```

### 2. Download Bible Package

**Endpoint:** `GET /functions/v1/download-bible-package`

Downloads a pre-generated or cached Bible package.

#### Query Parameters

```typescript
interface DownloadPackageParams {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  format?: 'stream' | 'download'; // Default: download
}
```

#### Response Headers

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="package-name.bible"
Content-Length: <size-in-bytes>
X-Package-Size-MB: <size-in-mb>
X-Served-From: cache|generated
X-Cache-TTL: <cache-time-remaining>
```

#### Example Request

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/download-bible-package?packageType=audio&audioVersionId=123e4567-e89b-12d3-a456-426614174000&languageEntityId=987fcdeb-51a2-43d1-b123-456789abcdef" \
  -H "Authorization: Bearer <jwt-token>" \
  -o "bible-package.bible"
```

### 3. Get Package Status

**Endpoint:** `GET /functions/v1/package-status/{packageId}`

Gets the current status of a package generation or download.

#### Response

```typescript
interface PackageStatusResponse {
  packageId: string;
  status: 'generating' | 'ready' | 'cached' | 'failed';
  progress?: number; // 0-100 for generating
  estimatedCompletion?: string; // ISO timestamp
  downloadUrl?: string; // When ready
  error?: string; // When failed
  manifest?: BiblePackageManifest;
}
```

#### Example Response

```json
{
  "packageId": "niv-english-audio-v2.1",
  "status": "generating",
  "progress": 65,
  "estimatedCompletion": "2024-01-27T15:30:00Z"
}
```

### 4. List Available Packages

**Endpoint:** `GET /functions/v1/packages`

Lists available packages for download or generation.

#### Query Parameters

```typescript
interface ListPackagesParams {
  languageEntityId?: string;
  packageType?: 'audio' | 'text' | 'combined';
  limit?: number; // Default: 50, max: 200
  offset?: number; // Default: 0
  includeCache?: boolean; // Include cached packages
}
```

#### Response

```typescript
interface ListPackagesResponse {
  packages: PackageSummary[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

interface PackageSummary {
  packageId: string;
  packageType: 'audio' | 'text' | 'combined';
  languageEntityId: string;
  languageName: string;
  audioVersionName?: string;
  textVersionName?: string;
  estimatedSizeMB: number;
  lastGenerated?: string; // ISO timestamp
  cached: boolean;
  downloadCount: number;
}
```

## Sync APIs

### 5. Get Sync Changes

**Endpoint:** `POST /functions/v1/sync/changes`

Gets changes since last sync for incremental updates.

#### Request Body

```typescript
interface SyncChangesRequest {
  packageId: string;
  lastSyncTimestamp: string; // ISO timestamp
  tables?: string[]; // Specific tables to sync
  maxChanges?: number; // Default: 1000
}
```

#### Response

```typescript
interface SyncChangesResponse {
  changes: ChangeRecord[];
  hasMore: boolean;
  nextToken?: string;
  serverTimestamp: string; // Current server time
}

interface ChangeRecord {
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record?: any; // Full record for INSERT/UPDATE
  changedAt: string; // ISO timestamp
  changedBy?: string; // User ID
}
```

#### Example Request

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/sync/changes" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "niv-english-audio-v2.1",
    "lastSyncTimestamp": "2024-01-27T10:00:00Z",
    "tables": ["media_files", "verse_texts"],
    "maxChanges": 500
  }'
```

### 6. Upload Sync Changes

**Endpoint:** `POST /functions/v1/sync/upload`

Uploads local changes to server (for read-write scenarios).

#### Request Body

```typescript
interface SyncUploadRequest {
  packageId: string;
  changes: LocalChangeRecord[];
  deviceId: string;
  syncSessionId?: string;
}

interface LocalChangeRecord {
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  localTimestamp: string;
  conflictResolution?: 'server_wins' | 'local_wins';
}
```

#### Response

```typescript
interface SyncUploadResponse {
  success: boolean;
  conflicts: ConflictRecord[];
  applied: number;
  rejected: number;
  serverTimestamp: string;
}

interface ConflictRecord {
  table: string;
  recordId: string;
  localRecord: any;
  serverRecord: any;
  resolution: 'server_wins' | 'local_wins' | 'manual_required';
  reason: string;
}
```

### 7. Check Version Status

**Endpoint:** `GET /functions/v1/sync/version-status`

Checks if local version needs updating.

#### Query Parameters

```typescript
interface VersionStatusParams {
  audioVersionId?: string;
  textVersionId?: string;
  lastUpdated: string; // ISO timestamp
}
```

#### Response

```typescript
interface VersionStatusResponse {
  needsUpdate: boolean;
  latestVersion: string;
  changes: number;
  updateRecommendation: 'required' | 'optional' | 'none';
  changesSummary?: {
    mediaFiles: number;
    verseTexts: number;
    verseTimings: number;
  };
}
```

## Utility APIs

### 8. Validate Package

**Endpoint:** `POST /functions/v1/validate-package`

Validates a package file without importing it.

#### Request Body

```typescript
interface ValidatePackageRequest {
  packageUrl?: string; // URL to package file
  packageData?: string; // Base64 encoded package data (for small files)
  checksumOnly?: boolean; // Only validate checksum
}
```

#### Response

```typescript
interface ValidatePackageResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: BiblePackageManifest;
  compatibility: {
    appVersion: boolean;
    format: boolean;
    content: boolean;
  };
}
```

### 9. Get Download URLs

**Endpoint:** `POST /functions/v1/get-download-urls`

Gets presigned URLs for multiple media files (existing endpoint).

#### Request Body

```typescript
interface DownloadUrlsRequest {
  filePaths: string[];
  expirationHours?: number; // Default: 24, max: 168
}
```

#### Response

```typescript
interface DownloadUrlsResponse {
  success: boolean;
  urls: Record<string, string>;
  expiresIn: number; // Seconds
  totalFiles: number;
  successfulUrls: number;
  failedFiles?: string[];
  errors?: Record<string, string>;
}
```

### 10. Get Package Series Status

**Endpoint:** `GET /functions/v1/package-series/{seriesId}/status`

Gets the status of a multi-package series.

#### Response

```typescript
interface PackageSeriesStatusResponse {
  seriesId: string;
  seriesName: string;
  totalParts: number;
  availableParts: PackagePartInfo[];
  missingParts: number[];
  chunkingStrategy: string;
  estimatedTotalSizeMB: number;
  isComplete: boolean;
}

interface PackagePartInfo {
  partNumber: number;
  packageId: string;
  status: 'ready' | 'generating' | 'cached';
  downloadUrl?: string;
  sizeInBytes: number;
}
```

### 11. Download Package Series

**Endpoint:** `GET /functions/v1/download-package-series/{seriesId}`

Downloads all packages in a series as a ZIP file or provides individual download URLs.

#### Query Parameters

```typescript
interface DownloadSeriesParams {
  format?: 'zip' | 'individual'; // Default: individual
  partNumbers?: string; // Comma-separated part numbers (e.g., "1,3,5")
}
```

#### Response

For `format=individual`:

```typescript
interface DownloadSeriesResponse {
  success: boolean;
  seriesId: string;
  packages: {
    partNumber: number;
    downloadUrl: string;
    expiresIn: number; // Seconds
    sizeInBytes: number;
  }[];
  totalSizeMB: number;
}
```

For `format=zip`:

- Returns ZIP file containing all packages
- Content-Type: application/zip
- Content-Disposition: attachment; filename="series-name.zip"

### 12. Create Package Series

**Endpoint:** `POST /functions/v1/create-package-series`

Creates multiple related packages as a coordinated series.

#### Request Body

```typescript
interface CreateSeriesRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  chunkingStrategy: 'size' | 'testament' | 'book_group' | 'custom';
  maxSizePerPackageMB?: number; // Default: 2048
  customChunks?: {
    startBook: string;
    endBook: string;
    description: string;
  }[];
}
```

#### Response

```typescript
interface CreateSeriesResponse {
  success: boolean;
  seriesId: string;
  seriesName: string;
  totalParts: number;
  estimatedTotalSizeMB: number;
  packages: {
    partNumber: number;
    packageId: string;
    contentRange: {
      startBook: string;
      endBook: string;
      description: string;
    };
    estimatedSizeMB: number;
  }[];
  generationJobId?: string; // For async generation
}
```

### 13. Package Analytics

**Endpoint:** `GET /functions/v1/analytics/packages`

Gets analytics data for package usage.

#### Query Parameters

```typescript
interface PackageAnalyticsParams {
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  packageType?: string;
  languageEntityId?: string;
  aggregation?: 'daily' | 'weekly' | 'monthly';
}
```

#### Response

```typescript
interface PackageAnalyticsResponse {
  downloads: AnalyticsData[];
  generations: AnalyticsData[];
  topPackages: PackageStats[];
  totalDownloads: number;
  totalGenerations: number;
  averageSize: number; // MB
}

interface AnalyticsData {
  date: string;
  count: number;
  size: number; // MB
}

interface PackageStats {
  packageId: string;
  downloads: number;
  lastDownload: string;
  averageSize: number;
}
```

## WebSocket APIs (Optional)

### 11. Package Generation Status Stream

**Endpoint:** `wss://your-project.supabase.co/functions/v1/package-status-stream`

Real-time package generation status updates.

#### Connection

```javascript
const ws = new WebSocket(
  'wss://your-project.supabase.co/functions/v1/package-status-stream',
  [],
  {
    headers: {
      Authorization: 'Bearer <jwt-token>',
    },
  }
);

// Subscribe to package status
ws.send(
  JSON.stringify({
    action: 'subscribe',
    packageId: 'niv-english-audio-v2.1',
  })
);
```

#### Messages

```typescript
interface StatusUpdate {
  packageId: string;
  status: 'generating' | 'ready' | 'failed';
  progress?: number;
  message?: string;
  timestamp: string;
}
```

## Error Codes

### Package Generation Errors

```typescript
enum PackageErrorCodes {
  INVALID_REQUEST = 'PKG_001',
  VERSION_NOT_FOUND = 'PKG_002',
  INSUFFICIENT_PERMISSIONS = 'PKG_003',
  PACKAGE_TOO_LARGE = 'PKG_004',
  GENERATION_FAILED = 'PKG_005',
  STORAGE_ERROR = 'PKG_006',
  COMPRESSION_FAILED = 'PKG_007',
  INVALID_CONTENT = 'PKG_008',
}
```

### Sync Errors

```typescript
enum SyncErrorCodes {
  SYNC_CONFLICT = 'SYN_001',
  INVALID_TIMESTAMP = 'SYN_002',
  TOO_MANY_CHANGES = 'SYN_003',
  SYNC_IN_PROGRESS = 'SYN_004',
  RECORD_NOT_FOUND = 'SYN_005',
  PERMISSION_DENIED = 'SYN_006',
}
```

## Rate Limiting

### Default Limits

```typescript
interface RateLimits {
  packageGeneration: {
    perUser: '10 per hour';
    perIP: '50 per hour';
  };
  packageDownload: {
    perUser: '100 per hour';
    perIP: '200 per hour';
  };
  syncOperations: {
    perUser: '1000 per hour';
    perIP: '2000 per hour';
  };
}
```

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

## Caching Strategy

### Cache Keys

```typescript
// Package cache keys
const cacheKeys = {
  package:
    'pkg:{packageType}:{audioVersionId}:{textVersionId}:{languageEntityId}',
  manifest: 'manifest:{packageId}',
  status: 'status:{packageId}',
  syncChanges: 'sync:{packageId}:{timestamp}',
};
```

### Cache TTL

```typescript
const cacheTTL = {
  package: 3600, // 1 hour
  manifest: 86400, // 24 hours
  status: 300, // 5 minutes
  syncChanges: 1800, // 30 minutes
};
```

## Testing Endpoints

### Health Check

```http
GET /functions/v1/health
```

Response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-27T10:00:00Z",
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "cache": "healthy"
  }
}
```

### Package Test Generation

```http
POST /functions/v1/test/generate-package
Content-Type: application/json

{
  "packageType": "audio",
  "size": "small",      // small, medium, large
  "includeAudio": true,
  "includeTimings": true
}
```

This API specification provides a complete foundation for implementing the Bible package distribution system with proper error handling, caching, and performance optimization.
