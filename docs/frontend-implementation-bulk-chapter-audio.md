# Frontend Implementation Guide: Bulk Bible Audio Downloads

## Overview

This guide provides complete implementation details for integrating the `download-bible-chapter-audio-bulk` edge function into a React Native app for downloading entire Bible versions, books, or chapter sets efficiently.

## API Endpoint

**Base URL**: `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio-bulk`
**Method**: `POST`

### Request Body

```typescript
interface BatchDownloadRequest {
  languageEntityId: string;
  scope: 'version' | 'book' | 'chapters';
  bookId?: string; // Required for 'book' and 'chapters' scope
  chapterIds?: string[]; // Required for 'chapters' scope
  batchSize?: number; // Optional, default 3, max 5
  format?: 'individual' | 'zip'; // Optional, default 'individual'
}
```

### Response Format

```typescript
interface BatchDownloadResponse {
  success: boolean;
  batchId: string;
  files: Array<{
    mediaFileId: string;
    fileName: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalBytes: number;
  };
}
```

### Authentication

- **Header**: `Authorization: Bearer ${jwt_token}`
- **Required**: Yes

## Data Structures

### Batch Progress Tracking

```typescript
interface BatchProgress {
  batchId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: {
    mediaFileId: string;
    bookName: string;
    chapterNumber: number;
  };
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-1
  estimatedTimeRemaining?: number; // seconds
  status: 'preparing' | 'downloading' | 'completed' | 'failed' | 'cancelled';
}

interface BatchDownloadJob {
  id: string;
  languageEntityId: string;
  scope: 'version' | 'book' | 'chapters';
  targetId?: string; // bookId for book scope
  chapterIds?: string[];
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: BatchProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

### SQLite Schema for Batch Jobs

```sql
-- Batch download jobs tracking
CREATE TABLE batch_download_jobs (
  id TEXT PRIMARY KEY,
  language_entity_id TEXT NOT NULL,
  scope TEXT CHECK (scope IN ('version', 'book', 'chapters')) NOT NULL,
  target_id TEXT, -- bookId for book/chapters scope
  chapter_ids TEXT, -- JSON array for chapters scope
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  total_files INTEGER DEFAULT 0,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  error TEXT
);

-- Individual file records within batch jobs
CREATE TABLE batch_file_downloads (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT REFERENCES batch_download_jobs(id) ON DELETE CASCADE,
  media_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')) DEFAULT 'pending',
  local_path TEXT,
  error TEXT,
  download_order INTEGER, -- Order within batch
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Core Service Implementation

### 1. Batch Download Service

```typescript
// services/BibleBatchDownloadService.ts
import { supabase } from './supabase';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { database } from './Database';
import { BibleAudioService } from './BibleAudioService';

export class BibleBatchDownloadService {
  private audioService = new BibleAudioService();
  private activeBatches = new Map<string, AbortController>();
  private progressCallbacks = new Map<
    string,
    (progress: BatchProgress) => void
  >();

  /**
   * Start a batch download job
   */
  async startBatchDownload(
    request: BatchDownloadRequest,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<string> {
    // Validate network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection');
    }

    // Create batch job
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (onProgress) {
      this.progressCallbacks.set(batchId, onProgress);
    }

    // Initialize progress
    const progress: BatchProgress = {
      batchId,
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      status: 'preparing',
    };

    this.notifyProgress(batchId, progress);

    try {
      // Fetch metadata from backend
      const response = await this.callBatchEndpoint(request);

      if (!response.success) {
        throw new Error('Failed to prepare batch download');
      }

      // Save job to database
      await database.createBatchJob({
        id: batchId,
        language_entity_id: request.languageEntityId,
        scope: request.scope,
        target_id: request.bookId,
        chapter_ids: request.chapterIds
          ? JSON.stringify(request.chapterIds)
          : null,
        status: 'active',
        total_files: response.summary.totalFiles,
        total_bytes: response.summary.totalBytes,
        started_at: new Date().toISOString(),
      });

      // Save individual file records
      for (let i = 0; i < response.files.length; i++) {
        const file = response.files[i];
        await database.createBatchFileDownload({
          id: `${batchId}_file_${i}`,
          batch_job_id: batchId,
          media_file_id: file.mediaFileId,
          file_name: file.fileName,
          download_order: i,
        });
      }

      // Update progress with file count
      progress.totalFiles = response.summary.totalFiles;
      progress.totalBytes = response.summary.totalBytes;
      progress.status = 'downloading';
      this.notifyProgress(batchId, progress);

      // Start downloading files
      this.downloadBatchFiles(batchId, response.files);

      return batchId;
    } catch (error) {
      progress.status = 'failed';
      progress.error = (error as Error).message;
      this.notifyProgress(batchId, progress);

      await database.updateBatchJob(batchId, {
        status: 'failed',
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Download files in the batch with controlled concurrency
   */
  private async downloadBatchFiles(
    batchId: string,
    files: Array<{ mediaFileId: string; fileName: string; success: boolean }>
  ): Promise<void> {
    const controller = new AbortController();
    this.activeBatches.set(batchId, controller);

    const batchSize = 3; // Conservative for mobile
    const successfulFiles: string[] = [];
    const failedFiles: Array<{ mediaFileId: string; error: string }> = [];

    try {
      // Process files in batches
      for (let i = 0; i < files.length; i += batchSize) {
        if (controller.signal.aborted) break;

        const batch = files.slice(i, i + batchSize);

        const batchPromises = batch.map(async file => {
          if (controller.signal.aborted) return;

          try {
            // Update current file in progress
            const progress = await this.getCurrentProgress(batchId);
            progress.currentFile = {
              mediaFileId: file.mediaFileId,
              bookName: this.extractBookName(file.fileName),
              chapterNumber: this.extractChapterNumber(file.fileName),
            };
            this.notifyProgress(batchId, progress);

            // Update file status
            await database.updateBatchFileDownload(file.mediaFileId, {
              download_status: 'downloading',
            });

            // Get metadata for this file
            const metadata = await this.audioService.getChapterMetadata(
              file.mediaFileId
            );

            // Download the file
            const localPath = await this.audioService.downloadChapter(
              file.mediaFileId,
              fileProgress => {
                // Update batch progress with individual file progress
                this.updateBatchProgressFromFile(batchId, fileProgress);
              }
            );

            // Mark file as completed
            await database.updateBatchFileDownload(file.mediaFileId, {
              download_status: 'completed',
              local_path: localPath,
            });

            successfulFiles.push(file.mediaFileId);

            // Update batch progress
            const updatedProgress = await this.getCurrentProgress(batchId);
            updatedProgress.completedFiles = successfulFiles.length;
            updatedProgress.progress =
              (successfulFiles.length + failedFiles.length) / files.length;
            this.notifyProgress(batchId, updatedProgress);
          } catch (error) {
            console.error(`Failed to download ${file.fileName}:`, error);

            failedFiles.push({
              mediaFileId: file.mediaFileId,
              error: (error as Error).message,
            });

            // Mark file as failed
            await database.updateBatchFileDownload(file.mediaFileId, {
              download_status: 'failed',
              error: (error as Error).message,
            });

            // Update batch progress
            const updatedProgress = await this.getCurrentProgress(batchId);
            updatedProgress.failedFiles = failedFiles.length;
            updatedProgress.progress =
              (successfulFiles.length + failedFiles.length) / files.length;
            this.notifyProgress(batchId, updatedProgress);
          }
        });

        // Wait for current batch to complete
        await Promise.all(batchPromises);

        // Small delay between batches
        if (i + batchSize < files.length && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Final status update
      const finalProgress = await this.getCurrentProgress(batchId);
      finalProgress.status = controller.signal.aborted
        ? 'cancelled'
        : 'completed';
      finalProgress.progress = 1.0;
      finalProgress.completedFiles = successfulFiles.length;
      finalProgress.failedFiles = failedFiles.length;

      await database.updateBatchJob(batchId, {
        status: finalProgress.status,
        completed_files: successfulFiles.length,
        failed_files: failedFiles.length,
        progress: 1.0,
        completed_at: new Date().toISOString(),
      });

      this.notifyProgress(batchId, finalProgress);
    } catch (error) {
      const errorProgress = await this.getCurrentProgress(batchId);
      errorProgress.status = 'failed';
      errorProgress.error = (error as Error).message;

      await database.updateBatchJob(batchId, {
        status: 'failed',
        error: (error as Error).message,
      });

      this.notifyProgress(batchId, errorProgress);
    } finally {
      this.activeBatches.delete(batchId);
      this.progressCallbacks.delete(batchId);
    }
  }

  /**
   * Cancel an active batch download
   */
  async cancelBatchDownload(batchId: string): Promise<void> {
    const controller = this.activeBatches.get(batchId);
    if (controller) {
      controller.abort();
    }

    await database.updateBatchJob(batchId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });

    const progress = await this.getCurrentProgress(batchId);
    progress.status = 'cancelled';
    this.notifyProgress(batchId, progress);
  }

  /**
   * Get current progress for a batch
   */
  async getBatchProgress(batchId: string): Promise<BatchProgress | null> {
    const job = await database.getBatchJob(batchId);
    if (!job) return null;

    return {
      batchId: job.id,
      totalFiles: job.total_files,
      completedFiles: job.completed_files,
      failedFiles: job.failed_files,
      totalBytes: job.total_bytes,
      downloadedBytes: job.downloaded_bytes,
      progress: job.progress,
      status: job.status as any,
    };
  }

  /**
   * Get all batch jobs with their status
   */
  async getAllBatchJobs(): Promise<BatchDownloadJob[]> {
    return database.getAllBatchJobs();
  }

  /**
   * Resume a failed or cancelled batch job
   */
  async resumeBatchDownload(
    batchId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<void> {
    const job = await database.getBatchJob(batchId);
    if (!job) {
      throw new Error('Batch job not found');
    }

    if (job.status !== 'failed' && job.status !== 'cancelled') {
      throw new Error('Can only resume failed or cancelled jobs');
    }

    if (onProgress) {
      this.progressCallbacks.set(batchId, onProgress);
    }

    // Get failed files
    const failedFiles = await database.getBatchFailedFiles(batchId);
    if (failedFiles.length === 0) {
      throw new Error('No failed files to resume');
    }

    // Update job status
    await database.updateBatchJob(batchId, {
      status: 'active',
      started_at: new Date().toISOString(),
      error: null,
    });

    // Reset failed files status
    for (const file of failedFiles) {
      await database.updateBatchFileDownload(file.media_file_id, {
        download_status: 'pending',
        error: null,
      });
    }

    // Resume downloading
    this.downloadBatchFiles(
      batchId,
      failedFiles.map(f => ({
        mediaFileId: f.media_file_id,
        fileName: f.file_name,
        success: false,
      }))
    );
  }

  /**
   * Delete a batch job and its files
   */
  async deleteBatchJob(batchId: string): Promise<void> {
    // Cancel if active
    await this.cancelBatchDownload(batchId);

    // Get all files for this batch
    const files = await database.getBatchFiles(batchId);

    // Delete local files
    for (const file of files) {
      if (file.local_path && (await RNFS.exists(file.local_path))) {
        await RNFS.unlink(file.local_path);
      }
    }

    // Delete from database
    await database.deleteBatchJob(batchId);
  }

  /**
   * Call the batch download endpoint
   */
  private async callBatchEndpoint(
    request: BatchDownloadRequest
  ): Promise<BatchDownloadResponse> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw new Error('Authentication required');
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/download-bible-chapter-audio-bulk`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Batch download failed');
    }

    return response.json();
  }

  /**
   * Helper methods
   */
  private async getCurrentProgress(batchId: string): Promise<BatchProgress> {
    const progress = await this.getBatchProgress(batchId);
    if (!progress) {
      throw new Error('Batch progress not found');
    }
    return progress;
  }

  private notifyProgress(batchId: string, progress: BatchProgress): void {
    const callback = this.progressCallbacks.get(batchId);
    if (callback) {
      callback(progress);
    }
  }

  private updateBatchProgressFromFile(
    batchId: string,
    fileProgress: any
  ): void {
    // This would update the batch progress based on individual file progress
    // Implementation depends on how granular you want the progress tracking
  }

  private extractBookName(fileName: string): string {
    return fileName.split('-')[0] || 'Unknown';
  }

  private extractChapterNumber(fileName: string): number {
    const match = fileName.match(/-(\d+)\.m4a$/);
    return match ? parseInt(match[1]) : 0;
  }
}
```

### 2. Batch Download UI Component

```typescript
// components/BibleBatchDownloader.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { BibleBatchDownloadService, BatchProgress, BatchDownloadJob } from '../services/BibleBatchDownloadService';

interface Props {
  languageEntityId: string;
  onDownloadComplete?: (batchId: string) => void;
}

export const BibleBatchDownloader: React.FC<Props> = ({
  languageEntityId,
  onDownloadComplete
}) => {
  const [batchService] = useState(() => new BibleBatchDownloadService());
  const [activeJobs, setActiveJobs] = useState<BatchDownloadJob[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<BatchProgress | null>(null);

  useEffect(() => {
    loadExistingJobs();
  }, []);

  const loadExistingJobs = async () => {
    try {
      const jobs = await batchService.getAllBatchJobs();
      setActiveJobs(jobs);
    } catch (error) {
      console.error('Failed to load batch jobs:', error);
    }
  };

  const startVersionDownload = async () => {
    try {
      const batchId = await batchService.startBatchDownload(
        {
          languageEntityId,
          scope: 'version',
          batchSize: 3,
        },
        handleProgressUpdate
      );

      setIsModalVisible(true);
      await loadExistingJobs();
    } catch (error) {
      Alert.alert('Download Failed', (error as Error).message);
    }
  };

  const startBookDownload = async (bookId: string) => {
    try {
      const batchId = await batchService.startBatchDownload(
        {
          languageEntityId,
          scope: 'book',
          bookId,
          batchSize: 4,
        },
        handleProgressUpdate
      );

      setIsModalVisible(true);
      await loadExistingJobs();
    } catch (error) {
      Alert.alert('Download Failed', (error as Error).message);
    }
  };

  const startChaptersDownload = async (bookId: string, chapterIds: string[]) => {
    try {
      const batchId = await batchService.startBatchDownload(
        {
          languageEntityId,
          scope: 'chapters',
          bookId,
          chapterIds,
          batchSize: 5,
        },
        handleProgressUpdate
      );

      setIsModalVisible(true);
      await loadExistingJobs();
    } catch (error) {
      Alert.alert('Download Failed', (error as Error).message);
    }
  };

  const handleProgressUpdate = (progress: BatchProgress) => {
    setCurrentProgress(progress);

    if (progress.status === 'completed') {
      Alert.alert(
        'Download Complete',
        `Successfully downloaded ${progress.completedFiles} files${
          progress.failedFiles > 0 ? ` (${progress.failedFiles} failed)` : ''
        }`
      );
      setIsModalVisible(false);
      onDownloadComplete?.(progress.batchId);
      loadExistingJobs();
    } else if (progress.status === 'failed') {
      Alert.alert('Download Failed', progress.error || 'Unknown error');
      setIsModalVisible(false);
      loadExistingJobs();
    }
  };

  const cancelJob = async (batchId: string) => {
    try {
      await batchService.cancelBatchDownload(batchId);
      setIsModalVisible(false);
      await loadExistingJobs();
    } catch (error) {
      Alert.alert('Cancel Failed', (error as Error).message);
    }
  };

  const resumeJob = async (batchId: string) => {
    try {
      await batchService.resumeBatchDownload(batchId, handleProgressUpdate);
      setIsModalVisible(true);
    } catch (error) {
      Alert.alert('Resume Failed', (error as Error).message);
    }
  };

  const deleteJob = async (batchId: string) => {
    Alert.alert(
      'Delete Download',
      'This will delete all downloaded files. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await batchService.deleteBatchJob(batchId);
              await loadExistingJobs();
            } catch (error) {
              Alert.alert('Delete Failed', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const renderJobItem = ({ item }: { item: BatchDownloadJob }) => (
    <View style={styles.jobItem}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>
          {item.scope.charAt(0).toUpperCase() + item.scope.slice(1)} Download
        </Text>
        <Text style={styles.jobStatus}>{item.status}</Text>
      </View>

      <Text style={styles.jobDetails}>
        {item.progress.completedFiles}/{item.progress.totalFiles} files
        {item.progress.failedFiles > 0 && ` (${item.progress.failedFiles} failed)`}
      </Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${item.progress.progress * 100}%` }
          ]}
        />
      </View>

      <View style={styles.jobActions}>
        {item.status === 'active' && (
          <Pressable
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => cancelJob(item.id)}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </Pressable>
        )}

        {(item.status === 'failed' || item.status === 'cancelled') && (
          <Pressable
            style={[styles.actionButton, styles.resumeButton]}
            onPress={() => resumeJob(item.id)}
          >
            <Text style={styles.actionButtonText}>Resume</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteJob(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Batch Downloads</Text>

      {/* Download Options */}
      <View style={styles.optionsContainer}>
        <Pressable
          style={[styles.option, styles.versionOption]}
          onPress={startVersionDownload}
        >
          <Text style={styles.optionText}>Download Entire Version</Text>
          <Text style={styles.optionSubtext}>All books and chapters</Text>
        </Pressable>

        <Pressable
          style={[styles.option, styles.bookOption]}
          onPress={() => {
            // You would implement book selection here
            Alert.alert('Book Selection', 'Implement book picker');
          }}
        >
          <Text style={styles.optionText}>Download Book</Text>
          <Text style={styles.optionSubtext}>All chapters in a book</Text>
        </Pressable>

        <Pressable
          style={[styles.option, styles.chaptersOption]}
          onPress={() => {
            // You would implement chapter selection here
            Alert.alert('Chapter Selection', 'Implement chapter picker');
          }}
        >
          <Text style={styles.optionText}>Download Chapters</Text>
          <Text style={styles.optionSubtext}>Selected chapters</Text>
        </Pressable>
      </View>

      {/* Active Jobs List */}
      <Text style={styles.sectionTitle}>Download Jobs</Text>
      {activeJobs.length === 0 ? (
        <Text style={styles.emptyText}>No download jobs</Text>
      ) : (
        <FlatList
          data={activeJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          style={styles.jobsList}
        />
      )}

      {/* Progress Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentProgress && (
              <>
                <Text style={styles.modalTitle}>Downloading...</Text>

                {currentProgress.currentFile && (
                  <Text style={styles.currentFile}>
                    {currentProgress.currentFile.bookName} {currentProgress.currentFile.chapterNumber}
                  </Text>
                )}

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${currentProgress.progress * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(currentProgress.progress * 100)}%
                  </Text>
                </View>

                <Text style={styles.progressDetails}>
                  {currentProgress.completedFiles}/{currentProgress.totalFiles} files
                </Text>

                <Text style={styles.progressDetails}>
                  {formatFileSize(currentProgress.downloadedBytes)} / {formatFileSize(currentProgress.totalBytes)}
                </Text>

                {currentProgress.estimatedTimeRemaining && (
                  <Text style={styles.progressDetails}>
                    Time remaining: {formatTimeRemaining(currentProgress.estimatedTimeRemaining)}
                  </Text>
                )}

                <Pressable
                  style={styles.cancelModalButton}
                  onPress={() => currentProgress && cancelJob(currentProgress.batchId)}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 30,
  },
  option: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  versionOption: {
    backgroundColor: '#007AFF',
  },
  bookOption: {
    backgroundColor: '#34C759',
  },
  chaptersOption: {
    backgroundColor: '#FF9500',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  jobsList: {
    flex: 1,
  },
  jobItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  jobDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  resumeButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  currentFile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  progressDetails: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  cancelModalButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  cancelModalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

## Usage Examples

### Basic Implementation

```typescript
// In your main component
import { BibleBatchDownloader } from './components/BibleBatchDownloader';

<BibleBatchDownloader
  languageEntityId="your-language-entity-id"
  onDownloadComplete={(batchId) => {
    console.log('Batch download completed:', batchId);
    // Refresh your content or navigate to downloaded content
  }}
/>
```

### Advanced Integration

```typescript
// Custom implementation for specific use cases
import { BibleBatchDownloadService } from './services/BibleBatchDownloadService';

export class CustomBatchDownloader {
  private batchService = new BibleBatchDownloadService();

  async downloadBookForOfflineReading(
    bookId: string,
    languageEntityId: string
  ) {
    try {
      const batchId = await this.batchService.startBatchDownload(
        {
          languageEntityId,
          scope: 'book',
          bookId,
          batchSize: 4, // Balanced for mobile performance
        },
        progress => {
          // Update your custom UI
          this.updateDownloadProgress(progress);
        }
      );

      return batchId;
    } catch (error) {
      throw new Error(`Failed to start book download: ${error.message}`);
    }
  }

  async scheduleBackgroundDownload(request: BatchDownloadRequest) {
    // Implement background task scheduling
    // This would integrate with your app's background job system
  }
}
```

## Performance Considerations

### 1. Memory Management

```typescript
// Implement proper cleanup
class BatchDownloadManager {
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up completed jobs every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldJobs();
      },
      60 * 60 * 1000
    );
  }

  async cleanupOldJobs() {
    const oldJobs = await database.getOldCompletedJobs(7); // 7 days old
    for (const job of oldJobs) {
      await this.batchService.deleteBatchJob(job.id);
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}
```

### 2. Network Optimization

```typescript
// Smart batching based on network conditions
class AdaptiveBatchDownloader {
  private async getOptimalBatchSize(): Promise<number> {
    const netInfo = await NetInfo.fetch();

    if (netInfo.type === 'wifi') {
      return 5; // More aggressive on WiFi
    } else if (netInfo.type === 'cellular') {
      return 2; // Conservative on cellular
    }

    return 3; // Default
  }

  private async shouldDelayDownload(): Promise<boolean> {
    const battery = await getBatteryLevel();
    return battery < 0.2; // Pause downloads if battery low
  }
}
```

### 3. Storage Management

```typescript
// Implement storage quota management
class StorageManager {
  private maxStorageUsage = 2 * 1024 * 1024 * 1024; // 2GB

  async checkAvailableStorage(requiredBytes: number): Promise<boolean> {
    const freeSpace = await getFreeDiskStorage();
    const currentUsage = await this.getCurrentAudioStorageUsage();

    return (
      freeSpace - requiredBytes > 500 * 1024 * 1024 && // Keep 500MB free
      currentUsage + requiredBytes < this.maxStorageUsage
    );
  }

  async getCurrentAudioStorageUsage(): Promise<number> {
    const audioDir = `${RNFS.DocumentDirectoryPath}/bible_audio`;
    const files = await RNFS.readDir(audioDir);

    return files.reduce((total, file) => total + file.size, 0);
  }
}
```

## Error Handling & Recovery

### Robust Error Handling

```typescript
// Comprehensive error handling
class RobustBatchDownloader {
  async handleDownloadError(
    error: Error,
    context: DownloadContext
  ): Promise<void> {
    if (error.message.includes('network')) {
      // Network error - pause and retry later
      await this.pauseAndScheduleRetry(context.batchId);
    } else if (error.message.includes('storage')) {
      // Storage error - clean up space
      await this.freeUpSpace();
      await this.retryDownload(context.batchId);
    } else if (error.message.includes('auth')) {
      // Auth error - refresh token
      await this.refreshAuthAndRetry(context.batchId);
    } else {
      // Unknown error - mark as failed
      await this.markBatchAsFailed(context.batchId, error.message);
    }
  }

  private async pauseAndScheduleRetry(batchId: string): Promise<void> {
    await this.batchService.cancelBatchDownload(batchId);

    // Schedule retry in 30 minutes
    setTimeout(
      () => {
        this.batchService.resumeBatchDownload(batchId);
      },
      30 * 60 * 1000
    );
  }
}
```

## Testing Strategy

### Mock Implementation

```typescript
// __mocks__/BibleBatchDownloadService.ts
export class BibleBatchDownloadService {
  async startBatchDownload(
    request: any,
    onProgress?: Function
  ): Promise<string> {
    const batchId = 'mock-batch-id';

    // Simulate progress
    const totalFiles = 10;
    for (let i = 0; i <= totalFiles; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress?.({
        batchId,
        totalFiles,
        completedFiles: i,
        failedFiles: 0,
        progress: i / totalFiles,
        status: i === totalFiles ? 'completed' : 'downloading',
      });
    }

    return batchId;
  }
}
```

## Production Deployment Checklist

- [ ] Implement proper error boundaries for batch operations
- [ ] Add comprehensive logging for debugging batch issues
- [ ] Implement retry logic with exponential backoff
- [ ] Add network type awareness (WiFi vs cellular preferences)
- [ ] Implement background task support for long downloads
- [ ] Add storage management and cleanup policies
- [ ] Implement download scheduling for off-peak hours
- [ ] Add analytics for batch download success/failure rates
- [ ] Test with various network conditions and interruptions
- [ ] Implement proper cancellation and cleanup mechanisms
- [ ] Add user preferences for download behavior
- [ ] Test memory usage during large batch downloads
- [ ] Implement progress persistence across app restarts
- [ ] Add accessibility support for progress indicators
