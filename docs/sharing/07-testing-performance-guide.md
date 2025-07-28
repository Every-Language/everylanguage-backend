# Testing & Performance Guide

## Overview

This document outlines comprehensive testing strategies and performance optimization techniques for the offline Bible distribution system. It covers unit tests, integration tests, performance benchmarks, and optimization strategies for both backend and frontend components.

## Testing Strategy

### Testing Pyramid

```
              ┌─────────────────┐
              │   E2E Tests     │ <- 10% (Critical user flows)
              │                 │
            ┌─────────────────────┐
            │ Integration Tests   │ <- 20% (API & Component integration)
            │                     │
          ┌─────────────────────────┐
          │     Unit Tests          │ <- 70% (Individual functions/classes)
          │                         │
          └─────────────────────────┘
```

## Backend Testing

### Unit Tests

#### Package Builder Tests

```typescript
// tests/unit/bible-package-builder.test.ts

describe('BiblePackageBuilder', () => {
  let builder: BiblePackageBuilder;
  let mockSupabaseClient: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    builder = new BiblePackageBuilder(mockSupabaseClient);
  });

  describe('build()', () => {
    it('should create audio package successfully', async () => {
      // Arrange
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'test-audio-version-id',
        languageEntityId: 'test-language-id',
        requestedBy: 'test-user-id',
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAudioVersionData,
          error: null,
        }),
      });

      // Act
      const result = await builder.build(request);

      // Assert
      expect(result.packageBuffer).toBeDefined();
      expect(result.manifest.packageType).toBe(1); // Audio package
      expect(result.sizeInBytes).toBeGreaterThan(0);
    });

    it('should handle missing audio version gracefully', async () => {
      // Arrange
      const request: PackageRequest = {
        packageType: 'audio',
        audioVersionId: 'non-existent-id',
        languageEntityId: 'test-language-id',
        requestedBy: 'test-user-id',
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Audio version not found' },
        }),
      });

      // Act & Assert
      await expect(builder.build(request)).rejects.toThrow(
        'Audio version not found'
      );
    });

    it('should validate package binary format', async () => {
      // Arrange
      const request: PackageRequest = {
        packageType: 'text',
        textVersionId: 'test-text-version-id',
        languageEntityId: 'test-language-id',
        requestedBy: 'test-user-id',
      };

      // Mock successful response
      setupMockTextVersionData();

      // Act
      const result = await builder.build(request);

      // Assert - Validate binary format
      const buffer = Buffer.from(result.packageBuffer);

      // Check magic bytes
      expect(buffer.toString('utf8', 0, 8)).toBe('BIBLE001');

      // Check format version
      expect(buffer.readUInt32LE(8)).toBe(1);

      // Check package type
      expect(buffer.readUInt32LE(12)).toBe(2); // Text package
    });
  });

  describe('validateRequest()', () => {
    it('should validate audio package requirements', async () => {
      const validRequest = {
        packageType: 'audio' as const,
        audioVersionId: 'test-id',
        languageEntityId: 'test-lang-id',
        requestedBy: 'test-user',
      };

      await expect(
        builder.validateRequest(validRequest)
      ).resolves.not.toThrow();
    });

    it('should reject audio package without audioVersionId', async () => {
      const invalidRequest = {
        packageType: 'audio' as const,
        languageEntityId: 'test-lang-id',
        requestedBy: 'test-user',
      };

      await expect(builder.validateRequest(invalidRequest)).rejects.toThrow(
        'Audio version ID required for audio packages'
      );
    });
  });
});
```

#### Binary Format Tests

```typescript
// tests/unit/bible-package-format.test.ts

describe('BiblePackageFormat', () => {
  describe('parsePackage()', () => {
    it('should parse valid package correctly', () => {
      // Create test package
      const testPackage = createTestPackageBuffer();

      const result = parsePackage(testPackage);

      expect(result.header.magic).toBe('BIBLE001');
      expect(result.header.formatVersion).toBe(1);
      expect(result.manifest).toBeDefined();
      expect(result.database).toBeDefined();
    });

    it('should reject package with invalid magic bytes', () => {
      const invalidPackage = Buffer.from('INVALID_MAGIC_BYTES');

      expect(() => parsePackage(invalidPackage)).toThrow(
        'Invalid package: incorrect magic bytes'
      );
    });

    it('should validate checksum integrity', () => {
      const corruptedPackage = createCorruptedPackageBuffer();

      expect(() => parsePackage(corruptedPackage)).toThrow(
        'Invalid package: checksum mismatch'
      );
    });
  });

  describe('manifest validation', () => {
    it('should validate required manifest fields', () => {
      const manifest = {
        packageId: 'test-package',
        languageEntityId: 'test-lang',
        // Missing required fields
      };

      const validation = validateManifest(manifest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing package version');
    });

    it('should validate OSIS verse ID format', () => {
      const manifest = createTestManifest();
      manifest.audioFileIndex = [
        {
          startVerseId: 'invalid-format',
          endVerseId: 'john-3-16',
          // ... other fields
        },
      ];

      const validation = validateManifest(manifest);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid OSIS verse ID format');
    });
  });
});
```

### Integration Tests

#### Package Creation Flow

```typescript
// tests/integration/package-creation.test.ts

describe('Package Creation Integration', () => {
  let testDatabase: TestDatabase;
  let b2Service: MockB2Service;

  beforeAll(async () => {
    testDatabase = await TestDatabase.setup();
    b2Service = new MockB2Service();
  });

  afterAll(async () => {
    await testDatabase.teardown();
  });

  it('should create complete audio package from database', async () => {
    // Arrange - Seed test data
    const audioVersionId = await testDatabase.seedAudioVersion({
      name: 'Test NIV Audio',
      languageEntityId: 'en-US',
      mediaFileCount: 5,
    });

    // Act - Create package
    const response = await request(app)
      .post('/functions/v1/create-bible-package')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        packageType: 'audio',
        audioVersionId,
        languageEntityId: 'en-US',
      })
      .expect(200);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.manifest.totalFiles).toBe(5);

    // Validate actual package content
    const packageBuffer = Buffer.from(response.body.packageData, 'base64');
    const parsedPackage = parsePackage(packageBuffer);

    expect(parsedPackage.manifest.packageId).toContain('test-niv-audio');
    expect(parsedPackage.audioData).toBeDefined();
  });

  it('should handle large package creation within time limits', async () => {
    // Test with full Bible (1189 chapters)
    const audioVersionId = await testDatabase.seedFullBibleAudio();

    const startTime = Date.now();

    const response = await request(app)
      .post('/functions/v1/create-bible-package')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        packageType: 'audio',
        audioVersionId,
        languageEntityId: 'en-US',
      })
      .timeout(300000) // 5 minute timeout
      .expect(200);

    const duration = Date.now() - startTime;

    // Assert performance requirements
    expect(duration).toBeLessThan(180000); // Under 3 minutes
    expect(response.body.sizeInBytes).toBeLessThan(2 * 1024 * 1024 * 1024); // Under 2GB
  });
});
```

#### Sync Integration Tests

```typescript
// tests/integration/sync-operations.test.ts

describe('Sync Operations Integration', () => {
  let serverDatabase: TestDatabase;
  let clientDatabase: TestSQLiteDatabase;

  beforeEach(async () => {
    serverDatabase = await TestDatabase.setup();
    clientDatabase = await TestSQLiteDatabase.setup();
  });

  it('should sync incremental changes correctly', async () => {
    // Arrange - Create initial state
    const packageId = await setupTestPackage();
    await importPackageToClient(packageId);

    // Make changes on server
    const mediaFileId = await serverDatabase.updateMediaFile({
      id: 'test-media-file-id',
      duration_seconds: 150.5,
      updated_at: new Date().toISOString(),
    });

    // Act - Perform sync
    const syncResult = await performSync(packageId);

    // Assert
    expect(syncResult.success).toBe(true);
    expect(syncResult.changesApplied).toBe(1);

    // Verify local database was updated
    const localMediaFile = await clientDatabase.getMediaFile(mediaFileId);
    expect(localMediaFile.duration_seconds).toBe(150.5);
  });

  it('should handle sync conflicts with LWW strategy', async () => {
    // Arrange - Create conflicting changes
    const baseTimestamp = new Date('2024-01-01T10:00:00Z');

    // Server change (newer)
    await serverDatabase.updateVerseText({
      id: 'test-verse-text-id',
      verse_text: 'Server version',
      updated_at: new Date(baseTimestamp.getTime() + 5000).toISOString(),
    });

    // Local change (older)
    await clientDatabase.updateVerseText({
      id: 'test-verse-text-id',
      verse_text: 'Local version',
      updated_at: baseTimestamp.toISOString(),
    });

    // Act - Perform sync
    const syncResult = await performSync(packageId);

    // Assert - Server should win
    expect(syncResult.success).toBe(true);

    const finalVerseText =
      await clientDatabase.getVerseText('test-verse-text-id');
    expect(finalVerseText.verse_text).toBe('Server version');
  });
});
```

## Frontend Testing

### Unit Tests

#### Package Service Tests

```typescript
// src/services/__tests__/BiblePackageService.test.ts

describe('BiblePackageService', () => {
  let service: BiblePackageService;
  let mockRNFS: jest.Mocked<typeof RNFS>;
  let mockSQLite: jest.Mocked<SQLite.Database>;

  beforeEach(() => {
    service = new BiblePackageService();
    mockRNFS = require('react-native-fs');
    mockSQLite = createMockSQLiteDatabase();
  });

  describe('exportAudioVersion()', () => {
    it('should export audio version successfully', async () => {
      // Arrange
      const audioVersionId = 'test-audio-version-id';
      mockSQLite.transaction.mockImplementation(callback => {
        callback({
          executeSql: jest.fn().mockImplementation((sql, params, success) => {
            success(null, { rows: { length: 5, item: () => mockMediaFile } });
          }),
        });
      });

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue('base64audiodata');

      // Act
      const packagePath = await service.exportAudioVersion(audioVersionId);

      // Assert
      expect(packagePath).toContain('.bible');
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should throw error when audio files are missing', async () => {
      // Arrange
      const audioVersionId = 'test-audio-version-id';
      mockRNFS.exists.mockResolvedValue(false);

      // Act & Assert
      await expect(service.exportAudioVersion(audioVersionId)).rejects.toThrow(
        'Audio file missing'
      );
    });

    it('should validate export progress reporting', async () => {
      // Arrange
      const progressUpdates: any[] = [];
      const onProgress = (progress: any) => progressUpdates.push(progress);

      // Act
      await service.exportAudioVersion('test-id', {}, onProgress);

      // Assert
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('validating');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe(
        'complete'
      );
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });
  });

  describe('importPackage()', () => {
    it('should import valid package successfully', async () => {
      // Arrange
      const packagePath = '/test/path/test-package.bible';
      const validPackageData = createTestPackageData();

      mockRNFS.readFile.mockResolvedValue(validPackageData);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.importPackage(packagePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.packageId).toBeDefined();
      expect(result.importedAt).toBeDefined();
    });

    it('should handle corrupted package gracefully', async () => {
      // Arrange
      const packagePath = '/test/path/corrupted-package.bible';
      const corruptedData = 'invalid-package-data';

      mockRNFS.readFile.mockResolvedValue(corruptedData);

      // Act
      const result = await service.importPackage(packagePath);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid package');
    });
  });
});
```

#### Sharing Service Tests

```typescript
// src/services/__tests__/BiblePackageSharingService.test.ts

describe('BiblePackageSharingService', () => {
  let sharingService: BiblePackageSharingService;
  let mockPackageService: jest.Mocked<BiblePackageService>;
  let mockRNShare: jest.Mocked<typeof RNShare>;

  beforeEach(() => {
    mockPackageService = createMockPackageService();
    sharingService = new BiblePackageSharingService(mockPackageService);
    mockRNShare = require('react-native-share');
  });

  describe('shareAudioVersion()', () => {
    it('should share audio version successfully', async () => {
      // Arrange
      const audioVersionId = 'test-audio-version-id';
      const packagePath = '/test/path/package.bible';

      mockPackageService.exportAudioVersion.mockResolvedValue(packagePath);
      mockRNShare.open.mockResolvedValue({ success: true });

      // Act
      await sharingService.shareAudioVersion(audioVersionId);

      // Assert
      expect(mockPackageService.exportAudioVersion).toHaveBeenCalledWith(
        audioVersionId,
        {},
        expect.any(Function)
      );
      expect(mockRNShare.open).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `file://${packagePath}`,
          type: 'application/octet-stream',
        })
      );
    });

    it('should handle sharing cancellation gracefully', async () => {
      // Arrange
      mockRNShare.open.mockRejectedValue({ code: 'CANCELLED' });

      // Act & Assert
      // Should not throw error when user cancels
      await expect(
        sharingService.shareAudioVersion('test-id')
      ).resolves.not.toThrow();
    });
  });
});
```

### Component Tests

#### Package Import Component

```typescript
// src/components/__tests__/PackageImportModal.test.tsx

describe('PackageImportModal', () => {
  let mockPackageService: jest.Mocked<BiblePackageService>;

  beforeEach(() => {
    mockPackageService = createMockPackageService();
  });

  it('should display import progress correctly', async () => {
    // Arrange
    const { getByText, getByTestId } = render(
      <PackageImportModal
        visible={true}
        packageService={mockPackageService}
        onClose={jest.fn()}
      />
    );

    // Act - Simulate progress updates
    act(() => {
      mockPackageService.importPackage.mockImplementation((path, onProgress) => {
        onProgress?.({ stage: 'parsing', progress: 25, message: 'Parsing package...' });
        onProgress?.({ stage: 'validating', progress: 50, message: 'Validating content...' });
        onProgress?.({ stage: 'importing_db', progress: 75, message: 'Importing database...' });
        onProgress?.({ stage: 'complete', progress: 100, message: 'Import completed' });

        return Promise.resolve({ success: true, packageId: 'test-package' });
      });
    });

    // Assert
    expect(getByText('Parsing package...')).toBeTruthy();
    expect(getByTestId('progress-bar')).toHaveProp('progress', 0.25);
  });

  it('should handle import errors appropriately', async () => {
    // Arrange
    const onError = jest.fn();
    const { getByText } = render(
      <PackageImportModal
        visible={true}
        packageService={mockPackageService}
        onError={onError}
      />
    );

    // Act
    act(() => {
      mockPackageService.importPackage.mockRejectedValue(
        new Error('Import failed: Insufficient storage space')
      );
    });

    // Assert
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient storage space')
      );
    });
  });
});
```

## Performance Testing

### Backend Performance Tests

#### Package Generation Benchmarks

```typescript
// tests/performance/package-generation.perf.test.ts

describe('Package Generation Performance', () => {
  describe('Audio Package Creation', () => {
    it('should create small audio package (< 100MB) under 30 seconds', async () => {
      const startTime = Date.now();

      const result = await createAudioPackage({
        mediaFileCount: 10,
        averageFileSize: 8 * 1024 * 1024, // 8MB per file
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // 30 seconds
      expect(result.sizeInBytes).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('should create medium audio package (100MB-500MB) under 2 minutes', async () => {
      const startTime = Date.now();

      const result = await createAudioPackage({
        mediaFileCount: 50,
        averageFileSize: 8 * 1024 * 1024, // 8MB per file
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(120000); // 2 minutes
      expect(result.sizeInBytes).toBeLessThan(500 * 1024 * 1024); // 500MB
    });

    it('should create large audio package (500MB-1GB) under 5 minutes', async () => {
      const startTime = Date.now();

      const result = await createAudioPackage({
        mediaFileCount: 100,
        averageFileSize: 8 * 1024 * 1024, // 8MB per file
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300000); // 5 minutes
      expect(result.sizeInBytes).toBeLessThan(1024 * 1024 * 1024); // 1GB
    });
  });

  describe('Memory Usage', () => {
    it('should not exceed 512MB memory during package creation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      await createAudioPackage({
        mediaFileCount: 100,
        averageFileSize: 8 * 1024 * 1024,
      });

      const peakMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = peakMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(512 * 1024 * 1024); // 512MB
    });

    it('should release memory after package creation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      await createAudioPackage({
        mediaFileCount: 50,
        averageFileSize: 8 * 1024 * 1024,
      });

      // Force garbage collection
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not retain more than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
```

#### Database Performance Tests

```typescript
// tests/performance/database-operations.perf.test.ts

describe('Database Performance', () => {
  it('should query audio version data under 5 seconds', async () => {
    // Arrange - Create large dataset
    await seedLargeAudioVersion(1000); // 1000 media files

    const startTime = Date.now();

    // Act
    const result = await getAudioVersionData('large-audio-version-id');

    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(result.mediaFiles.length).toBe(1000);
  });

  it('should handle concurrent package generations', async () => {
    const concurrentRequests = 5;
    const promises = [];

    const startTime = Date.now();

    // Create multiple packages concurrently
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        createAudioPackage({
          mediaFileCount: 20,
          averageFileSize: 5 * 1024 * 1024,
        })
      );
    }

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    // All should succeed
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);

    // Should complete within reasonable time
    expect(duration).toBeLessThan(180000); // 3 minutes total
  });
});
```

### Frontend Performance Tests

#### Package Import Performance

```typescript
// src/__tests__/performance/package-import.perf.test.ts

describe('Package Import Performance', () => {
  let packageService: BiblePackageService;

  beforeEach(() => {
    packageService = new BiblePackageService();
  });

  it('should import small package (< 50MB) under 30 seconds', async () => {
    // Arrange
    const smallPackagePath = await createTestPackage({
      sizeInMB: 40,
      audioFileCount: 20,
    });

    const startTime = Date.now();

    // Act
    const result = await packageService.importPackage(smallPackagePath);

    const duration = Date.now() - startTime;

    // Assert
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it('should import medium package (50MB-200MB) under 2 minutes', async () => {
    // Arrange
    const mediumPackagePath = await createTestPackage({
      sizeInMB: 150,
      audioFileCount: 75,
    });

    const startTime = Date.now();

    // Act
    const result = await packageService.importPackage(mediumPackagePath);

    const duration = Date.now() - startTime;

    // Assert
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(120000); // 2 minutes
  });

  it('should not block UI during import', async () => {
    let uiUpdateCount = 0;
    const uiUpdateInterval = setInterval(() => {
      uiUpdateCount++;
    }, 100);

    // Import package while UI updates are happening
    await packageService.importPackage('/test/large-package.bible');

    clearInterval(uiUpdateInterval);

    // UI should have been able to update multiple times
    expect(uiUpdateCount).toBeGreaterThan(10);
  });
});
```

#### Memory Management Tests

```typescript
// src/__tests__/performance/memory-management.test.ts

describe('Memory Management', () => {
  it('should not leak memory during multiple imports', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Import multiple packages
    for (let i = 0; i < 5; i++) {
      const packagePath = await createTestPackage({ sizeInMB: 10 });
      await packageService.importPackage(packagePath);

      // Clean up package file
      await RNFS.unlink(packagePath);
    }

    // Force garbage collection if available
    if (window.gc) window.gc();

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Should not increase memory by more than 20MB
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
  });

  it('should clean up temporary files after operations', async () => {
    const tempDir = await packageService.getTempDirectory();
    const initialFiles = await RNFS.readdir(tempDir);

    // Perform import operation
    await packageService.importPackage('/test/package.bible');

    const finalFiles = await RNFS.readdir(tempDir);

    // Should not leave temporary files
    expect(finalFiles.length).toBe(initialFiles.length);
  });
});
```

## Performance Optimization Strategies

### Backend Optimizations

#### Database Query Optimization

```sql
-- Optimize audio version data query
CREATE INDEX CONCURRENTLY idx_media_files_audio_version_published
ON media_files (audio_version_id, publish_status, start_verse_id)
WHERE publish_status = 'published';

-- Optimize verse timing lookups
CREATE INDEX CONCURRENTLY idx_media_files_verses_file_time
ON media_files_verses (media_file_id, start_time_seconds);

-- Optimize change log queries for sync
CREATE INDEX CONCURRENTLY idx_change_log_table_time
ON change_log (table_name, changed_at)
WHERE changed_at > NOW() - INTERVAL '30 days';
```

#### Package Generation Optimization

```typescript
// Streaming package generation for large files
class StreamingPackageBuilder {
  async buildStreaming(request: PackageRequest): Promise<ReadableStream> {
    return new ReadableStream({
      async start(controller) {
        // Stream header immediately
        const header = await this.createHeader();
        controller.enqueue(header);

        // Stream manifest
        const manifest = await this.createManifest();
        controller.enqueue(manifest);

        // Stream database
        const dbStream = await this.createDatabaseStream();
        for await (const chunk of dbStream) {
          controller.enqueue(chunk);
        }

        // Stream audio files
        const audioStream = await this.createAudioStream();
        for await (const chunk of audioStream) {
          controller.enqueue(chunk);
        }

        controller.close();
      },
    });
  }
}
```

#### Caching Optimization

```typescript
// Multi-layer caching strategy
class PackageCacheManager {
  private memoryCache = new Map();
  private diskCache: DiskCache;
  private remoteCache: RemoteCache;

  async get(key: string): Promise<any> {
    // 1. Check memory cache (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // 2. Check disk cache
    const diskResult = await this.diskCache.get(key);
    if (diskResult) {
      this.memoryCache.set(key, diskResult);
      return diskResult;
    }

    // 3. Check remote cache (Redis/CDN)
    const remoteResult = await this.remoteCache.get(key);
    if (remoteResult) {
      await this.diskCache.set(key, remoteResult);
      this.memoryCache.set(key, remoteResult);
      return remoteResult;
    }

    return null;
  }
}
```

### Frontend Optimizations

#### Memory Management

```typescript
// Implement proper cleanup
class BiblePackageService {
  private activeOperations = new Set<string>();
  private memoryThreshold = 100 * 1024 * 1024; // 100MB

  async importPackage(path: string): Promise<ImportResult> {
    const operationId = this.generateOperationId();
    this.activeOperations.add(operationId);

    try {
      // Check memory before starting
      await this.checkMemoryUsage();

      // Process in chunks to avoid memory spikes
      return await this.processPackageInChunks(path);
    } finally {
      this.activeOperations.delete(operationId);
      await this.cleanup();
    }
  }

  private async processPackageInChunks(path: string): Promise<ImportResult> {
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const fileSize = await RNFS.stat(path).then(s => s.size);

    for (let offset = 0; offset < fileSize; offset += chunkSize) {
      const chunk = await this.readFileChunk(path, offset, chunkSize);
      await this.processChunk(chunk);

      // Check memory usage between chunks
      if (this.getMemoryUsage() > this.memoryThreshold) {
        await this.triggerGarbageCollection();
      }
    }
  }
}
```

#### Progressive Loading

```typescript
// Progressive package loading for better UX
class ProgressivePackageLoader {
  async loadPackageProgressive(packagePath: string): Promise<void> {
    // 1. Load and parse header first (instant feedback)
    const header = await this.parsePackageHeader(packagePath);
    this.updateUI({ stage: 'header_loaded', manifest: header.manifest });

    // 2. Load database (quick, enables some functionality)
    const database = await this.loadPackageDatabase(packagePath, header);
    this.updateUI({ stage: 'database_loaded', canBrowseText: true });

    // 3. Load audio files in background (slower, enables full functionality)
    this.loadAudioFilesBackground(packagePath, header).then(() => {
      this.updateUI({ stage: 'complete', canPlayAudio: true });
    });
  }
}
```

#### Background Processing

```typescript
// Use React Native background tasks
import BackgroundJob from 'react-native-background-job';

class BackgroundPackageProcessor {
  async processInBackground(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      BackgroundJob.start({
        jobKey: 'packageProcessing',
        period: 1000,
      });

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          BackgroundJob.stop();
        });
    });
  }
}
```

## Monitoring & Analytics

### Performance Metrics Collection

```typescript
// Performance metrics tracking
class PerformanceTracker {
  private metrics = new Map<string, PerformanceMetric>();

  startOperation(operationId: string, type: string): void {
    this.metrics.set(operationId, {
      type,
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
    });
  }

  endOperation(operationId: string, success: boolean, metadata?: any): void {
    const metric = this.metrics.get(operationId);
    if (!metric) return;

    const endTime = Date.now();
    const endMemory = this.getMemoryUsage();

    const result: PerformanceResult = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      memoryUsed: endMemory - metric.startMemory,
      success,
      metadata,
    };

    this.reportMetric(result);
    this.metrics.delete(operationId);
  }

  private async reportMetric(result: PerformanceResult): Promise<void> {
    // Send to analytics service
    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(result),
    });
  }
}
```

### Load Testing

```bash
# Artillery.js load testing configuration
# artillery-config.yml

config:
  target: 'https://your-api-endpoint.com'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 300
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"

scenarios:
  - name: "Package Generation"
    weight: 60
    flow:
      - post:
          url: "/functions/v1/create-bible-package"
          headers:
            Authorization: "Bearer {{ auth_token }}"
          json:
            packageType: "audio"
            audioVersionId: "{{ audio_version_id }}"
            languageEntityId: "{{ language_id }}"

  - name: "Package Download"
    weight: 40
    flow:
      - get:
          url: "/functions/v1/download-bible-package"
          qs:
            packageType: "text"
            textVersionId: "{{ text_version_id }}"
            languageEntityId: "{{ language_id }}"
```

This comprehensive testing and performance guide ensures the Bible package system can handle real-world usage scenarios while maintaining optimal performance across all supported devices and network conditions.
