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

async function checkMediaFiles(accessToken) {
  log('info', 'Checking media files for audio version...');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/media_files?audio_version_id=eq.${TEST_IDS.audioVersionId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch media files: ${response.status}`);
  }

  const mediaFiles = await response.json();
  log('info', `Found ${mediaFiles.length} media files`);

  if (mediaFiles.length > 0) {
    log(
      'info',
      'Sample media files:',
      mediaFiles.slice(0, 3).map(mf => ({
        id: mf.id,
        remote_path: mf.remote_path,
        file_size_bytes: mf.file_size_bytes,
        duration_seconds: mf.duration_seconds,
        start_verse_id: mf.start_verse_id,
        end_verse_id: mf.end_verse_id,
      }))
    );

    // Calculate expected total size
    const totalSize = mediaFiles.reduce(
      (sum, mf) => sum + (mf.file_size_bytes || 0),
      0
    );
    log(
      'info',
      `Total expected audio size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`
    );
  }

  return mediaFiles;
}

async function checkAudioVersion(accessToken) {
  log('info', 'Checking audio version details...');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/audio_versions?id=eq.${TEST_IDS.audioVersionId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch audio version: ${response.status}`);
  }

  const audioVersions = await response.json();
  if (audioVersions.length > 0) {
    log('info', 'Audio version details:', audioVersions[0]);
  }

  return audioVersions[0];
}

async function testSingleAudioDownload(accessToken, mediaFiles) {
  if (mediaFiles.length === 0) {
    log('warning', 'No media files to test download');
    return;
  }

  const testFile = mediaFiles[0];
  log('info', `Testing download of single file: ${testFile.remote_path}`);

  // Test direct B2 download via our endpoint
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
          filenames: [testFile.remote_path],
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      log('success', 'B2 download URL generated:', result);

      // Try to actually download a small portion to test
      if (result.downloadUrls && result.downloadUrls[0]) {
        const audioResponse = await fetch(result.downloadUrls[0], {
          headers: {
            Range: 'bytes=0-1023', // Just first 1KB to test
          },
        });

        if (audioResponse.ok) {
          const data = await audioResponse.arrayBuffer();
          log(
            'success',
            `Successfully downloaded ${data.byteLength} bytes of audio data`
          );
        } else {
          log(
            'error',
            `Failed to download audio data: ${audioResponse.status}`
          );
        }
      }
    } else {
      const errorText = await response.text();
      log(
        'error',
        `Failed to get download URL: ${response.status} ${errorText}`
      );
    }
  } catch (error) {
    log('error', 'Error testing B2 download:', error);
  }
}

async function runDiagnostics() {
  try {
    log('info', 'Starting Bible Package Diagnostics');

    const accessToken = await authenticateUser();

    // Check audio version
    const audioVersion = await checkAudioVersion(accessToken);

    // Check media files
    const mediaFiles = await checkMediaFiles(accessToken);

    // Test single file download
    await testSingleAudioDownload(accessToken, mediaFiles);

    log('info', '='.repeat(60));
    log('info', 'DIAGNOSIS SUMMARY');
    log('info', '='.repeat(60));

    log('info', `Audio Version ID: ${TEST_IDS.audioVersionId}`);
    log('info', `Audio Version Name: ${audioVersion?.name || 'Unknown'}`);
    log('info', `Media Files Found: ${mediaFiles.length}`);

    if (mediaFiles.length > 0) {
      const totalSize = mediaFiles.reduce(
        (sum, mf) => sum + (mf.file_size_bytes || 0),
        0
      );
      log(
        'info',
        `Expected Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`
      );
      log(
        'info',
        `Files with remote_path: ${mediaFiles.filter(mf => mf.remote_path).length}`
      );
      log(
        'info',
        `Files with file_size_bytes: ${mediaFiles.filter(mf => mf.file_size_bytes).length}`
      );
    }

    if (mediaFiles.length < 100) {
      log(
        'warning',
        'Expected ~200 audio files but found much fewer. Check database data.'
      );
    }
  } catch (error) {
    log('error', 'Diagnostics failed:', error);
  }
}

// Run the diagnostics
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagnostics();
}
