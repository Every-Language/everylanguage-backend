# Frontend Implementation Guide (React Native)

## Overview

This guide covers the React Native implementation for Bible package import, export, and sharing functionality. The frontend handles local package creation, sharing via native APIs, importing received packages, and sync with the server.

## Dependencies

### Package.json Additions

```json
{
  "dependencies": {
    "react-native-sqlite-2": "^3.7.1",
    "react-native-fs": "^2.20.0",
    "react-native-share": "^10.0.2",
    "react-native-document-picker": "^9.1.1",
    "buffer": "^6.0.3",
    "crypto-js": "^4.1.1",
    "@react-native-netinfo/netinfo": "^11.3.1",
    "react-native-background-job": "^1.2.0"
  }
}
```

### Platform Configuration

#### iOS (Info.plist)

```xml
<!-- File association for .bible files -->
<key>CFBundleDocumentTypes</key>
<array>
  <dict>
    <key>CFBundleTypeName</key>
    <string>Bible Package</string>
    <key>CFBundleTypeExtensions</key>
    <array>
      <string>bible</string>
    </array>
    <key>CFBundleTypeRole</key>
    <string>Viewer</string>
    <key>CFBundleTypeIconFiles</key>
    <array>
      <string>bible-package-icon</string>
    </array>
  </dict>
</array>

<!-- URL scheme for handling shared files -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.yourapp.bible</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>bible</string>
    </array>
  </dict>
</array>
```

#### Android (AndroidManifest.xml)

```xml
<!-- File association for .bible files -->
<activity android:name=".MainActivity" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/octet-stream"
          android:pathPattern=".*\\.bible" />
  </intent-filter>

  <intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/octet-stream" />
  </intent-filter>
</activity>

<!-- Permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Core Classes

### 1. Bible Package Service

```typescript
// src/services/BiblePackageService.ts

import SQLite from 'react-native-sqlite-2';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

interface PackageExportOptions {
  versionId: string;
  versionType: 'audio' | 'text';
  includeStructure?: boolean;
  compressionLevel?: number;

  // Multi-package support
  enableChunking?: boolean; // Allow automatic splitting if needed
  maxSizeMB?: number; // Maximum size constraint
  chunkingStrategy?: 'size' | 'testament' | 'book_group' | 'custom';
  preferMultiplePackages?: boolean; // Prefer multiple packages over single large one
}

interface PackageImportResult {
  success: boolean;
  packageId?: string;
  manifest?: BiblePackageManifest;
  importedAt?: string;
  errors?: string[];
  warnings?: string[];

  // Multi-package support
  isPartOfSeries?: boolean;
  seriesInfo?: {
    seriesId: string;
    seriesName: string;
    partNumber: number;
    totalParts: number;
    availableParts: number[]; // Parts already imported
    missingParts: number[]; // Parts still needed
    isSeriesComplete: boolean; // All parts imported
  };
}

interface PackageExportResult {
  success: boolean;

  // Single package result
  packagePath?: string;
  packageSize?: number;

  // Multi-package result
  packages?: ExportedPackage[];
  seriesInfo?: {
    seriesId: string;
    seriesName: string;
    totalParts: number;
    totalSizeMB: number;
  };

  errors?: string[];
}

interface ExportedPackage {
  packagePath: string;
  packageSize: number;
  partNumber: number;
  manifest: BiblePackageManifest;
}

interface ExportProgress {
  stage:
    | 'validating'
    | 'gathering'
    | 'creating_db'
    | 'preparing_audio'
    | 'assembling'
    | 'complete';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

export class BiblePackageService {
  private db: SQLite.Database | null = null;
  private readonly packageDir: string;
  private readonly tempDir: string;

  constructor() {
    this.packageDir = `${RNFS.DocumentDirectoryPath}/bible-packages`;
    this.tempDir = `${RNFS.CachesDirectoryPath}/temp-packages`;
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Open local database
    this.db = await this.openDatabase();

    // Create package tracking tables if needed
    await this.createPackageTrackingTables();
  }

  private async ensureDirectories(): Promise<void> {
    await RNFS.mkdir(this.packageDir);
    await RNFS.mkdir(this.tempDir);
  }

  private async openDatabase(): Promise<SQLite.Database> {
    return new Promise((resolve, reject) => {
      SQLite.openDatabase(
        { name: 'bible.db', location: 'default' },
        db => resolve(db),
        error => reject(error)
      );
    });
  }

  // Export audio version from local database (enhanced with multi-package support)
  async exportAudioVersion(
    audioVersionId: string,
    options: PackageExportOptions = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<PackageExportResult> {
    // Check if chunking is needed/requested
    if (options.enableChunking || options.preferMultiplePackages) {
      const estimatedSize = await this.estimateExportSize(
        audioVersionId,
        'audio'
      );
      const maxSize = options.maxSizeMB || 2048; // Default to AirDrop limit

      if (estimatedSize > maxSize || options.preferMultiplePackages) {
        return await this.exportAudioVersionAsChunks(
          audioVersionId,
          options,
          onProgress
        );
      }
    }

    // Export as single package (original behavior)
    const packagePath = await this.exportSingleAudioVersion(
      audioVersionId,
      options,
      onProgress
    );
    const packageSize = await this.getFileSize(packagePath);

    return {
      success: true,
      packagePath,
      packageSize,
    };
  }

  // Original single package export logic
  private async exportSingleAudioVersion(
    audioVersionId: string,
    options: PackageExportOptions = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string> {
    try {
      onProgress?.({
        stage: 'validating',
        progress: 0,
        message: 'Validating local data...',
      });

      // 1. Validate that version is fully downloaded
      await this.validateVersionComplete(audioVersionId, 'audio');

      onProgress?.({
        stage: 'gathering',
        progress: 10,
        message: 'Gathering version data...',
      });

      // 2. Gather all related data
      const packageData = await this.gatherAudioVersionData(audioVersionId);

      onProgress?.({
        stage: 'creating_db',
        progress: 30,
        message: 'Creating package database...',
      });

      // 3. Create package database
      const databaseBuffer = await this.createPackageDatabase(packageData);

      onProgress?.({
        stage: 'preparing_audio',
        progress: 50,
        message: 'Preparing audio files...',
      });

      // 4. Gather audio files from local storage
      const audioBuffer = await this.gatherAudioFiles(packageData.mediaFiles);

      onProgress?.({
        stage: 'assembling',
        progress: 80,
        message: 'Assembling package...',
      });

      // 5. Create manifest
      const manifest = this.createManifest(
        packageData,
        databaseBuffer,
        audioBuffer
      );

      // 6. Assemble final package
      const packagePath = await this.assemblePackage(
        manifest,
        databaseBuffer,
        audioBuffer,
        audioVersionId
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Package created successfully',
      });

      return packagePath;
    } catch (error) {
      await this.cleanup();
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  // Multi-package audio export
  private async exportAudioVersionAsChunks(
    audioVersionId: string,
    options: PackageExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<PackageExportResult> {
    try {
      onProgress?.({
        stage: 'validating',
        progress: 0,
        message: 'Planning package chunks...',
      });

      // Create chunking plan
      const chunkPlan = await this.createLocalChunkingPlan(
        audioVersionId,
        'audio',
        options
      );

      const packages: ExportedPackage[] = [];
      let overallProgress = 0;
      const progressPerChunk = 90 / chunkPlan.chunks.length;

      for (let i = 0; i < chunkPlan.chunks.length; i++) {
        const chunk = chunkPlan.chunks[i];

        onProgress?.({
          stage: 'assembling',
          progress: overallProgress + 5,
          message: `Creating package ${i + 1} of ${chunkPlan.chunks.length}: ${chunk.description}`,
        });

        // Create chunk-specific package
        const chunkOptions = {
          ...options,
          customChunkRange: chunk.range,
        };

        const packagePath = await this.exportChunkAudioVersion(
          audioVersionId,
          chunkOptions,
          chunkPlan.seriesId,
          i + 1,
          chunkPlan.chunks.length,
          chunk
        );

        const packageSize = await this.getFileSize(packagePath);
        const manifest = await this.getPackageManifest(packagePath);

        packages.push({
          packagePath,
          packageSize,
          partNumber: i + 1,
          manifest,
        });

        overallProgress += progressPerChunk;
        onProgress?.({
          stage: 'assembling',
          progress: overallProgress,
          message: `Package ${i + 1} of ${chunkPlan.chunks.length} completed`,
        });
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Created ${packages.length} packages successfully`,
      });

      return {
        success: true,
        packages,
        seriesInfo: {
          seriesId: chunkPlan.seriesId,
          seriesName: chunkPlan.seriesName,
          totalParts: chunkPlan.chunks.length,
          totalSizeMB: packages.reduce(
            (sum, pkg) => sum + pkg.packageSize / (1024 * 1024),
            0
          ),
        },
      };
    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  // Import package with series support
  async importPackageWithSeriesSupport(
    packagePath: string,
    onProgress?: (progress: any) => void
  ): Promise<PackageImportResult> {
    try {
      // Import the individual package
      const importResult = await this.importPackage(packagePath, onProgress);

      if (!importResult.success || !importResult.manifest) {
        return importResult;
      }

      // Check if this is part of a series
      if (importResult.manifest.seriesInfo) {
        const seriesStatus = await this.checkSeriesStatus(
          importResult.manifest.seriesInfo
        );

        return {
          ...importResult,
          isPartOfSeries: true,
          seriesInfo: seriesStatus,
        };
      }

      return importResult;
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  private async checkSeriesStatus(seriesInfo: any): Promise<any> {
    // Check which parts of the series are already imported
    const existingParts = await this.queryDatabase(
      `
      SELECT manifest_json FROM local_packages 
      WHERE JSON_EXTRACT(manifest_json, '$.seriesInfo.seriesId') = ?
    `,
      [seriesInfo.seriesId]
    );

    const availableParts: number[] = [];
    for (const part of existingParts) {
      const manifest = JSON.parse(part.manifest_json);
      if (manifest.seriesInfo) {
        availableParts.push(manifest.seriesInfo.partNumber);
      }
    }

    const missingParts: number[] = [];
    for (let i = 1; i <= seriesInfo.totalParts; i++) {
      if (!availableParts.includes(i)) {
        missingParts.push(i);
      }
    }

    return {
      seriesId: seriesInfo.seriesId,
      seriesName: seriesInfo.seriesName,
      partNumber: seriesInfo.partNumber,
      totalParts: seriesInfo.totalParts,
      availableParts: availableParts.sort(),
      missingParts: missingParts.sort(),
      isSeriesComplete: missingParts.length === 0,
    };
  }

  // Export text version from local database
  async exportTextVersion(
    textVersionId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string> {
    try {
      onProgress?.({
        stage: 'validating',
        progress: 0,
        message: 'Validating local data...',
      });

      // 1. Validate that version is fully downloaded
      await this.validateVersionComplete(textVersionId, 'text');

      onProgress?.({
        stage: 'gathering',
        progress: 20,
        message: 'Gathering version data...',
      });

      // 2. Gather all related data
      const packageData = await this.gatherTextVersionData(textVersionId);

      onProgress?.({
        stage: 'creating_db',
        progress: 60,
        message: 'Creating package database...',
      });

      // 3. Create package database
      const databaseBuffer = await this.createPackageDatabase(packageData);

      onProgress?.({
        stage: 'assembling',
        progress: 90,
        message: 'Assembling package...',
      });

      // 4. Create manifest
      const manifest = this.createManifest(packageData, databaseBuffer, null);

      // 5. Assemble final package
      const packagePath = await this.assemblePackage(
        manifest,
        databaseBuffer,
        null,
        textVersionId
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Package created successfully',
      });

      return packagePath;
    } catch (error) {
      await this.cleanup();
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  private async validateVersionComplete(
    versionId: string,
    type: 'audio' | 'text'
  ): Promise<void> {
    if (type === 'audio') {
      // Check that all media files exist locally
      const mediaFiles = await this.queryDatabase(
        `
        SELECT id, local_path FROM media_files 
        WHERE audio_version_id = ? AND local_path IS NOT NULL
      `,
        [versionId]
      );

      for (const file of mediaFiles) {
        if (!file.local_path || !(await RNFS.exists(file.local_path))) {
          throw new Error(
            `Audio file missing: ${file.id}. Please download the complete version first.`
          );
        }
      }

      if (mediaFiles.length === 0) {
        throw new Error(
          'No audio files found for this version. Please download the version first.'
        );
      }
    } else {
      // Check that verse texts exist
      const verseTexts = await this.queryDatabase(
        `
        SELECT COUNT(*) as count FROM verse_texts 
        WHERE text_version_id = ?
      `,
        [versionId]
      );

      if (verseTexts[0].count === 0) {
        throw new Error(
          'No verse texts found for this version. Please download the version first.'
        );
      }
    }
  }

  private async gatherAudioVersionData(
    audioVersionId: string
  ): Promise<AudioPackageData> {
    // Get audio version
    const audioVersion = await this.queryDatabase(
      `
      SELECT * FROM audio_versions WHERE id = ?
    `,
      [audioVersionId]
    );

    if (audioVersion.length === 0) {
      throw new Error(`Audio version not found: ${audioVersionId}`);
    }

    // Get media files
    const mediaFiles = await this.queryDatabase(
      `
      SELECT * FROM media_files 
      WHERE audio_version_id = ? AND local_path IS NOT NULL
      ORDER BY start_verse_id
    `,
      [audioVersionId]
    );

    // Get verse timings
    const mediaFileIds = mediaFiles.map(mf => mf.id);
    const verseTimings =
      mediaFileIds.length > 0
        ? await this.queryDatabase(
            `
      SELECT * FROM media_files_verses 
      WHERE media_file_id IN (${mediaFileIds.map(() => '?').join(',')})
      ORDER BY start_time_seconds
    `,
            mediaFileIds
          )
        : [];

    // Get targets and tags
    const targets =
      mediaFileIds.length > 0
        ? await this.queryDatabase(
            `
      SELECT * FROM media_files_targets 
      WHERE media_file_id IN (${mediaFileIds.map(() => '?').join(',')})
    `,
            mediaFileIds
          )
        : [];

    const tags =
      mediaFileIds.length > 0
        ? await this.queryDatabase(
            `
      SELECT mft.*, t.* FROM media_files_tags mft
      JOIN tags t ON t.id = mft.tag_id
      WHERE mft.media_file_id IN (${mediaFileIds.map(() => '?').join(',')})
    `,
            mediaFileIds
          )
        : [];

    // Get context data
    const languageEntity = await this.queryDatabase(
      `
      SELECT * FROM language_entities WHERE id = ?
    `,
      [audioVersion[0].language_entity_id]
    );

    // Get bible structure
    const bibleStructure = await this.getBibleStructureData(
      audioVersion[0].bible_version_id
    );

    return {
      audioVersion: audioVersion[0],
      mediaFiles,
      verseTimings,
      targets,
      tags,
      languageEntity: languageEntity[0],
      bibleStructure,
    };
  }

  private async gatherTextVersionData(
    textVersionId: string
  ): Promise<TextPackageData> {
    // Get text version
    const textVersion = await this.queryDatabase(
      `
      SELECT * FROM text_versions WHERE id = ?
    `,
      [textVersionId]
    );

    if (textVersion.length === 0) {
      throw new Error(`Text version not found: ${textVersionId}`);
    }

    // Get verse texts
    const verseTexts = await this.queryDatabase(
      `
      SELECT * FROM verse_texts 
      WHERE text_version_id = ?
      ORDER BY verse_id
    `,
      [textVersionId]
    );

    // Get context data
    const languageEntity = await this.queryDatabase(
      `
      SELECT * FROM language_entities WHERE id = ?
    `,
      [textVersion[0].language_entity_id]
    );

    // Get bible structure
    const bibleStructure = await this.getBibleStructureData(
      textVersion[0].bible_version_id
    );

    return {
      textVersion: textVersion[0],
      verseTexts,
      languageEntity: languageEntity[0],
      bibleStructure,
    };
  }

  private async getBibleStructureData(
    bibleVersionId: string
  ): Promise<BibleStructureData> {
    const bibleVersion = await this.queryDatabase(
      `
      SELECT * FROM bible_versions WHERE id = ?
    `,
      [bibleVersionId]
    );

    const books = await this.queryDatabase(
      `
      SELECT * FROM books WHERE bible_version_id = ? ORDER BY book_number
    `,
      [bibleVersionId]
    );

    const bookIds = books.map(b => b.id);
    const chapters =
      bookIds.length > 0
        ? await this.queryDatabase(
            `
      SELECT * FROM chapters 
      WHERE book_id IN (${bookIds.map(() => '?').join(',')})
      ORDER BY book_id, chapter_number
    `,
            bookIds
          )
        : [];

    const chapterIds = chapters.map(c => c.id);
    const verses =
      chapterIds.length > 0
        ? await this.queryDatabase(
            `
      SELECT * FROM verses 
      WHERE chapter_id IN (${chapterIds.map(() => '?').join(',')})
      ORDER BY chapter_id, verse_number
    `,
            chapterIds
          )
        : [];

    return {
      bibleVersion: bibleVersion[0],
      books,
      chapters,
      verses,
    };
  }

  private async gatherAudioFiles(mediaFiles: any[]): Promise<Buffer> {
    const audioBuffers: Buffer[] = [];
    const audioIndex: AudioFileEntry[] = [];
    let currentOffset = 0;

    for (const mediaFile of mediaFiles) {
      if (mediaFile.local_path && (await RNFS.exists(mediaFile.local_path))) {
        try {
          // Read audio file
          const audioData = await RNFS.readFile(mediaFile.local_path, 'base64');
          const audioBuffer = Buffer.from(audioData, 'base64');

          // Add to index
          audioIndex.push({
            fileName: this.extractFileName(mediaFile.local_path),
            mediaFileId: mediaFile.id,
            offset: currentOffset,
            size: audioBuffer.length,
            startVerseId: mediaFile.start_verse_id,
            endVerseId: mediaFile.end_verse_id,
            duration: mediaFile.duration_seconds,
            format: this.getAudioFormat(mediaFile.local_path),
            hasVerseTimings: true, // Will be determined by verse timing data
            verseCount: 0, // Will be set when creating manifest
          });

          audioBuffers.push(audioBuffer);
          currentOffset += audioBuffer.length;
        } catch (error) {
          console.warn(
            `Failed to read audio file: ${mediaFile.local_path}`,
            error
          );
          // Continue with other files - allow partial packages
        }
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('No audio files could be read from local storage');
    }

    return Buffer.concat(audioBuffers);
  }

  private async createPackageDatabase(
    packageData: AudioPackageData | TextPackageData
  ): Promise<Buffer> {
    const tempDbPath = `${this.tempDir}/package-${Date.now()}.sqlite`;

    return new Promise((resolve, reject) => {
      const packageDb = SQLite.openDatabase(
        { name: tempDbPath, location: 'default' },
        async db => {
          try {
            // Create all package tables
            await this.createPackageTables(db);

            // Insert data based on package type
            if ('audioVersion' in packageData) {
              await this.insertAudioVersionData(db, packageData);
            }

            if ('textVersion' in packageData) {
              await this.insertTextVersionData(db, packageData);
            }

            // Insert context and structure data
            await this.insertContextData(db, packageData);
            await this.insertBibleStructureData(db, packageData.bibleStructure);

            // Read database file as buffer
            const dbBuffer = await RNFS.readFile(tempDbPath, 'base64');
            await RNFS.unlink(tempDbPath);

            resolve(Buffer.from(dbBuffer, 'base64'));
          } catch (error) {
            reject(error);
          }
        },
        error => reject(error)
      );
    });
  }

  private async createPackageTables(db: SQLite.Database): Promise<void> {
    const createTableStatements = [
      // All CREATE TABLE statements from format specification
      // (Copy from 02-bible-package-format.md SQLite Database Schema section)
      `CREATE TABLE package_audio_versions (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT NOT NULL,
        bible_version_id TEXT NOT NULL,
        project_id TEXT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
      // ... continue with all other tables
    ];

    for (const statement of createTableStatements) {
      await this.executeSql(db, statement);
    }
  }

  private createManifest(
    packageData: AudioPackageData | TextPackageData,
    databaseBuffer: Buffer,
    audioBuffer: Buffer | null
  ): BiblePackageManifest {
    const isAudioPackage = 'audioVersion' in packageData;
    const packageId = this.generatePackageId(packageData);

    return {
      packageId,
      packageVersion: '1.0.0',
      packageType: isAudioPackage ? (audioBuffer ? 1 : 2) : 2,
      createdAt: new Date().toISOString(),
      createdBy: 'local-user',

      languageEntityId: packageData.languageEntity.id,
      bibleVersionId: packageData.bibleStructure.bibleVersion.id,
      audioVersionId: isAudioPackage ? packageData.audioVersion.id : undefined,
      textVersionId: !isAudioPackage ? packageData.textVersion.id : undefined,

      estimatedSizeMB:
        Math.round(
          ((databaseBuffer.length + (audioBuffer?.length || 0)) / 1024 / 1024) *
            100
        ) / 100,
      totalFiles: isAudioPackage ? packageData.mediaFiles.length : 0,
      audioFormat: audioBuffer ? ('mp3' as const) : undefined,
      includesVerseTimings: isAudioPackage
        ? packageData.verseTimings.length > 0
        : false,
      includesTotalVerses: !isAudioPackage ? packageData.verseTexts.length : 0,
      includesBooks: this.getIncludedBooks(packageData),

      minAppVersion: '1.0.0',
      conflictsWith: [],

      audioFileIndex: audioBuffer
        ? this.createAudioFileIndex(packageData as AudioPackageData)
        : undefined,

      databaseHash: this.calculateSHA256(databaseBuffer),
      audioDataHash: audioBuffer
        ? this.calculateSHA256(audioBuffer)
        : undefined,
      totalContentHash: this.calculateSHA256(
        Buffer.concat([databaseBuffer, audioBuffer || Buffer.alloc(0)])
      ),

      bibleStructure: {
        totalBooks: packageData.bibleStructure.books.length,
        totalChapters: packageData.bibleStructure.chapters.length,
        totalVerses: packageData.bibleStructure.verses.length,
        testament: this.determineTestament(packageData.bibleStructure.books),
      },
    };
  }

  private async assemblePackage(
    manifest: BiblePackageManifest,
    databaseBuffer: Buffer,
    audioBuffer: Buffer | null,
    versionId: string
  ): Promise<string> {
    const manifestJson = JSON.stringify(manifest);
    const manifestBuffer = Buffer.from(manifestJson, 'utf8');

    // Create header (64 bytes)
    const header = Buffer.alloc(64);

    // Magic bytes: 'BIBLE001'
    header.write('BIBLE001', 0);

    // Format version (4 bytes at offset 8)
    header.writeUInt32LE(1, 8);

    // Package type (4 bytes at offset 12)
    header.writeUInt32LE(manifest.packageType, 12);

    // Manifest size (4 bytes at offset 16)
    header.writeUInt32LE(manifestBuffer.length, 16);

    // Database size (8 bytes at offset 20) - using 32-bit for React Native compatibility
    header.writeUInt32LE(databaseBuffer.length, 20);
    header.writeUInt32LE(0, 24); // high 32 bits

    // Audio data size (8 bytes at offset 28)
    const audioSize = audioBuffer?.length || 0;
    header.writeUInt32LE(audioSize, 28);
    header.writeUInt32LE(0, 32); // high 32 bits

    // Calculate checksum of content
    const contentBuffer = Buffer.concat([
      manifestBuffer,
      databaseBuffer,
      audioBuffer || Buffer.alloc(0),
    ]);
    const checksum = this.calculateSHA256Buffer(contentBuffer);

    // Checksum (32 bytes at offset 36)
    checksum.copy(header, 36);

    // Assemble final package
    const packageBuffer = Buffer.concat([
      header,
      manifestBuffer,
      databaseBuffer,
      audioBuffer || Buffer.alloc(0),
    ]);

    // Save to file
    const fileName = `${manifest.packageId}-${Date.now()}.bible`;
    const packagePath = `${this.packageDir}/${fileName}`;

    await RNFS.writeFile(
      packagePath,
      packageBuffer.toString('base64'),
      'base64'
    );

    // Record package in tracking table
    await this.recordExportedPackage(manifest, packagePath);

    return packagePath;
  }

  // Import package from file path
  async importPackage(
    packagePath: string,
    onProgress?: (progress: {
      stage: string;
      progress: number;
      message: string;
    }) => void
  ): Promise<PackageImportResult> {
    try {
      onProgress?.({
        stage: 'reading',
        progress: 0,
        message: 'Reading package file...',
      });

      // 1. Read and parse package
      const packageBuffer = await RNFS.readFile(packagePath, 'base64');
      const buffer = Buffer.from(packageBuffer, 'base64');

      onProgress?.({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing package structure...',
      });

      // 2. Parse package structure
      const parsedPackage = await this.parsePackage(buffer);

      onProgress?.({
        stage: 'validating',
        progress: 20,
        message: 'Validating package...',
      });

      // 3. Validate package
      const validation = await this.validatePackage(parsedPackage);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // 4. Check storage space
      await this.checkStorageSpace(parsedPackage.manifest.estimatedSizeMB);

      onProgress?.({
        stage: 'importing_db',
        progress: 40,
        message: 'Importing database content...',
      });

      // 5. Import database content
      await this.importDatabaseContent(
        parsedPackage.database,
        parsedPackage.manifest
      );

      onProgress?.({
        stage: 'extracting_audio',
        progress: 70,
        message: 'Extracting audio files...',
      });

      // 6. Extract and store audio files
      if (parsedPackage.audioData && parsedPackage.manifest.audioFileIndex) {
        await this.extractAudioFiles(
          parsedPackage.audioData,
          parsedPackage.manifest
        );
      }

      onProgress?.({
        stage: 'updating_paths',
        progress: 90,
        message: 'Updating local references...',
      });

      // 7. Update local paths in database
      await this.updateLocalPaths(parsedPackage.manifest);

      // 8. Mark as available offline
      await this.markAsOfflineAvailable(parsedPackage.manifest);

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Import completed successfully',
      });

      return {
        success: true,
        packageId: parsedPackage.manifest.packageId,
        manifest: parsedPackage.manifest,
        importedAt: new Date().toISOString(),
      };
    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  private async parsePackage(buffer: Buffer): Promise<ParsedPackage> {
    // Validate minimum size
    if (buffer.length < 64) {
      throw new Error('Invalid package: file too small');
    }

    // Read header
    const magic = buffer.toString('utf8', 0, 8);
    if (magic !== 'BIBLE001') {
      throw new Error('Invalid package: incorrect magic bytes');
    }

    const formatVersion = buffer.readUInt32LE(8);
    const packageType = buffer.readUInt32LE(12);
    const manifestSize = buffer.readUInt32LE(16);
    const databaseSize = buffer.readUInt32LE(20);
    const audioDataSize = buffer.readUInt32LE(28);
    const checksum = buffer.slice(36, 68);

    // Validate header values
    if (formatVersion !== 1) {
      throw new Error(`Unsupported package format version: ${formatVersion}`);
    }

    if (manifestSize > 1024 * 1024) {
      // 1MB max for manifest
      throw new Error('Invalid package: manifest too large');
    }

    // Extract components
    let offset = 64;

    // Manifest
    if (offset + manifestSize > buffer.length) {
      throw new Error('Invalid package: manifest extends beyond file');
    }
    const manifestBuffer = buffer.slice(offset, offset + manifestSize);
    const manifest = JSON.parse(manifestBuffer.toString('utf8'));
    offset += manifestSize;

    // Database
    if (offset + databaseSize > buffer.length) {
      throw new Error('Invalid package: database extends beyond file');
    }
    const database = buffer.slice(offset, offset + databaseSize);
    offset += databaseSize;

    // Audio data (if present)
    let audioData: Buffer | null = null;
    if (audioDataSize > 0) {
      if (offset + audioDataSize > buffer.length) {
        throw new Error('Invalid package: audio data extends beyond file');
      }
      audioData = buffer.slice(offset, offset + audioDataSize);
    }

    // Verify checksum
    const contentBuffer = Buffer.concat([
      manifestBuffer,
      database,
      audioData || Buffer.alloc(0),
    ]);
    const calculatedChecksum = this.calculateSHA256Buffer(contentBuffer);

    if (!checksum.equals(calculatedChecksum)) {
      throw new Error(
        'Invalid package: checksum mismatch - file may be corrupted'
      );
    }

    return {
      header: {
        magic,
        formatVersion,
        packageType,
        manifestSize,
        databaseSize,
        audioDataSize,
        checksum,
      },
      manifest,
      database,
      audioData,
    };
  }

  private async validatePackage(
    parsedPackage: ParsedPackage
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate manifest structure
      if (!parsedPackage.manifest.packageId) {
        errors.push('Missing package ID');
      }

      if (!parsedPackage.manifest.languageEntityId) {
        errors.push('Missing language entity ID');
      }

      // Validate compatibility
      const currentAppVersion = await this.getCurrentAppVersion();
      if (
        !this.isVersionCompatible(
          parsedPackage.manifest.minAppVersion,
          currentAppVersion
        )
      ) {
        errors.push(
          `Package requires app version ${parsedPackage.manifest.minAppVersion} or higher. Current version: ${currentAppVersion}`
        );
      }

      // Check for conflicts
      const conflicts = await this.checkPackageConflicts(
        parsedPackage.manifest
      );
      if (conflicts.length > 0) {
        warnings.push(`This package conflicts with: ${conflicts.join(', ')}`);
      }

      // Validate audio file index consistency
      if (parsedPackage.audioData && parsedPackage.manifest.audioFileIndex) {
        for (const fileEntry of parsedPackage.manifest.audioFileIndex) {
          if (
            fileEntry.offset + fileEntry.size >
            parsedPackage.audioData.length
          ) {
            errors.push(`Audio file index inconsistent: ${fileEntry.fileName}`);
          }
        }
      }

      // Validate verse IDs format
      if (parsedPackage.manifest.audioFileIndex) {
        for (const fileEntry of parsedPackage.manifest.audioFileIndex) {
          if (
            !this.isValidOSISVerseId(fileEntry.startVerseId) ||
            !this.isValidOSISVerseId(fileEntry.endVerseId)
          ) {
            errors.push(
              `Invalid verse ID format in audio file: ${fileEntry.fileName}`
            );
          }
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      packageInfo: parsedPackage.manifest,
    };
  }

  private async extractAudioFiles(
    audioData: Buffer,
    manifest: BiblePackageManifest
  ): Promise<void> {
    if (!manifest.audioFileIndex) return;

    const audioDir = `${RNFS.DocumentDirectoryPath}/bible-audio/${manifest.packageId}`;
    await RNFS.mkdir(audioDir);

    for (const audioFile of manifest.audioFileIndex) {
      try {
        // Extract file from audio data
        const fileBuffer = audioData.slice(
          audioFile.offset,
          audioFile.offset + audioFile.size
        );

        // Save to local storage
        const localPath = `${audioDir}/${audioFile.fileName}`;
        await RNFS.writeFile(
          localPath,
          fileBuffer.toString('base64'),
          'base64'
        );

        // Update database with local path
        await this.updateMediaFileLocalPath(audioFile.mediaFileId, localPath);
      } catch (error) {
        console.warn(
          `Failed to extract audio file: ${audioFile.fileName}`,
          error
        );
        // Continue with other files - allow partial imports
      }
    }
  }

  // Helper methods
  private async queryDatabase(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            resolve(rows);
          },
          (_, error) => {
            reject(error);
          }
        );
      });
    });
  }

  private async executeSql(
    db: SQLite.Database,
    sql: string,
    params: any[] = []
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  private calculateSHA256(buffer: Buffer): string {
    return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(buffer)).toString();
  }

  private calculateSHA256Buffer(buffer: Buffer): Buffer {
    const hash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(buffer));
    return Buffer.from(hash.toString(), 'hex');
  }

  private async cleanup(): Promise<void> {
    try {
      // Clean up temporary files
      const tempFiles = await RNFS.readdir(this.tempDir);
      for (const file of tempFiles) {
        await RNFS.unlink(`${this.tempDir}/${file}`);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

### 2. Bible Package Sharing Service

```typescript
// src/services/BiblePackageSharingService.ts

import RNShare from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { BiblePackageService } from './BiblePackageService';

interface SharingOptions {
  title?: string;
  message?: string;
  excludedActivityTypes?: string[];
}

export class BiblePackageSharingService {
  private packageService: BiblePackageService;

  constructor(packageService: BiblePackageService) {
    this.packageService = packageService;
  }

  async shareAudioVersion(
    audioVersionId: string,
    options: SharingOptions = {},
    onProgress?: (progress: any) => void
  ): Promise<void> {
    try {
      // Get version info for sharing context
      const versionInfo = await this.getVersionInfo(audioVersionId, 'audio');

      // Create package
      const packagePath = await this.packageService.exportAudioVersion(
        audioVersionId,
        {},
        onProgress
      );

      // Share package
      await this.sharePackageFile(packagePath, {
        title: options.title || `Share ${versionInfo.name} Bible Audio`,
        message: options.message || `Bible audio version: ${versionInfo.name}`,
        excludedActivityTypes: options.excludedActivityTypes,
      });
    } catch (error) {
      throw new Error(`Sharing failed: ${error.message}`);
    }
  }

  async shareTextVersion(
    textVersionId: string,
    options: SharingOptions = {},
    onProgress?: (progress: any) => void
  ): Promise<void> {
    try {
      // Get version info for sharing context
      const versionInfo = await this.getVersionInfo(textVersionId, 'text');

      // Create package
      const packagePath = await this.packageService.exportTextVersion(
        textVersionId,
        onProgress
      );

      // Share package
      await this.sharePackageFile(packagePath, {
        title: options.title || `Share ${versionInfo.name} Bible Text`,
        message: options.message || `Bible text version: ${versionInfo.name}`,
        excludedActivityTypes: options.excludedActivityTypes,
      });
    } catch (error) {
      throw new Error(`Sharing failed: ${error.message}`);
    }
  }

  private async sharePackageFile(
    packagePath: string,
    options: SharingOptions
  ): Promise<void> {
    const shareOptions = {
      title: options.title || 'Share Bible Package',
      message: options.message || 'Bible package for offline reading',
      url: `file://${packagePath}`,
      type: 'application/octet-stream',
      filename: packagePath.split('/').pop(),
      excludedActivityTypes: options.excludedActivityTypes || [],
    };

    await RNShare.open(shareOptions);
  }

  async selectAndImportPackage(
    onProgress?: (progress: any) => void
  ): Promise<void> {
    try {
      // Let user pick a .bible file
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const file = result[0];

        // Validate file extension
        if (!file.name?.endsWith('.bible')) {
          throw new Error('Please select a .bible package file');
        }

        // Import the package
        const importResult = await this.packageService.importPackage(
          file.fileCopyUri || file.uri,
          onProgress
        );

        if (!importResult.success) {
          throw new Error(importResult.errors?.join(', ') || 'Import failed');
        }

        return importResult;
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled - not an error
        return;
      }
      throw error;
    }
  }

  private async getVersionInfo(
    versionId: string,
    type: 'audio' | 'text'
  ): Promise<any> {
    // Query database for version info
    const table = type === 'audio' ? 'audio_versions' : 'text_versions';
    const versions = await this.packageService.queryDatabase(
      `
      SELECT * FROM ${table} WHERE id = ?
    `,
      [versionId]
    );

    if (versions.length === 0) {
      throw new Error(`${type} version not found: ${versionId}`);
    }

    return versions[0];
  }
}
```

### 3. Auto-Import & File Association Handler

```typescript
// src/services/FileAssociationHandler.ts

import { Linking, Alert } from 'react-native';
import { BiblePackageService } from './BiblePackageService';

export class FileAssociationHandler {
  private packageService: BiblePackageService;
  private isProcessingFile = false;

  constructor(packageService: BiblePackageService) {
    this.packageService = packageService;
  }

  initialize(): void {
    // Listen for incoming URLs (file associations)
    Linking.addEventListener('url', this.handleIncomingURL);

    // Check for launch URL (if app was opened via file)
    Linking.getInitialURL().then(url => {
      if (url) {
        this.handleIncomingURL({ url });
      }
    });
  }

  private handleIncomingURL = async ({
    url,
  }: {
    url: string;
  }): Promise<void> => {
    try {
      if (this.isProcessingFile) {
        Alert.alert(
          'Import In Progress',
          'Please wait for the current import to complete.'
        );
        return;
      }

      if (this.isBiblePackageFile(url)) {
        await this.handleBiblePackageImport(url);
      }
    } catch (error) {
      Alert.alert('Import Error', error.message);
    }
  };

  private isBiblePackageFile(url: string): boolean {
    return url.toLowerCase().includes('.bible');
  }

  private async handleBiblePackageImport(fileUrl: string): Promise<void> {
    this.isProcessingFile = true;

    try {
      // Show import confirmation dialog
      const shouldImport = await this.showImportConfirmation(fileUrl);
      if (!shouldImport) {
        return;
      }

      // Import with progress
      let progressModal: any = null;

      const result = await this.packageService.importPackage(
        fileUrl,
        progress => {
          if (!progressModal) {
            progressModal = this.showProgressModal();
          }
          progressModal.updateProgress(progress);
        }
      );

      if (progressModal) {
        progressModal.close();
      }

      if (result.success) {
        Alert.alert(
          'Import Successful',
          `Bible package "${result.manifest?.packageId}" has been imported successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to imported content or refresh library
                this.navigateToImportedContent(result.manifest);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Import Failed',
          result.errors?.join('\n') || 'Unknown error occurred during import.'
        );
      }
    } finally {
      this.isProcessingFile = false;
    }
  }

  private async showImportConfirmation(fileUrl: string): Promise<boolean> {
    return new Promise(resolve => {
      Alert.alert(
        'Import Bible Package',
        'Do you want to import this Bible package?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Import',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  private showProgressModal(): any {
    // Return progress modal implementation
    // This would integrate with your app's modal/progress component
    return {
      updateProgress: (progress: any) => {
        // Update progress UI
      },
      close: () => {
        // Close progress modal
      },
    };
  }

  private navigateToImportedContent(manifest?: any): void {
    // Navigate to the imported content in your app
    // This depends on your navigation structure
  }

  cleanup(): void {
    Linking.removeAllListeners('url');
  }
}
```

### 4. Sync Service (Post-Import)

```typescript
// src/services/BibleSyncService.ts

import NetInfo from '@react-native-netinfo/netinfo';
import { BiblePackageService } from './BiblePackageService';

interface SyncResult {
  success: boolean;
  action: 'up_to_date' | 'incremental_sync' | 'full_sync' | 'upload';
  changesApplied?: number;
  error?: string;
}

export class BibleSyncService {
  private packageService: BiblePackageService;
  private isCurrentlySyncing = false;
  private syncQueue: string[] = [];

  constructor(packageService: BiblePackageService) {
    this.packageService = packageService;
    this.initializeNetworkListener();
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (
        state.isConnected &&
        !this.isCurrentlySyncing &&
        this.syncQueue.length > 0
      ) {
        this.processSyncQueue();
      }
    });
  }

  async syncAfterImport(packageId: string): Promise<SyncResult> {
    try {
      // Check if network is available
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        // Add to sync queue for when network becomes available
        this.addToSyncQueue(packageId);
        return {
          success: false,
          action: 'up_to_date',
          error: 'No network available - queued for sync when online',
        };
      }

      return await this.performSync(packageId);
    } catch (error) {
      return {
        success: false,
        action: 'up_to_date',
        error: error.message,
      };
    }
  }

  private async performSync(packageId: string): Promise<SyncResult> {
    this.isCurrentlySyncing = true;

    try {
      // Get local package info
      const localPackage = await this.getLocalPackageInfo(packageId);
      if (!localPackage) {
        throw new Error(`Local package not found: ${packageId}`);
      }

      // Check server for updates
      const serverVersion = await this.checkServerVersion(localPackage);
      if (!serverVersion) {
        // Package doesn't exist on server - this is fine for shared packages
        return { success: true, action: 'up_to_date' };
      }

      // Determine sync strategy
      const syncStrategy = this.determineSyncStrategy(
        localPackage,
        serverVersion
      );

      switch (syncStrategy) {
        case 'no_sync_needed':
          return { success: true, action: 'up_to_date' };

        case 'incremental_update':
          return await this.performIncrementalSync(localPackage, serverVersion);

        case 'full_redownload':
          return await this.performFullSync(localPackage, serverVersion);

        default:
          return { success: true, action: 'up_to_date' };
      }
    } finally {
      this.isCurrentlySyncing = false;
    }
  }

  private async performIncrementalSync(
    localPackage: any,
    serverVersion: any
  ): Promise<SyncResult> {
    let changesApplied = 0;

    try {
      // Get list of records that have changed
      const changes = await this.getChangesSinceLastSync(localPackage);

      for (const change of changes) {
        switch (change.table) {
          case 'media_files':
            await this.syncMediaFile(change);
            changesApplied++;
            break;

          case 'verse_texts':
            await this.syncVerseText(change);
            changesApplied++;
            break;

          case 'media_files_verses':
            await this.syncVerseTimings(change);
            changesApplied++;
            break;

          // Add other table sync handlers as needed
        }
      }

      // Update local sync timestamp
      await this.updateLastSyncTime(localPackage.packageId);

      return {
        success: true,
        action: 'incremental_sync',
        changesApplied,
      };
    } catch (error) {
      return {
        success: false,
        action: 'incremental_sync',
        error: error.message,
      };
    }
  }

  private async getChangesSinceLastSync(localPackage: any): Promise<any[]> {
    const lastSyncTime =
      localPackage.last_synced_at || localPackage.imported_at;

    // Query server for changes since last sync
    const response = await fetch(`${this.getApiBaseUrl()}/sync/changes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await this.getAuthToken(),
      },
      body: JSON.stringify({
        packageId: localPackage.packageId,
        since: lastSyncTime,
        packageType: localPackage.package_type,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get changes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.changes || [];
  }

  private async syncMediaFile(change: any): Promise<void> {
    // Download updated media file if needed
    if (change.operation === 'update' || change.operation === 'insert') {
      const mediaFile = change.record;

      // Check if we need to download the actual audio file
      if (mediaFile.remote_path && !mediaFile.local_path) {
        const downloadUrl = await this.getDownloadUrl(mediaFile.remote_path);
        const localPath = await this.downloadAudioFile(
          downloadUrl,
          mediaFile.id
        );
        mediaFile.local_path = localPath;
      }

      // Update or insert in local database
      await this.upsertLocalRecord('media_files', mediaFile);
    } else if (change.operation === 'delete') {
      // Delete from local database and remove local file
      await this.deleteLocalRecord('media_files', change.record.id);
      if (change.record.local_path) {
        await this.deleteLocalFile(change.record.local_path);
      }
    }
  }

  private async addToSyncQueue(packageId: string): Promise<void> {
    if (!this.syncQueue.includes(packageId)) {
      this.syncQueue.push(packageId);

      // Update local package status
      await this.updatePackageSyncStatus(packageId, 'pending');
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isCurrentlySyncing || this.syncQueue.length === 0) {
      return;
    }

    const packageId = this.syncQueue.shift();
    if (packageId) {
      try {
        const result = await this.performSync(packageId);
        await this.logSyncResult(packageId, result);
      } catch (error) {
        await this.logSyncError(packageId, error);
      }
    }

    // Process next item in queue
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  private async updatePackageSyncStatus(
    packageId: string,
    status: string
  ): Promise<void> {
    await this.packageService.queryDatabase(
      `
      UPDATE local_packages 
      SET sync_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
      [status, packageId]
    );
  }

  // Additional helper methods...
  private getApiBaseUrl(): string {
    return 'https://your-api-base-url.com'; // Replace with actual API URL
  }

  private async getAuthToken(): Promise<string> {
    // Return current user's auth token
    return 'your-auth-token';
  }
}
```

This frontend implementation provides a complete solution for Bible package handling in React Native, including export, import, sharing, and sync capabilities. The modular design allows for easy testing and maintenance while providing robust error handling and user feedback.
