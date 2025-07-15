#!/usr/bin/env node

/**
 * Test script for image upload functionality
 *
 * This script tests the upload-image edge function with various scenarios:
 * - JSON upload with image set creation
 * - Multipart form data upload
 * - Error handling and validation
 *
 * Usage:
 *   node scripts/dev-tools/test_image_upload.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/upload-image`;

async function testJsonUpload() {
  console.log('\n🧪 Testing JSON upload with new image set...');

  const requestData = {
    target_type: 'chapter',
    target_id: 'test-chapter-id-123',
    filename: 'demo-image.jpg',
    file_content: 'This is fake image content for testing purposes',
    create_new_set: true,
    set_name: 'Demo Image Set',
    set_remote_path: 'demo-sets/test-set',
    metadata: {
      description: 'Test image for development',
      source: 'dev-script',
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ JSON upload test passed!');
      console.log(`📄 Image ID: ${result.data.imageId}`);
      console.log(`📁 Set ID: ${result.data.setId || 'None'}`);
      console.log(`🔗 Download URL: ${result.data.downloadUrl}`);
      console.log(`📏 File Size: ${result.data.fileSize} bytes`);
    } else {
      console.log('❌ JSON upload test failed!');
      console.log(`❗ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('💥 JSON upload test error:', error.message);
  }
}

async function testMultipartUpload() {
  console.log('\n🧪 Testing multipart form data upload...');

  // Create FormData (simulating file upload)
  const formData = new FormData();

  // Create a fake file for testing
  const imageContent = 'This is fake image binary data for multipart testing';
  const imageBlob = new Blob([imageContent], { type: 'image/png' });
  const imageFile = new File([imageBlob], 'test-multipart.png', {
    type: 'image/png',
  });

  formData.append('file', imageFile);
  formData.append('target_type', 'chapter');
  formData.append('target_id', 'test-chapter-id-456');
  formData.append(
    'metadata',
    JSON.stringify({
      upload_method: 'multipart',
      test_type: 'development',
    })
  );

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    const result = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Multipart upload test passed!');
      console.log(`📄 Image ID: ${result.data.imageId}`);
      console.log(`🔗 Download URL: ${result.data.downloadUrl}`);
    } else {
      console.log('❌ Multipart upload test failed!');
      console.log(`❗ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('💥 Multipart upload test error:', error.message);
  }
}

async function testValidationErrors() {
  console.log('\n🧪 Testing validation errors...');

  const invalidRequests = [
    {
      name: 'Missing target_type',
      data: {
        target_id: 'test-id',
        filename: 'test.jpg',
        file_content: 'test',
      },
    },
    {
      name: 'Invalid target_type',
      data: {
        target_type: 'invalid_type',
        target_id: 'test-id',
        filename: 'test.jpg',
        file_content: 'test',
      },
    },
    {
      name: 'Missing set_name when creating new set',
      data: {
        target_type: 'chapter',
        target_id: 'test-id',
        filename: 'test.jpg',
        file_content: 'test',
        create_new_set: true,
      },
    },
    {
      name: 'Conflicting set parameters',
      data: {
        target_type: 'chapter',
        target_id: 'test-id',
        filename: 'test.jpg',
        file_content: 'test',
        create_new_set: true,
        set_id: 'existing-set-id',
        set_name: 'New Set',
      },
    },
  ];

  for (const testCase of invalidRequests) {
    console.log(`\n  🔍 Testing: ${testCase.name}`);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();

      if (response.status === 400 && !result.success) {
        console.log(`  ✅ Validation correctly rejected: ${result.error}`);
      } else {
        console.log(
          `  ❌ Expected validation error but got status ${response.status}`
        );
        console.log(`  📋 Response:`, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error(`  💥 Test error for ${testCase.name}:`, error.message);
    }
  }
}

async function testCORS() {
  console.log('\n🧪 Testing CORS preflight...');

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(
      `🌐 CORS Origin: ${response.headers.get('Access-Control-Allow-Origin')}`
    );
    console.log(
      `📋 CORS Methods: ${response.headers.get('Access-Control-Allow-Methods')}`
    );
    console.log(
      `🔑 CORS Headers: ${response.headers.get('Access-Control-Allow-Headers')}`
    );

    if (response.status === 200) {
      console.log('✅ CORS preflight test passed!');
    } else {
      console.log('❌ CORS preflight test failed!');
    }
  } catch (error) {
    console.error('💥 CORS test error:', error.message);
  }
}

async function testMethodNotAllowed() {
  console.log('\n🧪 Testing method not allowed...');

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
    });

    const result = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.status === 405 && result.error === 'Method not allowed') {
      console.log('✅ Method not allowed test passed!');
    } else {
      console.log('❌ Method not allowed test failed!');
    }
  } catch (error) {
    console.error('💥 Method not allowed test error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Image Upload Function Tests');
  console.log(`🔗 Testing endpoint: ${EDGE_FUNCTION_URL}`);
  console.log('='.repeat(60));

  // Run all tests
  await testJsonUpload();
  await testMultipartUpload();
  await testValidationErrors();
  await testCORS();
  await testMethodNotAllowed();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Image upload tests completed!');
  console.log('\n💡 Tips:');
  console.log('  - Make sure Supabase is running locally (supabase start)');
  console.log(
    '  - Check the function logs with: supabase functions logs upload-image'
  );
  console.log('  - Update SUPABASE_URL and SUPABASE_ANON_KEY if needed');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testJsonUpload,
  testMultipartUpload,
  testValidationErrors,
  testCORS,
  testMethodNotAllowed,
};
