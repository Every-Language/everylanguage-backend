// Simple Image Upload Test - No spaces anywhere
// Usage: node scripts/dev-tools/test_image_upload_simple.js

const SUPABASE_URL = 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

async function authenticateUser(email, password) {
  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.ok) {
    const authData = await response.json();
    console.log(`✅ Authentication successful: ${authData.user.email}`);
    return authData.access_token;
  } else {
    console.log(`❌ Auth failed: ${response.status}`);
    return null;
  }
}

async function testSimpleUpload(token) {
  console.log('⬆️ Testing simple image upload...');

  // Use only safe characters - no spaces
  const safeImageContent = 'x'.repeat(1100); // 1100 bytes, no spaces

  const payload = {
    target_type: 'chapter',
    target_id: 'gen-1',
    filename: 'test.png', // Simple filename, no spaces
    file_content: safeImageContent,
    set_name: 'TestSet', // No spaces
    create_new_set: true,
    metadata: {
      desc: 'test', // No spaces in keys or values
      cat: 'cover',
    },
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Simple Image Upload Test');

  const token = await authenticateUser(
    'sarah.johnson@example.com',
    'password123'
  );
  if (!token) return;

  await testSimpleUpload(token);
}

main();
