/**
 * Test script for bulk bible chapter audio upload
 * Run this to verify the fixes are working correctly
 */

export const testBulkUpload = async () => {
  const formData = new FormData();

  // Add multiple test files with metadata
  const testFiles = [
    {
      fileName: 'genesis_1.m4a',
      languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      chapterId: 'num-4',
      audioVersionId: '0a4e7438-7815-46f2-bafd-c57b7405c8bf', // ✅ This is now included!
      startVerseId: 'num-4-3',
      endVerseId: 'num-4-7',
      durationSeconds: 120.5,
      projectId: 'your-project-id',
    },
    {
      fileName: 'genesis_2.m4a',
      languageEntityId: 'your-language-entity-id',
      chapterId: 'your-chapter-id-2',
      audioVersionId: 'your-audio-version-id', // ✅ This is now included!
      startVerseId: 'verse-2-start',
      endVerseId: 'verse-2-end',
      durationSeconds: 95.3,
      projectId: 'your-project-id',
    },
  ];

  // Add files and metadata to FormData
  testFiles.forEach((metadata, index) => {
    // Create test audio file
    const testAudioContent = new Uint8Array(1024); // Mock audio data
    const file = new File([testAudioContent], metadata.fileName, {
      type: 'audio/m4a',
    });

    formData.append(`file_${index}`, file);
    formData.append(`metadata_${index}`, JSON.stringify(metadata));
  });

  try {
    const response = await fetch(
      'http://127.0.0.1:54321/functions/v1/upload-bible-chapter-audio-bulk',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer your-supabase-jwt-token',
        },
        body: formData,
      }
    );

    const result = await response.json();
    console.log('✅ Bulk upload test result:', result);

    if (result.success) {
      console.log(
        `🎉 SUCCESS: ${result.data.successfulUploads}/${result.data.totalFiles} files uploaded`
      );
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Uncomment to run the test:
// testBulkUpload();

console.log(`
🧪 Bulk Upload Test Script Ready!

✅ Key fixes applied:
1. Added missing audioVersionId to shared functions
2. Fixed database inserts to include audio_version_id
3. Eliminated code duplication between functions
4. Fixed function parameter calls

To test:
1. Update the test data with your actual IDs
2. Make sure your Supabase functions are running
3. Uncomment the testBulkUpload() call at the bottom
4. Run: node test_bulk_upload.js

Your bulk upload should now work correctly! 🎵
`);
