# Offline Bible Distribution Implementation Plan

## Overview

This document outlines the implementation plan for a comprehensive offline Bible distribution system that enables:

1. **Server-side package export** (Postgres → .bible packages)
2. **Client-side package export** (React Native SQLite → .bible packages)
3. **Offline package import** (WhatsApp, AirDrop, etc.)
4. **Post-import sync** (when network becomes available)

The system uses a custom `.bible` binary format optimized for mobile distribution and supports both audio and text versions.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Server Side   │    │   .bible File   │    │   Client Side   │
│   (Postgres)    │◄──►│    Package      │◄──►│ (React Native)  │
│                 │    │                 │    │                 │
│ - Export packages│    │ Custom binary   │    │ - Import packages│
│ - Serve downloads│    │ format with:    │    │ - Share packages │
│ - Sync updates  │    │ • Manifest      │    │ - Sync when online│
└─────────────────┘    │ • SQLite DB     │    └─────────────────┘
                       │ • Audio files   │
                       │ • Checksums     │
                       └─────────────────┘
```

## Custom .bible File Format Specification

### Binary Structure

```typescript
interface BiblePackageFormat {
  header: {
    magic: Buffer; // 8 bytes: 'BIBLE001'
    formatVersion: number; // 4 bytes: format version
    packageType: number; // 4 bytes: 1=audio, 2=text, 3=combined
    manifestSize: number; // 4 bytes: manifest JSON size
    databaseSize: number; // 8 bytes: SQLite database size
    audioDataSize: number; // 8 bytes: concatenated audio size
    checksum: Buffer; // 32 bytes: SHA-256 of content
    reserved: Buffer; // 8 bytes: future use
  };
  manifest: Buffer; // JSON metadata
  database: Buffer; // SQLite database
  audioData: Buffer; // Concatenated compressed audio files
}
```

### Manifest Structure

```typescript
interface BiblePackageManifest {
  packageId: string; // "niv-english-audio-v2.1"
  packageVersion: string; // "2.1.0"
  packageType: 'audio' | 'text' | 'combined';
  languageEntityId: string;
  bibleVersionId: string;

  // Version info
  audioVersionId?: string;
  textVersionId?: string;

  // Content metadata
  createdAt: string;
  estimatedSizeMB: number;
  audioFormat?: 'mp3' | 'm4a';
  includesVerseTimings: boolean;
  totalFiles: number;

  // Compatibility
  minAppVersion: string;
  conflictsWith: string[];

  // Content index
  audioFileIndex?: AudioFileEntry[];
  textContentHash?: string;
}

interface AudioFileEntry {
  fileName: string;
  offset: number;
  size: number;
  startVerseId: string;
  endVerseId: string;
  duration: number;
}
```

## Backend Implementation

### Required Dependencies

```typescript
// package.json additions
{
  "dependencies": {
    "node-sqlite3": "^5.1.6",
    "archiver": "^6.0.1",
    "crypto": "^1.0.1",
    "buffer": "^6.0.3"
  }
}
```

### 1. Server-Side Package Generation

#### Edge Function: `/api/create-bible-package`

```typescript
interface CreatePackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  requestedBy: string;
}

// Primary handler
async function createBiblePackage(
  request: CreatePackageRequest
): Promise<Buffer> {
  const packageBuilder = new BiblePackageBuilder();
  return await packageBuilder.create(request);
}
```

#### Core Package Builder

```typescript
class BiblePackageBuilder {
  async create(request: CreatePackageRequest): Promise<Buffer> {
    // 1. Validate request and check permissions
    await this.validateRequest(request);

    // 2. Gather all required data from Postgres
    const packageData = await this.gatherPackageData(request);

    // 3. Create manifest
    const manifest = await this.createManifest(packageData);

    // 4. Create SQLite database with content
    const database = await this.createPackageDatabase(packageData);

    // 5. Fetch and concatenate audio files (if audio package)
    const audioData = await this.prepareAudioData(packageData);

    // 6. Assemble final package
    return this.assembleBinaryPackage(manifest, database, audioData);
  }

  private async gatherPackageData(request: CreatePackageRequest) {
    const queries = {
      audioVersion: this.getAudioVersionData(request.audioVersionId),
      textVersion: this.getTextVersionData(request.textVersionId),
      mediaFiles: this.getMediaFilesData(request.audioVersionId),
      verseTexts: this.getVerseTextsData(request.textVersionId),
      verseTimings: this.getVerseTimingsData(request.audioVersionId),
    };

    return await this.executeQueries(queries);
  }

  private async createPackageDatabase(
    packageData: PackageData
  ): Promise<Buffer> {
    const tempDbPath = `/tmp/package-${packageData.packageId}.sqlite`;
    const db = new sqlite3.Database(tempDbPath);

    // Create tables matching app schema
    await this.createLocalTables(db);

    // Insert data based on package type
    if (packageData.audioVersion) {
      await this.insertAudioVersionData(db, packageData);
    }

    if (packageData.textVersion) {
      await this.insertTextVersionData(db, packageData);
    }

    // Read database file as buffer
    const dbBuffer = await fs.readFile(tempDbPath);
    await fs.unlink(tempDbPath); // cleanup

    return dbBuffer;
  }
}
```

#### Database Queries

```typescript
class PackageDataQueries {
  // Get audio version with all related data
  async getAudioVersionData(audioVersionId: string) {
    return await supabaseClient
      .from('audio_versions')
      .select(
        `
        *,
        media_files!inner(
          id, remote_path, file_size, duration_seconds,
          start_verse_id, end_verse_id, version, is_bible_audio,
          media_files_verses(
            verse_id, start_time_seconds, duration_seconds
          )
        )
      `
      )
      .eq('id', audioVersionId)
      .eq('media_files.publish_status', 'published')
      .single();
  }

  // Get text version with all verse texts
  async getTextVersionData(textVersionId: string) {
    return await supabaseClient
      .from('text_versions')
      .select(
        `
        *,
        verse_texts!inner(
          id, verse_id, verse_text, version
        )
      `
      )
      .eq('id', textVersionId)
      .eq('verse_texts.publish_status', 'published')
      .single();
  }
}
```

### 2. Package Download API

#### Edge Function: `/api/download-bible-package`

```typescript
async function downloadBiblePackage(req: Request): Promise<Response> {
  const { packageType, audioVersionId, textVersionId } = await req.json();

  // Check if package already cached
  const cacheKey = `${packageType}-${audioVersionId || textVersionId}`;
  let packageBuffer = await this.getFromCache(cacheKey);

  if (!packageBuffer) {
    // Generate package on-demand
    packageBuffer = await createBiblePackage({
      packageType,
      audioVersionId,
      textVersionId,
      requestedBy: req.headers.get('user-id'),
    });

    // Cache for future requests
    await this.setCache(cacheKey, packageBuffer, '1h');
  }

  return new Response(packageBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${packageType}-${Date.now()}.bible"`,
      'Content-Length': packageBuffer.length.toString(),
    },
  });
}
```

## Frontend Implementation (React Native)

### Required Dependencies

```bash
npm install react-native-sqlite-2 react-native-fs react-native-share
npm install react-native-document-picker buffer crypto-js
```

### 1. Client-Side Package Export

#### Package Export Service

```typescript
class ClientPackageExporter {
  async exportAudioVersion(audioVersionId: string): Promise<string> {
    // 1. Query local SQLite for all related data
    const audioData = await this.getLocalAudioVersionData(audioVersionId);

    // 2. Create package database
    const packageDb = await this.createPackageDatabase(audioData);

    // 3. Gather audio files from local storage
    const audioFiles = await this.gatherLocalAudioFiles(audioData.mediaFiles);

    // 4. Create manifest
    const manifest = this.createManifest(audioData);

    // 5. Assemble package
    const packagePath = await this.assembleBinaryPackage(
      manifest,
      packageDb,
      audioFiles
    );

    return packagePath;
  }

  private async getLocalAudioVersionData(audioVersionId: string) {
    const db = await this.openLocalDatabase();

    // Query audio version
    const audioVersion = await this.queryOne(
      db,
      `
      SELECT * FROM audio_versions WHERE id = ?
    `,
      [audioVersionId]
    );

    // Query media files
    const mediaFiles = await this.queryAll(
      db,
      `
      SELECT * FROM media_files 
      WHERE audio_version_id = ? AND local_path IS NOT NULL
    `,
      [audioVersionId]
    );

    // Query verse timings
    const verseTimings = await this.queryAll(
      db,
      `
      SELECT mfv.* FROM media_files_verses mfv
      JOIN media_files mf ON mf.id = mfv.media_file_id
      WHERE mf.audio_version_id = ?
    `,
      [audioVersionId]
    );

    return { audioVersion, mediaFiles, verseTimings };
  }

  private async gatherLocalAudioFiles(
    mediaFiles: MediaFile[]
  ): Promise<Buffer> {
    const audioBuffers: Buffer[] = [];
    const audioIndex: AudioFileEntry[] = [];
    let currentOffset = 0;

    for (const mediaFile of mediaFiles) {
      if (mediaFile.local_path && (await RNFS.exists(mediaFile.local_path))) {
        const audioBuffer = await RNFS.readFile(mediaFile.local_path, 'base64');
        const buffer = Buffer.from(audioBuffer, 'base64');

        audioIndex.push({
          fileName: path.basename(mediaFile.local_path),
          offset: currentOffset,
          size: buffer.length,
          startVerseId: mediaFile.start_verse_id,
          endVerseId: mediaFile.end_verse_id,
          duration: mediaFile.duration_seconds,
        });

        audioBuffers.push(buffer);
        currentOffset += buffer.length;
      }
    }

    return Buffer.concat(audioBuffers);
  }
}
```

#### Sharing Integration

```typescript
class BiblePackageSharer {
  async shareAudioVersion(audioVersionId: string): Promise<void> {
    try {
      // Show progress indicator
      this.showProgress('Preparing package for sharing...');

      // Create package
      const exporter = new ClientPackageExporter();
      const packagePath = await exporter.exportAudioVersion(audioVersionId);

      // Get version info for sharing
      const versionInfo = await this.getVersionInfo(audioVersionId);

      // Open native share sheet
      await RNShare.open({
        title: `Share ${versionInfo.name} Bible Audio`,
        message: `Bible audio version: ${versionInfo.name}`,
        url: `file://${packagePath}`,
        type: 'application/octet-stream',
        filename: `bible-${versionInfo.name.toLowerCase()}-${Date.now()}.bible`,
      });
    } catch (error) {
      this.handleSharingError(error);
    }
  }
}
```

### 2. Package Import System

#### Package Import Service

```typescript
class BiblePackageImporter {
  async importPackage(packagePath: string): Promise<ImportResult> {
    try {
      // 1. Read and validate package
      const packageBuffer = await RNFS.readFile(packagePath, 'base64');
      const buffer = Buffer.from(packageBuffer, 'base64');

      // 2. Parse package structure
      const parsedPackage = await this.parsePackage(buffer);

      // 3. Validate manifest and compatibility
      await this.validatePackage(parsedPackage);

      // 4. Show import confirmation to user
      const shouldImport = await this.showImportDialog(parsedPackage.manifest);
      if (!shouldImport) return { success: false, cancelled: true };

      // 5. Import database content
      await this.importDatabaseContent(parsedPackage.database);

      // 6. Extract and store audio files
      if (parsedPackage.audioData) {
        await this.extractAudioFiles(
          parsedPackage.audioData,
          parsedPackage.manifest
        );
      }

      // 7. Update local paths in database
      await this.updateLocalPaths(parsedPackage.manifest);

      // 8. Mark as available offline
      await this.markAsOfflineAvailable(parsedPackage.manifest);

      return {
        success: true,
        packageId: parsedPackage.manifest.packageId,
        importedAt: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async parsePackage(buffer: Buffer): Promise<ParsedPackage> {
    // Read header
    const header = this.parseHeader(buffer.slice(0, 64));

    // Validate magic bytes
    if (header.magic.toString() !== 'BIBLE001') {
      throw new Error('Invalid package format');
    }

    // Extract components
    let offset = 64;
    const manifestBuffer = buffer.slice(offset, offset + header.manifestSize);
    const manifest = JSON.parse(manifestBuffer.toString());
    offset += header.manifestSize;

    const database = buffer.slice(offset, offset + header.databaseSize);
    offset += header.databaseSize;

    const audioData =
      header.audioDataSize > 0
        ? buffer.slice(offset, offset + header.audioDataSize)
        : null;

    return { header, manifest, database, audioData };
  }

  private async extractAudioFiles(
    audioData: Buffer,
    manifest: BiblePackageManifest
  ): Promise<void> {
    const audioDir = `${RNFS.DocumentDirectoryPath}/bible-audio/${manifest.packageId}`;
    await RNFS.mkdir(audioDir);

    for (const audioFile of manifest.audioFileIndex) {
      const fileBuffer = audioData.slice(
        audioFile.offset,
        audioFile.offset + audioFile.size
      );

      const localPath = `${audioDir}/${audioFile.fileName}`;
      await RNFS.writeFile(localPath, fileBuffer.toString('base64'), 'base64');

      // Update database with local path
      await this.updateMediaFileLocalPath(audioFile.fileName, localPath);
    }
  }
}
```

#### File Association & Auto-Import

```typescript
// App.tsx - Handle incoming .bible files
class App extends Component {
  componentDidMount() {
    // Listen for incoming files
    this.linkingListener = Linking.addEventListener(
      'url',
      this.handleIncomingFile
    );

    // Check for launch URL (if app opened via file)
    Linking.getInitialURL().then(url => {
      if (url) this.handleIncomingFile({ url });
    });
  }

  handleIncomingFile = async ({ url }: { url: string }) => {
    if (url.endsWith('.bible')) {
      const importService = new BiblePackageImporter();
      const result = await importService.importPackage(url);

      if (result.success) {
        this.showImportSuccess(result);
      } else {
        this.showImportError(result.error);
      }
    }
  };
}
```

### 3. Sync Service (Post-Import)

#### Sync Manager

```typescript
class OfflineSyncManager {
  async syncAfterImport(packageId: string): Promise<SyncResult> {
    // 1. Check network availability
    if (!(await this.isNetworkAvailable())) {
      return { success: false, reason: 'No network available' };
    }

    // 2. Get local package info
    const localPackage = await this.getLocalPackageInfo(packageId);

    // 3. Check server for updates
    const serverVersion = await this.checkServerVersion(localPackage);

    // 4. Determine sync strategy
    const syncStrategy = this.determineSyncStrategy(
      localPackage,
      serverVersion
    );

    // 5. Execute sync
    switch (syncStrategy) {
      case 'no_sync_needed':
        return { success: true, action: 'up_to_date' };

      case 'incremental_update':
        return await this.performIncrementalSync(localPackage, serverVersion);

      case 'full_redownload':
        return await this.performFullSync(localPackage, serverVersion);

      case 'upload_to_server':
        return await this.uploadLocalChangesToServer(localPackage);
    }
  }

  private async performIncrementalSync(
    localPackage: LocalPackage,
    serverVersion: ServerVersion
  ): Promise<SyncResult> {
    // Get list of changed files
    const changes = await this.getChangesSinceVersion(
      localPackage.packageId,
      localPackage.version
    );

    // Download only changed content
    for (const change of changes) {
      if (change.type === 'media_file') {
        await this.downloadUpdatedMediaFile(change);
      } else if (change.type === 'verse_text') {
        await this.updateVerseText(change);
      }
    }

    // Update local version
    await this.updateLocalVersion(
      localPackage.packageId,
      serverVersion.version
    );

    return {
      success: true,
      action: 'incremental_sync',
      changesApplied: changes.length,
    };
  }
}
```

#### Network Detection & Auto-Sync

```typescript
class NetworkAwareSyncService {
  constructor() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isCurrentlySyncing) {
        this.triggerPendingSyncs();
      }
    });
  }

  async triggerPendingSyncs(): Promise<void> {
    // Get all packages that need syncing
    const pendingPackages = await this.getPendingPackages();

    for (const packageId of pendingPackages) {
      try {
        const result = await this.syncManager.syncAfterImport(packageId);
        await this.logSyncResult(packageId, result);
      } catch (error) {
        await this.logSyncError(packageId, error);
      }
    }
  }
}
```

## Database Schema Extensions

### Local SQLite Tables (React Native)

```sql
-- Package tracking table
CREATE TABLE IF NOT EXISTS local_packages (
  id TEXT PRIMARY KEY,
  package_type TEXT NOT NULL, -- 'audio', 'text', 'combined'
  language_entity_id TEXT NOT NULL,
  audio_version_id TEXT,
  text_version_id TEXT,
  version TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  local_size_mb REAL,
  source TEXT NOT NULL -- 'download', 'import', 'share'
);

-- Sync tracking
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'incremental', 'full', 'upload'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  changes_count INTEGER DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (package_id) REFERENCES local_packages(id)
);

-- Enhanced media_files table with local tracking
ALTER TABLE media_files ADD COLUMN local_path TEXT;
ALTER TABLE media_files ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE media_files ADD COLUMN last_synced_at TEXT;
```

## Implementation Phases

### Phase 1: Core Package System (4-6 weeks)

1. **Week 1-2**:

   - Implement custom .bible binary format
   - Create server-side package generation
   - Basic package validation

2. **Week 3-4**:

   - Client-side package import
   - Local SQLite schema setup
   - Basic audio file extraction

3. **Week 5-6**:
   - Client-side package export
   - File association setup
   - Basic sharing integration

### Phase 2: Production Features (3-4 weeks)

1. **Week 1-2**:

   - Robust error handling and recovery
   - Progress indicators and user feedback
   - Package caching and optimization

2. **Week 3-4**:
   - Post-import sync service
   - Network-aware sync triggers
   - Incremental update system

### Phase 3: Advanced Features (2-3 weeks)

1. **Week 1-2**:

   - Package verification and integrity checks
   - Compression optimization
   - Background sync capabilities

2. **Week 3**:
   - Analytics and usage tracking
   - Performance monitoring
   - User experience refinements

## Testing Strategy

### Unit Tests

- Package generation/parsing logic
- Database import/export functions
- Sync conflict resolution
- File integrity verification

### Integration Tests

- End-to-end package flow (export → share → import)
- Network failure scenarios
- Large package handling (1GB+)
- Cross-platform file sharing

### Performance Tests

- Package generation speed
- Import speed for large packages
- Memory usage during operations
- Battery impact of background sync

## Security Considerations

### Package Integrity

- SHA-256 checksums for all content
- Version validation before import
- Size limits to prevent abuse

### User Data Protection

- No personal data in packages
- Secure temporary file handling
- Proper cleanup after operations

### Network Security

- HTTPS for all package downloads
- API authentication for server endpoints
- Rate limiting on package generation

## Monitoring & Analytics

### Key Metrics

- Package generation success/failure rates
- Import success rates by source (download vs share)
- Sync completion rates
- Package size distribution
- User engagement with offline features

### Error Tracking

- Package corruption incidents
- Import failures by error type
- Sync conflicts and resolutions
- Performance bottlenecks

This implementation plan provides a comprehensive foundation for building a robust offline Bible distribution system while maintaining performance, reliability, and user experience across all scenarios.
