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

async function runDebugTest() {
  try {
    log('info', 'Running Bible Package Debug Test');

    const accessToken = await authenticateUser();

    const queryParams = new URLSearchParams({
      packageType: 'audio',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
    });

    const url = `${SUPABASE_URL}/functions/v1/debug-bible-package?${queryParams}`;

    log('info', 'Calling debug endpoint...');
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Debug endpoint failed:', {
        status: response.status,
        response: errorText,
      });
      return;
    }

    const diagnostics = await response.json();

    log('success', 'Debug endpoint response received');
    log('info', 'DIAGNOSTICS RESULTS:', diagnostics);

    // Summary
    const summary = diagnostics.summary;
    if (summary) {
      console.log('\n' + '='.repeat(60));
      console.log('📊 DIAGNOSIS SUMMARY');
      console.log('='.repeat(60));
      console.log(`🎵 Audio Version Found: ${summary.audioVersionFound}`);
      console.log(`📁 Media Files Count: ${summary.mediaFilesCount}`);
      console.log(`⬇️  Audio Download Works: ${summary.audioDownloadWorks}`);
      console.log(`🌐 Language Entity Exists: ${summary.languageEntityExists}`);
      console.log(`🔍 Overall Status: ${summary.overallStatus}`);

      if (summary.overallStatus === 'READY') {
        log('success', '✅ All systems appear ready for package creation!');
      } else {
        log(
          'warning',
          '⚠️ Issues found that may prevent proper package creation'
        );
      }
    }
  } catch (error) {
    log('error', 'Debug test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runDebugTest();
}
