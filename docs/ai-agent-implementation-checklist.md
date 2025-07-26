# AI Agent Implementation Checklist

## Quick Implementation Steps

### Phase 1: Setup (5 minutes)

1. **Install dependencies:**

   ```bash
   npm install react-dropzone
   ```

2. **Create types file** (`types/upload.ts`):

   ```typescript
   export interface BibleChapterUploadRequest {
     fileName: string;
     languageEntityId: string;
     chapterId: string;
     startVerseId: string;
     endVerseId: string;
     durationSeconds: number;
     audioVersionId: string;
     verseTimings?: Array<{
       verseId: string;
       startTime: number;
       endTime: number;
     }>;
     tagIds?: string[];
   }

   export interface MediaFileRecord {
     mediaFileId: string;
     fileName: string;
     status: 'pending' | 'uploading' | 'completed' | 'failed';
     version: number;
     error?: string;
   }
   ```

### Phase 2: Core Service (10 minutes)

3. **Create upload service** (`services/bulkUploadService.ts`):

   ```typescript
   import { createClient } from '@supabase/supabase-js';

   class BulkUploadService {
     private supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );

     async uploadBulkFiles(
       files: File[],
       metadata: BibleChapterUploadRequest[]
     ) {
       const {
         data: { session },
       } = await this.supabase.auth.getSession();
       const formData = new FormData();

       files.forEach((file, index) => {
         formData.append(`file_${index}`, file);
         formData.append(`metadata_${index}`, JSON.stringify(metadata[index]));
       });

       const response = await fetch(
         `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-bible-chapter-audio-bulk`,
         {
           method: 'POST',
           body: formData,
           headers: { Authorization: `Bearer ${session.access_token}` },
         }
       );
       return response.json();
     }

     async getUploadProgress(mediaFileIds: string[]) {
       const {
         data: { session },
       } = await this.supabase.auth.getSession();
       const response = await fetch(
         `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-upload-progress`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             Authorization: `Bearer ${session.access_token}`,
           },
           body: JSON.stringify({ mediaFileIds }),
         }
       );
       return response.json();
     }
   }

   export const bulkUploadService = new BulkUploadService();
   ```

### Phase 3: Progress Hook (5 minutes)

4. **Create progress hook** (`hooks/useUploadProgress.ts`):

   ```typescript
   import { useState, useEffect, useCallback } from 'react';
   import { bulkUploadService } from '../services/bulkUploadService';

   export const useUploadProgress = (mediaFileIds: string[]) => {
     const [progressData, setProgressData] = useState(null);
     const [isLoading, setIsLoading] = useState(false);
     const [error, setError] = useState(null);

     const checkProgress = useCallback(async () => {
       if (mediaFileIds.length === 0) return;
       setIsLoading(true);
       try {
         const response =
           await bulkUploadService.getUploadProgress(mediaFileIds);
         if (response.success) setProgressData(response.data);
       } catch (err) {
         setError(err.message);
       } finally {
         setIsLoading(false);
       }
     }, [mediaFileIds]);

     useEffect(() => {
       if (mediaFileIds.length === 0) return;
       checkProgress();
       const interval = setInterval(checkProgress, 2000);

       if (
         progressData?.progress.status === 'completed' ||
         progressData?.progress.status === 'failed'
       ) {
         clearInterval(interval);
       }

       return () => clearInterval(interval);
     }, [mediaFileIds, checkProgress, progressData?.progress.status]);

     return { progressData, isLoading, error, refetch: checkProgress };
   };
   ```

### Phase 4: Main Component (15 minutes)

5. **Create upload component** (`components/BulkUploadComponent.tsx`):

   ```typescript
   import React, { useState, useCallback } from 'react';
   import { useDropzone } from 'react-dropzone';
   import { bulkUploadService } from '../services/bulkUploadService';
   import { useUploadProgress } from '../hooks/useUploadProgress';

   export const BulkUploadComponent = ({ languageEntityId, audioVersionId, onUploadComplete }) => {
     const [selectedFiles, setSelectedFiles] = useState([]);
     const [mediaFileIds, setMediaFileIds] = useState([]);
     const [isUploading, setIsUploading] = useState(false);
     const [uploadError, setUploadError] = useState(null);

     const { progressData, error: progressError } = useUploadProgress(mediaFileIds);

     const onDrop = useCallback((acceptedFiles) => {
       const audioFiles = acceptedFiles.filter(file =>
         file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac)$/i)
       );
       setSelectedFiles(audioFiles);
     }, []);

     const { getRootProps, getInputProps, isDragActive } = useDropzone({
       onDrop,
       accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac'] },
       multiple: true,
     });

     const generateMetadata = (files) => {
       return files.map((file, index) => {
         const chapterMatch = file.name.match(/chapter[_-]?(\d+)/i) || file.name.match(/(\d+)/);
         const chapterNumber = chapterMatch ? chapterMatch[1] : String(index + 1);

         return {
           fileName: file.name,
           languageEntityId,
           audioVersionId,
           chapterId: `chapter-${chapterNumber}`,
           startVerseId: `verse-${chapterNumber}-1`,
           endVerseId: `verse-${chapterNumber}-999`,
           durationSeconds: 0,
         };
       });
     };

     const handleUpload = async () => {
       if (selectedFiles.length === 0) return;
       setIsUploading(true);
       setUploadError(null);

       try {
         const metadata = generateMetadata(selectedFiles);
         const response = await bulkUploadService.uploadBulkFiles(selectedFiles, metadata);

         if (response.success && response.data) {
           const fileIds = response.data.mediaRecords.map(record => record.mediaFileId);
           setMediaFileIds(fileIds);
           setSelectedFiles([]);
         } else {
           setUploadError(response.error || 'Upload failed');
         }
       } catch (error) {
         setUploadError(error.message);
       } finally {
         setIsUploading(false);
       }
     };

     return (
       <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
         <h2>Bulk Audio Upload</h2>

         {/* File Drop Zone */}
         {selectedFiles.length === 0 && mediaFileIds.length === 0 && (
           <div
             {...getRootProps()}
             style={{
               border: '2px dashed #ccc',
               borderRadius: '8px',
               padding: '32px',
               textAlign: 'center',
               cursor: 'pointer',
               backgroundColor: isDragActive ? '#f0f8ff' : 'white',
             }}
           >
             <input {...getInputProps()} />
             <p>{isDragActive ? 'Drop files here...' : 'Drag & drop audio files, or click to select'}</p>
           </div>
         )}

         {/* Selected Files */}
         {selectedFiles.length > 0 && (
           <div style={{ marginBottom: '24px' }}>
             <h3>Selected Files ({selectedFiles.length})</h3>
             {selectedFiles.map((file, index) => (
               <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', marginBottom: '4px' }}>
                 <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                 <button onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}>✕</button>
               </div>
             ))}
             <button
               onClick={handleUpload}
               disabled={isUploading}
               style={{ backgroundColor: '#007bff', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             >
               {isUploading ? 'Starting Upload...' : `Upload ${selectedFiles.length} Files`}
             </button>
           </div>
         )}

         {/* Progress Display */}
         {progressData && (
           <div style={{ marginBottom: '24px' }}>
             <h3>Upload Progress</h3>
             <div style={{ marginBottom: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <span>Progress</span>
                 <span>{progressData.progress.percentage}%</span>
               </div>
               <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', height: '8px' }}>
                 <div
                   style={{
                     width: `${progressData.progress.percentage}%`,
                     backgroundColor: progressData.progress.status === 'completed' ? '#28a745' : '#007bff',
                     height: '8px',
                     borderRadius: '4px',
                     transition: 'width 0.3s ease',
                   }}
                 />
               </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
               <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#fff3cd' }}>
                 <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressData.pendingCount}</div>
                 <div style={{ fontSize: '12px' }}>Pending</div>
               </div>
               <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#cce5ff' }}>
                 <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressData.uploadingCount}</div>
                 <div style={{ fontSize: '12px' }}>Uploading</div>
               </div>
               <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#d4edda' }}>
                 <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressData.completedCount}</div>
                 <div style={{ fontSize: '12px' }}>Completed</div>
               </div>
               <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8d7da' }}>
                 <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progressData.failedCount}</div>
                 <div style={{ fontSize: '12px' }}>Failed</div>
               </div>
             </div>

             {progressData.files.map(file => (
               <div key={file.mediaFileId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', marginBottom: '4px' }}>
                 <span>{file.fileName}</span>
                 <span style={{
                   padding: '2px 8px',
                   borderRadius: '4px',
                   fontSize: '12px',
                   backgroundColor: file.status === 'completed' ? '#d4edda' : file.status === 'failed' ? '#f8d7da' : file.status === 'uploading' ? '#cce5ff' : '#fff3cd'
                 }}>
                   {file.status}
                 </span>
               </div>
             ))}
           </div>
         )}

         {/* Errors */}
         {(uploadError || progressError) && (
           <div style={{ backgroundColor: '#f8d7da', padding: '12px', borderRadius: '4px', color: '#721c24' }}>
             Error: {uploadError || progressError}
           </div>
         )}
       </div>
     );
   };
   ```

### Phase 5: Integration (5 minutes)

6. **Use in your app:**

   ```typescript
   import { BulkUploadComponent } from '../components/BulkUploadComponent';

   export default function UploadPage() {
     return (
       <BulkUploadComponent
         languageEntityId="your-language-id"
         audioVersionId="your-audio-version-id"
         onUploadComplete={(results) => console.log('Done:', results)}
       />
     );
   }
   ```

7. **Environment variables** (`.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Testing Checklist

- [ ] File selection works
- [ ] Upload starts and returns media file IDs
- [ ] Progress updates every 2 seconds
- [ ] Status changes from pending → uploading → completed
- [ ] Error handling works for failed uploads
- [ ] Multiple files upload concurrently
- [ ] Progress percentages calculate correctly

## Key Customization Points

1. **File naming logic** in `generateMetadata()` - adjust for your chapter/verse ID format
2. **Progress polling interval** - currently 2 seconds
3. **Styling** - replace inline styles with your CSS framework
4. **File validation** - add size limits, file type restrictions
5. **Completion callback** - integrate with your app's workflow

## API Endpoints Used

- **Upload:** `POST /functions/v1/upload-bible-chapter-audio-bulk`
- **Progress:** `POST /functions/v1/get-upload-progress`

## Expected File Flow

1. User selects files → Shows in UI immediately
2. Click upload → Creates DB records, returns IDs
3. Background upload starts → Status = "uploading"
4. Upload completes → Status = "completed" + download URL
5. All done → Callback fired with results

This implementation provides immediate feedback, real-time progress tracking, and efficient bulk uploads without storing binary data in your database!
