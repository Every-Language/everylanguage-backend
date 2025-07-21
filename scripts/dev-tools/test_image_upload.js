// Test script for Image upload
// Usage: node scripts/dev-tools/test_image_upload.js

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
  console.log(`⬆️  Testing Image upload...`);

  // Example 1: JSON upload (for testing)
  // Generate test content that's at least 1KB (1024 bytes)
  const testImageContent =
    'fake image binary data '.repeat(50) + 'end of test image data';

  const jsonPayload = {
    target_type: 'chapter',
    target_id: 'gen-1', // Using Genesis chapter 1 from seed data
    filename: 'genesis_1_cover.png',
    file_content: testImageContent,
    set_name: 'Genesis Chapter Images',
    create_new_set: true,
    metadata: {
      description: 'Cover image for Genesis chapter 1',
      category: 'chapter_cover',
    },
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(jsonPayload),
    });

    const result = await response.json();
    console.log('✅ Image upload result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    return null;
  }
};

// Example 2: Multipart form data upload (for production)
const testMultipartUpload = async token => {
  console.log(`⬆️  Testing multipart image upload...`);

  // Create form data
  const formData = new FormData();

  // Add image file (you would use an actual file here)
  const multipartImageContent =
    'fake image binary data for multipart '.repeat(40) + 'end';
  const imageBlob = new Blob([multipartImageContent], { type: 'image/jpeg' });
  formData.append('file', imageBlob, 'genesis_2_illustration.jpg');

  // Add required fields
  formData.append('target_type', 'chapter');
  formData.append('target_id', 'gen-2'); // Genesis chapter 2

  // Add optional fields for creating a new set
  formData.append('set_name', 'Genesis Illustrations');
  formData.append('create_new_set', 'true');
  formData.append('set_remote_path', 'images/genesis/');

  // Add metadata as JSON string
  const metadata = {
    description: 'Illustration for Genesis chapter 2',
    category: 'chapter_illustration',
    artist: 'Test Artist',
  };
  formData.append('metadata', JSON.stringify(metadata));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });

    const result = await response.json();
    console.log('✅ Multipart upload result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Multipart upload failed:', error);
    return null;
  }
};

// Example 3: Upload to existing set
const testExistingSetUpload = async (token, existingSetId) => {
  console.log(`⬆️  Testing upload to existing set: ${existingSetId}`);

  // Generate test content that's at least 1KB
  const existingSetImageContent =
    'test image content for existing set '.repeat(35) + 'end';

  const jsonPayload = {
    target_type: 'chapter',
    target_id: 'gen-3', // Genesis chapter 3
    filename: 'genesis_3_artwork.png',
    file_content: existingSetImageContent,
    set_id: existingSetId, // Use existing set from previous upload
    metadata: {
      description: 'Artwork for Genesis chapter 3',
      category: 'chapter_artwork',
    },
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(jsonPayload),
    });

    const result = await response.json();
    console.log(
      '✅ Existing set upload result:',
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error('❌ Existing set upload failed:', error);
    return null;
  }
};

// Example 4: Upload to same target and same set (for version testing)
const testVersionIncrement = async (token, existingSetId) => {
  console.log(
    `⬆️  Testing version increment for same target and set: ${existingSetId}`
  );

  // Generate test content that's at least 1KB
  const versionTestImageContent =
    'version increment test image content '.repeat(30) + 'end';

  const jsonPayload = {
    target_type: 'chapter',
    target_id: 'gen-1', // Same target as first upload (Genesis chapter 1)
    filename: 'genesis_1_cover_v2.png',
    file_content: versionTestImageContent,
    set_id: existingSetId, // Use existing set from previous upload
    metadata: {
      description: 'Updated_cover_for_Genesis_chapter_1',
      category: 'chapter_cover_v2',
    },
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(jsonPayload),
    });

    const result = await response.json();
    console.log(
      '✅ Version increment test result:',
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error('❌ Version increment test failed:', error);
    return null;
  }
};

async function main() {
  console.log('🚀 Testing Image Upload API');
  console.log('=' + '='.repeat(29));

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

    // Step 2: Test uploads based on command line arguments
    if (process.argv.includes('--multipart')) {
      console.log('🧪 Testing multipart upload...');
      await testMultipartUpload(token);
    } else if (process.argv.includes('--existing-set')) {
      console.log('🧪 Testing upload to existing set...');
      // First create a set, then use it
      const firstResult = await testUpload(token);
      if (firstResult?.success && firstResult?.data?.setId) {
        console.log();
        await testExistingSetUpload(token, firstResult.data.setId);
      } else {
        console.log('❌ Could not get set ID from first upload');
      }
    } else if (process.argv.includes('--version-test')) {
      console.log('🧪 Testing version incrementing...');
      // First upload
      console.log('📤 First upload to gen-1:');
      const firstResult = await testUpload(token);
      console.log();

      if (firstResult?.success && firstResult?.data?.setId) {
        // Second upload to same target AND same set to test version increment
        console.log(
          '📤 Second upload to same target (gen-1) and same set - should increment version:'
        );
        await testVersionIncrement(token, firstResult.data.setId);
      } else {
        console.log(
          '❌ Could not get set ID from first upload for version test'
        );
      }
    } else {
      console.log('🧪 Testing JSON upload with new set...');
      await testUpload(token);
    }

    console.log();
    console.log('🎉 Test completed successfully!');
    console.log();
    console.log('💡 Available test options:');
    console.log(
      '   node scripts/dev-tools/test_image_upload.js           # JSON upload (default)'
    );
    console.log(
      '   node scripts/dev-tools/test_image_upload.js --multipart    # Multipart upload'
    );
    console.log(
      '   node scripts/dev-tools/test_image_upload.js --existing-set # Test existing set'
    );
    console.log(
      '   node scripts/dev-tools/test_image_upload.js --version-test # Test version incrementing'
    );
  } catch (error) {
    console.log(`💥 Unexpected error: ${error.message}`);
  }
}

// Run the main function
main();
