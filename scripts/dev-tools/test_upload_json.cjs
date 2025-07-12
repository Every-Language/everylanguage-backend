#!/usr/bin/env node

/**
 * Simple JSON test script for B2 upload functionality
 */

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

async function testUpload(token) {
  console.log(`⬆️  Testing filename robustness...`);

  const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;

  // Test filenames with special characters (including the previously problematic % case)
  const testFilenames = [
    'file%with%percent.m4a', // Test the fix first
    'normal-file.m4a',
    'file with spaces.m4a',
  ];

  const results = [];

  for (const filename of testFilenames) {
    console.log(`\n🧪 Testing: "${filename}"`);

    const testData = {
      target_type: 'chapter',
      target_id: 'filename-test-123',
      language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
      filename: filename,
      file_content: `Test content for ${filename}`,
    };

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const responseText = await response.text();

      if (response.ok) {
        const result = JSON.parse(responseText);
        const storedName = result.data.downloadUrl.split('/').pop();
        console.log(
          `   ✅ SUCCESS - Stored as: ${decodeURIComponent(storedName)}`
        );
        results.push({
          filename,
          success: true,
          storedName: decodeURIComponent(storedName),
        });
      } else {
        console.log(
          `   ❌ FAILED - ${response.status}: ${responseText.substring(0, 100)}...`
        );
        results.push({ filename, success: false, error: responseText });
      }
    } catch (error) {
      console.log(`   💥 ERROR - ${error.message}`);
      results.push({ filename, success: false, error: error.message });
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n📊 FILENAME ROBUSTNESS RESULTS');
  console.log('==================================================');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL FILENAME TRANSFORMATIONS:');
    successful.forEach(s => {
      console.log(`   "${s.filename}" → "${s.storedName}"`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED FILENAMES:');
    failed.forEach(f => {
      console.log(
        `   "${f.filename}" - ${typeof f.error === 'string' ? f.error.substring(0, 100) : f.error}...`
      );
    });
  }

  return results;
}

async function main() {
  console.log('🚀 Starting B2 JSON Upload Test');
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
    const uploadResult = await testUpload(token);
    if (uploadResult) {
      console.log();
      console.log('🎉 Test completed successfully!');
    } else {
      console.log();
      console.log('❌ Test failed');
    }
  } catch (error) {
    console.log(`💥 Unexpected error: ${error.message}`);
  }
}

main();
