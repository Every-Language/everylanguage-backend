#!/usr/bin/env node

const SUPABASE_URL = 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

const TEST_USER = {
  email: 'sarah.johnson@example.com',
  password: 'password123',
};

const TEST_IDS = {
  audioVersionId: '152855bd-6939-4bb0-88ac-70523605cc88',
  textVersionId: '742a42c0-be2d-475f-95d3-030650acc2e2',
  languageEntityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[34m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    test: '\x1b[35m',
    reset: '\x1b[0m',
  };

  console.log(
    `${colors[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`
  );
  if (data) {
    console.log(`\x1b[36m${JSON.stringify(data, null, 2)}\x1b[0m`);
  }
}

async function authenticateUser() {
  log('info', 'Authenticating user...');

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} ${errorText}`);
  }

  const authData = await response.json();
  log('success', 'User authenticated successfully');
  return authData.access_token;
}

async function testPackageCreation(packageType, payload, accessToken) {
  log('test', `Testing ${packageType} package creation...`);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-bible-package`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const responseText = await response.text();
  log('info', `Response status: ${response.status}`);

  if (!response.ok) {
    log('error', `Failed to create ${packageType} package`, {
      status: response.status,
      response: responseText,
    });
    return null;
  }

  const packageSize = responseText.length;
  log(
    'success',
    `${packageType} package created! Size: ${packageSize} bytes (${(packageSize / 1024 / 1024).toFixed(2)} MB)`
  );
  return { success: true, packageSize, type: 'binary' };
}

async function testDownloadEndpoint(packageType, params, accessToken) {
  log('test', `Testing ${packageType} package download...`);

  const queryParams = new URLSearchParams(params);
  const url = `${SUPABASE_URL}/functions/v1/download-bible-package?${queryParams}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

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
    `${packageType} package downloaded! Size: ${packageSize} bytes (${(packageSize / 1024 / 1024).toFixed(2)} MB)`
  );
  return { success: true, packageSize };
}

async function runTests() {
  log('info', 'Starting Bible Package Creation Tests');
  log('info', `Supabase URL: ${SUPABASE_URL}`);

  // Authenticate first
  const accessToken = await authenticateUser();

  const results = {
    audio: null,
    text: null,
    combined: null,
    downloads: { audio: null, text: null, combined: null },
  };

  // Test 1: Audio-only package
  log('info', '='.repeat(60));
  log('info', 'TEST 1: Audio-only Package');
  log('info', '='.repeat(60));

  results.audio = await testPackageCreation(
    'audio',
    {
      packageType: 'audio',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      options: { includeStructure: true },
    },
    accessToken
  );

  // Test 2: Text-only package
  log('info', '='.repeat(60));
  log('info', 'TEST 2: Text-only Package');
  log('info', '='.repeat(60));

  results.text = await testPackageCreation(
    'text',
    {
      packageType: 'text',
      textVersionId: TEST_IDS.textVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      options: { includeStructure: true },
    },
    accessToken
  );

  // Test 3: Combined package
  log('info', '='.repeat(60));
  log('info', 'TEST 3: Combined Package');
  log('info', '='.repeat(60));

  results.combined = await testPackageCreation(
    'combined',
    {
      packageType: 'combined',
      audioVersionId: TEST_IDS.audioVersionId,
      textVersionId: TEST_IDS.textVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      options: { includeStructure: true },
    },
    accessToken
  );

  // Test download endpoints
  log('info', '='.repeat(60));
  log('info', 'DOWNLOAD ENDPOINT TESTS');
  log('info', '='.repeat(60));

  results.downloads.audio = await testDownloadEndpoint(
    'audio',
    {
      packageType: 'audio',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
    },
    accessToken
  );

  results.downloads.text = await testDownloadEndpoint(
    'text',
    {
      packageType: 'text',
      textVersionId: TEST_IDS.textVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
    },
    accessToken
  );

  results.downloads.combined = await testDownloadEndpoint(
    'combined',
    {
      packageType: 'combined',
      audioVersionId: TEST_IDS.audioVersionId,
      textVersionId: TEST_IDS.textVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
    },
    accessToken
  );

  // Summary
  log('info', '='.repeat(60));
  log('info', 'TEST SUMMARY');
  log('info', '='.repeat(60));

  const totalTests = 6;
  const passedTests = [
    results.audio,
    results.text,
    results.combined,
    results.downloads.audio,
    results.downloads.text,
    results.downloads.combined,
  ].filter(result => result && result.success).length;

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

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    log('error', 'Test execution failed:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
