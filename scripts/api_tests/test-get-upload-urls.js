/**
 * Test script for get-upload-urls edge function
 * Tests the deployed function with various scenarios
 */

// Configuration (matching your other test files)
const SUPABASE_URL = 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

// Consistent logging function
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      INFO: '📄',
      SUCCESS: '✅',
      ERROR: '❌',
      WARNING: '⚠️',
      DEBUG: '🔍',
    }[level] || '📄';

  console.log(`${prefix} [${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Authenticate user using email and password
 */
async function authenticateUser() {
  log('INFO', 'Authenticating test user...');

  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sarah.johnson@example.com',
        password: 'password123',
      }),
    });

    if (response.ok) {
      const authData = await response.json();
      log(
        'SUCCESS',
        `Authentication successful for user: ${authData.user.email}`
      );
      return authData.access_token;
    } else {
      const errorText = await response.text();
      log('ERROR', `Authentication failed (${response.status})`, errorText);
      return null;
    }
  } catch (error) {
    log('ERROR', 'Authentication error', error.message);
    return null;
  }
}

/**
 * Test get-upload-urls with single file
 */
async function testSingleFileUploadUrls(accessToken) {
  log('INFO', 'Testing single file upload URL generation...');

  const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

  const requestData = {
    files: [
      {
        fileName: 'genesis-1.m4a',
        contentType: 'audio/m4a',
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('SUCCESS', 'Single file upload URLs generated successfully');
      log('DEBUG', 'Upload URL data:', {
        totalFiles: result.data.totalFiles,
        batchId: result.data.batchId,
        expiresIn: result.data.expiresIn,
        uploadUrls: result.data.urls.map(url => ({
          fileName: url.fileName,
          b2FileName: url.b2FileName,
          remotePath: url.remotePath,
          hasUploadUrl: !!url.uploadUrl,
          hasAuthToken: !!url.authorizationToken,
          contentType: url.contentType,
        })),
      });

      // Verify response structure
      const uploadUrl = result.data.urls[0];
      if (!uploadUrl.uploadUrl.includes('b2_upload_file')) {
        log('WARNING', 'Upload URL does not contain expected B2 endpoint');
      }
      if (!uploadUrl.remotePath.includes('backblazeb2.com')) {
        log('WARNING', 'Remote path does not contain expected B2 domain');
      }

      return result;
    } else {
      log('ERROR', `Single file test failed (${response.status})`, result);
      return null;
    }
  } catch (error) {
    log('ERROR', 'Single file test error', error.message);
    return null;
  }
}

/**
 * Test get-upload-urls with multiple files
 */
async function testMultipleFilesUploadUrls(accessToken) {
  log('INFO', 'Testing multiple files upload URL generation...');

  const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

  const requestData = {
    files: [
      {
        fileName: 'genesis-1.m4a',
        contentType: 'audio/m4a',
        metadata: {
          chapterId: 'gen-1',
          languageId: 'eng',
        },
      },
      {
        fileName: 'genesis-2.mp3',
        contentType: 'audio/mpeg',
        metadata: {
          chapterId: 'gen-2',
          languageId: 'eng',
        },
      },
      {
        fileName: 'psalm-23.wav',
        contentType: 'audio/wav',
        metadata: {
          chapterId: 'psa-23',
          languageId: 'eng',
        },
      },
    ],
    batchId: 'test-batch-multiple-files',
    concurrency: 15,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('SUCCESS', `Multiple files upload URLs generated successfully`);
      log('DEBUG', 'Multiple files data:', {
        totalFiles: result.data.totalFiles,
        batchId: result.data.batchId,
        urlsGenerated: result.data.urls.length,
      });

      // Verify each upload URL
      result.data.urls.forEach((uploadUrl, index) => {
        log('DEBUG', `File ${index + 1}:`, {
          fileName: uploadUrl.fileName,
          contentType: uploadUrl.contentType,
          hasValidUploadUrl: uploadUrl.uploadUrl.includes('b2_upload_file'),
          hasValidRemotePath: uploadUrl.remotePath.includes('backblazeb2.com'),
          timestampedFileName: uploadUrl.b2FileName,
        });
      });

      return result;
    } else {
      log('ERROR', `Multiple files test failed (${response.status})`, result);
      return null;
    }
  } catch (error) {
    log('ERROR', 'Multiple files test error', error.message);
    return null;
  }
}

/**
 * Test get-upload-urls with special characters in filenames
 */
async function testSpecialCharacterFilenames(accessToken) {
  log('INFO', 'Testing special character filename handling...');

  const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

  const requestData = {
    files: [
      {
        fileName: 'Chapter (1) - "Genesis" & More.m4a',
        contentType: 'audio/m4a',
      },
      {
        fileName: '1 Corinthians 13 - Love Chapter.mp3',
        contentType: 'audio/mpeg',
      },
      {
        fileName: 'Psalm 23 [NIV] 100%.wav',
        contentType: 'audio/wav',
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('SUCCESS', 'Special character filenames handled successfully');

      result.data.urls.forEach(uploadUrl => {
        log('DEBUG', 'Special character file:', {
          originalName: uploadUrl.fileName,
          b2FileName: uploadUrl.b2FileName,
          hasSpecialChars: /[()"\]&%[]/.test(uploadUrl.fileName),
        });
      });

      return result;
    } else {
      log(
        'ERROR',
        `Special character test failed (${response.status})`,
        result
      );
      return null;
    }
  } catch (error) {
    log('ERROR', 'Special character test error', error.message);
    return null;
  }
}

/**
 * Test get-upload-urls with large batch (near limit)
 */
async function testLargeBatchUploadUrls(accessToken) {
  log('INFO', 'Testing large batch upload URL generation (100 files)...');

  const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

  // Generate 100 test files
  const files = Array.from({ length: 100 }, (_, i) => ({
    fileName: `chapter-${String(i + 1).padStart(3, '0')}.m4a`,
    contentType: 'audio/m4a',
    metadata: {
      chapterId: `chapter-${i + 1}`,
      sequenceNumber: i + 1,
    },
  }));

  const requestData = {
    files,
    batchId: 'test-large-batch',
    concurrency: 20,
  };

  try {
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = await response.json();

    if (response.ok && result.success) {
      log('SUCCESS', `Large batch test completed in ${duration}ms`);
      log('DEBUG', 'Large batch results:', {
        requestedFiles: files.length,
        generatedUrls: result.data.urls.length,
        batchId: result.data.batchId,
        totalFiles: result.data.totalFiles,
        duration: `${duration}ms`,
        avgTimePerUrl: `${(duration / result.data.urls.length).toFixed(2)}ms`,
      });

      // Check for unique B2 filenames
      const b2FileNames = result.data.urls.map(url => url.b2FileName);
      const uniqueB2Names = new Set(b2FileNames);

      if (b2FileNames.length !== uniqueB2Names.size) {
        log('WARNING', 'Duplicate B2 filenames detected!');
      } else {
        log('SUCCESS', 'All B2 filenames are unique');
      }

      return result;
    } else {
      log('ERROR', `Large batch test failed (${response.status})`, result);
      return null;
    }
  } catch (error) {
    log('ERROR', 'Large batch test error', error.message);
    return null;
  }
}

/**
 * Test error conditions
 */
async function testErrorConditions(accessToken) {
  log('INFO', 'Testing error conditions...');

  const url = `${SUPABASE_URL}/functions/v1/get-upload-urls`;

  // Test 1: Empty files array
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: [] }),
    });

    if (!response.ok) {
      log('SUCCESS', 'Empty files array correctly rejected');
    } else {
      log('WARNING', 'Empty files array was accepted (unexpected)');
    }
  } catch (error) {
    log('WARNING', 'Empty files test error', error.message);
  }

  // Test 2: Missing fileName
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [{ contentType: 'audio/m4a' }], // Missing fileName
      }),
    });

    if (!response.ok) {
      log('SUCCESS', 'Missing fileName correctly rejected');
    } else {
      log('WARNING', 'Missing fileName was accepted (unexpected)');
    }
  } catch (error) {
    log('WARNING', 'Missing fileName test error', error.message);
  }

  // Test 3: Invalid JSON
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    if (!response.ok) {
      log('SUCCESS', 'Invalid JSON correctly rejected');
    } else {
      log('WARNING', 'Invalid JSON was accepted (unexpected)');
    }
  } catch (error) {
    log('WARNING', 'Invalid JSON test error', error.message);
  }
}

/**
 * Main test function
 */
async function runGetUploadUrlsTests() {
  console.log('🚀 Starting Get Upload URLs Tests');
  console.log('=' + '='.repeat(35));

  // Step 1: Authenticate
  const accessToken = await authenticateUser();
  if (!accessToken) {
    log('ERROR', 'Authentication failed, cannot proceed with tests');
    return;
  }

  // Step 2: Run tests
  try {
    log('INFO', 'Running comprehensive get-upload-urls tests...');

    // Test single file
    await testSingleFileUploadUrls(accessToken);

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test multiple files
    await testMultipleFilesUploadUrls(accessToken);

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test special characters
    await testSpecialCharacterFilenames(accessToken);

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test large batch
    await testLargeBatchUploadUrls(accessToken);

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test error conditions
    await testErrorConditions(accessToken);

    log('SUCCESS', 'All get-upload-urls tests completed!');
  } catch (error) {
    log('ERROR', 'Test suite error', error.message);
  }

  console.log('=' + '='.repeat(35));
  console.log('🎉 Get Upload URLs Test Suite Complete');
}

// Run the tests
runGetUploadUrlsTests();
