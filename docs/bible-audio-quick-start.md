# Bible Audio Download - Quick Start

## TL;DR

Get presigned URLs → Download directly from B2 → Store locally

## 1. Get Download URLs (Required)

```typescript
// POST /functions/v1/get-download-urls
const response = await fetch(`${SUPABASE_URL}/functions/v1/get-download-urls`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filePaths: ['bible-audio/genesis-1.m4a', 'bible-audio/genesis-2.m4a'],
    expirationHours: 24, // 1-168 hours
  }),
});

const { urls, success } = await response.json();
```

## 2. Download Files (Direct from B2)

```typescript
// Download with progress tracking
const downloadFile = async (signedUrl: string, localPath: string) => {
  const response = await fetch(signedUrl, {
    // Supports range requests for resumable downloads
    headers: { Range: 'bytes=0-1048576' }, // Optional: partial download
  });

  const fileData = await response.arrayBuffer();
  await saveToLocal(localPath, fileData);
};
```

## 3. React Native Example

```typescript
import RNFS from 'react-native-fs';

const downloadChapter = async (filePath: string) => {
  // 1. Get signed URL
  const { urls } = await getDownloadUrls([filePath]);

  // 2. Download with progress
  const download = RNFS.downloadFile({
    fromUrl: urls[filePath],
    toFile: `${RNFS.DocumentDirectoryPath}/chapter.m4a`,
    progress: res => {
      const progress = res.bytesWritten / res.contentLength;
      console.log(`Progress: ${Math.round(progress * 100)}%`);
    },
  });

  await download.promise;
};
```

## 4. Streaming Audio

```typescript
// For immediate playback without download
import Video from 'react-native-video';

const StreamPlayer = ({ filePath }) => {
  const [streamUrl, setStreamUrl] = useState(null);

  useEffect(() => {
    getDownloadUrls([filePath], 1) // 1 hour for streaming
      .then(({ urls }) => setStreamUrl(urls[filePath]));
  }, [filePath]);

  return streamUrl ? (
    <Video source={{ uri: streamUrl }} audioOnly controls />
  ) : (
    <Text>Loading...</Text>
  );
};
```

## Key Benefits

✅ **No Database Queries** - Just auth + URL generation  
✅ **Direct B2 Downloads** - Fastest possible performance  
✅ **Range Request Support** - Resumable & streamable  
✅ **Offline-First Ready** - Cache URLs locally  
✅ **Batch Downloads** - Up to 100 files per request

## Error Handling

```typescript
try {
  const result = await getDownloadUrls(filePaths);

  if (!result.success) {
    console.error('Failed files:', result.failedFiles);
    console.error('Errors:', result.errors);
  }
} catch (error) {
  if (error.message.includes('Authentication')) {
    // Redirect to login
  } else if (error.message.includes('Maximum 100 files')) {
    // Split into smaller batches
  }
}
```

## Production Tips

- **Cache URLs** locally to avoid repeated requests
- **Batch requests** for better performance (max 100 files)
- **Use WiFi awareness** for large downloads
- **Implement retry logic** with exponential backoff
- **Set appropriate expiration** (24h for downloads, 1h for streaming)

## See Also

- [Full API Documentation](./bible-audio-download-api.md)
- [Frontend Implementation Guide](./frontend-implementation-single-chapter-audio.md)
- [Bulk Download Implementation](./bulk-upload-implementation-guide.md)
