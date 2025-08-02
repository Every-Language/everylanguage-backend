/**
 * Test script for bulk bible chapter audio upload
 * Run this to verify the fixes are working correctly
 */

// Configuration (matching your other test files)
const SUPABASE_URL = 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

async function authenticateUser(email, password) {
  console.log(`🔐 Authenticating user: ${email}`);

  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    if (response.ok) {
      const authData = await response.json();
      console.log(`✅ Authentication successful!`);
      console.log(`   User: ${authData.user.email}`);
      return authData.access_token;
    } else {
      const errorText = await response.text();
      console.log(`❌ Authentication failed: ${response.status}`);
      console.log(`   Response: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Authentication error: ${error.message}`);
    return null;
  }
}

export const testBulkUpload = async () => {
  console.log('🚀 Starting Bulk Upload Test');
  console.log('=' + '='.repeat(29));

  // Step 1: Authenticate
  const token = await authenticateUser(
    'sarah.johnson@example.com',
    'password123'
  );
  if (!token) {
    console.log('❌ Authentication failed, cannot proceed with test');
    return;
  }

  const formData = new FormData();

  // Add multiple test files with metadata
  const testFiles = [
    {
      fileName: 'genesis_1.m4a',
      languageEntityId: '3a714f99-f982-40c7-8ff6-87019a652100',
      chapterId: 'num-4',
      audioVersionId: 'cc8f3110-a366-4d81-88d5-4a2bb7d31062', // ✅ This is now included!
      startVerseId: 'num-4-3',
      endVerseId: 'num-4-7',
      durationSeconds: 120.5,
    },
    {
      fileName: 'genesis_2.m4a',
      languageEntityId: '3a714f99-f982-40c7-8ff6-87019a652100',
      chapterId: 'exo-1',
      audioVersionId: 'cc8f3110-a366-4d81-88d5-4a2bb7d31062', // ✅ This is now included!
      startVerseId: 'exo-1-1',
      endVerseId: 'exo-1-7',
      durationSeconds: 95.3,
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
      `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio-bulk`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();
    console.log('✅ Bulk upload test result:', result);

    if (result.success) {
      console.log(
        `🎉 SUCCESS: Created ${result.data.totalFiles} records (batch: ${result.data.batchId})`
      );
      console.log('📋 Media Records:', result.data.mediaRecords);

      // Now poll for progress
      await pollUploadProgress(result.data.batchId, token);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Function to poll upload progress
const pollUploadProgress = async (batchId, token) => {
  console.log(`🔄 Polling progress for batch: ${batchId}`);

  for (let i = 0; i < 20; i++) {
    // Poll for up to 2 minutes
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-upload-progress`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchId }),
        }
      );

      const progress = await response.json();

      if (progress.success) {
        const { data } = progress;
        console.log(
          `📊 Progress: ${data.progress.percentage}% (${data.progress.status})`
        );
        console.log(
          `   Pending: ${data.pendingCount}, Uploading: ${data.uploadingCount}, Completed: ${data.completedCount}, Failed: ${data.failedCount}`
        );

        // Show individual file statuses
        data.files.forEach(file => {
          const status =
            file.status === 'completed'
              ? '✅'
              : file.status === 'failed'
                ? '❌'
                : file.status === 'uploading'
                  ? '⬆️'
                  : '⏳';
          console.log(`   ${status} ${file.fileName}: ${file.status}`);
        });

        // Stop polling if all done
        if (
          data.progress.status === 'completed' ||
          data.progress.status === 'failed'
        ) {
          console.log('🎉 Upload batch completed!');
          break;
        }
      }

      // Wait 6 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 6000));
    } catch (error) {
      console.error('❌ Progress check failed:', error);
    }
  }
};

testBulkUpload();
