// Type definitions for Bible Package system

export enum PackageType {
  AUDIO_ONLY = 1,
  TEXT_ONLY = 2,
  COMBINED = 3,
  AUDIO_CHUNK = 4, // Part of a multi-package audio series
  TEXT_CHUNK = 5, // Part of a multi-package text series
  COMBINED_CHUNK = 6, // Part of a multi-package combined series
  SERMON = 7, // Future: non-bible audio
  PODCAST = 8, // Future: podcast content
}

export interface PackageRequest {
  packageType: 'audio' | 'text' | 'combined';
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId: string;
  requestedBy: string;
  includeStructure?: boolean;

  // Multi-package support
  enableChunking?: boolean; // Allow automatic splitting if needed
  maxSizeMB?: number; // Maximum size constraint (default: 2048 for AirDrop)
  chunkingStrategy?: 'size' | 'testament' | 'book_group' | 'custom';
  customChunkRange?: {
    // For custom chunking
    startBook: string; // OSIS book ID
    endBook: string; // OSIS book ID
  };
  seriesId?: string; // For creating specific part of existing series
}

export interface BiblePackageHeader {
  magic: string; // 'BIBLE001'
  formatVersion: number; // 1 (current version)
  packageType: number; // 1=audio, 2=text, 3=combined
  manifestSize: number; // manifest JSON byte length
  databaseSize: number; // SQLite database byte length
  audioDataSize: number; // concatenated audio byte length
  checksum: Uint8Array; // SHA-256 of entire content after header
  reserved: Uint8Array; // reserved for future use
}

export interface AudioFileEntry {
  fileName: string; // Original filename
  mediaFileId: string; // Database media_files.id
  offset: number; // Byte offset in audio data section
  size: number; // File size in bytes
  compressedSize?: number; // If additional compression applied
  startVerseId: string; // OSIS format: "john-3-1"
  endVerseId: string; // OSIS format: "john-3-36"
  chapterId?: string; // OSIS format: "john-3"
  bookId?: string; // OSIS format: "john"
  duration: number; // Duration in seconds
  format: string; // "mp3", "m4a", etc.
  bitrate?: number; // Audio bitrate
  sampleRate?: number; // Audio sample rate
  hasVerseTimings: boolean;
  verseCount: number; // Number of verses in this file
}

export interface BiblePackageManifest {
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

export interface BuildResult {
  packageBuffer?: Uint8Array; // Single package result
  manifest?: BiblePackageManifest; // Single package manifest
  sizeInBytes?: number; // Single package size

  // Multi-package results
  packages?: PackageResult[]; // Multiple packages if chunking was applied
  seriesInfo?: SeriesInfo; // Series metadata
}

export interface PackageResult {
  packageBuffer: Uint8Array;
  manifest: BiblePackageManifest;
  sizeInBytes: number;
  partNumber: number;
}

export interface SeriesInfo {
  seriesId: string;
  seriesName: string;
  totalParts: number;
  chunkingStrategy: string;
  estimatedTotalSizeMB: number;
}

// Chunking support interfaces
export interface ChunkingPlan {
  seriesId: string;
  seriesName: string;
  estimatedTotalSizeMB: number;
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  range: { startBook: string; endBook: string };
  description: string;
  isComplete: boolean;
  estimatedSizeMB: number;
}

export interface BookWithSize {
  osisId: string;
  name: string;
  sizeMB: number;
}

// Database record types based on your schema
export interface AudioVersionData {
  audioVersion: any;
  mediaFiles: any[];
  verseTimings: any[];
  targets: any[];
  tags: any[];
}

export interface TextVersionData {
  textVersion: any;
  verseTexts: any[];
}

export interface BibleStructureData {
  bibleVersion: any;
  books: any[];
  chapters: any[];
  verses: any[];
}

export interface PackageData {
  packageType: string;
  languageEntityId: string;
  requestedBy: string;
  languageEntity?: any;
  region?: any;
  audioVersion?: AudioVersionData;
  textVersion?: TextVersionData;
  bibleStructure?: BibleStructureData;
  audioFileIndex?: AudioFileEntry[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  packageInfo?: BiblePackageManifest;
}
