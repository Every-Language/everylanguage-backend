# Offline Bible Distribution - Requirements & Architecture

## Overview

This system enables complete offline sharing of Bible audio and text versions through a custom `.bible` package format. The system supports export from both server (Postgres) and client (React Native + SQLite), offline sharing via any platform (WhatsApp, AirDrop, SD cards), and intelligent sync when network becomes available.

## Core Requirements

### Package Types

1. **Audio Package**: Complete audio version with all media files and metadata
2. **Text Package**: Complete text version with all verse texts
3. **Combined Package**: Audio + Text versions for the same language (manual distribution only)
4. **Chunked Package**: Partial content packages that are part of a larger Bible (e.g., Old Testament, New Testament, book groups)
5. **Package Series**: Multiple related packages that combine to form a complete Bible

### Distribution Scenarios

1. **App-to-App Sharing**: User exports from local database and shares via AirDrop/Android equivalent
2. **Cross-Platform Sharing**: Packages sent via WhatsApp, social media, cloud storage
3. **Physical Distribution**: SD cards, USB drives for areas with no connectivity
4. **Server Downloads**: Backend generates packages for first-time downloads
5. **Multi-Package Sharing**: Large Bibles shared as coordinated package series via AirDrop/Android Beam
6. **Selective Distribution**: Share specific portions (Old Testament, New Testament, book groups) as needed

### Package Chunking Strategies

1. **Size-Based Chunking**: Automatically split based on platform limits (2GB WhatsApp, 5GB AirDrop)
2. **Testament-Based**: Old Testament + New Testament packages
3. **Book Group-Based**: Logical groupings (Law, History, Wisdom, Prophets, Gospels, etc.)
4. **Custom Chunking**: User-defined splits for specific distribution needs

### Key Constraints

- **Size Limitations**: Individual packages must respect platform limits (2GB for WhatsApp, 5GB for AirDrop)
- **Intelligent Chunking**: Large Bibles automatically split into manageable packages based on size, not arbitrary divisions
- **Multi-Package Coordination**: Support sharing complete Bibles via multiple related packages
- **Offline First**: Complete functionality without network connection
- **Older Devices**: Must work well on slower, older phones
- **Poor Networks**: Resumable downloads, optimized for intermittent connectivity
- **Read-Only**: Client apps are read-only, no local content modifications

## Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    Server Side      │    │   .bible Package    │    │    Client Side      │
│    (Postgres)       │    │   (Custom Binary)   │    │ (React Native +     │
│                     │    │                     │    │  SQLite)            │
│ • Package Export    │───►│ • 64-byte Header    │◄───│ • Package Import    │
│ • Download API      │    │ • JSON Manifest     │    │ • Local Export      │
│ • Resumable DL     │    │ • SQLite Database   │    │ • Multi-Package     │
│ • Intelligent Split │    │ • Audio Files       │    │   Assembly          │
│ • Series Tracking  │    │ • Integrity Checks  │    │ • Series Import     │
│ • Caching          │    │ • Cross-Package Refs│    │ • Auto Sync         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                     │
                           ┌─────────┴─────────┐
                           │   Package Series   │
                           │                   │
                           │ • Series Manifest │
                           │ • Part 1, 2, 3... │
                           │ • Dependency Tree │
                           │ • Progress Track   │
                           └───────────────────┘
```

## Data Model

### Verse ID System

- Uses OSIS text-based IDs: `book-chapter-verse` (e.g., `john-3-16`)
- Deterministic and consistent across all packages and servers
- Enables reliable cross-package verse referencing

### Audio Package Contents

```typescript
interface AudioPackageData {
  // Core audio version
  audioVersion: AudioVersionRecord;

  // Media files and metadata
  mediaFiles: MediaFileRecord[];
  mediaFilesVerses: MediaFileVerseRecord[];
  mediaFilesTargets: MediaFileTargetRecord[];
  mediaFilesTags: MediaFileTagRecord[];
  tags: TagRecord[];

  // Context data
  languageEntity: LanguageEntityRecord;
  region?: RegionRecord;

  // Bible structure (for compatibility)
  bibleVersion: BibleVersionRecord;
  books: BookRecord[];
  chapters: ChapterRecord[];
  verses: VerseRecord[];

  // Actual audio files
  audioFileData: AudioFileEntry[];
}
```

### Text Package Contents

```typescript
interface TextPackageData {
  // Core text version
  textVersion: TextVersionRecord;

  // All verse texts
  verseTexts: VerseTextRecord[];

  // Context data
  languageEntity: LanguageEntityRecord;
  region?: RegionRecord;

  // Bible structure (for compatibility)
  bibleVersion: BibleVersionRecord;
  books: BookRecord[];
  chapters: ChapterRecord[];
  verses: VerseRecord[];
}
```

## Business Logic Rules

### Version Conflicts

- **Rule**: Newer package always wins (no user choice)
- **Implementation**: Compare package versions and timestamps
- **UI**: Show notification of replacement, no confirmation dialog

### Package Selection UX

- **Audio/Text Separate**: Users select audio and text versions independently
- **Combined Packages**: Only for manual distribution scenarios
- **Download Flow**: Select version → confirm download → progress indicator

### Sync Strategy (LWW - Last Writer Wins)

- **Trigger**: When network becomes available after offline import
- **Method**: Compare `updated_at` timestamps for each record
- **Granularity**: Individual record level, not package level
- **Conflict Resolution**: Server record with newer timestamp always wins

### Export Requirements

- **Permissions**: Any user can export any version (no restrictions)
- **Prerequisites**: Version must be fully downloaded locally
- **Validation**: Check all required files exist before export
- **Progress**: Show progress indicator for large exports

## Performance Requirements

### File Size Optimization

- **Target**: WhatsApp-compatible (under 2GB, ideally under 1GB)
- **Compression**: Optimize binary format for audio + database content
- **Audio**: Maintain quality while minimizing file size

### Device Compatibility

- **Storage Check**: Verify available disk space before operations
- **Memory Usage**: Stream processing for large packages
- **Background**: Operations continue when app backgrounded (future)

### Network Optimization

- **Resumable Downloads**: Support partial download resume
- **Chunked Transfer**: For server downloads over poor connections
- **Fallback Strategy**: Graceful degradation for network failures

## Future Extensibility

### Non-Bible Audio Support

- **Implementation**: Via `media_files_targets` table pointing to sermons/podcasts
- **Package Structure**: Same binary format, different manifest type
- **Compatibility**: Backward compatible with bible-only packages

### Enhanced Sync

- **Delta Updates**: Future support for incremental package updates
- **Bidirectional Sync**: Future support for client modifications
- **Conflict Resolution**: Enhanced strategies beyond LWW

## Security Considerations

### Package Integrity

- **Checksums**: SHA-256 validation for all content
- **Size Limits**: Reasonable limits to prevent abuse
- **Format Validation**: Strict binary format validation

### Data Protection

- **No Personal Data**: Packages contain only biblical content
- **Temporary Files**: Secure cleanup of temporary data
- **Error Handling**: No sensitive data in error messages

## Error Handling Strategy

### Partial Import Support

- **Allow**: Import database even if some audio files are corrupted
- **Validation**: Pre-import package validation to prevent failures
- **Recovery**: UI option to retry failed imports
- **Cleanup**: Automatic cleanup of failed/partial imports

### Network Failures

- **Resumable**: Support resuming interrupted downloads
- **Timeout Handling**: Graceful timeout and retry logic
- **User Feedback**: Clear error messages and recovery instructions

This architecture provides a robust foundation for offline Bible distribution while maintaining simplicity and performance across all device types and network conditions.
