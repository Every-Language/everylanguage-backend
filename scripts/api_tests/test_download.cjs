#!/usr/bin/env node

/**
 * Test script for download and streaming functionality
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

async function testDownload(token, filename, testName) {
  console.log(`\n📥 Testing Download: ${testName}`);
  console.log(`   Filename: ${filename}`);

  const downloadUrl = `${SUPABASE_URL}/functions/v1/download-media?filename=${encodeURIComponent(filename)}`;

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(
      `   Content-Length: ${response.headers.get('content-length')} bytes`
    );

    if (response.ok) {
      const contentLength = parseInt(
        response.headers.get('content-length') || '0'
      );
      console.log(
        `   ✅ Download successful! (${(contentLength / 1024).toFixed(2)} KB)`
      );
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Download failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   💥 Download error: ${error.message}`);
    return false;
  }
}

async function testStream(token, filename, testName) {
  console.log(`\n📺 Testing Stream: ${testName}`);
  console.log(`   Filename: ${filename}`);

  const streamUrl = `${SUPABASE_URL}/functions/v1/download-media?filename=${encodeURIComponent(filename)}&stream=true`;

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(
      `   Content-Length: ${response.headers.get('content-length')} bytes`
    );
    console.log(`   Accept-Ranges: ${response.headers.get('accept-ranges')}`);

    if (response.ok) {
      const contentLength = parseInt(
        response.headers.get('content-length') || '0'
      );
      console.log(
        `   ✅ Stream successful! (${(contentLength / 1024).toFixed(2)} KB)`
      );
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Stream failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   💥 Stream error: ${error.message}`);
    return false;
  }
}

async function testDownloadById(token, mediaFileId, testName) {
  console.log(`\n🆔 Testing Download by ID: ${testName}`);
  console.log(`   Media File ID: ${mediaFileId}`);

  const downloadUrl = `${SUPABASE_URL}/functions/v1/download-media?id=${mediaFileId}`;

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(
      `   Content-Length: ${response.headers.get('content-length')} bytes`
    );

    if (response.ok) {
      const contentLength = parseInt(
        response.headers.get('content-length') || '0'
      );
      console.log(
        `   ✅ Download by ID successful! (${(contentLength / 1024).toFixed(2)} KB)`
      );
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Download by ID failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`   💥 Download by ID error: ${error.message}`);
    return false;
  }
}

async function getRecentMediaFiles(token) {
  console.log(`📋 Getting recent media files...`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/media_files?select=id,file_path&order=created_at.desc&limit=3`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const mediaFiles = await response.json();
      console.log(`   Found ${mediaFiles.length} recent files:`);
      mediaFiles.forEach((file, index) => {
        const filename = file.file_path.split('/').pop();
        console.log(`   ${index + 1}. ${filename} (ID: ${file.id})`);
      });
      return mediaFiles;
    } else {
      console.log(`   ❌ Failed to get media files: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`   💥 Error getting media files: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting Download & Streaming Test');
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

    // Step 2: Get recent media files
    const mediaFiles = await getRecentMediaFiles(token);

    if (mediaFiles.length === 0) {
      console.log(
        '\n⚠️  No media files found. Please upload some files first using the upload tests.'
      );
      return;
    }

    console.log();

    // Step 3: Test downloads and streams
    const results = [];

    for (const [index, mediaFile] of mediaFiles.entries()) {
      const filename = mediaFile.file_path.split('/').pop();
      const testName = `File ${index + 1}`;

      // Test download by filename
      const downloadSuccess = await testDownload(
        token,
        filename,
        `${testName} (by filename)`
      );
      results.push({ test: `Download ${testName}`, success: downloadSuccess });

      // Test stream by filename
      const streamSuccess = await testStream(
        token,
        filename,
        `${testName} (streaming)`
      );
      results.push({ test: `Stream ${testName}`, success: streamSuccess });

      // Test download by ID
      const idDownloadSuccess = await testDownloadById(
        token,
        mediaFile.id,
        `${testName} (by ID)`
      );
      results.push({
        test: `Download by ID ${testName}`,
        success: idDownloadSuccess,
      });
    }

    // Summary
    console.log('\n📊 DOWNLOAD & STREAMING TEST RESULTS');
    console.log('==================================================');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      console.log('\n✅ SUCCESSFUL TESTS:');
      successful.forEach(s => console.log(`   ${s.test}`));
    }

    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(f => console.log(`   ${f.test}`));
    }

    console.log('\n🎉 Download & streaming tests completed!');
  } catch (error) {
    console.log(`💥 Unexpected error: ${error.message}`);
  }
}

main();
