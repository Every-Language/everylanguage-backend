# Shared Architecture Guide: Bible Audio Frontend Implementation

## Overview

This guide covers the shared architecture, utilities, and patterns needed for implementing both single and bulk Bible audio downloads in React Native with offline-first functionality.

## Project Structure

```
src/
├── services/
│   ├── supabase.ts                    # Supabase client configuration
│   ├── Database.ts                    # SQLite database service
│   ├── BibleAudioService.ts           # Single chapter downloads
│   ├── BibleBatchDownloadService.ts   # Bulk downloads
│   └── NetworkManager.ts              # Network awareness
├── components/
│   ├── BibleAudioPlayer.tsx           # Single chapter player
│   ├── BibleBatchDownloader.tsx       # Bulk download UI
│   └── ProgressIndicator.tsx          # Shared progress component
├── types/
│   ├── BibleAudio.ts                  # Type definitions
│   └── Database.ts                    # Database type definitions
├── utils/
│   ├── audioUtils.ts                  # Audio-related utilities
│   ├── fileUtils.ts                   # File management utilities
│   └── networkUtils.ts                # Network utilities
└── hooks/
    ├── useAudioPlayer.ts              # Audio player hook
    ├── useBatchDownload.ts            # Batch download hook
    └── useNetworkStatus.ts            # Network status hook
```

## Core Dependencies

### Package.json Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "@react-native-async-storage/async-storage": "^1.19.3",
    "@react-native-community/netinfo": "^9.4.1",
    "react-native-fs": "^2.20.0",
    "react-native-sound": "^0.11.2",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-device-info": "^10.11.0",
    "react-native-background-task": "^0.2.1",
    "react-native-permissions": "^3.10.1"
  },
  "devDependencies": {
    "@types/react-native-sqlite-storage": "^5.0.2"
  }
}
```

### Installation & Setup

```bash
# Install dependencies
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install @react-native-community/netinfo react-native-fs
npm install react-native-sound react-native-sqlite-storage
npm install react-native-device-info react-native-background-task

# iOS additional setup
cd ios && pod install

# Android permissions (android/app/src/main/AndroidManifest.xml)
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Database Architecture

### SQLite Schema

```sql
-- database/schema.sql

-- Core media files table
CREATE TABLE media_files_local (
  id TEXT PRIMARY KEY,
  remote_id TEXT UNIQUE NOT NULL, -- Maps to Supabase media_files.id
  local_path TEXT,
  download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed', 'paused')) DEFAULT 'pending',
  download_progress REAL DEFAULT 0, -- 0.0 to 1.0
  file_size INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,

  -- Bible content metadata
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_timings TEXT, -- JSON string of verse timing data
  chapter_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  language_entity_id TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  publish_status TEXT DEFAULT 'published',

  -- Playback state
  last_played_position REAL DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  last_accessed_at TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Batch download jobs
CREATE TABLE batch_download_jobs (
  id TEXT PRIMARY KEY,
  language_entity_id TEXT NOT NULL,
  scope TEXT CHECK (scope IN ('version', 'book', 'chapters')) NOT NULL,
  target_id TEXT, -- bookId for book/chapters scope
  chapter_ids TEXT, -- JSON array for chapters scope

  -- Progress tracking
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  total_files INTEGER DEFAULT 0,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,

  -- Metadata
  batch_size INTEGER DEFAULT 3,
  error TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

-- Individual files within batch jobs
CREATE TABLE batch_file_downloads (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT REFERENCES batch_download_jobs(id) ON DELETE CASCADE,
  media_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')) DEFAULT 'pending',
  local_path TEXT,
  error TEXT,
  download_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- App configuration and settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Download analytics for optimization
CREATE TABLE download_analytics (
  id TEXT PRIMARY KEY,
  media_file_id TEXT,
  batch_job_id TEXT,
  event_type TEXT NOT NULL, -- 'download_start', 'download_complete', 'download_failed', 'play_start'
  network_type TEXT, -- 'wifi', 'cellular', 'none'
  file_size INTEGER,
  download_duration INTEGER, -- in seconds
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_media_files_remote_id ON media_files_local(remote_id);
CREATE INDEX idx_media_files_status ON media_files_local(download_status);
CREATE INDEX idx_media_files_book_chapter ON media_files_local(book_id, chapter_number);
CREATE INDEX idx_media_files_language ON media_files_local(language_entity_id);
CREATE INDEX idx_batch_jobs_status ON batch_download_jobs(status);
CREATE INDEX idx_batch_files_job_id ON batch_file_downloads(batch_job_id);
CREATE INDEX idx_batch_files_status ON batch_file_downloads(download_status);

-- Triggers for updated_at
CREATE TRIGGER update_media_files_updated_at
  AFTER UPDATE ON media_files_local
BEGIN
  UPDATE media_files_local SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

### Database Service Implementation

```typescript
// services/Database.ts
import SQLite from 'react-native-sqlite-storage';

// Enable debugging in development
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export interface MediaFileLocal {
  id: string;
  remote_id: string;
  local_path?: string;
  download_status:
    | 'pending'
    | 'downloading'
    | 'completed'
    | 'failed'
    | 'paused';
  download_progress: number;
  file_size: number;
  downloaded_bytes: number;
  book_name: string;
  chapter_number: number;
  verse_timings?: string;
  chapter_id: string;
  book_id: string;
  language_entity_id: string;
  version: number;
  publish_status: string;
  last_played_position: number;
  play_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchDownloadJob {
  id: string;
  language_entity_id: string;
  scope: 'version' | 'book' | 'chapters';
  target_id?: string;
  chapter_ids?: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  total_files: number;
  completed_files: number;
  failed_files: number;
  total_bytes: number;
  downloaded_bytes: number;
  progress: number;
  batch_size: number;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface BatchFileDownload {
  id: string;
  batch_job_id: string;
  media_file_id: string;
  file_name: string;
  file_size: number;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  local_path?: string;
  error?: string;
  download_order: number;
  created_at: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'BibleAudio.db';
  private dbVersion = '1.0';

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        version: this.dbVersion,
        location: 'default',
      });

      await this.createTables();
      await this.runMigrations();

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      // Media files table
      `CREATE TABLE IF NOT EXISTS media_files_local (
        id TEXT PRIMARY KEY,
        remote_id TEXT UNIQUE NOT NULL,
        local_path TEXT,
        download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed', 'paused')) DEFAULT 'pending',
        download_progress REAL DEFAULT 0,
        file_size INTEGER DEFAULT 0,
        downloaded_bytes INTEGER DEFAULT 0,
        book_name TEXT NOT NULL,
        chapter_number INTEGER NOT NULL,
        verse_timings TEXT,
        chapter_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        language_entity_id TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        publish_status TEXT DEFAULT 'published',
        last_played_position REAL DEFAULT 0,
        play_count INTEGER DEFAULT 0,
        last_accessed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Batch jobs table
      `CREATE TABLE IF NOT EXISTS batch_download_jobs (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT NOT NULL,
        scope TEXT CHECK (scope IN ('version', 'book', 'chapters')) NOT NULL,
        target_id TEXT,
        chapter_ids TEXT,
        status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
        total_files INTEGER DEFAULT 0,
        completed_files INTEGER DEFAULT 0,
        failed_files INTEGER DEFAULT 0,
        total_bytes INTEGER DEFAULT 0,
        downloaded_bytes INTEGER DEFAULT 0,
        progress REAL DEFAULT 0,
        batch_size INTEGER DEFAULT 3,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT
      )`,

      // Batch file downloads table
      `CREATE TABLE IF NOT EXISTS batch_file_downloads (
        id TEXT PRIMARY KEY,
        batch_job_id TEXT REFERENCES batch_download_jobs(id) ON DELETE CASCADE,
        media_file_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        download_status TEXT CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')) DEFAULT 'pending',
        local_path TEXT,
        error TEXT,
        download_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // App settings table
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Analytics table
      `CREATE TABLE IF NOT EXISTS download_analytics (
        id TEXT PRIMARY KEY,
        media_file_id TEXT,
        batch_job_id TEXT,
        event_type TEXT NOT NULL,
        network_type TEXT,
        file_size INTEGER,
        download_duration INTEGER,
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
    ];

    for (const query of queries) {
      await this.executeQuery(query);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_media_files_remote_id ON media_files_local(remote_id)',
      'CREATE INDEX IF NOT EXISTS idx_media_files_status ON media_files_local(download_status)',
      'CREATE INDEX IF NOT EXISTS idx_media_files_book_chapter ON media_files_local(book_id, chapter_number)',
      'CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_download_jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_batch_files_job_id ON batch_file_downloads(batch_job_id)',
    ];

    for (const index of indexes) {
      await this.executeQuery(index);
    }
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (tx, results) => resolve(results),
          (tx, error) => {
            console.error('SQL Error:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Media Files Operations
  async getMediaFile(remoteId: string): Promise<MediaFileLocal | null> {
    const result = await this.executeQuery(
      'SELECT * FROM media_files_local WHERE remote_id = ?',
      [remoteId]
    );

    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  async upsertMediaFile(
    mediaFile: Partial<MediaFileLocal> & { remote_id: string }
  ): Promise<void> {
    const existing = await this.getMediaFile(mediaFile.remote_id);

    if (existing) {
      await this.updateMediaFile(mediaFile.remote_id, mediaFile);
    } else {
      await this.insertMediaFile(mediaFile as MediaFileLocal);
    }
  }

  async insertMediaFile(
    mediaFile: Partial<MediaFileLocal> & { remote_id: string }
  ): Promise<void> {
    const id =
      mediaFile.id ||
      `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.executeQuery(
      `INSERT INTO media_files_local (
        id, remote_id, local_path, download_status, download_progress,
        file_size, downloaded_bytes, book_name, chapter_number, verse_timings,
        chapter_id, book_id, language_entity_id, version, publish_status,
        last_played_position, play_count, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mediaFile.remote_id,
        mediaFile.local_path,
        mediaFile.download_status || 'pending',
        mediaFile.download_progress || 0,
        mediaFile.file_size || 0,
        mediaFile.downloaded_bytes || 0,
        mediaFile.book_name,
        mediaFile.chapter_number,
        mediaFile.verse_timings,
        mediaFile.chapter_id,
        mediaFile.book_id,
        mediaFile.language_entity_id,
        mediaFile.version || 1,
        mediaFile.publish_status || 'published',
        mediaFile.last_played_position || 0,
        mediaFile.play_count || 0,
        mediaFile.last_accessed_at,
      ]
    );
  }

  async updateMediaFile(
    remoteId: string,
    updates: Partial<MediaFileLocal>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'remote_id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => key !== 'remote_id')
      .map(key => updates[key as keyof MediaFileLocal]);

    await this.executeQuery(
      `UPDATE media_files_local SET ${setClause}, updated_at = datetime('now') WHERE remote_id = ?`,
      [...values, remoteId]
    );
  }

  async deleteMediaFile(remoteId: string): Promise<void> {
    await this.executeQuery(
      'DELETE FROM media_files_local WHERE remote_id = ?',
      [remoteId]
    );
  }

  async getDownloadedFiles(): Promise<MediaFileLocal[]> {
    const result = await this.executeQuery(
      'SELECT * FROM media_files_local WHERE download_status = ? ORDER BY book_name, chapter_number',
      ['completed']
    );

    const files = [];
    for (let i = 0; i < result.rows.length; i++) {
      files.push(result.rows.item(i));
    }
    return files;
  }

  async getOldestFiles(limit: number): Promise<MediaFileLocal[]> {
    const result = await this.executeQuery(
      'SELECT * FROM media_files_local WHERE download_status = ? ORDER BY last_accessed_at ASC LIMIT ?',
      ['completed', limit]
    );

    const files = [];
    for (let i = 0; i < result.rows.length; i++) {
      files.push(result.rows.item(i));
    }
    return files;
  }

  // Batch Jobs Operations
  async createBatchJob(
    job: Partial<BatchDownloadJob> & { id: string }
  ): Promise<void> {
    await this.executeQuery(
      `INSERT INTO batch_download_jobs (
        id, language_entity_id, scope, target_id, chapter_ids, status,
        total_files, completed_files, failed_files, total_bytes, downloaded_bytes,
        progress, batch_size, error, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.language_entity_id,
        job.scope,
        job.target_id,
        job.chapter_ids,
        job.status || 'pending',
        job.total_files || 0,
        job.completed_files || 0,
        job.failed_files || 0,
        job.total_bytes || 0,
        job.downloaded_bytes || 0,
        job.progress || 0,
        job.batch_size || 3,
        job.error,
        job.started_at,
        job.completed_at,
      ]
    );
  }

  async updateBatchJob(
    id: string,
    updates: Partial<BatchDownloadJob>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => updates[key as keyof BatchDownloadJob]);

    await this.executeQuery(
      `UPDATE batch_download_jobs SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
  }

  async getBatchJob(id: string): Promise<BatchDownloadJob | null> {
    const result = await this.executeQuery(
      'SELECT * FROM batch_download_jobs WHERE id = ?',
      [id]
    );
    return result.rows.length > 0 ? result.rows.item(0) : null;
  }

  async getAllBatchJobs(): Promise<BatchDownloadJob[]> {
    const result = await this.executeQuery(
      'SELECT * FROM batch_download_jobs ORDER BY created_at DESC'
    );

    const jobs = [];
    for (let i = 0; i < result.rows.length; i++) {
      jobs.push(result.rows.item(i));
    }
    return jobs;
  }

  async deleteBatchJob(id: string): Promise<void> {
    await this.executeQuery('DELETE FROM batch_download_jobs WHERE id = ?', [
      id,
    ]);
  }

  // Batch File Downloads Operations
  async createBatchFileDownload(
    file: Partial<BatchFileDownload> & { id: string }
  ): Promise<void> {
    await this.executeQuery(
      `INSERT INTO batch_file_downloads (
        id, batch_job_id, media_file_id, file_name, file_size,
        download_status, local_path, error, download_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        file.batch_job_id,
        file.media_file_id,
        file.file_name,
        file.file_size || 0,
        file.download_status || 'pending',
        file.local_path,
        file.error,
        file.download_order || 0,
      ]
    );
  }

  async updateBatchFileDownload(
    mediaFileId: string,
    updates: Partial<BatchFileDownload>
  ): Promise<void> {
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updates).map(
      key => updates[key as keyof BatchFileDownload]
    );

    await this.executeQuery(
      `UPDATE batch_file_downloads SET ${setClause} WHERE media_file_id = ?`,
      [...values, mediaFileId]
    );
  }

  async getBatchFiles(batchJobId: string): Promise<BatchFileDownload[]> {
    const result = await this.executeQuery(
      'SELECT * FROM batch_file_downloads WHERE batch_job_id = ? ORDER BY download_order',
      [batchJobId]
    );

    const files = [];
    for (let i = 0; i < result.rows.length; i++) {
      files.push(result.rows.item(i));
    }
    return files;
  }

  async getBatchFailedFiles(batchJobId: string): Promise<BatchFileDownload[]> {
    const result = await this.executeQuery(
      'SELECT * FROM batch_file_downloads WHERE batch_job_id = ? AND download_status = ? ORDER BY download_order',
      [batchJobId, 'failed']
    );

    const files = [];
    for (let i = 0; i < result.rows.length; i++) {
      files.push(result.rows.item(i));
    }
    return files;
  }

  // Settings Operations
  async getSetting(key: string): Promise<string | null> {
    const result = await this.executeQuery(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return result.rows.length > 0 ? result.rows.item(0).value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.executeQuery(
      'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
      [key, value]
    );
  }

  // Analytics Operations
  async recordAnalyticsEvent(event: {
    media_file_id?: string;
    batch_job_id?: string;
    event_type: string;
    network_type?: string;
    file_size?: number;
    download_duration?: number;
    error_message?: string;
  }): Promise<void> {
    const id = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.executeQuery(
      `INSERT INTO download_analytics (
        id, media_file_id, batch_job_id, event_type, network_type,
        file_size, download_duration, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.media_file_id,
        event.batch_job_id,
        event.event_type,
        event.network_type,
        event.file_size,
        event.download_duration,
        event.error_message,
      ]
    );
  }

  // Utility Methods
  async getStorageUsage(): Promise<{ totalFiles: number; totalBytes: number }> {
    const result = await this.executeQuery(
      'SELECT COUNT(*) as count, SUM(file_size) as size FROM media_files_local WHERE download_status = ?',
      ['completed']
    );

    const row = result.rows.item(0);
    return {
      totalFiles: row.count || 0,
      totalBytes: row.size || 0,
    };
  }

  async cleanupOldAnalytics(daysOld: number = 30): Promise<void> {
    await this.executeQuery(
      'DELETE FROM download_analytics WHERE created_at < datetime("now", "-? days")',
      [daysOld]
    );
  }

  private async runMigrations(): Promise<void> {
    // Implement database migrations here as your schema evolves
    const currentVersion = await this.getSetting('db_version');

    if (!currentVersion) {
      await this.setSetting('db_version', '1.0');
    }

    // Future migrations would go here
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const database = new DatabaseService();
```

## Supabase Configuration

### Supabase Client Setup

```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'bible-audio-app',
    },
  },
});

// Auth helpers
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getAuthToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};
```

## Network Management

### Network Status Service

```typescript
// services/NetworkManager.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isWifiEnabled: boolean;
  isCellularEnabled: boolean;
  isInternetReachable: boolean | null;
}

class NetworkManager {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    isConnected: false,
    type: 'none',
    isWifiEnabled: false,
    isCellularEnabled: false,
    isInternetReachable: null,
  };

  async initialize(): Promise<void> {
    // Get initial state
    const state = await NetInfo.fetch();
    this.updateStatus(state);

    // Listen for changes
    NetInfo.addEventListener(this.updateStatus.bind(this));
  }

  private updateStatus(state: NetInfoState): void {
    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      type: this.mapNetworkType(state.type),
      isWifiEnabled: state.type === 'wifi' && state.isConnected === true,
      isCellularEnabled:
        state.type === 'cellular' && state.isConnected === true,
      isInternetReachable: state.isInternetReachable,
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  private mapNetworkType(
    type: string
  ): 'wifi' | 'cellular' | 'none' | 'unknown' {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'none':
        return 'none';
      default:
        return 'unknown';
    }
  }

  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async canDownload(requireWifi: boolean = false): Promise<boolean> {
    const status = await NetInfo.fetch();

    if (!status.isConnected) return false;
    if (requireWifi && status.type !== 'wifi') return false;

    return true;
  }

  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => resolve(false), timeout);

      const unsubscribe = this.addListener(status => {
        if (status.isConnected) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });

      // Check current status
      if (this.currentStatus.isConnected) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });
  }
}

export const networkManager = new NetworkManager();
```

## Utility Functions

### Audio Utilities

```typescript
// utils/audioUtils.ts
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export const AUDIO_FORMATS = {
  M4A: 'audio/mp4',
  MP3: 'audio/mpeg',
  WAV: 'audio/wav',
} as const;

export const AUDIO_DIRECTORY = `${RNFS.DocumentDirectoryPath}/bible_audio`;

/**
 * Ensure audio directory exists
 */
export const ensureAudioDirectory = async (): Promise<void> => {
  const exists = await RNFS.exists(AUDIO_DIRECTORY);
  if (!exists) {
    await RNFS.mkdir(AUDIO_DIRECTORY);
  }
};

/**
 * Get safe filename for the platform
 */
export const getSafeFileName = (
  bookName: string,
  chapterNumber: number
): string => {
  const safeName = `${bookName}-${chapterNumber}`.replace(
    /[^a-zA-Z0-9.-]/g,
    '_'
  );
  return `${safeName}.m4a`;
};

/**
 * Format duration in seconds to MM:SS
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format file size in bytes to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Calculate download speed
 */
export const calculateDownloadSpeed = (
  bytes: number,
  seconds: number
): string => {
  if (seconds === 0) return '0 B/s';

  const bytesPerSecond = bytes / seconds;
  return `${formatFileSize(bytesPerSecond)}/s`;
};

/**
 * Estimate remaining time
 */
export const estimateRemainingTime = (
  downloadedBytes: number,
  totalBytes: number,
  elapsedSeconds: number
): number => {
  if (downloadedBytes === 0 || elapsedSeconds === 0) return 0;

  const speed = downloadedBytes / elapsedSeconds;
  const remainingBytes = totalBytes - downloadedBytes;

  return Math.ceil(remainingBytes / speed);
};

/**
 * Validate audio file
 */
export const validateAudioFile = async (filePath: string): Promise<boolean> => {
  try {
    const exists = await RNFS.exists(filePath);
    if (!exists) return false;

    const stats = await RNFS.stat(filePath);
    return stats.size > 0;
  } catch {
    return false;
  }
};

/**
 * Get audio file info
 */
export const getAudioFileInfo = async (
  filePath: string
): Promise<{
  size: number;
  exists: boolean;
  lastModified: Date;
} | null> => {
  try {
    const exists = await RNFS.exists(filePath);
    if (!exists) return { size: 0, exists: false, lastModified: new Date() };

    const stats = await RNFS.stat(filePath);
    return {
      size: stats.size,
      exists: true,
      lastModified: new Date(stats.mtime),
    };
  } catch {
    return null;
  }
};
```

### File Management Utilities

```typescript
// utils/fileUtils.ts
import RNFS from 'react-native-fs';
import { getFreeDiskStorage } from 'react-native-device-info';

export const FILE_SIZE_LIMITS = {
  SINGLE_FILE_MAX: 100 * 1024 * 1024, // 100MB
  BATCH_SIZE_MAX: 1024 * 1024 * 1024, // 1GB
  FREE_SPACE_BUFFER: 500 * 1024 * 1024, // 500MB buffer
} as const;

/**
 * Check if there's enough storage space
 */
export const checkAvailableStorage = async (
  requiredBytes: number
): Promise<{
  hasSpace: boolean;
  freeBytes: number;
  requiredBytes: number;
}> => {
  const freeBytes = await getFreeDiskStorage();
  const hasSpace =
    freeBytes > requiredBytes + FILE_SIZE_LIMITS.FREE_SPACE_BUFFER;

  return {
    hasSpace,
    freeBytes,
    requiredBytes,
  };
};

/**
 * Clean up temporary files
 */
export const cleanupTempFiles = async (): Promise<void> => {
  const tempDir = `${RNFS.CachesDirectoryPath}/audio_temp`;

  try {
    const exists = await RNFS.exists(tempDir);
    if (exists) {
      await RNFS.unlink(tempDir);
    }
  } catch (error) {
    console.warn('Failed to cleanup temp files:', error);
  }
};

/**
 * Copy file with progress
 */
export const copyFileWithProgress = async (
  sourcePath: string,
  destPath: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const stats = await RNFS.stat(sourcePath);
  const totalSize = stats.size;
  let copiedSize = 0;

  return new Promise((resolve, reject) => {
    const reader = RNFS.createReadStream(sourcePath, { bufferSize: 4096 });
    const writer = RNFS.createWriteStream(destPath);

    reader.on('data', chunk => {
      copiedSize += chunk.length;
      const progress = copiedSize / totalSize;
      onProgress?.(progress);
    });

    reader.on('end', () => {
      writer.close();
      resolve();
    });

    reader.on('error', reject);
    writer.on('error', reject);

    reader.pipe(writer);
  });
};

/**
 * Calculate directory size
 */
export const getDirectorySize = async (dirPath: string): Promise<number> => {
  try {
    const files = await RNFS.readDir(dirPath);
    let totalSize = 0;

    for (const file of files) {
      if (file.isFile()) {
        totalSize += file.size;
      } else if (file.isDirectory()) {
        totalSize += await getDirectorySize(file.path);
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
};

/**
 * Create safe backup of file
 */
export const createFileBackup = async (filePath: string): Promise<string> => {
  const backupPath = `${filePath}.backup`;
  await RNFS.copyFile(filePath, backupPath);
  return backupPath;
};

/**
 * Restore file from backup
 */
export const restoreFromBackup = async (
  originalPath: string
): Promise<void> => {
  const backupPath = `${originalPath}.backup`;
  const exists = await RNFS.exists(backupPath);

  if (exists) {
    await RNFS.copyFile(backupPath, originalPath);
    await RNFS.unlink(backupPath);
  }
};
```

## React Hooks

### Network Status Hook

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { networkManager, NetworkStatus } from '../services/NetworkManager';

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(
    networkManager.getStatus()
  );

  useEffect(() => {
    const unsubscribe = networkManager.addListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
};
```

### Storage Management Hook

```typescript
// hooks/useStorageManagement.ts
import { useState, useEffect } from 'react';
import { database } from '../services/Database';
import { getDirectorySize } from '../utils/fileUtils';
import { AUDIO_DIRECTORY } from '../utils/audioUtils';

export const useStorageManagement = () => {
  const [storageInfo, setStorageInfo] = useState({
    totalFiles: 0,
    totalBytes: 0,
    directorySize: 0,
  });

  const refreshStorageInfo = async () => {
    const dbInfo = await database.getStorageUsage();
    const dirSize = await getDirectorySize(AUDIO_DIRECTORY);

    setStorageInfo({
      totalFiles: dbInfo.totalFiles,
      totalBytes: dbInfo.totalBytes,
      directorySize: dirSize,
    });
  };

  useEffect(() => {
    refreshStorageInfo();
  }, []);

  return {
    storageInfo,
    refreshStorageInfo,
  };
};
```

## Error Handling Patterns

### Global Error Handler

```typescript
// utils/errorHandler.ts
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

class ErrorHandler {
  private errorListeners: ((error: AppError) => void)[] = [];

  handleError(error: unknown, context?: string): AppError {
    const appError = this.parseError(error, context);

    // Log error
    console.error('App Error:', appError);

    // Notify listeners
    this.errorListeners.forEach(listener => listener(appError));

    return appError;
  }

  private parseError(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return {
        code: this.getErrorCode(error.message),
        message: error.message,
        details: { context, stack: error.stack },
        timestamp: new Date(),
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      details: { context },
      timestamp: new Date(),
    };
  }

  private getErrorCode(message: string): string {
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_CODES.NETWORK_ERROR;
    }
    if (message.includes('storage') || message.includes('space')) {
      return ERROR_CODES.STORAGE_ERROR;
    }
    if (message.includes('auth') || message.includes('token')) {
      return ERROR_CODES.AUTH_ERROR;
    }
    if (message.includes('file') || message.includes('path')) {
      return ERROR_CODES.FILE_ERROR;
    }
    if (message.includes('database') || message.includes('SQL')) {
      return ERROR_CODES.DATABASE_ERROR;
    }

    return 'UNKNOWN_ERROR';
  }

  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);

    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }
}

export const errorHandler = new ErrorHandler();
```

## App Initialization

### Main App Setup

```typescript
// App.tsx initialization pattern
import { useEffect } from 'react';
import { database } from './services/Database';
import { networkManager } from './services/NetworkManager';
import { errorHandler } from './utils/errorHandler';

export const App = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await database.initialize();

      // Initialize network manager
      await networkManager.initialize();

      // Set up global error handling
      errorHandler.addErrorListener(error => {
        // Handle global errors
        console.error('Global error:', error);
      });

      console.log('App initialized successfully');
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  };

  // Rest of your app...
};
```

This comprehensive architecture provides a solid foundation for implementing both single and bulk Bible audio downloads with offline-first functionality, proper error handling, and production-ready patterns.
