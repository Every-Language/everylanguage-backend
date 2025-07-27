import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { B2StorageService } from './b2-storage-service.ts';
import { B2Utils } from './b2-utils.ts';
import { PackageQueries } from './package-queries.ts';
import {
  PackageRequest,
  BuildResult,
  BiblePackageManifest,
  PackageType,
  AudioFileEntry,
  PackageData,
} from './bible-package-types.ts';

export class BiblePackageBuilder {
  private queries: PackageQueries;
  private b2Service: B2StorageService;

  constructor(private supabaseClient: any) {
    this.queries = new PackageQueries(supabaseClient);
    this.b2Service = new B2StorageService();
  }

  async build(request: PackageRequest): Promise<BuildResult> {
    try {
      console.log(`🔨 Starting package build for: ${JSON.stringify(request)}`);

      // 1. Validate request
      await this.validateRequest(request);

      // 2. Gather all data from database
      const packageData = await this.gatherPackageData(request);

      // 3. Create package database
      const databaseBuffer = await this.createPackageDatabase(packageData);

      // 4. Prepare audio data (if audio package)
      const audioBuffer = await this.prepareAudioData(packageData);

      // 5. Create manifest
      const manifest = this.createManifest(
        packageData,
        databaseBuffer,
        audioBuffer
      );

      // 6. Assemble final package
      const packageBuffer = this.assemblePackage(
        manifest,
        databaseBuffer,
        audioBuffer
      );

      return {
        packageBuffer,
        manifest,
        sizeInBytes: packageBuffer.length,
      };
    } catch (error) {
      throw new Error(`Package build failed: ${error.message}`);
    }
  }

  private async validateRequest(request: PackageRequest): Promise<void> {
    // Validate package type
    if (!['audio', 'text', 'combined'].includes(request.packageType)) {
      throw new Error(`Invalid package type: ${request.packageType}`);
    }

    // Validate required IDs based on type
    if (
      (request.packageType === 'audio' || request.packageType === 'combined') &&
      !request.audioVersionId
    ) {
      throw new Error('Audio version ID required for audio packages');
    }

    if (
      (request.packageType === 'text' || request.packageType === 'combined') &&
      !request.textVersionId
    ) {
      throw new Error('Text version ID required for text packages');
    }

    // Verify language entity exists
    if (
      !(await this.queries.validateLanguageEntityExists(
        request.languageEntityId
      ))
    ) {
      throw new Error(`Language entity not found: ${request.languageEntityId}`);
    }

    // Verify versions exist
    if (request.audioVersionId) {
      if (
        !(await this.queries.validateAudioVersionExists(request.audioVersionId))
      ) {
        throw new Error(`Audio version not found: ${request.audioVersionId}`);
      }
    }

    if (request.textVersionId) {
      if (
        !(await this.queries.validateTextVersionExists(request.textVersionId))
      ) {
        throw new Error(`Text version not found: ${request.textVersionId}`);
      }
    }
  }

  private async gatherPackageData(
    request: PackageRequest
  ): Promise<PackageData> {
    const data: PackageData = {
      packageType: request.packageType,
      languageEntityId: request.languageEntityId,
      requestedBy: request.requestedBy,
    };

    // Get language entity and region
    const { languageEntity, region } =
      await this.queries.getLanguageEntityWithRegion(request.languageEntityId);
    data.languageEntity = languageEntity;
    data.region = region;

    // Get audio version data if needed
    if (request.audioVersionId) {
      console.log(`🎵 Fetching audio version: ${request.audioVersionId}`);
      data.audioVersion = await this.queries.getAudioVersionWithAllData(
        request.audioVersionId
      );
      console.log(
        `🎵 Audio version fetched: ${data.audioVersion?.mediaFiles?.length || 0} media files`
      );
    }

    // Get text version data if needed
    if (request.textVersionId) {
      data.textVersion = await this.queries.getTextVersionWithAllData(
        request.textVersionId
      );
    }

    // Get bible structure data
    const bibleVersionId =
      data.audioVersion?.audioVersion.bible_version_id ??
      data.textVersion?.textVersion.bible_version_id;

    if (!bibleVersionId) {
      throw new Error('No bible version ID found in audio or text version');
    }

    data.bibleStructure =
      await this.queries.getBibleStructureData(bibleVersionId);

    return data;
  }

  private async createPackageDatabase(data: PackageData): Promise<Uint8Array> {
    // For now, create a minimal SQLite database
    // In a full implementation, you would use a proper SQLite library
    // This is a placeholder that creates the basic structure

    // Future: SQL statements for proper SQLite database creation
    // const sqlStatements = this.generatePackageSqlStatements(data);

    // Create minimal SQLite file structure
    const sqliteHeader = new Uint8Array([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
      0x74, 0x20, 0x33, 0x00,
    ]);

    // For demo purposes, just return header + JSON data
    const jsonData = new TextEncoder().encode(
      JSON.stringify({
        audioVersion: data.audioVersion?.audioVersion,
        textVersion: data.textVersion?.textVersion,
        mediaFiles: data.audioVersion?.mediaFiles ?? [],
        verseTexts: data.textVersion?.verseTexts ?? [],
        verseTimings: data.audioVersion?.verseTimings ?? [],
        bibleStructure: data.bibleStructure,
        languageEntity: data.languageEntity,
      })
    );

    const combined = new Uint8Array(sqliteHeader.length + jsonData.length);
    combined.set(sqliteHeader);
    combined.set(jsonData, sqliteHeader.length);

    return combined;
  }

  private generatePackageSqlStatements(_data: PackageData): string[] {
    const statements: string[] = [];

    // Create table statements (from format specification)
    statements.push(`
      CREATE TABLE package_audio_versions (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT NOT NULL,
        bible_version_id TEXT NOT NULL,
        project_id TEXT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `);

    // Add more CREATE TABLE statements as needed...

    return statements;
  }

  private async prepareAudioData(
    data: PackageData
  ): Promise<Uint8Array | null> {
    if (!data.audioVersion) return null;

    const audioBuffers: Uint8Array[] = [];
    const audioIndex: AudioFileEntry[] = [];
    let currentOffset = 0;

    // Process audio files with smart batching for large sets
    const totalFiles = data.audioVersion.mediaFiles.length;
    const maxFilesPerPackage = 50; // Limit to prevent timeouts (50 files ≈ 50-500 MB)

    const limitedFiles = data.audioVersion.mediaFiles.slice(
      0,
      Math.min(maxFilesPerPackage, totalFiles)
    );
    console.log(
      `Processing ${limitedFiles.length} files out of ${totalFiles} total (max ${maxFilesPerPackage} per package)`
    );

    if (totalFiles > maxFilesPerPackage) {
      console.log(
        `⚠️ Large audio version detected (${totalFiles} files). Creating partial package. Consider implementing chunked package creation for full coverage.`
      );
    }

    for (const mediaFile of limitedFiles) {
      if (mediaFile.remote_path) {
        try {
          // Download file from B2 storage
          const audioBuffer = await this.downloadAudioFile(
            mediaFile.remote_path
          );

          if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Downloaded audio buffer is empty');
          }

          console.log(
            `✅ Successfully downloaded ${audioBuffer.length} bytes for ${mediaFile.remote_path}`
          );

          // Add to index
          audioIndex.push({
            fileName: this.extractFileName(mediaFile.remote_path),
            mediaFileId: mediaFile.id,
            offset: currentOffset,
            size: audioBuffer.length,
            startVerseId: mediaFile.start_verse_id ?? '',
            endVerseId: mediaFile.end_verse_id ?? '',
            duration: mediaFile.duration_seconds ?? 0,
            format: this.getAudioFormat(mediaFile.remote_path),
            hasVerseTimings: data.audioVersion.verseTimings.some(
              (vt: any) => vt.media_file_id === mediaFile.id
            ),
            verseCount: data.audioVersion.verseTimings.filter(
              (vt: any) => vt.media_file_id === mediaFile.id
            ).length,
          });

          audioBuffers.push(audioBuffer);
          currentOffset += audioBuffer.length;
        } catch (error) {
          console.error(
            `❌ FAILED to download audio file: ${mediaFile.remote_path}`,
            error
          );
          // FAIL FAST for debugging - don't create partial packages
          throw new Error(
            `Audio download failed for ${mediaFile.remote_path}: ${error.message}`
          );
        }
      }
    }

    // Store audio index for manifest
    data.audioFileIndex = audioIndex;

    // Log summary
    const totalAudioSize = audioBuffers.reduce(
      (sum, buf) => sum + buf.length,
      0
    );
    console.log(
      `📊 Audio processing complete: ${audioBuffers.length} files, ${(totalAudioSize / 1024 / 1024).toFixed(2)} MB total`
    );

    // Concatenate all audio data
    return audioBuffers.length > 0
      ? this.concatenateBuffers(audioBuffers)
      : null;
  }

  private async downloadAudioFile(remotePath: string): Promise<Uint8Array> {
    try {
      // Extract filename using B2Utils for proper handling
      const fileName = B2Utils.extractFileNameFromUrl(remotePath);
      if (!fileName) throw new Error(`Invalid remote path: ${remotePath}`);

      console.log(`Downloading audio file: ${fileName} from ${remotePath}`);

      const fileData =
        await this.b2Service.downloadFileFromPrivateBucket(fileName);

      console.log(
        `Downloaded ${fileData.data.byteLength} bytes for ${fileName}`
      );
      return new Uint8Array(fileData.data);
    } catch (error) {
      throw new Error(
        `Failed to download audio file ${remotePath}: ${error.message}`
      );
    }
  }

  private createManifest(
    data: PackageData,
    databaseBuffer: Uint8Array,
    audioBuffer: Uint8Array | null
  ): BiblePackageManifest {
    const packageId = this.generatePackageId(data);

    return {
      packageId,
      packageVersion: '1.0.0',
      packageType: this.getPackageTypeEnum(data.packageType),
      createdAt: new Date().toISOString(),
      createdBy: data.requestedBy,

      languageEntityId: data.languageEntityId,
      bibleVersionId: data.bibleStructure!.bibleVersion.id,
      audioVersionId: data.audioVersion?.audioVersion.id,
      textVersionId: data.textVersion?.textVersion.id,

      estimatedSizeMB:
        Math.round(
          ((databaseBuffer.length + (audioBuffer?.length ?? 0)) / 1024 / 1024) *
            100
        ) / 100,
      totalFiles: data.audioFileIndex?.length ?? 0,
      audioFormat: data.audioFileIndex?.[0]?.format as 'mp3' | 'm4a',
      includesVerseTimings: (data.audioVersion?.verseTimings?.length ?? 0) > 0,
      includesTotalVerses: data.textVersion?.verseTexts?.length ?? 0,
      includesBooks: this.getIncludedBooks(data),

      minAppVersion: '1.0.0',
      conflictsWith: [],

      audioFileIndex: data.audioFileIndex,

      databaseHash: this.calculateSHA256(databaseBuffer),
      audioDataHash: audioBuffer
        ? this.calculateSHA256(audioBuffer)
        : undefined,
      totalContentHash: this.calculateSHA256(
        this.concatenateBuffers([
          databaseBuffer,
          audioBuffer ?? new Uint8Array(),
        ])
      ),

      bibleStructure: {
        totalBooks: data.bibleStructure!.books.length,
        totalChapters: data.bibleStructure!.chapters.length,
        totalVerses: data.bibleStructure!.verses.length,
        testament: this.determineTestament(data.bibleStructure!.books),
      },
    };
  }

  private assemblePackage(
    manifest: BiblePackageManifest,
    databaseBuffer: Uint8Array,
    audioBuffer: Uint8Array | null
  ): Uint8Array {
    const manifestJson = JSON.stringify(manifest);
    const manifestBuffer = new TextEncoder().encode(manifestJson);

    // Create header (68 bytes: magic(8) + version(4) + type(4) + manifest_size(4) + db_size(8) + audio_size(8) + checksum(32))
    const header = new ArrayBuffer(68);
    const headerView = new DataView(header);

    // Magic bytes: 'BIBLE001'
    const magic = new TextEncoder().encode('BIBLE001');
    for (let i = 0; i < magic.length; i++) {
      headerView.setUint8(i, magic[i]);
    }

    // Format version (4 bytes at offset 8)
    headerView.setUint32(8, 1, true); // little endian

    // Package type (4 bytes at offset 12)
    headerView.setUint32(12, manifest.packageType, true);

    // Manifest size (4 bytes at offset 16)
    headerView.setUint32(16, manifestBuffer.length, true);

    // Database size (8 bytes at offset 20) - using two 32-bit values for 64-bit
    headerView.setUint32(20, databaseBuffer.length, true);
    headerView.setUint32(24, 0, true); // high 32 bits

    // Audio data size (8 bytes at offset 28)
    const audioSize = audioBuffer?.length ?? 0;
    headerView.setUint32(28, audioSize, true);
    headerView.setUint32(32, 0, true); // high 32 bits

    // Calculate checksum of content (everything after header)
    const contentBuffer = this.concatenateBuffers([
      manifestBuffer,
      databaseBuffer,
      audioBuffer ?? new Uint8Array(),
    ]);
    const checksum = this.calculateSHA256Buffer(contentBuffer);

    // Checksum (32 bytes at offset 36)
    for (let i = 0; i < checksum.length; i++) {
      headerView.setUint8(36 + i, checksum[i]);
    }

    // Assemble final package
    return this.concatenateBuffers([
      new Uint8Array(header),
      manifestBuffer,
      databaseBuffer,
      audioBuffer ?? new Uint8Array(),
    ]);
  }

  // Helper methods
  private generatePackageId(data: PackageData): string {
    const languageName =
      data.languageEntity?.name?.toLowerCase().replace(/\s+/g, '-') ??
      'unknown';
    const versionName =
      data.audioVersion?.audioVersion.name
        ?.toLowerCase()
        .replace(/\s+/g, '-') ??
      data.textVersion?.textVersion.name?.toLowerCase().replace(/\s+/g, '-') ??
      'unknown';
    const packageType = data.packageType;

    return `${versionName}-${languageName}-${packageType}-v1.0`;
  }

  private getPackageTypeEnum(packageType: string): PackageType {
    switch (packageType) {
      case 'audio':
        return PackageType.AUDIO_ONLY;
      case 'text':
        return PackageType.TEXT_ONLY;
      case 'combined':
        return PackageType.COMBINED;
      default:
        return PackageType.AUDIO_ONLY;
    }
  }

  private extractFileName(remotePath: string): string {
    return remotePath.split('/').pop() ?? 'unknown.mp3';
  }

  private getAudioFormat(remotePath: string): string {
    const extension = remotePath.split('.').pop()?.toLowerCase();
    return extension ?? 'mp3';
  }

  private getIncludedBooks(data: PackageData): string[] {
    return data.bibleStructure?.books.map((book: any) => book.id) ?? [];
  }

  private determineTestament(books: any[]): 'old' | 'new' | 'both' {
    if (books.length === 0) return 'both';

    const hasOT = books.some((book: any) => book.testament === 'old');
    const hasNT = books.some((book: any) => book.testament === 'new');

    if (hasOT && hasNT) return 'both';
    if (hasOT) return 'old';
    if (hasNT) return 'new';
    return 'both';
  }

  private calculateSHA256(data: Uint8Array): string {
    const hash = crypto.subtle.digestSync('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private calculateSHA256Buffer(data: Uint8Array): Uint8Array {
    const hash = crypto.subtle.digestSync('SHA-256', data);
    return new Uint8Array(hash);
  }

  private concatenateBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }

    return result;
  }
}
