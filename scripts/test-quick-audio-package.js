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

async function testQuickAudioPackage(accessToken) {
  log('test', 'Testing audio package download with fixed B2 service...');

  const queryParams = new URLSearchParams({
    packageType: 'audio',
    audioVersionId: TEST_IDS.audioVersionId,
    languageEntityId: TEST_IDS.languageEntityId,
  });

  const url = `${SUPABASE_URL}/functions/v1/download-bible-package?${queryParams}`;

  try {
    log('info', 'Starting download...');
    const startTime = Date.now();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    log('info', `Response received after ${duration}s`);
    log('info', `Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Download failed:', {
        status: response.status,
        response: errorText,
      });
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const sizeBytes = arrayBuffer.byteLength;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

    log('success', `Package downloaded successfully!`);
    log('info', `Size: ${sizeBytes} bytes (${sizeMB} MB)`);
    log('info', `Download time: ${duration} seconds`);

    // Check if it's much larger than before (indicating audio files included)
    if (sizeBytes > 1024 * 1024) {
      // > 1MB
      log('success', '✅ Package size indicates audio files are included!');
      return true;
    } else if (sizeBytes > 500 * 1024) {
      // > 500KB
      log('warning', '⚠️ Package size suggests partial audio inclusion');
      return true;
    } else {
      log(
        'warning',
        '⚠️ Package size still very small - may still be metadata only'
      );
      return false;
    }
  } catch (error) {
    log('error', 'Test failed:', error);
    return false;
  }
}

async function runQuickTest() {
  try {
    log('info', 'Quick Audio Package Test with B2 Fix');

    const accessToken = await authenticateUser();
    const success = await testQuickAudioPackage(accessToken);

    if (success) {
      log(
        'success',
        '🎉 B2 fix appears to be working - audio files are being included!'
      );
    } else {
      log('error', '❌ Audio files still not being included properly');
    }
  } catch (error) {
    log('error', 'Quick test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickTest();
}
