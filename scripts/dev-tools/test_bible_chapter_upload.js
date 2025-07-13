// Test script for Bible chapter audio upload
// Usage: node scripts/test_bible_chapter_upload.js

// Configuration
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

const testUpload = async token => {
  console.log(`⬆️  Testing Bible chapter audio upload...`);

  // Example 1: JSON upload (for testing)
  const jsonPayload = {
    language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    chapter_id: 'gen-2',
    start_verse_id: 'gen-2-1',
    end_verse_id: 'gen-2-2',
    duration_seconds: 180.5,
    project_id: '',
    filename: 'genesis_2.m4a',
    file_content: 'test audio content',
    verse_timings: [
      {
        verseId: 'gen-2-1',
        startTimeSeconds: 0,
        durationSeconds: 10.5,
      },
      {
        verseId: 'gen-2-2',
        startTimeSeconds: 10.5,
        durationSeconds: 12.3,
      },
    ],
    tag_ids: [''], // optional
  };

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify(jsonPayload),
      }
    );

    const result = await response.json();
    console.log(
      '✅ Bible chapter upload result:',
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error('❌ Bible chapter upload failed:', error);
  }
};

// Example 2: Multipart form data upload (for production)
const testMultipartUpload = async token => {
  // Create form data
  const formData = new FormData();

  // Add audio file (you would use an actual file here)
  const audioBlob = new Blob(['fake audio data'], { type: 'audio/m4a' });
  formData.append('file', audioBlob, 'genesis_1.m4a');

  // Add required fields
  formData.append('language_entity_id', 'example-language-id');
  formData.append('chapter_id', 'example-chapter-id');
  formData.append('start_verse_id', 'example-start-verse-id');
  formData.append('end_verse_id', 'example-end-verse-id');
  formData.append('duration_seconds', '180.5');

  // Add optional fields
  formData.append('project_id', 'example-project-id');

  // Add verse timings as JSON string
  const verseTimings = [
    {
      verseId: 'verse-1-id',
      startTimeSeconds: 0,
      durationSeconds: 10.5,
    },
    {
      verseId: 'verse-2-id',
      startTimeSeconds: 10.5,
      durationSeconds: 12.3,
    },
  ];
  formData.append('verse_timings', JSON.stringify(verseTimings));

  // Add tag IDs as JSON string
  const tagIds = ['tag-1-id', 'tag-2-id'];
  formData.append('tag_ids', JSON.stringify(tagIds));

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/upload-bible-chapter-audio`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      }
    );

    const result = await response.json();
    console.log('✅ Multipart upload result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Multipart upload failed:', error);
  }
};

async function main() {
  console.log('🚀 Testing Bible Chapter Audio Upload API');
  console.log('=' + '='.repeat(49));

  try {
    // Step 1: Authenticate
    const token = await authenticateUser(
      'sarah.johnson@example.com',
      'password123'
    );
    if (!token) {
      return;
    }

    console.log();

    // Step 2: Test upload
    if (process.argv.includes('--multipart')) {
      console.log('🧪 Testing multipart upload...');
      await testMultipartUpload(token);
    } else {
      console.log('🧪 Testing JSON upload...');
      await testUpload(token);
    }

    console.log();
    console.log('🎉 Test completed successfully!');
  } catch (error) {
    console.log(`💥 Unexpected error: ${error.message}`);
  }
}

// Run the main function
main();
