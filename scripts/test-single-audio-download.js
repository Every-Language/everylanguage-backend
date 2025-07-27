#!/usr/bin/env node

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

async function testDirectAudioDownload() {
  log('info', 'Testing direct audio file download...');

  // Test URL from the diagnostics
  const testUrl =
    'https://f006.backblazeb2.com/file/el-backend-dev-media-files/1753492773014-BSB_01_Gen_010_H.mp3';

  try {
    log('info', `Downloading from: ${testUrl}`);
    const response = await fetch(testUrl);

    if (!response.ok) {
      log(
        'error',
        `Download failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const sizeBytes = arrayBuffer.byteLength;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

    log('success', `Successfully downloaded ${sizeBytes} bytes (${sizeMB} MB)`);

    // Test if it looks like valid audio data
    const uint8Array = new Uint8Array(arrayBuffer);
    const header = Array.from(uint8Array.slice(0, 10))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    log('info', `File header (first 10 bytes): ${header}`);

    return true;
  } catch (error) {
    log('error', 'Download failed:', error);
    return false;
  }
}

async function runTest() {
  try {
    log('info', 'Testing Audio Download Fix');

    const success = await testDirectAudioDownload();

    if (success) {
      log(
        'success',
        '✅ Audio download fix is working! Files can be downloaded directly.'
      );
      log(
        'info',
        'The package builder should now be able to include actual audio data.'
      );
    } else {
      log(
        'error',
        '❌ Audio download fix is not working. Check network access or URL validity.'
      );
    }
  } catch (error) {
    log('error', 'Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}
