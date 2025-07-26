# Backend Implementation Guide

## Overview

This guide covers the server-side implementation of the Bible package export system using Supabase Edge Functions and PostgreSQL. The backend handles package generation, download APIs, caching, and resumable downloads.

## Dependencies

### Package.json Additions

```json
{
  "dependencies": {
    "sqlite3": "^5.1.6",
    "crypto": "^1.0.1",
    "node-stream-zip": "^1.15.0"
  }
}
```

### Edge Function Dependencies

```typescript
// Import map for Deno edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { Buffer } from 'https://deno.land/std@0.177.0/node/buffer.ts';
import { ensureDir } from 'https://deno.land/std@0.177.0/fs/mod.ts';
```

## Core Classes

### 1. Bible Package Builder

```typescript
// supabase/functions/_shared/bible-package-builder.ts

interface PackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  requestedBy: string;
  includeStructure?: boolean;
}

interface BuildResult {
  packageBuffer: Uint8Array;
  manifest: BiblePackageManifest;
  sizeInBytes: number;
}

export class BiblePackageBuilder {
  private supabaseClient: any;
  private tempDir: string;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
    this.tempDir = '/tmp/bible-packages';
  }

  async build(request: PackageRequest): Promise<BuildResult> {
    try {
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
      await this.cleanup();
      throw error;
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

    // Verify versions exist and are published
    if (request.audioVersionId) {
      const audioVersion = await this.supabaseClient
        .from('audio_versions')
        .select('id, name')
        .eq('id', request.audioVersionId)
        .single();

      if (!audioVersion.data) {
        throw new Error(`Audio version not found: ${request.audioVersionId}`);
      }
    }

    if (request.textVersionId) {
      const textVersion = await this.supabaseClient
        .from('text_versions')
        .select('id, name')
        .eq('id', request.textVersionId)
        .single();

      if (!textVersion.data) {
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
    const { data: languageEntity } = await this.supabaseClient
      .from('language_entities')
      .select(
        `
        *,
        regions (*)
      `
      )
      .eq('id', request.languageEntityId)
      .single();

    data.languageEntity = languageEntity;
    data.region = languageEntity.regions;

    // Get audio version data if needed
    if (request.audioVersionId) {
      data.audioVersion = await this.getAudioVersionData(
        request.audioVersionId
      );
    }

    // Get text version data if needed
    if (request.textVersionId) {
      data.textVersion = await this.getTextVersionData(request.textVersionId);
    }

    // Get bible structure data
    data.bibleStructure = await this.getBibleStructureData(
      data.audioVersion?.bible_version_id || data.textVersion?.bible_version_id
    );

    return data;
  }

  private async getAudioVersionData(
    audioVersionId: string
  ): Promise<AudioVersionData> {
    // Get audio version
    const { data: audioVersion } = await this.supabaseClient
      .from('audio_versions')
      .select('*')
      .eq('id', audioVersionId)
      .single();

    // Get all media files for this version
    const { data: mediaFiles } = await this.supabaseClient
      .from('media_files')
      .select('*')
      .eq('audio_version_id', audioVersionId)
      .eq('publish_status', 'published')
      .order('start_verse_id');

    // Get verse timing data
    const mediaFileIds = mediaFiles.map(mf => mf.id);
    const { data: verseTimings } = await this.supabaseClient
      .from('media_files_verses')
      .select('*')
      .in('media_file_id', mediaFileIds)
      .order('start_time_seconds');

    // Get targets data (for future extensibility)
    const { data: targets } = await this.supabaseClient
      .from('media_files_targets')
      .select('*')
      .in('media_file_id', mediaFileIds);

    // Get tags
    const { data: mediaFilesTags } = await this.supabaseClient
      .from('media_files_tags')
      .select(
        `
        *,
        tags (*)
      `
      )
      .in('media_file_id', mediaFileIds);

    return {
      audioVersion,
      mediaFiles,
      verseTimings,
      targets: targets || [],
      tags: mediaFilesTags ? mediaFilesTags.map(mt => mt.tags) : [],
    };
  }

  private async getTextVersionData(
    textVersionId: string
  ): Promise<TextVersionData> {
    // Get text version
    const { data: textVersion } = await this.supabaseClient
      .from('text_versions')
      .select('*')
      .eq('id', textVersionId)
      .single();

    // Get all verse texts
    const { data: verseTexts } = await this.supabaseClient
      .from('verse_texts')
      .select('*')
      .eq('text_version_id', textVersionId)
      .eq('publish_status', 'published')
      .order('verse_id');

    return {
      textVersion,
      verseTexts,
    };
  }

  private async getBibleStructureData(
    bibleVersionId: string
  ): Promise<BibleStructureData> {
    // Get bible version
    const { data: bibleVersion } = await this.supabaseClient
      .from('bible_versions')
      .select('*')
      .eq('id', bibleVersionId)
      .single();

    // Get all books
    const { data: books } = await this.supabaseClient
      .from('books')
      .select('*')
      .eq('bible_version_id', bibleVersionId)
      .order('book_number');

    // Get all chapters
    const bookIds = books.map(b => b.id);
    const { data: chapters } = await this.supabaseClient
      .from('chapters')
      .select('*')
      .in('book_id', bookIds)
      .order('book_id, chapter_number');

    // Get all verses
    const chapterIds = chapters.map(c => c.id);
    const { data: verses } = await this.supabaseClient
      .from('verses')
      .select('*')
      .in('chapter_id', chapterIds)
      .order('chapter_id, verse_number');

    return {
      bibleVersion,
      books,
      chapters,
      verses,
    };
  }

  private async createPackageDatabase(data: PackageData): Promise<Uint8Array> {
    const dbPath = `${this.tempDir}/package-${Date.now()}.sqlite`;
    await ensureDir(this.tempDir);

    // Create SQLite database
    const sqlite = await import('https://deno.land/x/sqlite@v3.7.0/mod.ts');
    const db = new sqlite.DB(dbPath);

    try {
      // Create all required tables
      await this.createPackageTables(db);

      // Insert data based on package type
      if (data.audioVersion) {
        await this.insertAudioVersionData(db, data);
      }

      if (data.textVersion) {
        await this.insertTextVersionData(db, data);
      }

      // Insert context data
      await this.insertContextData(db, data);

      // Insert bible structure
      await this.insertBibleStructureData(db, data.bibleStructure);

      db.close();

      // Read database file as buffer
      const dbBuffer = await Deno.readFile(dbPath);
      await Deno.remove(dbPath);

      return dbBuffer;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private async createPackageTables(db: any): Promise<void> {
    // Read the schema from file format specification
    const createTableStatements = [
      // Audio version tables
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

      // Media files table
      `CREATE TABLE package_media_files (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT NOT NULL,
        audio_version_id TEXT,
        project_id TEXT,
        media_type TEXT NOT NULL,
        remote_path TEXT,
        local_path TEXT,
        file_size INTEGER,
        duration_seconds REAL,
        upload_status TEXT DEFAULT 'completed',
        publish_status TEXT DEFAULT 'published',
        check_status TEXT DEFAULT 'approved',
        version INTEGER DEFAULT 1,
        start_verse_id TEXT,
        end_verse_id TEXT,
        is_bible_audio BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        created_by TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )`,

      // Continue with all tables from format specification...
      // (Include all CREATE TABLE statements from 02-bible-package-format.md)
    ];

    for (const statement of createTableStatements) {
      db.query(statement);
    }
  }

  private async prepareAudioData(
    data: PackageData
  ): Promise<Uint8Array | null> {
    if (!data.audioVersion) return null;

    const audioBuffers: Uint8Array[] = [];
    const audioIndex: AudioFileEntry[] = [];
    let currentOffset = 0;

    // Download each audio file and build index
    for (const mediaFile of data.audioVersion.mediaFiles) {
      if (mediaFile.remote_path) {
        try {
          // Download file from B2/storage
          const audioBuffer = await this.downloadAudioFile(
            mediaFile.remote_path
          );

          // Add to index
          audioIndex.push({
            fileName: this.extractFileName(mediaFile.remote_path),
            mediaFileId: mediaFile.id,
            offset: currentOffset,
            size: audioBuffer.length,
            startVerseId: mediaFile.start_verse_id,
            endVerseId: mediaFile.end_verse_id,
            duration: mediaFile.duration_seconds,
            format: this.getAudioFormat(mediaFile.remote_path),
            hasVerseTimings: data.audioVersion.verseTimings.some(
              vt => vt.media_file_id === mediaFile.id
            ),
            verseCount: data.audioVersion.verseTimings.filter(
              vt => vt.media_file_id === mediaFile.id
            ).length,
          });

          audioBuffers.push(audioBuffer);
          currentOffset += audioBuffer.length;
        } catch (error) {
          console.warn(
            `Failed to download audio file: ${mediaFile.remote_path}`,
            error
          );
          // Continue with other files - allow partial packages
        }
      }
    }

    // Store audio index for manifest
    data.audioFileIndex = audioIndex;

    // Concatenate all audio data
    return audioBuffers.length > 0
      ? this.concatenateBuffers(audioBuffers)
      : null;
  }

  private async downloadAudioFile(remotePath: string): Promise<Uint8Array> {
    // Extract filename from remote path for B2 download
    const fileName = remotePath.split('/').pop();
    if (!fileName) throw new Error(`Invalid remote path: ${remotePath}`);

    // Use existing B2StorageService
    const b2Service = new (
      await import('../_shared/b2-storage-service.ts')
    ).B2StorageService();
    const fileData = await b2Service.downloadFileFromPrivateBucket(fileName);

    return new Uint8Array(fileData.data);
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
      bibleVersionId: data.bibleStructure.bibleVersion.id,
      audioVersionId: data.audioVersion?.audioVersion.id,
      textVersionId: data.textVersion?.textVersion.id,

      estimatedSizeMB:
        Math.round(
          ((databaseBuffer.length + (audioBuffer?.length || 0)) / 1024 / 1024) *
            100
        ) / 100,
      totalFiles: data.audioFileIndex?.length || 0,
      audioFormat: data.audioFileIndex?.[0]?.format as 'mp3' | 'm4a',
      includesVerseTimings: data.audioVersion?.verseTimings.length > 0,
      includesTotalVerses: data.textVersion?.verseTexts.length || 0,
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
          audioBuffer || new Uint8Array(),
        ])
      ),

      bibleStructure: {
        totalBooks: data.bibleStructure.books.length,
        totalChapters: data.bibleStructure.chapters.length,
        totalVerses: data.bibleStructure.verses.length,
        testament: this.determineTestament(data.bibleStructure.books),
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

    // Create header
    const header = new ArrayBuffer(64);
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
    const audioSize = audioBuffer?.length || 0;
    headerView.setUint32(28, audioSize, true);
    headerView.setUint32(32, 0, true); // high 32 bits

    // Calculate checksum of content (everything after header)
    const contentBuffer = this.concatenateBuffers([
      manifestBuffer,
      databaseBuffer,
      audioBuffer || new Uint8Array(),
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
      audioBuffer || new Uint8Array(),
    ]);
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

  private async cleanup(): Promise<void> {
    try {
      // Clean up any temporary files
      await Deno.remove(this.tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

## 2. Edge Functions

### Create Package Function

```typescript
// supabase/functions/create-bible-package/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/request-parser.ts';

interface CreatePackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request
    const request: CreatePackageRequest = await req.json();

    // Build package
    const builder = new BiblePackageBuilder(supabaseClient);
    const result = await builder.build({
      ...request,
      requestedBy: user.id,
    });

    // Return package
    const filename = `${request.packageType}-${Date.now()}.bible`;

    return new Response(result.packageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.sizeInBytes.toString(),
        'X-Package-Size-MB': (result.sizeInBytes / 1024 / 1024).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Package creation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Package creation failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Download Package Function

```typescript
// supabase/functions/download-bible-package/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { BiblePackageBuilder } from '../_shared/bible-package-builder.ts';
import { corsHeaders } from '../_shared/request-parser.ts';

interface DownloadRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
}

// Simple in-memory cache (in production, use Redis or similar)
const packageCache = new Map<
  string,
  {
    buffer: Uint8Array;
    timestamp: number;
    manifest: any;
  }
>();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const packageType = url.searchParams.get('packageType');
    const audioVersionId = url.searchParams.get('audioVersionId');
    const textVersionId = url.searchParams.get('textVersionId');
    const languageEntityId = url.searchParams.get('languageEntityId');

    if (!packageType || !languageEntityId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate cache key
    const cacheKey = `${packageType}-${audioVersionId || 'none'}-${textVersionId || 'none'}-${languageEntityId}`;

    // Check cache
    const cached = packageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Serving from cache:', cacheKey);

      return new Response(cached.buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${cached.manifest.packageId}.bible"`,
          'Content-Length': cached.buffer.length.toString(),
          'X-Served-From': 'cache',
        },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Build package
    const builder = new BiblePackageBuilder(supabaseClient);
    const result = await builder.build({
      packageType: packageType as any,
      audioVersionId,
      textVersionId,
      languageEntityId,
      requestedBy: 'system',
    });

    // Cache the result
    packageCache.set(cacheKey, {
      buffer: result.packageBuffer,
      timestamp: Date.now(),
      manifest: result.manifest,
    });

    // Clean old cache entries
    this.cleanCache();

    return new Response(result.packageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.manifest.packageId}.bible"`,
        'Content-Length': result.sizeInBytes.toString(),
        'X-Served-From': 'generated',
      },
    });
  } catch (error) {
    console.error('Package download error:', error);

    return new Response(
      JSON.stringify({
        error: 'Package download failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of packageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      packageCache.delete(key);
    }
  }
}
```

## 3. Package Caching Strategy

### Cache Implementation

```typescript
// supabase/functions/_shared/package-cache.ts

interface CacheEntry {
  buffer: Uint8Array;
  manifest: BiblePackageManifest;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class PackageCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_SIZE = 10; // Max cached packages

  generateCacheKey(request: {
    packageType: string;
    audioVersionId?: string;
    textVersionId?: string;
    languageEntityId: string;
  }): string {
    return `${request.packageType}-${request.audioVersionId || 'none'}-${request.textVersionId || 'none'}-${request.languageEntityId}`;
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.createdAt > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry;
  }

  set(key: string, buffer: Uint8Array, manifest: BiblePackageManifest): void {
    // Evict old entries if at max size
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      buffer,
      manifest,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    });
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}
```

## 4. Database Queries

### Optimized Queries for Package Data

```typescript
// supabase/functions/_shared/package-queries.ts

export class PackageQueries {
  constructor(private supabaseClient: any) {}

  async getAudioVersionWithAllData(audioVersionId: string) {
    // Single query to get all audio version data
    const { data, error } = await this.supabaseClient.rpc(
      'get_audio_version_package_data',
      {
        audio_version_id: audioVersionId,
      }
    );

    if (error)
      throw new Error(`Failed to get audio version data: ${error.message}`);
    return data;
  }

  async getTextVersionWithAllData(textVersionId: string) {
    // Single query to get all text version data
    const { data, error } = await this.supabaseClient.rpc(
      'get_text_version_package_data',
      {
        text_version_id: textVersionId,
      }
    );

    if (error)
      throw new Error(`Failed to get text version data: ${error.message}`);
    return data;
  }
}
```

### Database Functions (PostgreSQL)

```sql
-- Create function to get audio version package data
CREATE OR REPLACE FUNCTION get_audio_version_package_data(audio_version_id UUID)
RETURNS TABLE (
  audio_version JSON,
  media_files JSON,
  verse_timings JSON,
  targets JSON,
  tags JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_json(av) as audio_version,
    COALESCE(json_agg(DISTINCT mf) FILTER (WHERE mf.id IS NOT NULL), '[]'::json) as media_files,
    COALESCE(json_agg(DISTINCT mfv) FILTER (WHERE mfv.id IS NOT NULL), '[]'::json) as verse_timings,
    COALESCE(json_agg(DISTINCT mft) FILTER (WHERE mft.id IS NOT NULL), '[]'::json) as targets,
    COALESCE(json_agg(DISTINCT t) FILTER (WHERE t.id IS NOT NULL), '[]'::json) as tags
  FROM audio_versions av
  LEFT JOIN media_files mf ON mf.audio_version_id = av.id AND mf.publish_status = 'published'
  LEFT JOIN media_files_verses mfv ON mfv.media_file_id = mf.id
  LEFT JOIN media_files_targets mft ON mft.media_file_id = mf.id
  LEFT JOIN media_files_tags mftag ON mftag.media_file_id = mf.id
  LEFT JOIN tags t ON t.id = mftag.tag_id
  WHERE av.id = audio_version_id
  GROUP BY av.id, av.name, av.language_entity_id, av.bible_version_id, av.project_id, av.created_at, av.created_by, av.updated_at, av.deleted_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to get text version package data
CREATE OR REPLACE FUNCTION get_text_version_package_data(text_version_id UUID)
RETURNS TABLE (
  text_version JSON,
  verse_texts JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_json(tv) as text_version,
    COALESCE(json_agg(vt) FILTER (WHERE vt.id IS NOT NULL), '[]'::json) as verse_texts
  FROM text_versions tv
  LEFT JOIN verse_texts vt ON vt.text_version_id = tv.id AND vt.publish_status = 'published'
  WHERE tv.id = text_version_id
  GROUP BY tv.id, tv.language_entity_id, tv.bible_version_id, tv.project_id, tv.name, tv.text_version_source, tv.created_at, tv.created_by, tv.updated_at, tv.deleted_at;
END;
$$ LANGUAGE plpgsql;
```

## 5. Performance Optimizations

### Streaming for Large Packages

```typescript
// For very large packages, implement streaming
export class StreamingPackageBuilder extends BiblePackageBuilder {
  async buildStreaming(request: PackageRequest): Promise<ReadableStream> {
    return new ReadableStream({
      async start(controller) {
        try {
          // Build header and manifest first
          const manifest = await this.createManifestOnly(request);
          const manifestBuffer = new TextEncoder().encode(
            JSON.stringify(manifest)
          );

          // Send header
          const header = this.createHeader(manifestBuffer.length, 0, 0); // Will update sizes later
          controller.enqueue(header);

          // Send manifest
          controller.enqueue(manifestBuffer);

          // Stream database
          const dbStream = await this.createDatabaseStream(request);
          for await (const chunk of dbStream) {
            controller.enqueue(chunk);
          }

          // Stream audio files
          const audioStream = await this.createAudioStream(request);
          for await (const chunk of audioStream) {
            controller.enqueue(chunk);
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}
```

## 6. Error Handling & Monitoring

### Error Logging

```typescript
// supabase/functions/_shared/package-logger.ts

export class PackageLogger {
  static async logPackageCreation(
    packageType: string,
    success: boolean,
    sizeInBytes?: number,
    error?: string,
    userId?: string
  ) {
    // Log to analytics system
    await fetch('https://your-analytics-endpoint.com/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'package_creation',
        packageType,
        success,
        sizeInMB: sizeInBytes
          ? Math.round((sizeInBytes / 1024 / 1024) * 100) / 100
          : undefined,
        error,
        userId,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  static async logPackageDownload(
    packageId: string,
    sizeInBytes: number,
    servedFromCache: boolean
  ) {
    await fetch('https://your-analytics-endpoint.com/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'package_download',
        packageId,
        sizeInMB: Math.round((sizeInBytes / 1024 / 1024) * 100) / 100,
        servedFromCache,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

This backend implementation provides a robust, scalable foundation for the Bible package system with proper error handling, caching, and performance optimization.
