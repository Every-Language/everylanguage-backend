# .bible Package Format Specification

## Overview

The `.bible` format is a custom binary format optimized for mobile Bible distribution. It combines a SQLite database with compressed audio files in a single, integrity-checked package.

## Binary Structure

### File Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header (64 bytes)                      │
├─────────────────────────────────────────────────────────────────┤
│                    Manifest (JSON, variable)                   │
├─────────────────────────────────────────────────────────────────┤
│                   SQLite Database (variable)                   │
├─────────────────────────────────────────────────────────────────┤
│                   Audio Data (variable)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Header Format (64 bytes)

```typescript
interface BiblePackageHeader {
  magic: Buffer; // 8 bytes: 'BIBLE001'
  formatVersion: number; // 4 bytes: 1 (current version)
  packageType: number; // 4 bytes: 1=audio, 2=text, 3=combined
  manifestSize: number; // 4 bytes: manifest JSON byte length
  databaseSize: number; // 8 bytes: SQLite database byte length
  audioDataSize: number; // 8 bytes: concatenated audio byte length
  checksum: Buffer; // 32 bytes: SHA-256 of entire content after header
  reserved: Buffer; // 4 bytes: reserved for future use
}
```

### Package Type Constants

```typescript
enum PackageType {
  AUDIO_ONLY = 1,
  TEXT_ONLY = 2,
  COMBINED = 3,
  AUDIO_CHUNK = 4, // Part of a multi-package audio series
  TEXT_CHUNK = 5, // Part of a multi-package text series
  COMBINED_CHUNK = 6, // Part of a multi-package combined series
  SERMON = 7, // Future: non-bible audio
  PODCAST = 8, // Future: podcast content
}
```

## Manifest Structure

### Base Manifest Interface

```typescript
interface BiblePackageManifest {
  // Package Identity
  packageId: string; // "niv-english-audio-v2.1"
  packageVersion: string; // "2.1.0"
  packageType: PackageType;
  createdAt: string; // ISO 8601 timestamp
  createdBy?: string; // User ID who created package

  // Content Identity
  languageEntityId: string;
  bibleVersionId: string;
  audioVersionId?: string; // For audio/combined packages
  textVersionId?: string; // For text/combined packages

  // Content Metadata
  estimatedSizeMB: number;
  totalFiles: number;
  audioFormat?: 'mp3' | 'm4a';
  includesVerseTimings: boolean;
  includesTotalVerses: number;
  includesBooks: string[]; // OSIS book IDs included

  // Compatibility & Versioning
  minAppVersion: string; // Minimum compatible app version
  conflictsWith: string[]; // Package IDs that conflict
  supersedes?: string; // Package ID this replaces

  // File Index (for audio packages)
  audioFileIndex?: AudioFileEntry[];

  // Content Hashes (for integrity)
  databaseHash: string; // SHA-256 of SQLite database
  audioDataHash?: string; // SHA-256 of concatenated audio
  totalContentHash: string; // SHA-256 of all content

  // Bible Structure Info
  bibleStructure: {
    totalBooks: number;
    totalChapters: number;
    totalVerses: number;
    testament?: 'old' | 'new' | 'both';
  };

  // Multi-Package Series Support
  seriesInfo?: {
    seriesId: string; // Unique identifier for the complete series
    seriesName: string; // Human-readable series name
    partNumber: number; // This package's position in series (1, 2, 3...)
    totalParts: number; // Total number of packages in series
    chunkingStrategy: 'size' | 'testament' | 'book_group' | 'custom';
    dependencies?: string[]; // Package IDs that must be imported first
    isComplete: boolean; // True if this package can function independently
    estimatedSeriesSizeMB: number; // Total size when all parts combined
    contentRange: {
      // What portion of Bible this package contains
      startBook: string; // OSIS book ID (e.g., "gen")
      endBook: string; // OSIS book ID (e.g., "mal")
      description: string; // Human-readable description (e.g., "Old Testament")
    };
  };
}
```

### Audio File Index Entry

```typescript
interface AudioFileEntry {
  // File identification
  fileName: string; // Original filename
  mediaFileId: string; // Database media_files.id

  // Binary location
  offset: number; // Byte offset in audio data section
  size: number; // File size in bytes
  compressedSize?: number; // If additional compression applied

  // Content mapping
  startVerseId: string; // OSIS format: "john-3-1"
  endVerseId: string; // OSIS format: "john-3-36"
  chapterId?: string; // OSIS format: "john-3"
  bookId?: string; // OSIS format: "john"

  // Audio metadata
  duration: number; // Duration in seconds
  format: string; // "mp3", "m4a", etc.
  bitrate?: number; // Audio bitrate
  sampleRate?: number; // Audio sample rate

  // Verse timing info
  hasVerseTimings: boolean;
  verseCount: number; // Number of verses in this file
}
```

## SQLite Database Schema

### Required Tables in Package Database

```sql
-- Core version information
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

CREATE TABLE package_text_versions (
  id TEXT PRIMARY KEY,
  language_entity_id TEXT NOT NULL,
  bible_version_id TEXT NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL,
  text_version_source TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Media files and content
CREATE TABLE package_media_files (
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
);

-- Verse timing data
CREATE TABLE package_media_files_verses (
  id TEXT PRIMARY KEY,
  media_file_id TEXT NOT NULL,
  verse_id TEXT NOT NULL,
  start_time_seconds REAL NOT NULL,
  duration_seconds REAL NOT NULL,
  verse_text_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (media_file_id) REFERENCES package_media_files(id)
);

-- Text content
CREATE TABLE package_verse_texts (
  id TEXT PRIMARY KEY,
  verse_id TEXT NOT NULL,
  text_version_id TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  publish_status TEXT DEFAULT 'published',
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (text_version_id) REFERENCES package_text_versions(id)
);

-- Metadata and tags
CREATE TABLE package_tags (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE package_media_files_tags (
  id TEXT PRIMARY KEY,
  media_file_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (media_file_id) REFERENCES package_media_files(id),
  FOREIGN KEY (tag_id) REFERENCES package_tags(id)
);

-- Future extensibility: targets for non-bible content
CREATE TABLE package_media_files_targets (
  id TEXT PRIMARY KEY,
  media_file_id TEXT NOT NULL,
  is_bible_audio BOOLEAN DEFAULT 1,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (media_file_id) REFERENCES package_media_files(id)
);

-- Context information
CREATE TABLE package_language_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iso_639_1 TEXT,
  iso_639_3 TEXT,
  region_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE package_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iso_3166_alpha2 TEXT,
  iso_3166_alpha3 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bible structure (for compatibility)
CREATE TABLE package_bible_versions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  structure_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE package_books (
  id TEXT PRIMARY KEY,          -- OSIS format: "john"
  name TEXT NOT NULL,
  book_number INTEGER NOT NULL,
  bible_version_id TEXT NOT NULL,
  testament TEXT,               -- 'old', 'new'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (bible_version_id) REFERENCES package_bible_versions(id)
);

CREATE TABLE package_chapters (
  id TEXT PRIMARY KEY,          -- OSIS format: "john-3"
  chapter_number INTEGER NOT NULL,
  book_id TEXT NOT NULL,
  total_verses INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES package_books(id)
);

CREATE TABLE package_verses (
  id TEXT PRIMARY KEY,          -- OSIS format: "john-3-16"
  chapter_id TEXT NOT NULL,
  verse_number INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES package_chapters(id)
);
```

## Audio Data Section

### Format

- Concatenated audio files in original format (typically MP3)
- No additional compression (files already compressed)
- Files stored in order of `audioFileIndex` array
- Each file's location determined by offset + size in index

### File Organization

```typescript
// Audio data is laid out as:
// [File1 bytes][File2 bytes][File3 bytes]...
//
// Where each file's location is:
const audioFile = audioData.slice(
  audioFileIndex[i].offset,
  audioFileIndex[i].offset + audioFileIndex[i].size
);
```

## Multi-Package Series Support

### Chunking Strategies

#### Size-Based Chunking

Automatically splits content to fit platform constraints:

- **WhatsApp/Messaging**: 1.8GB max per package
- **AirDrop/Android Beam**: 4.5GB max per package
- **SD Card/USB**: 1GB recommended for compatibility

#### Testament-Based Chunking

Logical division by biblical structure:

- **Old Testament Package**: Genesis through Malachi
- **New Testament Package**: Matthew through Revelation

#### Book Group Chunking

Groups books by type for balanced sizes:

- **Law & History**: Genesis through Esther
- **Wisdom & Poetry**: Job through Song of Songs
- **Prophets**: Isaiah through Malachi
- **Gospels & Acts**: Matthew through Acts
- **Epistles & Revelation**: Romans through Revelation

#### Custom Chunking

User-defined splits for specific needs:

- Individual books for granular sharing
- Custom book ranges
- Content-type specific (narratives, poetry, prophecy)

### Series Manifest Example

```typescript
// Part 1 of 2 - Old Testament
{
  packageId: "niv-english-audio-ot-v2.1",
  packageType: PackageType.AUDIO_CHUNK,
  seriesInfo: {
    seriesId: "niv-english-audio-complete-v2.1",
    seriesName: "NIV English Complete Audio Bible",
    partNumber: 1,
    totalParts: 2,
    chunkingStrategy: "testament",
    isComplete: true,
    estimatedSeriesSizeMB: 4500,
    contentRange: {
      startBook: "gen",
      endBook: "mal",
      description: "Old Testament (Genesis - Malachi)"
    }
  }
}
```

## Package Creation Process

### Server-Side Creation

1. **Gather Data**: Query Postgres for all related records
2. **Create SQLite**: Build package database with all required data
3. **Fetch Audio**: Download audio files from B2/storage
4. **Build Index**: Create audio file index with offsets
5. **Create Manifest**: Generate manifest with metadata
6. **Calculate Checksums**: Generate integrity hashes
7. **Assemble Package**: Combine header + manifest + database + audio

### Client-Side Creation

1. **Validate Local Data**: Ensure all required files exist locally
2. **Create SQLite**: Export local data to package database
3. **Gather Audio**: Read audio files from local storage
4. **Build Index**: Create audio file index with offsets
5. **Create Manifest**: Generate manifest with metadata
6. **Calculate Checksums**: Generate integrity hashes
7. **Assemble Package**: Combine header + manifest + database + audio

## Package Validation

### Integrity Checks

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  packageInfo: BiblePackageManifest;
}

// Validation steps:
1. Verify magic bytes ('BIBLE001')
2. Validate header structure
3. Parse and validate manifest JSON
4. Verify database SQLite format
5. Check audio file index consistency
6. Validate all checksums
7. Check file size consistency
8. Verify OSIS verse ID formats
```

### Compatibility Checks

- **App Version**: Ensure package compatible with current app
- **Bible Structure**: Check if app has required bible structure
- **Content Type**: Verify app supports package type
- **Storage Space**: Ensure sufficient disk space

## Error Recovery

### Corrupted Package Handling

- **Header Corruption**: Reject package immediately
- **Manifest Corruption**: Attempt to recover from database
- **Database Corruption**: Allow partial import if possible
- **Audio Corruption**: Import database, mark audio files as missing

### Partial Import Support

- Import database even if some audio files are corrupted
- Mark missing/corrupted files in local database
- Allow re-download of missing files when online
- Provide UI to show incomplete imports

This specification provides a robust, extensible format for offline Bible distribution while maintaining compatibility across different platforms and use cases.
