#!/usr/bin/env node

/**
 * Test script for Bible Package Creation
 * Tests audio, text, and combined package creation with actual database IDs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

// Test data IDs provided by user
const TEST_IDS = {
  audioVersionId: '152855bd-6939-4bb0-88ac-70523605cc88',
  textVersionId: '742a42c0-be2d-475f-95d3-030650acc2e2',
  languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: COLORS.blue,
    success: COLORS.green,
    warning: COLORS.yellow,
    error: COLORS.red,
    test: COLORS.magenta,
  };

  console.log(
    `${colorMap[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${COLORS.reset}`
  );
  if (data) {
    console.log(
      `${COLORS.cyan}${JSON.stringify(data, null, 2)}${COLORS.reset}`
    );
  }
}

async function testPackageCreation(packageType, payload) {
  log('test', `Testing ${packageType} package creation...`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-bible-package`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();
    log('info', `Response status: ${response.status}`);
    log('info', `Response headers:`, Object.fromEntries(response.headers));

    if (!response.ok) {
      log('error', `Failed to create ${packageType} package`, {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      });
      return null;
    }

    // Check if response is JSON or binary
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = JSON.parse(responseText);
      log('success', `${packageType} package creation response:`, result);
      return result;
    } else {
      // Binary response - package file
      const packageSize = responseText.length;
      log(
        'success',
        `${packageType} package created successfully! Size: ${packageSize} bytes (${(packageSize / 1024 / 1024).toFixed(2)} MB)`
      );
      return { success: true, packageSize, type: 'binary' };
    }
  } catch (error) {
    log('error', `Error testing ${packageType} package:`, {
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

async function testDownloadEndpoint(packageType, params) {
  log('test', `Testing ${packageType} package download...`);

  const queryParams = new URLSearchParams(params);
  const url = `${SUPABASE_URL}/functions/v1/download-bible-package?${queryParams}`;

  try {
    const response = await fetch(url);
    const responseText = await response.text();

    log('info', `Download response status: ${response.status}`);

    if (!response.ok) {
      log('error', `Failed to download ${packageType} package`, {
        status: response.status,
        response: responseText,
      });
      return null;
    }

    const packageSize = responseText.length;
    log(
      'success',
      `${packageType} package downloaded successfully! Size: ${packageSize} bytes (${(packageSize / 1024 / 1024).toFixed(2)} MB)`
    );
    return { success: true, packageSize };
  } catch (error) {
    log('error', `Error downloading ${packageType} package:`, {
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

async function runTests() {
  log('info', `Starting Bible Package Creation Tests`);
  log('info', `Supabase URL: ${SUPABASE_URL}`);
  log('info', `Test IDs:`, TEST_IDS);

  const results = {
    audio: null,
    text: null,
    combined: null,
    downloads: {
      audio: null,
      text: null,
      combined: null,
    },
  };

  // Test 1: Audio-only package
  log('info', '='.repeat(60));
  log('info', 'TEST 1: Audio-only Package');
  log('info', '='.repeat(60));

  results.audio = await testPackageCreation('audio', {
    packageType: 'audio',
    audioVersionId: TEST_IDS.audioVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
    options: {
      includeStructure: true,
    },
  });

  // Test 2: Text-only package
  log('info', '='.repeat(60));
  log('info', 'TEST 2: Text-only Package');
  log('info', '='.repeat(60));

  results.text = await testPackageCreation('text', {
    packageType: 'text',
    textVersionId: TEST_IDS.textVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
    options: {
      includeStructure: true,
    },
  });

  // Test 3: Combined package
  log('info', '='.repeat(60));
  log('info', 'TEST 3: Combined Package');
  log('info', '='.repeat(60));

  results.combined = await testPackageCreation('combined', {
    packageType: 'combined',
    audioVersionId: TEST_IDS.audioVersionId,
    textVersionId: TEST_IDS.textVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
    options: {
      includeStructure: true,
    },
  });

  // Test download endpoints
  log('info', '='.repeat(60));
  log('info', 'DOWNLOAD ENDPOINT TESTS');
  log('info', '='.repeat(60));

  results.downloads.audio = await testDownloadEndpoint('audio', {
    packageType: 'audio',
    audioVersionId: TEST_IDS.audioVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
  });

  results.downloads.text = await testDownloadEndpoint('text', {
    packageType: 'text',
    textVersionId: TEST_IDS.textVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
  });

  results.downloads.combined = await testDownloadEndpoint('combined', {
    packageType: 'combined',
    audioVersionId: TEST_IDS.audioVersionId,
    textVersionId: TEST_IDS.textVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
  });

  // Summary
  log('info', '='.repeat(60));
  log('info', 'TEST SUMMARY');
  log('info', '='.repeat(60));

  const totalTests = 6;
  const passedTests = Object.values(results)
    .flat()
    .filter(result => result && result.success).length;

  log('info', `Tests passed: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    log(
      'success',
      '🎉 All tests passed! Bible package creation system is working correctly.'
    );
  } else {
    log(
      'warning',
      `⚠️  ${totalTests - passedTests} test(s) failed. Check the logs above for details.`
    );
  }

  log('info', 'Final results:', results);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log('error', 'Test execution failed:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

module.exports = { runTests, testPackageCreation, testDownloadEndpoint };
