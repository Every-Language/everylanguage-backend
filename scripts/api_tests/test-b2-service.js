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

async function testB2Service(accessToken) {
  log('test', 'Testing B2 service with get-download-urls...');

  // Use the filename extracted from the URL we saw in diagnostics
  const testFilename = '1753492773014-BSB_01_Gen_010_H.mp3';

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-download-urls`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filePaths: [testFilename],
        }),
      }
    );

    log('info', `Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'B2 service failed:', {
        status: response.status,
        response: errorText,
      });
      return false;
    }

    const result = await response.json();
    log('success', 'B2 service response:', result);

    if (result.urls && result.urls[testFilename]) {
      log('success', '✅ B2 service is working - got download URL');

      // Test downloading from the generated URL
      const downloadUrl = result.urls[testFilename];
      log('info', `Testing download from: ${downloadUrl.substring(0, 80)}...`);

      const audioResponse = await fetch(downloadUrl, {
        headers: {
          Range: 'bytes=0-1023', // Just first 1KB
        },
      });

      if (audioResponse.ok) {
        const data = await audioResponse.arrayBuffer();
        log('success', `✅ Downloaded ${data.byteLength} bytes from B2 URL`);
        return true;
      } else {
        log(
          'error',
          `❌ Failed to download from B2 URL: ${audioResponse.status}`
        );
        return false;
      }
    } else {
      log('warning', '⚠️ B2 service returned no URLs');
      return false;
    }
  } catch (error) {
    log('error', 'B2 service test failed:', error);
    return false;
  }
}

async function runB2Test() {
  try {
    log('info', 'Testing B2 Service Functionality');

    const accessToken = await authenticateUser();
    const success = await testB2Service(accessToken);

    if (success) {
      log('success', '🎉 B2 service is working correctly!');
      log(
        'info',
        'The issue must be in how the package builder uses the B2 service'
      );
    } else {
      log('error', '❌ B2 service is not working properly');
    }
  } catch (error) {
    log('error', 'B2 test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runB2Test();
}
