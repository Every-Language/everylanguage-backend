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
    download: '\x1b[36m',
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

// Create a chunked series first, then test downloading individual parts
async function createTestSeries(chunkingStrategy, packageType, accessToken) {
  log(
    'download',
    `Creating test series with ${chunkingStrategy} strategy for ${packageType}`
  );

  const payload = {
    packageType,
    languageEntityId: TEST_IDS.languageEntityId,
    chunkingStrategy,
    maxSizePerPackageMB: 800, // Force chunking with 800MB limit
  };

  // Add version IDs based on package type
  if (packageType === 'audio' || packageType === 'combined') {
    payload.audioVersionId = TEST_IDS.audioVersionId;
  }
  if (packageType === 'text' || packageType === 'combined') {
    payload.textVersionId = TEST_IDS.textVersionId;
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-package-series`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create series: ${response.status} ${errorText}`);
  }

  const seriesData = await response.json();

  if (!seriesData.success) {
    throw new Error(`Series creation failed: ${seriesData.error}`);
  }

  log('success', `Test series created successfully!`, {
    seriesId: seriesData.seriesId,
    totalParts: seriesData.totalParts,
    estimatedTotalSizeMB: seriesData.estimatedTotalSizeMB,
  });

  return seriesData;
}

// Download a specific part of a chunked series
async function downloadSeriesPart(seriesData, partNumber, accessToken) {
  const packageInfo = seriesData.packages.find(
    pkg => pkg.partNumber === partNumber
  );
  if (!packageInfo) {
    throw new Error(`Part ${partNumber} not found in series`);
  }

  log(
    'download',
    `Downloading part ${partNumber}/${seriesData.totalParts}: ${packageInfo.contentRange.description}`
  );

  // Use the create-bible-package endpoint with custom chunk range to get specific part
  const payload = {
    packageType: seriesData.packageType || 'audio',
    languageEntityId: TEST_IDS.languageEntityId,
    options: {
      includeStructure: true,
      enableChunking: true,
      chunkingStrategy: 'custom',
      customChunkRange: {
        startBook: packageInfo.contentRange.startBook,
        endBook: packageInfo.contentRange.endBook,
      },
    },
  };

  // Add version IDs
  if (
    seriesData.packageType === 'audio' ||
    seriesData.packageType === 'combined'
  ) {
    payload.audioVersionId = TEST_IDS.audioVersionId;
  }
  if (
    seriesData.packageType === 'text' ||
    seriesData.packageType === 'combined'
  ) {
    payload.textVersionId = TEST_IDS.textVersionId;
  }

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to download part ${partNumber}: ${response.status} ${errorText}`
    );
  }

  const packageBuffer = await response.arrayBuffer();
  const packageSizeMB = packageBuffer.byteLength / (1024 * 1024);

  // Parse package headers to validate it's a chunk
  const headerView = new DataView(packageBuffer, 0, 64);
  const packageType = headerView.getUint32(12, true);
  const manifestSize = headerView.getUint32(16, true);

  // Extract and parse manifest
  const manifestBuffer = new Uint8Array(packageBuffer, 64, manifestSize);
  const manifestText = new TextDecoder().decode(manifestBuffer);
  const manifest = JSON.parse(manifestText);

  log('success', `Part ${partNumber} downloaded successfully!`, {
    packageSizeMB: packageSizeMB.toFixed(2),
    expectedSizeMB: packageInfo.estimatedSizeMB.toFixed(2),
    isChunk: packageType >= 4 && packageType <= 6, // AUDIO_CHUNK, TEXT_CHUNK, COMBINED_CHUNK
    seriesInfo: manifest.seriesInfo
      ? {
          seriesId: manifest.seriesInfo.seriesId,
          partNumber: manifest.seriesInfo.partNumber,
          totalParts: manifest.seriesInfo.totalParts,
          contentRange: manifest.seriesInfo.contentRange,
        }
      : null,
  });

  return {
    success: true,
    packageSizeMB,
    manifest,
    isValidChunk: packageType >= 4 && packageType <= 6,
    hasSeriesInfo: !!manifest.seriesInfo,
  };
}

// Test downloading all parts of a series in sequence
async function testSequentialDownload(seriesData, accessToken) {
  log(
    'test',
    `Testing sequential download of all ${seriesData.totalParts} parts`
  );

  const results = [];
  let totalDownloadedMB = 0;

  for (let partNumber = 1; partNumber <= seriesData.totalParts; partNumber++) {
    try {
      const result = await downloadSeriesPart(
        seriesData,
        partNumber,
        accessToken
      );
      results.push({
        partNumber,
        success: result.success,
        packageSizeMB: result.packageSizeMB,
        isValidChunk: result.isValidChunk,
        hasSeriesInfo: result.hasSeriesInfo,
      });
      totalDownloadedMB += result.packageSizeMB;
    } catch (error) {
      results.push({
        partNumber,
        success: false,
        error: error.message,
      });
    }
  }

  const successfulDownloads = results.filter(r => r.success).length;

  log('success', `Sequential download completed!`, {
    successfulParts: `${successfulDownloads}/${seriesData.totalParts}`,
    totalDownloadedMB: totalDownloadedMB.toFixed(2),
    expectedTotalMB: seriesData.estimatedTotalSizeMB.toFixed(2),
    sizeDifference: Math.abs(
      totalDownloadedMB - seriesData.estimatedTotalSizeMB
    ).toFixed(2),
  });

  return results;
}

// Test downloading parts out of order
async function testRandomOrderDownload(seriesData, accessToken) {
  log('test', `Testing random order download`);

  // Create random order of parts to download
  const partNumbers = Array.from(
    { length: seriesData.totalParts },
    (_, i) => i + 1
  );
  const shuffled = partNumbers.sort(() => Math.random() - 0.5);

  log('info', `Download order: ${shuffled.join(' → ')}`);

  const results = [];

  for (const partNumber of shuffled.slice(
    0,
    Math.min(3, seriesData.totalParts)
  )) {
    try {
      const result = await downloadSeriesPart(
        seriesData,
        partNumber,
        accessToken
      );
      results.push({
        partNumber,
        success: result.success,
        downloadOrder: results.length + 1,
      });
    } catch (error) {
      results.push({
        partNumber,
        success: false,
        error: error.message,
        downloadOrder: results.length + 1,
      });
    }
  }

  return results;
}

// Test error handling
async function testErrorHandling(seriesData, accessToken) {
  log('test', 'Testing error handling...');

  const errorTests = [];

  // Test 1: Download non-existent part
  try {
    await downloadSeriesPart(
      seriesData,
      seriesData.totalParts + 1,
      accessToken
    );
    errorTests.push({
      test: 'Download non-existent part',
      success: false, // Should fail
      error: 'Expected this to fail',
    });
  } catch (error) {
    errorTests.push({
      test: 'Download non-existent part',
      success: true, // Expected to fail
      error: error.message,
    });
  }

  // Test 2: Download with invalid book range
  try {
    const payload = {
      packageType: 'audio',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      options: {
        includeStructure: true,
        enableChunking: true,
        chunkingStrategy: 'custom',
        customChunkRange: {
          startBook: 'invalid_book',
          endBook: 'another_invalid_book',
        },
      },
    };

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

    const success = response.ok;
    errorTests.push({
      test: 'Download with invalid book range',
      success: !success, // Should fail
      status: response.status,
    });
  } catch (error) {
    errorTests.push({
      test: 'Download with invalid book range',
      success: true, // Expected to fail
      error: error.message,
    });
  }

  return errorTests;
}

async function runSeriesDownloadTests() {
  log('info', 'Starting Bible Package Series Download Tests');
  log('info', `Supabase URL: ${SUPABASE_URL}`);

  // Authenticate first
  const accessToken = await authenticateUser();

  const results = {
    seriesCreation: {},
    sequentialDownloads: {},
    randomOrderDownloads: {},
    errorHandling: [],
  };

  // Test different chunking strategies
  const strategies = [
    { strategy: 'testament', packageType: 'audio' },
    { strategy: 'book_group', packageType: 'text' },
    { strategy: 'size', packageType: 'audio' },
  ];

  for (const { strategy, packageType } of strategies) {
    log('info', '='.repeat(80));
    log(
      'info',
      `TESTING ${strategy.toUpperCase()} CHUNKING - ${packageType.toUpperCase()} PACKAGES`
    );
    log('info', '='.repeat(80));

    try {
      // Create test series
      const seriesData = await createTestSeries(
        strategy,
        packageType,
        accessToken
      );
      results.seriesCreation[`${strategy}_${packageType}`] = {
        success: true,
        totalParts: seriesData.totalParts,
        estimatedSizeMB: seriesData.estimatedTotalSizeMB,
      };

      // Test sequential download
      log('info', `\n--- Sequential Download Test ---`);
      const sequentialResults = await testSequentialDownload(
        seriesData,
        accessToken
      );
      results.sequentialDownloads[`${strategy}_${packageType}`] =
        sequentialResults;

      // Test random order download (only if series has multiple parts)
      if (seriesData.totalParts > 1) {
        log('info', `\n--- Random Order Download Test ---`);
        const randomResults = await testRandomOrderDownload(
          seriesData,
          accessToken
        );
        results.randomOrderDownloads[`${strategy}_${packageType}`] =
          randomResults;
      }

      // Test error handling
      log('info', `\n--- Error Handling Test ---`);
      const errorResults = await testErrorHandling(seriesData, accessToken);
      results.errorHandling.push(
        ...errorResults.map(r => ({
          ...r,
          strategy: `${strategy}_${packageType}`,
        }))
      );
    } catch (error) {
      log('error', `Failed to test ${strategy} ${packageType}:`, error.message);
      results.seriesCreation[`${strategy}_${packageType}`] = {
        success: false,
        error: error.message,
      };
    }
  }

  // Summary
  log('info', '='.repeat(80));
  log('info', 'SERIES DOWNLOAD TEST SUMMARY');
  log('info', '='.repeat(80));

  // Count successful operations
  const successfulSeries = Object.values(results.seriesCreation).filter(
    r => r.success
  ).length;
  const totalSeries = Object.keys(results.seriesCreation).length;

  let totalDownloadTests = 0;
  let successfulDownloadTests = 0;

  Object.values(results.sequentialDownloads).forEach(downloads => {
    downloads.forEach(download => {
      totalDownloadTests++;
      if (download.success) successfulDownloadTests++;
    });
  });

  Object.values(results.randomOrderDownloads).forEach(downloads => {
    downloads.forEach(download => {
      totalDownloadTests++;
      if (download.success) successfulDownloadTests++;
    });
  });

  const successfulErrorTests = results.errorHandling.filter(
    r => r.success
  ).length;
  const totalErrorTests = results.errorHandling.length;

  log('info', `Series Creation: ${successfulSeries}/${totalSeries}`);
  log(
    'info',
    `Part Downloads: ${successfulDownloadTests}/${totalDownloadTests}`
  );
  log('info', `Error Handling: ${successfulErrorTests}/${totalErrorTests}`);

  const allTestsPassed =
    successfulSeries === totalSeries &&
    successfulDownloadTests === totalDownloadTests &&
    successfulErrorTests === totalErrorTests;

  if (allTestsPassed) {
    log(
      'success',
      '🎉 All series download tests passed! Chunked package download system is working correctly.'
    );
  } else {
    log('warning', '⚠️  Some tests failed. Check the logs above for details.');
  }

  log('info', '\n📊 Detailed Test Results:', results);

  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeriesDownloadTests().catch(error => {
    log('error', 'Series download test execution failed:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
