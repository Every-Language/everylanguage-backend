# Database Schema & Sync Strategy

## Overview

This document outlines the database schema extensions required for the offline Bible distribution system and the Last-Writer-Wins (LWW) sync strategy for maintaining consistency between offline imports and server data.

## Local SQLite Schema Extensions

### Package Tracking Tables

```sql
-- Package tracking table for imported/exported packages
CREATE TABLE IF NOT EXISTS local_packages (
  id TEXT PRIMARY KEY,                    -- Package ID from manifest
  package_type TEXT NOT NULL,             -- 'audio', 'text', 'combined'
  language_entity_id TEXT NOT NULL,
  audio_version_id TEXT,                  -- NULL for text-only packages
  text_version_id TEXT,                   -- NULL for audio-only packages
  version TEXT NOT NULL,                  -- Package version
  imported_at TEXT NOT NULL,              -- ISO timestamp
  last_synced_at TEXT,                    -- ISO timestamp of last sync
  sync_status TEXT DEFAULT 'pending',     -- 'pending', 'synced', 'failed', 'conflict'
  local_size_mb REAL,                     -- Package size in MB
  source TEXT NOT NULL,                   -- 'download', 'import', 'share'
  manifest_json TEXT,                     -- Full manifest as JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sync tracking for debugging and analytics
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id TEXT NOT NULL,
  sync_type TEXT NOT NULL,               -- 'incremental', 'full', 'upload'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,                  -- 'running', 'completed', 'failed'
  changes_count INTEGER DEFAULT 0,
  error_message TEXT,
  details_json TEXT,                     -- Additional sync details
  FOREIGN KEY (package_id) REFERENCES local_packages(id)
);

-- Record-level sync tracking
CREATE TABLE IF NOT EXISTS record_sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending',   -- 'pending', 'synced', 'conflict'
  local_updated_at TEXT,
  server_updated_at TEXT,
  conflict_resolution TEXT,             -- 'local_wins', 'server_wins', 'manual'
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (table_name, record_id)
);
```

### Enhanced Main Tables

```sql
-- Add sync-related columns to existing tables
ALTER TABLE media_files ADD COLUMN local_path TEXT;
ALTER TABLE media_files ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE media_files ADD COLUMN last_synced_at TEXT;
ALTER TABLE media_files ADD COLUMN local_updated_at TEXT;
ALTER TABLE media_files ADD COLUMN import_source TEXT; -- Track import source

ALTER TABLE verse_texts ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE verse_texts ADD COLUMN last_synced_at TEXT;
ALTER TABLE verse_texts ADD COLUMN local_updated_at TEXT;
ALTER TABLE verse_texts ADD COLUMN import_source TEXT;

ALTER TABLE media_files_verses ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE media_files_verses ADD COLUMN last_synced_at TEXT;
ALTER TABLE media_files_verses ADD COLUMN local_updated_at TEXT;
ALTER TABLE media_files_verses ADD COLUMN import_source TEXT;

ALTER TABLE audio_versions ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE audio_versions ADD COLUMN last_synced_at TEXT;
ALTER TABLE audio_versions ADD COLUMN local_updated_at TEXT;
ALTER TABLE audio_versions ADD COLUMN import_source TEXT;

ALTER TABLE text_versions ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE text_versions ADD COLUMN last_synced_at TEXT;
ALTER TABLE text_versions ADD COLUMN local_updated_at TEXT;
ALTER TABLE text_versions ADD COLUMN import_source TEXT;
```

### Indexes for Performance

```sql
-- Indexes for sync operations
CREATE INDEX IF NOT EXISTS idx_local_packages_sync_status ON local_packages(sync_status);
CREATE INDEX IF NOT EXISTS idx_local_packages_type_language ON local_packages(package_type, language_entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_package_status ON sync_log(package_id, status);
CREATE INDEX IF NOT EXISTS idx_record_sync_status_table ON record_sync_status(table_name, sync_status);

-- Indexes for main table sync columns
CREATE INDEX IF NOT EXISTS idx_media_files_sync_status ON media_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_media_files_last_synced ON media_files(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_verse_texts_sync_status ON verse_texts(sync_status);
CREATE INDEX IF NOT EXISTS idx_verse_texts_last_synced ON verse_texts(last_synced_at);
```

## Server-Side Schema Extensions

### Change Tracking Tables

```sql
-- Change log for tracking all modifications
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL,              -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,                       -- Previous record state
  new_data JSONB,                       -- New record state
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_source TEXT DEFAULT 'api'     -- 'api', 'migration', 'sync', 'import'
);

-- Package generation tracking
CREATE TABLE package_generations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  package_id TEXT NOT NULL,
  package_type TEXT NOT NULL,
  audio_version_id UUID REFERENCES audio_versions(id) ON DELETE CASCADE,
  text_version_id UUID REFERENCES text_versions(id) ON DELETE CASCADE,
  language_entity_id UUID REFERENCES language_entities(id) ON DELETE CASCADE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  file_size_bytes BIGINT,
  generation_time_seconds INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE
);

-- Sync session tracking
CREATE TABLE sync_sessions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT,
  package_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',         -- 'active', 'completed', 'failed'
  changes_downloaded INTEGER DEFAULT 0,
  changes_uploaded INTEGER DEFAULT 0,
  error_message TEXT
);
```

### Triggers for Change Tracking

```sql
-- Function to log changes
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log changes to main content tables
  IF TG_TABLE_NAME IN ('audio_versions', 'text_versions', 'media_files', 'verse_texts', 'media_files_verses') THEN

    IF TG_OP = 'DELETE' THEN
      INSERT INTO change_log (table_name, record_id, operation, old_data, changed_by, change_source)
      VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), OLD.updated_by, 'api');
      RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
      -- Only log if there are actual changes
      IF OLD IS DISTINCT FROM NEW THEN
        INSERT INTO change_log (table_name, record_id, operation, old_data, new_data, changed_by, change_source)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by, 'api');
      END IF;
      RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
      INSERT INTO change_log (table_name, record_id, operation, new_data, changed_by, change_source)
      VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), NEW.created_by, 'api');
      RETURN NEW;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all main tables
CREATE TRIGGER audio_versions_change_log
  AFTER INSERT OR UPDATE OR DELETE ON audio_versions
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER text_versions_change_log
  AFTER INSERT OR UPDATE OR DELETE ON text_versions
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER media_files_change_log
  AFTER INSERT OR UPDATE OR DELETE ON media_files
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER verse_texts_change_log
  AFTER INSERT OR UPDATE OR DELETE ON verse_texts
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();

CREATE TRIGGER media_files_verses_change_log
  AFTER INSERT OR UPDATE OR DELETE ON media_files_verses
  FOR EACH ROW EXECUTE FUNCTION log_table_changes();
```

## Last-Writer-Wins (LWW) Sync Strategy

### Core Principles

1. **Timestamp-Based Resolution**: Use `updated_at` timestamps to determine the most recent version
2. **Granular Sync**: Sync individual records, not entire packages
3. **Conflict Handling**: Server timestamp always wins when there's a conflict
4. **Graceful Degradation**: Continue syncing other records if some fail

### Sync Algorithm

```typescript
interface SyncRecord {
  table: string;
  recordId: string;
  localRecord: any;
  serverRecord: any;
  localTimestamp: string;
  serverTimestamp: string;
}

class LWWSyncEngine {
  async performSync(packageId: string): Promise<SyncResult> {
    const syncSession = await this.startSyncSession(packageId);

    try {
      // 1. Get all local records that need syncing
      const localRecords = await this.getLocalRecordsToSync(packageId);

      // 2. Get corresponding server records
      const serverRecords = await this.getServerRecords(localRecords);

      // 3. Determine conflicts and resolutions
      const syncPlan = this.createSyncPlan(localRecords, serverRecords);

      // 4. Apply changes
      const results = await this.applySyncPlan(syncPlan);

      // 5. Update sync timestamps
      await this.updateSyncTimestamps(packageId, results);

      await this.completeSyncSession(syncSession.id, results);
      return { success: true, changes: results.length };
    } catch (error) {
      await this.failSyncSession(syncSession.id, error.message);
      throw error;
    }
  }

  private createSyncPlan(
    localRecords: any[],
    serverRecords: any[]
  ): SyncRecord[] {
    const syncPlan: SyncRecord[] = [];

    // Create lookup for server records
    const serverLookup = new Map();
    serverRecords.forEach(record => {
      const key = `${record.table}_${record.id}`;
      serverLookup.set(key, record);
    });

    // Process each local record
    localRecords.forEach(localRecord => {
      const key = `${localRecord.table}_${localRecord.id}`;
      const serverRecord = serverLookup.get(key);

      if (!serverRecord) {
        // Local-only record - upload to server
        syncPlan.push({
          table: localRecord.table,
          recordId: localRecord.id,
          localRecord,
          serverRecord: null,
          localTimestamp: localRecord.updated_at,
          serverTimestamp: null,
          action: 'upload',
        });
      } else {
        // Compare timestamps
        const localTime = new Date(localRecord.updated_at);
        const serverTime = new Date(serverRecord.updated_at);

        if (serverTime > localTime) {
          // Server is newer - download
          syncPlan.push({
            table: localRecord.table,
            recordId: localRecord.id,
            localRecord,
            serverRecord,
            localTimestamp: localRecord.updated_at,
            serverTimestamp: serverRecord.updated_at,
            action: 'download',
          });
        } else if (localTime > serverTime) {
          // Local is newer - upload
          syncPlan.push({
            table: localRecord.table,
            recordId: localRecord.id,
            localRecord,
            serverRecord,
            localTimestamp: localRecord.updated_at,
            serverTimestamp: serverRecord.updated_at,
            action: 'upload',
          });
        }
        // If timestamps are equal, no sync needed
      }

      // Remove from server lookup to identify server-only records
      serverLookup.delete(key);
    });

    // Process server-only records
    serverLookup.forEach(serverRecord => {
      syncPlan.push({
        table: serverRecord.table,
        recordId: serverRecord.id,
        localRecord: null,
        serverRecord,
        localTimestamp: null,
        serverTimestamp: serverRecord.updated_at,
        action: 'download',
      });
    });

    return syncPlan;
  }

  private async applySyncPlan(syncPlan: SyncRecord[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const syncRecord of syncPlan) {
      try {
        switch (syncRecord.action) {
          case 'download':
            await this.downloadRecord(syncRecord);
            results.push({
              recordId: syncRecord.recordId,
              table: syncRecord.table,
              action: 'downloaded',
              success: true,
            });
            break;

          case 'upload':
            await this.uploadRecord(syncRecord);
            results.push({
              recordId: syncRecord.recordId,
              table: syncRecord.table,
              action: 'uploaded',
              success: true,
            });
            break;
        }
      } catch (error) {
        results.push({
          recordId: syncRecord.recordId,
          table: syncRecord.table,
          action: syncRecord.action,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}
```

### Sync Conflict Resolution

#### Media Files

```typescript
async function syncMediaFile(
  localRecord: any,
  serverRecord: any
): Promise<void> {
  const serverNewer =
    new Date(serverRecord.updated_at) > new Date(localRecord.updated_at);

  if (serverNewer) {
    // Server version is newer
    await this.updateLocalMediaFile(serverRecord);

    // Check if we need to download new audio file
    if (serverRecord.remote_path !== localRecord.remote_path) {
      await this.downloadAudioFile(serverRecord);
    }
  } else {
    // Local version is newer - upload to server
    await this.uploadMediaFileChanges(localRecord);
  }
}
```

#### Verse Texts

```typescript
async function syncVerseText(
  localRecord: any,
  serverRecord: any
): Promise<void> {
  const serverNewer =
    new Date(serverRecord.updated_at) > new Date(localRecord.updated_at);

  if (serverNewer) {
    // Replace local with server version
    await this.updateLocalVerseText(serverRecord);
  } else {
    // Upload local changes to server
    await this.uploadVerseTextChanges(localRecord);
  }
}
```

#### Verse Timings

```typescript
async function syncVerseTimings(
  localRecord: any,
  serverRecord: any
): Promise<void> {
  // For verse timings, always prefer server version if there's a conflict
  // since these are typically generated by audio processing algorithms
  const serverNewer =
    new Date(serverRecord.updated_at) > new Date(localRecord.updated_at);

  if (serverNewer) {
    await this.updateLocalVerseTiming(serverRecord);
  }
  // Note: We typically don't upload verse timing changes from client
}
```

## Performance Optimizations

### Incremental Sync Queries

```sql
-- Get records that need syncing (haven't been synced or are newer than last sync)
SELECT * FROM media_files
WHERE (last_synced_at IS NULL OR updated_at > last_synced_at)
  AND audio_version_id = ?
ORDER BY updated_at DESC;

-- Get changes since specific timestamp
SELECT * FROM change_log
WHERE table_name = ?
  AND changed_at > ?
  AND record_id IN (
    SELECT id FROM media_files WHERE audio_version_id = ?
  )
ORDER BY changed_at ASC;
```

### Batch Operations

```typescript
// Batch update sync timestamps
async function updateSyncTimestamps(records: SyncResult[]): Promise<void> {
  const now = new Date().toISOString();

  // Group by table for efficient updates
  const tableGroups = records.reduce((groups, record) => {
    if (!groups[record.table]) groups[record.table] = [];
    groups[record.table].push(record.recordId);
    return groups;
  }, {});

  // Update each table in batch
  for (const [table, recordIds] of Object.entries(tableGroups)) {
    await this.batchUpdateSyncTimestamp(table, recordIds, now);
  }
}
```

## Error Handling & Recovery

### Partial Sync Recovery

```typescript
async function recoverFromPartialSync(sessionId: string): Promise<void> {
  // Get incomplete sync session
  const session = await this.getSyncSession(sessionId);

  // Get records that were supposed to be synced
  const pendingRecords = await this.getPendingSyncRecords(session.packageId);

  // Retry failed records
  for (const record of pendingRecords) {
    try {
      await this.syncRecord(record);
    } catch (error) {
      // Log error but continue with other records
      await this.logSyncError(record.id, error.message);
    }
  }
}
```

### Conflict Detection & Resolution

```typescript
interface ConflictResolution {
  strategy: 'server_wins' | 'local_wins' | 'merge' | 'manual';
  reason: string;
  resolvedRecord: any;
}

async function detectAndResolveConflicts(
  localRecord: any,
  serverRecord: any
): Promise<ConflictResolution> {
  // Check for timestamp conflicts
  const localTime = new Date(localRecord.updated_at);
  const serverTime = new Date(serverRecord.updated_at);
  const timeDiff = Math.abs(localTime.getTime() - serverTime.getTime());

  // If timestamps are very close (within 1 second), check content
  if (timeDiff < 1000) {
    const contentDifferent = this.compareRecordContent(
      localRecord,
      serverRecord
    );

    if (contentDifferent) {
      // Manual resolution required for near-simultaneous edits
      return {
        strategy: 'manual',
        reason: 'Simultaneous edits detected',
        resolvedRecord: null,
      };
    }
  }

  // Default LWW strategy
  return {
    strategy: serverTime > localTime ? 'server_wins' : 'local_wins',
    reason: 'Last writer wins by timestamp',
    resolvedRecord: serverTime > localTime ? serverRecord : localRecord,
  };
}
```

## Monitoring & Analytics

### Sync Metrics Collection

```sql
-- Create view for sync analytics
CREATE VIEW sync_analytics AS
SELECT
  DATE(started_at) as sync_date,
  COUNT(*) as total_syncs,
  AVG(changes_downloaded + changes_uploaded) as avg_changes,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_syncs,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM sync_sessions
GROUP BY DATE(started_at)
ORDER BY sync_date DESC;
```

### Sync Health Monitoring

```typescript
async function monitorSyncHealth(): Promise<SyncHealthReport> {
  const report = {
    pendingPackages: await this.countPendingPackages(),
    failedSyncs: await this.countFailedSyncs(),
    oldestPendingSync: await this.getOldestPendingSync(),
    averageSyncTime: await this.getAverageSyncTime(),
    conflictRate: await this.getConflictRate(),
  };

  // Alert if sync health is poor
  if (report.pendingPackages > 100 || report.failedSyncs > 10) {
    await this.sendSyncHealthAlert(report);
  }

  return report;
}
```

This sync strategy ensures data consistency while providing robust offline functionality and efficient network usage for Bible distribution scenarios.
