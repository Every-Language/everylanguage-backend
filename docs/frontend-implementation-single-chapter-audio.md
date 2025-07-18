# Frontend Implementation Guide: Single Chapter Bible Audio

## Overview

This guide provides complete implementation details for integrating the `download-bible-chapter-audio` edge function into a React Native app with offline-first functionality.

## API Endpoint

**Base URL**: `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio`

### Parameters

| Parameter  | Type    | Required | Description                                       |
| ---------- | ------- | -------- | ------------------------------------------------- |
| `id`       | string  | Yes      | Media file UUID                                   |
| `stream`   | boolean | No       | Set to `true` for streaming, `false` for download |
| `metadata` | boolean | No       | Set to `true` to get only metadata without file   |

### Authentication

- **Header**: `Authorization: Bearer ${jwt_token}`
- **Required**: Yes (based on your RLS policies)

## Data Structures

### BibleAudioMetadata Interface

```typescript
interface BibleAudioMetadata {
  mediaFileId: string;
  chapterId: string;
  bookId: string;
  bookName: string;
  chapterNumber: number;
  duration: number; // in seconds
  fileSize: number; // in bytes
  verseTimings: Array<{
    verseId: string;
    verseNumber: number;
    startTime: number; // in seconds
    duration: number; // in seconds
  }>;
  languageEntityId: string;
  publishStatus: string;
  version: number;
  remotePath: string;
}
```

### Local SQLite Schema

```sql
-- Add these fields to your existing media_files table
CREATE TABLE media_files_local (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE, -- Maps to Supabase media_files.id
  local_path TEXT,
  download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed', 'paused')),
  download_progress REAL DEFAULT 0, -- 0.0 to 1.0
  file_size INTEGER,
  downloaded_bytes INTEGER DEFAULT 0,
  book_name TEXT,
  chapter_number INTEGER,
  verse_timings TEXT, -- JSON string of verse timing data
  last_played_position REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  -- Bible-specific fields
  chapter_id TEXT,
  book_id TEXT,
  language_entity_id TEXT,
  version INTEGER,
  publish_status TEXT
);
```

## Core Service Implementation

### 1. Bible Audio Service

```typescript
// services/BibleAudioService.ts
import { supabase } from './supabase';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { database } from './Database';

export interface DownloadProgress {
  mediaFileId: string;
  progress: number; // 0-1
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
}

export class BibleAudioService {
  private activeDownloads = new Map<string, AbortController>();
  private progressCallbacks = new Map<
    string,
    (progress: DownloadProgress) => void
  >();

  /**
   * Get metadata for a chapter without downloading
   */
  async getChapterMetadata(mediaFileId: string): Promise<BibleAudioMetadata> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio?id=${mediaFileId}&metadata=true`,
      {
        headers: {
          Authorization: `Bearer ${data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch metadata');
    }

    const result = await response.json();
    return result.metadata;
  }

  /**
   * Stream chapter audio for immediate playback
   */
  getStreamingUrl(mediaFileId: string): string {
    return `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio?id=${mediaFileId}&stream=true`;
  }

  /**
   * Download chapter for offline use with resumable support
   */
  async downloadChapter(
    mediaFileId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    // Check if already downloaded
    const existingFile = await database.getMediaFile(mediaFileId);
    if (
      existingFile?.download_status === 'completed' &&
      existingFile.local_path
    ) {
      const exists = await RNFS.exists(existingFile.local_path);
      if (exists) return existingFile.local_path;
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection');
    }

    // Get metadata first
    const metadata = await this.getChapterMetadata(mediaFileId);

    // Set up local file path
    const fileName =
      `${metadata.bookName}-${metadata.chapterNumber}.m4a`.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      );
    const localPath = `${RNFS.DocumentDirectoryPath}/bible_audio/${fileName}`;

    // Ensure directory exists
    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/bible_audio`);

    // Check for partial download
    let downloadedBytes = 0;
    const fileExists = await RNFS.exists(localPath);
    if (fileExists) {
      const stats = await RNFS.stat(localPath);
      downloadedBytes = stats.size;
    }

    // Save/update database record
    await database.upsertMediaFile({
      id: mediaFileId,
      remote_id: mediaFileId,
      local_path: localPath,
      download_status: 'downloading',
      downloaded_bytes: downloadedBytes,
      file_size: metadata.fileSize,
      book_name: metadata.bookName,
      chapter_number: metadata.chapterNumber,
      verse_timings: JSON.stringify(metadata.verseTimings),
      chapter_id: metadata.chapterId,
      book_id: metadata.bookId,
      language_entity_id: metadata.languageEntityId,
      version: metadata.version,
      publish_status: metadata.publishStatus,
    });

    if (onProgress) {
      this.progressCallbacks.set(mediaFileId, onProgress);
    }

    return this.resumableDownload(
      mediaFileId,
      localPath,
      downloadedBytes,
      metadata.fileSize
    );
  }

  /**
   * Resumable download implementation
   */
  private async resumableDownload(
    mediaFileId: string,
    localPath: string,
    startByte: number,
    totalBytes: number
  ): Promise<string> {
    const controller = new AbortController();
    this.activeDownloads.set(mediaFileId, controller);

    try {
      const { data } = await supabase.auth.getUser();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${data.session?.access_token}`,
      };

      // Add Range header for resumable download
      if (startByte > 0) {
        headers['Range'] = `bytes=${startByte}-`;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio?id=${mediaFileId}`,
        {
          headers,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      let downloadedBytes = startByte;

      // Create write stream (append mode if resuming)
      const stream = RNFS.createWriteStream(localPath, {
        append: startByte > 0,
      });

      // Read response stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Write chunk to file
          await new Promise<void>((resolve, reject) => {
            stream.write(value, error => {
              if (error) reject(error);
              else resolve();
            });
          });

          downloadedBytes += value.length;

          // Update progress
          const progress = downloadedBytes / totalBytes;
          await database.updateMediaFile(mediaFileId, {
            downloaded_bytes: downloadedBytes,
            download_progress: progress,
          });

          // Notify progress callback
          const callback = this.progressCallbacks.get(mediaFileId);
          if (callback) {
            callback({
              mediaFileId,
              progress,
              downloadedBytes,
              totalBytes,
              status: 'downloading',
            });
          }
        }

        await new Promise<void>((resolve, reject) => {
          stream.close(error => {
            if (error) reject(error);
            else resolve();
          });
        });

        // Mark as completed
        await database.updateMediaFile(mediaFileId, {
          download_status: 'completed',
          download_progress: 1.0,
        });

        // Final progress notification
        const callback = this.progressCallbacks.get(mediaFileId);
        if (callback) {
          callback({
            mediaFileId,
            progress: 1.0,
            downloadedBytes,
            totalBytes,
            status: 'completed',
          });
        }

        return localPath;
      } finally {
        reader.releaseLock();
        await new Promise<void>(resolve => {
          stream.close(() => resolve());
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        await database.updateMediaFile(mediaFileId, {
          download_status: 'paused',
        });
      } else {
        await database.updateMediaFile(mediaFileId, {
          download_status: 'failed',
        });

        // Notify error
        const callback = this.progressCallbacks.get(mediaFileId);
        if (callback) {
          callback({
            mediaFileId,
            progress: 0,
            downloadedBytes: 0,
            totalBytes,
            status: 'failed',
          });
        }
      }
      throw error;
    } finally {
      this.activeDownloads.delete(mediaFileId);
      this.progressCallbacks.delete(mediaFileId);
    }
  }

  /**
   * Pause an active download
   */
  async pauseDownload(mediaFileId: string): Promise<void> {
    const controller = this.activeDownloads.get(mediaFileId);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(
    mediaFileId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const mediaFile = await database.getMediaFile(mediaFileId);
    if (!mediaFile?.local_path) {
      throw new Error('No local path found for resume');
    }

    if (onProgress) {
      this.progressCallbacks.set(mediaFileId, onProgress);
    }

    return this.resumableDownload(
      mediaFileId,
      mediaFile.local_path,
      mediaFile.downloaded_bytes || 0,
      mediaFile.file_size || 0
    );
  }

  /**
   * Check if chapter is downloaded
   */
  async isChapterDownloaded(mediaFileId: string): Promise<boolean> {
    const mediaFile = await database.getMediaFile(mediaFileId);
    if (!mediaFile?.local_path || mediaFile.download_status !== 'completed') {
      return false;
    }

    return RNFS.exists(mediaFile.local_path);
  }

  /**
   * Get local file path if downloaded
   */
  async getLocalPath(mediaFileId: string): Promise<string | null> {
    const isDownloaded = await this.isChapterDownloaded(mediaFileId);
    if (!isDownloaded) return null;

    const mediaFile = await database.getMediaFile(mediaFileId);
    return mediaFile?.local_path || null;
  }
}
```

### 2. Audio Player Component

```typescript
// components/BibleAudioPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import Sound from 'react-native-sound';
import { BibleAudioService, DownloadProgress } from '../services/BibleAudioService';
import { BibleAudioMetadata } from '../types/BibleAudio';

interface Props {
  mediaFileId: string;
  autoPlay?: boolean;
  onVerseChange?: (verseNumber: number) => void;
}

export const BibleAudioPlayer: React.FC<Props> = ({
  mediaFileId,
  autoPlay = false,
  onVerseChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [metadata, setMetadata] = useState<BibleAudioMetadata | null>(null);
  const [verseTimings, setVerseTimings] = useState<any[]>([]);

  const soundRef = useRef<Sound | null>(null);
  const audioServiceRef = useRef(new BibleAudioService());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeAudio();
    return () => cleanup();
  }, [mediaFileId]);

  useEffect(() => {
    if (onVerseChange) {
      onVerseChange(currentVerse);
    }
  }, [currentVerse, onVerseChange]);

  const initializeAudio = async () => {
    try {
      // Get metadata first
      const audioMetadata = await audioServiceRef.current.getChapterMetadata(mediaFileId);
      setMetadata(audioMetadata);
      setVerseTimings(audioMetadata.verseTimings);
      setDuration(audioMetadata.duration);

      // Check if already downloaded
      const isLocallyAvailable = await audioServiceRef.current.isChapterDownloaded(mediaFileId);
      setIsDownloaded(isLocallyAvailable);

      if (isLocallyAvailable) {
        // Use local file
        const localPath = await audioServiceRef.current.getLocalPath(mediaFileId);
        if (localPath) {
          await loadAudio(localPath, true);
        }
      } else if (autoPlay) {
        // Start streaming immediately
        const streamUrl = audioServiceRef.current.getStreamingUrl(mediaFileId);
        await loadAudio(streamUrl, false);
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      Alert.alert('Error', 'Failed to load audio chapter');
    }
  };

  const loadAudio = async (audioSource: string, isLocal: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
      const sound = new Sound(audioSource, isLocal ? '' : Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Failed to load audio:', error);
          reject(error);
          return;
        }

        soundRef.current = sound;
        if (!isLocal) {
          setDuration(sound.getDuration());
        }
        resolve();
      });
    });
  };

  const downloadForOffline = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);

      const handleProgress = (progress: DownloadProgress) => {
        setDownloadProgress(progress.progress);
      };

      const localPath = await audioServiceRef.current.downloadChapter(
        mediaFileId,
        handleProgress
      );

      // Switch to local file
      if (soundRef.current) {
        soundRef.current.release();
        soundRef.current = null;
      }

      await loadAudio(localPath, true);
      setIsDownloaded(true);
      setDownloadProgress(0);

      Alert.alert('Success', 'Chapter downloaded for offline use');
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Download Failed', (error as Error).message);
    } finally {
      setIsDownloading(false);
    }
  };

  const play = () => {
    if (soundRef.current) {
      soundRef.current.play((success) => {
        if (success) {
          setIsPlaying(false);
          stopProgressTracking();
        }
      });
      setIsPlaying(true);
      startProgressTracking();
    }
  };

  const pause = () => {
    if (soundRef.current) {
      soundRef.current.pause();
      setIsPlaying(false);
      stopProgressTracking();
    }
  };

  const jumpToVerse = (verseNumber: number) => {
    const verseData = verseTimings.find(v => v.verseNumber === verseNumber);
    if (verseData && soundRef.current) {
      soundRef.current.setCurrentTime(verseData.startTime);
      setCurrentTime(verseData.startTime);
      setCurrentVerse(verseNumber);
    }
  };

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (soundRef.current && isPlaying) {
        soundRef.current.getCurrentTime((seconds) => {
          setCurrentTime(seconds);

          // Update current verse
          const activeVerse = verseTimings.find(v =>
            seconds >= v.startTime &&
            seconds < (v.startTime + v.duration)
          );
          if (activeVerse) {
            setCurrentVerse(activeVerse.verseNumber);
          }
        });
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const cleanup = () => {
    stopProgressTracking();
    if (soundRef.current) {
      soundRef.current.release();
      soundRef.current = null;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!metadata) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Chapter Info */}
      <Text style={styles.chapterTitle}>
        {metadata.bookName} {metadata.chapterNumber}
      </Text>

      {/* Download Button */}
      {!isDownloaded && (
        <Pressable
          onPress={downloadForOffline}
          style={[styles.button, styles.downloadButton]}
          disabled={isDownloading}
        >
          <Text style={styles.buttonText}>
            {isDownloading
              ? `Downloading... ${Math.round(downloadProgress * 100)}%`
              : 'Download for Offline'
            }
          </Text>
        </Pressable>
      )}

      {isDownloaded && (
        <Text style={styles.statusText}>✓ Downloaded</Text>
      )}

      {/* Play/Pause Button */}
      <Pressable
        onPress={isPlaying ? pause : play}
        style={[styles.button, styles.playButton]}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Pause' : 'Play'}
        </Text>
      </Pressable>

      {/* Progress Info */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Current Verse: {currentVerse}
        </Text>
        <Text style={styles.progressText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      {/* Verse Navigation */}
      <View style={styles.verseContainer}>
        {verseTimings.map((verse) => (
          <Pressable
            key={verse.verseId}
            onPress={() => jumpToVerse(verse.verseNumber)}
            style={[
              styles.verseButton,
              currentVerse === verse.verseNumber && styles.activeVerseButton
            ]}
          >
            <Text style={[
              styles.verseText,
              currentVerse === verse.verseNumber && styles.activeVerseText
            ]}>
              {verse.verseNumber}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
  },
  playButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: '#34C759',
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 8,
  },
  progressContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    marginVertical: 4,
  },
  verseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  verseButton: {
    padding: 8,
    margin: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  activeVerseButton: {
    backgroundColor: '#007AFF',
  },
  verseText: {
    color: '#000',
    fontSize: 14,
  },
  activeVerseText: {
    color: '#fff',
  },
});
```

## Usage Examples

### Basic Implementation

```typescript
import { BibleAudioPlayer } from './components/BibleAudioPlayer';

// In your component
<BibleAudioPlayer
  mediaFileId="uuid-of-chapter"
  autoPlay={false}
  onVerseChange={(verseNumber) => console.log('Current verse:', verseNumber)}
/>
```

### Advanced Integration

```typescript
// services/ChapterService.ts
import { BibleAudioService } from './BibleAudioService';

export class ChapterService {
  private audioService = new BibleAudioService();

  async preloadChapter(mediaFileId: string) {
    // Pre-fetch metadata
    return this.audioService.getChapterMetadata(mediaFileId);
  }

  async downloadChapterWithFeedback(mediaFileId: string) {
    return this.audioService.downloadChapter(mediaFileId, progress => {
      // Update UI with progress
      console.log(`Download progress: ${progress.progress * 100}%`);
    });
  }

  async streamChapter(mediaFileId: string) {
    return this.audioService.getStreamingUrl(mediaFileId);
  }
}
```

## Error Handling

### Network Error Handling

```typescript
try {
  await audioService.downloadChapter(mediaFileId);
} catch (error) {
  if (error.message.includes('No internet connection')) {
    // Handle offline state
    Alert.alert('Offline', 'Please connect to internet to download');
  } else if (error.message.includes('Authentication')) {
    // Handle auth error
    // Redirect to login
  } else {
    // Handle other errors
    Alert.alert('Error', error.message);
  }
}
```

### Storage Error Handling

```typescript
// Check available storage before download
import { getFreeDiskStorage } from 'react-native-device-info';

const checkStorageSpace = async (fileSize: number) => {
  const freeSpace = await getFreeDiskStorage();
  if (freeSpace < fileSize * 1.1) {
    // 10% buffer
    throw new Error('Insufficient storage space');
  }
};
```

## Performance Optimizations

### 1. Memory Management

```typescript
// Implement cleanup in useEffect
useEffect(() => {
  return () => {
    // Clean up audio resources
    audioPlayer.cleanup();
  };
}, []);
```

### 2. Background Downloads

```typescript
// Use background task for downloads
import BackgroundTask from 'react-native-background-task';

const downloadInBackground = async (mediaFileId: string) => {
  BackgroundTask.start();

  try {
    await audioService.downloadChapter(mediaFileId);
  } finally {
    BackgroundTask.stop();
  }
};
```

### 3. Caching Strategy

```typescript
// Implement LRU cache for downloaded files
class AudioCache {
  private maxFiles = 50;

  async cleanupOldFiles() {
    const files = await database.getOldestFiles(this.maxFiles);
    for (const file of files) {
      await RNFS.unlink(file.local_path);
      await database.deleteMediaFile(file.id);
    }
  }
}
```

## Testing Considerations

### Mock Implementation for Tests

```typescript
// __mocks__/BibleAudioService.ts
export class BibleAudioService {
  async getChapterMetadata(mediaFileId: string) {
    return mockMetadata;
  }

  async downloadChapter(mediaFileId: string, onProgress?: Function) {
    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      onProgress?.({ progress: i / 100 });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return '/mock/path/file.m4a';
  }
}
```

## Production Deployment Checklist

- [ ] Implement proper error boundaries
- [ ] Add analytics tracking for downloads/plays
- [ ] Implement retry logic for failed downloads
- [ ] Add progress persistence across app restarts
- [ ] Implement storage quota management
- [ ] Add network type awareness (WiFi vs cellular)
- [ ] Implement download scheduling for off-peak hours
- [ ] Add accessibility support for audio controls
- [ ] Test on various device types and OS versions
- [ ] Implement proper logging for debugging
