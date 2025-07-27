#!/usr/bin/env node

const SUPABASE_URL = 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

const TEST_USER = {
  email: 'sarah.johnson@example.com',
  password: 'password123',
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

async function testPackageBuilderDownload(accessToken) {
  log('test', 'Testing package builder download approach...');

  // This is exactly what the package builder does:
  const testUrl =
    'https://f006.backblazeb2.com/file/el-backend-dev-media-files/1753492773014-BSB_01_Gen_010_H.mp3';

  log('info', `1. Original URL: ${testUrl}`);

  // Extract filename using same approach as package builder
  const fileName = testUrl.split('/').pop();
  log('info', `2. Extracted filename: ${fileName}`);

  // Test calling our package builder's approach via Edge Function
  try {
    log('info', '3. Testing direct B2 download via custom endpoint...');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/test-b2-download`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fileName: fileName,
        }),
      }
    );

    log('info', `Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      log('success', 'B2 download test result:', result);
      return true;
    } else {
      const errorText = await response.text();
      log('error', 'B2 download test failed:', {
        status: response.status,
        response: errorText,
      });
      return false;
    }
  } catch (error) {
    log('error', 'Test failed:', error);
    return false;
  }
}

async function runTest() {
  try {
    log('info', 'Testing Package Builder Download Logic');

    const accessToken = await authenticateUser();
    const success = await testPackageBuilderDownload(accessToken);

    if (success) {
      log('success', '🎉 Package builder download logic is working!');
    } else {
      log('error', '❌ Package builder download logic has issues');
      log('info', 'Need to create the test-b2-download endpoint first');
    }
  } catch (error) {
    log('error', 'Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}
