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
    strategy: '\x1b[36m',
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

// Test chunking via the create-bible-package endpoint with chunking enabled
async function testPackageChunking(
  chunkingStrategy,
  packageType,
  maxSizeMB,
  accessToken,
  customOptions = {}
) {
  log(
    'strategy',
    `Testing ${chunkingStrategy} chunking for ${packageType} packages (max ${maxSizeMB}MB)`
  );

  const payload = {
    packageType,
    languageEntityId: TEST_IDS.languageEntityId,
    options: {
      includeStructure: true,
      enableChunking: true,
      chunkingStrategy,
      maxSize: maxSizeMB,
      ...customOptions,
    },
  };

  // Add version IDs based on package type
  if (packageType === 'audio' || packageType === 'combined') {
    payload.audioVersionId = TEST_IDS.audioVersionId;
  }
  if (packageType === 'text' || packageType === 'combined') {
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

  const responseText = await response.text();
  log('info', `Response status: ${response.status}`);

  if (!response.ok) {
    log('error', `Failed to create chunked ${packageType} package`, {
      status: response.status,
      response: responseText,
      payload,
    });
    return { success: false, error: responseText };
  }

  // Check if we got series metadata in headers
  const metadataHeader = response.headers.get('X-Package-Metadata');
  let metadata = null;
  if (metadataHeader) {
    try {
      metadata = JSON.parse(metadataHeader);
    } catch {
      log('warning', 'Could not parse package metadata from headers');
    }
  }

  const packageSize = responseText.length;
  const packageSizeMB = packageSize / (1024 * 1024);

  if (metadata?.manifest?.seriesInfo) {
    log('success', `Multi-package series created!`, {
      strategy: chunkingStrategy,
      seriesId: metadata.manifest.seriesInfo.seriesId,
      partNumber: metadata.manifest.seriesInfo.partNumber,
      totalParts: metadata.manifest.seriesInfo.totalParts,
      contentRange: metadata.manifest.seriesInfo.contentRange,
      packageSizeMB: packageSizeMB.toFixed(2),
    });
  } else {
    log('success', `Single package created (no chunking needed)`, {
      strategy: chunkingStrategy,
      packageSizeMB: packageSizeMB.toFixed(2),
    });
  }

  return {
    success: true,
    metadata,
    packageSize,
    packageSizeMB,
    type: 'binary',
  };
}

// Test the create-package-series endpoint for planning
async function testSeriesPlanning(
  chunkingStrategy,
  packageType,
  maxSizeMB,
  accessToken,
  customChunks = null
) {
  log(
    'strategy',
    `Testing series planning for ${chunkingStrategy} strategy (${packageType})`
  );

  const payload = {
    packageType,
    languageEntityId: TEST_IDS.languageEntityId,
    chunkingStrategy,
    maxSizePerPackageMB: maxSizeMB,
  };

  // Add version IDs based on package type
  if (packageType === 'audio' || packageType === 'combined') {
    payload.audioVersionId = TEST_IDS.audioVersionId;
  }
  if (packageType === 'text' || packageType === 'combined') {
    payload.textVersionId = TEST_IDS.textVersionId;
  }

  // Add custom chunks if provided
  if (customChunks) {
    payload.customChunks = customChunks;
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
    log('error', `Failed to create series plan`, {
      status: response.status,
      response: errorText,
      payload,
    });
    return { success: false, error: errorText };
  }

  const seriesData = await response.json();

  if (seriesData.success) {
    log('success', `Series plan created successfully!`, {
      seriesId: seriesData.seriesId,
      seriesName: seriesData.seriesName,
      totalParts: seriesData.totalParts,
      estimatedTotalSizeMB: seriesData.estimatedTotalSizeMB,
      packages: seriesData.packages.map(pkg => ({
        part: pkg.partNumber,
        range: `${pkg.contentRange.startBook} - ${pkg.contentRange.endBook}`,
        description: pkg.contentRange.description,
        sizeMB: pkg.estimatedSizeMB.toFixed(2),
      })),
    });
  } else {
    log('error', 'Series planning failed', seriesData);
  }

  return seriesData;
}

// Test custom chunking with specific book ranges
async function testCustomChunking(packageType, accessToken) {
  log('strategy', `Testing custom chunking for ${packageType} packages`);

  // Test custom range: Just the Gospels (Matthew through John)
  const customOptions = {
    customChunkRange: {
      startBook: 'mat',
      endBook: 'joh',
    },
  };

  return await testPackageChunking(
    'custom',
    packageType,
    1024, // 1GB limit
    accessToken,
    customOptions
  );
}

// Test edge cases
async function testEdgeCases(accessToken) {
  const edgeCases = [];

  log('test', 'Testing edge cases...');

  // Edge case 1: Very small size limit to force maximum chunking
  try {
    const result = await testPackageChunking(
      'size',
      'audio',
      10, // 10MB - very small
      accessToken
    );
    edgeCases.push({
      test: 'Very small size limit (10MB)',
      success: result.success,
      result,
    });
  } catch (error) {
    edgeCases.push({
      test: 'Very small size limit (10MB)',
      success: false,
      error: error.message,
    });
  }

  // Edge case 2: Invalid chunking strategy
  try {
    const result = await testPackageChunking(
      'invalid_strategy',
      'audio',
      1024,
      accessToken
    );
    edgeCases.push({
      test: 'Invalid chunking strategy',
      success: false, // Should fail
      result,
    });
  } catch (error) {
    edgeCases.push({
      test: 'Invalid chunking strategy',
      success: true, // Expected to fail
      error: error.message,
    });
  }

  // Edge case 3: Custom chunking without range
  try {
    const payload = {
      packageType: 'text',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      options: {
        includeStructure: true,
        enableChunking: true,
        chunkingStrategy: 'custom',
        // Missing customChunkRange
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
    edgeCases.push({
      test: 'Custom chunking without range specified',
      success: !success, // Should fail
      status: response.status,
    });
  } catch (error) {
    edgeCases.push({
      test: 'Custom chunking without range specified',
      success: true, // Expected to fail
      error: error.message,
    });
  }

  return edgeCases;
}

// Test downloading packages with chunking parameters
async function testChunkedDownloads(accessToken) {
  log('test', 'Testing download endpoint with chunking parameters...');

  const downloadTests = [];

  // Test 1: Download with chunking enabled
  try {
    const params = new URLSearchParams({
      packageType: 'audio',
      audioVersionId: TEST_IDS.audioVersionId,
      languageEntityId: TEST_IDS.languageEntityId,
      enableChunking: 'true',
      chunkingStrategy: 'testament',
      maxSizeMB: '1024',
    });

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/download-bible-package?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const success = response.ok;
    const packageSize = success ? (await response.arrayBuffer()).byteLength : 0;

    downloadTests.push({
      test: 'Download with testament chunking',
      success,
      status: response.status,
      packageSizeMB: success ? (packageSize / (1024 * 1024)).toFixed(2) : 0,
    });
  } catch (error) {
    downloadTests.push({
      test: 'Download with testament chunking',
      success: false,
      error: error.message,
    });
  }

  return downloadTests;
}

async function runChunkingTests() {
  log('info', 'Starting Bible Package Chunking Tests');
  log('info', `Supabase URL: ${SUPABASE_URL}`);

  // Authenticate first
  const accessToken = await authenticateUser();

  const results = {
    chunkingTests: {},
    seriesPlanning: {},
    customChunking: {},
    edgeCases: [],
    downloads: [],
  };

  // Test 1: Testament-based chunking
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 1: TESTAMENT-BASED CHUNKING');
  log('info', '='.repeat(80));

  results.chunkingTests.testament = {};

  // Audio testament chunking
  results.chunkingTests.testament.audio = await testPackageChunking(
    'testament',
    'audio',
    1024, // 1GB limit to force chunking
    accessToken
  );

  // Text testament chunking
  results.chunkingTests.testament.text = await testPackageChunking(
    'testament',
    'text',
    50, // 50MB limit for text
    accessToken
  );

  // Test 2: Book group chunking
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 2: BOOK GROUP CHUNKING');
  log('info', '='.repeat(80));

  results.chunkingTests.bookGroup = {};

  results.chunkingTests.bookGroup.audio = await testPackageChunking(
    'book_group',
    'audio',
    800, // 800MB limit
    accessToken
  );

  results.chunkingTests.bookGroup.text = await testPackageChunking(
    'book_group',
    'text',
    20, // 20MB limit for text
    accessToken
  );

  // Test 3: Size-based chunking
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 3: SIZE-BASED CHUNKING');
  log('info', '='.repeat(80));

  results.chunkingTests.sizeBased = {};

  results.chunkingTests.sizeBased.audio = await testPackageChunking(
    'size',
    'audio',
    500, // 500MB limit
    accessToken
  );

  results.chunkingTests.sizeBased.text = await testPackageChunking(
    'size',
    'text',
    10, // 10MB limit for text
    accessToken
  );

  // Test 4: Custom chunking
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 4: CUSTOM CHUNKING');
  log('info', '='.repeat(80));

  results.customChunking.audio = await testCustomChunking('audio', accessToken);
  results.customChunking.text = await testCustomChunking('text', accessToken);

  // Test 5: Series planning endpoint
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 5: SERIES PLANNING');
  log('info', '='.repeat(80));

  results.seriesPlanning.testament = await testSeriesPlanning(
    'testament',
    'audio',
    1024,
    accessToken
  );

  results.seriesPlanning.bookGroup = await testSeriesPlanning(
    'book_group',
    'audio',
    800,
    accessToken
  );

  results.seriesPlanning.sizeBased = await testSeriesPlanning(
    'size',
    'text',
    15,
    accessToken
  );

  // Test with custom chunks
  results.seriesPlanning.custom = await testSeriesPlanning(
    'custom',
    'audio',
    1024,
    accessToken,
    [
      { startBook: 'gen', endBook: 'exo', description: 'Genesis & Exodus' },
      { startBook: 'mat', endBook: 'joh', description: 'Gospels' },
    ]
  );

  // Test 6: Edge cases
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 6: EDGE CASES');
  log('info', '='.repeat(80));

  results.edgeCases = await testEdgeCases(accessToken);

  // Test 7: Download endpoint with chunking
  log('info', '='.repeat(80));
  log('info', 'TEST CATEGORY 7: DOWNLOAD ENDPOINT');
  log('info', '='.repeat(80));

  results.downloads = await testChunkedDownloads(accessToken);

  // Summary
  log('info', '='.repeat(80));
  log('info', 'CHUNKING TEST SUMMARY');
  log('info', '='.repeat(80));

  // Count successful tests
  let totalTests = 0;
  let passedTests = 0;

  // Count chunking tests
  Object.values(results.chunkingTests).forEach(category => {
    Object.values(category).forEach(result => {
      totalTests++;
      if (result && result.success) passedTests++;
    });
  });

  // Count custom chunking tests
  Object.values(results.customChunking).forEach(result => {
    totalTests++;
    if (result && result.success) passedTests++;
  });

  // Count series planning tests
  Object.values(results.seriesPlanning).forEach(result => {
    totalTests++;
    if (result && result.success) passedTests++;
  });

  // Count edge case tests (some are expected to fail)
  results.edgeCases.forEach(result => {
    totalTests++;
    if (result.success) passedTests++;
  });

  // Count download tests
  results.downloads.forEach(result => {
    totalTests++;
    if (result.success) passedTests++;
  });

  log('info', `Tests passed: ${passedTests}/${totalTests}`);

  // Detailed breakdown
  log('info', 'Breakdown by category:');
  log(
    'info',
    `• Testament chunking: ${Object.values(results.chunkingTests.testament || {}).filter(r => r?.success).length}/2`
  );
  log(
    'info',
    `• Book group chunking: ${Object.values(results.chunkingTests.bookGroup || {}).filter(r => r?.success).length}/2`
  );
  log(
    'info',
    `• Size-based chunking: ${Object.values(results.chunkingTests.sizeBased || {}).filter(r => r?.success).length}/2`
  );
  log(
    'info',
    `• Custom chunking: ${Object.values(results.customChunking).filter(r => r?.success).length}/2`
  );
  log(
    'info',
    `• Series planning: ${Object.values(results.seriesPlanning).filter(r => r?.success).length}/4`
  );
  log(
    'info',
    `• Edge cases: ${results.edgeCases.filter(r => r.success).length}/${results.edgeCases.length}`
  );
  log(
    'info',
    `• Download tests: ${results.downloads.filter(r => r.success).length}/${results.downloads.length}`
  );

  if (passedTests === totalTests) {
    log(
      'success',
      '🎉 All chunking tests passed! Bible package chunking system is working correctly.'
    );
  } else {
    log(
      'warning',
      `⚠️  ${totalTests - passedTests} test(s) failed. Check the logs above for details.`
    );
  }

  log('info', '\n📊 Test Results Summary:', results);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runChunkingTests().catch(error => {
    log('error', 'Chunking test execution failed:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
